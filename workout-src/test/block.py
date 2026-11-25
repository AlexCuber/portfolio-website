"""The training block (N1): the chip on Train, the sheet, the easy week and the extra set in the push weeks."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8789
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
T = datetime.date.today(); MON = T - datetime.timedelta(days=T.weekday())
wk = lambda n: (MON - datetime.timedelta(days=7 * n)).isoformat()   # the Monday n weeks back
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        def page(st, scheme='light'):
            c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            c.add_init_script("localStorage.setItem('hilo-backup-v1', JSON.stringify({ at: Date.now(), n: 999, later: 0 }))")
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(600)
            return c, pg
        def state(block=None, **sett):
            s = seed(); s['settings'] = {'setupDone': True}; s['settings'].update(sett)
            if block is not None: s['settings']['block'] = block
            s['ui'] = {'recapSeen': MON.isoformat(), 'tips': {'t': 1, 's': 1, 'b': 1}}; return s
        chip = lambda pg: pg.locator('.pill.blk').first.inner_text() if pg.locator('.pill.blk').count() else ''
        start = lambda pg, key='upperA': (pg.evaluate("document.querySelector('[data-act=\"start\"][data-key=\"%s\"]').click()" % key), pg.wait_for_timeout(500))
        rows = lambda pg: pg.evaluate(LS + ".draft.items.map(function (x) { return [x.ex, x.rows.length]; })")

        # ---- which week it is
        for back, want in [(0, 'Week 1 of 12 · Settle in'), (2, 'Week 3 of 12 · Build'), (6, 'Week 7 of 12 · Push'), (11, 'Week 12 of 12 · Easy week'), (12, 'Week 1 of 12 · Settle in'), (26, 'Week 3 of 12 · Build')]:
            c, pg = page(state({'start': wk(back)})); ok(chip(pg) == want, 'a block that started %d weeks ago reads "%s"' % (back, chip(pg))); c.close()
        s0 = state(); first = min(x['date'] for x in s0['sessions'].values()); fd = datetime.date.fromisoformat(first); n = ((MON - (fd - datetime.timedelta(days=fd.weekday()))).days // 7) % 12 + 1
        c, pg = page(s0); ok(chip(pg).startswith('Week %d of 12' % n), 'with no start set, the block starts in the week of the first workout: %s' % chip(pg)); c.close()
        c, pg = page(state(blockOff=True)); ok(chip(pg) == '', 'switched off in settings: no chip'); c.close()

        # ---- the sheet
        c, pg = page(state({'start': wk(2)}))
        pg.locator('.pill.blk').tap(); pg.wait_for_timeout(300)
        ok(pg.locator('.bw').count() == 12 and pg.locator('.bw.now').inner_text() == '3' and pg.locator('.bphases li.now b').inner_text() == 'Build', 'the sheet shows twelve weeks with week 3 marked and Build as the phase')
        ok(pg.locator('[data-act="block-plus"]').count() == 0, 'the extra-set switch is not offered outside the push weeks')
        pg.screenshot(path=os.path.join(SH, 'BL-sheet.png'))
        # an ordinary week: planned sets, targets as usual
        pg.keyboard.press('Escape'); pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(300)
        start(pg); normal = dict(rows(pg)); why0 = pg.locator('.exc.cur .why').inner_text()
        ok('Easy week' not in pg.locator('#view').inner_text(), 'an ordinary week has no easy-week tag')
        pg.evaluate("document.querySelector('[data-act=\"discard\"]').click()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-act=\"discard\"]').click()"); pg.wait_for_timeout(400)
        # ---- the easy week, taken early
        pg.locator('.pill.blk').tap(); pg.wait_for_timeout(300); pg.locator('[data-act="block-easy"][data-v="1"]').tap(); pg.wait_for_timeout(400)
        ok(pg.locator('.bw.now').get_attribute('class').find('easy') >= 0 and pg.locator('[data-act="block-easy"][data-v="0"]').count() == 1, '"Start the easy week now" turns this week into the easy week and offers the way back')
        pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(300)
        ok(chip(pg) == 'Week 3 of 12 · Easy week', 'the chip says so: %s' % chip(pg))
        start(pg); easy = dict(rows(pg))
        ok(all(easy[k] == max(1, -(-normal[k] // 2)) or normal[k] > 4 for k in easy) and sum(easy.values()) < sum(normal.values()), 'the workout has half the sets: %s against %s' % (sum(easy.values()), sum(normal.values())))
        why = pg.locator('.exc.cur .why').inner_text(); ok(why.startswith('Easy week · same weight') and 'Easy week · half the sets' in pg.locator('.wtop').inner_text(), 'the chip and a tag say it is the easy week: %s' % why)
        ph = pg.locator('.exc.cur .field input').first.get_attribute('placeholder'); lastw = pg.locator('.exc.cur .set-prev').first.inner_text().split(' × ')[0]
        ok(ph == lastw, 'the weight is last time\'s (%s) and nothing goes up' % ph)
        d = pg.evaluate(LS + '.draft'); u = d['items'][0]['u']
        for i in range(len(d['items'][0]['rows'])): pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u, i)); pg.wait_for_timeout(250)
        pg.locator('#wbar-fin').tap(); pg.wait_for_timeout(300)
        if pg.locator('#wbar-fin').count() and pg.locator('#wbar-fin').is_visible(): pg.locator('#wbar-fin').tap(); pg.wait_for_timeout(500)
        saved = pg.evaluate("(function () { var s = " + LS + ".sessions; return Object.keys(s).map(function (k) { return s[k]; }).filter(function (x) { return x.easy; }).length; })()")
        ok(saved == 1, 'the saved workout is marked as an easy-week one')
        pg.goto('http://127.0.0.1:%d/index.html' % PORT); pg.wait_for_timeout(500)
        pg.locator('.pill.blk').tap(); pg.wait_for_timeout(300); pg.locator('[data-act="block-easy"][data-v="0"]').tap(); pg.wait_for_timeout(400); pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(300)
        ok(chip(pg) == 'Week 3 of 12 · Build', '"Back to a normal week" undoes it')
        start(pg); again = dict(rows(pg)); ok(again == normal and pg.locator('.exc.cur .why').inner_text() == why0, 'the next normal workout builds on the last normal one, not on the easy one: %s' % pg.locator('.exc.cur .why').inner_text())
        c.close()
        # an early easy week last week: a new block began this week
        c, pg = page(state({'start': wk(5), 'easy': wk(1)})); ok(chip(pg) == 'Week 1 of 12 · Settle in', 'the week after an early easy week is week 1 of the next block: %s' % chip(pg)); c.close()

        # ---- the push weeks
        c, pg = page(state({'start': wk(7)}), scheme='dark')
        pg.locator('.pill.blk').tap(); pg.wait_for_timeout(300); sw = pg.locator('[data-act="block-plus"]')
        ok(sw.count() == 1 and sw.get_attribute('aria-checked') == 'false', 'in the push weeks the sheet offers one more set, off to begin with')
        sw.tap(); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SH, 'BL-push.png')); pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(300)
        start(pg); plus = dict(rows(pg)); more = [k for k in plus if plus[k] == normal[k] + 1]
        ok(sorted(more) == ['cable-lateral-raise', 'pec-deck'] and all(plus[k] == normal[k] for k in plus if k not in more), 'switched on, Upper A gets one more set on the pec deck and the lateral raise only: %s' % more)
        d = pg.evaluate(LS + '.draft'); u = next(x['u'] for x in d['items'] if x['ex'] == 'pec-deck'); pg.locator('button#x-%s' % u).click(); pg.wait_for_timeout(300)
        ok('+1 set, push weeks' in pg.locator('#x-%s .why' % u).inner_text(), 'and its chip says why')
        c.close()
        c, pg = page(state({'start': wk(2), 'plus': True})); start(pg); ok(dict(rows(pg)) == normal, 'outside the push weeks the switch adds nothing'); c.close()

        # ---- changing the start, and the setting
        c, pg = page(state({'start': wk(2)})); pg.locator('.pill.blk').tap(); pg.wait_for_timeout(300)
        pg.fill('#block-start', (MON - datetime.timedelta(days=7 * 8 - 2)).isoformat()); pg.locator('#block-start').dispatch_event('change'); pg.wait_for_timeout(400)
        ok(pg.locator('.bw.now').inner_text() == '9' and pg.evaluate(LS + '.settings.block.start') == wk(8), 'a new start date moves the block; any day of a week counts as that week')
        pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(300); pg.locator('[data-act="settings"]').first.tap(); pg.wait_for_timeout(300)
        pg.locator('[data-act="block-toggle"]').tap(); pg.wait_for_timeout(300); pg.evaluate("document.getElementById('scrim').click()"); pg.wait_for_timeout(300)
        ok(chip(pg) == '' and pg.evaluate(LS + '.settings.blockOff') is True, 'the switch in settings turns the block off')
        c.close(); b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
