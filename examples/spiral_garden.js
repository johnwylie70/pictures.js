// Spiral Garden: 200 coloured dots on a spiral, turning slowly and leaving trails.
// Try changing: 200, how many dots; 2.39996, the angle between one dot and the next (try 2.4, or 2); 0.2, how fast the trails fade.
//
// Run it:   pictures run spiral_garden.js

let t = 0

function update(dt) {
  t += dt
}

function draw() {
  ctx.fillStyle = "rgba(8, 8, 20, 0.2)"   // see-through, so the dots leave trails
  ctx.fillRect(0, 0, width, height)
  const cx = width / 2, cy = height / 2
  const spread = Math.min(width, height) / 32
  for (let i = 0; i < 200; i++) {
    const angle = i * 2.39996 + t * 0.5           // 2.39996 radians is the golden angle
    const r = Math.sqrt(i) * spread
    const size = 2 + 4 * Math.sin(i * 0.15 - t * 3) ** 2
    ctx.fillStyle = `hsl(${i * 1.5 + t * 40}, 90%, 60%)`
    ctx.beginPath()
    ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), size, 0, Math.PI * 2)
    ctx.fill()
  }
}
