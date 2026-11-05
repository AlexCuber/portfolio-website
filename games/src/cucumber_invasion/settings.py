
class Settings:

    def __init__(self):
        # Static settings
        self.screen_width = 1200
        self.screen_height = 800
        self.bg_color = (230, 240, 241)
        self.cat_limit = 3

        # Bullet settings
        self.bullet_width = 10
        self.bullet_height = 10
        self.bullet_color = (230,40,160)
        self.bullets_allowed = 5

        # Cucumber settings
        self.fleet_drop_speed = 10

        # Scoreboard settings
        self.text_color = (27, 19, 64)
        self.accent_color = (230, 40, 160)
        # the top 3 table: (coin face, coin rim and dotted line, text) for gold, silver and bronze
        self.medal_colors = [
            ((255, 206, 64), (222, 156, 24), (176, 112, 0)),
            ((222, 227, 236), (158, 168, 186), (100, 110, 132)),
            ((236, 164, 106), (190, 112, 54), (156, 82, 28)),
        ]

        # How quickly the game speeds up per level: the cucumbers take big steps for the first few levels, so the
        # game picks up quickly, then everything speeds up 10% per level, easing to 6% per level after level 15.
        self.early_levels = 4
        self.early_speedup = 1.25
        self.speedup_scale = 1.1
        self.late_level = 15
        self.late_speedup = 1.06
        # A cucumber is worth 50 x level² points (50, 200, 450, ... 5,000 on level 10), so a long game
        # ends in the millions without the score running away from level to level
        self.points_base = 50

        self.initialize_dynamic_settings()

    def initialize_dynamic_settings(self):
        """Settings that change during a game (reset when a new game starts)."""
        self.cat_speed = 7.0
        self.bullet_speed = 9.0
        self.cucumber_speed = 1.5
        self.fleet_direction = 1
        self.cucumber_points = 50
        self.levels_cleared = 0

    def increase_speed(self):
        self.levels_cleared += 1
        late = self.levels_cleared >= self.late_level
        scale = self.late_speedup if late else self.speedup_scale
        self.cucumber_speed *= self.early_speedup if self.levels_cleared <= self.early_levels else scale
        self.cat_speed *= scale
        self.bullet_speed *= scale
        self.cucumber_points = self.points_base * (self.levels_cleared + 1) ** 2
