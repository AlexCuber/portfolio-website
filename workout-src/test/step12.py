"""Steps 1 and 2 of the roadmap: targets, comparison, history, tidy chrome, muscle figure, body goal, needs attention, weekly recap.
   Usage: python3 test/step12.py [light|dark]   (writes shots/N-*.png)"""
import asyncio, json, sys, os, subprocess, time, signal, re, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8771
exec(open(os.path.join(ROOT, 'look.py')).read().split('async def main')[0].split('ROOT = ')[0])
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond: fails.append(msg)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
async def main(only=None):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for scheme in ('light', 'dark'):
                if only and scheme != only: continue
                print('==', scheme)
                st = seed(); st['settings'] = {'goalWeight': 80}
                c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme, has_touch=True, is_mobile=True, service_workers='block')
                await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(1500)
                pre = 'N-' + ('L-' if scheme == 'light' else 'D-')
                async def shot(name, full=False): await pg.screenshot(path=os.path.join(SH, pre + name + '.png'), full_page=full)
                async def scroll(y): await pg.evaluate('window.scrollTo(0,%d)' % y); await pg.wait_for_timeout(150)
                # ---- chrome and Train
                ok(await pg.locator('#sync').is_hidden(), 'the "saved on this phone" label is gone from the header')
                ok(await pg.locator('text=Recent workouts').count() == 0, 'Train no longer lists recent workouts')
                dow = datetime.date.today().weekday()
                ok((await pg.locator('.recap').count() == 1) == (dow <= 2), 'weekly recap shows from Monday to Wednesday only (today is weekday %d)' % dow)
                await shot('home')
                if dow <= 2:
                    print('   recap:', (await pg.locator('.recap').inner_text()).replace('\n', ' | '))
                    await pg.click('[data-act="recap-x"]'); await pg.wait_for_timeout(150)
                    ok(await pg.locator('.recap').count() == 0, 'recap closes')
                    await pg.reload(); await pg.wait_for_timeout(600)
                    ok(await pg.locator('.recap').count() == 0, 'recap stays closed after a reload')
                # ---- targets
                await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(400)
                ok(await pg.locator('#draft-date').count() == 0, 'the date field is not on the workout screen')
                ok(await pg.locator('.note:has-text("grey numbers")').count() == 1, 'a line explains the grey targets before the first set')
                items = await pg.evaluate(LS + ".draft.items.map(i=>({u:i.u,ex:i.ex,lo:i.lo,hi:i.hi,sets:i.sets}))")
                cards = []
                for it in items:
                    card = pg.locator('#x-' + it['u'])
                    rows = await card.locator('.last-row').all_inner_texts()
                    ph = [[await card.locator('#w-%s-%d' % (it['u'], i)).get_attribute('placeholder'), await card.locator('#r-%s-%d' % (it['u'], i)).get_attribute('placeholder')] for i in range(it['sets'])]
                    cards.append((it, rows, ph, await card.locator('.last-hint').last.inner_text()))
                for it, rows, ph, hint in cards[:4]: print('   ', it['ex'], '|', ' || '.join(r.replace('\n', ' ') for r in rows), '| placeholders', ph, '|', hint)
                ok(all(len(r) == 2 and 'Target today' in r[1] for _, r, _, _ in cards), 'every exercise with history shows last time and a target')
                # the seeded last Upper A: find one "add a rep" and (if any) one "add weight" case and check the numbers
                last = sorted([s for s in st['sessions'].values() if s['key'] == 'upperA'], key=lambda s: s['date'])[-1]
                for it, rows, ph, hint in cards:
                    prev = [e for e in last['entries'] if e['ex'] == it['ex']][0]['sets']
                    if all(s['r'] >= it['hi'] for s in prev[:it['sets']]):
                        ok(float(ph[0][0]) > prev[0]['w'] and int(ph[0][1]) == it['lo'] and 'goes up' in hint, '%s: every set hit the top, so the target adds weight and restarts at %d reps (%s kg -> %s kg)' % (it['ex'], it['lo'], prev[0]['w'], ph[0][0]))
                    else:
                        k = [i for i, s in enumerate(prev[:it['sets']]) if s['r'] < it['hi']][0]
                        ok(float(ph[k][0]) == prev[k]['w'] and int(ph[k][1]) == prev[k]['r'] + 1 and all(int(ph[i][1]) == prev[i]['r'] for i in range(it['sets']) if i != k), '%s: same weight, one more rep on set %d' % (it['ex'], k + 1))
                await shot('target')
                # accept the target on the first exercise with one tap per set
                u0 = items[0]['u']
                for i in range(items[0]['sets']): await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u0, i)); await pg.wait_for_timeout(120)
                got = await pg.evaluate(LS + ".draft.items[0].rows.map(r=>[r.w,r.r,r.d])")
                ok(all(g[2] and g[0] == cards[0][2][i][0] and g[1] == cards[0][2][i][1] for i, g in enumerate(got[:items[0]['sets']])), 'one tap logs the target as written: %s' % got)
                ok(await pg.locator('.note:has-text("grey numbers")').count() == 0, 'the explanation goes away after the first set')
                # second exercise: fewer reps than last time; third: same as last time
                prev1 = [e for e in last['entries'] if e['ex'] == items[1]['ex']][0]['sets']
                for i in range(items[1]['sets']):
                    await pg.fill('#w-%s-%d' % (items[1]['u'], i), str(prev1[i]['w'])); await pg.fill('#r-%s-%d' % (items[1]['u'], i), str(max(1, prev1[i]['r'] - 1))); await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (items[1]['u'], i))
                prev2 = [e for e in last['entries'] if e['ex'] == items[2]['ex']][0]['sets']
                for i in range(items[2]['sets']):
                    await pg.fill('#w-%s-%d' % (items[2]['u'], i), str(prev2[i]['w'])); await pg.fill('#r-%s-%d' % (items[2]['u'], i), str(prev2[i]['r'])); await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (items[2]['u'], i))
                await pg.wait_for_timeout(200)
                # ---- date behind the clock
                await pg.click('#wbar-clock'); await pg.wait_for_timeout(300)
                ok(await pg.locator('.sheet #draft-date').count() == 1 and await pg.locator('.sheet #clock-t').count() == 1, 'the clock opens a sheet with the date and the start time')
                await shot('clock')
                yday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
                await pg.fill('.sheet #draft-date', yday); await pg.dispatch_event('.sheet #draft-date', 'change')
                d = await pg.evaluate(LS + ".draft"); ok(d['date'] == yday and d.get('dateSet') is True, 'a date picked there is kept')
                await pg.fill('.sheet #draft-date', datetime.date.today().isoformat()); await pg.dispatch_event('.sheet #draft-date', 'change')
                await pg.evaluate("document.querySelector('#scrim').click()"); await pg.wait_for_timeout(200)
                ok(await pg.locator('[data-act="clock"]:has-text("Change the date")').count() == 1, 'the end of the workout also links to the date and time')
                # ---- comparison
                await pg.evaluate("(()=>{const s=%s; s.draft.startedAt=Date.now()-61*60000; localStorage.setItem('workout-log-v1', JSON.stringify(s))})()" % LS); await pg.reload(); await pg.wait_for_timeout(500)
                await pg.click('#wbar-fin'); await pg.wait_for_timeout(200)
                if await pg.locator('#wbar-fin:has-text("Sure")').count(): await pg.click('#wbar-fin')
                await pg.wait_for_timeout(900)
                txt = await pg.locator('.sheet').inner_text(); print('   summary:', txt.replace('\n', ' | ')[:700])
                ok('compared with last time' in txt.lower() and 'Your last Upper A was on' in txt, 'the summary compares with the last Upper A')
                rows = await pg.locator('.cmp li').all_inner_texts()
                ok(len(rows) == 3, 'one row per exercise done (%d)' % len(rows))
                cls = [await pg.locator('.cmp li .delta').nth(i).get_attribute('class') for i in range(len(rows))]
                ok(('up' in cls[0] or 'rec' in cls[0]) and 'down' in cls[1] and 'same' in cls[2], 'better, worse and equal are told apart: %s' % cls)
                ok('fewer' in rows[1] and 'same' in rows[2], 'the labels say what changed: %s / %s' % (rows[1].split('\n')[-1], rows[2].split('\n')[-1]))
                ok(await pg.locator('.sheet .tile em').count() >= 1, 'time or weight lifted is compared with last time')
                ok('Next time.' in txt, 'the summary says what next time starts with')
                await shot('summary'); await pg.evaluate("document.querySelector('.sheet').scrollTo(0, 600)"); await pg.wait_for_timeout(150); await shot('summary2')
                await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(250)
                # ---- history
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(400)
                ok((await pg.locator('#bar-title').inner_text()).lower() == 'history', 'the third tab opens on History')
                n_month = len([s for s in st['sessions'].values() if s['date'][:7] == datetime.date.today().isoformat()[:7]]) + 1
                ok(await pg.locator('.hd.on').count() == len(set([s['date'] for s in st['sessions'].values() if s['date'][:7] == datetime.date.today().isoformat()[:7]] + [datetime.date.today().isoformat()])), 'the calendar marks each day with a workout')
                ok(('%d workouts this month' % n_month) in await pg.locator('#hist-body').inner_text(), 'it counts the month (%d)' % n_month)
                ok(await pg.locator('.hd.sel').count() == 0 and await pg.locator('.hcard').count() == 10 and 'Upper A' in await pg.locator('.hcard').first.inner_text() and await pg.locator('.hcard.open').count() == 0, 'no day is selected and the ten latest workouts are listed as summaries')
                await shot('history'); await scroll(520); await shot('history2'); await scroll(0)
                await pg.click('[data-act="hist-prev"]'); await pg.wait_for_timeout(200)
                prev_m = (datetime.date.today().replace(day=1) - datetime.timedelta(days=1))
                ok(prev_m.strftime('%B %Y').lower() in (await pg.locator('.hist-nav h3').inner_text()).lower(), 'the arrows page through months')
                days = pg.locator('.hd.on'); await days.first.click(); await pg.wait_for_timeout(250)
                ok(await pg.locator('.hd.sel').get_attribute('data-d') == await days.first.get_attribute('data-d') and await pg.locator('.hcard').count() == 1 and await pg.locator('.hcard.open').count() == 1, 'tapping a day shows only that day, opened')
                await pg.locator('.hd.sel').click(); await pg.wait_for_timeout(200); ok(await pg.locator('.hd.sel').count() == 0 and await pg.locator('.hcard').count() == 10, 'tapping the day again brings the full list back')
                await days.first.click(); await pg.wait_for_timeout(200)
                ok(await pg.locator('[data-act="hist-next"]').is_enabled(), 'next month is available from an earlier month')
                await pg.click('[data-act="hist-next"]'); await pg.wait_for_timeout(150)
                ok(await pg.locator('[data-act="hist-next"]').is_disabled(), 'no paging into the future')
                ok(await pg.locator('#hist-q').count() == 0 and await pg.locator('[data-act="hist-search"]').count() == 1, 'search is an icon until tapped')
                await pg.click('[data-act="hist-search"]'); await pg.wait_for_timeout(200); ok(await pg.evaluate("document.activeElement && document.activeElement.id") == 'hist-q', 'tapping it opens the search box with the cursor in it')
                await pg.fill('#hist-q', 'pulldown'); await pg.wait_for_timeout(250)
                res = await pg.locator('#hist-body .item').all_inner_texts()
                ok(len(res) > 3 and all('pulldown' in r.lower() for r in res), 'search finds workouts by exercise and shows that exercise\'s sets (%d found)' % len(res))
                ok(await pg.evaluate("document.activeElement && document.activeElement.id") == 'hist-q', 'typing keeps the search box focused')
                await shot('search')
                await pg.fill('#hist-q', 'zzzz'); await pg.wait_for_timeout(150); ok('nothing found' in (await pg.locator('#hist-body').inner_text()).lower(), 'an empty search says so')
                await pg.click('[data-act="hist-search"]'); await pg.wait_for_timeout(200); ok(await pg.locator('#hist-q').count() == 0 and await pg.locator('.hcard').count() >= 1, 'tapping the icon again closes search and brings the workouts back')
                await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.wait_for_timeout(300)
                ok((await pg.locator('#bar-title').inner_text()).lower() == 'exercises' and await pg.locator('#lib-q').count() == 1, 'the switch shows the exercise library')
                await shot('exercises')
                await pg.reload(); await pg.wait_for_timeout(500); ok(await pg.locator('#lib-q').count() == 1, 'the choice is remembered')
                await pg.click('[data-act="lib3"][data-v="history"]'); await pg.wait_for_timeout(300)
                # do this again: a plan session starts as usual
                await pg.click('.hd.on[data-d="%s"]' % last['date']); await pg.wait_for_timeout(250)
                await pg.click('.hcard.open [data-act="again"]'); await pg.wait_for_timeout(400)
                d = await pg.evaluate(LS + ".draft"); ok(d and d['key'] == 'upperA' and len(d['items']) == len(PLAN['sessions']['upperA']['exercises']), '"Do this again" starts the same session')
                await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(300)
                # do this again: a workout whose exercises differ from the saved session keeps its own exercises
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(300)
                await pg.click('[data-act="hist-search"]'); await pg.fill('#hist-q', 'day 5'); await pg.wait_for_timeout(200); await pg.locator('#hist-body .item').first.click(); await pg.wait_for_timeout(300)
                ok(await pg.locator('.sheet [data-act="again"]').count() == 1, 'the workout sheet offers "Do this again" too')
                await pg.click('.sheet [data-act="again"]'); await pg.wait_for_timeout(400)
                d = await pg.evaluate(LS + ".draft"); ok(d and [i['ex'] for i in d['items']] == ['cable-lateral-raise'], 'repeating an older workout brings back the exercises done that day')
                await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(300)
                await pg.evaluate("document.getElementById('hist-q') && (document.getElementById('hist-q').value='')")
                # ---- progress
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(1800)
                ok(await pg.locator('.mm svg').count() == 1 and await pg.locator('.mm-zones path').count() > 30, 'the muscle figure is on the Progress page')
                fills = await pg.evaluate("[...document.querySelectorAll('.mm-zones path')].map(p=>p.style.fill)")
                print('   zone fills:', sorted(set(fills)))
                ok(any('rgb' in f for f in fills), 'muscles with sets are coloured')
                print('   furthest behind:', (await pg.locator('.mm-side').inner_text()).replace('\n', ' | '))
                att = await pg.locator('.att li').all_inner_texts(); print('   needs attention:', [a.replace('\n', ' | ') for a in att])
                await shot('progress'); await scroll(480); await shot('progress2'); await scroll(1000); await shot('progress3'); await scroll(0)
                await pg.click('[data-act="mus-win"][data-v="four"]'); await pg.wait_for_timeout(900); await scroll(480); await shot('progress-four'); await scroll(0)
                await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(1800)
                gt = await pg.locator('section.card:has(.goal-ln)').inner_text(); print('   goal:', gt.replace('\n', ' | '))
                ok('body weight goal' in gt.lower() and 'At the target pace of 0.25 kg a week' in gt, 'the body page tracks the goal with a pace and a projection')
                ok(await pg.locator('[data-chart="goal"] .proj').count() >= 1 and await pg.locator('[data-chart="goal"] .goal-ln').count() == 1, 'the chart draws the goal line and where the pace leads')
                ok('Waist' in gt, 'waist and weight are read together')
                await shot('body'); await scroll(430); await shot('body2'); await scroll(0)
                box = await pg.locator('[data-chart="goal"] svg').bounding_box()
                await pg.touchscreen.tap(box['x'] + box['width'] * 0.3, box['y'] + box['height'] * 0.5); await pg.wait_for_timeout(200)
                ok(await pg.locator('#goal-t').is_visible() and '7-day average' in await pg.locator('#goal-t').inner_text(), 'tapping the goal chart shows the value')
                await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(300)
                await pg.fill('#set-goalr', '0.5'); await pg.dispatch_event('#set-goalr', 'change'); await pg.wait_for_timeout(200)
                ok(await pg.evaluate(LS + ".settings.goalRate") == 0.5, 'the target pace is a setting')
                await shot('settings'); await pg.evaluate("document.querySelector('#scrim').click()"); await pg.wait_for_timeout(200)
                ok('0.5 kg a week' in await pg.locator('section.card:has(.goal-ln)').inner_text(), 'changing it updates the projection')
                await c.close()
            # ---- narrow phone, artifact build keeps its sync label
            c = await b.new_context(viewport={'width': 320, 'height': 640}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block')
            st = seed(); st['settings'] = {'goalWeight': 80}
            await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:%d/index.html#exercises' % PORT); await pg.wait_for_timeout(700)
            for name, tab, sub in (('history', 'exercises', None), ('progress', 'progress', 'overview'), ('body', 'progress', 'body')):
                await pg.click('[data-tab="%s"]' % tab); await pg.wait_for_timeout(200)
                if sub: await pg.click('[data-act="prog"][data-v="%s"]' % sub)
                await pg.wait_for_timeout(1200)
                w = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(w[0] <= w[1], '320 px wide, %s: nothing sticks out sideways (%s)' % (name, w))
                await pg.screenshot(path=os.path.join(SH, 'N-320-' + name + '.png'), full_page=True)
            await pg.click('[data-tab="log"]'); await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(400)
            w = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(w[0] <= w[1], '320 px wide, workout with targets: nothing sticks out sideways (%s)' % w)
            await pg.screenshot(path=os.path.join(SH, 'N-320-target.png'))
            await c.close(); await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None))
