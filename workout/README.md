# Workout Log

A gym logbook that installs on a phone's home screen and works offline. It is served at
`/workout/` and is not linked from the main page. It asks search engines not to index it.

To install on an iPhone: open `https://omaksimov.com/workout/` in Safari, tap Share, then
"Add to Home Screen".

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The page: top bars, tabs, the empty containers the script fills |
| `app.css` | All styling, light and dark |
| `app.js` | Everything else: the training plan, the exercise library, the figures, logging, charts |
| `sw.js` | Saves the files on the phone so the app opens without a connection |
| `manifest.webmanifest`, `icons/` | Name and icon for the home screen |
| `fonts/` | Big Shoulders Display and Figtree, both under the SIL Open Font License (`fonts/OFL.txt`) |

There is no build step. Cloudflare publishes the folder as it is.

## Where the data lives

Workouts, sessions, measurements and settings are stored in the browser on the phone
(`localStorage`, key `workout-log-v1`). Nothing is sent to this site or anywhere else.
Settings has "Save backup file" and "Restore from file"; the backup is the only copy
outside the phone.

## Changing the app

After editing `index.html`, `app.css` or `app.js`, change the `VERSION` string near the top
of `sw.js` (any new value works). Phones keep using their saved copy until that string
changes; once it does, they download the new files the next time the app is opened online.

`app.js` is laid out in this order: plan data, figure engine, poses, exercise library, then
the app itself (state and storage, views, events).

The same app also exists as a Claude artifact. Its `app.js` is identical. Its `app.css`
loads the two typefaces from Google Fonts instead of `fonts/`, and its `index.html` has no
manifest or icons and does not set `window.WL_STANDALONE`, which is the switch that turns
on the offline cache and turns off syncing through Claude.

## Trying it locally

`npx wrangler dev` in the site folder, then open http://127.0.0.1:8787/workout/.
