# Games

`cucumber-invasion/` is the browser build the website loads in its game window.
`src/cucumber_invasion/` is the source it was built from: the pygame game from
github.com/AlexCuber/cucumber_invasion, adapted for the browser.

## Rebuilding after changing the game

```sh
pip install pygbag
cd games/src
pygbag --build --ume_block 0 --can_close 1 --width 1200 --height 800 --title "Cucumber Invasion" cucumber_invasion
sed -i '' 's/fb_ar   :  1.77,/fb_ar   :  1.5,/' cucumber_invasion/build/web/index.html
cp cucumber_invasion/build/web/{index.html,cucumber_invasion.tar.gz,favicon.png} ../cucumber-invasion/
rm -rf cucumber_invasion/build
```

If the build hangs on macOS, Python has no SSL certificates yet: run
"Install Certificates.command" from the Python folder in Applications.

`--ume_block 0` skips pygbag's "click to start" screen (the game has no sound) and
`--can_close 1` stops it asking "are you sure you want to leave?" when the window closes.
`--width/--height` and the `sed` line tell the page the game is 1200x800 (3:2); pygbag's
template otherwise assumes 16:9 and the game looks squashed on phones.

## Things that must stay true in the game code (pygbag requirements)

- The main loop is `async` and calls `await asyncio.sleep(0)` once per frame.
- Nothing may block: no `time.sleep()`, `input()` or `sys.exit()`.
- No frame cap: `clock.tick(60)` busy-waits in the browser and freezes the page in
  Safari. Use `clock.tick()` to measure the frame and scale movement by it (`dt`).
- Assets are PNG and loaded with relative paths (`images/...`).

## Running it

The page has to be served over http(s); opening `index.html` straight from disk
won't load the game. Locally: `python3 -m http.server` in the site folder, then
open http://localhost:8000. Any static host works (GitHub Pages, Netlify, ...).
The Python runtime itself (a few MB) is fetched from pygbag's CDN on first play.