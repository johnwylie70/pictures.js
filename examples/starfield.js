// Starfield: you fly through 300 stars.
// Use: hold the mouse button or a finger down to go faster.
// Try changing: 300, how many stars; 1.2 and 0.35, the fast and slow speeds.
//
// Run it:   pictures run starfield.js

function newStar(z = Math.random()) {
  return [Math.random() * 2 - 1, Math.random() * 2 - 1, z]
}

const stars = Array.from({ length: 300 }, () => newStar())

function update(dt) {
  const speed = mouse.down ? 1.2 : 0.35
  for (let i = 0; i < stars.length; i++) {
    stars[i][2] -= speed * dt
    if (stars[i][2] < 0.02) stars[i] = newStar(1)
  }
}

function draw() {
  ctx.fillStyle = "rgba(0, 0, 12, 0.4)"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "white"
  for (const [x, y, z] of stars) {
    const size = (1 - z) * 4
    ctx.fillRect(width / 2 + x / z * width / 2, height / 2 + y / z * height / 2, size, size)
  }
}
