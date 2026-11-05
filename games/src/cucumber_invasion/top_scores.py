import json
import sys

import pygame


# Python in the browser can't simply wait for a web request, so a little JavaScript fetches the board in the
# background and leaves the answer, as JSON text, in window.ciTop ("" until it arrives).
_FETCH_JS = """
window.ciTop = "";
fetch("/api/leaderboard", { cache: "no-store" })
  .then(r => r.ok ? r.json() : null)
  .then(d => { window.ciTop = JSON.stringify(d && Array.isArray(d.top) ? d.top.slice(0, 3) : null); })
  .catch(() => { window.ciTop = "null"; });
"""


class TopScores:
    """The top 3 of the website's all-time leaderboard (src/leaderboard.js), shown on the start and game-over screens.
    It works the same inside the website's game window and when the game page is opened on its own. Outside the
    browser, or when the leaderboard can't be reached, there is nothing to show and the table stays hidden."""

    REFRESH_MS = 15000   # while nobody is playing, look again now and then, so new entries show up

    def __init__(self):
        self.top = None       # None: nothing to show; otherwise a list of up to 3 entries: {name, score, level}
        self.version = 0      # goes up whenever self.top changes, so the scoreboard knows to redraw the table
        self._waiting = False
        self._next_refresh = 0
        self.refresh()

    def refresh(self):
        """Start fetching the board (does nothing if a fetch is already under way)."""
        self._next_refresh = pygame.time.get_ticks() + self.REFRESH_MS
        if sys.platform != "emscripten" or self._waiting:
            return
        try:
            import platform
            platform.window.eval(_FETCH_JS)
            self._waiting = True
        except Exception as e:
            print("Couldn't load the leaderboard:", e)

    def update(self, idle):
        """Call once per frame: picks up a finished fetch, and refreshes now and then while idle (not playing)."""
        if self._waiting:
            try:
                import platform
                raw = str(platform.window.ciTop or "")
            except Exception:
                raw = "null"
            if not raw:
                return   # still loading
            self._waiting = False
            try:
                top = json.loads(raw)
            except ValueError:
                top = None
            if isinstance(top, list):   # a failed fetch keeps whatever was shown before
                top = [{"name": str(e.get("name") or "anonymous"), "score": int(e.get("score") or 0)}
                       for e in top if isinstance(e, dict)]
                if top != self.top:
                    self.top = top
                    self.version += 1
        elif idle and pygame.time.get_ticks() >= self._next_refresh:
            self.refresh()
