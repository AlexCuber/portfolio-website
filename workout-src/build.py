#!/usr/bin/env python3
"""Builds dist/artifact (the Claude artifact) and dist/pwa (the home-screen app) from src/."""
import json, re, shutil, os, hashlib, sys
R = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(R, 'src'); D = os.path.join(R, 'dist')
def rd(n): return open(os.path.join(S, n), encoding='utf-8').read()
plan = json.load(open(os.path.join(S, 'plan.json'), encoding='utf-8'))
js = 'window.PLAN_DATA = ' + json.dumps(plan, ensure_ascii=False, separators=(',', ':')) + ';\n'
for n in ['illo-engine.js', 'illo-poses.js', 'illo-poses2.js', 'illo-poses3.js', 'library.js', 'app-1-core.js', 'app-1b-coach.js', 'app-1c-setup.js', 'app-1d-endurance.js', 'app-2-views.js', 'app-2b-more.js', 'app-2c-helpers.js', 'app-2d-endurance.js', 'app-3-events.js']:
    js += rd(n).replace("if (typeof module !== 'undefined') module.exports = ILLO;", '').replace("if (typeof module !== 'undefined') module.exports = LIBRARY;", '') + '\n'
css = rd('app.css')
m = re.search(r'/\*@DARK\{\*/(.*?)/\*\}@DARK\*/', css, re.S); dark = m.group(1).strip('\n')
blocks = ('@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]):not([data-app-theme="light"]) {\n' + dark + '\n  }\n}\n'
          ':root[data-theme="dark"]:not([data-app-theme="light"]) {\n' + dark + '\n}\n:root[data-app-theme="dark"] {\n' + dark + '\n}')
css = css[:m.start()] + blocks + css[m.end():]
# extra colour themes: token overrides for light, and for each of the three ways dark can be on
pals = json.load(open(os.path.join(S, 'palettes.json'), encoding='utf-8')); pcss = ''
def _vars(v): return ''.join('  --%s: %s;\n' % kv for kv in v.items())
for name, p in pals.items():
    sel = ':root[data-palette="%s"]' % name
    pcss += '%s {\n%s}\n' % (sel, _vars(p['light']))
    pcss += '@media (prefers-color-scheme: dark) {\n%s:not([data-theme="light"]):not([data-app-theme="light"]) {\n%s}\n}\n' % (sel, _vars(p['dark']))
    pcss += '%s[data-theme="dark"]:not([data-app-theme="light"]) {\n%s}\n%s[data-app-theme="dark"] {\n%s}\n' % (sel, _vars(p['dark']), sel, _vars(p['dark']))
assert '/*@PALETTES*/' in css; css = css.replace('/*@PALETTES*/', pcss)
tpl = rd('index.tpl.html')
FONT_FACES = ('@font-face { font-family: "Big Shoulders Display"; src: url("fonts/big-shoulders.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }\n'
              '@font-face { font-family: "Figtree"; src: url("fonts/figtree.woff2") format("woff2"); font-weight: 300 900; font-display: swap; }')
# the artifact loads the same two families from Google Fonts; "opsz" 72 selects the display cut of the newer Big Shoulders family
ART_FONTS = 'html { font-variation-settings: "opsz" 72; }'
ART_HEAD = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,500..900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">'''
# the two font files are kept in fonts/ (copied once from the @fontsource-variable packages; licence in src/OFL.txt)
fonts = {'big-shoulders.woff2': 'fonts/big-shoulders.woff2', 'figtree.woff2': 'fonts/figtree.woff2'}
PWA_HEAD = '''<meta name="description" content="A gym logbook: log sets, time your workout and track progress. Works offline.">
<meta name="robots" content="noindex">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Hitit">
<meta name="apple-mobile-web-app-status-bar-style" content="default">'''
for kind in ['artifact', 'pwa']:
    out = os.path.join(D, kind); shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    html = tpl.replace('<!--PWA_HEAD-->', PWA_HEAD if kind == 'pwa' else ART_HEAD).replace('<!--PWA_FLAG-->', '<script>window.WL_STANDALONE = true;</script>' if kind == 'pwa' else '')
    html = re.sub(r'\n\n+', '\n', html)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(out, 'app.css'), 'w', encoding='utf-8').write(css.replace('/*@FONTS*/', FONT_FACES if kind == 'pwa' else ART_FONTS))
    open(os.path.join(out, 'app.js'), 'w', encoding='utf-8').write(js)
    if kind == 'pwa':
        os.makedirs(os.path.join(out, 'fonts'))
        for k, v in fonts.items(): shutil.copy(os.path.join(R, v), os.path.join(out, 'fonts', k))
        os.makedirs(os.path.join(out, 'icons'))
        for f in os.listdir(os.path.join(R, 'icons')):
            if f.endswith('.png'): shutil.copy(os.path.join(R, 'icons', f), os.path.join(out, 'icons', f))
        shutil.copy(os.path.join(S, 'OFL.txt'), os.path.join(out, 'fonts', 'OFL.txt'))
        man = {"name": "Hitit", "short_name": "Hitit", "description": "A gym logbook that works offline.", "start_url": "./", "scope": "./", "display": "standalone",
               "orientation": "portrait", "background_color": "#08090a", "theme_color": "#08090a",
               "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                         {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
        open(os.path.join(out, 'manifest.webmanifest'), 'w').write(json.dumps(man, indent=2) + '\n')
        files = ['./', 'app.css', 'app.js', 'manifest.webmanifest', 'fonts/big-shoulders.woff2', 'fonts/figtree.woff2', 'icons/icon-32.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']
        h = hashlib.sha256()
        for f in ['index.html'] + files[1:]: h.update(open(os.path.join(out, f), 'rb').read())
        sw = rd('sw.tpl.js').replace('__VERSION__', h.hexdigest()[:10]).replace('__FILES__', json.dumps(files))
        open(os.path.join(out, 'sw.js'), 'w').write(sw)
print('built', {k: sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(os.path.join(D, k)) for f in fs) for k in ['artifact', 'pwa']})
