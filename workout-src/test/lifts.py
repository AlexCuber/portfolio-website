import asyncio, json, sys, os, subprocess, time, signal
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8769; ok = True
src = open(os.path.join(ROOT, 'look.py')).read(); ns = {'__file__': os.path.join(ROOT, 'look.py')}; exec(src.split('async def main(')[0], ns); seed = ns['seed']
def check(name, cond, extra=''):
    global ok; ok = ok and bool(cond); print(('PASS ' if cond else 'FAIL ') + name, extra)
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for scheme in ('light', 'dark'):
                c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme, has_touch=True, is_mobile=True, service_workers='block')
                sd = seed()
                # give one lift a real progression and mixed sets
                k = 0
                for sid in sorted(sd['sessions']):
                    s = sd['sessions'][sid]
                    if s['key'] == 'upperA':
                        s['entries'][0]['sets'] = [{'w': 16 + k * 1.0, 'r': 12}, {'w': 20 + k * 1.0, 'r': 10 - (k % 3)}, {'w': 22 + k * 1.0, 'r': 8}, {'w': 22 + k * 1.0, 'r': 7}]; k += 1
                await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(sd)))
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(300)
                pre = 'L-' if scheme == 'light' else 'D-'
                async def shot(n): await pg.screenshot(path=os.path.join(SH, pre + n + '.png'))
                await pg.click('[data-tab="progress"]'); await pg.click('[data-act="prog"][data-v="lifts"]'); await pg.wait_for_timeout(1800); await shot('lift-max')
                top = await pg.eval_on_selector('.chart[data-chart="exc"] text.val', 'e => e.textContent'); check(scheme + ': default is top weight', top.strip() == str(22 + k - 1), top)
                check('  info text hidden until asked', await pg.query_selector('.note') is None)
                await pg.click('[data-act="lift-info"]'); await pg.wait_for_timeout(100); check('  info opens', 'heaviest weight' in await pg.inner_text('.note'))
                check('  no list of sets under the chart', await pg.query_selector('table.hist') is None); await pg.click('[data-act="lift-sets"]'); await pg.wait_for_timeout(1800); await shot('lift-graph')
                n3 = await pg.eval_on_selector_all('.dot3', 'e => e.length'); check('  every set drawn as a grey dot', n3 == k * 3, n3)
                d = await pg.eval_on_selector('.dot3', 'e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }')
                await pg.touchscreen.tap(d[0], d[1]); await pg.wait_for_timeout(200); tip = await pg.inner_text('#exc-t'); check('  tapping a grey dot shows its reps', '16 kg × 12' in tip, tip.replace('\n', ' | ')); await shot('lift-tip')
                await pg.wait_for_timeout(1100); check('  still showing after 1.3 s', await pg.is_visible('#exc-t'))
                await pg.wait_for_timeout(1100); check('  gone after 2 s', not await pg.is_visible('#exc-t'))
                await pg.click('.card:first-of-type [data-act="lift-mode"][data-v="e1rm"]'); await pg.wait_for_timeout(1800); await shot('lift-e1rm')
                check('  1-rep max info', 'Estimated 1-rep max' in await pg.inner_text('.note'))
                await pg.evaluate('window.scrollTo(0, 1200)'); await pg.wait_for_timeout(200); await shot('lift-pb')
                await pg.click('[data-act="prog"][data-v="overview"]'); await pg.wait_for_timeout(400); await pg.evaluate('window.scrollTo(0, 99999)'); await pg.wait_for_timeout(1500); await shot('ms')
                await pg.click('[data-act="ms-open"][data-i="0"]'); await pg.wait_for_timeout(400); await shot('ms-sheet')
                t = await pg.inner_text('#sheet'); check('  milestone sheet lists eight levels', 'Tin' in t and 'Onyx' in t and 'to go' in t and 'Locked' in t)
                await pg.click('[data-act="sheet-x"]'); await pg.click('[data-act="ms-open"][data-i="3"]'); await pg.wait_for_timeout(300); t = await pg.inner_text('#sheet'); check('  tonnes start at 5 t and end at 1000 t', '\n5 t' in t and '1000 t' in t and '\n1 t' not in t); await shot('ms-sheet')
                await pg.click('[data-act="sheet-x"]')
                # duration of a saved workout
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(200); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(150); await pg.click('.hcard.open [data-act="open-session"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="edit-session"]'); await pg.wait_for_timeout(300)
                sid = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.id")
                await pg.fill('#draft-dur', '73'); await pg.dispatch_event('#draft-dur', 'change'); await pg.evaluate('window.scrollTo(0, 0)'); await shot('edit-dur')
                await pg.click('#finish-btn')
                await pg.wait_for_timeout(500)
                dur = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).sessions['%s'].dur" % sid); check('  edited duration is saved', dur == 73 * 60, dur)
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    check('no page errors', not errs, errs); print('ALL PASS' if ok else 'SOME FAILED')
asyncio.run(main())
