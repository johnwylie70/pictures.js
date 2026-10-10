// First Game: stars fall, and you catch them in a basket for a point each.
// Use: move the mouse, or drag a finger, to move the basket.
// Try changing: 200, how fast the stars fall; 5, how many stars there are; the two emoji.
//
// Run it:   pictures run first_game.js

const basket = new Sprite("🧺", 200, 250, 64)
const stars = []
for (let i = 0; i < 5; i++) stars.push(new Sprite("⭐", random(400), random(300), 36))
let score = 0

function update(dt) {
  if (mouse.inside) basket.x = mouse.x   // the pointer is over the picture
  basket.y = height - 50
  for (const star of stars) {
    star.y += 200 * dt
    const caught = star.touches(basket)
    if (caught) score += 1
    if (caught || star.y > height) {   // caught or missed: back to the top
      star.x = random(width)
      star.y = 0
    }
  }
}

function draw() {
  background("midnightblue")
  for (const star of stars) star.draw()
  basket.draw()
  text("Score " + score, 12, 30, "white", 20)
}
