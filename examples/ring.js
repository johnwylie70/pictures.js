// Ring: twelve circles of different colours in a ring.
// Try changing: 12, how many circles; 120, how wide the ring is; 20, the size of each circle.
//
// Run it:   pictures run ring.js

function draw() {
  background("midnightblue")
  for (let i = 0; i < 12; i++) {
    const x = width / 2 + 120 * Math.cos(i / 1.91)
    const y = height / 2 + 120 * Math.sin(i / 1.91)
    circle(x, y, 20, `hsl(${i * 30}, 80%, 60%)`)
  }
}
