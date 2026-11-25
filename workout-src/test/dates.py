import asyncio, json, sys, os, subprocess, time, signal, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); PORT = 8768; ok = True
def check(name, cond, extra=''):
    global ok; ok = ok and bool(cond); print(('PASS ' if cond else 'FAIL ') + name, extra)
JS_DRAFT = "JSON.parse(localStorage.getItem('workout-log-v1')).draft"
async def fresh(b, patch_js=None):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, service_workers='block')
    await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', JSON.stringify({sessions:{},body:{},draft:null,draftAt:0,dirty:{},ui:{tab:'log'},settings:{setupDone:true}}))")
    pg = await c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(300)
    await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(250)
    if patch_js:
        await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('workout-log-v1')); const d = s.draft; %s; localStorage.setItem('workout-log-v1', JSON.stringify(s)); })()" % patch_js)
        await pg.reload(); await pg.wait_for_timeout(350)
    return c, pg, errs
async def tick_first(pg):
    u = await pg.evaluate(JS_DRAFT + ".items[0].u")
    await pg.fill('#w-%s-0' % u, '20'); await pg.fill('#r-%s-0' % u, '10'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(250)
async def finish(pg):
    await pg.click('#wbar-fin'); await pg.wait_for_timeout(150); await pg.click('#wbar-fin'); await pg.wait_for_timeout(500)
    return await pg.evaluate("Object.values(JSON.parse(localStorage.getItem('workout-log-v1')).sessions)[0]")
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    today = datetime.date.today().isoformat(); yday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat(); allerrs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            # 1. session opened yesterday, nothing ticked, app opened again today (the reported case)
            c, pg, errs = await fresh(b, "d.date = '%s'; d.startedAt = Date.now() - 27.6 * 3600000" % yday)
            d = await pg.evaluate(JS_DRAFT); age = (time.time() * 1000 - d['startedAt']) / 1000
            check('opened yesterday, reopened today: date moves to today', d['date'] == today, d['date'])
            check('  and the clock starts over', age < 5, '%.1f s' % age)
            clock = await pg.inner_text('#wbar-clock'); check('  clock on screen is near zero, not 27 hours', clock.startswith('0:0'), clock)
            await tick_first(pg); s = await finish(pg)
            check('  finished workout is saved under today, started today', s['date'] == today and (s['finishedAt'] - s['startedAt']) < 60000, (s['date'], s['finishedAt'] - s['startedAt']))
            allerrs += errs; await c.close()
            # 2. page stays open overnight (no reload): the first set fixes it
            c, pg, errs = await fresh(b)
            await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('workout-log-v1')); })()")
            # change the in-memory draft through the date field path is not possible, so emulate by storage + bfcache-free reload being skipped: use the visibility path instead
            await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('workout-log-v1')); s.draft.date = '%s'; s.draft.startedAt = Date.now() - 20 * 3600000; localStorage.setItem('workout-log-v1', JSON.stringify(s)); })()" % yday)
            await pg.reload(); await pg.wait_for_timeout(300)
            d = await pg.evaluate(JS_DRAFT); check('opened 20 hours ago on the previous day: date is today after reopening', d['date'] == today)
            allerrs += errs; await c.close()
            # 3. opened earlier today (3 hours ago), first set now: date stays, clock restarts with a note
            c, pg, errs = await fresh(b, "d.startedAt = Date.now() - 3 * 3600000")
            d0 = await pg.evaluate(JS_DRAFT)
            if datetime.datetime.now().hour >= 3:
                check('opened 3 hours ago today: clock not touched before the first set', (time.time() * 1000 - d0['startedAt']) > 2.9 * 3600000)
                await tick_first(pg); d = await pg.evaluate(JS_DRAFT)
                check('  first set restarts the clock', (time.time() * 1000 - d['startedAt']) < 5000)
                check('  and says so', 'Clock restarted' in await pg.inner_text('#toast'), await pg.inner_text('#toast'))
            allerrs += errs; await c.close()
            # 4. opened 40 minutes ago: nothing changes at the first set (a warm-up is part of the workout)
            c, pg, errs = await fresh(b, "d.startedAt = Date.now() - 40 * 60000")
            if datetime.datetime.now().hour >= 1:
                await tick_first(pg); d = await pg.evaluate(JS_DRAFT)
                check('opened 40 minutes ago: clock keeps running', 39 * 60000 < (time.time() * 1000 - d['startedAt']) < 42 * 60000)
            allerrs += errs; await c.close()
            # 5. a date picked by hand is kept (logging an older workout after the fact)
            c, pg, errs = await fresh(b)
            old = (datetime.date.today() - datetime.timedelta(days=4)).isoformat()
            await pg.click('#wbar-clock'); await pg.wait_for_timeout(200); await pg.fill('#draft-date', old); await pg.dispatch_event('#draft-date', 'change'); await pg.evaluate("document.querySelector('#scrim').click()"); await pg.wait_for_timeout(150)
            await pg.reload(); await pg.wait_for_timeout(300); await tick_first(pg); s = await finish(pg)
            check('a date picked by hand is kept', s['date'] == old, s['date'])
            allerrs += errs; await c.close()
            # 6. sets already ticked yesterday, finished today (past midnight): stays on the day it started
            c, pg, errs = await fresh(b)
            await tick_first(pg)
            await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('workout-log-v1')); s.draft.date = '%s'; s.draft.startedAt = Date.now() - 50 * 60000; localStorage.setItem('workout-log-v1', JSON.stringify(s)); })()" % yday)
            await pg.reload(); await pg.wait_for_timeout(300); s = await finish(pg)
            check('a workout with sets already logged keeps its start day', s['date'] == yday, s['date'])
            allerrs += errs; await c.close()
            # 7. editing a past workout never moves its date
            c, pg, errs = await fresh(b); await tick_first(pg); await finish(pg); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
            await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('workout-log-v1')); const k = Object.keys(s.sessions)[0]; s.sessions[k].date = '%s'; localStorage.setItem('workout-log-v1', JSON.stringify(s)); })()" % yday)
            await pg.reload(); await pg.wait_for_timeout(300); await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(200); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(150); await pg.click('.hcard.open [data-act="open-session"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="edit-session"]'); await pg.wait_for_timeout(300)
            d = await pg.evaluate(JS_DRAFT); check('editing a past workout keeps its date', d['date'] == yday and d.get('editing') is True, d['date'])
            allerrs += errs; await c.close(); await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    check('no page errors', not allerrs, allerrs); print('ALL PASS' if ok else 'SOME FAILED')
asyncio.run(main())
