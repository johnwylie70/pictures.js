// From Python, 2D: the Pyctures scene from_javascript_2d.py written in JavaScript. A square spins, and a click moves the circle.
// Use: click or tap.
// Try changing: 0.02, how fast the square turns; "Click me", the words.
//
// Run it:   pictures run from_python_2d.js
// Share it: pictures build from_python_2d.js -o site/

let angle = 0
ctx.font = "24px sans-serif"
const labelWidth = ctx.measureText("Click me").width

function draw() {
  ctx.fillStyle = "#123"
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(angle)
  ctx.fillStyle = "orange"
  ctx.fillRect(-50, -50, 100, 100)
  ctx.restore()

  ctx.fillStyle = "skyblue"
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "white"
  ctx.font = "24px sans-serif"
  ctx.fillText("Click me", (width - labelWidth) / 2, height - 40)
  angle += 0.02
}

canvas.addEventListener("click", (event) => {
  console.log("clicked at", event.offsetX, event.offsetY)
})
