// Follow: a circle you move.
// Use: the left and right arrow keys, or hold the mouse button or a finger on the picture. Click it first, so it has the keyboard.
// Try changing: 300, its speed; 40, its size.
//
// Run it:   pictures run follow.js

let x = 200, y = 150

function update(dt) {
  if (keys.has("ArrowLeft")) x -= 300 * dt
  if (keys.has("ArrowRight")) x += 300 * dt
  if (mouse.down) {          // a mouse button, or a finger
    x = mouse.x
    y = mouse.y
  }
}

function draw() {
  background("midnightblue")
  circle(x, y, 40, "gold")
}
