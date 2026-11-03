import pygame


class Scoreboard:
    """Score, high score, level and spare lives, plus the level-up and game-over banners."""

    def __init__(self, ai_game):
        self.screen = ai_game.screen
        self.screen_rect = self.screen.get_rect()
        self.settings = ai_game.settings
        self.stats = ai_game.stats

        self.font = pygame.font.SysFont(None, 44)
        self.small_font = pygame.font.SysFont(None, 30)
        # the current score is the big number in the middle; the best score sits at the top right, a bit smaller
        self.score_font = pygame.font.SysFont(None, 56)
        self.best_font = pygame.font.SysFont(None, 34)
        self.best_caption_font = pygame.font.SysFont(None, 24)
        self.banner_font = pygame.font.SysFont(None, 110)

        self.life_image = pygame.transform.smoothscale(ai_game.cat.image, (40, 40))

        self.banner = None
        self.banner_until = 0

        self.prep_all()

    def prep_all(self):
        self.prep_score()
        self.prep_high_score()   # also places the level

    def _label(self, caption, value, align, font=None, caption_font=None):
        """Render a small caption above a big number and position it at the top of the screen."""
        cap = (caption_font or self.small_font).render(caption, True, self.settings.accent_color)
        num = (font or self.font).render(f"{value:,}", True, self.settings.text_color)
        surf = pygame.Surface((max(cap.get_width(), num.get_width()), cap.get_height() + num.get_height()), pygame.SRCALPHA)
        anchor = {"left": "topleft", "center": "midtop", "right": "topright"}[align]
        surf.blit(cap, cap.get_rect(**{anchor: getattr(surf.get_rect(), anchor)}))
        surf.blit(num, num.get_rect(**{anchor.replace("top", "bottom"): getattr(surf.get_rect(), anchor.replace("top", "bottom"))}))
        return surf

    def prep_score(self):
        self.score_image = self._label("SCORE", self.stats.score, "center", self.score_font)
        self.score_rect = self.score_image.get_rect(midtop=(self.screen_rect.centerx, 10))

    def prep_high_score(self):
        self.high_score_image = self._label("BEST", self.stats.high_score, "right", self.best_font, self.best_caption_font)
        self.high_score_rect = self.high_score_image.get_rect(topright=(self.screen_rect.right - 20, 14))
        self.prep_level()   # the level sits just left of the best score, so it moves when that number grows

    def prep_level(self):
        self.level_image = self._label("LEVEL", self.stats.level, "right")
        self.level_rect = self.level_image.get_rect(topright=(self.high_score_rect.left - 36, 12))

    def check_high_score(self):
        if self.stats.score > self.stats.high_score:
            self.stats.high_score = self.stats.score
            self.prep_high_score()

    def show_banner(self, text, ms=1400):
        self.banner = self.banner_font.render(text, True, self.settings.accent_color)
        self.banner_until = pygame.time.get_ticks() + ms

    def show_score(self):
        self.screen.blit(self.score_image, self.score_rect)
        self.screen.blit(self.high_score_image, self.high_score_rect)
        self.screen.blit(self.level_image, self.level_rect)
        for i in range(self.stats.cats_left):
            self.screen.blit(self.life_image, (20 + i * 48, 16))

        if self.banner and self.stats.game_active and pygame.time.get_ticks() < self.banner_until:
            rect = self.banner.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 100))
            self._panel(rect.inflate(60, 30))
            self.screen.blit(self.banner, rect)

    def show_game_over(self):
        self.banner = None
        title = self.banner_font.render("Game over", True, self.settings.accent_color)
        line = self.font.render(f"You scored {self.stats.score:,} and reached level {self.stats.level}", True, self.settings.text_color)
        title_rect = title.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 130))
        line_rect = line.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 60))
        self._panel(title_rect.union(line_rect).inflate(60, 40))
        self.screen.blit(title, title_rect)
        self.screen.blit(line, line_rect)

    def show_pause_button(self, rect, paused):
        """A round button at the top: two bars while playing, a play triangle while paused."""
        pygame.draw.circle(self.screen, (255, 255, 255), rect.center, rect.width // 2)
        pygame.draw.circle(self.screen, self.settings.text_color, rect.center, rect.width // 2, 2)
        cx, cy = rect.center
        if paused:
            pygame.draw.polygon(self.screen, self.settings.text_color, [(cx - 6, cy - 10), (cx - 6, cy + 10), (cx + 11, cy)])
        else:
            for dx in (-7, 3):
                pygame.draw.rect(self.screen, self.settings.text_color, (cx + dx, cy - 10, 5, 20), border_radius=2)

    def show_paused(self):
        title = self.banner_font.render("Paused", True, self.settings.accent_color)
        line = self.font.render("Press P or tap to carry on", True, self.settings.text_color)
        title_rect = title.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery - 40))
        line_rect = line.get_rect(center=(self.screen_rect.centerx, self.screen_rect.centery + 30))
        self._panel(title_rect.union(line_rect).inflate(60, 40))
        self.screen.blit(title, title_rect)
        self.screen.blit(line, line_rect)

    def _panel(self, rect):
        panel = pygame.Surface(rect.size, pygame.SRCALPHA)
        pygame.draw.rect(panel, (255, 255, 255, 215), panel.get_rect(), border_radius=18)
        self.screen.blit(panel, rect)
