
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

        # How quickly the game speeds up, and how much more each cucumber is worth, per level
        self.speedup_scale = 1.1
        self.score_scale = 1.5

        self.initialize_dynamic_settings()

    def initialize_dynamic_settings(self):
        """Settings that change during a game (reset when a new game starts)."""
        self.cat_speed = 7.0
        self.bullet_speed = 9.0
        self.cucumber_speed = 1.5
        self.fleet_direction = 1
        self.cucumber_points = 50

    def increase_speed(self):
        self.cat_speed *= self.speedup_scale
        self.bullet_speed *= self.speedup_scale
        self.cucumber_speed *= self.speedup_scale
        self.cucumber_points = int(self.cucumber_points * self.score_scale)
