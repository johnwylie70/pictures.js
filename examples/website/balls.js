// Bouncing balls, for the example web page (index.html beside this file).
// Use: click to add a ball.
// Try changing: 600, the pull of gravity; 8, how many balls it starts with.

const balls = []
const between = (low, high) => low + Math.random() * (high - low)

function addBall(x, y) {
  balls.push({ x, y, vx: between(-200, 200), vy: between(-250, -50), r: between(10, 22), hue: Math.floor(between(0, 361)) })
}

for (let i = 0; i < 8; i++) addBall(between(40, 300), between(40, 160))

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
  ctx.fillStyle = "rgba(16, 24, 40, 0.3)"
  ctx.fillRect(0, 0, width, height)
  for (const b of balls) {
    ctx.fillStyle = `hsl(${b.hue}, 80%, 60%)`
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
    ctx.fill()
  }
}
