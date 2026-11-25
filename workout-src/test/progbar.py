"""The workout's progress bar: one continuous thin bar that sweeps when it grows and flashes orange on a record."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8783
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        for scheme in ('light', 'dark'):
            st = seed(); st['settings'] = {'setupDone': True}
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            later = pg.locator('button:has-text("Later")')
            if later.count(): later.first.click(); pg.wait_for_timeout(200)
            pg.click('.btn.start'); pg.wait_for_timeout(500)
            info = lambda: pg.evaluate("(() => { const t = document.querySelector('.wp-track'), f = document.querySelector('.wp-fill'); return { n: document.querySelectorAll('#wbar-prog *').length, h: t.getBoundingClientRect().height, tw: t.getBoundingClientRect().width, fw: f.getBoundingClientRect().width, cls: f.className, anim: getComputedStyle(f).animationName, bg: getComputedStyle(f).backgroundImage }; })()")
            i0 = info()
            ok(i0['n'] == 2 and i0['h'] <= 6 and i0['fw'] == 0, '%s: one thin track with one fill, empty at the start: %s' % (scheme, {k: i0[k] for k in ('n', 'h', 'fw')}))
            ok(i0['anim'] == 'wp-flow' and 'gradient' in i0['bg'] and 'sweep' not in i0['cls'] and 'rec' not in i0['cls'], 'the fill has the flowing colours and nothing plays before a set is ticked')
            d = pg.evaluate(LS + ".draft"); u = d['items'][0]['u']; total = sum(len(it['rows']) for it in d['items'])
            pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u); pg.wait_for_timeout(900)
            i1 = info(); same = pg.evaluate("document.querySelector('.wp-fill') === window.__f") if False else True
            ok(abs(i1['fw'] / i1['tw'] - 1 / total) < 0.01, 'one set of %d fills that share of the bar (%.3f)' % (total, i1['fw'] / i1['tw']))
            ok('sweep' in i1['cls'] or 'rec' in i1['cls'], 'a light sweeps across when the bar grows: %s' % i1['cls'])
            pg.screenshot(path=os.path.join(SH, 'PB-%s-1.png' % scheme), clip={'x': 0, 'y': 0, 'width': 390, 'height': 130})
            # a clear record on the second set
            pg.fill('#w-%s-1' % u, '400'); pg.fill('#r-%s-1' % u, '40') if pg.locator('#r-%s-1' % u).count() else pg.fill('[data-f="r"][data-u="%s"][data-i="1"]' % u, '40')  # 40 reps too: a body-weight exercise counts reps, not kilograms
            pg.click('[data-act="tick"][data-u="%s"][data-i="1"]' % u); pg.wait_for_timeout(350)
            i2 = info(); ok('rec' in i2['cls'], 'a record makes the bar flash orange: %s' % i2['cls'])
            geo = pg.evaluate("(() => { const f = document.querySelector('.wp-fill'), c = getComputedStyle(f); return [f.getBoundingClientRect().height, c.backgroundColor]; })()")
            ok(geo[0] <= 6 and geo[1] != 'rgba(0, 0, 0, 0)', 'the fill keeps its height and colour during the flash: %s' % geo)
            op = float(pg.evaluate("getComputedStyle(document.querySelector('.wp-fill'), '::before').opacity")); ok(op > 0.5, 'the orange is showing a moment after (%.2f)' % op)
            pg.screenshot(path=os.path.join(SH, 'PB-%s-rec.png' % scheme), clip={'x': 0, 'y': 0, 'width': 390, 'height': 130})
            pg.wait_for_timeout(1800)
            op = float(pg.evaluate("getComputedStyle(document.querySelector('.wp-fill'), '::before').opacity")); ok(op == 0, 'and gone again afterwards (%.2f)' % op)
            # unticking shrinks without a sweep replay; a reload plays nothing
            pg.click('[data-act="tick"][data-u="%s"][data-i="1"]' % u); pg.wait_for_timeout(900)
            i3 = info(); ok(abs(i3['fw'] / i3['tw'] - 1 / total) < 0.01, 'unticking takes the bar back')
            pg.reload(); pg.wait_for_timeout(700); i4 = info()
            ok(abs(i4['fw'] / i4['tw'] - 1 / total) < 0.01 and 'sweep' not in i4['cls'] and 'rec' not in i4['cls'], 'after a reload the bar is where it was and nothing plays')
            # minimise and reopen keeps it
            pg.click('#wbar [data-act="wmin"]'); pg.wait_for_timeout(300); pg.click('#wmini'); pg.wait_for_timeout(400); i5 = info()
            ok(abs(i5['fw'] / i5['tw'] - 1 / total) < 0.01 and 'sweep' not in i5['cls'], 'minimising and reopening does not replay the sweep')
            ok(pg.evaluate("document.documentElement.scrollWidth") <= 390, 'nothing sticks out sideways')
            c.close()
        b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
