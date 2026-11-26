import asyncio, json, sys, os, subprocess, time, signal
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8765
REAL = {"date":"2026-11-16","entries":[{"ex":"incline-dumbbell-press","n":"1","name":"Incline dumbbell press","note":"","sets":[{"r":16,"w":16},{"r":12,"w":20},{"r":11,"w":22},{"r":8,"w":24}]},{"ex":"chest-supported-row","n":"2","name":"Chest-supported row","note":"","sets":[{"r":14,"w":14},{"r":12,"w":18},{"r":11,"w":20}]},{"ex":"lat-pulldown","n":"3","name":"Lat pulldown","note":"No thumb support. Start vertical, incline backwards during exercise","sets":[{"r":11,"w":45},{"r":10,"w":45},{"r":10,"w":45}]},{"ex":"pec-deck","n":"4","name":"Pec deck","note":"Position 1","sets":[{"r":15,"w":59},{"r":13,"w":66},{"r":12,"w":66}]},{"ex":"cable-lateral-raise","n":"5","name":"Cable lateral raise","note":"","sets":[{"r":14,"w":3.3},{"r":11,"w":3.3},{"r":12,"w":3.3}]},{"ex":"overhead-cable-triceps-extension","n":"6a","name":"Overhead cable triceps extension","note":"","sets":[{"r":14,"w":17},{"r":14,"w":17},{"r":12,"w":19.3}]},{"ex":"incline-dumbbell-curl","n":"6b","name":"Incline dumbbell curl","note":"","sets":[{"r":12,"w":10},{"r":11,"w":10},{"r":11,"w":10}]}],"finishedAt":1794919724870,"id":"smwj1kym7z1c1","key":"upperA","name":"Upper A","notes":"","startedAt":1794820159808,"updatedAt":1794919724870,"v":1}
V1 = {"sessions": {REAL["id"]: REAL}, "body": {}, "draft": None, "draftAt": 0, "dirty": {}, "ui": {"tab": "log", "ex": None, "guide": "all"}}
errors = []
async def tab(pg, name):
    if await pg.is_visible('#wbar [data-act="wmin"]'): await pg.click('#wbar [data-act="wmin"]'); await pg.wait_for_timeout(150)
    await pg.click('[data-tab="%s"]' % name)
async def main(which):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', 'artifact' if which == 'sync' else 'pwa'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            async def ctx(scheme='light', seed=V1):
                c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, color_scheme=scheme, has_touch=True, is_mobile=True, service_workers='block')
                if seed is not None: await c.add_init_script("if(!localStorage.getItem('workout-log-v1')) localStorage.setItem('workout-log-v1', %s)" % json.dumps(json.dumps(seed)))
                pg = await c.new_page()
                pg.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
                pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
                await pg.goto('http://127.0.0.1:%d/index.html' % PORT); await pg.wait_for_timeout(500)
                return c, pg
            async def shot(pg, name, full=True): await pg.screenshot(path=os.path.join(SH, name + '.png'), full_page=full)
            await FLOWS[which](ctx, shot)
            await b.close()
    finally:
        srv.send_signal(signal.SIGTERM)
    print('ERRORS:', len(errors)); [print('  ', e) for e in errors[:30]]

async def op(pg, u):
    """opens an exercise that is folded to a line"""
    b = pg.locator('button#x-%s' % u)
    if await b.count(): await b.click(); await pg.wait_for_timeout(350)
