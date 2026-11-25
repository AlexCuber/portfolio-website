"""The outdoor figures' sky follows the clock: morning, day, evening, night."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8779
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        st = seed(); st['settings'] = {'setupDone': True}
        def page(h, scheme, extra=None, m=30):
            s = dict(st); s['settings'] = dict(st['settings'], **(extra or {}))
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(s)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.clock.install(time=datetime.datetime(2026, 11, 20, h, m))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            return c, pg
        tod = "document.documentElement.getAttribute('data-tod')"
        vis = lambda pg, sel: pg.evaluate("getComputedStyle(document.querySelector('.out-tile svg %s')).display" % sel) != 'none'
        for scheme in ('light', 'dark'):
            for h, name in [(4, 'night'), (5, 'morning'), (9, 'morning'), (10, 'day'), (16, 'day'), (17, 'evening'), (20, 'evening'), (21, 'night'), (0, 'night')]:
                c, pg = page(h, scheme)
                got = pg.evaluate(tod); ok(got == name, '%s %02d:30 is %s (got %s)' % (scheme, h, name, got))
                night = name == 'night'
                ok(vis(pg, '.moon') == night and vis(pg, '.stars') == night and vis(pg, '.sun') == (not night), '   moon, stars and sun shown as they should')
                if h in (9, 16, 20, 0):
                    pg.evaluate("document.querySelector('.out-tiles').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
                    pg.locator('.out-tiles').screenshot(path=os.path.join(SH, 'TOD-%s-%s.png' % (scheme, name)))
                    if name != 'day':
                        pg.locator('.out-tile').first.tap(); pg.wait_for_timeout(500)
                        pg.screenshot(path=os.path.join(SH, 'TOD-%s-%s-workout.png' % (scheme, name)))
                c.close()
        # the clock moving past a boundary while the app is open
        c, pg = page(9, 'light', m=58); ok(pg.evaluate(tod) == 'morning', '09:58 is morning')
        pg.clock.fast_forward(3 * 60000); pg.wait_for_timeout(200); ok(pg.evaluate(tod) == 'day', 'three minutes later it is day without a reload')
        c.close()
        # gym figures are untouched at night
        c, pg = page(23, 'light')
        bg = pg.evaluate("(function(){var s=[].slice.call(document.querySelectorAll('svg')).filter(function(x){return x.querySelector('.b')&&!x.classList.contains('out')})[0];return s?getComputedStyle(s).getPropertyValue('--fig').trim():''})()")
        ok(bg in ('', '#12272b'), 'gym figure keeps its light-mode body colour at night (%s)' % bg)
        fig = pg.evaluate("getComputedStyle(document.querySelector('.out-tile svg')).getPropertyValue('--fig').trim()")
        ok(fig == '#e8f1f1', 'outdoor figure is light on the night sky in light mode (%s)' % fig)
        c.close()
        for pal in ('graphite', 'violet', 'lime', 'blossom'):
            for h, name in [(8, 'morning'), (19, 'evening'), (23, 'night')]:
                c, pg = page(h, 'light', {'palette': pal})
                pg.evaluate("document.querySelector('.out-tiles').scrollIntoView({block:'center'})"); pg.wait_for_timeout(150)
                pg.locator('.out-tiles').screenshot(path=os.path.join(SH, 'TOD-%s-%s.png' % (pal, name))); c.close()
        b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
