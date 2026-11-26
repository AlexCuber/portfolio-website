import asyncio, json, sys, os, subprocess, time, signal
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8771; ok = True
src = open(os.path.join(ROOT, 'look.py')).read(); ns = {'__file__': os.path.join(ROOT, 'look.py')}; exec(src.split('async def main(')[0], ns); seed = ns['seed']
def check(n, c, e=''):
    global ok; ok = ok and bool(c); print(('PASS ' if c else 'FAIL ') + n, e)
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', accept_downloads=True)
            sd = seed(); await c.add_init_script("if(!localStorage.getItem('workout-log-v1') && !localStorage.getItem('noseed')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(sd)))
            pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(400)
            check('reminder shows when nothing was ever backed up', await pg.query_selector('.backup-card') is not None)
            await pg.screenshot(path=os.path.join(SH, 'L-backup-card.png'))
            await pg.click('[data-act="backup-later"]'); await pg.wait_for_timeout(150); check('Later hides it', await pg.query_selector('.backup-card') is None)
            await pg.evaluate("localStorage.removeItem('hilo-backup-v1')"); await pg.reload(); await pg.wait_for_timeout(300)
            async with pg.expect_download() as dl: await pg.click('.backup-card [data-act="backup-save"]')
            d = await dl.value; path = '/tmp/hilo-bk.json'; await d.save_as(path); data = json.load(open(path))
            check('backup file holds every workout', d.suggested_filename.startswith('hitit-backup-') and len(data['sessions']) == len(sd['sessions']), d.suggested_filename)
            await pg.wait_for_timeout(200); check('reminder gone after saving', await pg.query_selector('.backup-card') is None)
            await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(300); t = await pg.inner_text('#sheet .bk-st'); check('settings show the last backup', t == 'Last backup today', t)
            await pg.screenshot(path=os.path.join(SH, 'L-backup-settings.png'))
            # wipe everything, as after a reinstall, then restore from the file
            await pg.evaluate("localStorage.clear(); localStorage.setItem('noseed', '1')"); await pg.reload(); await pg.wait_for_timeout(300)
            check('after a wipe the log is empty', await pg.evaluate("Object.keys((JSON.parse(localStorage.getItem('workout-log-v1')||'{}').sessions)||{}).length") == 0)
            await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(300); await pg.set_input_files('#backup-file', path); await pg.wait_for_timeout(500)
            n = await pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('workout-log-v1')).sessions).length"); check('restore from file brings every workout back', n == len(sd['sessions']), n)
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    check('no page errors', not errs, errs); print('ALL PASS' if ok else 'SOME FAILED')
asyncio.run(main())