async def flow_basic(ctx, shot):
    c, pg = await ctx()
    await shot(pg, 't-home')
    await pg.click('[data-act="start"][data-key="lowerA"]'); await pg.wait_for_timeout(300)
    await shot(pg, 't-draft0', full=False)
    # type a set and tick
    it = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items.map(i=>i.u)")
    await pg.fill('#w-%s-0' % it[0], '80'); await pg.fill('#r-%s-0' % it[0], '8'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % it[0]); await pg.wait_for_timeout(400)
    await pg.fill('#w-%s-1' % it[0], '80'); await pg.fill('#r-%s-1' % it[0], '7'); await pg.click('[data-act="tick"][data-u="%s"][data-i="1"]' % it[0]); await pg.wait_for_timeout(400)
    await shot(pg, 't-draft1', full=False)
    await shot(pg, 't-draft-full')
    # add exercise
    await pg.click('[data-act="add-ex"]'); await pg.wait_for_timeout(300); await shot(pg, 't-picker', full=False)
    await pg.fill('#pick-q', 'squat'); await pg.wait_for_timeout(200); await shot(pg, 't-picker-q', full=False)
    await pg.click('[data-act="pick"][data-ex="goblet-squat"]'); await pg.wait_for_timeout(500); await shot(pg, 't-added', full=False)
    # menu
    await pg.click('[data-act="ex-menu"] >> nth=0'); await pg.wait_for_timeout(300); await shot(pg, 't-menu', full=False)
    await pg.click('[data-act="open-ex"] >> nth=-1'); await pg.wait_for_timeout(300); await shot(pg, 't-exsheet', full=False)
    await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
    # other tabs during workout
    await tab(pg, 'progress'); await pg.wait_for_timeout(300); await shot(pg, 't-prog-overview')
    await pg.click('[data-act="prog"][data-v="lifts"]'); await pg.wait_for_timeout(300); await shot(pg, 't-prog-lifts')
    await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(300); await shot(pg, 't-prog-body')
    await tab(pg, 'exercises'); await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.wait_for_timeout(300); await shot(pg, 't-lib', full=False)
    await pg.click('[data-act="lib"][data-key="mine"]'); await pg.wait_for_timeout(300); await shot(pg, 't-lib-mine', full=False)
    await pg.click('#wmini'); await pg.wait_for_timeout(300)
    # finish (armed)
    await pg.click('#wbar-fin'); await pg.wait_for_timeout(200); await pg.click('#wbar-fin'); await pg.wait_for_timeout(700)
    await shot(pg, 't-summary', full=False)
    await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(300); await shot(pg, 't-home2')
    print(await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('workout-log-v1'));return JSON.stringify({n:Object.keys(s.sessions).length,draft:s.draft,keys:Object.values(s.sessions).map(x=>[x.key,x.dur,x.entries.length])})})()"))
    await c.close()

async def flow_editor(ctx, shot):
    c, pg = await ctx('dark')
    await shot(pg, 'd-home')
    await pg.click('[data-act="ed-new"]'); await pg.wait_for_timeout(300)
    await pg.fill('#ed-name', 'Push day'); await pg.click('[data-act="ed-add"]'); await pg.wait_for_timeout(300)
    for ex in ['barbell-bench-press', 'overhead-press', 'cable-fly', 'skullcrusher', 'treadmill-run']:
        await pg.click('[data-act="pick"][data-ex="%s"]' % ex); await pg.wait_for_timeout(120)
    await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-editor')
    await pg.click('[data-act="ed-save"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-home2')
    await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="ed-open"][data-key="upperA"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-editor-builtin')
    await pg.click('[data-act="ed-cancel"]'); await pg.wait_for_timeout(200)
    await pg.click('[data-act="settings"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-settings', full=False)
    await pg.click('[data-act="theme"][data-v="light"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-settings-light', full=False)
    await pg.click('[data-act="theme"][data-v="auto"]'); await pg.click('[data-act="sheet-x"]')
    # start custom and tick with placeholder + PR
    await pg.click('[data-act="plan-done"]'); await pg.click('[data-act="start"][data-key="upperA"]'); await pg.wait_for_timeout(300)
    it = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items.map(i=>i.u)")
    await pg.fill('#w-%s-0' % it[0], '30'); await pg.fill('#r-%s-0' % it[0], '9'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % it[0]); await pg.wait_for_timeout(350)
    await pg.click('[data-act="tick"][data-u="%s"][data-i="1"]' % it[0]); await pg.wait_for_timeout(350)
    await shot(pg, 'd-draft', full=False)
    await pg.click('[data-act="clock"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-clock', full=False); await pg.click('[data-act="sheet-x"]')
    await tab(pg, 'progress'); await pg.wait_for_timeout(300); await shot(pg, 'd-prog')
    await tab(pg, 'exercises'); await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-act="lib"][data-key="Back"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-lib-back')
    await pg.click('[data-act="open-ex"][data-ex="deadlift"]'); await pg.wait_for_timeout(300); await shot(pg, 'd-ex', full=False)
    await c.close()

async def flow_migrate(ctx, shot):
    seed = json.loads(json.dumps(V1))
    seed['draft'] = {"id": "sdraft1", "key": "lowerA", "date": "2026-11-17", "startedAt": int(time.time()*1000) - 1500000, "notes": "", "editing": False,
                     "e": {"1": {"note": "seat 4", "sets": [{"w": "80", "r": "8", "d": True}, {"w": "80", "r": "", "d": False}, {"w": "", "r": "", "d": False}]}, "2": {"note": "", "sets": [{"w": "", "r": "", "d": False}] * 3},
                           "3": {"note": "", "sets": [{"w": "", "r": "", "d": False}] * 3}, "4": {"note": "", "sets": [{"w": "", "r": "", "d": False}] * 3}, "5a": {"note": "", "sets": [{"w": "", "r": "", "d": False}] * 3}, "5b": {"note": "", "sets": [{"w": "", "r": "", "d": False}] * 3}}}
    c, pg = await ctx('light', seed)
    await shot(pg, 'm-draft', full=False)
    print(await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('workout-log-v1'));return JSON.stringify({items:(s.draft&&s.draft.items||[]).map(i=>[i.n,i.ex,i.note,i.rows.length,i.rows[0]])})})()"))
    await c.close()
    c, pg = await ctx('light', None)   # brand new user
    await shot(pg, 'n-setup'); await pg.click('[data-act="setup-go"]'); await pg.wait_for_timeout(300)
    await shot(pg, 'n-home')
    await tab(pg, 'progress'); await pg.wait_for_timeout(300); await shot(pg, 'n-prog')
    await pg.click('[data-act="prog"][data-v="lifts"]'); await pg.wait_for_timeout(300); await shot(pg, 'n-lifts')
    await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(300); await shot(pg, 'n-body')
    await tab(pg, 'log'); await pg.click('[data-act="start"][data-key="free"]'); await pg.wait_for_timeout(300); await shot(pg, 'n-free', full=False)
    await c.close()

