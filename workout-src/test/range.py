"""The consistency strip (smaller squares, slides back up to three years) and the time range on the exercise graphs."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8794
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
T = datetime.date.today(); D = lambda n: (T - datetime.timedelta(days=n)).isoformat()
IP, LR = 'incline-dumbbell-press', 'cable-lateral-raise'
def log(days, **ui):
    ss = {}
    for i, n in enumerate(days):
        w = 20 + (max(days) - n) // 60
        ss['s%d' % i] = {'v': 2, 'id': 's%d' % i, 'key': 'upperA', 'name': 'Upper A', 'date': D(n), 'startedAt': 1, 'finishedAt': 2, 'dur': 3000, 'core': True, 'notes': '',
                         'entries': [{'n': '1', 'ex': IP, 'name': IP, 'note': '', 'sets': [{'w': w, 'r': 8}] * 3}, {'n': '2', 'ex': LR, 'name': LR, 'note': '', 'sets': [{'w': 5 + w / 10, 'r': 12}] * 3}]}
    u = {'tips': {'t': 1, 's': 1, 'b': 1}, 'recapSeen': '2099-01-01'}; u.update(ui)
    return {'sessions': ss, 'body': {}, 'routines': {}, 'custom': {}, 'settings': {'setupDone': True, 'blockOff': True}, 'ui': u}
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st, w=390):
            c = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            c.add_init_script("localStorage.setItem('hilo-backup-v1', JSON.stringify({ at: Date.now(), n: 9999, later: 0 }))")
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(700); return c, pg
        js = lambda pg, sel: (pg.evaluate("document.querySelector('%s').click()" % sel.replace("'", "\\'")), pg.wait_for_timeout(350))
        CAL = "(function () { var s = document.getElementById('cal-scroll'), g = s.querySelector('.cal-grid'), i = g.querySelector('i').getBoundingClientRect(), n = g.querySelector('i.now').getBoundingClientRect(), r = s.getBoundingClientRect(); return { sq: i.width, sqh: i.height, weeks: g.children.length / 7, vis: Math.floor((r.width + 3) / 14), left: s.scrollLeft, max: s.scrollWidth - s.clientWidth, nowIn: n.left >= r.left && n.right <= r.right + 1, months: [].map.call(s.querySelectorAll('.cal-months span'), function (x) { return x.textContent; }).filter(Boolean), page: document.documentElement.scrollWidth <= window.innerWidth }; })()"

        # ---- four years of training: three are kept, and the strip slides
        c, pg = page(log(list(range(1, 1500, 5)), tab='progress', prog='overview')); k = pg.evaluate(CAL)
        ok(k['sq'] == 11 and k['sqh'] == 11, 'the squares are 11 px (they were about 14)')
        ok(k['vis'] >= 19, 'about %d weeks fit at once on a 390 px screen (16 before)' % k['vis'])
        ok(k['weeks'] == 157, 'the strip goes back three years and no further (%d weeks)' % k['weeks'])
        ok(k['max'] > 1500 and abs(k['left'] - k['max']) <= 2 and k['nowIn'], 'it opens at the right end, with today in view')
        ok(k['page'], 'the page itself does not get wider')
        yrs = [m for m in k['months'] if re.search(r' \d\d$', m)]; ok(len(yrs) == 3 and all(m.startswith('Jan') for m in yrs), 'each January carries its year: %s' % yrs)
        pg.screenshot(path=os.path.join(SH, 'RG-cal.png'))
        pg.evaluate("document.getElementById('cal-scroll').scrollLeft = 300"); pg.wait_for_timeout(250)
        first = pg.evaluate("(function () { var s = document.getElementById('cal-scroll').getBoundingClientRect(); return [].filter.call(document.querySelectorAll('.cal-grid i.on'), function (i) { var r = i.getBoundingClientRect(); return r.left >= s.left && r.right <= s.right; })[0].title; })()")
        yr = int(re.search(r'(\d{4})', first).group(1)) if re.search(r'\d{4}', first) else None
        ok(yr is not None and yr <= T.year - 2, 'slid to the left it shows workouts from two or more years ago (%s)' % first)
        pg.screenshot(path=os.path.join(SH, 'RG-cal-old.png'))
        js(pg, '[data-act="mus-all"]'); ok(abs(pg.evaluate("document.getElementById('cal-scroll').scrollLeft") - 300) <= 2, 'it stays where it was slid to when the page redraws')
        c.close()
        c, pg = page(log([1, 4, 8, 12, 20]), 320); pg.evaluate("document.querySelector('[data-tab=\"progress\"]').click()"); pg.wait_for_timeout(500); k = pg.evaluate(CAL)
        ok(k['weeks'] == 26 and k['nowIn'] and k['page'], 'a new log shows half a year, also on a 320 px screen'); c.close()

        # ---- the time range on Exercise progress
        c, pg = page(log(list(range(1, 800, 7)), tab='progress', prog='lifts', ex=IP, liftView='one'))
        pills = lambda: pg.locator('[data-act="lift-range"]').all_inner_texts(); on = lambda: pg.locator('[data-act="lift-range"][aria-pressed="true"]').inner_text()
        pts = lambda ch: pg.evaluate("document.querySelector('[data-chart=\"%s\"] svg').innerHTML.length" % ch)
        ok(pills() == ['3M', '6M', '1Y', 'All'] and on() == 'All', 'two years of an exercise offer 3M, 6M, 1Y and All; All to begin with')
        all_n = pts('exc'); tile = lambda: re.sub(r'\s+', ' ', pg.locator('#view .stats .stat').first.inner_text())
        t_all = tile(); js(pg, '[data-act="lift-range"][data-v="3m"]'); n3 = pts('exc')
        ok(on() == '3M' and n3 < all_n / 2, '3M leaves the last three months on the graph (the drawing is %d characters, %d for All)' % (n3, all_n))
        ok(pg.evaluate(LS + ".ui.liftRange") == '3m', 'the choice is kept')
        pg.screenshot(path=os.path.join(SH, 'RG-lifts.png'))
        js(pg, '[data-act="lift-view"][data-v="mus"]')
        ok(on() == '3M' and pills() == ['3M', '6M', '1Y', 'All'], 'By muscle has the same switch and keeps the choice')
        d3 = pg.evaluate("document.querySelector('[data-chart=\"mus\"] svg').innerHTML.length"); js(pg, '[data-act="lift-range"][data-v="all"]'); dall = pg.evaluate("document.querySelector('[data-chart=\"mus\"] svg').innerHTML.length")
        ok(dall > d3 * 1.5, 'All draws the whole history again')
        pg.screenshot(path=os.path.join(SH, 'RG-mus.png')); c.close()
        c, pg = page(log(list(range(1, 150, 7)), tab='progress', prog='lifts', ex=IP, liftView='one', liftRange='1y'))
        ok(pills() == ['3M', 'All'] and on() == 'All', 'five months of history offer only 3M and All; a remembered 1Y falls back to All'); c.close()
        c, pg = page(log([1, 8, 15, 22], tab='progress', prog='lifts', ex=IP, liftView='one'))
        ok(pills() == [], 'under three months there is no range switch'); c.close()
        c, pg = page(log([200, 207, 214], tab='progress', prog='lifts', ex=IP, liftView='one', liftRange='3m'))
        ok(pg.locator('[data-chart="exc"] svg').count() == 1 and not errs, 'an exercise with nothing in the range still shows its last workout'); c.close()
        ok(not errs, 'no script errors: %s' % errs[:2])
        b.close()
finally:
    srv.terminate()
print('\n%d checks failed' % len(fails) if fails else '\nall range checks pass'); sys.exit(1 if fails else 0)
