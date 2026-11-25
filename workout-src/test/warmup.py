"""Warm-up sets added from the Warm-up sheet: shown above set 1, marked W, saved with the workout, kept out of the statistics."""
import asyncio, json, sys, os, subprocess, time, signal, re, datetime, random, math
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8778
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for scheme, w in (('light', 390), ('dark', 390), ('light', 320)):
                print('==', scheme, w); random.seed(3); st = seed(); st['settings'] = {'setupDone': True}
                c = await b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
                await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(600)
                await pg.locator('[data-act="start"][data-key="upperA"]').first.click(); await pg.wait_for_timeout(500)
                d = await pg.evaluate(LS + ".draft"); it = d['items'][0]; u = it['u']; sub0 = await pg.inner_text('#wbar-sub')
                ph0 = await pg.get_attribute('#w-%s-0' % u, 'placeholder')
                wbtn = pg.locator('#x-%s [data-act="warm-one"]' % u); steps = 3
                await wbtn.click(); await pg.wait_for_timeout(250)
                ok(await pg.locator('.sheet-wrap.open, .sheet.open').count() == 0 and not await pg.is_visible('.sheet') and await pg.locator('#x-%s .set.warm' % u).count() == 1, 'one tap on Warm-up adds one warm-up set, with no sheet')
                await wbtn.click(); await pg.wait_for_timeout(200); await wbtn.click(); await pg.wait_for_timeout(200); await wbtn.click(); await pg.wait_for_timeout(250)
                ok(await pg.locator('#x-%s .set.warm' % u).count() == 4, 'each further tap adds another')
                # remove a set: ticks turn into crosses, any one can go
                rm = pg.locator('#x-%s [data-act="del-set"]' % u); ok((await rm.inner_text()).strip() == 'Remove set', 'the link reads Remove set')
                await rm.click(); await pg.wait_for_timeout(250)
                nrow = await pg.locator('#x-%s .set' % u).count(); ok(await pg.locator('#x-%s .tick.del' % u).count() == nrow and await pg.locator('#x-%s [data-act="tick"], #x-%s [data-act="wtick"]' % (u, u)).count() == 0 and (await rm.inner_text()).strip() == 'Cancel', 'every tick becomes a cross (%d) and the link reads Cancel' % nrow)
                col = await pg.evaluate("getComputedStyle(document.querySelector('.tick.del svg')).stroke"); ok(col in ('rgb(207, 58, 58)', 'rgb(240, 112, 112)'), 'the crosses are red: %s' % col)
                await pg.screenshot(path=os.path.join(SH, 'W-del-%s%d.png' % (scheme[0], w)))
                last_w = await pg.locator('#x-%s .set.warm input[data-wf="w"]' % u).nth(3).input_value()
                await pg.locator('#x-%s .set.warm .tick.del' % u).nth(3).click(); await pg.wait_for_timeout(250)
                ok(await pg.locator('#x-%s .set.warm' % u).count() == 3 and await pg.locator('#x-%s .tick.del' % u).count() == 0, 'tapping a cross removes that set and the ticks come back')
                n0 = await pg.locator('#x-%s .set:not(.warm)' % u).count(); await pg.fill('#w-%s-1' % u, '77'); await rm.click(); await pg.wait_for_timeout(200); await pg.locator('#x-%s .set:not(.warm) .tick.del' % u).nth(0).click(); await pg.wait_for_timeout(250)
                ok(await pg.locator('#x-%s .set:not(.warm)' % u).count() == n0 - 1 and await pg.input_value('#w-%s-0' % u) == '77', 'a working set in the middle can go too: the first was removed and the second moved up')
                await pg.click('#x-%s [data-act="add-set"]' % u); await pg.wait_for_timeout(200); await pg.fill('#w-%s-0' % u, ''); await rm.click(); await pg.wait_for_timeout(150); await rm.click(); await pg.wait_for_timeout(200)
                ok(await pg.locator('#x-%s .tick.del' % u).count() == 0, 'Cancel leaves everything as it was')
                rows = await pg.evaluate("[...document.querySelectorAll('#x-%s .set')].map(r => [r.classList.contains('warm'), r.querySelector('.set-n').innerText, [...r.querySelectorAll('input')].map(i => i.value).join('x')])" % u)
                ok([r[0] for r in rows[:steps]] == [True] * steps and all(r[1] == 'W' for r in rows[:steps]) and rows[steps][0] is False and rows[steps][1] == '1' and all(re.match(r'[\d.]+x\d+$', r[2]) for r in rows[:steps]), 'they sit above set 1, marked W, with suggested weight and reps filled in: %s' % rows[:steps + 1])
                ok(await pg.inner_text('#wbar-sub') == sub0 and await pg.get_attribute('#w-%s-0' % u, 'placeholder') == ph0, 'the set count and the target for set 1 do not change (%s)' % sub0)
                r = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(r[0] <= r[1], '%d px: nothing sticks out sideways' % w)
                await pg.locator('#x-%s [data-act="wtick"]' % u).nth(0).click(); await pg.wait_for_timeout(250); await pg.locator('#x-%s [data-act="wtick"]' % u).nth(1).click(); await pg.wait_for_timeout(250)
                ok(await pg.locator('#x-%s .set.warm.done' % u).count() == 2 and await pg.inner_text('#wbar-sub') == sub0 and not await pg.is_visible('#rest'), 'ticking warm-up sets marks them done without counting them or starting the rest timer')
                await pg.locator('#x-%s .set.warm input[data-wf="r"]' % u).nth(1).fill('6'); await pg.wait_for_timeout(150)
                await pg.evaluate("document.getElementById('x-%s').scrollIntoView({block:'start'}); window.scrollBy(0, -90)" % u); await pg.wait_for_timeout(250); await pg.screenshot(path=os.path.join(SH, 'W-%s%d.png' % (scheme[0], w)))
                await pg.fill('#w-%s-0' % u, '60'); await pg.fill('#r-%s-0' % u, '8'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(300)
                await pg.reload(); await pg.wait_for_timeout(600); ok(await pg.locator('#x-%s .set.warm.done' % u).count() == 2, 'they survive a reload')
                await pg.click('#wbar-fin'); await pg.wait_for_timeout(200)
                if await pg.locator('#wbar-fin:has-text("Sure")').count(): await pg.click('#wbar-fin')
                await pg.wait_for_timeout(700); tiles = (await pg.locator('.sheet .tiles').inner_text()).replace('\n', ' ')
                s = await pg.evaluate("Object.values(" + LS + ".sessions).find(x => x.id === '%s')" % d['id']); en = s['entries'][0]
                ok(len(en['sets']) == 1 and len(en.get('warm', [])) == 2 and en['warm'][1]['r'] == 6 and en['sets'][0]['w'] == 60, 'saved as warm-up beside the one working set: %s' % en.get('warm'))
                ok('1 set' in tiles.replace('sets', 'set') or re.search(r'\b1\s+set', tiles), 'the summary counts one set: %s' % tiles[:60]); ok('480' in tiles, 'weight lifted is the working set only (60 x 8 = 480): %s' % tiles)
                await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(300); await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(400); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(200)
                t = await pg.locator('.hcard.open').inner_text(); ok('Warm-up:' in t and '1 set' in t, 'History shows the warm-up on its own line and still says 1 set')
                await pg.click('.hcard.open [data-act="open-session"]'); await pg.wait_for_timeout(300); ed = pg.locator('[data-act="edit-session"]')
                if await ed.count(): await ed.first.click(); await pg.wait_for_timeout(400)
                ok(await pg.locator('.set.warm.done').count() == 2, 'editing the saved workout brings the warm-up sets back')
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
