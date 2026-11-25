"""A failed save is announced and an unreadable log is never overwritten (U1, U2)."""
import json, sys, os, subprocess, time, datetime, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__)); SH = os.path.join(ROOT, '..', 'shots'); PORT = 8791
PLAN = json.load(open(os.path.join(ROOT, '..', 'src', 'plan.json')))
exec('def seed' + open(os.path.join(ROOT, 'look.py')).read().split('def seed')[1].split('async def main')[0])
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)
LS = 'workout-log-v1'; RES = 'hitit-rescue-v1'
def run(kind, port):
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=os.path.join(ROOT, '..', 'dist', kind), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.8); errs = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=__import__('_env').CHROME, args=['--no-sandbox'])
            good = seed(); good['settings'] = {'setupDone': True}; goodText = json.dumps(good)
            def page(text, wait=600):
                c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers='block', locale='en-GB')
                if text is not None: c.add_init_script("if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('%s', %s)}" % (LS, json.dumps(text)))
                pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.goto('http://127.0.0.1:%d/index.html' % port); pg.wait_for_timeout(wait)
                return c, pg
            get = lambda pg, k=LS: pg.evaluate("localStorage.getItem('%s')" % k)
            lost = lambda pg: pg.locator('text=Your log could not be opened').count() == 1
            settle = 600 if kind == 'pwa' else 4300
            print('== %s ==' % kind)
            # a healthy log opens as before
            c, pg = page(goodText, settle); ok(not lost(pg) and pg.locator('.btn.start').count() == 1, 'a healthy log opens on Train')
            ok(pg.locator('#savewarn').is_hidden(), 'no warning while saving works'); c.close()
            # nothing stored, an empty object or null: first run, as before
            for t, name in [(None, 'nothing stored'), ('{}', 'an empty object'), ('null', 'the text null')]:
                c, pg = page(t, settle); ok(not lost(pg) and pg.locator('text=Three choices and you are ready').count() == 1, '%s gives the first-run screen' % name); c.close()
            # unreadable text and readable text that is not a log both stop the app from writing
            broken = goodText[:len(goodText) // 2]
            for t, name in [(broken, 'a log cut off half-way'), ('{"foo":1}', 'text that is not a log'), ('[1,2]', 'a list'), ('hello', 'plain words')]:
                c, pg = page(t, settle)
                ok(lost(pg), '%s shows "Your log could not be opened"' % name)
                ok(pg.evaluate("getComputedStyle(document.querySelector('.tabs')).display") == 'none', '   the tabs are hidden')
                pg.locator('[data-act="settings"]').first.tap(); pg.wait_for_timeout(300)
                sw = pg.locator('.sheet [role="switch"], .sheet .seg button').first
                if sw.count(): sw.tap(); pg.wait_for_timeout(300)
                pg.keyboard.press('Escape'); pg.wait_for_timeout(1200)
                ok(get(pg) == t, '   the stored text is untouched after using settings')
                if t is broken: pg.screenshot(path=os.path.join(SH, 'SAFE-lost-%s.png' % kind))
                c.close()
            # Try again reloads and still leaves it alone
            c, pg = page(broken, settle); pg.locator('[data-act="lost-retry"]').tap(); pg.wait_for_timeout(settle + 300)
            ok(lost(pg) and get(pg) == broken, 'Try again reloads without touching the log'); c.close()
            # Start a new log needs two taps and keeps the old text under the rescue key
            c, pg = page(broken, settle); pg.locator('[data-act="lost-new"]').tap(); pg.wait_for_timeout(250)
            ok(lost(pg) and get(pg) == broken and pg.locator('text=Tap again to start a new log').count() == 1, 'one tap on Start a new log only asks again')
            pg.locator('[data-act="lost-new"]').tap(); pg.wait_for_timeout(400)
            ok(not lost(pg) and pg.locator('text=Three choices and you are ready').count() == 1, 'the second tap gives the first-run screen')
            ok(get(pg, RES) == broken, '   the unreadable text is kept under the rescue key')
            now = get(pg); ok(now != broken and json.loads(now).get('sessions') == {}, '   and a new, readable log is stored'); c.close()
            # restoring a backup from the screen
            c, pg = page(broken, settle)
            bk = {'app': 'workout-log', 'v': 2, 'sessions': good['sessions'], 'body': good.get('body', {}), 'routines': {}, 'custom': {}, 'settings': {'unit': 'kg'}}
            pg.set_input_files('#backup-file', files=[{'name': 'b.json', 'mimeType': 'application/json', 'buffer': json.dumps(bk).encode()}]); pg.wait_for_timeout(700)
            ok(not lost(pg) and pg.locator('.btn.start').count() == 1, 'Restore from a backup file opens the restored log')
            ok(get(pg, RES) == broken and len(json.loads(get(pg))['sessions']) == len(good['sessions']), '   the unreadable text is kept and the restored log is saved'); c.close()
            # a file that is not a backup changes nothing
            c, pg = page(broken, settle)
            pg.set_input_files('#backup-file', files=[{'name': 'b.json', 'mimeType': 'application/json', 'buffer': b'nope'}]); pg.wait_for_timeout(500)
            ok(lost(pg) and get(pg) == broken and get(pg, RES) is None, 'a file that is not a backup changes nothing'); c.close()
            # saving fails: the warning appears, stays, and goes when saving works again
            c, pg = page(goodText, settle)
            pg.evaluate("(function () { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === '%s') throw new DOMException('full', 'QuotaExceededError'); return window.__set.call(this, k, v); }; })()" % LS)
            pg.locator('.tab[data-tab="progress"]').tap(); pg.wait_for_timeout(300)
            ok(pg.locator('#savewarn').is_visible(), 'a failed save shows the warning')
            pg.locator('.tab[data-tab="log"]').tap(); pg.wait_for_timeout(300)
            ok(pg.locator('#savewarn').is_visible(), '   it stays while saving keeps failing')
            pg.locator('[data-act="save-retry"]').tap(); pg.wait_for_timeout(250)
            ok(pg.locator('#savewarn').is_visible() and 'Still not saved' in pg.locator('#toast').inner_text(), '   Try again says it is still not saved')
            box = pg.locator('#savewarn').bounding_box(); ok(all(bb['height'] >= 44 for bb in [pg.locator('#savewarn button').nth(i).bounding_box() for i in range(2)]), '   both buttons are 44 px tall')
            pg.screenshot(path=os.path.join(SH, 'SAFE-warn-%s.png' % kind))
            pg.evaluate("(function () { Storage.prototype.setItem = window.__set; })()")
            pg.locator('[data-act="save-retry"]').tap(); pg.wait_for_timeout(250)
            ok(pg.locator('#savewarn').is_hidden() and pg.locator('#toast').inner_text() == 'Saved', '   and goes once a save works')
            c.close(); b.close()
    finally:
        srv.terminate()
    ok(not errs, 'no page errors %s' % errs[:2])
run('pwa', PORT); run('artifact', PORT + 1)
print('FAILS:', len(fails)); sys.exit(1 if fails else 0)
