// Bouncing Balls: balls of many colours fall, bounce and leave trails.
// Use: click or tap to add a ball.
// Try changing: 600, the pull of gravity; 0.85, how much speed a bounce keeps; 0.25, how fast the trails fade.
//
// Run it:   pictures run bouncing_balls.js
// Share it: pictures build bouncing_balls.js -o site/

const balls = []
const between = (low, high) => low + Math.random() * (high - low)

function addBall(x, y) {
  balls.push({
    x, y,
    vx: between(-220, 220), vy: between(-260, -60),
    r: between(10, 24),
    hue: Math.floor(between(0, 361)),
  })
}

for (let i = 0; i < 6; i++) addBall(between(40, 300), between(40, 200))

function onMouseDown(x, y) {
  addBall(x, y)
}

function update(dt) {
  for (const b of balls) {
    b.vy += 600 * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.x < b.r || b.x > width - b.r) {
      b.vx = -b.vx
      b.x = Math.max(b.r, Math.min(width - b.r, b.x))
    }
    if (b.y > height - b.r) {
      b.y = height - b.r
      b.vy = -b.vy * 0.85
    }
  }
}

function draw() {
  ctx.fillStyle = "rgba(10, 10, 20, 0.25)"
  ctx.fillRect(0, 0, width, height)
  for (const b of balls) {
    ctx.fillStyle = `hsl(${b.hue}, 80%, 60%)`
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fill()
  }
}
