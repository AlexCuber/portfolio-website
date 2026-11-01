import sys


class GameStats:
    """Statistics for Cucumber Invasion"""

    HIGH_SCORE_KEY = "cucumber_invasion_high_score"

    def __init__(self, ai_game):
        self.settings = ai_game.settings
        self.reset_stats()
        self.game_active = False
        self.games_played = 0
        self.high_score = self._load_high_score()

    def reset_stats(self):
        self.cats_left = self.settings.cat_limit
        self.score = 0
        self.level = 1

    # In the browser the high score lives in localStorage, so it survives page reloads.
    def _load_high_score(self):
        if sys.platform == "emscripten":
            try:
                import platform
                return int(platform.window.localStorage.getItem(self.HIGH_SCORE_KEY) or 0)
            except Exception:
                pass
        return 0

    def save_high_score(self):
        if sys.platform == "emscripten":
            try:
                import platform
                platform.window.localStorage.setItem(self.HIGH_SCORE_KEY, str(self.high_score))
            except Exception:
                pass
