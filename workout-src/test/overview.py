"""Progress overview (P1, P2, C6, C7) and the small History and Exercises changes (H1, H3)."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8792
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
D = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st, w=390, scheme='light', tab='progress'):
            c = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html#%s' % (PORT, tab)); pg.wait_for_timeout(1300)
            return c, pg
        full = seed(); full['settings'] = {'setupDone': True}

        c, pg = page(full)
        hgt = pg.evaluate("document.documentElement.scrollHeight"); ok(hgt < 2300, 'the overview is %d px tall (it was about 3,100)' % hgt)
        heads = [t.lower() for t in pg.locator('#view h3').all_inner_texts()]; ok(heads == ['consistency', 'needs attention', 'hard sets per muscle', 'trends', 'milestones'], 'cards in order: %s' % heads)
        # ---- needs attention
        rows = pg.locator('.att-row'); n = rows.count(); ok(n >= 1 and pg.locator('.att-more').count() == 0, 'Needs attention is %d short rows, closed' % n)
        t = rows.first.inner_text().split('\n'); ok(len(t) == 2 and len(t[1]) < 45, 'a row is a title and one action: %s' % t)
        ok(rows.first.bounding_box()['height'] <= 60, 'a row is %d px tall' % rows.first.bounding_box()['height'])
        rows.first.tap(); pg.wait_for_timeout(250)
        ok(pg.locator('.att-more').count() == 1 and 'last time' in pg.locator('.att-more p').inner_text() and pg.locator('.att-more [data-act="lift"]').count() == 1, 'tapping it opens the reasoning and "See its chart"')
        pg.locator('.att-row').first.tap(); pg.wait_for_timeout(250); ok(pg.locator('.att-more').count() == 0, 'tapping again closes it')
        # ---- muscles
        seg = pg.locator('[data-act="mus-win"]').all_inner_texts(); ok(seg == ['Last 7 days', '4-week average'], 'the muscle switch reads %s' % seg)
        ok(pg.locator('.mus').count() == 0 and pg.locator('.mm svg').count() == 1, 'the figure shows and the bars are folded away')
        pill = pg.locator('[data-act="mus-all"]'); ok(re.match(r'All \d+ muscles', pill.inner_text()) is not None, 'behind a pill: %s' % pill.inner_text())
        pill.tap(); pg.wait_for_timeout(250); ok(pg.locator('.mus .mus-track').count() >= 8 and pg.locator('[data-act="mus-all"]').inner_text() == 'Hide the list', 'the pill opens the bars for every muscle')
        pg.locator('[data-act="mus-all"]').tap(); pg.wait_for_timeout(200)
        # ---- trends
        ok(pg.locator('[data-act="trend"]').all_inner_texts() == ['Sessions', 'Kilograms', 'Length'] and pg.locator('[data-chart="wk"]').count() == 1 and pg.locator('[data-chart="vol"], [data-chart="dur"]').count() == 0, 'one Trends card with three views, Sessions first')
        ok(pg.locator('#view p.sub').count() - pg.locator('#view .mm-side p.sub').count() == 0, 'no explanatory sentence on the page')
        pg.locator('[data-act="trend"][data-v="vol"]').tap(); pg.wait_for_timeout(400); ok(pg.locator('[data-chart="vol"] svg').count() == 1 and pg.locator('[data-chart="wk"]').count() == 0, 'Kilograms shows weight lifted per week')
        pg.locator('[data-act="trend"][data-v="dur"]').tap(); pg.wait_for_timeout(400); ok(pg.locator('[data-chart="dur"] svg').count() == 1 and 'average' in pg.locator('.pill').last.inner_text(), 'Length shows workout length with its average')
        pg.locator('[data-act="trend-info"]').tap(); pg.wait_for_timeout(200); ok('Minutes from start to finish' in pg.locator('#view p.note').inner_text(), 'the info button explains the chosen view')
        pg.reload(); pg.wait_for_timeout(1000); ok(pg.locator('[data-act="trend"][data-v="dur"]').get_attribute('aria-pressed') == 'true', 'the chosen view is remembered')
        ok(pg.locator('section.card:has(h3:has-text("Milestones")) p').count() == 0, 'Milestones has no paragraph')
        cols = pg.evaluate("[].map.call(document.querySelectorAll('.legend .scale i.l1, .legend .scale i.l4'), function (e) { return getComputedStyle(e).backgroundColor; })")
        def purple(c): r, g, b_ = [int(x) for x in re.findall(r'\d+', c)[:3]]; return b_ > g and b_ > r
        ok(all(purple(x) for x in cols), 'the consistency grid is purple in the default theme: %s' % cols)
        pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path=os.path.join(SH, 'OV-overview.png'), full_page=True); c.close()

        # ---- C6, C7: the same log reads the same on any day of the week
        def log(days):
            s = {'sessions': {}, 'body': {}, 'routines': {}, 'custom': {}, 'settings': {'setupDone': True}, 'ui': {'musWin': 'week'}}
            for i, n in enumerate(days):
                s['sessions']['s%d' % i] = {'id': 's%d' % i, 'key': 'free', 'name': 'Chest day', 'date': D(n), 'startedAt': 0, 'finishedAt': 1, 'dur': 3000, 'entries': [{'n': '1', 'ex': 'barbell-bench-press', 'name': 'Barbell bench press', 'note': '', 'sets': [{'w': 60, 'r': 8}] * 4}]}
            return s
        def chest(pg):
            if not pg.locator('.mus').count(): pg.locator('[data-act="mus-all"]').tap(); pg.wait_for_timeout(250)
            return float(pg.evaluate("(function () { var s = document.querySelectorAll('.mus > span'); for (var i = 0; i < s.length; i++) if (s[i].textContent === 'Chest') return s[i + 1].textContent.split('/')[0]; return '-1'; })()"))
        c, pg = page(log([6, 3, 0])); v7 = chest(pg); ok(v7 == 12, 'three chest workouts in the last 7 days count 12 sets whatever the weekday (%s)' % v7); c.close()
        c, pg = page(log([7, 3, 0])); v = chest(pg); ok(v == 8, 'a workout 7 days ago is outside the last 7 days (%s)' % v); c.close()
        four = log([27, 20, 13, 6]); four['ui']['musWin'] = 'four'
        c, pg = page(four); v = chest(pg); ok(v == 4, 'four weekly workouts in the last 28 days average 4 sets a week (%s)' % v); c.close()
        four = log([28, 20, 13, 6]); four['ui']['musWin'] = 'four'
        c, pg = page(four); v = chest(pg); ok(v == 3, 'a workout 28 days ago is outside the 4-week average (%s)' % v); c.close()

        # ---- H3 and H1
        c, pg = page(full, tab='exercises')
        hd = pg.locator('.hist-nav h3').inner_text(); ok(re.search(r'\d+ workouts?', hd) is not None and 'Tap a day' not in pg.locator('#view').inner_text(), 'History: the month heading carries the count and the sentence under the calendar is gone: %s' % hd.replace('\n', ' | '))
        pg.locator('[data-act="lib3"][data-v="exercises"], [data-v="exercises"]').first.tap(); pg.wait_for_timeout(400)
        ok(pg.evaluate(LS + '.ui.lib') == 'mine' and pg.locator('.chip[aria-pressed="true"]').inner_text() == 'In my plan', 'Exercises opens on "In my plan"')
        n = pg.evaluate("document.documentElement.scrollHeight")
        pg.locator('.chip:has-text("All")').first.tap(); pg.wait_for_timeout(300); n2 = pg.evaluate("document.documentElement.scrollHeight"); ok(n < n2 * 0.7, 'that list is %d px tall and All is %d' % (n, n2))
        pg.reload(); pg.wait_for_timeout(700)
        ok(pg.evaluate(LS + '.ui.lib') == 'all', 'choosing All is remembered and not switched back')
        c.close()

        for w_, sch, pal in [(320, 'dark', ''), (360, 'light', 'violet'), (430, 'dark', 'graphite')]:
            st = json.loads(json.dumps(full)); st['settings']['palette'] = pal
            c, pg = page(st, w=w_, scheme=sch); pg.locator('.att-row').first.tap(); pg.wait_for_timeout(200); pg.locator('[data-act="mus-all"]').tap(); pg.wait_for_timeout(200)
            over = pg.evaluate("document.documentElement.scrollWidth - innerWidth"); ok(over <= 0, '%d px wide: nothing sticks out' % w_)
            pg.screenshot(path=os.path.join(SH, 'OV-%d.png' % w_), full_page=True); c.close()
        b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
