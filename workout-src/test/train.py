"""Train (T1 to T5, N4): the week as dots and a count, the weigh-in strip, other sessions as one row, no tap instructions."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8794
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
        def page(st, w=390, scheme='light'):
            c = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            c.add_init_script("localStorage.setItem('hilo-backup-v1', JSON.stringify({ at: Date.now(), n: 999, later: 0 }))")  # backed up, so the reminder card stays away
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            return c, pg
        def body(days, waist=None):
            o = {D(n): {'date': D(n), 'weight': 76 + n * 0.1} for n in days}
            if waist is not None: o.setdefault(D(waist), {'date': D(waist)})['waist'] = 84
            return o
        full = seed(); full['settings'] = {'setupDone': True}; td = datetime.date.today(); full['ui'] = {'recapSeen': (td - datetime.timedelta(days=td.weekday())).isoformat()}  # last week's recap closed
        def withBody(bd, **sett):
            s = json.loads(json.dumps(full)); s['body'] = bd; s['settings'].update(sett); return s

        # ---- the week: dots and a count, no ring
        c, pg = page(withBody(body([0, 2, 4])))
        ok(pg.locator('.ring').count() == 0 and re.match(r'^\d/4$', pg.locator('.week-n b').inner_text()) is not None and pg.locator('.days .day').count() == 7, 'the week is seven day dots and the count %s, with no ring' % pg.locator('.week-n b').inner_text())
        txt = pg.locator('#view').inner_text()
        for t in ['Tap a session to start it', 'Tap one to start it', 'not logged yet', 'Build your own from the exercise library', 'Start now and add exercises as you go', 'more to reach this week']:
            ok(t not in txt, 'gone: "%s"' % t)
        # ---- other sessions
        nk = pg.locator('.btn.start').get_attribute('data-key'); keys = pg.locator('.sess').evaluate_all("els => els.map(e => e.dataset.key)")
        ok(pg.locator('.plan-head h3').first.inner_text().lower() == 'other sessions' and nk not in keys and len(keys) == 4, 'the plan is a row of the %d other sessions; next up (%s) is not repeated' % (len(keys), nk))
        t0 = pg.locator('.sess').first.inner_text().split('\n'); ok(len(t0) == 3 and re.match(r'^\d+ \w{3}$', t0[2]) is not None, 'a tile has initials, the name and the last date: %s' % t0)
        ok(pg.locator('.weigh').count() == 0, 'no weigh-in strip when today is logged')
        sb = pg.locator('.btn.start').bounding_box(); ok(sb['y'] + sb['height'] < 844 - 90, 'with the recap closed, Start is on the first screen (its bottom at %d px)' % (sb['y'] + sb['height']))
        hgt = pg.evaluate("document.documentElement.scrollHeight"); ok(hgt < 1300, 'Train is %d px tall (it was about 1,500)' % hgt)
        ok(pg.locator('.train-more .act').all_inner_texts() == ['New session', 'Empty workout'], 'New session and Empty workout are two pills')
        pg.screenshot(path=os.path.join(SH, 'TR-train.png'), full_page=True)
        pg.locator('.sess').nth(1).tap(); pg.wait_for_timeout(500)
        ok(pg.evaluate(LS + '.draft.key') == keys[1], 'tapping a tile starts that session')
        pg.locator('.wbar-min').tap(); pg.wait_for_timeout(400)
        ok(pg.locator('.sess').count() == 5 and pg.locator('.plan-head h3').first.inner_text().lower() == 'your plan', 'while a workout is in progress the row shows all five sessions as "Your plan"')
        pg.locator('[data-act="plan-edit"]').tap(); pg.wait_for_timeout(300); ok(pg.locator('.plan-row').count() == 5 and pg.locator('.weigh').count() == 0, 'Edit still opens the full list')
        c.close()

        # ---- the weigh-in strip
        c, pg = page(withBody(body([1, 2, 4])))
        w = pg.locator('.weigh').inner_text(); ok('7-day average' in w and '76.2 kg' in w and pg.locator('.weigh small.late').count() == 0, 'not weighed today: the strip shows the 7-day average: %s' % w.replace('\n', ' | '))
        box = pg.locator('.weigh').bounding_box(); ok(box['height'] <= 70, 'the strip is slim (%d px)' % box['height'])
        pg.screenshot(path=os.path.join(SH, 'TR-weigh.png'))
        pg.locator('[data-act="weigh-open"]').tap(); pg.wait_for_timeout(300)
        ok(pg.evaluate("document.activeElement && document.activeElement.id") == 'weigh-in' and pg.locator('#weigh-in').get_attribute('placeholder') == '76.1', 'Log weight opens one field with the cursor in it and the last weight in grey')
        pg.locator('[data-act="weigh-save"]').tap(); pg.wait_for_timeout(250); ok(pg.locator('#weigh-in').count() == 1 and 'Enter your weight' in pg.locator('#toast').inner_text(), 'an empty field is not saved')
        pg.fill('#weigh-in', '75,8'); pg.locator('[data-act="weigh-save"]').tap(); pg.wait_for_timeout(400)
        ok(pg.evaluate(LS + ".body['%s'].weight" % D(0)) == 75.8 and pg.locator('.weigh').count() == 0, 'saving stores today\'s weight (a comma works) and the strip goes')
        c.close()
        c, pg = page(withBody(body([5, 6, 9])))
        w = pg.locator('.weigh').inner_text(); ok('last weighed 5 days ago' in w and pg.locator('.weigh small.late').count() == 1, 'four days or more since the last weigh-in: the strip says so: %s' % w.replace('\n', ' | '))
        c.close()
        c, pg = page(withBody(body([0, 2], waist=15)))
        w = pg.locator('.weigh').inner_text(); ok('Waist' in w and 'measured 15 days ago' in w and 'Log weight' not in w, 'weight logged today and the waist two weeks old: only the waist line shows: %s' % w.replace('\n', ' | '))
        pg.locator('[data-act="weigh-body"]').tap(); pg.wait_for_timeout(400); ok(pg.evaluate(LS + '.ui.prog') == 'body' and pg.locator('#body-form').count() == 1, 'Measure goes to Progress, Body')
        c.close()
        c, pg = page(withBody(body([0, 2], waist=5))); ok(pg.locator('.weigh').count() == 0, 'a waist measured five days ago gives no reminder'); c.close()
        c, pg = page(withBody({})); ok(pg.locator('.weigh').count() == 0, 'someone who has never logged a weight and has no goal weight sees no strip'); c.close()
        c, pg = page(withBody({}, goalWeight=80)); w = pg.locator('.weigh').inner_text(); ok('Log weight' in w and 'no weigh-in yet' in w, 'with a goal weight set the strip invites the first weigh-in'); c.close()

        # ---- widths, dark, other themes
        for w_, sch, pal in [(320, 'dark', ''), (360, 'light', 'graphite'), (430, 'light', 'blossom')]:
            c, pg = page(withBody(body([5, 6], waist=20), palette=pal), w=w_, scheme=sch)
            over = pg.evaluate("document.documentElement.scrollWidth - innerWidth")
            small = pg.evaluate("""[].filter.call(document.querySelectorAll('#view button'), function (b) { var r = b.getBoundingClientRect(); if (!r.width) return false; b.scrollIntoView({ block: 'center' }); r = b.getBoundingClientRect();
              var x = r.left + r.width / 2, y = r.top + r.height / 2; function hit(dy) { var e = document.elementFromPoint(x, y + dy); return !!e && (e === b || b.contains(e)); } return r.height < 44 && !(hit(-21) && hit(21)); }).map(function (b) { return (b.dataset.act || b.className) + ' ' + Math.round(b.getBoundingClientRect().height); })""")
            ok(over <= 0, '%d px wide: nothing sticks out' % w_); ok(not small, '%d px wide: every button on Train takes a tap over 44 px: %s' % (w_, small[:5]))
            pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path=os.path.join(SH, 'TR-%d.png' % w_), full_page=True); c.close()
        b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
