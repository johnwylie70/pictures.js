// Snake: eat the apples and grow, without running into a wall or yourself. It is played on a grid of squares, and your best score is kept.
// Use: the arrow keys turn the snake. Or tap the side of its head you want it to turn to.
// Try changing: SQUARE, the size of a square; 0.15, the seconds between steps (smaller is faster); the colours in draw();
// the sounds, a line each: look for playSound ("coin" to "pop" or "powerup").
//
// Run it:   pictures run snake.js

soundButton("bottom right")     // a speaker in the corner to switch the sound off (so does M)

const SQUARE = 24               // the size of one square of the grid

let columns = 0
let rows = 0
let snake = []                  // its squares, the head first: { x, y }
let apple = { x: 0, y: 0 }
let going = { x: 1, y: 0 }      // one square right each step
let turn = going                // the turn asked for, taken at the next step
let timer = 0
let score = 0
let best = load("best", 0)      // the best score saved last time, or 0 the first time
let alive = true
let waiting = true              // nothing moves until the first key or tap

function newGame() {
  columns = Math.floor(width / SQUARE)
  rows = Math.floor(height / SQUARE)
  const y = Math.floor(rows / 2)
  snake = [{ x: 4, y: y }, { x: 3, y: y }, { x: 2, y: y }]
  going = { x: 1, y: 0 }
  turn = going
  score = 0
  alive = true
  waiting = true
  moveApple()
}

function onSnake(x, y) {
  for (const part of snake) {
    if (part.x === x && part.y === y) return true
  }
  return false
}

// Try squares until one is free.
function moveApple() {
  apple = { x: random(columns - 1), y: random(rows - 1) }
  if (onSnake(apple.x, apple.y)) moveApple()
}

// Turn, unless that would send the snake straight back into itself.
function turnTo(x, y) {
  if (x === -going.x && y === -going.y) return
  if (x !== turn.x || y !== turn.y) playSound("click", 0.3)
  turn = { x: x, y: y }
}

function onKeyDown(key) {
  if (key === "ArrowLeft") turnTo(-1, 0)
  if (key === "ArrowRight") turnTo(1, 0)
  if (key === "ArrowUp") turnTo(0, -1)
  if (key === "ArrowDown") turnTo(0, 1)
  if (key.startsWith("Arrow")) waiting = false
  if (key === " " && !alive) newGame()
}

function onMouseDown(x, y) {
  if (!alive) return newGame()
  waiting = false
  // How far the tap is from the middle of the head, across and down.
  const across = x - (snake[0].x + 0.5) * SQUARE
  const down = y - (snake[0].y + 0.5) * SQUARE
  if (Math.abs(across) > Math.abs(down)) turnTo(Math.sign(across), 0)
  else turnTo(0, Math.sign(down))
}

function step() {
  going = turn
  const head = { x: snake[0].x + going.x, y: snake[0].y + going.y }
  const outside = head.x < 0 || head.y < 0 || head.x >= columns || head.y >= rows
  if (outside || onSnake(head.x, head.y)) {
    alive = false
    playSound(score > best ? "win" : "lose", 0.6)
    if (score > best) {
      best = score
      save("best", best)        // still there the next time you play
    }
    return
  }
  snake.unshift(head)           // a new head at the front
  if (head.x === apple.x && head.y === apple.y) {
    score += 1
    playSound("coin", 0.5, { pitch: Math.min(score, 12) })   // each apple a little higher, up to an octave
    moveApple()
  } else {
    snake.pop()                 // and the tail moves up, unless it has just eaten
  }
}

function update(dt) {
  if (!alive || waiting) return
  timer += dt
  if (timer >= 0.15) {          // a step every 0.15 seconds: smaller is faster
    timer = 0
    step()
  }
}

function square(x, y, colour) {
  rect(x * SQUARE + 1, y * SQUARE + 1, SQUARE - 2, SQUARE - 2, colour, { round: 5 })
}

function draw() {
  background("dimgray")
  rect(0, 0, columns * SQUARE, rows * SQUARE, "midnightblue")
  square(apple.x, apple.y, "tomato")
  for (const part of snake) square(part.x, part.y, "mediumseagreen")
  square(snake[0].x, snake[0].y, "palegreen")
  text("Score " + score, 12, 30, "white", 20, "left")
  text("Best " + best, width - 12, 30, "gold", 20, "right")
  if (waiting) text("Press an arrow key or tap to start", width / 2, height / 2 + 60, "white", 18, "centre")
  if (!alive) {
    text("Game over", width / 2, height / 2, "white", 32, "centre")
    text("Tap or press space to play again", width / 2, height / 2 + 40, "white", 18, "centre")
  }
}

newGame()
