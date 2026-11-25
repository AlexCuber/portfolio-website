import asyncio, json, sys, os, subprocess, time, signal, re, datetime
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8766
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
def seed(weeks=11):
    today = datetime.date.today(); ws = today - datetime.timedelta(days=today.weekday()); start = ws - datetime.timedelta(days=7 * (weeks - 1))
    day_of = {'upperA': 0, 'lowerA': 1, 'upperB': 3, 'lowerB': 4}; sessions = {}; body = {}
    for w in range(weeks):
        for k, off in day_of.items():
            d = start + datetime.timedelta(days=w * 7 + off)
            if d >= today or (w == 3 and k == 'lowerB') or (w == 6 and k in ('upperB', 'lowerB')) or (w == 8 and k == 'lowerA'): continue
            entries = []
            for i, ex in enumerate(PLAN['sessions'][k]['exercises']):
                m = re.findall(r'\d+', ex['reps']); lo, hi = int(m[0]), int(m[-1]); span = hi - lo + 1; step = w % (span + 1); bump = w // (span + 1)
                base = 12 + (sum(map(ord, ex['id'])) % 13) * 5; wgt = round(base * (1.05 ** bump) / 2.5) * 2.5; top = min(hi, lo + step)
                sets = [{'w': wgt, 'r': max(lo - 1, top - (1 if j > 0 else 0) - (1 if j > 1 and step < 2 else 0))} for j in range(ex['sets'])]
                entries.append({'n': ex['n'], 'ex': ex['id'], 'name': ex['name'], 'note': '', 'sets': sets})
            sid = 's%02d%s' % (w, k); t = int(time.mktime(d.timetuple())) * 1000 + 17 * 3600000; dur = (58 + (w * 7 + len(k) * 3) % 13) * 60
            sessions[sid] = {'id': sid, 'key': k, 'name': PLAN['sessions'][k]['name'], 'date': d.isoformat(), 'startedAt': t, 'finishedAt': t + dur * 1000, 'dur': dur, 'entries': entries, 'notes': '', 'updatedAt': t, 'v': 1}
        if w == 9:
            d = start + datetime.timedelta(days=w * 7 + 5); sessions['x9'] = {'id': 'x9', 'key': 'day5', 'name': 'Day 5 (optional)', 'date': d.isoformat(), 'startedAt': 1, 'finishedAt': 2, 'dur': 1800, 'entries': [{'n': '1', 'ex': 'cable-lateral-raise', 'name': 'Cable lateral raise', 'note': '', 'sets': [{'w': 5, 'r': 14}] * 3}], 'notes': '', 'updatedAt': 1, 'v': 1}
    for i in range(26):
        d = start + datetime.timedelta(days=round(i * 2.9))
        if d > today: break
        body[d.isoformat()] = {'date': d.isoformat(), 'weight': round(75 + i * 0.07 + ((i * 7) % 5 - 2) * 0.14, 1), 'waist': round(82 - i * 0.04, 1)}
    return {'sessions': sessions, 'body': body, 'draft': None, 'draftAt': 0, 'dirty': {}, 'ui': {'tab': 'log', 'ex': None}}
async def main(only=None):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8)
    errs = []
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            for scheme in ('light', 'dark'):
                if only and scheme != only: continue
                c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme, has_touch=True, is_mobile=True, service_workers='block')
                await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(seed())))
                pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(250)
                pre = 'L-' if scheme == 'light' else 'D-'
                async def shot(name): await pg.screenshot(path=os.path.join(SH, pre + name + '.png'))
                async def scroll(y): await pg.evaluate('window.scrollTo(0,%d)' % y); await pg.wait_for_timeout(120)
                await shot('home-anim'); await pg.wait_for_timeout(1900); await shot('home'); await scroll(700); await shot('home2')
                await pg.click('[data-tab="progress"]'); await pg.wait_for_timeout(350); await shot('prog-anim'); await pg.wait_for_timeout(1700); await shot('prog1')
                for i, y in enumerate((620, 1300, 1950, 2600)): await scroll(y); await shot('prog%d' % (i + 2))
                await pg.click('[data-act="mus-win"][data-v="four"]'); await pg.wait_for_timeout(1500); await shot('prog-four'); await pg.click('[data-act="mus-win"][data-v="week"]')
                await scroll(0); await pg.click('[data-act="prog"][data-v="lifts"]'); await pg.wait_for_timeout(1900); await shot('lifts'); await scroll(650); await shot('lifts2')
                await scroll(0); await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(1900); await shot('body')
                await pg.click('[data-tab="exercises"]'); await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.wait_for_timeout(400); await shot('lib')
                await pg.click('[data-act="lib"][data-key="Chest"]'); await pg.wait_for_timeout(300)
                await pg.click('[data-act="open-ex"][data-ex="cable-fly"]'); await pg.wait_for_timeout(500); await shot('ex'); await pg.click('[data-act="sheet-x"]')
                await pg.click('[data-tab="log"]'); await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(400); await shot('work0')
                us = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items.map(i=>i.u)")
                await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % us[0]); await pg.wait_for_timeout(300)
                await pg.fill('#w-%s-1' % us[0], '95'); await pg.fill('#r-%s-1' % us[0], '9'); await pg.click('[data-act="tick"][data-u="%s"][data-i="1"]' % us[0]); await pg.wait_for_timeout(450); await shot('work-rec')
                await pg.wait_for_timeout(3300); await pg.fill('#w-%s-2' % us[0], '95'); await pg.fill('#r-%s-2' % us[0], '9'); await pg.click('[data-act="tick"][data-u="%s"][data-i="2"]' % us[0]); await pg.wait_for_timeout(500); await shot('work-rec2')
                await pg.wait_for_timeout(3200); await shot('work-quiet')
                await scroll(520); await shot('work-chips'); await scroll(0)
                await pg.click('#wbar-fin'); await pg.wait_for_timeout(200); await pg.click('#wbar-fin'); await pg.wait_for_timeout(900); await shot('summary')
                await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(300)
                await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(400); await shot('settings')
                await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200); await scroll(560)
                await pg.click('[data-act="plan-edit"]'); await pg.wait_for_timeout(250); await shot('plan-edit')
                await pg.click('[data-act="plan-off"][data-key="day5"]'); await pg.click('[data-act="plan-down"][data-key="upperA"]'); await pg.click('[data-act="plan-down"][data-key="upperA"]'); await pg.wait_for_timeout(250); await shot('plan-edit2')
                print(scheme, 'plan after edit:', await pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('workout-log-v1')).settings.planOrder)"))
                await scroll(0); await shot('home-after-plan')
                await c.close()
            await b.close()
    finally: srv.send_signal(signal.SIGTERM)
    print('errors', errs)
asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else None))
