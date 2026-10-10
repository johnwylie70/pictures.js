// Night Sky: stars, a moon, a hill and a house, drawn with the plain drawing functions alone.
// Try changing: 70, how many stars; the moon to another emoji; "sienna" and "maroon", the colours of the house.
//
// Run it:   pictures run night_sky.js
// Share it: pictures build night_sky.js -o site/

// The stars are placed once, by chance, and kept in a list.
// random() is a fraction from 0 to 1: how far across, and how far down.
const stars = []
for (let i = 0; i < 70; i++) {
  stars.push({ x: random(), y: random(), size: random(2, 6), colour: pick(["white", "lightyellow", "lightblue"]) })
}

function draw() {
  background("midnightblue")
  for (const s of stars) star(s.x * width, s.y * height * 0.7, s.size, 5, s.colour)
  picture("🌙", width - 90, 80, 70)

  // a hill: the top of a very wide oval
  ellipse(width / 2, height, width * 1.4, 220, "darkgreen")

  // a house on the hill
  const ground = height - 90
  const x = width / 2 - 60                  // the left edge of the house
  rect(x, ground - 80, 120, 80, "sienna")
  triangle(x - 15, ground - 80, x + 60, ground - 140, x + 135, ground - 80, "maroon")
  rect(x + 48, ground - 45, 24, 45, "saddlebrown", { round: 4 })
  rect(x + 14, ground - 62, 26, 24, "gold", { outline: "black", thickness: 2 })
  rect(x + 80, ground - 62, 26, 24, "gold", { outline: "black", thickness: 2 })
  circle(x + 67, ground - 22, 2, "gold")

  text("Good night", width / 2, 44, "white", 28, "centre")
}
