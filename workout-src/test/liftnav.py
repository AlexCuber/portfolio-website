"""Lifts: arrows and swipe step through exercises; By muscle draws one line per exercise."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8801
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
UI = "JSON.parse(localStorage.getItem('workout-log-v1')).ui"
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
        for scheme, w in (('light', 390), ('dark', 390), ('light', 320)):
            st = seed(); st['settings'] = {'setupDone': True}; st['ui'] = dict(st.get('ui') or {}, prog='lifts')
            c = b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
            c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(st)))
            pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://127.0.0.1:%d/index.html#progress' % PORT); pg.wait_for_timeout(700)
            if not pg.locator('.lift-nav').count(): pg.click('[data-act="prog"][data-v="lifts"]'); pg.wait_for_timeout(500)
            tag = '%s-%d' % (scheme, w)
            name = lambda: pg.inner_text('.lift-name span'); count = lambda: pg.inner_text('.lift-name small')
            n0, c0 = name(), count(); total = int(c0.split(' of ')[1])
            ok(c0.startswith('1 of ') and total > 3, '%s: starts on the first exercise of the plan: %s, %s' % (tag, n0, c0))
            pg.click('.lift-nav [data-step="1"]'); pg.wait_for_timeout(300); n1 = name()
            ok(n1 != n0 and count() == '2 of %d' % total, 'the right arrow goes to the next exercise: %s' % n1)
            ok(pg.locator('.chart[data-chart="exc"] svg').count() == 1, 'and its graph is drawn')
            pg.click('.lift-nav [data-step="-1"]'); pg.wait_for_timeout(250); pg.click('.lift-nav [data-step="-1"]'); pg.wait_for_timeout(250)
            ok(count() == '%d of %d' % (total, total), 'going back from the first wraps to the last: %s' % count())
            pg.click('.lift-nav [data-step="1"]'); pg.wait_for_timeout(250); ok(name() == n0, 'and forward again returns to the first')
            # swipe
            box = pg.locator('.chart[data-chart="exc"]').bounding_box(); y = box['y'] + box['height'] / 2
            def swipe(x1, x2, dy=0):
                pg.evaluate("""([x1,x2,y,dy]) => { const el = document.querySelector('.chart[data-chart="exc"] svg'); const o = {bubbles:true, pointerType:'touch', pointerId:7, isPrimary:true};
                  el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({clientX:x1, clientY:y}, o))); el.dispatchEvent(new PointerEvent('pointermove', Object.assign({clientX:(x1+x2)/2, clientY:y+dy/2}, o)));
                  document.querySelector('.chart[data-chart="exc"] svg').dispatchEvent(new PointerEvent('pointerup', Object.assign({clientX:x2, clientY:y+dy}, o))); }""", [x1, x2, y, dy]); pg.wait_for_timeout(400)
            swipe(box['x'] + box['width'] - 30, box['x'] + 40); ok(name() == n1, 'a swipe to the left goes to the next exercise: %s' % name())
            swipe(box['x'] + 40, box['x'] + box['width'] - 30); ok(name() == n0, 'a swipe to the right goes back')
            swipe(box['x'] + 100, box['x'] + 120); ok(name() == n0, 'a tap or a short drag does not switch')
            swipe(box['x'] + 200, box['x'] + 130, 160); ok(name() == n0, 'a mostly vertical drag does not switch')
            pg.click('.lift-name'); pg.wait_for_timeout(400); ok(pg.locator('.sheet, #sheet').first.is_visible(), 'tapping the name still opens the full list')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
            if pg.locator('[data-act="close-sheet"]').count() and pg.locator('[data-act="close-sheet"]').first.is_visible(): pg.locator('[data-act="close-sheet"]').first.click(); pg.wait_for_timeout(300)
            st = pg.locator('.stats .stat'); ok(st.count() in (2, 3) and pg.locator('.stats .stat[aria-pressed="true"]').count() == 1, 'the measures are tiles above the graph, one chosen: %s' % ' | '.join(x.replace('\n', ' ') for x in st.all_inner_texts()))
            ok(pg.locator('.chart[data-chart="exc"] .bestdot').count() == 1 and pg.locator('.chart[data-chart="exc"] .bestline').count() == 1, 'the best is marked on the graph')
            ok(pg.locator('.pills .pill.hot').count() == 0 and pg.locator('.card:first-of-type .opt-row [data-act="lift-mode"]').count() == 0, 'no best-set pill and no second set of measure pills')
            ok(pg.locator('.opt-row [data-act="lift-sets"]').count() == 1, 'All sets is still there, as a pill under the graph')
            d0 = pg.locator('.chart[data-chart="exc"] .dot3').count(); pg.click('.opt-row [data-act="lift-sets"]'); pg.wait_for_timeout(400)
            ok(pg.locator('.opt-row [data-act="lift-sets"]').get_attribute('aria-pressed') == 'true' and pg.locator('.chart[data-chart="exc"] .dot3').count() >= d0, 'and it turns on')
            pg.click('.opt-row [data-act="lift-sets"]'); pg.wait_for_timeout(300)
            ok(pg.evaluate("document.documentElement.scrollWidth") <= w, 'nothing sticks out sideways')
            pg.evaluate("document.querySelector('.lift-nav').scrollIntoView({block:'center'})"); pg.wait_for_timeout(1700); pg.screenshot(path=os.path.join(SH, 'LN-%s-one.png' % tag))
            pg.click('.stats .stat[data-v="tot"]'); pg.wait_for_timeout(500)
            nb = pg.locator('.chart[data-chart="exc"] rect.bar').count(); ok(nb >= 1 and pg.locator('.chart[data-chart="exc"] path.ln').count() == 0, 'Total is drawn as one column per workout: %d' % nb)
            ok(pg.locator('.opt-row [data-act="lift-sets"]').count() == 0, 'All sets steps aside while Total is shown')
            bx = pg.locator('.chart[data-chart="exc"] svg').bounding_box(); pg.touchscreen.tap(bx['x'] + bx['width'] * 0.5, bx['y'] + bx['height'] / 2); pg.wait_for_timeout(250)
            ok('Total' in pg.inner_text('#exc-t'), 'tapping a column shows the sets and the total: %s' % pg.inner_text('#exc-t').replace('\n', ' | ')[:80])
            pg.evaluate("document.querySelector('.lift-nav').scrollIntoView({block:'center'})"); pg.wait_for_timeout(1700); pg.screenshot(path=os.path.join(SH, 'LN-%s-one-tot.png' % tag))
            pg.click('.card:first-of-type [data-act="lift-pct"]'); pg.wait_for_timeout(400)
            ok(pg.locator('.chart[data-chart="exc"] rect.bar').count() == 0 and pg.locator('.chart[data-chart="exc"] text.val').first.text_content().endswith('%'), 'with % on it becomes a line of the change since the start')
            pg.click('.card:first-of-type [data-act="lift-pct"]'); pg.wait_for_timeout(200); pg.click('.stats .stat[data-v="max"]'); pg.wait_for_timeout(300)
            ok(pg.locator('.opt-row [data-act="lift-sets"]').count() == 1, 'and All sets is back with top weight')
            # personal bests
            ok(pg.locator('h3', has_text='Biggest gains').count() == 0, 'the Biggest gains card is gone (it is a sort order now)')
            ok(pg.locator('.pbweeks .pbw').count() == 8 and re.match(r'\d+ records? in the last four weeks', pg.inner_text('.pb-head').replace('\n', ' ')), 'records over eight weeks with a headline: %s' % pg.inner_text('.pb-head').replace('\n', ' '))
            hd = pg.locator('.pb-h').first.inner_text(); ok(hd == 'New in the last two weeks', 'the newest records come first: %d cards' % pg.locator('.pb-new').count())
            wk = pg.locator('.pbw:not(.none)').first
            if wk.count():
                n_w = int(wk.locator('b').inner_text()); wk.click(); pg.wait_for_timeout(300)
                ok(pg.locator('.pb-h').first.inner_text().startswith('Week of') and 1 <= pg.locator('.pb-new').count() <= n_w, 'tapping a week shows what was beaten that week: %s, %d cards for %d records' % (pg.locator('.pb-h').first.inner_text(), pg.locator('.pb-new').count(), n_w))
                pg.locator('.pbw[aria-pressed="true"]').click(); pg.wait_for_timeout(300); ok(pg.locator('.pb-h').first.inner_text() == 'New in the last two weeks', 'tapping it again goes back')
            nt = pg.locator('.pb-tile').count(); ok(1 <= nt <= 6, 'six tiles at most to begin with: %d' % nt)
            if pg.locator('[data-act="pb-all"]').count():
                pg.click('[data-act="pb-all"]'); pg.wait_for_timeout(300); ok(pg.locator('.pb-tile').count() == total, 'Show all lists every exercise: %d' % pg.locator('.pb-tile').count()); pg.click('[data-act="pb-all"]'); pg.wait_for_timeout(200)
            pg.click('[data-act="pb-sort"][data-v="top"]'); pg.wait_for_timeout(300)
            ws = [float(x.split('kg')[0]) for x in pg.locator('.pb-tile b').all_inner_texts() if 'kg' in x]; ok(ws == sorted(ws, reverse=True) and len(ws) > 1, 'Heaviest sorts by weight: %s' % ws)
            pg.click('[data-act="pb-sort"][data-v="gain"]'); pg.wait_for_timeout(300); ok('%' in pg.locator('.pb-tile em').first.inner_text(), 'Biggest gain shows the gain: %s' % pg.locator('.pb-tile em').first.inner_text())
            g1 = pg.locator('[data-act="pb-grp"]').nth(1); gname = g1.inner_text(); g1.click(); pg.wait_for_timeout(300)
            ok(pg.locator('[data-act="pb-grp"][aria-pressed="true"]').inner_text() == gname and pg.locator('.pb-tile').count() >= 1, 'a muscle chip filters the tiles: %s, %d' % (gname, pg.locator('.pb-tile').count()))
            pg.evaluate("document.querySelector('.pb-head').scrollIntoView({block:'start'}); window.scrollBy(0, -110)"); pg.wait_for_timeout(600); pg.screenshot(path=os.path.join(SH, 'LN-%s-bests.png' % tag))
            pg.locator('[data-act="pb-grp"]').first.click(); pg.click('[data-act="pb-sort"][data-v="new"]'); pg.wait_for_timeout(200)
            ok(pg.evaluate("document.documentElement.scrollWidth") <= w, 'nothing sticks out sideways with the bests')
            pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(200)
            # by muscle
            pg.click('[data-act="lift-view"][data-v="mus"]'); pg.wait_for_timeout(500)
            ok(pg.evaluate(UI + ".liftView") == 'mus' and pg.locator('.lift-nav').count() == 0, 'By muscle replaces the single-exercise controls')
            groups = pg.locator('[data-act="lift-grp"]').all_inner_texts(); ok(len(groups) >= 2, 'muscle groups to pick from: %s' % groups)
            lines = lambda: pg.locator('.chart[data-chart="mus"] path.ln').count() + 0
            dots = lambda: pg.locator('.chart[data-chart="mus"] .mdot').count()
            on = lambda: pg.locator('.lchip[aria-pressed="true"]').count()
            ok(1 <= on() <= 4 and dots() == on(), 'up to four exercises are drawn, one end dot each: %d shown, %d dots' % (on(), dots()))
            cols = pg.evaluate("[...document.querySelectorAll('.chart[data-chart=\"mus\"] .mdot')].map(e => getComputedStyle(e).fill)"); ok(len(set(cols)) == len(cols), 'each line has its own colour: %s' % cols)
            first = pg.locator('.lchip[aria-pressed="true"]').first; fid = first.get_attribute('data-ex'); keep = pg.evaluate("[...document.querySelectorAll('.lchip[aria-pressed=\"true\"] i')].map(e => getComputedStyle(e).backgroundColor)")
            n_on = on(); first.click(); pg.wait_for_timeout(300)
            ok(on() == n_on - 1 and dots() == n_on - 1, 'tapping a name hides its line')
            after = pg.evaluate("[...document.querySelectorAll('.lchip[aria-pressed=\"true\"] i')].map(e => getComputedStyle(e).backgroundColor)"); ok(after == keep[1:], 'the other lines keep their colours')
            pg.click('.lchip[data-ex="%s"]' % fid); pg.wait_for_timeout(300); ok(on() == n_on, 'tapping it again brings it back')
            ends = pg.locator('.chart[data-chart="mus"] text.val').all_text_contents()
            ok(len(ends) == on() and all(re.fullmatch(r'[0-9.,]+', x) for x in ends), 'one number without a unit at the end of each line: %s' % ends)
            ys = sorted(pg.evaluate("[...document.querySelectorAll('.chart[data-chart=\"mus\"] text.val')].map(e => +e.getAttribute('y'))")); ok(all(b2 - a2 >= 13.9 for a2, b2 in zip(ys, ys[1:])), 'the numbers do not sit on top of each other: %s' % ys)
            ok(pg.locator('.lchip b').count() == 0, 'the legend has names only')
            ok(pg.locator('.card:first-of-type .seg').count() == 1 and pg.locator('.opt-row [data-act="lift-mode"]').count() == 3, 'top weight, 1-rep max and total are small pills under the graph')
            order = pg.evaluate("(() => { const c = document.querySelector('.chart[data-chart=\"mus\"]').getBoundingClientRect().bottom, o = document.querySelector('.opt-row').getBoundingClientRect().top; return o >= c; })()"); ok(order, 'the options sit below the graph')
            if pg.locator('[data-act="lift-pct"]').count():
                pg.click('[data-act="lift-pct"]'); pg.wait_for_timeout(400)
                e1 = pg.locator('.chart[data-chart="mus"] text.val').all_text_contents(); ok(all(x.endswith('%') for x in e1), 'the percent pill turns the numbers into a change: %s' % e1)
                pg.evaluate("document.querySelector('.card .seg').scrollIntoView({block:'start'})"); pg.wait_for_timeout(1700); pg.screenshot(path=os.path.join(SH, 'LN-%s-mus-pct.png' % tag)); pg.click('[data-act="lift-pct"]'); pg.wait_for_timeout(300)
                ok(not any('%' in x for x in pg.locator('.chart[data-chart="mus"] text.val').all_text_contents()), 'and the unit pill turns them back')
            pg.click('.opt-row [data-act="lift-mode"][data-v="e1rm"]'); pg.wait_for_timeout(400); ok(pg.evaluate(UI + ".liftMode") == 'e1rm' and pg.locator('.chart[data-chart="mus"] .mdot').count() == on(), 'the 1-rep max pill redraws the lines')
            pg.click('.opt-row [data-act="lift-mode"][data-v="tot"]'); pg.wait_for_timeout(400)
            tt = pg.locator('.chart[data-chart="mus"] text.val').all_text_contents(); ok(len(tt) == on() and all(float(x.replace(',', '').replace('K', '')) > 0 for x in tt), 'Total draws the work per day for each exercise: %s' % tt)
            pg.click('[data-act="lift-pct"]'); pg.wait_for_timeout(300); ok(all(x.endswith('%') for x in pg.locator('.chart[data-chart="mus"] text.val').all_text_contents()), 'and Total can be seen as a change in percent')
            pg.evaluate("document.querySelector('.card .seg').scrollIntoView({block:'start'})"); pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(SH, 'LN-%s-mus-tot.png' % tag))
            pg.click('[data-act="lift-pct"]'); pg.wait_for_timeout(200); pg.click('.opt-row [data-act="lift-mode"][data-v="max"]'); pg.wait_for_timeout(300)
            cb = pg.locator('.chart[data-chart="mus"] svg').bounding_box(); pg.touchscreen.tap(cb['x'] + cb['width'] * 0.6, cb['y'] + cb['height'] / 2); pg.wait_for_timeout(250)
            ok(pg.locator('#mus-t').is_visible() and pg.locator('#mus-t .trow').count() >= 1, 'tapping the graph shows that day for each exercise: %s' % pg.inner_text('#mus-t').replace('\n', ' | ')[:90])
            pg.evaluate("document.querySelector('.card .seg').scrollIntoView({block:'start'})"); pg.wait_for_timeout(1700); pg.screenshot(path=os.path.join(SH, 'LN-%s-mus.png' % tag))
            for i in range(len(groups)):
                pg.locator('[data-act="lift-grp"]').nth(i).click(); pg.wait_for_timeout(250); ok(on() <= 4 and (dots() == on()), '   %s: %d lines' % (groups[i], on()))
            ok(pg.evaluate("document.documentElement.scrollWidth") <= w, 'nothing sticks out sideways in By muscle')
            # a personal best row jumps back to the single view
            pg.locator('.pb-tile').last.click(); pg.wait_for_timeout(500); ok(pg.locator('.lift-nav').count() == 1, 'tapping a lift in the lists below opens it as one exercise')
            pg.reload(); pg.wait_for_timeout(600); ok(pg.locator('.lift-nav').count() == 1, 'the view is remembered after a reload')
            c.close()
        b.close()
finally:
    srv.terminate()
ok(not errs, 'no page errors %s' % errs[:2])
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
