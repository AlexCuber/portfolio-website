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
        self.top_font = pygame.font.SysFont(None, 40)
        self.coin_font = pygame.font.SysFont(None, 32)

        self.life_image = pygame.transform.smoothscale(ai_game.cat.image, (40, 40))

        self.banner = None
        self.banner_until = 0
        self.top_image = None
        self.top_version = -1

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
        self.high_score_image = self._label("YOUR BEST", self.stats.high_score, "right", self.best_font, self.best_caption_font)
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

    def show_top_scores(self, top_scores, above=None, below=None):
        """The all-time top 3 (see top_scores.py), drawn like an old arcade high-score table, with its bottom edge at
        `above` or its top edge at `below`. Hidden until the leaderboard has loaded."""
        if top_scores.top is None:
            return
        if top_scores.version != self.top_version:
            self.top_image = self._render_top(top_scores.top)
            self.top_version = top_scores.version
        rect = self.top_image.get_rect(centerx=self.screen_rect.centerx)
        if above is not None:
            rect.bottom = above
        else:
            rect.top = below
        self._panel(rect)
        self.screen.blit(self.top_image, rect)

    def _render_top(self, top):
        width, pad_x, pad_y, row_h = 720, 30, 16, 44
        caption = self.small_font.render("ALL-TIME TOP 3", True, self.settings.accent_color)
        rows_top = pad_y + caption.get_height() + 10
        surf = pygame.Surface((width, rows_top + row_h * max(len(top), 1) + pad_y - 6), pygame.SRCALPHA)
        surf.blit(caption, caption.get_rect(midtop=(width // 2, pad_y)))
        if not top:
            line = self.top_font.render("NO SCORES YET. BE THE FIRST!", True, self.settings.text_color)
            surf.blit(line, line.get_rect(midtop=(width // 2, rows_top)))
        rank_x, name_x = pad_x + 50, pad_x + 124
        for i, entry in enumerate(top):
            y = rows_top + i * row_h
            face, rim, ink = self.settings.medal_colors[i]
            # a gold, silver or bronze coin, then the whole row in that colour
            coin = self._coin(i + 1, face, rim, ink)
            surf.blit(coin, coin.get_rect(midleft=(pad_x, y + 14)))
            rank = self.top_font.render(("1ST", "2ND", "3RD")[i], True, ink)
            score = self.top_font.render(f"{entry['score']:,}", True, ink)
            score_rect = score.get_rect(topright=(width - pad_x, y))
            name = self._fit_name(entry["name"].upper(), score_rect.left - 40 - name_x, ink)
            surf.blit(rank, (rank_x, y))
            surf.blit(name, (name_x, y))
            surf.blit(score, score_rect)
            # a dotted line from the name to the score, in square "pixels"
            dot_y = y + score.get_height() - 12
            for x in range(name_x + name.get_width() + 12, score_rect.left - 10, 14):
                surf.fill(rim, (x, dot_y, 5, 5))
        return surf

    def _coin(self, number, face, rim, ink, size=38):
        """A round medal with its number on it. Drawn 4x bigger and scaled down, so the edges come out smooth."""
        big = pygame.Surface((size * 4, size * 4), pygame.SRCALPHA)
        c, r = size * 2, size * 2
        pygame.draw.circle(big, rim, (c, c), r)
        pygame.draw.circle(big, face, (c, c), r - 12)
        pygame.draw.circle(big, rim, (c, c), r - 26, 4)          # the raised inner ring
        pygame.draw.arc(big, (255, 255, 255, 190), big.get_rect().inflate(-44, -44), 1.9, 2.9, 9)   # a shine, top left
        coin = pygame.transform.smoothscale(big, (size, size))
        digit = self.coin_font.render(str(number), True, ink)
        coin.blit(digit, digit.get_rect(center=(size // 2 + 1, size // 2 + 1)))
        return coin

    def _fit_name(self, name, max_width, color):
        """Render a name, shortened with "..." if it doesn't fit. Characters the font can't draw become "?"."""
        def render(text):
            try:
                return self.top_font.render(text, True, color)
            except (pygame.error, UnicodeError):
                return self.top_font.render(text.encode("ascii", "replace").decode(), True, color)
        image = render(name)
        while image.get_width() > max_width and len(name) > 1:
            name = name[:-1]
            image = render(name.rstrip() + "...")
        return image

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
