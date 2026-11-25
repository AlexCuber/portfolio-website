# Hitit: source

The source of the gym logbook at `https://workout.omaksimov.com/`. The published files are in
`../workout`; they are built from this folder and should not be edited by hand.

## Build

    python3 build.py        # writes dist/pwa (the home-screen app) and dist/artifact (the Claude artifact)
    python3 check_dist.py   # checks that ../workout is exactly what the source builds

Python 3.9 or newer, nothing to install. `dist/` is not kept in git.

## Test

    pip install playwright
    python3 test/all.py             # everything, about 12 minutes
    python3 test/all.py lifts tod   # only the tests whose name matches

The tests drive the built app in a phone-sized browser. They use Google Chrome where it is
installed in the usual place. Without Chrome, run `python3 -m playwright install chromium` once.
To pick a browser yourself, set `HITIT_CHROME` to its path, or to `bundled` for that Chromium. Screenshots go to `shots/`.

The files in `test/` that `all.py` does not list (`step12.py`, `step34.py`, `edge12.py`,
`offline_cf.py`, `sheet*.js`) are older one-off checks, kept for reference.

## Release

1. Change files in `src/`, then `python3 build.py`.
2. Copy `dist/pwa/index.html`, `app.css`, `app.js`, `manifest.webmanifest` and `sw.js` into `../workout/`.
3. Open a pull request. GitHub builds the source, checks step 2 and runs the tests
   (`.github/workflows/workout.yml`). Merging into `main` makes Cloudflare publish `../workout`.

## What is here

| Path | What it is |
|---|---|
| `src/app-*.js` | The app in nine parts that share one function scope: state and storage, coaching, first run, endurance, views, events |
| `src/illo-*.js`, `src/library.js` | The drawn figures and the exercise library |
| `src/plan.json`, `src/palettes.json` | The built-in training plan and the colour themes |
| `src/app.css`, `src/index.tpl.html`, `src/sw.tpl.js` | Styling, the page, and the offline cache |
| `fonts/`, `icons/` | Big Shoulders Display and Figtree (SIL Open Font License, `src/OFL.txt`), and the app icons |
| `build.py`, `check_dist.py` | The build, and the check that the published folder matches it |
| `test/` | Playwright tests; `test/all.py` runs them |

Never rename the storage keys `workout-log-v1` and `hilo-backup-v1`, exercise ids, template
session ids or the `out-` session keys. Saved workouts are matched by them.
