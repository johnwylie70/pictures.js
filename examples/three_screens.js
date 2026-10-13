// Three Screens: a game with a title screen, the game, and a game-over screen. Each screen is a scene.
// Use: click or tap to start; move the mouse, or drag a finger, to catch the stars; click to play again.
// Try changing: 15, how long a game lasts; "crossfade" to "wipe" or "slide_left"; 0.4, how long a change takes.
//
// Run it:   pictures run three_screens.js

let score = 0                 // made at the top of the file, so every scene shares it
let best = load("best", 0)

class Title extends Scene {
  draw() {
    background("midnightblue")
    text("Star Basket", width / 2, height / 2 - 20, "gold", 48, "centre")
    text("Click to start", width / 2, height / 2 + 40, "white", 20, "centre")
  }
  onMouseDown() {
    go("Game", { transition: "crossfade", transitionTime: 0.4 })
  }
}

class Game extends Scene {
  length = 15                  // seconds: then the next scene written, GameOver, begins

  setup() {                    // called each time the game begins, so every game starts afresh
    score = 0
    this.basket = new Sprite("🧺", width / 2, height - 50, 64)
    this.stars = []
    for (let i = 0; i < 5; i++) this.stars.push(new Sprite("⭐", random(width), random(height / 2), 36))
  }
  update(dt) {
    if (mouse.inside) this.basket.x = mouse.x
    this.basket.y = height - 50
    for (const star of this.stars) {
      star.y += 200 * dt
      const caught = star.touches(this.basket)
      if (caught) score += 1
      if (caught || star.y > height) {
        star.x = random(width)
        star.y = 0
      }
    }
  }
  draw() {
    background("midnightblue")
    for (const star of this.stars) star.draw()
    this.basket.draw()
    text("Score " + score, 12, 30, "white", 20, "left")
    rect(0, height - 6, width * (1 - sceneProgress), 6, "gold")   // the time that is left
  }
}

class GameOver extends Scene {
  transition = "slide_up"      // how this scene arrives

  setup() {
    if (score > best) {
      best = score
      save("best", best)
    }
  }
  draw() {
    background("#301030")
    text("Time!", width / 2, height / 2 - 40, "white", 48, "centre")
    text("You caught " + score + ". Best " + best, width / 2, height / 2 + 10, "gold", 22, "centre")
    if (sceneTime > 1) text("Click to play again", width / 2, height / 2 + 60, "white", 18, "centre")
  }
  onMouseDown() {
    if (sceneTime > 1) go("Title", { transition: "fade" })
  }
}
