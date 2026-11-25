"""Steps 3 and 4 of the roadmap: reps left in the tank, warm-up and plates, swaps, countdown, first-run setup, units, templates."""
import asyncio, json, sys, os, subprocess, time, signal, re, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8773
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
async def openhelp(pg, u):
    await pg.click('#x-%s [data-act="ex-menu"]' % u); await pg.wait_for_timeout(250); await pg.click('.sheet [data-act="help-open"]')
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = "JSON.parse(localStorage.getItem('workout-log-v1'))"
async def page(b, state, errs, scheme='light', w=390):
    c = await b.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', color_scheme=scheme, locale='en-GB')
    if state is not None: await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(state)))
    pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(700)
    return c, pg
def serve(folder, port):
    return subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', folder), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
async def main():
    # every exercise a template names must exist
    src = open(os.path.join(ROOT, '..', 'src', 'app-1c-setup.js')).read(); lib = open(os.path.join(ROOT, '..', 'src', 'library.js')).read()
    ids = set(re.findall(r"^    \['([a-z0-9-]+)'", lib, re.M)) | {x['id'] for s in PLAN['sessions'].values() for x in s['exercises']}
    used = re.findall(r"\['([a-z0-9-]+)', \d", src); ok(len(used) > 30 and all(u in ids for u in used), 'every exercise in the templates exists in the library (%d checked, missing: %s)' % (len(used), [u for u in used if u not in ids]))
    srv = serve('pwa', PORT); srv2 = serve('artifact', PORT + 1); time.sleep(0.8); errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            # ================= first run =================
            print('== first run')
            c, pg = await page(b, None, errs)
            ok(await pg.locator('[data-act="setup-go"]').count() == 1 and await pg.locator('.tabs').is_hidden(), 'a new log opens on the setup screen, without the tab bar')
            ok(await pg.locator('[data-act="setup-unit"][data-v="kg"]').get_attribute('aria-pressed') == 'true' and await pg.locator('[data-act="setup-days"][data-v="4"]').get_attribute('aria-pressed') == 'true' and await pg.locator('.tpl.on').get_attribute('data-v') == 'ul', 'it starts on kilograms, 4 days, upper/lower')
            await pg.screenshot(path=os.path.join(SH, 'S-setup.png'), full_page=True)
            await pg.click('[data-act="setup-days"][data-v="3"]'); ok(await pg.locator('.tpl.on').get_attribute('data-v') == 'fb', '3 days suggests full body')
            await pg.click('[data-act="setup-days"][data-v="6"]'); ok(await pg.locator('.tpl.on').get_attribute('data-v') == 'ppl', '6 days suggests push/pull/legs')
            await pg.click('[data-act="setup-tpl"][data-v="fb"]'); await pg.click('[data-act="setup-days"][data-v="2"]'); ok(await pg.locator('.tpl.on').get_attribute('data-v') == 'fb' and 'Full body C' not in await pg.locator('.tpl.on').inner_text(), 'a plan picked by hand stays picked; full body on 2 days has two sessions')
            await pg.click('[data-act="setup-days"][data-v="3"]'); await pg.click('[data-act="setup-unit"][data-v="lb"]'); await pg.wait_for_timeout(100)
            await pg.screenshot(path=os.path.join(SH, 'S-setup-lb.png'), full_page=True)
            await pg.click('[data-act="setup-go"]'); await pg.wait_for_timeout(500)
            st = await pg.evaluate(LS); se = st['settings']
            ok(se['unit'] == 'lb' and se['weeklyGoal'] == 3 and se['setupDone'] is True and se['planOrder'] == ['tpl-fb-a', 'tpl-fb-b', 'tpl-fb-c'], 'Start saves units, the weekly goal and the plan: %s' % {k: se[k] for k in ('unit', 'weeklyGoal', 'planOrder')})
            ini = await pg.locator('.avatar').all_inner_texts(); ok(ini == ['FA', 'FB', 'FC'], 'sessions with alike names get different initials: %s' % ini)
            ok(await pg.locator('.tabs').is_visible() and 'full body a' in (await pg.locator('.next-title').inner_text()).lower() and '0/3' in await pg.locator('.ring-n').inner_text(), 'Train shows Full body A next and a goal of 3')
            await pg.screenshot(path=os.path.join(SH, 'S-after-setup.png'), full_page=True)
            await pg.reload(); await pg.wait_for_timeout(500); ok(await pg.locator('[data-act="setup-go"]').count() == 0, 'setup does not come back')
            # pounds everywhere
            await pg.click('[data-act="start"][data-key="tpl-fb-a"]'); await pg.wait_for_timeout(400)
            names = await pg.locator('.exc-name').all_inner_texts(); ok(len(names) == 6 and all('Exercise' != n.strip() for n in names), 'the session opens with its six exercises: %s' % [n.replace('\n', ' ') for n in names][:3])
            txt = await pg.locator('#view').inner_text(); ok('lb' in txt.split() and 'kg' not in txt.split(), 'the workout screen says lb, never kg')
            u = await pg.evaluate(LS + ".draft.items.map(i=>i.u)")
            for i in range(3): await pg.fill('#w-%s-%d' % (u[0], i), '135'); await pg.fill('#r-%s-%d' % (u[0], i), '10'); await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u[0], i)); await pg.wait_for_timeout(60)
            await pg.click('#wbar-fin'); await pg.wait_for_timeout(200); await pg.click('#wbar-fin'); await pg.wait_for_timeout(600); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
            await pg.click('[data-act="start"][data-key="tpl-fb-a"]'); await pg.wait_for_timeout(400); u = await pg.evaluate(LS + ".draft.items.map(i=>i.u)")
            ok(await pg.get_attribute('#w-%s-0' % u[0], 'placeholder') == '140' and 'goes up by 5 lb' in await pg.locator('#x-%s .last-hint' % u[0]).last.inner_text(), 'in pounds the next step up is 5 lb (135 -> 140)')
            await openhelp(pg, u[0]); await pg.wait_for_timeout(300)
            t = await pg.locator('.sheet').inner_text(); ok('Each side: 45 + 2.5 lb' in t and '45 lb bar' in t, 'plates in pounds for 140 lb: 45 + 2.5 a side on a 45 lb bar')
            wl = await pg.locator('.warm-list li').all_inner_texts(); ok(len(wl) >= 3 and 'Empty bar' in wl[0], 'the first exercise of a workout gets the full ramp, starting with the empty bar: %s' % [x.replace('\n', ' | ') for x in wl])
            await pg.screenshot(path=os.path.join(SH, 'S-help-lb.png')); await pg.click('.sheet [data-act="sheet-x"]')
            await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(200)
            await pg.click('[data-tab="progress"]'); await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(500)
            t = await pg.locator('#body-form').inner_text(); ok('Weight, lb' in t and 'Waist, in' in t, 'the body form asks for lb and inches')
            await pg.fill('#bw-weight', '170'); await pg.click('#body-form button[type=submit]'); await pg.wait_for_timeout(200); ok(await pg.evaluate(LS + ".body['%s'].weight" % datetime.date.today().isoformat()) == 170, 'a body weight of 170 lb is accepted')
            # templates later, from plan editing
            await pg.click('[data-tab="log"]'); await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="tpl-open"]'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=os.path.join(SH, 'S-templates.png'))
            await pg.click('.sheet [data-act="tpl-apply"][data-v="ppl"]'); await pg.wait_for_timeout(400)
            st = await pg.evaluate(LS); ini = await pg.locator('.avatar').all_inner_texts(); ok(ini == ['PU', 'PL', 'LE'], 'Push and Pull are told apart: %s' % ini)
            ok(st['settings']['planOrder'] == ['tpl-push', 'tpl-pull', 'tpl-legs'] and all(st['routines'][k].get('hidden') for k in ('tpl-fb-a', 'tpl-fb-b', 'tpl-fb-c')), 'a template from plan editing replaces the plan and keeps the old sessions out of it, not deleted')
            await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="tpl-open"]'); await pg.wait_for_timeout(200); await pg.click('.sheet [data-act="tpl-apply"][data-v="ul"]'); await pg.wait_for_timeout(400)
            st = await pg.evaluate(LS); ok(st['settings']['planOrder'] == ['upperA', 'lowerA', 'upperB', 'lowerB', 'day5'] and 'upperA' not in st['routines'] and 'day5' not in st['routines'], 'upper/lower brings the built-in sessions back')
            ok(len(await pg.evaluate(LS + ".sessions")) == 1, 'the logged workout is still there')
            await c.close()
            # restore from a backup on the setup screen
            c, pg = await page(b, None, errs)
            bk = seed(); bk['settings'] = {'unit': 'lb', 'weeklyGoal': 5}; open('/tmp/hilo-bk.json', 'w').write(json.dumps(bk))
            await pg.set_input_files('#backup-file', '/tmp/hilo-bk.json'); await pg.wait_for_timeout(600)
            st = await pg.evaluate(LS); ok(len(st['sessions']) == len(bk['sessions']) and st['settings']['unit'] == 'lb' and st['settings']['weeklyGoal'] == 5 and await pg.locator('[data-act="setup-go"]').count() == 0, 'restoring a backup from the setup screen brings the log and its units back and skips setup')
            await c.close()
            # the Claude build waits for its storage before asking
            c = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:%d/index.html' % (PORT + 1)); await pg.wait_for_timeout(500)
            ok('opening your log' in (await pg.locator('#view').inner_text()).lower() and await pg.locator('[data-act="setup-go"]').count() == 0, 'Claude build: an empty device waits for Claude storage first')
            await pg.wait_for_timeout(4200); ok(await pg.locator('[data-act="setup-go"]').count() == 1, 'Claude build: with no storage answering, setup shows after a few seconds')
            await c.close()
            # ================= switching units converts the log =================
            print('== units')
            st0 = seed(); st0['settings'] = {'goalWeight': 80, 'setupDone': True}; c, pg = await page(b, st0, errs)
            sid = sorted(st0['sessions'])[5]; w0 = st0['sessions'][sid]['entries'][0]['sets'][0]['w']; bd = sorted(st0['body'])[3]
            await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="unit"][data-v="lb"]'); await pg.wait_for_timeout(200)
            ok(await pg.evaluate(LS + ".settings.unit") in (None, 'kg') and 'converts your' in await pg.locator('.sheet').inner_text(), 'the first tap on Pounds explains and changes nothing')
            await pg.screenshot(path=os.path.join(SH, 'S-units.png'))
            await pg.click('[data-act="unit"][data-v="lb"]'); await pg.wait_for_timeout(400)
            st = await pg.evaluate(LS); w1 = st['sessions'][sid]['entries'][0]['sets'][0]['w']
            ok(st['settings']['unit'] == 'lb' and abs(w1 - w0 * 2.20462) <= 0.13 and abs(st['body'][bd]['weight'] - st0['body'][bd]['weight'] * 2.20462) < 0.06 and abs(st['body'][bd]['waist'] - st0['body'][bd]['waist'] / 2.54) < 0.06 and abs(st['settings']['goalWeight'] - 176.5) < 0.01, 'the second tap converts lifts, body weight, waist and the goal (%s kg -> %s lb)' % (w0, w1))
            await pg.evaluate("document.querySelector('#scrim').click()"); await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(300)
            await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(150); ok(' lb' in await pg.locator('.hcard.open').inner_text() and ' kg' not in await pg.locator('.hcard.open').inner_text(), 'history reads in lb afterwards')
            await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="unit"][data-v="kg"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="unit"][data-v="kg"]'); await pg.wait_for_timeout(400)
            st = await pg.evaluate(LS); w2 = st['sessions'][sid]['entries'][0]['sets'][0]['w']
            ok(st['settings']['unit'] == 'kg' and abs(w2 - w0) <= 0.25 and abs(st['body'][bd]['weight'] - st0['body'][bd]['weight']) <= 0.1 and st['settings']['goalWeight'] == 80, 'and back to kilograms lands within a quarter of a kilo of where it started (%s -> %s)' % (w0, w2))
            await pg.evaluate("document.querySelector('#scrim').click()"); await c.close()
            for scheme in ('light', 'dark'):
                print('== helpers,', scheme); pre = 'S-' + ('L-' if scheme == 'light' else 'D-')
                st0 = seed(); st0['settings'] = {'setupDone': True, 'rir': True}; c, pg = await page(b, st0, errs, scheme)
                async def shot(n): await pg.screenshot(path=os.path.join(SH, pre + n + '.png'))
                # ================= reps left in the tank =================
                await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(400)
                items = await pg.evaluate(LS + ".draft.items.map(i=>({u:i.u,ex:i.ex,sets:i.sets,lo:i.lo,hi:i.hi}))"); u0 = items[0]['u']
                ok(await pg.locator('.rir').count() == 0, 'no question before a set is done')
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u0); await pg.wait_for_timeout(200)
                ok(await pg.locator('#x-%s .rir' % u0).count() == 1 and await pg.locator('#x-%s .rir button' % u0).count() == 4, 'after a set, four choices: 0, 1, 2, 3+')
                await shot('rir')
                await pg.click('#x-%s .rir [data-v="2"]' % u0); await pg.wait_for_timeout(150)
                ok(await pg.locator('#x-%s .rir' % u0).count() == 0 and await pg.locator('#x-%s .rir-b' % u0).inner_text() == '2' and await pg.evaluate(LS + ".draft.items[0].rows[0].rir") == 2, 'the answer shows on the tick and the question goes away')
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % u0); await pg.wait_for_timeout(120)
                ok(await pg.evaluate(LS + ".draft.items[0].rows[0].rir") is None, 'unticking the set clears it')
                for i in range(items[0]['sets']):
                    await pg.click('[data-act="tick"][data-u="%s"][data-i="%d"]' % (u0, i)); await pg.wait_for_timeout(100); await pg.click('#x-%s .rir [data-v="3"]' % u0); await pg.wait_for_timeout(80)
                await shot('rir2')
                prev = [e for e in sorted([s for s in st0['sessions'].values() if s['key'] == 'lowerA'], key=lambda s: s['date'])[-1]['entries'] if e['ex'] == items[0]['ex']][0]['sets']
                # ================= warm-up and plates =================
                u1 = items[1]['u']
                ok((await pg.locator('#x-%s [data-act="warm-one"]' % u1).inner_text()).strip() == 'Warm-up' and await pg.locator('#x-%s [data-act="warm-one"]' % items[2]['u']).count() == 1, 'weighted exercises have a Warm-up button that adds a set')
                await openhelp(pg, u1); await pg.wait_for_timeout(300)
                W = float(await pg.input_value('#help-w')); ph = float(await pg.get_attribute('#w-%s-0' % u1, 'placeholder')); ok(W == ph, 'the helper starts from today\'s target weight (%s kg)' % W)
                t = await pg.locator('.sheet').inner_text(); m = re.search(r'Each side: ([0-9.+ ]+) kg', t); side = [float(x) for x in m.group(1).split('+')] if m else []
                ok(m and abs(20 + 2 * sum(side) - W) < 0.01 and side == sorted(side, reverse=True), 'plates add up: 20 + 2 x (%s) = %s' % (' + '.join(str(x) for x in side), W))
                wl = await pg.locator('.warm-list li').all_inner_texts(); print('     warm-up for %s kg:' % W, [x.replace('\n', ' | ') for x in wl])
                ws = [float(re.search(r'([0-9.]+) kg', x).group(1)) for x in wl]
                ok(len(ws) == 1 and abs(ws[0] - 0.6 * W) <= 1.25, 'after the first exercise the helper gives one feeler set at about 60 percent')
                await pg.click('[data-act="help-ramp"]'); await pg.wait_for_timeout(120)
                wl = await pg.locator('.warm-list li').all_inner_texts(); print('     full ramp:', [x.replace('\n', ' | ') for x in wl]); ws = [20.0 if 'Empty bar' in x else float(re.search(r'([0-9.]+) kg', x).group(1)) for x in wl]
                ok(len(ws) >= 3 and ws == sorted(ws) and all(w < W for w in ws) and all(abs(w / 2.5 - round(w / 2.5)) < 1e-6 for w in ws), 'the full ramp rises toward the working weight in loadable steps')
                await shot('help')
                await pg.click('[data-act="help-step"][data-d="1"]'); await pg.wait_for_timeout(100); ok(float(await pg.input_value('#help-w')) == W + 2.5, 'plus adds 2.5 kg')
                await pg.fill('#help-w', '82.5'); await pg.wait_for_timeout(150); ok('Each side: 25 + 5 + 1.25 kg' in await pg.locator('.sheet').inner_text() and await pg.evaluate("document.activeElement.id") == 'help-w', '82.5 kg types in as 25 + 5 + 1.25 a side, and typing keeps the field')
                await pg.fill('#help-w', '83'); await pg.wait_for_timeout(150); ok('This loads 82.5 kg' in await pg.locator('.sheet').inner_text(), 'a weight plates cannot make says what they do make')
                await pg.click('[data-act="help-bar"][data-v="15"]'); await pg.wait_for_timeout(150); ok(await pg.evaluate(LS + ".settings.bars['%s']" % items[1]['ex']) == 15 and '15 kg bar' in await pg.locator('.sheet').inner_text(), 'the bar weight is remembered for that exercise')
                await pg.click('[data-act="help-ramp"]'); await pg.wait_for_timeout(100); ok(await pg.locator('.warm-list li').count() == 1 and 'feeler' in (await pg.locator('.sheet').inner_text()).lower(), 'and switches back to one feeler set')
                await pg.click('.sheet [data-act="sheet-x"]'); await pg.wait_for_timeout(200)
                await openhelp(pg, items[2]['u']); await pg.wait_for_timeout(250); ok(await pg.locator('.sheet .plates').count() == 0 and await pg.locator('.sheet .warm-list li').count() == 1, 'a later machine exercise for muscles already warm gets one feeler set and no plates')
                await pg.click('.sheet [data-act="sheet-x"]'); await pg.wait_for_timeout(200)
                # ================= swap =================
                ok(await pg.locator('#x-%s [data-act="swap-open"]' % u0).count() == 0 and await pg.locator('#x-%s [data-act="swap-open"]' % u1).count() == 1, 'Swap is offered until the exercise has a set done')
                await pg.click('#x-%s [data-act="swap-open"]' % u1); await pg.wait_for_timeout(300)
                opts = await pg.locator('.sheet [data-act="swap-pick"]').all_inner_texts(); print('     swaps for', items[1]['ex'], ':', [o.split('\n')[0] for o in opts])
                ok(2 <= len(opts) <= 6 and '45° back extension' in opts[0].lower() and any('dumbbell romanian deadlift' in o.lower() for o in opts) and 'the plan suggests' in (await pg.locator('.sheet').inner_text()).lower(), 'suggestions for the same muscles, the plan\'s own idea first')
                await shot('swap')
                pick = 'dumbbell-romanian-deadlift'; await pg.click('.sheet [data-act="swap-pick"][data-ex="%s"]' % pick); await pg.wait_for_timeout(300)
                it = await pg.evaluate(LS + ".draft.items[1]"); ok(it['ex'] == pick and it['sets'] == items[1]['sets'] and it['lo'] == items[1]['lo'] and it['hi'] == items[1]['hi'] and len(it['rows']) >= items[1]['sets'], 'picking one puts it in the same slot with the same sets and rep range')
                await pg.click('#x-%s [data-act="ex-menu"]' % it['u']); await pg.wait_for_timeout(200); ok(await pg.locator('.sheet [data-act="swap-open"]').count() == 1, 'the exercise menu has the swap too'); await pg.evaluate("document.querySelector('#scrim').click()"); await pg.wait_for_timeout(150)
                # finish: reps left are saved and feed the next target
                await pg.click('#wbar-fin'); await pg.wait_for_timeout(200); await pg.click('#wbar-fin'); await pg.wait_for_timeout(700)
                sess = [s for s in (await pg.evaluate(LS + ".sessions")).values() if s['date'] == datetime.date.today().isoformat()][0]
                ok([x.get('rir') for x in sess['entries'][0]['sets']] == [3] * items[0]['sets'], 'reps left are saved with each set')
                await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
                await pg.click('[data-tab="exercises"]'); await pg.wait_for_timeout(300); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(150); ok('Reps left in the tank: 3+, 3+, 3+' in await pg.locator('.hcard.open').inner_text(), 'and shown with the workout in History')
                await pg.click('[data-tab="log"]'); await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(400); u = await pg.evaluate(LS + ".draft.items[0].u")
                got = [float(await pg.get_attribute('#w-%s-0' % u, 'placeholder')), int(await pg.get_attribute('#r-%s-1' % u, 'placeholder'))]; hint = await pg.locator('#x-%s .last-hint' % u).last.inner_text()
                top = all(s['r'] >= items[0]['hi'] for s in prev[:items[0]['sets']])
                ok(got[0] == prev[0]['w'] + 2.5 and ('3 or more reps left' in hint or top), 'three or more left on every set raises the next target by 2.5 kg: %s' % hint)
                await pg.click('[data-act="discard"]'); await pg.wait_for_timeout(300)
                # ================= countdown =================
                await pg.click('[data-act="start"][data-key="day5"]'); await pg.wait_for_timeout(400)
                its = await pg.evaluate(LS + ".draft.items.map(i=>({u:i.u,ex:i.ex}))"); sp = [x for x in its if x['ex'] == 'side-plank'][0]['u']; ca = [x for x in its if x['ex'] == 'zone-2-cardio'][0]['u']
                ok(await pg.locator('#x-%s [data-act="timer"]' % sp).count() == 2 and await pg.locator('#x-%s [data-act="timer"]' % ca).count() == 1 and await pg.locator('#x-%s [data-act="timer"]' % its[1]['u']).count() == 0, 'holds and cardio get a countdown button, rep exercises do not')
                await pg.fill('#r-%s-0' % sp, '2'); await pg.click('#x-%s [data-act="timer"][data-i="0"]' % sp); await pg.wait_for_timeout(600)
                ok(await pg.locator('#rest').is_visible() and await pg.locator('#rest-l').inner_text() == 'Get ready' and await pg.locator('#rest [data-act="rest-skip"]').inner_text() == 'Stop', 'a hold starts with a five-second get-ready count')
                await shot('timer-ready'); await pg.wait_for_timeout(5000)
                ok('Side plank' in await pg.locator('#rest-l').inner_text(), 'then counts the hold down'); await shot('timer')
                await pg.wait_for_timeout(2300); row = await pg.evaluate(LS + ".draft.items.filter(i=>i.ex==='side-plank')[0].rows[0]")
                ok(row['d'] is True and row['r'] == '2' and await pg.evaluate(LS + ".draft.timer") is None, 'at zero the set is ticked with its seconds')
                await pg.evaluate("window.scrollTo(0, 0)")
                await pg.click('#x-%s [data-act="timer"][data-i="1"]' % sp); await pg.wait_for_timeout(1500); await pg.click('#rest [data-act="rest-skip"]'); await pg.wait_for_timeout(200)
                row = await pg.evaluate(LS + ".draft.items.filter(i=>i.ex==='side-plank')[0].rows[1]"); ok(not row['d'] and row['r'] == '', 'stopping during the get-ready count logs nothing')
                await pg.click('#x-%s [data-act="timer"][data-i="1"]' % sp); await pg.wait_for_timeout(5600); ok(re.match(r'^0:(2\d|30)$', await pg.locator('#rest-t').inner_text()) is not None, 'with nothing typed the hold counts down the bottom of the range, 30 s: %s' % await pg.locator('#rest-t').inner_text())
                await pg.wait_for_timeout(1700); await pg.click('#rest [data-act="rest-skip"]'); await pg.wait_for_timeout(250); row = await pg.evaluate(LS + ".draft.items.filter(i=>i.ex==='side-plank')[0].rows[1]"); ok(row['d'] is True and row['r'] in ('1', '2', '3'), 'stopping a hold early logs the seconds held (%s s)' % row['r'])
                await pg.click('#x-%s [data-act="timer"][data-i="0"]' % ca); await pg.wait_for_timeout(400)
                ok(await pg.locator('#rest-by').inner_text() == '1 min' and (await pg.locator('#rest-t').inner_text()).startswith('29:5') or (await pg.locator('#rest-t').inner_text()) == '30:00', 'cardio counts down its 30 minutes with no get-ready count: %s' % await pg.locator('#rest-t').inner_text())
                await shot('timer-cardio')
                await pg.reload(); await pg.wait_for_timeout(600); ok(await pg.locator('#rest').is_visible() and await pg.locator('#rest [data-act="rest-skip"]').inner_text() == 'Stop', 'the countdown survives closing and reopening the app')
                await pg.click('#rest [data-act="rest-skip"]'); await pg.wait_for_timeout(200); ok(await pg.locator('#rest').is_hidden(), 'Stop ends it')
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM); srv2.send_signal(signal.SIGTERM)
    print('page errors:', errs); print('FAILED: %d' % len(fails) if fails else 'ALL PASSED')
    for f in fails: print('  -', f)
asyncio.run(main())
