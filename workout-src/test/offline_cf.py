import asyncio, subprocess, os
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8791'
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B + '/'); await pg.wait_for_function("navigator.serviceWorker.controller !== null", timeout=20000)
        print('cached:', await pg.evaluate("caches.keys().then(async ks => { const c = await caches.open(ks[0]); const rs = await c.keys(); const out = []; for (const r of rs) { const x = await c.match(r); out.push(new URL(r.url).pathname + (x.redirected ? ' (REDIRECTED)' : '')); } return ks[0] + ': ' + out.join(' '); })"))
        r = await pg.goto(B + '/index.html'); await pg.wait_for_timeout(400)
        print('online /index.html ->', pg.url, '| status', r.status, '| app drawn =', await pg.is_visible('.next-title, [data-act="setup-go"]'))
        await pg.goto(B + '/'); await pg.click('[data-act="setup-go"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(300)
        subprocess.run(['pkill', '-f', 'wrangler'], check=False); await pg.wait_for_timeout(1500); await c.set_offline(True)
        await pg.reload(); await pg.wait_for_timeout(700)
        print('offline reload of / : workout bar =', await pg.is_visible('#wbar'), '| fonts =', await pg.evaluate("document.fonts.check('700 20px \"Big Shoulders Display\"') && document.fonts.check('16px Figtree')"))
        try:
            await pg.goto(B + '/index.html'); await pg.wait_for_timeout(500)
            print('offline /index.html : workout bar =', await pg.is_visible('#wbar'))
        except Exception as e: print('offline /index.html FAILED', str(e)[:120])
        try:
            await pg.goto(B + '/#progress'); await pg.wait_for_timeout(500)
            print('offline /#progress : tab =', await pg.inner_text('.tab[aria-current="page"]'))
        except Exception as e: print('offline hash FAILED', str(e)[:120])
        await b.close()
    print('errors:', errs)
asyncio.run(main())
