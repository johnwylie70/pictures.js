// High Score: catch the star as often as you can in 10 seconds. Your best score is still there the next time you play.
// Use: click or tap the star. When the time is up, click anywhere to play again.
// Try changing: 10, the seconds in a game; 60, the size of the star; "best", the name the score is saved under.
//
// Run it:   pictures run high_score.js

let best = load("best", 0)          // the score saved last time, or 0 the first time
let score = 0
let left = 10                       // seconds left in this game
const star = new Sprite("⭐", 200, 160, 60)

function update(dt) {
  if (left <= 0) return             // the game is over
  left -= dt
  if (left <= 0 && score > best) {
    best = score
    save("best", best)              // kept for next time
  }
}

function onMouseDown(x, y) {
  if (left <= 0) {                  // start the next game
    score = 0
    left = 10
  } else if (star.contains(x, y)) {
    score += 1
    star.x = random(40, width - 40)
    star.y = random(90, height - 40)
  }
}

function draw() {
  background("midnightblue")
  star.draw()
  text("Score " + score, 16, 34, "white", 22, "left")
  text("Best " + best, width - 16, 34, "gold", 22, "right")
  if (left > 0) text(Math.round(left), width / 2, 26, "white", 22, "centre")
  else text("Time is up. Click to play again", width / 2, height / 2, "white", 22, "centre")
}
