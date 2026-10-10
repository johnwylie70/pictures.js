# Tutorial: A Live Chart

Full reference: [www.circuitry.dev/docs/pictures/tutorials/live-chart](https://www.circuitry.dev/docs/pictures/tutorials/live-chart) (in Circuitry Studio's help)

Draw charts straight from your data: first a bar chart from a list, then a line chart that updates as new readings arrive, with gridlines, labels and a readout that follows your finger or mouse. Because you draw every line yourself, the chart can look exactly the way you want.

## The idea: data space and screen space

Your data has its own units (degrees, pounds, visitors). The screen has points, with `y` counting **down**. A chart is a pair of small functions that turn one into the other:

```text
screen x = left  + (index / (count - 1)) * plot width
screen y = bottom - (value - lowest) / (highest - lowest) * plot height
```

The minus sign in the second line is what makes bigger values go **up**.

## 1. A bar chart from a list

```js
const sales = { Mon: 12, Tue: 19, Wed: 7, Thu: 15, Fri: 22, Sat: 30, Sun: 18 }

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)

  // the plot area, leaving room for labels
  const left = 50, right = width - 20, top = 56, bottom = height - 40
  const plotW = right - left, plotH = bottom - top
  const days = Object.keys(sales)
  const biggest = Math.max(...Object.values(sales))

  // title
  ctx.fillStyle = "#222"
  ctx.font = "bold 18px sans-serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText("Cups of coffee sold", left, 26)

  // gridlines and their numbers
  ctx.font = "12px sans-serif"
  ctx.textAlign = "right"
  ctx.textBaseline = "middle"
  for (let i = 0; i <= biggest; i += 5) {
    const y = bottom - i / biggest * plotH
    ctx.strokeStyle = "#e5e5e5"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(right, y)
    ctx.stroke()
    ctx.fillStyle = "#777"
    ctx.fillText(String(i), left - 8, y)
  }

  // one bar per day, with its name underneath
  const slot = plotW / days.length
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  for (let n = 0; n < days.length; n++) {
    const value = sales[days[n]]
    const barH = value / biggest * plotH
    const x = left + n * slot + slot * 0.15
    ctx.fillStyle = value < 20 ? "#2a9d8f" : "#e76f51"
    ctx.fillRect(x, bottom - barH, slot * 0.7, barH)
    ctx.fillStyle = "#444"
    ctx.fillText(days[n], x + slot * 0.35, bottom + 8)
  }
}
```

- `left`, `right`, `top` and `bottom` are the edges of the plot area, worked out from `width` and `height` every frame, so the chart fills the canvas at any size.
- Each gridline is placed with the same sum as the bars: `bottom - value / biggest * plotH`.
- `textAlign` and `textBaseline` line the labels up: numbers right-aligned beside the axis, day names centred under their bars. The title sets them back first, because `draw()` runs again every frame and they keep the values the last frame left them with.
- Bars of 20 or more are drawn in a second colour. Change the data and run again.

## 2. A live line chart

Now the data changes while you watch. Each frame `update` adds a new reading and drops the oldest, and `draw` plots whatever is in the list. Move the mouse over the chart, or touch it, to read off a value.

```js
const readings = []        // the last 200 readings
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
  const last = readings.length - 1

  // reading number -> screen x
  const sx = (i) => left + i / last * plotW
  // temperature -> screen y
  const sy = (v) => bottom - (v - low) / (high - low) * plotH

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
  for (let i = 0; i <= last; i++) ctx.lineTo(sx(i), sy(readings[i]))
  ctx.lineTo(sx(last), bottom)
  ctx.closePath()
  const shade = ctx.createLinearGradient(0, top, 0, bottom)
  shade.addColorStop(0, "rgba(56, 189, 248, 0.35)")
  shade.addColorStop(1, "rgba(56, 189, 248, 0)")
  ctx.fillStyle = shade
  ctx.fill()

  // the line itself
  ctx.beginPath()
  ctx.moveTo(sx(0), sy(readings[0]))
  for (let i = 1; i <= last; i++) ctx.lineTo(sx(i), sy(readings[i]))
  ctx.strokeStyle = "#38bdf8"
  ctx.lineWidth = 2
  ctx.lineJoin = "round"
  ctx.stroke()

  // title and the latest value
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = "white"
  ctx.font = "bold 18px sans-serif"
  ctx.fillText(`Temperature now: ${readings[last].toFixed(1)}°`, left, 30)

  // a readout where the pointer is
  if (mouse.x >= left && mouse.x <= right) {
    let i = Math.round((mouse.x - left) / plotW * last)
    i = Math.min(Math.max(i, 0), last)
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
```

What to notice:

- **`sx` and `sy`** are the two small functions from the top of the page. Every point on the chart goes through them, so changing `low` and `high` rescales everything at once.
- **The shaded area** is the same path as the line, closed down to the bottom edge and filled with a gradient that fades out.
- **The readout** uses `mouse.x`, which follows a finger on a touch screen too, to find the nearest reading.
- **`toFixed(1)`** writes a number with one digit after the point.
- The chart is drawn from scratch every frame, which is plenty fast for hundreds of points.

## Your own data

Anything JavaScript can produce can be charted this way: a list you typed in, numbers worked out in a loop, or a file beside the scene read with `await loadJSON("readings.json")`. To chart a fixed list, put it in place of `readings` and leave out `update`. To make it scale itself, use `Math.min(...readings)` and `Math.max(...readings)` for `low` and `high` in place of fixed numbers, adding a little margin so the line does not touch the edges.

## Try this

- Draw dots on the bar chart's values, or a line joining the tops of the bars.
- Plot two series in different colours, with a small key in a corner.
- Make the bar chart grow: keep a `grow` number that `update` takes from 0 to 1, and multiply every `barH` by it.

## Related

- [Drawing in 2D](../drawing-2d.md): paths, gradients and text
- [How a program is shaped](../program-shape.md): `update` and `draw`
- [Finding mistakes](../finding-mistakes.md)
