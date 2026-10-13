// Star Catcher: a game with emoji sprites and sound. Catch the stars and dodge the rocks; you have three lives.
// Use: the left and right arrow keys, or drag. Space or a tap plays again.
// Try changing: 0.6, the seconds between new stars; 320, how fast the rocket moves; the emoji;
// "coin" to "blip" or "powerup" (the sounds are a line each: look for playSound).
//
// Run it:   pictures run star_catcher.js
// Share it: pictures build star_catcher.js -o site/

const player = new Sprite("🚀", 200, 400, 48)
let stars = []
let rocks = []
let score = 0
let lives = 3
let spawn = 0

const between = (low, high) => low + Math.random() * (high - low)

function reset() {
  score = 0
  lives = 3
  stars = []
  rocks = []
  player.x = width / 2
  player.y = height - 80
}

function drop(picture, size) {
  const s = new Sprite(picture, between(20, width - 20), -20, size)
  s.vy = between(120, 220)
  return s
}

function update(dt) {
  if (lives <= 0) {
    if (keys.has(" ") || mouse.down) {
      reset()
      playSound("powerup")
    }
    return
  }
  const speed = 320 * dt
  if (keys.has("ArrowLeft")) player.x -= speed
  if (keys.has("ArrowRight")) player.x += speed
  if (mouse.down) player.x = mouse.x
  player.x = Math.max(24, Math.min(width - 24, player.x))
  player.y = height - 80

  spawn -= dt
  if (spawn <= 0) {
    spawn = 0.6
    stars.push(drop("⭐", 32))
    if (Math.random() < 0.4) rocks.push(drop("🪨", 36))
  }

  for (const s of [...stars, ...rocks]) {
    s.update(dt)
    s.angle += dt
  }
  stars = stars.filter((s) => {
    if (s.touches(player)) {
      score += 1
      playSound("coin")
      return false
    }
    return s.y <= height + 30
  })
  rocks = rocks.filter((r) => {
    if (r.touches(player)) {
      lives -= 1
      playSound(lives > 0 ? "hit" : "lose")
      return false
    }
    return r.y <= height + 30
  })
}

function draw() {
  ctx.fillStyle = "#0b1020"
  ctx.fillRect(0, 0, width, height)
  for (const s of [...stars, ...rocks]) s.draw()
  player.draw()
  ctx.fillStyle = "white"
  ctx.font = "bold 20px system-ui"
  ctx.textAlign = "left"
  ctx.fillText(`Score ${score}   Lives ${"❤️".repeat(Math.max(0, lives))}`, 12, 30)
  if (lives <= 0) {
    ctx.textAlign = "center"
    ctx.font = "bold 32px system-ui"
    ctx.fillText("Game over", width / 2, height / 2)
    ctx.font = "18px system-ui"
    ctx.fillText("Tap or press space to play again", width / 2, height / 2 + 34)
  }
}

reset()
