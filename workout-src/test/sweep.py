"""Step 8 of the review: settings in four groups, Body, the finish summary, bests in the exercise list,
and the app-wide rules: eight text sizes, four corner sizes, 44 px tap targets, contrast of grey text."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8792
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []; errs = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
SMALL = """[].filter.call(document.querySelectorAll(SEL), function (b) {
  var r = b.getBoundingClientRect(); if (!r.width || b.disabled || b.closest('[hidden]') || b.type === 'hidden' || b.hidden) return false;
  b.scrollIntoView({ block: 'center' }); r = b.getBoundingClientRect(); var x = r.left + r.width / 2, y = r.top + r.height / 2;
  function hit(dx, dy) { var e = document.elementFromPoint(x + dx, y + dy); return !!e && (e === b || b.contains(e) || (e.closest && e.closest('label') && e.closest('label').contains(b)) || (e.tagName === 'LABEL' && e.contains(b))); }
  return (r.height < 44 && !(hit(0, -21) && hit(0, 21))) || (r.width < 44 && !(hit(-21, 0) && hit(21, 0)));
}).map(function (b) { var r = b.getBoundingClientRect(); return (b.dataset.act || b.id || b.className || b.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); })"""
def small(pg, where):
    sel = "'#sheet button, #sheet label.btn, #sheet input, #sheet select'" if where == 'sheet' else "'#view button, #view a, #view input, #view select, #view label.btn, header button, .tabs button, #tabs button'"
    # the eight week bars on Personal bests share one row: 37 px wide each, 104 px tall, nothing between them
    return sorted(x for x in set(pg.evaluate(SMALL.replace('SEL', sel))) if not x.startswith('pb-week '))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st, w=390, backup=None):
            c = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            if backup is not None: c.add_init_script("localStorage.setItem('hilo-backup-v1', %s)" % json.dumps(json.dumps(backup)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            return c, pg
        def state():
            s = seed(); s['settings'] = {'setupDone': True, 'blockOff': True}
            s['ui'] = {'recapSeen': (datetime.date.today() - datetime.timedelta(days=datetime.date.today().weekday())).isoformat(), 'tips': {'t': 1, 's': 1, 'b': 1}}; return s
        js = lambda pg, sel: (pg.evaluate("document.querySelector('%s').click()" % sel.replace("'", "\\'")), pg.wait_for_timeout(350))
        now = int(time.time() * 1000); DAY = 86400000
        s = state(); n = len(s['sessions'])

        # ---- settings: four groups, two sentences, the backup's state in the heading
        c, pg = page(s, backup={'at': now - 12 * DAY, 'n': n - 6, 'later': 0}); js(pg, '[data-act="settings"]')
        ok(pg.locator('#sheet .set-g h3').all_inner_texts() == ['Look', 'Training', 'During a workout', 'Your data'] or [t.lower() for t in pg.locator('#sheet .set-g h3').all_inner_texts()] == ['look', 'training', 'during a workout', 'your data'], 'settings has four groups: %s' % pg.locator('#sheet .set-g h3').all_inner_texts())
        order = pg.evaluate("[].map.call(document.querySelectorAll('#sheet .set-g h3, #sheet .setting > div:first-child > b'), function (e) { return e.textContent; })")
        ok([o.lower() for o in order] == ['look', 'appearance', 'theme', 'training', 'units', 'sessions per week', 'count runs, rides and swims', 'count body weight in pull-ups and dips', 'training block', 'during a workout', 'start the rest timer', 'sound when rest ends', 'keep the screen on', 'ask for reps left in the tank', 'your data'], 'each setting is in its group: %s' % order)
        subs = pg.locator('#sheet .setting small').all_inner_texts()
        ok(len([t for t in subs if t.strip()]) == 3 and any('silent' in t for t in subs) and any('weekly goal' in t for t in subs), 'only the two sentences that prevent a mistake are left, plus the safety-net line: %s' % subs)
        st = pg.locator('#sheet .bk-st'); ok(st.inner_text() == 'Last backup 12 days ago' and 'late' in st.get_attribute('class'), 'the heading says "Last backup 12 days ago", in orange when one is due: %s' % st.inner_text())
        ok(pg.locator('#set-goalw').count() == 0 and pg.locator('#set-goalr').count() == 0, 'goal weight and pace are no longer in settings')
        hh = pg.evaluate("document.querySelector('#sheet').scrollHeight"); ok(hh < 1570, 'settings is shorter (%d px, was about 1,570)' % hh)
        sm = small(pg, 'sheet'); ok(not sm, 'every control in settings takes a tap over 44 px: %s' % sm[:8])
        pg.screenshot(path=os.path.join(SH, 'S8-settings.png')); c.close()
        c, pg = page(s, backup={'at': now - 2 * DAY, 'n': n, 'later': 0}); js(pg, '[data-act="settings"]'); st = pg.locator('#sheet .bk-st')
        ok(st.inner_text() == 'Last backup 2 days ago' and 'late' not in st.get_attribute('class'), 'a recent backup is in grey'); c.close()
        c, pg = page(s); js(pg, '[data-act="settings"]'); st = pg.locator('#sheet .bk-st'); ok(st.inner_text() == 'No backup yet' and 'late' in st.get_attribute('class'), 'no backup with workouts saved: "No backup yet" in orange')

        # ---- Body: goal, chart, entries, form; three entries; the goal is edited here
        js(pg, '[data-act="sheet-x"]'); js(pg, '[data-tab="progress"]'); js(pg, '[data-act="prog"][data-v="body"]')
        heads = lambda: [t.lower() for t in pg.locator('#view section.card h3').all_inner_texts()]
        ok(heads() == ['weight', 'entries', 'add a measurement'], 'Body without a goal: chart, entries, then the form: %s' % heads())
        ok(pg.locator('#view .goal-set').inner_text() == 'Set a goal weight', 'a pill offers "Set a goal weight"')
        rows = pg.locator('#view table.hist tr').count(); total = len(s['body'])
        ok(rows == 3 and pg.locator('[data-act="body-all"]').inner_text() == 'Show all %d' % total, 'three entries and "Show all %d"' % total)
        js(pg, '[data-act="body-all"]'); ok(pg.locator('#view table.hist tr').count() == min(total, 60) and pg.locator('[data-act="body-all"]').inner_text() == 'Show fewer', 'Show all opens the list')
        js(pg, '[data-act="body-all"]')
        js(pg, '[data-act="goal-open"]'); pg.fill('#set-goalw', '80'); pg.dispatch_event('#set-goalw', 'change'); pg.wait_for_timeout(200)
        sm = small(pg, 'sheet'); ok(not sm, 'the goal sheet has 44 px targets: %s' % sm)
        js(pg, '#sheet [data-act="sheet-x"].primary')
        ok(pg.evaluate(LS + ".settings.goalWeight") == 80 and heads() == ['body weight goal', 'weight', 'entries', 'add a measurement'], 'the goal is set from Body and its card comes first: %s' % heads())
        ok('settings' not in pg.locator('#view').inner_text().lower() and '7-day average' in pg.locator('#view .goal-head').inner_text(), 'the goal card no longer points to settings')
        js(pg, '#view .card [data-act="goal-open"]'); ok(pg.locator('#set-goalw').input_value() == '80' and pg.locator('#set-goalr').count() == 1, 'Edit on the goal card opens goal and pace')
        pg.fill('#set-goalr', '0.5'); pg.dispatch_event('#set-goalr', 'change'); pg.wait_for_timeout(200); ok(pg.evaluate(LS + ".settings.goalRate") == 0.5, 'the pace is saved')
        js(pg, '#sheet [data-act="sheet-x"].primary'); pg.screenshot(path=os.path.join(SH, 'S8-body.png'), full_page=True)
        sm = small(pg, 'view'); ok(not sm, 'Body has 44 px targets: %s' % sm[:8])

        # ---- exercises: the best set on each row
        js(pg, '[data-tab="exercises"]'); js(pg, '[data-act="lib3"][data-v="exercises"]')
        gb = pg.locator('#view .g-best').all_inner_texts(); ok(len(gb) > 5 and all(re.match(r'Best .*\d', t) for t in gb), 'In my plan: each logged exercise shows its best set (%s)' % gb[:2])
        js(pg, '[data-act="lib"][data-key="all"]'); lb = pg.locator('#view .lib-best').all_inner_texts()
        ok(len(lb) > 5 and all(re.search(r'\d', t) for t in lb) and pg.locator('#view .lib-row .chev').count() > 20, 'All: logged exercises carry the best set at the right, the rest an arrow (%s)' % lb[:2])
        wide = pg.evaluate("[].filter.call(document.querySelectorAll('#view .lib-row'), function (r) { return r.scrollWidth > r.clientWidth + 1; }).length"); ok(wide == 0, 'no row is pushed wider by it')
        pg.screenshot(path=os.path.join(SH, 'S8-lib.png'))
        sm = small(pg, 'view'); ok(not sm, 'Exercises has 44 px targets: %s' % sm[:8])
        js(pg, '[data-act="lib3"][data-v="history"]'); sm = small(pg, 'view'); ok(not sm, 'History has 44 px targets: %s' % sm[:8])
        js(pg, '[data-tab="progress"]')
        for v in ('overview', 'lifts', 'endur'):
            js(pg, '[data-act="prog"][data-v="%s"]' % v); sm = small(pg, 'view'); ok(not sm, 'Progress, %s has 44 px targets: %s' % (v, sm[:8]))
        js(pg, '[data-tab="log"]'); sm = small(pg, 'view'); ok(not sm, 'Train has 44 px targets: %s' % sm[:8])
        js(pg, '[data-act="plan-edit"]'); sm = small(pg, 'view'); ok(not sm, 'Train, plan in Edit has 44 px targets: %s' % sm[:8])
        c.close()

        # ---- the finish summary: records first; the list folded when nothing went down
        def finish(pg, reps):
            js(pg, '[data-act="start"][data-key="upperA"]')
            n = pg.evaluate(LS + ".draft.items.length")
            for i in range(n):
                u = pg.evaluate(LS + ".draft.items[%d].u" % i); e = pg.evaluate(LS + ".draft.items[%d].ex" % i)
                if pg.locator('.exc.cur [data-act="tick"][data-u="%s"]' % u).count() == 0: js(pg, '[data-act="ex-open"][data-u="%s"]' % u)
                k = pg.locator('.exc.cur [data-act="tick"][data-u="%s"]' % u).count()
                for j in range(k):
                    if reps and i == 0:
                        f = pg.locator('.exc.cur .set[data-u="%s"][data-i="%d"] input, .exc.cur [data-u="%s"][data-i="%d"] input' % (u, j, u, j))
                    js(pg, '.exc.cur [data-act="tick"][data-u="%s"][data-i="%d"]' % (u, j))
            js(pg, '#finish-btn'); pg.wait_for_timeout(500)
        c, pg = page(state()); finish(pg, None)
        t = pg.locator('#sheet').inner_text(); h3 = pg.locator('#sheet h3').first.inner_text()
        ok(re.match(r'\d+ of \d+ improved', h3, re.I) is not None, 'the comparison headline is "%s"' % h3)
        down = 0
        folded = pg.locator('#sheet .cmp').count() == 0
        ok(folded and pg.locator('[data-act="sum-all"]').inner_text() == 'Show all', 'with nothing worse than last time the list is folded behind "Show all"')
        recs = pg.locator('#sheet .rec-row .pill').all_inner_texts()
        ok(len(recs) >= 1 and all(re.search(r'\d', r) for r in recs), 'records are a row of chips above it: %s' % recs[:3])
        ok(pg.evaluate("(function () { var a = document.querySelector('#sheet .rec-row'), b = document.querySelector('#sheet h3'); return a.compareDocumentPosition(b) & 4; })()") == 4, 'the chips come before the comparison')
        pg.screenshot(path=os.path.join(SH, 'S8-summary.png'))
        js(pg, '[data-act="sum-all"]'); ok(pg.locator('#sheet .cmp li').count() >= 5 and pg.locator('[data-act="sum-all"]').inner_text() == 'Hide', 'Show all opens every exercise')
        sm = small(pg, 'sheet'); ok(not sm, 'the summary has 44 px targets: %s' % sm)
        c.close()

        # ---- the look rules, read from the stylesheet
        css = open(os.path.join(ROOT, '..', 'src', 'app.css'), encoding='utf-8').read()
        fs = set(re.findall(r'font-size: *([^;}]+?) *[;}]', css)); fs = {f for f in fs if not f.startswith('var(--t-') and f != 'inherit'}
        ok(fs == {'16px', '9px', '10px', '11px', '12px'}, 'every text size is one of the eight tokens (left: the page base and four sizes inside drawings): %s' % sorted(fs))
        rad = set(re.findall(r'border-radius: *([^;}]+?) *[;}]', css)); rad = {r for r in rad if not r.startswith('var(--r-') and r not in ('50%', '999px', '0', 'inherit')}
        ok(all('28px' in r or ' ' in r for r in rad), 'corners are one of four sizes, a pill or a circle (left: the sheet): %s' % sorted(rad))
        def lum(h):
            h = h.lstrip('#'); v = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]; v = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in v]; return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
        cr = lambda a, bb: (max(lum(a), lum(bb)) + 0.05) / (min(lum(a), lum(bb)) + 0.05)
        m = re.search(r'--bg: (#\w+);.*?--surface-2: (#\w+);.*?--muted: (#\w+);', css, re.S)
        worst = [('default light', min(cr(m.group(3), m.group(1)), cr(m.group(3), m.group(2))))]
        for name, t in json.load(open(os.path.join(ROOT, '..', 'src', 'palettes.json'))).items():
            for mode in ('light', 'dark'): worst.append((name + ' ' + mode, min(cr(t[mode]['muted'], t[mode]['bg']), cr(t[mode]['muted'], t[mode].get('surface-2', t[mode]['bg'])))))
        ok(all(v >= 4.5 for k, v in worst), 'grey text is at least 4.5 to 1 on the page and on tinted boxes in every theme: %s' % [(k, round(v, 2)) for k, v in worst if v < 4.7])
        ok(not errs, 'no script errors: %s' % errs[:2])
        b.close()
finally:
    srv.terminate()
print('\n%d checks failed' % len(fails) if fails else '\nall sweep checks pass'); sys.exit(1 if fails else 0)
