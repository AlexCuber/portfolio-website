"""Edge cases for steps 1 and 2: an empty log, body goal states, editing, a free workout."""
import asyncio, json, sys, os, subprocess, time, signal, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8772
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('import re\ndef seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
async def page(b, state, errs):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block')
    if state is not None: await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(state)))
    pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(700)
    return c, pg
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            # ---- a brand-new log
            c, pg = await page(b, None, errs)
            ok(await pg.locator('[data-act="setup-go"]').count() == 1, 'new log: the setup screen comes first')
            await pg.click('[data-act="setup-go"]'); await pg.wait_for_timeout(400)
            ok(await pg.locator('.recap').count() == 0, 'new log: no recap card')
            await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(300)
            ok('no workouts yet' in (await pg.locator('#hist-body').inner_text()).lower(), 'new log: History says there is nothing yet')
            await pg.screenshot(path=os.path.join(SH, 'E-history-empty.png'))
            await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(1200)
            ok(await pg.locator('.demo').count() == 1 and await pg.locator('.mm svg').count() == 1, 'new log: Progress shows the example data with the figure')
            await pg.screenshot(path=os.path.join(SH, 'E-progress-demo.png'), full_page=True)
            await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(600)
            ok(await pg.locator('.goal-ln').count() == 0, 'new log: no goal card without a goal')
            await pg.click('[data-tab="log"]'); await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(400)
            ok(await pg.locator('.last-row').count() == len(PLAN['sessions']['upperA']['exercises']) and await pg.locator('text=Target today').count() == 0, 'first workout: no targets, the first-time hint stays')
            ok(await pg.locator('.note:has-text("grey numbers")').count() == 0, 'first workout: no line about grey targets')
            u = await pg.evaluate(LS + ".draft.items[0].u")
            await pg.fill('#w-%s-0' % u, '20'); await pg.fill('#r-%s-0' % u, '8'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(200)
            await pg.click('#finish-btn'); await pg.wait_for_timeout(700)
            t = (await pg.locator('.sheet').inner_text()).lower()
            ok('compared with last time' not in t and 'workout complete' in t, 'first workout: the summary has nothing to compare with and says nothing about it')
            await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
            # second go at the same session: the target comes from the one set done
            await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(400)
            u = await pg.evaluate(LS + ".draft.items[0].u")
            ph = [await pg.get_attribute('#w-%s-%d' % (u, i), 'placeholder') + 'x' + await pg.get_attribute('#r-%s-%d' % (u, i), 'placeholder') for i in range(3)]
            ok(ph == ['20x9', '20x8', '20x8'], 'second workout after one logged set: the target fills every planned set (%s)' % ph)
            await c.close()
            # ---- body goal states
            today = datetime.date.today()
            def body(vals, waist=None):
                o = {}
                for i, v in enumerate(vals):
                    d = (today - datetime.timedelta(days=3 * (len(vals) - 1 - i))).isoformat(); o[d] = {'date': d, 'weight': v}
                    if waist: o[d]['waist'] = waist[i]
                return o
            cases = [('reached', [79.6, 79.8, 79.9, 80.0, 80.1, 80.0, 79.9, 80.0, 80.1, 80.0], 80, 'goal reached', None),
                     ('one entry', [76.0], 80, 'pace needs two weeks', None),
                     ('moving away', [77.5, 77.3, 77.2, 77.0, 76.9, 76.7, 76.6, 76.4, 76.3, 76.1], 80, 'moving away', None),
                     ('too fast', [75, 75.3, 75.7, 76.0, 76.4, 76.7, 77.1, 77.4, 77.8, 78.1], 80, 'faster than target', [82, 82.2, 82.5, 82.7, 83, 83.2, 83.5, 83.7, 84, 84.2]),
                     ('cutting on pace', [84, 83.9, 83.8, 83.7, 83.6, 83.5, 83.4, 83.3, 83.2, 83.1], 78, 'on pace', [90, 89.8, 89.6, 89.4, 89.2, 89, 88.8, 88.6, 88.4, 88.2])]
            for name, vals, goal, pill, waist in cases:
                c, pg = await page(b, {'sessions': {}, 'body': body(vals, waist), 'draft': None, 'draftAt': 0, 'dirty': {}, 'ui': {'tab': 'progress', 'prog': 'body'}, 'settings': {'goalWeight': goal}}, errs)
                await pg.wait_for_timeout(900)
                card = pg.locator('section.card:has(.goal-head)'); t = await card.inner_text() if await card.count() else ''
                ok(pill in t, 'goal, %s: "%s"' % (name, pill)); print('     ', t.replace('\n', ' | ')[:420])
                await card.screenshot(path=os.path.join(SH, 'E-goal-%s.png' % name.replace(' ', '-'))) if t else None
                await c.close()
            # ---- editing a saved workout and a free workout
            st = seed(); c, pg = await page(b, st, errs)
            await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(300); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(150); await pg.click('.hcard.open [data-act="open-session"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="edit-session"]'); await pg.wait_for_timeout(400)
            ok(await pg.locator('#draft-date').count() == 1 and await pg.locator('#draft-dur').count() == 1, 'editing: date and duration stay on the screen')
            ok(await pg.locator('text=Target today').count() == 0 and await pg.locator('#view [data-act="clock"]').count() == 0, 'editing: no targets and no clock link')
            await pg.click('#finish-btn'); await pg.wait_for_timeout(600)
            ok('compared with last time' not in (await pg.locator('.sheet').inner_text()).lower(), 'editing: saving shows no comparison')
            await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
            await pg.click('[data-tab="log"]'); await pg.evaluate('window.scrollTo(0, 99999)'); await pg.click('[data-act="start"][data-key="free"]'); await pg.wait_for_timeout(300)
            await pg.click('[data-act="add-ex"]'); await pg.wait_for_timeout(300); await pg.fill('#pick-q', 'lat pulldown'); await pg.wait_for_timeout(200); await pg.locator('#pick-list [data-act="pick"]').first.click(); await pg.wait_for_timeout(300)
            ok(await pg.locator('text=Target today').count() == 1, 'free workout: an exercise done before still gets a target')
            u = await pg.evaluate(LS + ".draft.items[0].u")
            for i in range(3): await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u, i)); await pg.wait_for_timeout(80)
            await pg.click('#finish-btn'); await pg.wait_for_timeout(700)
            t = (await pg.locator('.sheet').inner_text()).lower()
            ok('compared with last time' not in t and 'save these exercises as a session' in t, 'free workout: no comparison, the usual offer to save it as a session')
            await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
            # a top-of-range session leads to more weight next time
            hi = PLAN['sessions']['lowerA']['exercises'][0]
            await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(400)
            it = await pg.evaluate(LS + ".draft.items[0]"); u = it['u']
            for i in range(it['sets']): await pg.fill('#w-%s-%d' % (u, i), '100'); await pg.fill('#r-%s-%d' % (u, i), str(it['hi'])); await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u, i)); await pg.wait_for_timeout(60)
            await pg.click('#wbar-fin'); await pg.wait_for_timeout(200); await pg.click('#wbar-fin'); await pg.wait_for_timeout(700)
            t = await pg.locator('.sheet .note').inner_text(); ok('goes up to 102.5 kg for %d reps' % it['lo'] in t, 'top of the range on every set: "%s"' % t)
            await pg.screenshot(path=os.path.join(SH, 'E-summary-up.png'))
            await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
            await pg.evaluate("(()=>{const s=%s; s.settings.planOrder=null; localStorage.setItem('workout-log-v1', JSON.stringify(s))})()" % LS)
            await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(400)
            u = await pg.evaluate(LS + ".draft.items[0].u"); card = pg.locator('#x-' + u)
            ok(await card.locator('#w-%s-0' % u).get_attribute('placeholder') == '102.5' and await card.locator('#r-%s-0' % u).get_attribute('placeholder') == str(it['lo']), 'the next workout starts that exercise at 102.5 kg for %d reps' % it['lo'])
            ok('goes up by 2.5 kg' in await card.locator('.last-hint').last.inner_text(), 'and says why')
            await card.screenshot(path=os.path.join(SH, 'E-target-up.png'))
            await c.close(); await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
