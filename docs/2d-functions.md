# 2D Functions

Full reference: [www.circuitry.dev/docs/pictures/2d-functions](https://www.circuitry.dev/docs/pictures/2d-functions) (in Circuitry Studio's help)

Every function and setting of the 2D drawing surface, `ctx`, grouped by job, one line each. `ctx` is the browser's own 2D drawing surface, so these are its standard names. After each group there is a short program you can run.

New to drawing? Start with [Drawing in 2D](drawing-2d.md), which explains the ideas, and come back here to look things up. Colours have a page of their own: [Colours](colours.md).

**A note on answers.** Almost every call here just draws. A few give you an answer back (a width, a yes or no, some pixels). The answer comes back at once, as an ordinary value: `const w = ctx.measureText("hi").width`. There is no `await` and no waiting a frame. See [reading a value back](program-shape.md#reading-a-value-back).

## Plain drawing

Functions for a first picture, one call each, with no `ctx.` in front ([the quick way](drawing-2d.md#the-quick-way-plain-functions)). A colour that is left out is the one already in use; one that is given stays for what is drawn next.

| Call | What it draws |
|---|---|
| `background(colour)` | Paints the whole canvas. It leaves the colour in use as it was. With no colour it wipes the canvas clear |
| `circle(x, y, radius, colour)` | A filled circle centred on `x, y` |
| `ellipse(x, y, width, height, colour)` | An oval centred on `x, y` |
| `rect(x, y, width, height, colour)` | A filled rectangle, top-left corner at `x, y`. `{ round: 12 }` rounds its corners |
| `triangle(x1, y1, x2, y2, x3, y3, colour)` | A triangle, by its three corners |
| `polygon(x, y, radius, sides, colour)` | A shape with that many equal sides, centred on `x, y`, one corner straight up |
| `star(x, y, radius, points, colour)` | A star with that many points, one straight up. Its inner corners are 0.4 of the radius out; `{ inner: 0.6 }` changes that |
| `line(x1, y1, x2, y2, colour, thickness)` | A straight line |
| `text(words, x, y, colour, size, align)` | Words, `size` points high. `align` is `"left"` (as it starts), `"right"` or `"centre"`; with `"centre"`, `x, y` is the middle of the words |
| `picture(what, x, y, size)` | An emoji or a word, an image file beside the program, or a loaded image, centred on `x, y` and `size` high (48 unless you say). A file draws once it has loaded |

Every shape (`circle`, `ellipse`, `rect`, `triangle`, `polygon`, `star`) takes `{ outline: "white", thickness: 3 }` last. With a colour it is a filled shape with a border; without a colour it is the edge alone. The outline's colour and thickness stay for the next outline.

| Call | What it gives |
|---|---|
| `random(min, max)` | A whole number from `min` to `max`, either end included. If an end has a fraction, any number between them |
| `random(max)`, `random()` | From 0 to `max`; with nothing, a fraction from 0 up to 1 |
| `pick(list)` | One thing from a list, by chance |
| `degrees(n)` | An angle said in degrees, wherever an angle is wanted: `ctx.rotate(degrees(45))`, `ship.angle = degrees(90)`. Everything else here counts angles in radians |

Everything below is `ctx`, which does all of this and much more.

## Size and helpers

These come ready to use, as well as `ctx`:

| Name | What it is |
|---|---|
| `width`, `height` | The size of the canvas, in points. They change when the canvas is resized. |
| `pixelRatio` | Real pixels per point (2 or 3 on most phones). Needed only for pixel and hit-test calls below. |
| `canvas` | The canvas, for `canvas.addEventListener(...)` |
| `await frame()` | Waits for the next frame, so this one is shown |
| `await flush()` | The same as `frame()`: shows what is drawn so far and carries on at the next frame |
| `await sleep(seconds)` | Waits that long |
| `keys` | The set of keys held down: `keys.has("ArrowLeft")`. Also `keys.shift`, `keys.ctrl`, `keys.alt`, `keys.meta`, and `keys.codes` (keys by their place: `"KeyW"`) |
| `pressed`, `released` | The keys that went down, and came up, since the last frame: `pressed.has(" ")` |
| `mouse.x`, `mouse.y`, `mouse.down` | Where the pointer or finger is, and whether it is pressed |
| `mouse.button`, `mouse.inside` | Which button is down (`"left"`, `"middle"`, `"right"` or `null`), and whether the pointer is over the scene |
| `mouse.dx`, `mouse.dy`, `mouse.wheel` | How far the pointer moved, and the wheel turned, since the last frame |
| `touches` | Every finger (or pressed mouse button) that is down: each has `id`, `x`, `y`, `startX`, `startY`, `dx`, `dy`, `type` |
| `pinch.scale`, `pinch.change`, `pinch.x`, `pinch.y` | Two fingers as a zoom: the scale since the pinch began, its change since the last frame, and its middle |
| `loadImage(address)` | Loads a picture to draw ([Images](#images)) |
| `await loadText(path)`, `await loadJSON(path)` | The text of a file beside the scene, or its JSON as a value. A file the scene has written itself comes first |
| `await saveText(path, text)`, `await saveJSON(path, value)` | Write a file, for `loadText` and `loadJSON` to read the next time ([Files and databases](files-and-databases.md)) |
| `await openDatabase(name)` | A SQLite database: `await db.query(sql, ...values)` gives a list of rows, `await db.run(sql, ...values)` changes it, `await db.close()` finishes ([Files and databases](files-and-databases.md)) |
| `save(name, value)`, `load(name, otherwise)` | Keep a value for the next time the program runs, and get it back: a number, text, `true` or `false`, a list or an object ([Saved values](saved-values.md)) |
| `new Sprite(picture, x, y, size)` | A moving picture with `x`, `y`, `vx`, `vy`, `angle`, `spin`, `size`, `visible`, `update(dt)` and `draw()`. The picture is an emoji, an image, or a function that draws it, given the sprite's size ([Sprites](drawing-2d.md#sprites)) |
| `Sprite.box(x, y, width, height, colour)`, `Sprite.circle(x, y, size, colour)` | A plain coloured box or circle, hit-tested as the shape you see |
| `sprite.touches(other)`, `sprite.hit(list)`, `sprite.contains(x, y)` | Do two sprites overlap; the first sprite in a list that it touches, or `null`; is a point on it. A sprite's `shape` is `"circle"` or `"box"` ([Sprites that touch](drawing-2d.md#sprites-that-touch)) |
| `sprite.wrap()`, `sprite.bounce()`, `sprite.offscreen()` | Come back on the opposite edge; bounce off the edges, or the ones named; is all of it outside the picture |
| `sprite.push(amount)`, `sprite.forward(distance)`, `sprite.limit(speed)` | Speed up the way it faces; step the way it faces; never faster than this |
| `sprite.angleTo(other)`, `sprite.distanceTo(other)` | The angle and the distance to another sprite, to `mouse`, or to a point `(x, y)` |
| `remove(list, thing)` | Take a thing out of a list. Loop over a copy while removing: `for (const rock of [...rocks])` |

Everything else the page has is there as in any JavaScript, such as `Path2D`, `ImageData` and `document`.

## Rectangles

| Call | What it does |
|---|---|
| `ctx.fillRect(x, y, w, h)` | A filled rectangle, top-left corner at `x, y` |
| `ctx.strokeRect(x, y, w, h)` | The outline of a rectangle |
| `ctx.clearRect(x, y, w, h)` | Rubs that area out, back to see-through |

## Paths

A path is a shape you build from pieces and then fill, outline, or cut with.

| Call | What it does |
|---|---|
| `ctx.beginPath()` | Starts a new, empty path. Forgetting it joins your new shape to the last one. |
| `ctx.moveTo(x, y)` | Lifts the pen and puts it down at `x, y` |
| `ctx.lineTo(x, y)` | A straight line to `x, y` |
| `ctx.closePath()` | A straight line back to where this piece started |
| `ctx.rect(x, y, w, h)` | A rectangle, as part of the path |
| `ctx.roundRect(x, y, w, h, r)` | A rounded rectangle. `r` can be one radius or a list of up to four, one per corner. |
| `ctx.arc(x, y, r, start, end)` | Part of a circle round `x, y`, from angle `start` to `end` in radians (`0` to `Math.PI * 2` is all of it). Add `true` to go anticlockwise. |
| `ctx.arcTo(x1, y1, x2, y2, r)` | A rounded corner of radius `r`, turning at `x1, y1` towards `x2, y2` |
| `ctx.ellipse(x, y, rx, ry, turn, start, end)` | Part of an oval, `rx` wide and `ry` tall, turned by `turn` radians |
| `ctx.quadraticCurveTo(cx, cy, x, y)` | A curve to `x, y`, pulled towards one control point |
| `ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` | A curve to `x, y` with two control points |
| `ctx.fill()` | Fills the path. `ctx.fill("evenodd")` leaves holes where shapes overlap. |
| `ctx.stroke()` | Draws the path's outline |

```js
function draw() {
  ctx.fillStyle = "#f6f3ec"
  ctx.fillRect(0, 0, width, height)
  ctx.lineWidth = 4
  ctx.strokeStyle = "#333"

  ctx.fillStyle = "tomato"
  ctx.fillRect(20, 20, 100, 70)               // fillRect
  ctx.strokeRect(140, 20, 100, 70)            // strokeRect

  ctx.beginPath()                             // roundRect, different corners
  ctx.roundRect(260, 20, 100, 70, [30, 4, 30, 4])
  ctx.fillStyle = "gold"
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()                             // arc: three-quarters of a circle
  ctx.moveTo(70, 165)
  ctx.arc(70, 165, 50, 0, Math.PI * 1.5)
  ctx.closePath()
  ctx.fillStyle = "mediumseagreen"
  ctx.fill()

  ctx.beginPath()                             // ellipse, turned 20 degrees
  ctx.ellipse(190, 165, 60, 30, 20 * Math.PI / 180, 0, Math.PI * 2)
  ctx.fillStyle = "deepskyblue"
  ctx.fill()

  ctx.beginPath()                             // arcTo: a rounded corner
  ctx.moveTo(260, 120)
  ctx.arcTo(360, 120, 360, 220, 40)
  ctx.lineTo(360, 220)
  ctx.stroke()

  ctx.beginPath()                             // quadratic and bezier curves
  ctx.moveTo(20, 290)
  ctx.quadraticCurveTo(110, 220, 200, 290)
  ctx.bezierCurveTo(240, 220, 320, 360, 380, 270)
  ctx.strokeStyle = "orchid"
  ctx.stroke()
}
```

## Colours and styles

| Call or setting | What it does |
|---|---|
| `ctx.fillStyle = …` | The colour, gradient or pattern for fills and filled text |
| `ctx.strokeStyle = …` | The same, for outlines |
| `ctx.globalAlpha = 0.5` | How solid everything drawn next is, from 0 (invisible) to 1 |
| `ctx.createLinearGradient(x0, y0, x1, y1)` | A gradient along a line |
| `ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)` | A gradient between two circles |
| `ctx.createConicGradient(angle, x, y)` | A gradient round a point, like a colour wheel |
| `gradient.addColorStop(position, colour)` | A colour at a point (0 to 1) along a gradient |
| `ctx.createPattern(picture, "repeat")` | A repeating fill from a picture or another canvas. Also `"repeat-x"`, `"repeat-y"`, `"no-repeat"`. |

Every colour form, with examples of gradients and patterns, is on the [Colours](colours.md) page.

## Lines

| Call or setting | What it does |
|---|---|
| `ctx.lineWidth = 4` | How thick outlines are, in points |
| `ctx.lineCap = "round"` | How line ends look: `"butt"` (flat, stops at the end), `"round"`, `"square"` (flat, sticks out by half the width) |
| `ctx.lineJoin = "round"` | How corners look: `"miter"` (sharp), `"round"`, `"bevel"` (cut off) |
| `ctx.miterLimit = 10` | How far a sharp corner may stick out before it is cut off like a bevel |
| `ctx.setLineDash([10, 5])` | Dashes: 10 drawn, 5 gap. Longer lists make patterns. `[]` is solid. |
| `ctx.getLineDash()` | The current dash list |
| `ctx.lineDashOffset = 4` | Slides the dashes along. Change it each frame for "marching ants". |

```js
let t = 0

function update(dt) {
  t += dt
}

// one straight line, in the style set now
function line(x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "#333"
  ctx.font = "14px sans-serif"

  // lineCap: the thin red lines show where each line really ends
  const caps = ["butt", "round", "square"]
  for (let i = 0; i < caps.length; i++) {
    const y = 30 + i * 40
    ctx.lineWidth = 18
    ctx.lineCap = caps[i]
    ctx.strokeStyle = "steelblue"
    line(40, y, 200, y)
    ctx.fillText(caps[i], 225, y + 5)
  }
  ctx.lineCap = "butt"
  ctx.lineWidth = 1
  ctx.strokeStyle = "red"
  line(40, 10, 40, 125)
  line(200, 10, 200, 125)

  // lineJoin
  const joins = ["miter", "round", "bevel"]
  for (let i = 0; i < joins.length; i++) {
    const x = 40 + i * 120
    ctx.lineWidth = 18
    ctx.lineJoin = joins[i]
    ctx.strokeStyle = "darkorange"
    ctx.beginPath()
    ctx.moveTo(x, 230)
    ctx.lineTo(x + 40, 160)
    ctx.lineTo(x + 80, 230)
    ctx.stroke()
    ctx.fillText(joins[i], x + 20, 260)
  }

  // dashes, and dashes that march
  ctx.lineWidth = 4
  ctx.strokeStyle = "#333"
  const dashes = [[12, 6], [2, 6], [16, 4, 2, 4]]
  for (let i = 0; i < dashes.length; i++) {
    ctx.setLineDash(dashes[i])
    ctx.lineDashOffset = i === 0 ? -t * 20 : 0
    line(40, 290 + i * 25, 340, 290 + i * 25)
  }
  ctx.setLineDash([])
}
```

## Text

| Call or setting | What it does |
|---|---|
| `ctx.fillText(text, x, y)` | Draws text. Add a fourth number to squeeze it into that width. |
| `ctx.strokeText(text, x, y)` | Draws the outline of the text |
| `ctx.measureText(text).width` | How wide the text will be, in points, in the font set now. The answer also has `actualBoundingBoxAscent` and `actualBoundingBoxDescent` (how far it reaches above and below `y`). |
| `ctx.font = "bold 24px serif"` | Style, size and family. Families that always work: `sans-serif`, `serif`, `monospace`, `system-ui`, `cursive`. Add `italic` or `bold` at the front. |
| `ctx.textAlign = "center"` | Where `x` is: `"left"`, `"center"`, `"right"`, or `"start"`/`"end"` (which follow the writing direction) |
| `ctx.textBaseline = "middle"` | Where `y` is: `"alphabetic"` (the line letters sit on, the default), `"top"`, `"hanging"`, `"middle"`, `"ideographic"`, `"bottom"` |
| `ctx.direction = "rtl"` | Writing direction: `"ltr"`, `"rtl"` or `"inherit"` |
| `ctx.letterSpacing = "4px"` | Extra space between letters (older devices ignore it) |
| `ctx.wordSpacing = "10px"` | Extra space between words (older devices ignore it) |
| `ctx.fontKerning = "none"` | Whether letter pairs are fitted closer: `"auto"`, `"normal"`, `"none"` |

Emoji are text, so `ctx.fillText("🚀", x, y)` draws a rocket. Text has no line wrapping; draw each line yourself, a line height apart.

```js
function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.font = "20px sans-serif"

  // textAlign: the red line is x
  ctx.strokeStyle = "red"
  ctx.beginPath()
  ctx.moveTo(200, 10)
  ctx.lineTo(200, 110)
  ctx.stroke()
  ctx.fillStyle = "#222"
  const aligns = ["left", "center", "right"]
  for (let i = 0; i < aligns.length; i++) {
    ctx.textAlign = aligns[i]
    ctx.fillText(`textAlign ${aligns[i]}`, 200, 35 + i * 30)
  }

  // textBaseline: the red line is y
  ctx.textAlign = "left"
  ctx.beginPath()
  ctx.moveTo(10, 170)
  ctx.lineTo(width - 10, 170)
  ctx.stroke()
  ctx.font = "16px sans-serif"
  const bases = ["top", "middle", "alphabetic", "bottom"]
  for (let i = 0; i < bases.length; i++) {
    ctx.textBaseline = bases[i]
    ctx.fillText(bases[i], 15 + i * 105, 170)
  }
  ctx.textBaseline = "alphabetic"

  // outline, spacing, squeezing
  ctx.font = "bold 40px serif"
  ctx.lineWidth = 1.5
  ctx.strokeStyle = "navy"
  ctx.strokeText("Outline", 15, 250)
  ctx.font = "18px monospace"
  ctx.letterSpacing = "6px"
  ctx.fillText("SPACED", 230, 250)
  ctx.letterSpacing = "0px"
  ctx.fillText("This sentence is squeezed into 200 points", 15, 290, 200)
}
```

## Images

| Call or setting | What it does |
|---|---|
| `const img = loadImage(address)` | Starts loading a picture from a path beside the scene (`"cat.png"`), a web address or a `data:` address. It draws once loaded. |
| `ctx.drawImage(img, x, y)` | Draws it at its own size, top-left at `x, y` |
| `ctx.drawImage(img, x, y, w, h)` | Draws it stretched to `w` by `h` |
| `ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)` | Cuts the part `sx, sy, sw, sh` out of the picture and draws it at `x, y, w, h`. This is how sprite sheets work. |
| `ctx.imageSmoothingEnabled = false` | Keeps pixel art crisp and blocky when scaled up |
| `ctx.imageSmoothingQuality = "high"` | How carefully pictures are smoothed: `"low"`, `"medium"`, `"high"` |

`drawImage` can draw another canvas too, not only a picture. Make one with `document.createElement("canvas")`, draw on its own `getContext("2d")`, and use it like an image.

```js
// a 4 x 4 pixel picture: a PNG file written out as text, so it needs no file
const face = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR42mP4f50BjsAYDKAc7DIAeNIWCUSCv7wAAAAASUVORK5CYII=")

function draw() {
  ctx.fillStyle = "#dde"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(face, 20, 20)                           // its own size: tiny
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(face, 50, 20, 120, 120)                 // stretched, smoothed
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(face, 190, 20, 120, 120)                // stretched, crisp
  ctx.drawImage(face, 0, 0, 2, 2, 330, 20, 120, 120)    // just the top-left quarter
}
```

## Transforms

A transform moves, turns or stretches the drawing grid, so everything drawn after it is moved, turned or stretched too.

| Call | What it does |
|---|---|
| `ctx.translate(x, y)` | Moves the grid's corner `(0, 0)` to `x, y` |
| `ctx.rotate(angle)` | Turns the grid round `(0, 0)` by `angle` radians, clockwise |
| `ctx.scale(sx, sy)` | Stretches the grid. A negative number flips it, so `ctx.scale(-1, 1)` makes a mirror image. |
| `ctx.transform(a, b, c, d, e, f)` | Applies any stretch, slant and move at once. `ctx.transform(1, 0, 0.5, 1, 0, 0)` slants things sideways. |
| `ctx.save()` | Remembers the transform and every setting on this page |
| `ctx.restore()` | Goes back to what the last `save()` remembered |
| `ctx.setTransform(a, b, c, d, e, f)` | Replaces the transform completely |
| `ctx.resetTransform()` | Clears the transform |
| `ctx.getTransform()` | The current transform, with its numbers as `a` to `f` |

**Use `save()` and `restore()` rather than `setTransform` or `resetTransform`.** The canvas starts with its own scale so drawing is sharp on high-resolution screens, and those two calls remove it: afterwards everything draws `pixelRatio` times too small. If you do use them, put the scale back with `ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)`.

```js
// an arrow drawn round (0, 0), pointing right
function arrow() {
  ctx.beginPath()
  ctx.moveTo(-30, -10)
  ctx.lineTo(10, -10)
  ctx.lineTo(10, -22)
  ctx.lineTo(35, 0)
  ctx.lineTo(10, 22)
  ctx.lineTo(10, 10)
  ctx.lineTo(-30, 10)
  ctx.closePath()
  ctx.fill()
}

const steps = [
  ["as drawn", () => {}],
  ["rotate", () => ctx.rotate(-45 * Math.PI / 180)],
  ["scale", () => ctx.scale(1.5, 0.6)],
  ["mirror", () => ctx.scale(-1, 1)],
  ["slant", () => ctx.transform(1, 0, 0.8, 1, 0, 0)],
]

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.font = "14px sans-serif"
  ctx.textAlign = "center"
  for (let i = 0; i < steps.length; i++) {
    const [name, change] = steps[i]
    ctx.save()
    ctx.translate(55 + i * 90, 80)      // move to this slot
    change()
    ctx.fillStyle = `hsl(${i * 60}, 70%, 50%)`
    arrow()
    ctx.restore()                       // back to normal for the label
    ctx.fillStyle = "#333"
    ctx.fillText(name, 55 + i * 90, 150)
  }
}
```

## Shadows

| Setting | What it does |
|---|---|
| `ctx.shadowColor = "rgba(0, 0, 0, 0.5)"` | The shadow's colour. A see-through colour looks most natural. Shadows are off until this is set. |
| `ctx.shadowBlur = 10` | How soft the shadow is. 0 is a hard edge. |
| `ctx.shadowOffsetX = 5` | How far right the shadow falls |
| `ctx.shadowOffsetY = 5` | How far down the shadow falls |

A coloured shadow with no offset makes a glow.

```js
function draw() {
  ctx.fillStyle = "#eef"
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  const blurs = [0, 8, 24]
  for (let i = 0; i < blurs.length; i++) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
    ctx.shadowBlur = blurs[i]
    ctx.shadowOffsetX = 8
    ctx.shadowOffsetY = 8
    ctx.fillStyle = "tomato"
    ctx.fillRect(30 + i * 130, 30, 90, 90)
  }
  // a glow: coloured shadow, no offset
  ctx.shadowColor = "deepskyblue"
  ctx.shadowBlur = 30
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.fillStyle = "white"
  ctx.beginPath()
  ctx.arc(200, 210, 40, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()                // shadows off again
}
```

## Blending and filters

| Setting | What it does |
|---|---|
| `ctx.globalCompositeOperation = "multiply"` | How new drawing mixes with what is already there. Set it back to `"source-over"` when you are done. |
| `ctx.filter = "blur(4px)"` | An effect on everything drawn next. Set back to `"none"`. |

The blend modes:

| Mode | What you see |
|---|---|
| `source-over` | The new drawing on top. The normal one. |
| `destination-over` | The new drawing behind what is there |
| `source-in` | The new drawing, only where it overlaps the old; the rest is wiped |
| `source-out` | The new drawing, only where it does **not** overlap; the rest is wiped |
| `source-atop` | The new drawing, only on top of the old; the old stays |
| `destination-in` | The old drawing, only where the new one overlaps it |
| `destination-out` | Rubs out the old drawing where the new one goes, like an eraser |
| `destination-atop` | The old drawing, only inside the new one, which shows behind |
| `lighter` | Adds the colours together, so overlaps get brighter. Good for glows and fire. |
| `copy` | Only the new drawing; everything else is wiped |
| `xor` | Both, with the overlap cut out |
| `multiply` | Darkens, like overlapping inks |
| `screen` | Lightens, like overlapping lights |
| `overlay`, `soft-light`, `hard-light` | Boost contrast in different strengths |
| `darken`, `lighten` | Keeps whichever is darker, or lighter |
| `color-dodge`, `color-burn` | Brightens, or darkens, strongly |
| `difference`, `exclusion` | Inverts where the colours differ |
| `hue`, `saturation`, `color`, `luminosity` | Takes one quality from the new colour and the rest from the old |

Filters, which can be combined with spaces (`"blur(2px) grayscale(1)"`): `blur(4px)`, `brightness(1.5)`, `contrast(2)`, `grayscale(1)`, `sepia(1)`, `saturate(3)`, `hue-rotate(90deg)`, `invert(1)`, `opacity(0.5)` and `drop-shadow(4px 4px 4px black)`.

This program draws every blend mode: a blue square first, then a red circle over it with that mode.

```js
const modes = ["source-over", "destination-over", "source-in", "source-out", "source-atop",
  "destination-in", "destination-out", "destination-atop", "lighter", "copy", "xor",
  "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn",
  "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]

// Each mode gets its own little canvas, so one mode can't affect the others.
const tiles = modes.map((mode) => {
  const tile = document.createElement("canvas")
  tile.width = 80
  tile.height = 80
  const t = tile.getContext("2d")
  t.fillStyle = "royalblue"
  t.fillRect(5, 5, 45, 45)
  t.globalCompositeOperation = mode
  t.fillStyle = "crimson"
  t.beginPath()
  t.arc(48, 48, 26, 0, Math.PI * 2)
  t.fill()
  return tile
})

function draw() {
  ctx.fillStyle = "#eee"
  ctx.fillRect(0, 0, width, height)
  ctx.font = "10px sans-serif"
  ctx.textAlign = "center"
  ctx.fillStyle = "#222"
  for (let i = 0; i < modes.length; i++) {
    const x = 10 + (i % 7) * 92
    const y = 10 + Math.floor(i / 7) * 100
    ctx.drawImage(tiles[i], x, y)
    ctx.fillText(modes[i], x + 40, y + 92)
  }
}
```

## Clipping and hit testing

| Call | What it does |
|---|---|
| `ctx.clip()` | Makes the current path a window: everything drawn next shows only inside it. Wrap it in `save()`/`restore()` to undo it. |
| `ctx.isPointInPath(x, y)` | Whether a point is inside the current path: `true` or `false` |
| `ctx.isPointInStroke(x, y)` | Whether a point is on the path's outline |

The point for `isPointInPath` and `isPointInStroke` is in real pixels: multiply your `x` and `y` by `pixelRatio`. For simple shapes it is just as easy to do the sum yourself, such as `(x - cx) ** 2 + (y - cy) ** 2 < r * r` for a circle.

```js
let message = "Click inside or outside the star"

function starPath() {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 110 : 45
    const a = i * Math.PI / 5 - Math.PI / 2
    ctx.lineTo(200 + r * Math.cos(a), 160 + r * Math.sin(a))
  }
  ctx.closePath()
}

function onMouseDown(x, y) {
  starPath()
  const inside = ctx.isPointInPath(x * pixelRatio, y * pixelRatio)
  message = inside ? "Inside the star!" : "Outside the star"
}

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  starPath()
  ctx.clip()                                // only the star shows from here...
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `hsl(${i * 30}, 80%, 55%)`
    ctx.fillRect(0, i * 25, width, 25)      // ...so stripes become a striped star
  }
  ctx.restore()
  ctx.fillStyle = "#333"
  ctx.font = "18px sans-serif"
  ctx.fillText(message, 20, 310)
}
```

## Paths you can keep: Path2D

`new Path2D()` makes a path object you build once and draw many times. It takes the same pieces as `ctx` (`moveTo`, `lineTo`, `arc`, `rect`, `roundRect`, `ellipse`, `bezierCurveTo`…). It can also be made from SVG path text, such as `new Path2D("M10 10 h 80 v 80 h -80 Z")`, which is handy for copying shapes from drawing programs.

| Call | What it does |
|---|---|
| `ctx.fill(path)` | Fills that path |
| `ctx.stroke(path)` | Outlines it |
| `ctx.clip(path)` | Clips to it |
| `ctx.isPointInPath(path, x, y)` | Whether a point is inside it |
| `path.addPath(other)` | Adds another path's pieces to this one |

```js
const heart = new Path2D("M 0 -12 C -8 -28 -36 -24 -36 -2 C -36 18 -10 30 0 40 C 10 30 36 18 36 -2 C 36 -24 8 -28 0 -12 Z")
const ring = new Path2D()
ring.arc(0, 0, 30, 0, Math.PI * 2)

function draw() {
  ctx.fillStyle = "#fff5f7"
  ctx.fillRect(0, 0, width, height)
  for (let i = 0; i < 5; i++) {
    ctx.save()
    ctx.translate(60 + i * 75, 80)
    ctx.scale(0.6 + i * 0.15, 0.6 + i * 0.15)
    ctx.fillStyle = `hsl(${340 + i * 8}, 80%, ${65 - i * 6}%)`
    ctx.fill(heart)
    ctx.restore()
    ctx.save()
    ctx.translate(60 + i * 75, 200)
    ctx.lineWidth = 2 + i * 2
    ctx.strokeStyle = "slateblue"
    ctx.stroke(ring)
    ctx.restore()
  }
}
```

## Pixels

| Call | What it does |
|---|---|
| `ctx.getImageData(x, y, w, h).data` | The colours of every pixel in that area, as one long list: red, green, blue, alpha (0 to 255) for each pixel in turn |
| `ctx.createImageData(w, h)` | A blank block of pixels |
| `ctx.putImageData(pixels, x, y)` | Puts a block of pixels straight onto the canvas, ignoring transforms, alpha and blend modes |
| `new ImageData(new Uint8ClampedArray(numbers), w, h)` | Makes a block of pixels from a list of numbers |

Pixel positions and sizes here are in **real pixels**, not points, so multiply by `pixelRatio` to match your drawing. Reading pixels copies every one of them, so it is slow for big areas: use pixels for small areas or one-off effects, and drawing calls for everything else. The browser refuses to read pixels from a canvas that has had a picture from another website drawn on it.

```js
// a small pattern made pixel by pixel, then shown big
const size = 32
const numbers = []
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    numbers.push(x * 8, y * 8, (x ^ y) * 8, 255)     // red, green, blue, alpha
  }
}
const pixels = new ImageData(new Uint8ClampedArray(numbers), size, size)

// put it on a small canvas, so it can be drawn scaled up
const tile = document.createElement("canvas")
tile.width = size
tile.height = size
tile.getContext("2d").putImageData(pixels, 0, 0)

function draw() {
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(tile, 20, 20, 256, 256)
}
```

## Saving and resetting

| Call | What it does |
|---|---|
| `ctx.save()` | Remembers every setting on this page, the transform and the clip |
| `ctx.restore()` | Goes back to the last `save()` |
| `ctx.reset()` | Clears the canvas and puts every setting back to the start, including the canvas's sharp-screen scale; follow it with `ctx.scale(pixelRatio, pixelRatio)` |

`canvas.width` and `canvas.height` are the canvas's size in real pixels. You don't need to set them: the canvas keeps them matched to its size.

## Related

- [Drawing in 2D](drawing-2d.md): the ideas, with examples
- [Colours](colours.md)
- [3D functions](3d-functions.md)
