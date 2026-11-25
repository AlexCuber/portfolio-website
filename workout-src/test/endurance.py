"""Endurance: run, ride and swim with distance and time, their own colour, the Train card and the Progress page."""
import asyncio, json, sys, os, subprocess, time, signal, re, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8775
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
def D(n): return (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
def outing(i, key, ex, name, days, sets):
    return {'v': 2, 'id': 'out%d' % i, 'key': key, 'name': name, 'date': D(days), 'startedAt': 0, 'finishedAt': 1, 'dur': int(sum(s['r'] for s in sets) * 60), 'core': False, 'notes': '', 'entries': [{'n': '1', 'ex': ex, 'name': name, 'note': '', 'sets': sets}], 'updatedAt': 1}
async def page(b, state, errs, scheme='light', w=390):
    c = await b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
    await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(state)))
    pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(700)
    return c, pg
async def finish(pg):
    await pg.click('#wbar-fin'); await pg.wait_for_timeout(200)
    if await pg.locator('#wbar-fin:has-text("Sure")').count(): await pg.click('#wbar-fin')
    await pg.wait_for_timeout(700)
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for scheme in ('light', 'dark'):
                print('==', scheme); pre = 'T-' + ('L-' if scheme == 'light' else 'D-')
                st = seed(); st['settings'] = {'setupDone': True}; n_gym = len(st['sessions'])
                c, pg = await page(b, st, errs, scheme)
                async def shot(n, full=False): await pg.screenshot(path=os.path.join(SH, pre + n + '.png'), full_page=full)
                async def scroll_to(sel): await pg.evaluate("document.querySelector('%s').scrollIntoView({block:'center'})" % sel); await pg.wait_for_timeout(250)
                # ---- Train card
                ok(await pg.locator('.out-tile').count() == 3 and await pg.locator('.out-tile svg.out[data-illo]').count() == 3 and await pg.locator('[data-key="out-brick"]').count() == 0 and 'brick' not in (await pg.locator('#view').inner_text()).lower(), 'Train has an Endurance card with run, ride and swim, and no Brick')
                bg = await pg.evaluate("[getComputedStyle(document.querySelector('.out-tile svg')).backgroundColor, getComputedStyle(document.querySelector('.strip .illo svg') || document.body).backgroundColor, getComputedStyle(document.querySelector('.out-tile svg .h')).fill, getComputedStyle(document.querySelector('.strip svg .h')).fill]")
                ok(bg[0] != bg[1] and bg[2] != bg[3], 'the outdoor figures have their own background and muscle colour: %s' % bg)
                await scroll_to('.out-tiles'); await pg.wait_for_timeout(300)
                f1 = await pg.locator('.out-tile svg').first.inner_html(); await pg.wait_for_timeout(350); f2 = await pg.locator('.out-tile svg').first.inner_html(); ok(f1 != f2, 'they are animated')
                await shot('train')
                ring0 = await pg.locator('.week-n b').inner_text()
                # ---- a run
                await pg.click('[data-key="out-run"]'); await pg.wait_for_timeout(400)
                d = await pg.evaluate(LS + ".draft"); u = d['items'][0]['u']
                ok(d['key'] == 'out-run' and d['name'] == 'Run' and [i['ex'] for i in d['items']] == ['outdoor-run'], 'tapping Run starts a workout with the run in it')
                ok(await pg.locator('#d-%s-0' % u).count() == 1 and await pg.locator('#r-%s-0' % u).count() == 1 and await pg.locator('#s-%s-0' % u).count() == 1, 'the set asks for distance, minutes and seconds')
                ok('stopwatch' in (await pg.locator('#x-%s .why' % u).inner_text()).lower() and await pg.locator('#x-%s .act:has-text("Stopwatch")' % u).count() == 1, 'first time: a hint and a stopwatch button')
                await pg.fill('#d-%s-0' % u, '5.2'); await pg.fill('#r-%s-0' % u, '28'); await pg.fill('#s-%s-0' % u, '40'); await pg.wait_for_timeout(120)
                ok(await pg.locator('#p-%s-0' % u).inner_text() == 'Pace 5:31 /km', 'the pace shows as you type: %s' % await pg.locator('#p-%s-0' % u).inner_text())
                await shot('run')
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(200)
                ok(await pg.locator('#rest').is_hidden(), 'no rest timer after a run')
                await finish(pg)
                t = await pg.locator('.sheet').inner_text(); tiles = [x.replace('\n', ' ') for x in await pg.locator('.sheet .tile').all_inner_texts()]
                ok(tiles[0].startswith('28:40') and tiles[1].startswith('5.2') and 'km' in tiles[1] and tiles[2].startswith('5:31'), 'the summary shows time, distance and pace: %s' % tiles)
                ok('Update Run' not in t and 'Save these exercises' not in t, 'no offer to change the fixed Run session')
                await shot('summary'); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(250)
                s = [x for x in (await pg.evaluate(LS + ".sessions")).values() if x['key'] == 'out-run'][0]
                ok(s['entries'][0]['sets'] == [{'w': 0, 'r': 28.6667, 'dist': 5.2}] and s['dur'] == 1720 and s['core'] is False, 'saved as distance and minutes, with the logged time as its length: %s' % s['entries'][0]['sets'])
                ok(await pg.locator('.day.today.done.out').count() == (0 if any(x['date'] == D(0) for x in st['sessions'].values()) else 1) and await pg.locator('.week-n b').inner_text() == ring0, 'today is ticked in the endurance colour and the weekly goal count is unchanged (%s)' % ring0)
                ok('5.2 km' in await pg.locator('.out-tile').first.inner_text(), 'the Run tile shows the last distance')
                # ---- the second run: last time in grey, one tap, then longer and faster
                await pg.click('[data-key="out-run"]'); await pg.wait_for_timeout(400); u = await pg.evaluate(LS + ".draft.items[0].u")
                ph = [await pg.get_attribute('#%s-%s-0' % (k, u), 'placeholder') for k in 'drs']
                ok(ph == ['5.2', '28', '40'] and 'Last time 5:31 /km' in await pg.locator('#x-%s .why' % u).inner_text() and '5.2 km in 28:40' in await pg.locator('#x-%s .last-note' % u).inner_text(), 'next time last run is there in grey with its pace: %s' % ph)
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(150)
                row = await pg.evaluate(LS + ".draft.items[0].rows[0]"); ok(row['d'] and [row.get('dist'), row['r'], row.get('sec')] == ['5.2', '28', '40'], 'one tap logs the same run again')
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.fill('#d-%s-0' % u, '6'); await pg.fill('#r-%s-0' % u, '32'); await pg.fill('#s-%s-0' % u, ''); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(150)
                tt = await pg.locator('#toast').inner_text() if await pg.locator('#toast').count() else ''; ok('6 km' in tt and 'min' not in tt, 'the record toast speaks in distance: %s' % tt.replace('\n', ' '))
                await finish(pg); t = await pg.locator('.sheet').inner_text()
                ok('your last run was on' in t.lower() and ('Longest yet' in t or 'Fastest pace' in t), 'the summary compares with the last run and marks the record')
                ok('weights' not in t and 'go a little further' in t, 'and its closing line is about the run, not about weights')
                await shot('summary2'); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(250)
                # ---- stopwatch on a ride
                await pg.click('[data-key="out-ride"]'); await pg.wait_for_timeout(400); u = await pg.evaluate(LS + ".draft.items[0].u")
                await pg.click('#x-%s .act:has-text("Stopwatch")' % u); await pg.wait_for_timeout(1200)
                ok(await pg.locator('#rest').is_visible() and await pg.locator('#rest-step').is_hidden() and await pg.locator('#rest [data-act="rest-skip"]').inner_text() == 'Stop' and 'Bike ride' in await pg.locator('#rest-l').inner_text(), 'the stopwatch counts up in the bar, with Stop and no plus or minus')
                await shot('stopwatch'); await pg.wait_for_timeout(5200); await pg.click('#rest [data-act="rest-skip"]'); await pg.wait_for_timeout(300)
                row = await pg.evaluate(LS + ".draft.items[0].rows[0]"); ok(row['r'] == '0' and row.get('sec') in ('6', '7') and not row['d'] and await pg.evaluate("document.activeElement.id") == 'd-%s-0' % u, 'Stop writes the time into the set and moves to the distance (%s s)' % row.get('sec'))
                await pg.fill('#d-%s-0' % u, '40'); await pg.fill('#r-%s-0' % u, '85'); await pg.fill('#s-%s-0' % u, ''); await pg.wait_for_timeout(100)
                ok(await pg.locator('#p-%s-0' % u).inner_text() == 'Pace 28.2 km/h', 'a ride shows speed: %s' % await pg.locator('#p-%s-0' % u).inner_text())
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await finish(pg); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(250)
                # ---- brick, and a swim swapped to open water
                await pg.click('[data-key="out-swim"]'); await pg.wait_for_timeout(400); u = await pg.evaluate(LS + ".draft.items[0].u")
                await pg.click('#x-%s [data-act="swap-open"]' % u); await pg.wait_for_timeout(300); sw = [x.split('\n')[0] for x in await pg.locator('.sheet [data-act="swap-pick"]').all_inner_texts()]
                ok('Open-water swim' in sw and 'Bench press' not in sw, 'Swap on a swim offers the other endurance exercises: %s' % sw)
                await pg.click('.sheet [data-act="swap-pick"][data-ex="open-water-swim"]'); await pg.wait_for_timeout(300); u = await pg.evaluate(LS + ".draft.items[0].u")
                await pg.fill('#d-%s-0' % u, '1500'); await pg.fill('#r-%s-0' % u, '31'); await pg.fill('#s-%s-0' % u, '30'); await pg.wait_for_timeout(100)
                ok(await pg.locator('#p-%s-0' % u).inner_text() == 'Pace 2:06 /100 m', 'a swim is in metres with pace per 100 m: %s' % await pg.locator('#p-%s-0' % u).inner_text())
                await shot('swim'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await finish(pg); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(250)
                # ---- history
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(400)
                ok(await pg.locator('.hd.on.avo').count() >= 1 and await pg.locator('.hcard .hc-head b.nmo').count() >= 1, 'endurance days and workouts are violet in History')
                for k in range(3): await pg.locator('.hcard .hc-head').nth(k).click(); await pg.wait_for_timeout(80)
                t = await pg.locator('#hist-body').inner_text()
                ok(await pg.locator('.hk.avo').count() >= 1 and 'RU' in t, 'endurance days carry their own tint and initials in the calendar key')
                ok('5.2 km in 28:40' in t or '6 km in 32:00' in t or '1500 m in 31:30' in t, 'the day shows distance and time')
                await shot('history', True)
                await pg.click('[data-act="hist-search"]'); await pg.fill('#hist-q', 'run'); await pg.wait_for_timeout(200); await pg.locator('#hist-body .item:has-text("Run")').first.click(); await pg.wait_for_timeout(250)
                await pg.click('.sheet [data-act="edit-session"]'); await pg.wait_for_timeout(400); u = await pg.evaluate(LS + ".draft.items[0].u")
                vals = [await pg.input_value('#%s-%s-0' % (k, u)) for k in 'drs']; ok(vals in (['6', '32', ''], ['5.2', '28', '40']), 'editing a saved run brings back distance, minutes and seconds: %s' % vals)
                await pg.click('#finish-btn'); await pg.wait_for_timeout(500); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
                await pg.evaluate("document.getElementById('hist-q') && (document.getElementById('hist-q').value = '')")
                await c.close()
                # ---- progress, with a few weeks of outings
                st = seed(); st['settings'] = {'setupDone': True}
                runs = [(52, 4.0, 24.5), (45, 5.0, 29.9), (38, 5.0, 29.2), (31, 6.5, 38.4), (24, 5.0, 28.5), (17, 8.0, 46.9), (10, 5.2, 28.7), (3, 10.0, 57.5)]
                for i, (dd, km, mn) in enumerate(runs): o = outing(i, 'out-run', 'outdoor-run', 'Run', dd, [{'w': 0, 'r': mn, 'dist': km}]); st['sessions'][o['id']] = o
                for i, (dd, km, mn) in enumerate([(40, 32, 75), (26, 45, 102), (12, 40, 85), (5, 60, 131)]): o = outing(20 + i, 'out-ride', 'bike-ride', 'Ride', dd, [{'w': 0, 'r': mn, 'dist': km}]); st['sessions'][o['id']] = o
                c, pg = await page(b, st, errs, scheme)
                async def shot(n, full=False): await pg.screenshot(path=os.path.join(SH, pre + n + '.png'), full_page=full)
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(300)
                segs = [x.strip() for x in await pg.locator('[data-act="prog"]').all_inner_texts()]; ok(segs == ['Overview', 'Lifts', 'Endurance', 'Body'], 'Progress has an Endurance page: %s' % segs)
                await pg.click('[data-act="prog"][data-v="endur"]'); await pg.wait_for_timeout(1500)
                t = await pg.locator('#view').inner_text(); print('     ', t.replace('\n', ' | ')[:520])
                ok(await pg.locator('[data-act="sport"][data-v="run"]').get_attribute('aria-pressed') == 'true' and '8' in t and 'runs logged' in t, 'it opens on the sport with data and counts the runs')
                ok(await pg.locator('[data-chart="ew"] .col-core').count() >= 6 and await pg.locator('[data-chart="ep"] .ln').count() == 1, 'distance per week as bars and pace as a line')
                fill = await pg.evaluate("[getComputedStyle(document.querySelector('[data-chart=ew] .col-core')).fill, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()]"); ok('115, 87, 246' in fill[0] or '143, 120, 245' in fill[0], 'the charts are in the endurance colour: %s' % fill[0])
                ok('Longest run' in t and '10 km' in t and 'Fastest pace' in t and '5:31 /km' in t and 'Biggest week' in t, 'bests: longest, fastest, biggest week')
                ticks = await pg.evaluate("[...document.querySelectorAll('[data-chart=ep] svg text')].map(t => t.textContent)"); ok(any(re.match(r'^\d:\d\d$', x) for x in ticks), 'the pace axis reads in minutes and seconds: %s' % ticks[:5])
                await shot('endurance', True)
                box = await pg.locator('[data-chart="ep"] svg').bounding_box(); await pg.touchscreen.tap(box['x'] + box['width'] * 0.5, box['y'] + box['height'] * 0.5); await pg.wait_for_timeout(200)
                ok(await pg.locator('#ep-t').is_visible() and '/km' in await pg.locator('#ep-t').inner_text(), 'tapping the pace chart shows that run')
                await pg.click('[data-act="sport"][data-v="ride"]'); await pg.wait_for_timeout(900); t = await pg.locator('#view').inner_text()
                ok('km/h' in t and 'Higher is faster' in t and '60 km' in t, 'rides read in km/h'); await shot('endurance-ride', True)
                await pg.click('[data-act="sport"][data-v="swim"]'); await pg.wait_for_timeout(500)
                ok('no swims logged yet' in (await pg.locator('#view').inner_text()).lower() and await pg.locator('[data-act="start"][data-key="out-swim"]').count() == 1, 'a sport with nothing logged explains itself and offers to log one'); await shot('endurance-empty')
                await pg.click('[data-act="prog"][data-v="lifts"]'); await pg.wait_for_timeout(800); t = await pg.locator('#view').inner_text()
                ok('Bike ride' not in t and '\nRun\n' not in t, 'the Lifts page stays about lifts')
                await pg.click('[data-act="prog"][data-v="overview"]'); await pg.wait_for_timeout(1200); ok(len(errs) == 0, 'Overview still draws with endurance in the log')
                # ---- library
                await pg.click('[data-tab="exercises"]'); await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.wait_for_timeout(300)
                await pg.click('[data-act="lib-group"][data-v="Endurance"]') if await pg.locator('[data-act="lib-group"][data-v="Endurance"]').count() else await pg.locator('.chip:has-text("Endurance")').first.click()
                await pg.wait_for_timeout(300); t = await pg.locator('#view').inner_text()
                ok(all(x in t for x in ('Run', 'Trail run', 'Bike ride', 'Swim', 'Open-water swim')), 'the exercise library has an Endurance group with five entries'); await shot('library')
                # ---- counting toward the goal, and units
                await pg.click('[data-tab="log"]'); await pg.wait_for_timeout(200); r0 = await pg.locator('.week-n b').inner_text()
                await pg.evaluate("(()=>{const s=%s; const id='outnow'; s.sessions[id]={v:2,id:id,key:'out-run',name:'Run',date:new Date().toLocaleDateString('sv'),startedAt:0,finishedAt:1,dur:1800,core:false,notes:'',entries:[{n:'1',ex:'outdoor-run',name:'Run',note:'',sets:[{w:0,r:30,dist:5}]}],updatedAt:1}; localStorage.setItem('workout-log-v1', JSON.stringify(s))})()" % LS); await pg.reload(); await pg.wait_for_timeout(500)
                r1 = await pg.locator('.week-n b').inner_text()
                await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(250); await pg.click('[data-act="toggle"][data-k="outCore"]'); await pg.wait_for_timeout(200); await pg.evaluate("document.querySelector('#scrim').click()"); await pg.wait_for_timeout(250)
                r2 = await pg.locator('.week-n b').inner_text(); ok(r0 == r1 and int(r2.split('/')[0]) > int(r1.split('/')[0]), 'runs count toward the weekly goal only when the setting is on (%s, %s, %s)' % (r0, r1, r2))
                await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(250); await pg.click('[data-act="unit"][data-v="lb"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="unit"][data-v="lb"]'); await pg.wait_for_timeout(400); await pg.evaluate("document.querySelector('#scrim').click()")
                sx = await pg.evaluate(LS + ".sessions.out7.entries[0].sets[0]"); ok(abs(sx['dist'] - 6.21) < 0.011 and sx['r'] == 57.5, 'switching to pounds turns 10 km into 6.21 miles and leaves the time alone: %s' % sx)
                await pg.click('[data-tab="progress"]'); await pg.click('[data-act="prog"][data-v="endur"]'); await pg.click('[data-act="sport"][data-v="run"]'); await pg.wait_for_timeout(900); t = await pg.locator('#view').inner_text()
                ok('mi this week' in t and '/mi' in t and ' km' not in t, 'the Endurance page then reads in miles')
                await c.close()
            # ---- narrow phone
            st = seed(); st['settings'] = {'setupDone': True}; o = outing(1, 'out-run', 'outdoor-run', 'Run', 6, [{'w': 0, 'r': 118.75, 'dist': 21.1}]); st['sessions'][o['id']] = o
            c, pg = await page(b, st, errs, 'light', 320)
            for name, act in (('train', None), ('run', '[data-key="out-run"]')):
                if act: await pg.click(act); await pg.wait_for_timeout(400)
                w = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(w[0] <= w[1], '320 px wide, %s: nothing sticks out sideways' % name)
                await pg.screenshot(path=os.path.join(SH, 'T-320-%s.png' % name), full_page=True)
            u = await pg.evaluate(LS + ".draft.items[0].u"); clip = await pg.evaluate("[...document.querySelectorAll('.set.sp input')].map(i => i.scrollWidth > i.clientWidth + 1)"); ok(not any(clip), 'the three fields show a half marathon (21.1, 118, 45) without cutting it off')
            await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(100); await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(200)
            await pg.click('[data-tab="progress"]'); await pg.click('[data-act="prog"][data-v="endur"]'); await pg.wait_for_timeout(900)
            w = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(w[0] <= w[1], '320 px wide, Endurance page: nothing sticks out sideways')
            seg = await pg.evaluate("[...document.querySelectorAll('[data-act=prog]')].map(b => b.scrollWidth > b.clientWidth + 1)"); ok(not any(seg), 'the four Progress tabs fit at 320 px')
            await pg.screenshot(path=os.path.join(SH, 'T-320-endurance.png'), full_page=True)
            await c.close(); await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
