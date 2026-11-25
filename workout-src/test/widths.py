import asyncio, subprocess, sys, time, signal, json
from playwright.async_api import async_playwright
sys.path.insert(0, 'test')
async def tab(pg, name):
    if await pg.is_visible('#wbar [data-act="wmin"]'): await pg.click('#wbar [data-act="wmin"]'); await pg.wait_for_timeout(150)
    await pg.click('[data-tab="%s"]' % name)
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8771', '--bind', '127.0.0.1'], cwd='dist/pwa', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for w in (320, 430):
                c = await b.new_context(viewport={'width': w, 'height': 700}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers='block')
                pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:8771/index.html'); await pg.wait_for_timeout(300)
                async def chk(name):
                    o = await pg.evaluate("(() => { const d = document.documentElement; const bad = [...document.querySelectorAll('#view *, .wbar *, .bar *')].filter(e => e.getBoundingClientRect().right > d.clientWidth + 1 && !e.closest('.chips') && !e.closest('svg')).slice(0, 3).map(e => e.className || e.tagName); return [d.scrollWidth, d.clientWidth, bad]; })()")
                    print(w, name, 'OK' if o[0] <= o[1] and not o[2] else 'OVERFLOW ' + json.dumps(o))
                await chk('setup'); await pg.screenshot(path='shots/w%d-setup.png' % w, full_page=True); await pg.click('[data-act="setup-go"]'); await pg.wait_for_timeout(300)
                await chk('home')
                await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="ed-open"][data-key="upperA"]'); await pg.wait_for_timeout(200); await chk('editor'); await pg.screenshot(path='shots/w%d-editor.png' % w)
                await pg.click('[data-act="ed-cancel"]')
                await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(200); await chk('workout'); await pg.screenshot(path='shots/w%d-workout.png' % w)
                for t in ('overview', 'lifts', 'body'):
                    await tab(pg, 'progress'); await pg.click('[data-act="prog"][data-v="%s"]' % t); await pg.wait_for_timeout(200); await chk('progress ' + t)
                await tab(pg, 'exercises'); await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.wait_for_timeout(200); await chk('exercises'); await pg.click('[data-act="lib3"][data-v="history"]'); await pg.wait_for_timeout(200); await chk('history')
                print('  errors', errs); await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
asyncio.run(main())
