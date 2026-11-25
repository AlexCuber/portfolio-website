"""The workout as a list (W1 to W7): one exercise open, the others folded, last time in the set rows,
one row of small actions, tips shown once, the next set in the rest bar, records in one message."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8793
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
        def page(st, w=390, scheme='light', key='upperB'):
            c = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            if key:
                pg.evaluate("document.querySelector('[data-act=\"start\"][data-key=\"%s\"]').click()" % key); pg.wait_for_timeout(500)
            return c, pg
        draft = lambda pg: pg.evaluate(LS + '.draft')
        tick = lambda pg, u, i: (pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u, i)), pg.wait_for_timeout(260))
        opened = lambda pg: pg.evaluate("[].map.call(document.querySelectorAll('section.exc'), function (x) { return x.id.slice(2); })")
        folded = lambda pg: pg.evaluate("[].map.call(document.querySelectorAll('button.exc.fold'), function (x) { return x.dataset.u; })")
        full = seed(); full['settings'] = {'setupDone': True}

        # ---- one open, the rest folded
        c, pg = page(full); d = draft(pg); its = d['items']; us = [x['u'] for x in its]
        ok(opened(pg) == [us[0]] and folded(pg) == us[1:], 'a new workout opens the first exercise and folds the other %d' % (len(us) - 1))
        hgt = pg.evaluate("document.documentElement.scrollHeight"); ok(hgt < 2200, 'the whole workout is under 2,200 px tall (%d; it was about 5,600)' % hgt)
        ok(pg.locator('.last, .tools, .note-in').count() == 0, 'no Last time box, no tool row and no empty note field')
        ok(pg.locator('.exc.cur .why').count() == 1 and len(pg.locator('.exc.cur .why').inner_text()) < 60, 'the reason is one short line: "%s"' % pg.locator('.exc.cur .why').inner_text())
        ok(pg.locator('.exc.cur .set-cols').inner_text().startswith('Last · '), 'the set rows have a header that starts "Last · " with the date')
        ok(pg.locator('.exc.cur .set-prev').count() == len(its[0]['rows']) and all(re.search(r'\d', t) for t in pg.locator('.exc.cur .set-prev').all_inner_texts()), 'every set row shows what was done last time: %s' % pg.locator('.exc.cur .set-prev').all_inner_texts())
        ok(pg.locator('.exc.cur .field span').evaluate_all("els => els.every(e => getComputedStyle(e).display === 'none')"), 'the units are in the header, not inside the fields')
        f1 = pg.locator('button.exc.fold').first.inner_text(); ok(re.search(r'\d × \d+-\d+ · ', f1) is not None, 'a folded exercise shows its plan and today\'s target: %s' % f1.replace('\n', ' | '))
        ok(pg.locator('.wtop .act').all_inner_texts() == ['Warm-up plan', 'Workout notes'] and pg.locator('p.warm').count() == 0, 'the warm-up text is behind a pill at the top')
        pg.locator('[data-act="warm-plan"]').tap(); pg.wait_for_timeout(250); ok('ramp-up' in pg.locator('#sheet').inner_text(), 'the pill opens the warm-up text'); pg.keyboard.press('Escape'); pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(250)
        ok(pg.locator('p.note, .unit-hint, p.foot').count() == 0, 'a log with history shows no standing tips')
        pg.screenshot(path=os.path.join(SH, 'WL-start.png'), full_page=True)

        # ---- ticking through an exercise folds it and opens the next
        for i in range(len(its[0]['rows']) - 1): tick(pg, us[0], i)
        ok(opened(pg) == [us[0]], 'the exercise stays open until its last set')
        lab = pg.locator('#rest-l').inner_text(); ok(lab.startswith('Next ') and re.search(r'\d', lab) is not None, 'the rest bar names the next set: "%s"' % lab)
        tick(pg, us[0], len(its[0]['rows']) - 1); pg.wait_for_timeout(500)
        ok(opened(pg) == [us[1]] and folded(pg)[0] == us[0], 'ticking the last set folds it and opens the next one')
        row = pg.locator('#x-' + us[0]); ok('done' in row.get_attribute('class') and row.locator('.fold-ck').count() == 1 and re.search(r'\d', row.locator('small').inner_text()) is not None, 'the finished one is a ticked line with what was done: %s' % row.locator('small').inner_text())
        lab = pg.locator('#rest-l').inner_text(); want = pg.locator('.exc.cur .field input').first.get_attribute('placeholder')
        ok(lab.startswith('Next ') and want in lab, 'the rest bar now names the first set of the next exercise: "%s"' % lab)
        ok(draft(pg).get('cur') == us[1], 'which exercise is open is kept with the workout')
        pg.reload(); pg.wait_for_timeout(600); ok(opened(pg) == [us[1]], 'and survives a reload')
        # ---- opening by hand
        pg.locator('#x-' + us[0]).tap(); pg.wait_for_timeout(500)
        ok(opened(pg) == [us[0]] and us[1] in folded(pg), 'tapping a finished line opens it again and folds the other')
        ok(pg.locator('#x-%s .set.done' % us[0]).count() == len(its[0]['rows']), 'its sets are there to correct')
        pg.locator('#x-' + us[3]).tap(); pg.wait_for_timeout(500)
        ok(opened(pg) == [us[3]], 'tapping a later line opens that exercise')
        top = pg.evaluate("document.getElementById('x-%s').getBoundingClientRect().top" % us[3]); ok(90 <= top <= 400, 'and it is in view under the workout bar (top at %d px)' % top)
        tick(pg, us[3], 0); pg.locator('#x-' + us[1]).tap(); pg.wait_for_timeout(500)
        t3 = pg.locator('#x-%s small' % us[3]).inner_text(); ok(t3.startswith('1 of %d sets' % len(its[3]['rows'])), 'an exercise left half-way says so on its line: %s' % t3)

        # ---- the row of actions
        acts = pg.locator('.exc.cur .acts .act').all_inner_texts(); ok(acts == ['+ Set', 'Warm-up', 'Swap', 'Note'], 'actions before the first set: %s' % acts)
        n0 = pg.locator('.exc.cur .set').count(); pg.locator('.exc.cur [data-act="add-set"]').tap(); pg.wait_for_timeout(250); ok(pg.locator('.exc.cur .set').count() == n0 + 1, '+ Set adds a set')
        pg.locator('.exc.cur [data-act="note-open"]').tap(); pg.wait_for_timeout(250)
        ok(pg.evaluate("document.activeElement && document.activeElement.id") == 'note-' + us[1], 'Note opens the note field with the cursor in it')
        pg.keyboard.type('seat 4'); pg.wait_for_timeout(200); tick(pg, us[1], 0)
        ok(pg.locator('#note-' + us[1]).input_value() == 'seat 4' and pg.locator('.exc.cur [data-act="note-open"]').count() == 0, 'a written note keeps its field and the Note pill goes')
        ok('Swap' not in pg.locator('.exc.cur .acts .act').all_inner_texts(), 'Swap goes once a set is done')
        pg.locator('.exc.cur [data-act="ex-menu"]').tap(); pg.wait_for_timeout(250); pg.locator('#sheet [data-act="del-set"]').tap(); pg.wait_for_timeout(300)
        ok(pg.locator('.exc.cur .tick.del').count() == n0 + 1 and pg.locator('.exc.cur .acts .act').all_inner_texts() == ['Done removing'], 'Remove set is in the three-dot menu and turns the ticks into crosses')
        pg.locator('.exc.cur .tick.del').last.tap(); pg.wait_for_timeout(300); ok(pg.locator('.exc.cur .set').count() == n0 and pg.locator('.exc.cur .tick.del').count() == 0, 'a cross removes that set')
        # ---- records in one message, which does not take taps
        pg.fill('#w-%s-1' % us[1], '400'); pg.fill('#r-%s-1' % us[1], '40'); tick(pg, us[1], 1)
        tt = pg.locator('#toast').inner_text(); ok(tt.startswith('Record weight on ') and 'volume' not in pg.locator('.exc.cur').inner_text().lower(), 'a heavier set gives one record message and no volume record: "%s"' % tt)
        ok(pg.evaluate("getComputedStyle(document.getElementById('toast')).pointerEvents") == 'none', 'the message lets taps through')
        tb = pg.locator('#toast').bounding_box(); rb = pg.locator('#rest').bounding_box(); ok(tb and rb and tb['y'] + tb['height'] <= rb['y'] and rb['y'] - (tb['y'] + tb['height']) < 40, 'and sits just above the rest bar')
        pg.screenshot(path=os.path.join(SH, 'WL-mid.png'))
        # ---- a superset opens together
        gi = next(i for i, x in enumerate(its) if x.get('group') or x.get('link')); g = [us[gi], us[gi + 1]]
        pg.locator('#x-' + g[0]).tap(); pg.wait_for_timeout(500)
        ok(opened(pg) == g, 'the two halves of a superset open together')
        tick(pg, g[0], 0); lab = pg.locator('#rest-l').inner_text() if pg.locator('#rest').is_visible() else ''
        for u in g:
            for i in range(len(its[us.index(u)]['rows'])):
                if pg.locator('[data-act="tick"][data-u="%s"][data-i="%d"][aria-pressed="false"]' % (u, i)).count(): tick(pg, u, i)
        pg.wait_for_timeout(400); ok(all(u in folded(pg) for u in g), 'and fold together when both are done')
        # ---- targets for tap sizes and the main button
        small = pg.evaluate("""[].filter.call(document.querySelectorAll('#view button, #wbar button, #rest button'), function (b) {
          var r = b.getBoundingClientRect(); if (!r.width || b.disabled || b.closest('[hidden]')) return false;
          var x = r.left + r.width / 2, y = r.top + r.height / 2; b.scrollIntoView({ block: 'center' }); r = b.getBoundingClientRect(); y = r.top + r.height / 2; x = r.left + r.width / 2;
          function hit(dy) { var e = document.elementFromPoint(x, y + dy); return !!e && (e === b || b.contains(e)); }
          return r.height < 44 && !(hit(-21) && hit(21));
        }).map(function (b) { return (b.dataset.act || b.className) + ' ' + Math.round(b.getBoundingClientRect().height); })""")
        ok(not small, 'every button on the workout screen takes a tap over at least 44 px: %s' % small[:6])
        pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(200)
        cols = pg.evaluate("[getComputedStyle(document.getElementById('finish-btn')).backgroundColor, getComputedStyle(document.getElementById('wbar-fin')).backgroundColor]")
        ok(cols[0] == cols[1], 'Finish workout at the end has the same colour as Finish in the bar: %s' % cols)
        c.close()

        # ---- tips show once, in a log that is new
        few = dict(full); keep = sorted([k for k, v in full['sessions'].items() if v['key'] == 'upperB'])[-2:]; few['sessions'] = {k: full['sessions'][k] for k in keep}
        c, pg = page(few); d = draft(pg); u = d['items'][0]['u']
        ok(pg.locator('p.note').count() == 1 and pg.locator('.exc.cur .unit-hint').count() == 1, 'a log with two workouts shows the tip about grey numbers and the body-weight hint')
        tick(pg, u, 0); ok(pg.locator('p.note').count() == 0, 'the grey-numbers tip goes at the first tick')
        pg.evaluate("document.querySelector('[data-act=\"discard\"]').click()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-act=\"discard\"]').click()"); pg.wait_for_timeout(400)
        pg.evaluate("document.querySelector('[data-act=\"start\"][data-key=\"upperB\"]').click()"); pg.wait_for_timeout(500)
        ok(pg.locator('p.note').count() == 0, 'and does not come back in the next workout')
        c.close()

        # ---- editing a saved workout keeps everything open
        c, pg = page(full, key=None); pg.locator('.tab[data-tab="exercises"]').tap(); pg.wait_for_timeout(400)
        pg.locator('[data-act="hist-open"]').first.tap(); pg.wait_for_timeout(300); pg.locator('[data-act="open-session"]').first.tap(); pg.wait_for_timeout(300)
        pg.locator('[data-act="edit-session"]').first.tap(); pg.wait_for_timeout(500)
        ok(pg.locator('section.exc').count() >= 5 and pg.locator('button.exc.fold').count() == 0 and pg.locator('.why').count() == 0, 'editing a saved workout shows every exercise open (%d) and no reasons' % pg.locator('section.exc').count())
        c.close()

        # ---- widths, dark mode, long numbers
        for w in (320, 360, 390, 430):
            c, pg = page(full, w=w, scheme='dark' if w == 360 else 'light'); d = draft(pg); u = d['items'][0]['u']
            pg.fill('#w-%s-0' % u, '102.5'); pg.fill('#r-%s-0' % u, '12'); pg.wait_for_timeout(150)
            over = pg.evaluate("document.documentElement.scrollWidth - innerWidth"); clip = pg.evaluate("[].some.call(document.querySelectorAll('.exc.cur .field input'), function (i) { return i.scrollWidth > i.clientWidth + 1; })")
            ok(over <= 0 and not clip, '%d px wide: nothing sticks out and 102.5 fits its field' % w)
            pg.screenshot(path=os.path.join(SH, 'WL-%d.png' % w)); c.close()
        b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
