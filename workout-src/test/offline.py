import asyncio, subprocess, sys, time, signal, os
from playwright.async_api import async_playwright
async def main():
    import shutil; shutil.rmtree('/tmp/site', ignore_errors=True); shutil.copytree(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'pwa'), '/tmp/site/workout')   # always the current build
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8770', '--bind', '127.0.0.1'], cwd='/tmp/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('requestfailed', lambda r: errs.append('failed ' + r.url))
            await pg.goto('http://127.0.0.1:8770/workout'); print('landed on', pg.url)
            await pg.wait_for_function("navigator.serviceWorker.controller !== null", timeout=15000)
            print('cached:', await pg.evaluate("caches.keys().then(async ks => { const c = await caches.open(ks[0]); return ks[0] + ' ' + (await c.keys()).map(r => new URL(r.url).pathname).join(' '); })"))
            await pg.click('[data-act="setup-go"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(200)
            srv.send_signal(signal.SIGTERM); srv.wait(); await c.set_offline(True)          # server gone and network off
            await pg.reload(); await pg.wait_for_timeout(800)
            print('offline reload: workout bar visible =', await pg.is_visible('#wbar'), '| clock =', await pg.inner_text('#wbar-clock'), '| fonts =', await pg.evaluate("document.fonts.check('700 20px \"Big Shoulders Display\"') + '/' + document.fonts.check('16px Figtree')"))
            m = await pg.evaluate("fetch('manifest.webmanifest').then(r => r.json()).then(j => j.name + ' ' + j.start_url + ' ' + j.display)"); print('manifest offline:', m)
            await pg.screenshot(path=os.path.join(__import__('_env').SHOTS, 'offline.png'))
            await b.close()
    finally:
        try: srv.send_signal(signal.SIGTERM)
        except Exception: pass
    print('errors:', errs)
asyncio.run(main())
