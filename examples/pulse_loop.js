// Pulse: a pink circle that grows and shrinks, written as a loop with `await frame()`. Every pass of the loop is one frame.
// Try changing: 60 + 40, its size and how much it changes; 0.05, how fast it pulses.
//
// Run it:   pictures run pulse_loop.js

let t = 0
while (true) {
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "hotpink"
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 60 + 40 * Math.sin(t), 0, Math.PI * 2)
  ctx.fill()
  t += 0.05
  await frame()
}
