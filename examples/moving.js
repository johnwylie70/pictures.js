// Moving: a circle that crosses the picture, again and again.
// Try changing: 200, its speed; 40, its size.
//
// Run it:   pictures run moving.js

let x = 0

function update(dt) {
  x += 200 * dt              // 200 points every second
  if (x > width) x = 0       // off the right edge: start again on the left
}

function draw() {
  background("midnightblue")
  circle(x, height / 2, 40, "gold")
}
