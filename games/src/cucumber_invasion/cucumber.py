import pygame
from pygame.sprite import Sprite 

class Cucumber(Sprite):

    _image = None

    def __init__(self, ai_game):

        super().__init__()
        self.screen = ai_game.screen
        self.settings = ai_game.settings

        if Cucumber._image is None:
            Cucumber._image = pygame.transform.smoothscale(
                pygame.image.load("images/cucumber.png").convert_alpha(), (80,80))
        self.image = Cucumber._image
        self.rect = self.image.get_rect()
        
        self.rect.x = self.rect.width
        self.rect.y = self.rect.height
        
        self.x = float(self.rect.x)
        
    def update(self, dt=1.0):
        self.x += self.settings.cucumber_speed * self.settings.fleet_direction * dt
        self.rect.x = self.x
    
    def check_edges(self):
        screen_rect = self.screen.get_rect()
        if self.rect.right >= screen_rect.right or self.rect.left <= screen_rect.left:
            return True