// Bat and Ball: keep the ball out of your goal, and get it past the computer's bat. First to 5 wins.
// Use: up and down move your bat, the left one. Or drag up and down.
// Try changing: 230, the computer's speed (bigger is harder); 90, how tall the bats are; 1.08, how much faster the ball gets with each hit;
// the sounds, a line each: look for playSound ("blip" to "pop" or "bounce", or 0.5, how loud).
//
// Run it:   pictures run bat_and_ball.js

soundButton()                   // a speaker in the corner to switch the sound off (so does M)

const you = Sprite.box(0, 0, 14, 90)
const computer = Sprite.box(0, 0, 14, 90)
const ball = Sprite.circle(0, 0, 16)
let yourScore = 0
let computerScore = 0
let wait = 0                    // seconds before the ball moves

function newGame() {
  yourScore = 0
  computerScore = 0
  you.y = height / 2
  computer.y = height / 2
  serve(1)
}

// Put the ball in the middle, moving left (-1) or right (1).
function serve(direction) {
  ball.x = width / 2
  ball.y = height / 2
  ball.vx = direction * width * 0.45    // a wide court has a faster ball
  ball.vy = random(-150, 150)
  wait = 1
}

function gameOver() {
  return yourScore === 5 || computerScore === 5
}

function moveBats(dt) {
  if (keys.has("ArrowUp")) you.y -= 420 * dt
  if (keys.has("ArrowDown")) you.y += 420 * dt
  if (mouse.down) you.y = mouse.y
  // The computer chases the ball, but it is slower than a ball hit off the end of your bat.
  if (ball.vx > 0 && ball.y < computer.y - 10) computer.y -= 230 * dt
  if (ball.vx > 0 && ball.y > computer.y + 10) computer.y += 230 * dt
  you.x = 30
  computer.x = width - 30
  you.bounce("top", "bottom")           // a bat stops at the edges
  computer.bounce("top", "bottom")
}

// Send the ball back, a little faster. Where it met the bat decides how steeply it leaves.
function hitBall(bat, direction) {
  ball.vx = direction * Math.abs(ball.vx) * 1.08
  ball.vy = (ball.y - bat.y) * 9
  ball.limit(900)
  playSound("blip", 0.5, { pitch: direction * 3 })      // your bat a little higher than the computer's
}

function update(dt) {
  if (gameOver()) {
    if (pressed.has(" ")) newGame()
    return
  }
  moveBats(dt)
  wait -= dt
  if (wait > 0) return
  ball.update(dt)
  if (ball.bounce("top", "bottom")) playSound("click", 0.4)
  // Only a ball coming towards a bat is sent back, so it can never stick to one.
  if (ball.vx < 0 && ball.touches(you)) hitBall(you, 1)
  if (ball.vx > 0 && ball.touches(computer)) hitBall(computer, -1)
  if (ball.x < 0) {
    computerScore += 1
    playSound(gameOver() ? "lose" : "zap", 0.5)
    serve(1)
  }
  if (ball.x > width) {
    yourScore += 1
    playSound(gameOver() ? "win" : "coin", 0.6)
    serve(-1)
  }
}

function onMouseDown() {
  if (gameOver()) newGame()
}

function draw() {
  background("black")
  for (let y = 10; y < height; y += 30) rect(width / 2 - 2, y, 4, 15, "dimgray")
  you.draw()
  computer.draw()
  ball.draw()
  text(yourScore, width / 2 - 60, 60, "white", 48, "centre")
  text(computerScore, width / 2 + 60, 60, "white", 48, "centre")
  if (gameOver()) {
    text(yourScore === 5 ? "You win!" : "The computer wins", width / 2, height / 2, "white", 32, "centre")
    text("Tap or press space to play again", width / 2, height / 2 + 40, "white", 18, "centre")
  }
}

newGame()
