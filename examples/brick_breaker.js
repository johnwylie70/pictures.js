// Brick Breaker: bounce the ball off your bat and knock out every brick. You have 3 balls.
// Use: left and right move the bat. Or drag left and right.
// Try changing: COLOURS, one for each row of bricks; 100, how wide the bat is; -330, how fast the ball goes up.
//
// Run it:   pictures run brick_breaker.js

const COLOURS = ["tomato", "orange", "gold", "mediumseagreen", "dodgerblue"]   // one for each row

const bat = Sprite.box(0, 0, 100, 14)
const ball = Sprite.circle(0, 0, 14)
let bricks = []
let score = 0
let lives = 3
let wait = 0                    // seconds before the ball moves

// Five rows of eight bricks, which fill the width of the picture.
function buildWall() {
  bricks = []
  const across = width / 8
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 8; column++) {
      bricks.push(Sprite.box(across * (column + 0.5), 70 + row * 26, across - 6, 20, COLOURS[row]))
    }
  }
}

function newGame() {
  score = 0
  lives = 3
  buildWall()
  bat.x = width / 2
  serve()
}

// Put the ball above the bat, going up.
function serve() {
  ball.x = bat.x
  ball.y = height - 80
  ball.vx = 165
  ball.vy = -330
  wait = 1
}

function gameOver() {
  return lives === 0 || bricks.length === 0
}

function update(dt) {
  if (gameOver()) {
    if (pressed.has(" ")) newGame()
    return
  }
  if (keys.has("ArrowLeft")) bat.x -= 520 * dt
  if (keys.has("ArrowRight")) bat.x += 520 * dt
  if (mouse.down) bat.x = mouse.x
  bat.y = height - 40
  bat.bounce("left", "right")           // the bat stops at the sides
  wait -= dt
  if (wait > 0) {
    ball.x = bat.x                      // the ball waits on the bat
    return
  }
  ball.update(dt)
  ball.bounce("left", "right", "top")
  // Off the bat the ball goes up, and further sideways the nearer the end it met.
  if (ball.vy > 0 && ball.touches(bat)) {
    ball.vy = -ball.vy
    ball.vx = (ball.x - bat.x) * 7
  }
  const brick = ball.hit(bricks)
  if (brick) {
    remove(bricks, brick)
    ball.vy = -ball.vy
    score += 1
  }
  if (ball.y > height) {
    lives -= 1
    serve()
  }
}

function onMouseDown() {
  if (gameOver()) newGame()
}

function draw() {
  background("midnightblue")
  for (const brick of bricks) brick.draw()
  bat.draw()
  ball.draw()
  text("Score " + score + "   Balls " + lives, 12, 30, "white", 20, "left")
  if (gameOver()) {
    text(lives === 0 ? "Game over" : "You win!", width / 2, height / 2, "white", 32, "centre")
    text("Tap or press space to play again", width / 2, height / 2 + 40, "white", 18, "centre")
  }
}

newGame()