MOCK = """
(function(){ var store = %s; window.__store = store; window.__writes = [];
  function snap(col){ return { docs: Object.keys(store).filter(function(k){return k.indexOf(col+'/')===0 && k.split('/').length===2;}).map(function(k){ return { id:k.split('/')[1], data:function(){return JSON.parse(JSON.stringify(store[k]));} }; }) }; }
  var db = { doc:function(p){ return { get:function(){ return Promise.resolve({ exists: !!store[p], data:function(){ return JSON.parse(JSON.stringify(store[p])); } }); }, set:function(v){ store[p]=JSON.parse(JSON.stringify(v)); window.__writes.push(['set',p]); return Promise.resolve(); }, delete:function(){ delete store[p]; window.__writes.push(['del',p]); return Promise.resolve(); } }; },
             collection:function(c){ return { limit:function(){ return { get:function(){ return Promise.resolve(snap(c)); } }; } }; } };
  window.claude = { use:function(n){ return new Promise(function(res){ setTimeout(function(){ res(n==='db'?db:null); }, 150); }); } };
})();
"""
async def flow_sync(ctx, shot):
    # the artifact as the user has it today: one saved workout in Claude's storage, nothing in this browser
    remote = {'sessions/' + REAL['id']: REAL}
    c, pg = await ctx('light', None)
    await c.add_init_script(MOCK % json.dumps(remote))
    await pg.reload(); await pg.wait_for_timeout(900)
    print('sync label:', await pg.inner_text('#sync-t'))
    txt = await pg.inner_text('#view'); print('has Upper A last done:', 'last done Mon 16 Nov' in txt)
    await shot(pg, 's-home')
    # new session, custom exercise, empty workout, body entry
    await tab(pg, 'exercises'); await pg.click('[data-act="lib3"][data-v="exercises"]'); await pg.click('[data-act="create-ex"]'); await pg.wait_for_timeout(200)
    await pg.fill('#cx-name', 'Landmine press'); await pg.select_option('#cx-group', 'Shoulders'); await pg.click('[data-act="cx-save"]'); await pg.wait_for_timeout(300)
    await pg.fill('#lib-q', 'landmine'); await pg.wait_for_timeout(200); await shot(pg, 's-lib-custom', full=False)
    await tab(pg, 'log'); await pg.click('[data-act="start"][data-key="free"]'); await pg.wait_for_timeout(300)
    await pg.fill('#draft-name', 'Shoulder blast'); await pg.click('[data-act="add-ex"]'); await pg.fill('#pick-q', 'landmine'); await pg.wait_for_timeout(200)
    await pg.click('.lib-row[data-act="pick"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-act="add-ex"]'); await pg.click('[data-act="pick-group"][data-key="Cardio"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="pick"][data-ex="rowing-machine"]'); await pg.wait_for_timeout(300)
    await pg.click('[data-act="add-ex"]'); await pg.click('[data-act="pick"][data-ex="plank"]'); await pg.wait_for_timeout(300)
    us = await pg.evaluate("JSON.parse(localStorage.getItem('workout-log-v1')).draft.items.map(i=>i.u)")
    await op(pg, us[0]); await pg.fill('#w-%s-0' % us[0], '20'); await pg.fill('#r-%s-0' % us[0], '10'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % us[0])
    await op(pg, us[1]); await pg.fill('#r-%s-0' % us[1], '12'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % us[1])
    await op(pg, us[2]); await pg.fill('#r-%s-0' % us[2], '45'); await pg.click('[data-act="tick"][data-u="%s"][data-i="0"]' % us[2]); await pg.wait_for_timeout(300)
    await shot(pg, 's-free')
    await pg.evaluate("(()=>{})()")
    await pg.click('[data-act="finish-now"]'); await pg.wait_for_timeout(600); await shot(pg, 's-summary', full=False)
    await pg.click('[data-act="sum-save"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(200)
    await tab(pg, 'progress'); await pg.click('[data-act="prog"][data-v="body"]'); await pg.wait_for_timeout(200)
    await pg.fill('#bw-weight', '80.4'); await pg.fill('#bw-waist', '84'); await pg.click('#body-form button[type=submit]'); await pg.wait_for_timeout(300)
    await pg.click('[data-act="goal-open"]'); await pg.wait_for_timeout(200)
    await pg.fill('#set-goalw', '85'); await pg.dispatch_event('#set-goalw', 'change'); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(300)
    await shot(pg, 's-body')
    # edit a built-in session, then start it; open a saved workout, edit and save it
    await tab(pg, 'log'); await pg.click('[data-act="plan-edit"]'); await pg.click('[data-act="ed-open"][data-key="upperA"]'); await pg.wait_for_timeout(200)
    await pg.click('[data-act="ed-sets"][data-i="0"][data-d="1"]'); await pg.click('[data-act="ed-del"][data-i="4"]'); await pg.click('[data-act="ed-save"]'); await pg.wait_for_timeout(300)
    await tab(pg, 'exercises'); await pg.click('[data-act="lib3"][data-v="history"]'); await pg.wait_for_timeout(200); await pg.click('.hcard .hc-head >> nth=0'); await pg.wait_for_timeout(150); await pg.click('.hcard.open [data-act="open-session"]'); await pg.wait_for_timeout(200); await shot(pg, 's-session', full=False)
    await pg.click('[data-act="edit-session"]'); await pg.wait_for_timeout(300); await shot(pg, 's-edit')
    await pg.click('[data-act="finish-now"]'); await pg.wait_for_timeout(500); await pg.click('[data-act="sheet-x"]'); await pg.wait_for_timeout(2800)
    print('sync label end:', await pg.inner_text('#sync-t'))
    print('writes:', await pg.evaluate("JSON.stringify(window.__writes.map(w=>w.join(' ')))"))
    print('store keys:', await pg.evaluate("JSON.stringify(Object.keys(window.__store).sort())"))
    print('real session kept:', await pg.evaluate("JSON.stringify((s=>[s.entries.length,s.entries[0].sets.length,s.key,s.dur])(window.__store['sessions/smwj1kym7z1c1']))"))
    await pg.click('[data-act="settings"]'); await pg.click('[data-act="backup-show"]'); await pg.wait_for_timeout(200)
    bk = await pg.input_value('#backup-text'); print('backup bytes', len(bk)); await pg.click('[data-act="sheet-x"]')
    await c.close()
    # restore that backup into an empty home-screen style browser
    c, pg = await ctx('dark', None)
    await pg.click('[data-act="settings"]'); await pg.click('[data-act="backup-show"]'); await pg.fill('#backup-text', bk); await pg.click('[data-act="backup-restore"]'); await pg.wait_for_timeout(400)
    await shot(pg, 's-restored')
    await c.close()

FLOWS = {'sync': flow_sync, 'basic': flow_basic, 'editor': flow_editor, 'migrate': flow_migrate}
asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'basic'))
