"""Editable Endurance card, workout length added up per day, and History as expandable summaries with a day filter."""
import asyncio, json, sys, os, subprocess, time, signal, re, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8776
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
def D(n): return (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
def outing(i, key, ex, name, days, mn, km):
    return {'v': 2, 'id': 'out%d' % i, 'key': key, 'name': name, 'date': D(days), 'startedAt': 0, 'finishedAt': 1, 'dur': int(mn * 60), 'core': False, 'notes': '', 'entries': [{'n': '1', 'ex': ex, 'name': name, 'note': '', 'sets': [{'w': 0, 'r': mn, 'dist': km}]}], 'updatedAt': 1}
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for scheme, w in (('light', 390), ('dark', 390), ('light', 320)):
                print('==', scheme, w); pre = 'H-%s%s-' % ('L' if scheme == 'light' else 'D', '' if w == 390 else '320')
                st = seed(); st['settings'] = {'setupDone': True}
                for k in list(st['sessions']):
                    if st['sessions'][k]['date'] >= D(2): del st['sessions'][k]
                a = outing(1, 'out-run', 'outdoor-run', 'Run', 1, 32, 6); c2 = outing(2, 'out-ride', 'bike-ride', 'Ride', 1, 85, 40); st['sessions'][a['id']] = a; st['sessions'][c2['id']] = c2
                total = len(st['sessions'])
                c = await b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
                await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(700)
                async def shot(n, full=False): await pg.screenshot(path=os.path.join(SH, pre + n + '.png'), full_page=full)
                async def names(): return [x.split('\n')[0].strip() for x in await pg.locator('.out-tile').all_inner_texts()]
                async def fits(what): r = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(r[0] <= r[1], '%d px, %s: nothing sticks out sideways' % (w, what))
                # ---- the Endurance card
                ok(await names() == ['RUN', 'RIDE', 'SWIM'] or [n.lower() for n in await names()] == ['run', 'ride', 'swim'], 'the card starts with Run, Ride, Swim: %s' % await names())
                ok('brick' not in (await pg.locator('#view').inner_text()).lower(), 'Brick is gone')
                rects = await pg.evaluate("[...document.querySelectorAll('.out-tile')].map(e => Math.round(e.getBoundingClientRect().top))"); ok(len(set(rects)) == 1, 'the three sit side by side')
                tl = await pg.evaluate("[...document.querySelectorAll('.out-tile')].map(e => [e.innerText.replace(/\\n/g, ' | '), Math.round(e.getBoundingClientRect().height), Math.round(e.getBoundingClientRect().width)])")
                ok('not logged' not in str(tl).lower() and 'last 6 km' in tl[0][0].lower() and '|' not in tl[2][0] and all(t[1] < t[2] * 1.45 for t in tl), 'tiles are short, show the last outing and say nothing when there is none: %s' % tl)
                await pg.click('[data-act="out-edit"]'); await pg.wait_for_timeout(200)
                rows = [x.split('\n')[0] for x in await pg.locator('.out-row').all_inner_texts()]; ok(rows == ['Run', 'Bike ride', 'Swim'] and await pg.locator('[data-act="out-add"]').count() == 1, 'Edit lists them with move, replace and remove: %s' % rows)
                await pg.evaluate("document.querySelector('.out-row').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(150); await shot('edit'); await fits('editing the card')
                await pg.locator('.out-row').nth(0).locator('[data-act="out-move"][data-d="1"]').click(); await pg.wait_for_timeout(120)
                ok(await pg.evaluate(LS + ".settings.outTiles") == ['bike-ride', 'outdoor-run', 'pool-swim'], 'moving Run later puts the ride first')
                await pg.locator('.out-row').nth(2).locator('[data-act="out-swap"]').click(); await pg.wait_for_timeout(300)
                opts = [x.split('\n')[0] for x in await pg.locator('#pick-list .lib-row').all_inner_texts()]
                ok('Open-water swim' in opts and 'Rowing machine' in opts and 'Run' not in opts and not any('press' in o.lower() for o in opts), 'Replace offers endurance and cardio that is not already there: %s' % opts[:6])
                await shot('pick'); await pg.click('#pick-list [data-ex="open-water-swim"]'); await pg.wait_for_timeout(250)
                ok(await pg.evaluate(LS + ".settings.outTiles") == ['bike-ride', 'outdoor-run', 'open-water-swim'], 'picking one replaces that slot')
                await pg.locator('.out-row').nth(1).locator('[data-act="out-del"]').click(); await pg.wait_for_timeout(120)
                await pg.click('[data-act="out-add"]'); await pg.wait_for_timeout(250); await pg.click('#pick-list [data-ex="rowing-machine"]'); await pg.wait_for_timeout(250)
                await pg.click('[data-act="out-add"]'); await pg.wait_for_timeout(250); await pg.click('#pick-list [data-ex="trail-run"]'); await pg.wait_for_timeout(250)
                ok(await pg.evaluate(LS + ".settings.outTiles") == ['bike-ride', 'open-water-swim', 'rowing-machine', 'trail-run'], 'remove and add work')
                await pg.click('[data-act="out-edit"]'); await pg.wait_for_timeout(250)
                ok([n.lower() for n in await names()] == ['ride', 'open-water swim', 'rowing machine', 'trail run'], 'Done shows the new set of tiles: %s' % await names())
                rects = await pg.evaluate("[...document.querySelectorAll('.out-tile')].map(e => [Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().width)])"); ok(rects[0][0] == rects[1][0] == rects[2][0] and rects[3][0] > rects[0][0] and len(set(r[1] for r in rects)) == 1, 'three to a row, the fourth wraps, all the same width')
                await pg.evaluate("document.querySelector('.out-tiles').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(300); await shot('tiles'); await fits('the edited card')
                await pg.locator('.out-tile').nth(3).click(); await pg.wait_for_timeout(400); d = await pg.evaluate(LS + ".draft")
                ok(d['key'] == 'out-trail-run' and d['name'] == 'Trail run' and [i['ex'] for i in d['items']] == ['trail-run'], 'tapping a tile starts that workout straight away')
                u = d['items'][0]['u']; await pg.fill('#d-%s-0' % u, '7'); await pg.fill('#r-%s-0' % u, '45'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u)
                await pg.click('#wbar-fin'); await pg.wait_for_timeout(200)
                if await pg.locator('#wbar-fin:has-text("Sure")').count(): await pg.click('#wbar-fin')
                await pg.wait_for_timeout(600); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(250)
                ok('7 km' in await pg.locator('.out-tile').nth(3).inner_text(), 'and its tile then shows the last distance')
                await pg.reload(); await pg.wait_for_timeout(500); ok([n.lower() for n in await names()] == ['ride', 'open-water swim', 'rowing machine', 'trail run'], 'the choice survives a reload')
                # ---- workout length adds up a day
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(1500)
                tips = await pg.evaluate("(() => { const c = window.__hiloCharts; return null; })()")
                await pg.click('[data-act="trend"][data-v="dur"]'); await pg.wait_for_timeout(500)
                box = await pg.locator('[data-chart="dur"] svg').bounding_box(); await pg.evaluate("document.querySelector('[data-chart=dur]').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(200); box = await pg.locator('[data-chart="dur"] svg').bounding_box()
                found = ''
                for fx in [0.995 - 0.015 * k for k in range(30)]:
                    await pg.touchscreen.tap(box['x'] + box['width'] * fx, box['y'] + box['height'] * 0.5); await pg.wait_for_timeout(120); t = await pg.locator('#dur-t').inner_text()
                    if 'Run + Ride' in t: found = t; break
                ok('1 h 57 min' in found, 'a day with a run (32 min) and a ride (85 min) is one point of 1 h 57 min: %s' % found.replace('\n', ' | '))
                await shot('length')
                await pg.evaluate('window.scrollTo(0,0)'); await pg.wait_for_timeout(200)
                order = await pg.evaluate("[...document.querySelectorAll('#view > *')].slice(0, 4).map(e => e.className + ':' + (e.querySelector('h3') ? e.querySelector('h3').innerText : ''))")
                ok('consistency' in order[1].lower() and 'tiles six' in order[2], 'Consistency is first on Overview, then the tiles: %s' % order[:3])
                lg = (await pg.locator('#view > section >> nth=0').inner_text()).replace(chr(10), ' ')
                ok('Sets' in lg and 'Less' not in lg and 'More' not in lg and 'One square' not in lg, 'its legend reads Sets, with no sentence under the grid')
                six = await pg.evaluate("[...document.querySelectorAll('.tiles.six .tile')].map(t => [t.innerText.replace(/\\n/g, ' '), Math.round(t.getBoundingClientRect().height), t.querySelector('b').scrollWidth <= t.querySelector('b').clientWidth])")
                ok(len(six) == 6 and any('trained' in t[0] for t in six) and all(t[1] <= 90 and t[2] for t in six), 'six small tiles, one with the hours trained: %s' % [t[0] for t in six])
                mus = await pg.locator('section:has(.mm)').inner_text(); ok('No sets yet' not in mus and 'Each muscle fills' not in mus and await pg.locator('.mm-key').count() == 0, 'the muscle figure has no legend or sentence')
                await shot('overview')
                # ---- history
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(400)
                ok(await pg.locator('#hist-q').count() == 0 and await pg.locator('.hist-sb').count() == 1, 'search is only an icon')
                cards = pg.locator('.hcard'); ok(await cards.count() == 10 and await pg.locator('.hcard.open').count() == 0 and 'Latest workouts' in (await pg.locator('.hist-h').inner_text()).title().replace('Workouts', 'workouts'), 'ten latest workouts, as summaries')
                first = (await cards.first.inner_text()).replace('\n', ' | '); print('     ', first)
                cols = await pg.evaluate("[...document.querySelectorAll('.hcard .hc-head b')].slice(0, 6).map(b => b.className + ':' + getComputedStyle(b).color)")
                ok(await pg.locator('.hcard .avatar').count() == 0 and cols[0].startswith('nmo') and len(set(c.split(':')[1] for c in cols)) >= 3, 'no initials square; the name carries the colour: %s' % cols[:4])
                ok('Trail run' in first and '45 min' in first and '7 km run' in first and 'Trail run | 7 km in' not in first, 'a summary has the name, the date and the totals, not the sets')
                ok(('Showing the latest 10 of %d' % (total + 1)) in await pg.locator('#hist-body').inner_text() and 'Show 10 more' in await pg.locator('[data-act="hist-more"]').inner_text(), 'the list says how many there are and offers ten more')
                await shot('history', True); await fits('History')
                await cards.nth(1).locator('.hc-head').click(); await pg.wait_for_timeout(150)
                ok(await pg.locator('.hcard.open').count() == 1 and await pg.locator('.hcard.open .sess-entry').count() >= 1 and await pg.locator('.hcard.open [data-act="again"]').count() == 1, 'tapping a summary opens the full workout with its buttons')
                await shot('history-open')
                await pg.locator('.hcard.open .hc-head').click(); await pg.wait_for_timeout(150); ok(await pg.locator('.hcard.open').count() == 0, 'tapping it again closes it')
                await pg.locator('[data-act="hist-more"]').scroll_into_view_if_needed(); await pg.wait_for_timeout(150); y0 = await pg.evaluate('window.scrollY'); await pg.click('[data-act="hist-more"]'); await pg.wait_for_timeout(200)
                print('      more:', await cards.count(), y0, await pg.evaluate('window.scrollY')); ok(await cards.count() == 20 and abs(await pg.evaluate('window.scrollY') - y0) < 4, 'Show more adds ten and keeps your place')
                await pg.evaluate('window.scrollTo(0,0)'); day = pg.locator('.hd.on[data-d="%s"]' % D(1)); await day.click(); await pg.wait_for_timeout(300)
                print('      day:', await cards.count(), await pg.locator('.hcard.open').count(), (await pg.locator('#hist-body').inner_text())[-200:].replace(chr(10),' | ')); ok(await cards.count() == 2 and await pg.locator('.hcard.open').count() == 2, 'tapping a day shows only that day\'s workouts, opened')
                await shot('history-day', True)
                await pg.locator('.hd.sel').click(); await pg.wait_for_timeout(250); ok(await pg.locator('.hd.sel').count() == 0 and await cards.count() == 20, 'tapping the day again brings the list back')
                await pg.click('.hist-sb'); await pg.wait_for_timeout(200); ok(await pg.evaluate("document.activeElement.id") == 'hist-q', 'the search icon opens the box and puts the cursor in it'); await shot('search')
                await pg.fill('#hist-q', 'trail'); await pg.wait_for_timeout(200); ok(await pg.locator('#hist-body .item').count() == 1, 'search still finds workouts')
                await pg.click('.hist-sb'); await pg.wait_for_timeout(200); ok(await pg.locator('#hist-q').count() == 0 and await cards.count() == 20, 'closing search clears it')
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
