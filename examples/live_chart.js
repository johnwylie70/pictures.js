// Live Chart: a line chart of a made-up temperature, drawing itself as new readings arrive.
// Use: move the mouse over it to read a value.
// Try changing: 200, how many readings it keeps; low and high, the range the chart shows; 0.8, how fast the temperature swings.
//
// Run it:   pictures run live_chart.js
// Share it: pictures build live_chart.js -o site/

const readings = []          // the last 200 readings
let t = 0
let temperature = 20

function update(dt) {
  t += dt
  // a made-up sensor: a slow daily swing plus some noise
  temperature += (20 + 5 * Math.sin(t * 0.8) - temperature) * 0.05 + (Math.random() * 0.6 - 0.3)
  readings.push(temperature)
  if (readings.length > 200) readings.shift()
}

function draw() {
  ctx.fillStyle = "#0f172a"
  ctx.fillRect(0, 0, width, height)
  if (readings.length < 2) return

  const left = 50, right = width - 20, top = 50, bottom = height - 30
  const plotW = right - left, plotH = bottom - top
  const low = 10, high = 30                    // the range the chart shows

  const sx = (i) => left + i / (readings.length - 1) * plotW        // reading number -> screen x
  const sy = (v) => bottom - (v - low) / (high - low) * plotH       // temperature -> screen y

  // gridlines every 5 degrees
  ctx.font = "12px sans-serif"
  ctx.textAlign = "right"
  ctx.textBaseline = "middle"
  ctx.lineWidth = 1
  for (let v = low; v <= high; v += 5) {
    ctx.strokeStyle = "#1e293b"
    ctx.beginPath()
    ctx.moveTo(left, sy(v))
    ctx.lineTo(right, sy(v))
    ctx.stroke()
    ctx.fillStyle = "#94a3b8"
    ctx.fillText(`${v}°`, left - 8, sy(v))
  }

  // the shaded area under the line
  ctx.beginPath()
  ctx.moveTo(sx(0), bottom)
  readings.forEach((v, i) => ctx.lineTo(sx(i), sy(v)))
  ctx.lineTo(sx(readings.length - 1), bottom)
  ctx.closePath()
  const shade = ctx.createLinearGradient(0, top, 0, bottom)
  shade.addColorStop(0, "rgba(56, 189, 248, 0.35)")
  shade.addColorStop(1, "rgba(56, 189, 248, 0)")
  ctx.fillStyle = shade
  ctx.fill()

  // the line itself
  ctx.beginPath()
  readings.forEach((v, i) => {
    if (i === 0) ctx.moveTo(sx(i), sy(v))
    else ctx.lineTo(sx(i), sy(v))
  })
  ctx.strokeStyle = "#38bdf8"
  ctx.lineWidth = 2
  ctx.lineJoin = "round"
  ctx.stroke()

  // title and the latest value
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "white"
  ctx.font = "bold 18px sans-serif"
  ctx.fillText(`Temperature now: ${readings[readings.length - 1].toFixed(1)}°`, left, 30)

  // a readout where the pointer is
  if (left <= mouse.x && mouse.x <= right) {
    let i = Math.round((mouse.x - left) / plotW * (readings.length - 1))
    i = Math.min(Math.max(i, 0), readings.length - 1)
    const x = sx(i), y = sy(readings[i])
    ctx.strokeStyle = "#64748b"
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = "13px sans-serif"
    ctx.fillText(`${readings[i].toFixed(1)}°`, x + 8, y - 8)
  }
}
