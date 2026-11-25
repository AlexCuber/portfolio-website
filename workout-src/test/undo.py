"""The safety net inside the phone (N2, W8): Undo, the bin for deleted workouts, and the weekly second copy."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8790
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []; errs = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"; CP = "JSON.parse(localStorage.getItem('hitit-copy-v1'))"
DAY = 86400000
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st, copy=None, raw=None):
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(raw if raw is not None else json.dumps(st)))
            c.add_init_script("localStorage.setItem('hilo-backup-v1', JSON.stringify({ at: Date.now(), n: 999, later: 0 }))")
            if copy is not None: c.add_init_script("if(!sessionStorage.getItem('cp')) { sessionStorage.setItem('cp', 1); localStorage.setItem('hitit-copy-v1', %s) }" % json.dumps(json.dumps(copy)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            return c, pg
        def state():
            s = seed(); s['settings'] = {'setupDone': True, 'blockOff': True}
            s['ui'] = {'recapSeen': (datetime.date.today() - datetime.timedelta(days=datetime.date.today().weekday())).isoformat(), 'tips': {'t': 1, 's': 1, 'b': 1}}; return s
        js = lambda pg, sel: (pg.evaluate("document.querySelector('%s').click()" % sel.replace("'", "\\'")), pg.wait_for_timeout(350))
        toast = lambda pg: '' if pg.evaluate("document.getElementById('toast').hidden") else pg.locator('#toast').inner_text().replace('\n', ' ')
        undo = lambda pg: (pg.locator('#toast [data-act="undo"]').tap(), pg.wait_for_timeout(350))
        items = lambda pg: pg.evaluate(LS + ".draft.items.map(function (x) { return [x.ex, x.rows.map(function (r) { return [r.w, r.r, !!r.d]; })]; })")

        # ---- a set
        c, pg = page(state()); js(pg, '[data-act="start"][data-key="upperA"]')
        f = pg.locator('.exc.cur .field input'); f.nth(0).fill('60'); f.nth(1).fill('8'); f.nth(2).fill('62.5'); f.nth(3).fill('7'); pg.wait_for_timeout(300)
        before = items(pg); u = pg.evaluate(LS + ".draft.items[0].u")
        js(pg, '.exc.cur [data-act="ex-menu"]'); js(pg, '[data-act="del-set"]'); js(pg, '.exc.cur .tick.del[data-i="1"]')
        ok(len(items(pg)[0][1]) == len(before[0][1]) - 1 and toast(pg) == 'Set removed Undo', 'removing a set shows "Set removed" with Undo: %s' % toast(pg))
        bb = pg.locator('#toast [data-act="undo"]').bounding_box(); ok(bb['height'] >= 44 and bb['width'] >= 44, 'the Undo button is at least 44 px (%d × %d)' % (bb['width'], bb['height']))
        pg.screenshot(path=os.path.join(SH, 'UN-set.png'))
        undo(pg); ok(items(pg) == before and toast(pg) == '', 'Undo puts the set back where it was, with its numbers')
        js(pg, '.exc.cur [data-act="ex-menu"]'); js(pg, '[data-act="del-set"]'); js(pg, '.exc.cur .tick.del[data-i="0"]'); pg.wait_for_timeout(5300)
        ok(toast(pg) == '' and len(items(pg)[0][1]) == len(before[0][1]) - 1, 'after five seconds the message goes and the set stays removed')

        # ---- an exercise
        before = items(pg); cur = pg.evaluate(LS + ".draft.cur")
        js(pg, '.exc.cur [data-act="ex-menu"]'); js(pg, '[data-act="ex-remove"]')
        ok(len(items(pg)) == len(before) - 1 and toast(pg).endswith('removed Undo'), 'removing an exercise is one tap with Undo: %s' % toast(pg))
        undo(pg); ok(items(pg) == before and pg.evaluate(LS + ".draft.cur") == cur and pg.locator('.exc.cur').count() == 1, 'Undo puts the exercise back in its place, open')

        # ---- discarding a workout
        js(pg, '.exc.cur [data-act="tick"][data-i="0"]'); before = items(pg)
        ok(pg.locator('[data-act="discard"]').inner_text() == 'Discard workout', 'the button reads "Discard workout"')
        js(pg, '[data-act="discard"]')
        ok(pg.evaluate(LS + ".draft") is None and toast(pg) == 'Workout discarded Undo', 'one tap discards and offers Undo: %s' % toast(pg))
        ok(len(pg.evaluate(LS + ".bin")) == 1, 'a discarded workout that had a ticked set is kept in the bin')
        undo(pg); ok(items(pg) == before and pg.evaluate(LS + ".bin") == [] and pg.locator('.exc.cur').count() == 1, 'Undo brings the workout back, sets and ticks included, and takes it out of the bin')
        js(pg, '[data-act="discard"]'); pg.wait_for_timeout(5300); pg.reload(); pg.wait_for_timeout(600)
        js(pg, '[data-act="settings"]'); 
        ok(pg.locator('[data-act="bin-open"]').inner_text() == 'Deleted workouts (1)', 'settings show "Deleted workouts (1)"')
        js(pg, '[data-act="bin-open"]'); row = pg.locator('#sheet .plan-row').first.inner_text().replace('\n', ' ')
        ok('discarded' in row and '1 set' in row and '30 days left' in row, 'the bin lists it: %s' % row)
        pg.screenshot(path=os.path.join(SH, 'UN-bin.png'))
        js(pg, '[data-act="bin-restore"]'); ok(items(pg) == before and pg.locator('.exc.cur').count() == 1, 'Restore reopens the discarded workout')
        js(pg, '[data-act="discard"]'); c.close()
        # nothing ticked: no bin entry
        c, pg = page(state()); js(pg, '[data-act="start"][data-key="upperA"]'); js(pg, '[data-act="discard"]')
        ok(not pg.evaluate(LS + ".bin") and 'Undo' in toast(pg), 'a workout with nothing ticked is not kept in the bin, but can still be undone'); c.close()

        # ---- deleting a saved workout
        s = state(); sid = sorted(s['sessions'], key=lambda k: s['sessions'][k]['date'])[-1]; n = len(s['sessions'])
        c, pg = page(s); js(pg, '[data-tab="exercises"]'); js(pg, '[data-act="lib3"][data-v="history"]'); js(pg, '.hcard .hc-head')
        sid = pg.locator('.hcard.open [data-act="open-session"]').first.get_attribute('data-id'); js(pg, '[data-act="open-session"][data-id="%s"]' % sid)
        ok(pg.locator('[data-act="delete-session"]').inner_text() == 'Delete', 'the sheet has Delete')
        js(pg, '[data-act="delete-session"]')
        ok(len(pg.evaluate(LS + ".sessions")) == n - 1 and toast(pg) == 'Workout deleted Undo', 'one tap deletes and offers Undo')
        undo(pg); ok(len(pg.evaluate(LS + ".sessions")) == n and pg.evaluate(LS + ".bin") == [], 'Undo puts it back')
        js(pg, '.hcard.open [data-act="open-session"][data-id="%s"]' % sid) if pg.locator('.hcard.open [data-act="open-session"][data-id="%s"]' % sid).count() else (js(pg, '.hcard .hc-head'), js(pg, '[data-act="open-session"][data-id="%s"]' % sid))
        js(pg, '[data-act="delete-session"]'); pg.wait_for_timeout(5300)
        pg.reload(); pg.wait_for_timeout(600); js(pg, '[data-act="settings"]'); js(pg, '[data-act="bin-open"]')
        row = pg.locator('#sheet .plan-row').first.inner_text().replace('\n', ' '); ok(s['sessions'][sid]['name'] in row and 'days left' in row, 'after a reload it is in the bin: %s' % row)
        js(pg, '[data-act="bin-restore"]')
        ok(len(pg.evaluate(LS + ".sessions")) == n and pg.evaluate(LS + ".sessions['%s'].entries.length" % sid) == len(s['sessions'][sid]['entries']) and toast(pg) == 'Workout restored', 'Restore puts it back in the log, complete')
        c.close()
        # the bin empties itself after 30 days and is not in a backup
        s = state(); now = int(time.time() * 1000); doc = s['sessions'].pop(sid); doc2 = dict(doc, id='old')
        s['bin'] = [{'at': now - 31 * DAY, 'doc': doc2}, {'at': now - 29 * DAY, 'doc': doc}]
        c, pg = page(s); js(pg, '[data-act="settings"]')
        ok(pg.locator('[data-act="bin-open"]').inner_text() == 'Deleted workouts (1)', 'a workout deleted 31 days ago is gone, one from 29 days ago is still there')
        js(pg, '[data-act="bin-open"]'); ok('1 day left' in pg.locator('#sheet .plan-row').first.inner_text(), 'it says 1 day left')
        c.close()

        # ---- the weekly copy
        s = state(); n = len(s['sessions'])
        c, pg = page(s); cp = pg.evaluate(CP)
        ok(cp and cp['n'] == n and len(cp['data']['sessions']) == n and 'bin' not in cp['data'] and 'draft' not in cp['data'], 'opening the app makes the first copy of the log (%d workouts)' % n)
        at = cp['at']; pg.reload(); pg.wait_for_timeout(600); ok(pg.evaluate(CP)['at'] == at, 'it is not written again the same week')
        js(pg, '[data-act="settings"]'); t = pg.locator('#sheet').inner_text()
        ok('Weekly copy: ' in t and (', %d workouts.' % n) in t, 'settings say when the copy was made and how much it holds')
        pg.screenshot(path=os.path.join(SH, 'UN-settings.png')); c.close()
        old = {'at': now - 8 * DAY, 'n': 3, 'data': {'app': 'workout-log', 'v': 2, 'sessions': {k: s['sessions'][k] for k in list(s['sessions'])[:3]}, 'body': {}, 'routines': {}, 'custom': {}, 'settings': {}}}
        c, pg = page(s, copy=old); ok(pg.evaluate(CP)['n'] == n, 'a copy older than a week is renewed'); c.close()
        big = {'at': now - 20 * DAY, 'n': n, 'data': {'app': 'workout-log', 'v': 2, 'sessions': s['sessions'], 'body': s['body'], 'routines': {}, 'custom': {}, 'settings': {'setupDone': True}}}
        few = state(); few['sessions'] = {k: s['sessions'][k] for k in list(s['sessions'])[:4]}
        c, pg = page(few, copy=big); ok(pg.evaluate(CP)['n'] == n and pg.evaluate(CP)['at'] == big['at'], 'a log that lost most of its workouts does not overwrite the fuller copy')
        js(pg, '[data-act="settings"]'); js(pg, '[data-act="copy-restore"]')
        ok(pg.locator('[data-act="copy-restore"]').inner_text() == 'Tap again to restore' and len(pg.evaluate(LS + ".sessions")) == 4, 'bringing the copy back asks for a second tap')
        js(pg, '[data-act="copy-restore"]'); ok(len(pg.evaluate(LS + ".sessions")) == n and 'added' in toast(pg), 'the second tap adds the missing workouts: %s %s' % (toast(pg), len(pg.evaluate(LS + ".sessions")))); c.close()
        # the log cannot be read: the copy is offered
        c, pg = page(None, copy=big, raw='{"sessions": {"a": ')
        t = pg.locator('#view').inner_text(); ok('Use the copy from' in t and ('%d workouts' % n) in t, 'when the log cannot be opened, the screen offers the weekly copy')
        pg.screenshot(path=os.path.join(SH, 'UN-lost.png'))
        js(pg, '[data-act="copy-restore"]'); pg.wait_for_timeout(300)
        ok(len(pg.evaluate(LS + ".sessions")) == n and pg.evaluate("localStorage.getItem('hitit-rescue-v1')") == '{"sessions": {"a": ' and pg.locator('[data-act="start"]').count() > 0, 'one tap brings the log back from the copy; the unreadable text is kept aside')
        c.close()
        c, pg = page(None, raw='{"sessions": {"a": '); ok(pg.evaluate(CP) is None and 'Use the copy' not in pg.locator('#view').inner_text(), 'an unreadable log never makes a copy'); c.close()
        ok(not errs, 'no script errors: %s' % errs[:2])
        b.close()
finally:
    srv.terminate()
print('\n%d checks failed' % len(fails) if fails else '\nall undo checks pass'); sys.exit(1 if fails else 0)
