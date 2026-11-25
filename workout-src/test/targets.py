"""Targets and records (C1 to C4, C9), the working-weight rule, and warm-up sets in the totals.
Every log here is made up; the dates are counted back from today."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8790
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
D = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
NAMES = {}
def sess(i, days, entries, key='upperA', warm=None):
    en = [{'n': str(j + 1), 'ex': ex, 'name': ex, 'note': '', 'sets': [{'w': w, 'r': r} for w, r in sets]} for j, (ex, sets) in enumerate(entries)]
    if warm: en[0]['warm'] = [{'w': w, 'r': r} for w, r in warm]
    return {'v': 2, 'id': 's%d' % i, 'key': key, 'name': 'Upper A', 'date': D(days), 'startedAt': 1, 'finishedAt': 2, 'dur': 3000, 'core': True, 'notes': '', 'entries': en}
def log(*ss, **sett):
    st = {'setupDone': True}; st.update(sett)
    return {'sessions': {s['id']: s for s in ss}, 'body': {}, 'routines': {}, 'custom': {}, 'settings': st, 'ui': {'tips': {'t': 1, 's': 1, 'b': 1}}}
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st, start=True):
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            if start: pg.evaluate("document.querySelector('[data-act=\"start\"][data-key=\"upperA\"]').click()"); pg.wait_for_timeout(500)
            return c, pg
        def card(pg, ex):
            d = pg.evaluate(LS + '.draft'); u = next(x['u'] for x in d['items'] if x['ex'] == ex)
            if pg.locator('button#x-%s' % u).count(): pg.locator('button#x-%s' % u).click(); pg.wait_for_timeout(300)
            cd = pg.locator('#x-%s' % u); tg = cd.locator('.set:not(.warm) .field input').evaluate_all("els => els.map(e => e.placeholder)")
            return {'u': u, 'target': ', '.join(' × '.join(tg[i:i + 2]) for i in range(0, len(tg), 2)), 'why': cd.locator('.why').inner_text() if cd.locator('.why').count() else '',
                    'last': cd.locator('.set-prev').all_inner_texts(), 'note': ' '.join(cd.locator('.last-note').all_inner_texts())}
        def check(pg, ex, target, why, name):
            r = card(pg, ex); ok(r['target'] == target and why in r['why'], '%s: %s  [%s]' % (name, r['target'], r['why'])); return r

        # ---- the working weight, and steps learned from the log
        c, pg = page(log(sess(1, 2, [
            ('incline-dumbbell-press', [(24, 11), (26, 8), (26, 6)]),            # a lighter first set
            ('chest-supported-row', [(18, 12), (18, 12), (20, 12)]),             # every set at the top, weights in twos
            ('pec-deck', [(59, 15), (66, 15), (66, 15)]),                        # a stack that moves in sevens
            ('lat-pulldown', [(40, 12), (70, 12), (70, 12), (70, 12)]),          # a gap too big to be a step
            ('cable-lateral-raise', [(5, 12), (5, 11), (5, 12)]),                # straight sets
        ])))
        r = check(pg, 'incline-dumbbell-press', '26 × 9, 26 × 6, 26 × 6', 'One more rep on set 1 · 3 sets at 26 kg', 'a lighter first set is left out and all sets are at the working weight')
        ok(r['last'] == ['26 × 8', '26 × 6', ''] and '24 kg × 11' in r['note'] and 'warm-up' in r['note'], '   the Last column shows the working sets and a line names the lighter one: %s | %s' % (r['last'], r['note']))
        check(pg, 'chest-supported-row', '22 × 8, 22 × 8, 22 × 8', '+2 kg today · reps restart at 8', 'every set at the top: up from the working weight by the 2 kg step seen in the log')
        check(pg, 'pec-deck', '73 × 10, 73 × 10, 73 × 10', '+7 kg today', 'a machine logged at 59 and 66 goes up by 7')
        r = check(pg, 'lat-pulldown', '72.5 × 8, 72.5 × 8, 72.5 × 8', '+2.5 kg today', 'a 30 kg gap is not taken for a step; the usual 2.5 is used, and the warm-up set gives no fourth row')
        check(pg, 'cable-lateral-raise', '5 × 13, 5 × 11, 5 × 12', 'Same weight · one more rep on set 1', 'straight sets work as before')
        # the step set by hand
        u = card(pg, 'lat-pulldown')['u']; pg.locator('#x-%s [data-act="ex-menu"]' % u).tap(); pg.wait_for_timeout(250); pg.locator('#sheet [data-act="step-open"]').tap(); pg.wait_for_timeout(300)
        ok('the usual step' in pg.locator('#sheet').inner_text() and pg.locator('#step-in').get_attribute('placeholder') == '2.5', 'Weight step in the menu says where the step comes from')
        pg.fill('#step-in', '5'); pg.locator('[data-act="step-save"]').tap(); pg.wait_for_timeout(400)
        check(pg, 'lat-pulldown', '75 × 8, 75 × 8, 75 × 8', '+5 kg today', 'a step set by hand is used')
        ok(pg.evaluate(LS + ".settings.steps['lat-pulldown']") == 5, '   and is kept in settings, so it is in backups')
        pg.locator('#x-%s [data-act="ex-menu"]' % u).tap(); pg.wait_for_timeout(250); pg.locator('#sheet [data-act="step-open"]').tap(); pg.wait_for_timeout(300); pg.locator('[data-act="step-clear"]').tap(); pg.wait_for_timeout(400)
        check(pg, 'lat-pulldown', '72.5 × 8, 72.5 × 8, 72.5 × 8', '+2.5 kg today', '"Work it out from my log" removes it')
        pg.screenshot(path=os.path.join(SH, 'TG-working.png')); c.close()

        # ---- weeks that are not normal
        c, pg = page(log(
            sess(1, 6, [('cable-lateral-raise', [(5, 13), (5, 12), (5, 12)]), ('overhead-cable-triceps-extension', [(20, 9), (20, 8), (20, 8)]), ('pec-deck', [(66, 12), (66, 11), (66, 10)])]),
            sess(2, 2, [('cable-lateral-raise', [(5, 10), (5, 9), (5, 8)]), ('overhead-cable-triceps-extension', [(20, 9), (20, 9), (20, 7)]), ('pec-deck', [(66, 13), (66, 11), (66, 10)])]),
            sess(3, 16, [('incline-dumbbell-curl', [(10, 12), (10, 11), (10, 11)])]),
            sess(4, 30, [('lat-pulldown', [(50, 10), (50, 10), (50, 9)])]),
        ))
        r = check(pg, 'cable-lateral-raise', '5 × 13, 5 × 12, 5 × 12', 'Back to 5 kg × 13, 12, 12 from', 'C1, a bad day: the target goes back to the better session')
        check(pg, 'overhead-cable-triceps-extension', '17.5 × 12, 17.5 × 12, 17.5 × 12', '17.5 kg today · two sessions under 10 reps', 'C2, two sessions under the range: lighter')
        check(pg, 'pec-deck', '66 × 14, 66 × 11, 66 × 10', 'Same weight · one more rep on set 1', 'a session that beat the one before builds on itself')
        check(pg, 'incline-dumbbell-curl', '10 × 12, 10 × 11, 10 × 11', '2 weeks off · repeat last time', 'C3, 16 days away: repeat last time')
        check(pg, 'lat-pulldown', '45 × 10, 45 × 10, 45 × 9', '4 weeks off · 45 kg today', 'C3, 30 days away: a tenth lighter')
        pg.screenshot(path=os.path.join(SH, 'TG-rules.png'))
        # ---- C9: more total weight is no longer a record
        u = card(pg, 'pec-deck')['u']
        for i in range(3): pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u, i)); pg.wait_for_timeout(260)
        pg.locator('#x-%s' % u).tap() if pg.locator('button#x-%s' % u).count() else None; pg.wait_for_timeout(300)
        pg.locator('#x-%s [data-act="add-set"]' % u).tap(); pg.wait_for_timeout(250); pg.fill('#w-%s-3' % u, '66'); pg.fill('#r-%s-3' % u, '10'); pg.click('[data-act="tick"][data-u="%s"][data-i="3"]' % u); pg.wait_for_timeout(400)
        txt = pg.locator('#x-%s' % u).inner_text() if pg.locator('section#x-%s' % u).count() else ''
        ok('Record volume' not in txt and 'Record volume' not in pg.locator('#toast').inner_text(), 'C9: a fourth set at the same weight raises no record')
        c.close()

        # ---- warm-up sets count in the totals, and nowhere else
        c, pg = page(log(sess(1, 1, [('lat-pulldown', [(50, 10), (50, 10)])], warm=[(20, 10)])), start=False)
        pg.goto('http://127.0.0.1:%d/index.html#progress' % PORT); pg.wait_for_timeout(1200)
        tile = pg.locator('.tile:has-text("kg lifted") b').inner_text(); ok(tile.replace(',', '') in ('1200', '1.2K'), 'two sets of 50 × 10 and a warm-up of 20 × 10 make 1,200 kg lifted (%s)' % tile)
        ok(pg.locator('.tile:has-text("workouts") b').first.inner_text() == '1', '   one workout')
        pg.locator('[data-act="prog"][data-v="lifts"]').tap(); pg.wait_for_timeout(700)
        if pg.locator('[data-act="lift-view"][data-v="one"]').count(): pg.locator('[data-act="lift-view"][data-v="one"]').tap(); pg.wait_for_timeout(500)
        st = pg.locator('.stats').inner_text().replace('\n', ' '); ok('1,200' in st or '1200' in st or '1.2K' in st, '   the exercise\'s Total includes the warm-up: %s' % st)
        ok(re.search(r'\b50\b', st) is not None and '20' not in st.replace('1,200', '').replace('1200', ''), '   top weight is still 50')
        pg.goto('http://127.0.0.1:%d/index.html#exercises' % PORT); pg.wait_for_timeout(700)
        hs = pg.locator('[data-act="hist-open"]').first.inner_text().replace('\n', ' '); ok('2 sets' in hs and ('1,200' in hs or '1.2' in hs), '   History says 2 sets and 1,200 kg: %s' % hs)
        c.close(); b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
