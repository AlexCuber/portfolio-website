import pygame

class Cat:

    def __init__(self, ai_game):
        self.screen = ai_game.screen
        self.screen_rect = ai_game.screen.get_rect()
        self.settings = ai_game.settings

        # Movement flags (keyboard) and a pointer target (mouse / touch)
        self.moving_right = False
        self.moving_left = False
        self.target_x = None

        self.image = pygame.image.load("images/cat3.png").convert_alpha()
        self.image = pygame.transform.smoothscale(self.image, (85,85))

        self.rect = self.image.get_rect()
        self.rect.midbottom = self.screen_rect.midbottom

        self.x = float(self.rect.x)

    def update(self, dt=1.0):
        speed = self.settings.cat_speed * dt
        if self.target_x is not None:
            dx = self.target_x - (self.x + self.rect.width / 2)
            self.x += max(-speed, min(speed, dx))
            if abs(dx) <= speed:
                self.target_x = None
        elif self.moving_right:
            self.x += speed
        elif self.moving_left:
            self.x -= speed
        self.x = max(0.0, min(self.x, float(self.screen_rect.right - self.rect.width)))
        self.rect.x = self.x


    def blitme(self):
        self.screen.blit(self.image, self.rect)

    def center_cat(self):
        self.rect.midbottom = self.screen_rect.midbottom
        self.x = float(self.rect.x)
        self.target_x = None
