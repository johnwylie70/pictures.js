// Code-along: a 12 second lesson. A circle is typed in three
// stages, and beside the code is what each stage really draws.
// Same code for a wide video and a tall one: the code goes
// beside the preview, or above it.
// Try changing: the stages; duration; typingSpeed.
//
// Run it:   pictures run code_along_circle.js

// The three stages. Each types only what changed.
const stages = [
  {
    code: `function draw() {
  background("navy")
}`,
  },
  {
    code: `function draw() {
  background("navy")
  let x = width / 2
  let y = height / 2
  circle(x, y, 80, "gold")
}`,
  },
  {
    code: `let r = 20

function update(dt) {
  r += 60 * dt
}
function draw() {
  background("navy")
  let x = width / 2
  let y = height / 2
  circle(x, y, r, "gold")
}`,
    hold: 2.5,
  },
]

function draw() {
  // The dark blue of the house style.
  background("#0b1020")

  // Points at a line of the code while it is on screen.
  const callouts = [
    { at: 6.4, line: 3, text: "half the width", duration: 2 },
  ]

  codeAlong({ stages, start: 0, duration: 12, callouts })
}
