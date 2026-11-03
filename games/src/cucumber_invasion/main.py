# Browser build of Cucumber Invasion (packaged with pygbag).
# Differences from the desktop version: the main loop is async so the browser
# can draw between frames, the 0.5 s "cat hit" pause no longer blocks, there is
# no quit key, and the cat can also be steered by tapping or dragging (it walks
# to the tapped spot and fires). It also adds a scoreboard: points per cucumber,
# a level counter that goes up (and speeds the game up) every time a fleet is
# cleared, spare lives, and a high score that is remembered in the browser.
# P (or the on-screen pause button) pauses the game, and it pauses itself when the
# game window loses focus. When a game starts and ends it tells the website, which
# runs the all-time leaderboard (see _notify_site).
import asyncio
import json
import sys
import pygame

from settings import Settings
from cat import Cat
from bullet import Bullet
from cucumber import Cucumber
from game_stats import GameStats
from button import Button
from scoreboard import Scoreboard

class CucumberInvasion:

    def __init__(self):

        pygame.init()

        self.settings = Settings()
        self.screen = pygame.display.set_mode(
            (self.settings.screen_width,self.settings.screen_height))
        pygame.display.set_caption("Cucumber Invasion")
        self.clock = pygame.time.Clock()
        self.dt = 1.0
        if sys.platform == "emscripten":
            # pygbag sized the page canvas before the game picked its 1200x800 mode; re-fit it
            import platform
            platform.window.window_resize()

        self.bg_color = self.settings.bg_color

        self.cat = Cat(self)
        self.bullets = pygame.sprite.Group()
        self.cucumbers = pygame.sprite.Group()

        self._create_fleet()

        self.stats = GameStats(self)
        self.sb = Scoreboard(self)
        self.paused_until = 0
        self.paused = False
        self.pointer_down = False   # mouse button / finger currently pressed on the game
        # a pause button at the top left, next to the spare lives, for touch screens
        self.pause_rect = pygame.Rect(184, 14, 46, 46)

        self.play_button = Button(self, "Play")

    async def run_game(self):

        while True:
            # The browser paces the frames (60 Hz, or 120 Hz on some screens), so the game
            # measures each frame instead of capping it: clock.tick(fps) busy-waits in the
            # browser and freezes the page in Safari. dt is 1.0 for a 60 fps frame.
            self.dt = min(self.clock.tick() * 60 / 1000, 4.0)
            self._check_events()

            if self.stats.game_active and not self.paused and pygame.time.get_ticks() >= self.paused_until:
                self.cat.update(self.dt)
                self._update_bullets()
                self._update_cucumber()

            self._update_screen()
            await asyncio.sleep(0)

    def _check_events(self):
        for event in pygame.event.get():
            if event.type == pygame.KEYDOWN:
                self._check_keydown_events(event)

            elif event.type == pygame.KEYUP:
                self._check_keyup_events(event)

            elif event.type == getattr(pygame, "WINDOWFOCUSLOST", -1):
                # the player clicked or switched away from the game: stop the clock until they're back
                self._set_paused(True)

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if self.stats.game_active and (self.paused or self.pause_rect.collidepoint(event.pos)):
                    # the pause button toggles; while paused, a tap anywhere resumes
                    self._set_paused(not self.paused)
                    continue
                self.pointer_down = True
                if self.stats.game_active:
                    self.cat.target_x = event.pos[0]
                    self._fire_bullet()
                else:
                    self._check_play_button(event.pos)

            elif event.type == pygame.MOUSEBUTTONUP:
                self.pointer_down = False

            elif event.type == pygame.MOUSEMOTION:
                # Dragging steers the cat, but only between our own press and release (in Safari the
                # reported button state can stay "pressed", so plain mouse moves would steer the cat),
                # and never while an arrow key is held: the keyboard always wins.
                keys_held = self.cat.moving_left or self.cat.moving_right
                if self.stats.game_active and not self.paused and self.pointer_down and event.buttons[0] and not keys_held:
                    self.cat.target_x = event.pos[0]

    def _check_play_button(self, mouse_pos):

        button_clicked = self.play_button.rect.collidepoint(mouse_pos)
        if button_clicked and not self.stats.game_active:
            self.settings.initialize_dynamic_settings()
            self.stats.reset_stats()
            self.stats.game_active = True
            self.stats.games_played += 1
            self.sb.prep_all()

            self.cucumbers.empty()
            self.bullets.empty()

            self._create_fleet()
            self.cat.center_cat()
            self.paused = False

            pygame.mouse.set_visible(False)
            self._notify_site("start")

    def _set_paused(self, paused):
        if not self.stats.game_active or paused == self.paused:
            return
        self.paused = paused
        # let go of everything, so nothing keeps moving on its own after resuming
        self.cat.moving_left = self.cat.moving_right = False
        self.cat.target_x = None
        self.pointer_down = False
        pygame.mouse.set_visible(paused)

    def _notify_site(self, kind, **data):
        """Tell the web page around the game (the arcade window on the website) that a game started or ended,
        so it can run the leaderboard. Does nothing outside the browser."""
        if sys.platform != "emscripten":
            return
        try:
            import platform
            platform.window.parent.postMessage(json.dumps({"source": "cucumber-invasion", "type": kind, **data}), "*")
        except Exception as e:
            print("Couldn't reach the page:", e)


    def _check_keydown_events(self, event):
        if event.key == pygame.K_p and self.stats.game_active:
            self._set_paused(not self.paused)
        elif self.paused:
            return
        elif event.key == pygame.K_RIGHT:
            self.cat.target_x = None
            self.cat.moving_right = True
        elif event.key == pygame.K_LEFT:
            self.cat.target_x = None
            self.cat.moving_left = True
        elif event.key == pygame.K_SPACE:
            self._fire_bullet()
        elif event.key in (pygame.K_RETURN, pygame.K_p) and not self.stats.game_active:
            self._check_play_button(self.play_button.rect.center)

    def _check_keyup_events(self, event):
        if event.key == pygame.K_RIGHT:
            self.cat.moving_right = False
        elif event.key == pygame.K_LEFT:
            self.cat.moving_left = False

    def _fire_bullet(self):

        if len(self.bullets) < self.settings.bullets_allowed:
            new_bullet = Bullet(self)
            self.bullets.add(new_bullet)


    def _update_screen(self):
        self.screen.fill(self.bg_color)
        self.cat.blitme()

        for bullet in self.bullets.sprites():
            bullet.draw_bullet()

        self.cucumbers.draw(self.screen)

        self.sb.show_score()

        if self.stats.game_active:
            self.sb.show_pause_button(self.pause_rect, self.paused)
            if self.paused:
                self.sb.show_paused()
        else:
            if self.stats.games_played:
                self.sb.show_game_over()
            self.play_button.draw_button()

        pygame.display.flip()

    def _update_bullets(self):

        self.bullets.update(self.dt)

        #Get rid of bullets that have disapeared
        for bullet in self.bullets.copy():
            if bullet.rect.bottom <= 0:
                self.bullets.remove(bullet)

        self._check_bullet_cucumber_collisions()



    def _check_bullet_cucumber_collisions(self):

        collisions = pygame.sprite.groupcollide(self.bullets, self.cucumbers, True, True)

        if collisions:
            for cucumbers in collisions.values():
                self.stats.score += self.settings.cucumber_points * len(cucumbers)
            self.sb.prep_score()
            self.sb.check_high_score()

        if not self.cucumbers:
            self._start_new_level()

    def _start_new_level(self):
        self.bullets.empty()
        self._create_fleet()
        self.settings.increase_speed()

        self.stats.level += 1
        self.sb.prep_level()
        self.sb.show_banner(f"Level {self.stats.level}!")
        self.paused_until = pygame.time.get_ticks() + 1200


    def _update_cucumber(self):
        self._check_fleet_edges()
        self.cucumbers.update(self.dt)

        if pygame.sprite.spritecollideany(self.cat, self.cucumbers):
            print("Cat hit by a cucumber!!!")
            self._cat_hit()

        self._check_cucumbers_bottom()

    def _create_fleet(self):

        cucumber = Cucumber(self)
        cucumber_width, cucumber_height = cucumber.rect.size

        available_space_x = self.settings.screen_width - (2 * cucumber_width) * 0
        number_cucumbers_x = available_space_x // (2  * cucumber_width)

        # N rows to fit on the screen
        cat_height = self.cat.rect.height
        available_space_y = self.settings.screen_height - (2 * cucumber_height) - cat_height
        number_rows = available_space_y // (2 * cucumber_height)

        for row_number in range(number_rows):
            for cucumber_number in range(number_cucumbers_x):
                self._create_cucumber(cucumber_number, row_number)

    def _create_cucumber(self,cucumber_number, row_number):
            cucumber = Cucumber(self)
            cucumber_width, cucumber_height = cucumber.rect.size
            cucumber.x = cucumber_width + 2 * cucumber_width * cucumber_number
            cucumber.rect.x = cucumber.x

            cucumber.rect.y = cucumber_height + 2 * cucumber_height * row_number

            self.cucumbers.add(cucumber)


    def _check_fleet_edges(self):
        for cucumber in self.cucumbers.sprites():
            if cucumber.check_edges():
                self._change_fleet_direction()
                break

    def _change_fleet_direction(self):
        for cucumber in self.cucumbers.sprites():
            cucumber.rect.y += self.settings.fleet_drop_speed
        self.settings.fleet_direction *= -1

    def _cat_hit(self):

        if self.stats.cats_left > 0:
            self.stats.cats_left -= 1

            self.cucumbers.empty()
            self.bullets.empty()

            self._create_fleet()
            self.cat.center_cat()

            self.paused_until = pygame.time.get_ticks() + 500
        else:
            self.stats.game_active = False
            self.paused = False
            self.stats.save_high_score()
            pygame.mouse.set_visible(True)
            self._notify_site("over", score=self.stats.score, level=self.stats.level)

    def _check_cucumbers_bottom(self):
        screen_rect = self.screen.get_rect()
        for cucumber in self.cucumbers.sprites():
            if cucumber.rect.bottom >= screen_rect.bottom:
                self._cat_hit()
                break


async def main():
    ai = CucumberInvasion()
    await ai.run_game()

asyncio.run(main())
