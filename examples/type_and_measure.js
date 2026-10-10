// Typing: what you type appears in the middle, in a box drawn to fit the words.
// Use: click the picture, then type. Backspace rubs out.
// Try changing: "Type something", the words it starts with; 44px, the size of the letters.
//
// Run it:   pictures run type_and_measure.js
// Share it: pictures build type_and_measure.js -o site/

let text = "Type something"

function onKeyDown(key) {
  if (text === "Type something") text = ""
  if (key === "Backspace") text = text.slice(0, -1)
  else if (key === "Escape") text = ""
  else if (key.length === 1) text += key            // a letter, number, space or symbol
}

function draw() {
  ctx.font = "bold 44px system-ui, sans-serif"
  const textWidth = ctx.measureText(text).width

  ctx.fillStyle = "#101828"
  ctx.fillRect(0, 0, width, height)

  // a box that fits the text
  const boxW = Math.max(textWidth, 40) + 40
  ctx.fillStyle = "#1f2a44"
  ctx.fillRect((width - boxW) / 2, height / 2 - 44, boxW, 76)
  ctx.strokeStyle = "#7cc4ff"
  ctx.lineWidth = 2
  ctx.strokeRect((width - boxW) / 2, height / 2 - 44, boxW, 76)

  ctx.fillStyle = "white"
  ctx.font = "bold 44px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, width / 2, height / 2 - 6)

  ctx.font = "15px system-ui, sans-serif"
  ctx.fillStyle = "#9aa3b2"
  ctx.fillText(`${textWidth.toFixed(0)} points wide   ·   Backspace deletes, Escape clears`,
    width / 2, height / 2 + 60)
  const held = [...keys].map((k) => (k === " " ? "Space" : k)).sort().join(", ")
  ctx.fillText(`Keys held: ${held || "none"}`, width / 2, height - 30)
}
