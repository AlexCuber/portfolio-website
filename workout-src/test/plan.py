import asyncio, json, sys, os, subprocess, time, signal
from playwright.async_api import async_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.abspath(__file__)); PORT = 8767
import importlib.util
spec = importlib.util.spec_from_file_location('run', os.path.join(ROOT, 'run.py'))
src = open(os.path.join(ROOT, 'run.py')).read()
ns = {'__file__': os.path.join(ROOT, 'run.py')}; exec(src.split('async def main(which)')[0], ns); V1 = ns['V1']; REAL = ns['REAL']
MOCK = src.split('MOCK = """')[1].split('"""')[0]
ok = True
def check(name, cond, extra=''):
    global ok; ok = ok and bool(cond); print(('PASS ' if cond else 'FAIL ') + name, extra)
async def main():
    for which in ('pwa', 'artifact'):
        srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', which), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
        try:
            async with async_playwright() as p:
                b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
                c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block')
                errs = []
                if which == 'pwa': await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(V1)))
                else: await c.add_init_script(MOCK % json.dumps({'sessions/' + REAL['id']: REAL}))
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(900 if which == 'artifact' else 400)
                async def names(sel='.card .list li .txt b'): return await pg.eval_on_selector_all(sel, 'els => els.map(e => e.textContent)')
                async def st(): return json.loads(await pg.evaluate("localStorage.getItem('workout-log-v1')"))
                print('==', which)
                check('next up follows the last workout (Upper A done, so Lower A)', 'Lower A' in (await pg.inner_text('.next-title')).title(), await pg.inner_text('.next-title'))
                check('no "Something else" heading', 'Something else' not in await pg.inner_text('#view'))
                await pg.click('[data-act="plan-edit"]'); await pg.wait_for_timeout(150)
                rows = await pg.eval_on_selector_all('.plan-row .txt b', 'els => els.map(e => e.textContent)')
                check('edit mode lists the five sessions in order', rows == ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Day 5 (optional)'], rows)
                # remove Lower A from the plan
                await pg.click('[data-act="plan-off"][data-key="lowerA"]'); await pg.wait_for_timeout(150)
                rows = await pg.eval_on_selector_all('.plan-row .txt b', 'els => els.map(e => e.textContent)')
                check('removed session moves under "Not in the plan"', rows == ['Upper A', 'Upper B', 'Lower B', 'Day 5 (optional)', 'Lower A'] and 'Not in the plan' in await pg.inner_text('#view'), rows)
                check('next up skips the removed session', 'Upper B' in (await pg.inner_text('.next-title')).title(), await pg.inner_text('.next-title'))
                # new session, lands last, then move it to second place
                await pg.click('.card [data-act="ed-new"]'); await pg.wait_for_timeout(200)
                await pg.fill('#ed-name', 'Arms and abs'); await pg.click('[data-act="ed-add"]'); await pg.wait_for_timeout(200)
                for ex in ['barbell-curl', 'skullcrusher', 'plank']:
                    await pg.click('[data-act="pick"][data-ex="%s"]' % ex); await pg.wait_for_timeout(100)
                await pg.click('[data-act="sheet-x"]'); await pg.click('[data-act="ed-save"]'); await pg.wait_for_timeout(250)
                rows = await pg.eval_on_selector_all('.plan-row .txt b', 'els => els.map(e => e.textContent)')
                check('new session is added at the end of the plan, edit mode stays open', rows[:5] == ['Upper A', 'Upper B', 'Lower B', 'Day 5 (optional)', 'Arms and abs'], rows)
                rid = [k for k, v in (await st())['routines'].items() if v.get('name') == 'Arms and abs'][0]
                for _ in range(3): await pg.click('[data-act="plan-up"][data-key="%s"]' % rid); await pg.wait_for_timeout(80)
                rows = await pg.eval_on_selector_all('.plan-row .txt b', 'els => els.map(e => e.textContent)')
                check('moved up three places to second', rows[:5] == ['Upper A', 'Arms and abs', 'Upper B', 'Lower B', 'Day 5 (optional)'], rows)
                check('next up is now the new session (it follows Upper A)', 'Arms And Abs' in (await pg.inner_text('.next-title')).title(), await pg.inner_text('.next-title'))
                s = await st(); check('order is saved', s['settings'].get('planOrder') == ['upperA', rid, 'upperB', 'lowerB', 'day5'], s['settings'].get('planOrder'))
                # bring Lower A back: goes last
                await pg.click('[data-act="plan-on"][data-key="lowerA"]'); await pg.wait_for_timeout(150)
                rows = await pg.eval_on_selector_all('.plan-row .txt b', 'els => els.map(e => e.textContent)')
                check('added back at the end', rows == ['Upper A', 'Arms and abs', 'Upper B', 'Lower B', 'Day 5 (optional)', 'Lower A'], rows)
                s = await st(); check('restored built-in is the original again', 'lowerA' not in s['routines'], list(s['routines'].keys()))
                # reload keeps it
                await pg.click('[data-act="plan-done"]'); await pg.wait_for_timeout(1300 if which == 'artifact' else 200)
                if which == 'artifact':
                    w = await pg.evaluate('JSON.stringify(window.__writes)'); keys = await pg.evaluate('JSON.stringify(Object.keys(window.__store))')
                    check('artifact: order and the new session reach Claude storage', 'state/settings' in w and ('routines/' + rid) in keys and 'routines/lowerA' not in keys, keys)
                    stt = await pg.evaluate("JSON.stringify(window.__store['state/settings'].settings.planOrder)"); print('   stored order', stt)
                else:
                    await pg.reload(); await pg.wait_for_timeout(400)
                    await pg.click('[data-act="plan-edit"]'); await pg.wait_for_timeout(250); lst = await names('.card .list .plan-row .txt b'); await pg.click('[data-act="plan-done"]'); await pg.wait_for_timeout(250); check('order survives a reload', lst[:6] == ['Upper A', 'Arms and abs', 'Upper B', 'Lower B', 'Day 5 (optional)', 'Lower A'], lst[:6])
                # muscle targets follow the plan: abs target = 6 (plan) + 3 (plank in the new session)
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(300)
                txt = await pg.inner_text('.mus'); flat = ' '.join(txt.split())
                check('muscle targets follow the plan (abs 6 + 3, biceps 12 + 3)', 'Abs 0 / 9' in flat and '/ 15' in flat, flat[:200])
                # remove the own session, then delete it for good (two taps)
                await pg.click('[data-tab="log"]'); await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="plan-off"][data-key="%s"]' % rid); await pg.wait_for_timeout(120)
                await pg.click('[data-act="plan-del"][data-key="%s"]' % rid); await pg.wait_for_timeout(120)
                check('delete asks for a second tap', (await pg.inner_text('[data-act="plan-del"][data-key="%s"]' % rid)) == 'Tap again')
                await pg.click('[data-act="plan-del"][data-key="%s"]' % rid); await pg.wait_for_timeout(200)
                s = await st(); check('own session deleted for good', rid not in s['routines'] and 'Arms and abs' not in await pg.inner_text('#view'))
                # the editor's remove button
                await pg.click('[data-act="plan-done"]'); await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="ed-open"][data-key="day5"]'); await pg.wait_for_timeout(200)
                await pg.click('[data-act="ed-remove"]'); await pg.wait_for_timeout(200)
                rows = await pg.eval_on_selector_all('.plan-row .txt b', 'els => els.map(e => e.textContent)')
                check('editor: "Remove from the plan" keeps the session under Not in the plan', rows == ['Upper A', 'Upper B', 'Lower B', 'Lower A', 'Day 5 (optional)'] and await pg.query_selector('[data-act="plan-on"][data-key="day5"]') is not None, rows)
                check('history kept', len((await st())['sessions']) == 1)
                check('no page errors', not errs, errs)
                await b.close()
        finally: srv.send_signal(signal.SIGTERM); time.sleep(0.3)
    print('ALL PASS' if ok else 'SOME FAILED')
asyncio.run(main())
