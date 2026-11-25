"""The countdown bar: minus and plus for the rest timer, and for holds and cardio."""
import asyncio, json, sys, os, subprocess, time, signal, re
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8774
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
def secs(t): m = re.match(r'^(\d+):(\d\d)$', t); return int(m.group(1)) * 60 + int(m.group(2)) if m else None
SEED = "localStorage.setItem('workout-log-v1', JSON.stringify({sessions:{},body:{},draft:null,draftAt:0,dirty:{},ui:{tab:'log'},settings:{setupDone:true}}))"
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for w, scheme in ((390, 'light'), (375, 'light'), (320, 'dark')):
                print('==', w, scheme)
                c = await b.new_context(viewport={'width': w, 'height': 760}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme)
                await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) " + SEED)
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(500)
                await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(300)
                u = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items[0].u")
                await pg.fill('#w-%s-0' % u, '60'); await pg.fill('#r-%s-0' % u, '8'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(300)
                btn = [x.strip() for x in await pg.locator('#rest button').all_inner_texts()]
                ok(btn == ['−', '+', 'Skip'] and await pg.locator('#rest-by').inner_text() == '30 s', 'the rest bar has minus, the step, plus and Skip: %s' % btn)
                t0 = secs(await pg.locator('#rest-t').inner_text()); await pg.click('#rest [data-act="rest-sub"]'); await pg.wait_for_timeout(120); t1 = secs(await pg.locator('#rest-t').inner_text())
                ok(t0 - t1 in (30, 31), 'minus takes 30 seconds off (%s -> %s)' % (t0, t1))
                await pg.click('#rest [data-act="rest-add"]'); await pg.click('#rest [data-act="rest-add"]'); await pg.wait_for_timeout(120); t2 = secs(await pg.locator('#rest-t').inner_text())
                ok(t2 - t1 in (59, 60), 'plus adds 30 seconds each tap (%s -> %s)' % (t1, t2))
                box = await pg.locator('#rest').bounding_box(); kids = await pg.evaluate("[...document.querySelectorAll('#rest > *')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; })"); tw = await pg.evaluate("(() => { const b = document.getElementById('rest-t'), r = document.createRange(); r.selectNodeContents(b); return [r.getBoundingClientRect().right, b.parentElement.getBoundingClientRect().right]; })()"); ok(tw[0] <= tw[1] + 0.5, 'the time is not cut off (%d of %d)' % (tw[0], tw[1]))
                ok(all(kids[i][1] <= kids[i + 1][0] for i in range(len(kids) - 1)) and kids[-1][1] <= box['x'] + box['width'] and (await pg.evaluate("document.documentElement.scrollWidth")) <= w, 'everything fits in the bar at %d px wide' % w)
                await pg.screenshot(path=os.path.join(SH, 'R-rest-%d.png' % w))
                n = 0
                while await pg.locator('#rest').is_visible() and n < 12: await pg.click('#rest [data-act="rest-sub"]'); await pg.wait_for_timeout(60); n += 1
                ok(await pg.locator('#rest').is_hidden() and n == (t2 + 29) // 30, 'minus with under 30 seconds left ends the rest (%d taps from %s s)' % (n, t2))
                await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(300)
                # holds and cardio
                await pg.click('[data-act="start"][data-key="day5"]'); await pg.wait_for_timeout(300)
                its = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items.map(i=>({u:i.u,ex:i.ex}))"); sp = [x for x in its if x['ex'] == 'side-plank'][0]['u']; ca = [x for x in its if x['ex'] == 'zone-2-cardio'][0]['u']
                await pg.click('#x-%s [data-act="timer"][data-i="0"]' % ca); await pg.wait_for_timeout(300)
                btn = [x.strip() for x in await pg.locator('#rest button').all_inner_texts()]; ok(btn == ['−', '+', 'Stop'] and await pg.locator('#rest-by').inner_text() == '1 min', 'cardio: minus and plus work in minutes')
                a = secs(await pg.locator('#rest-t').inner_text()); await pg.click('#rest [data-act="rest-sub"]'); await pg.wait_for_timeout(120); bb = secs(await pg.locator('#rest-t').inner_text()); ok(a - bb in (60, 61), 'cardio: minus takes a minute off (%s -> %s)' % (a, bb))
                tw = await pg.evaluate("(() => { const b = document.getElementById('rest-t'), r = document.createRange(); r.selectNodeContents(b); return [r.getBoundingClientRect().right, b.parentElement.getBoundingClientRect().right]; })()"); ok(tw[0] <= tw[1] + 0.5, 'cardio: the time is not cut off (%d of %d)' % (tw[0], tw[1]))
                await pg.screenshot(path=os.path.join(SH, 'R-cardio-%d.png' % w))
                await pg.click('#rest [data-act="rest-skip"]'); await pg.wait_for_timeout(200)
                if await pg.locator('button#x-%s' % sp).count(): await pg.click('button#x-%s' % sp); await pg.wait_for_timeout(350)
                await pg.fill('#r-%s-0' % sp, '25'); await pg.click('#x-%s [data-act="timer"][data-i="0"]' % sp); await pg.wait_for_timeout(300)
                btn = [x.strip() for x in await pg.locator('#rest button').all_inner_texts()]; ok(btn == ['−', '+', 'Stop'] and await pg.locator('#rest-by').inner_text() == '10 s', 'a hold: minus and plus work in tens of seconds')
                await pg.click('#rest [data-act="rest-sub"]'); await pg.click('#rest [data-act="rest-sub"]'); await pg.click('#rest [data-act="rest-sub"]'); await pg.wait_for_timeout(100)
                ok(await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.timer.total") == 10, 'during the get-ready count a hold cannot go under 10 seconds')
                await pg.wait_for_timeout(5200); await pg.click('#rest [data-act="rest-add"]'); await pg.wait_for_timeout(150); ok(secs(await pg.locator('#rest-t').inner_text()) in (19, 20), 'plus during the hold adds 10 seconds: %s' % await pg.locator('#rest-t').inner_text())
                await pg.wait_for_timeout(1400); await pg.click('#rest [data-act="rest-sub"]'); await pg.click('#rest [data-act="rest-sub"]'); await pg.wait_for_timeout(250)
                row = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items.filter(i=>i.ex==='side-plank')[0].rows[0]"); ok(row['d'] is True and row['r'] in ('1', '2', '3') , 'minus past the time already held ends the hold and logs the seconds held (%s s)' % row['r'])
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
