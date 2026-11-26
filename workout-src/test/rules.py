"""The remaining rules (C5, C8, C10): the estimated 1-rep max stops at 12 reps, body weight counts in pull-ups and dips,
and a set with three or more reps left is half a hard set. Every log here is made up."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8793
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
D = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
def sess(i, days, entries, key='upperA'):
    en = [{'n': str(j + 1), 'ex': ex, 'name': ex, 'note': '', 'sets': [dict(zip(('w', 'r', 'rir'), s)) for s in sets]} for j, (ex, sets) in enumerate(entries)]
    return {'v': 2, 'id': 's%d' % i, 'key': key, 'name': 'Upper A', 'date': D(days), 'startedAt': 1, 'finishedAt': 2, 'dur': 3000, 'core': True, 'notes': '', 'entries': en}
def log(*ss, **kw):
    st = {'setupDone': True, 'blockOff': True}; st.update(kw.get('settings', {}))
    return {'sessions': {s['id']: s for s in ss}, 'body': kw.get('body', {}), 'routines': {}, 'custom': {}, 'settings': st, 'ui': {'tips': {'t': 1, 's': 1, 'b': 1}, 'recapSeen': '2099-01-01'}}
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st):
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            c.add_init_script("localStorage.setItem('hilo-backup-v1', JSON.stringify({ at: Date.now(), n: 999, later: 0 }))")
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600); return c, pg
        js = lambda pg, sel: (pg.evaluate("document.querySelector('%s').click()" % sel.replace("'", "\\'")), pg.wait_for_timeout(350))
        LR = 'cable-lateral-raise'
        def log_set(pg, ex, w, r):
            """start Upper A, open the exercise, type one set, tick it; returns the message shown"""
            js(pg, '[data-act="start"][data-key="upperA"]'); u = pg.evaluate(LS + ".draft.items.filter(function (x) { return x.ex === '%s'; })[0].u" % ex)
            if pg.locator('button#x-%s' % u).count(): js(pg, 'button#x-%s' % u)
            f = pg.locator('#x-%s .set:not(.warm) .field input' % u); f.nth(0).fill(str(w)); f.nth(1).fill(str(r)); pg.wait_for_timeout(200)
            js(pg, '#x-%s [data-act="tick"][data-i="0"]' % u); pg.wait_for_timeout(300)
            return ('' if pg.evaluate("document.getElementById('toast').hidden") else pg.locator('#toast').inner_text().replace('\n', ' ')) + ' | ' + pg.locator('#x-%s [data-act="tick"][data-i="0"]' % u).get_attribute('aria-label')

        # ---- C5: records past 12 reps
        c, pg = page(log(sess(1, 7, [(LR, [(10, 12), (10, 12), (10, 12)])]))); t = log_set(pg, LR, 9, 20)
        ok('ecord' not in t and 'new best' not in t, 'after 10 kg × 12, a set of 9 kg × 20 is not a record (the old estimate made it 15 kg against 14): "%s"' % t); c.close()
        c, pg = page(log(sess(1, 7, [(LR, [(10, 14), (10, 13), (10, 13)])]))); t = log_set(pg, LR, 10, 15)
        ok('new best' in t, 'at the same weight past 12 reps, one more rep is still a best set: "%s"' % t); c.close()
        c, pg = page(log(sess(1, 7, [(LR, [(10, 20), (10, 13), (10, 13)])]))); t = log_set(pg, LR, 11, 12)
        ok('ecord' in t, 'more weight wins over more reps: 11 kg × 12 after 10 kg × 20 is a record: "%s"' % t); c.close()
        IP = 'incline-dumbbell-press'
        c, pg = page(log(sess(1, 7, [(IP, [(20, 6), (20, 6), (20, 6)])]))); t = log_set(pg, IP, 18, 11)
        ok('new best' in t, 'at 12 reps and under the estimate works as before: 18 kg × 11 beats 20 kg × 6: "%s"' % t); c.close()

        # ---- C5: the Lifts page says "Best reps" for an exercise trained past 12
        st = log(sess(1, 14, [(LR, [(9, 15), (9, 14), (9, 12)]), (IP, [(20, 8), (20, 7), (20, 6)])]), sess(2, 7, [(LR, [(10, 14), (10, 13), (9, 15)]), (IP, [(20, 9), (20, 8), (20, 7)])]))
        st['ui'].update({'tab': 'progress', 'prog': 'lifts', 'ex': LR, 'liftView': 'one'})
        c, pg = page(st); tiles = lambda: [re.sub(r'\s+', ' ', x) for x in pg.locator('#view .stats .stat').all_inner_texts()]
        tl = tiles(); ok(len(tl) == 3 and tl[1].lower().startswith('best reps 14reps') and 'best 15' in tl[1] and tl[0].lower().startswith('top weight 10'), 'lateral raise (10-15 reps): tiles are Top weight, Best reps, Total: %s' % tl)
        js(pg, '#view .stat[data-v="e1rm"]'); end = pg.locator('[data-chart="exc"] text.val').all_text_contents()
        ok(end and end[-1].strip() == '14', 'the graph then plots the reps at the top weight (last point %s)' % end[-1:])
        js(pg, '[data-act="lift-info"]'); ok('Best reps is the most reps at the heaviest weight' in pg.locator('#view .note').first.inner_text(), 'the info text explains Best reps')
        pg.screenshot(path=os.path.join(SH, 'R9-bestreps.png')); c.close()
        st['ui']['ex'] = IP; c, pg = page(st); tl = tiles()
        ok(tl[1].lower().startswith('est. 1rm 26') , 'incline press (6-10 reps) keeps the estimate: %s' % tl[1]); c.close()

        # ---- C8: body weight in pull-ups, chin-ups and dips
        body = {D(30): {'weight': 78}, D(10): {'weight': 80}, D(1): {'weight': 82}}
        st = log(sess(1, 5, [('pull-up', [(0, 10), (0, 8)]), ('dip', [(10, 10)]), ('push-up', [(0, 20)]), (IP, [(20, 10)])]), body=body); st['ui'].update({'tab': 'progress', 'prog': 'overview'})
        want = 80 * 18 + 90 * 10 + 200
        tile = lambda pg: pg.evaluate("[].filter.call(document.querySelectorAll('#view .tiles.six .tile'), function (t) { return /lifted/.test(t.textContent); })[0].querySelector('.cnt').dataset.count")
        c, pg = page(st); t = tile(pg)
        ok(t == str(want), 'pull-ups and dips count body weight from the weigh-in before the workout (80 kg): %d kg lifted, shown as "%s"' % (want, t))
        js(pg, '[data-act="settings"]'); sw = pg.locator('#sheet [data-act="bwvol"]'); ok(sw.get_attribute('aria-checked') == 'true', 'the switch "Count body weight in pull-ups and dips" is on')
        js(pg, '#sheet [data-act="bwvol"]'); js(pg, '#sheet [data-act="sheet-x"]'); t = tile(pg)
        ok(pg.evaluate(LS + ".settings.bwVol") is False and t == '300', 'switched off, only added weight counts: "%s"' % t); c.close()
        st2 = log(sess(1, 5, [('pull-up', [(0, 10)])]), body={D(2): {'weight': 82}}); st2['ui'].update({'tab': 'progress', 'prog': 'overview'})
        c, pg = page(st2); t = tile(pg); ok(t == '820', 'with no weigh-in before the workout, the first one after it is used: "%s"' % t); c.close()
        st3 = log(sess(1, 5, [('pull-up', [(0, 10)])])); st3['ui'].update({'tab': 'progress', 'prog': 'overview'})
        c, pg = page(st3); t = tile(pg); ok(t == '0', 'with no weigh-in at all it stays 0: "%s"' % t); c.close()

        # ---- C10: three or more reps left is half a hard set
        st = log(sess(1, 1, [('pec-deck', [(60, 12, 3), (60, 12, 3), (60, 11, 1), (60, 10)])])); st['ui'].update({'tab': 'progress', 'prog': 'overview'})
        c, pg = page(st); js(pg, '[data-act="mus-all"]')
        lab = pg.evaluate("[].map.call(document.querySelectorAll('#view .mus-track'), function (e) { return e.getAttribute('aria-label'); }).filter(function (t) { return /^Chest/.test(t); })[0]")
        ok(lab.startswith('Chest: 3 of'), 'four sets of pec deck, two with 3+ reps left, count as 3 hard sets for the chest: "%s"' % lab); c.close()
        st = log(sess(1, 1, [('pec-deck', [(60, 12), (60, 12), (60, 11, 1), (60, 10, 2)])])); st['ui'].update({'tab': 'progress', 'prog': 'overview'})
        c, pg = page(st); js(pg, '[data-act="mus-all"]')
        lab = pg.evaluate("[].map.call(document.querySelectorAll('#view .mus-track'), function (e) { return e.getAttribute('aria-label'); }).filter(function (t) { return /^Chest/.test(t); })[0]")
        ok(lab.startswith('Chest: 4 of'), 'sets with 0 to 2 reps left, or none logged, count in full: "%s"' % lab); c.close()
        ok(not errs, 'no script errors: %s' % errs[:2])
        b.close()
finally:
    srv.terminate()
print('\n%d checks failed' % len(fails) if fails else '\nall rules checks pass'); sys.exit(1 if fails else 0)
