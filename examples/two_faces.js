// Two Faces: click, and two faces talk to each other.
// Each face has a voice of its own, one low and one high.
// The voices are your device's own: you hear them, but they
// are not recorded if you make a video.
// Try changing: the words; the voices to "robot", "slow" or
// "squeaky"; the colours.
//
// Run it:   pictures run two_faces.js

// Two speakers, each with a voice.
const sam = speaker({ voice: "deep" })
const pip = speaker({ voice: "squeaky" })

// Who says what. The lines wait for each other.
const script = [
  [sam, "Hello Pip! Guess what I had for breakfast?"],
  [pip, "Um... pancakes?"],
  [sam, "Nope. A whole bowl of socks!"],
  [pip, "Socks? That is silly! Did they taste good?"],
  [sam, "They were a little bit stinky."],
  [pip, "Ha ha ha! Tomorrow I will eat a hat."],
  [sam, "Great! I will bring the ketchup."],
]

// True while they are talking.
let busy = false

// A click starts the talk. Click again when it is over.
async function onMouseDown() {
  if (busy) return
  busy = true
  let end = 0
  for (const [who, words] of script) end = who.sayAt(words).end
  await sleep(end + 0.5)
  busy = false
}

// One face: it bounces and glows while it talks.
function face(x, y, r, who, color, eyes) {
  const top = y - who.level() * r * 0.2
  if (who.speaking()) {
    circle(x, top, r * 1.15, "rgba(255, 255, 255, 0.3)")
  }
  circle(x, top, r, color)

  // The eyes.
  const gap = r * 0.35
  circle(x - gap, top - r * 0.25, eyes, "white")
  circle(x + gap, top - r * 0.25, eyes, "white")
  circle(x - gap, top - r * 0.25, eyes / 2.5, "black")
  circle(x + gap, top - r * 0.25, eyes / 2.5, "black")

  // The mouth opens only for this face's voice.
  mouth(x, top + r * 0.4, {
    speaker: who, size: r * 0.7, style: "oval", color: "black",
  })
}

function draw() {
  background("midnightblue")

  // Side by side if wide, one above the other if tall.
  const wide = width > height
  const r = wide ? Math.min(height * 0.3, width * 0.2)
                 : Math.min(width * 0.28, height * 0.14)
  const one = wide ? [width * 0.27, height / 2]
                   : [width / 2, height * 0.3]
  const two = wide ? [width * 0.73, height / 2]
                   : [width / 2, height * 0.68]

  face(...one, r, sam, "gold", r * 0.12)
  face(...two, r, pip, "hotpink", r * 0.2)

  if (!busy) {
    text("Click to start", width / 2, height - 30,
      "white", height / 40, "centre")
  }
}
