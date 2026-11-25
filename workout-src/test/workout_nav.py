"""A workout that can be minimised to a bar above the tabs, the calmer bars, chart colours and the colour themes in settings."""
import asyncio, json, sys, os, subprocess, time, signal, re, datetime, random, math
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8777
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
VAR = "getComputedStyle(document.documentElement).getPropertyValue('%s').trim()"
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
                async def tabs(): return await pg.evaluate("getComputedStyle(document.querySelector('.tabs')).display") != 'none'
                async def fits(what): r = await pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"); ok(r[0] <= r[1], '%d px, %s: nothing sticks out sideways' % (w, what))
                later = pg.locator('button:has-text("Later")')
                if await later.count(): await later.first.click(); await pg.wait_for_timeout(200)
                ok(await tabs() and not await pg.is_visible('#wmini'), 'no workout: tabs shown, no workout bar at the bottom')
                # ---- open workout
                await pg.click('.btn.start'); await pg.wait_for_timeout(500)
                ok(not await tabs() and await pg.is_visible('#wbar [data-act="wmin"]') and not await pg.is_visible('#wmini') and not await pg.is_visible('#bar'), 'workout open: tabs hidden, a minimise button in the top bar')
                bg = await pg.evaluate("getComputedStyle(document.getElementById('wbar')).backgroundImage + getComputedStyle(document.getElementById('wbar')).color")
                ok('gradient' not in bg and (await pg.evaluate("getComputedStyle(document.getElementById('wbar')).color")) == (await pg.evaluate("getComputedStyle(document.body).color")), 'the top bar takes the page colours, not a dark block')
                tg = await pg.evaluate("[...document.querySelectorAll('.exc-target')].map(e => [e.innerText, e.scrollWidth <= e.clientWidth, Math.round(e.getBoundingClientRect().height)])")
                ok(len(tg) >= 1 and all(t[1] and t[2] <= 26 and '\u2013' not in t[0] for t in tg), 'the line under the open exercise\'s name is one line, not cut, with short dashes: %s' % tg[0])
                rr = await pg.evaluate("['#rest', '#wmini'].map(q => parseFloat(getComputedStyle(document.querySelector(q)).borderTopLeftRadius))"); ok(all(r >= 30 for r in rr), 'the countdown bar and the minimised bar have round ends: %s' % rr)
                br = await pg.evaluate("['#wbar-fin', '.seg', '.seg button', '.btn', '.icon-btn'].map(q => { const e = document.querySelector(q); return e ? [q, parseFloat(getComputedStyle(e).borderTopLeftRadius) >= e.getBoundingClientRect().height / 2 - 1] : [q, true] })")
                ok(all(x[1] for x in br), 'buttons and segmented controls have fully round ends: %s' % br)
                await fits('workout open'); nm = await pg.evaluate("[document.getElementById('wbar-name').scrollWidth, document.getElementById('wbar-name').clientWidth]"); ok(nm[0] <= nm[1], 'the session name fits beside the minimise button: %s' % nm)
                d = await pg.evaluate(LS + ".draft"); u = d['items'][0]['u']
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); await pg.wait_for_timeout(400)
                rb = await pg.evaluate("(() => { const r = document.getElementById('rest').getBoundingClientRect(); return [Math.round(innerHeight - r.bottom), getComputedStyle(document.getElementById('rest')).backgroundColor] })()")
                ok(await pg.is_visible('#rest') and 0 <= rb[0] <= 40, 'the countdown sits at the bottom of the screen: %s' % rb)
                # ---- minimised
                await pg.click('#wbar [data-act="wmin"]'); await pg.wait_for_timeout(500)
                txt = (await pg.locator('#wmini').inner_text()).replace('\n', ' | ')
                ok(await tabs() and await pg.is_visible('#wmini') and await pg.is_visible('#bar') and not await pg.is_visible('#wbar') and not await pg.is_visible('#rest'), 'minimised: the app with its tabs, and one bar for the workout')
                ok(re.search(r'Rest \| \d:\d\d', txt) and '1 of' in txt and 'sets done' in txt, 'that bar shows the rest countdown and where you are: %s' % txt)
                ok('in progress' in (await pg.locator('.next').inner_text()).lower() and await pg.locator('.next [data-act="go-workout"]').count() == 1, 'Train shows the workout as in progress')
                pos = await pg.evaluate("(() => { const m = document.getElementById('wmini').getBoundingClientRect(), t = document.querySelector('.tabs-in').getBoundingClientRect(); return [Math.round(t.top - m.bottom), Math.round(m.left), Math.round(innerWidth - m.right)] })()")
                ok(0 <= pos[0] <= 24 and pos[1] >= 8 and pos[2] >= 8, 'it sits just above the tabs: %s' % pos); await fits('minimised')
                await pg.screenshot(path=os.path.join(SH, 'N-%s%d-mini.png' % (scheme[0], w)))
                await pg.locator('[data-act="start"][data-key]').first.click(); await pg.wait_for_timeout(300)
                ok('in progress first' in (await pg.locator('#toast').inner_text()).lower() and (await pg.evaluate(LS + ".draft.id")) == d['id'], 'starting another session is refused with a message')
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(700); ok(await pg.is_visible('#wmini') and await tabs(), 'the bar follows you to Progress')
                await pg.reload(); await pg.wait_for_timeout(700); ok(await pg.is_visible('#wmini') and await pg.evaluate(LS + ".ui.tab") == 'progress', 'and it is still minimised after a reload')
                await pg.click('#wmini'); await pg.wait_for_timeout(500)
                ok(not await tabs() and await pg.is_visible('#wbar') and not await pg.is_visible('#wmini') and await pg.evaluate(LS + ".ui.tab") == 'log' and await pg.locator('[data-act="tick"]').count() > 0, 'tapping it opens the workout again')
                if await pg.is_visible('#rest'): await pg.click('[data-act="rest-skip"]'); await pg.wait_for_timeout(200)
                await pg.click('#wbar [data-act="wmin"]'); await pg.wait_for_timeout(1300); txt = (await pg.locator('#wmini').inner_text()).replace('\n', ' | ')
                ok(re.match(r'%s \| \d+:\d\d \|' % re.escape(d['name']), txt) and not await pg.is_visible('#wmini-dot'), 'with no countdown it shows the name and the clock: %s' % txt)
                await pg.click('.next [data-act="go-workout"]'); await pg.wait_for_timeout(400); ok(not await tabs(), 'Back to the workout on Train opens it too')
                await pg.evaluate("location.hash = 'exercises'"); await pg.wait_for_timeout(600); ok(await tabs() and await pg.is_visible('#wmini'), 'leaving by the address minimises instead of losing the tabs')
                await pg.click('#wmini'); await pg.wait_for_timeout(400); await pg.reload(); await pg.wait_for_timeout(700); ok(not await tabs() and await pg.is_visible('#wbar'), 'an open workout is still open after a reload')
                await pg.click('#wbar-fin'); await pg.wait_for_timeout(200)
                if await pg.locator('#wbar-fin:has-text("Sure")').count(): await pg.click('#wbar-fin')
                await pg.wait_for_timeout(700); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(300)
                ok(await tabs() and not await pg.is_visible('#wmini') and await pg.evaluate(LS + ".draft") is None, 'after finishing, the tabs are back and the bar is gone')
                # ---- editing a saved workout keeps the tabs
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(400); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(200); await pg.click('.hcard.open [data-act="open-session"]'); await pg.wait_for_timeout(300)
                ed = pg.locator('.sheet [data-act="edit-session"], [data-act="edit-session"]')
                if await ed.count(): await ed.first.click(); await pg.wait_for_timeout(400)
                ok(await pg.evaluate("!!(" + LS + ".draft || {}).editing") and await tabs() and not await pg.is_visible('#wmini'), 'editing a saved workout keeps the tabs and has no bar')
                await pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('workout-log-v1')); s.draft = null; localStorage.setItem('workout-log-v1', JSON.stringify(s)); })()"); await pg.reload(); await pg.wait_for_timeout(600)
                # ---- charts and colour themes
                a0 = await pg.evaluate(VAR % '--accent'); s1 = await pg.evaluate(VAR % '--series-1'); ok(s1 in ('#3f1a98', '#7a52ea') and s1 != a0, 'default charts are purple, not the turquoise accent: %s' % s1)
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(1200)
                bar = await pg.evaluate("(() => { const st = document.querySelector('[data-chart=wk] linearGradient stop:last-child'); return getComputedStyle(st).stopColor })()"); ok(bar in ('rgb(63, 26, 152)', 'rgb(122, 82, 234)'), 'bars are drawn in it: %s' % bar)
                await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(400)
                order = await pg.evaluate("[...document.querySelectorAll('.sheet .setting b')].map(b => b.innerText)"); ok(order[:2] == ['Appearance', 'Theme'] and await pg.locator('.setting:has(.pal) small').count() == 0, 'Theme is right under Appearance, with no sentence under it: %s' % order[:3])
                names = await pg.locator('.pal button').all_inner_texts(); ok(names == ['Default', 'Graphite', 'Violet', 'Lime', 'Blossom'] and await pg.locator('.pal button[aria-pressed="true"]').inner_text() == 'Default', 'five themes, Default chosen: %s' % names)
                row = await pg.evaluate("[...document.querySelectorAll('.pal button')].map(b => [Math.round(b.getBoundingClientRect().top), b.lastElementChild.scrollWidth <= b.lastElementChild.clientWidth, getComputedStyle(b.querySelector('.pal-sw')).backgroundImage.includes('linear-gradient')])")
                ok(len(set(r[0] for r in row)) == 1 and all(r[1] and r[2] for r in row), 'all on one row, each a gradient, names not cut off: %s' % row)
                await fits('settings'); seen = {'': a0}
                for k in ('blossom', 'graphite', 'violet', 'lime'):
                    await pg.click('[data-act="palette"][data-v="%s"]' % k); await pg.wait_for_timeout(300); seen[k] = await pg.evaluate(VAR % '--accent')
                    if k == 'blossom': ok(await pg.evaluate(VAR % '--lime') == '#ff6fae' and await pg.evaluate(VAR % '--series-1') in ('#a3155a', '#e0407f'), 'Blossom turns the action colour and the charts pink')
                    ok(await pg.evaluate("document.documentElement.getAttribute('data-palette')") == k and await pg.evaluate(LS + ".settings.palette") == k and await pg.locator('.pal button[aria-pressed="true"]').inner_text() == k.title(), '%s applies and is saved' % k.title())
                ok(len(set(seen.values())) == 5, 'each theme has its own accent: %s' % seen)
                ok(await pg.evaluate(VAR % '--lime') == '#b6ff1a' and await pg.evaluate(VAR % '--out') in ('#7357f6', '#8f78f5'), 'lime and the endurance violet stay')
                ok(await pg.evaluate("document.querySelector('meta[name=theme-color]').content") == await pg.evaluate(VAR % '--bg'), 'the status bar colour follows the theme')
                await pg.reload(); await pg.wait_for_timeout(600); ok(await pg.evaluate("document.documentElement.getAttribute('data-palette')") == 'lime' and await pg.evaluate(VAR % '--accent') == seen['lime'], 'the theme survives a reload')
                await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(300); other = 'dark' if scheme == 'light' else 'light'
                await pg.click('[data-act="theme"][data-v="%s"]' % other); await pg.wait_for_timeout(300); flip = await pg.evaluate(VAR % '--accent'); ok(flip != seen['lime'] and flip in ('#47780a', '#a6e22a'), 'Appearance still switches light and dark inside a theme: %s' % flip)
                await pg.click('[data-act="theme"][data-v="auto"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="palette"][data-v=""]'); await pg.wait_for_timeout(300)
                ok(await pg.evaluate("document.documentElement.hasAttribute('data-palette')") is False and await pg.evaluate(VAR % '--accent') == a0, 'Default brings the original colours back')
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
