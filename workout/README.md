# Hitit

A gym logbook that installs on a phone's home screen and works offline. It is served at
`https://workout.omaksimov.com/` by its own small Cloudflare Worker, separate from the website.
It is not linked from the main page and asks search engines not to index it.

To install on an iPhone: open `https://workout.omaksimov.com/` in Safari, tap Share, then
"Add to Home Screen".

## One-time setup in Cloudflare

Do this after this folder is on the `main` branch.

1. Cloudflare dashboard, **Workers & Pages**, **Create application**, **Import a repository**,
   and pick `AlexCuber/portfolio-website`.
2. Name the Worker `workout-log`. It has to match `name` in `wrangler.jsonc`, or the build fails.
3. Set **Root directory** to `workout`. Leave the deploy command as `npx wrangler deploy`.
4. Save and deploy. The first deploy attaches `workout.omaksimov.com`; Cloudflare creates the
   DNS record and the certificate.

If that deploy stops at the domain step, add it by hand: the Worker's **Settings**,
**Domains & Routes**, **Add**, **Custom Domain**, `workout.omaksimov.com`. Then retry the build.

From then on every push to `main` redeploys both Workers. The website's Worker skips this
folder (the `workout` line in the root `.assetsignore`), so the app exists at one address only.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The page: top bars, tabs, the empty containers the script fills |
| `app.css` | All styling, light and dark |
| `app.js` | Everything else: the training plan, the exercise library, the figures, logging, charts |
| `sw.js` | Saves the files on the phone so the app opens without a connection |
| `manifest.webmanifest`, `icons/` | Name and icon for the home screen |
| `fonts/` | Big Shoulders Display and Figtree, both under the SIL Open Font License (`fonts/OFL.txt`) |
| `wrangler.jsonc` | The Worker: files only, address `workout.omaksimov.com`, no `workers.dev` copy |
| `.assetsignore` | Keeps this README and the config out of the published files |

The files here are built from `../workout-src` (see its README) and are not edited by hand. Cloudflare has no
build step of its own: it publishes this folder as it is.

## Where the data lives

Workouts, sessions, measurements and settings are stored in the browser on the phone
(`localStorage`, key `workout-log-v1`). Nothing is sent to this site or anywhere else.
Settings has "Save backup file" and "Restore from file"; the backup is the only copy
outside the phone.

The data belongs to the address. An app installed from a different address, including a
`workers.dev` or preview link, starts empty. That is why `wrangler.jsonc` turns those off.

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

`npx wrangler dev` in this folder, then open http://127.0.0.1:8787/.
