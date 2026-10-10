# Drawing in 2D

Full reference: [www.circuitry.dev/docs/pictures/drawing](https://www.circuitry.dev/docs/pictures/drawing) (in Circuitry Studio's help)

A first picture takes a handful of plain functions, such as `background`, `circle`, `rect`, `line` and `text`. Everything else 2D is drawn through `ctx`, the canvas's own drawing surface. This page starts with those, then lists what `ctx` can do, grouped by job, with a short program for each group that you can paste into a `.js` file and run.

## The basics

- **Positions are in points**, measured from the **top-left corner**. `x` grows to the right and `y` grows **down**. The bottom-right corner is `(width, height)`.
- Drawing is sharp on every screen: the canvas takes care of high-resolution displays for you.
- **Say angles in degrees with `degrees()`.** Wherever an angle is wanted, write `degrees(90)` for a quarter turn or `degrees(360)` for a full one. The canvas itself counts angles in radians, where a full turn is `Math.PI * 2` (about 6.283); `degrees()` does the sum for you, so you never need to. Examples you find elsewhere, and the later parts of this page, write angles in radians.
- **Colours** are text: a name (`"red"`, `"skyblue"`), a hex code (`"#ff8800"`), `"rgb(255, 136, 0)"`, `"rgba(255, 136, 0, 0.5)"` (the last number is opacity, 0 to 1), or `"hsl(30, 100%, 50%)"` (hue in degrees, then saturation and lightness).
- **The names are the browser's own.** `ctx` is the standard 2D drawing surface of a web page, so `ctx.fillRect(...)` and `ctx.fillStyle` are spelt as every JavaScript reference spells them.
- The canvas starts see-through, so whatever is behind it shows: black with `run` and `build`, your own page's colour on your website. Paint your own background first so your drawing looks the same everywhere.

## The quick way: plain functions

A handful of functions draw the things a first picture needs, one call each. They need no `ctx.` in front.

| Call | What it draws |
|---|---|
| `background(colour)` | Paints the whole canvas one colour |
| `circle(x, y, radius, colour)` | A filled circle. `x, y` is its centre |
| `ellipse(x, y, width, height, colour)` | An oval. `x, y` is its centre, as a circle's is |
| `rect(x, y, width, height, colour)` | A filled rectangle. `x, y` is its top-left corner |
| `triangle(x1, y1, x2, y2, x3, y3, colour)` | A triangle, by its three corners |
| `polygon(x, y, radius, sides, colour)` | A shape with that many equal sides (6 is a hexagon), centred on `x, y`, with one corner straight up |
| `star(x, y, radius, points, colour)` | A star with that many points, centred on `x, y`, with one point straight up |
| `line(x1, y1, x2, y2, colour, thickness)` | A straight line from one point to the other |
| `text(words, x, y, colour, size)` | Words. `x, y` is their left end, on the line the letters sit on. Add `"centre"` at the end and `x, y` is the middle of the words |
| `picture(what, x, y, size)` | An emoji, a word, or a picture from a file beside your program, centred on `x, y` and `size` high: `picture("🌙", 300, 80, 60)`, `picture("cat.png", 100, 100, 80)` |

```js
function draw() {
  background("lightskyblue")
  rect(0, height - 80, width, 80, "yellowgreen")
  circle(width - 80, 80, 45, "gold")
  line(40, height - 80, 40, height - 200, "saddlebrown", 8)
  circle(40, height - 220, 50, "forestgreen")
  text("A tree in the sun", width / 2, 40, "white", 28, "centre")
}
```

The rules are the same for all of them:

- **The colour can be left out.** The shape then uses the colour already in use: the last one you gave, or the one set with `ctx.fillStyle = "red"`. A canvas starts with black, so give a colour the first time.
- **What you give stays.** A colour, a thickness, a text's size and `"centre"` all stay for the shapes drawn after, until you give another. `background` is the exception: it paints and leaves the colour as it was.
- **Shapes are filled** unless you ask for an outline, which is next.
- **Your own names win.** If your program has its own function or variable called `circle`, `text`, `star` or any of the others, yours is used.
- **They are for 2D.** In a 3D scene they stop with an error that says so.
- **There is one `picture` for everything.** A moon, a heart, a rocket: any emoji is a picture, so there is no function for each thing. A file's picture is loaded the first time it is asked for, and appears once it has arrived. An image from `loadImage` can be given too.

### Outlines and rounded corners

Every shape takes one more thing at the end, in curly brackets: `{ outline: "white", thickness: 6 }`. With a colour before it, the shape is filled and has a border. In place of the colour, only the edge is drawn.

```js
function draw() {
  background("midnightblue")
  circle(90, 90, 50, "gold", { outline: "white", thickness: 6 })     // filled, with a border
  circle(220, 90, 50, { outline: "white", thickness: 6 })            // the edge alone
  star(350, 90, 55, 5, "gold")
  rect(40, 180, 160, 80, "tomato", { round: 20 })                    // rounded corners
  polygon(280, 220, 50, 6, { outline: "lightgreen", thickness: 4 })  // six sides
  triangle(340, 270, 380, 180, 420, 270, "orchid")
  ellipse(220, 300, 300, 30, "steelblue")
  picture("🌙", 440, 60, 50)
}
```

The outline's colour and thickness stay for the next outline, as a fill colour does. `rect` also takes `round`, the size of its rounded corners, and `star` takes `inner`, how far out its inner corners are as a part of its radius (0.4 unless you say): `star(100, 100, 50, 5, "gold", { inner: 0.6 })`.

### Chance: `random` and `pick`

| Call | What it gives |
|---|---|
| `random(1, 6)` | A whole number from 1 to 6. Either end can come up, as on a dice |
| `random(6)` | A whole number from 0 to 6 |
| `random()` | A fraction: from 0 up to, but never reaching, 1 |
| `random(0, 0.5)` | When an end has a fraction, so may the answer: any number from 0 to 0.5 |
| `pick(list)` | One thing from a list |

```js
function draw() {
  background("black")
  for (let i = 0; i < 50; i++) {
    circle(random(width), random(height), random(5, 20), pick(["red", "gold", "white"]))
  }
}
```

## The long way: `ctx`

Each of the plain functions is a short way of writing what `ctx` does. `circle(200, 150, 80, "gold")` is these four lines:

```js
ctx.fillStyle = "gold"
ctx.beginPath()
ctx.arc(200, 150, 80, 0, degrees(360))
ctx.fill()
```

A circle the long way is an arc that goes all the way round, from angle 0 to a full turn. Half of one is `ctx.arc(200, 150, 80, 0, degrees(180))`: part circles stay with `ctx`. `ctx` is the web's own 2D drawing surface, and it can do far more than they can: curves, any shape you can describe, gradients, shadows, clipping and transforms. The two mix freely in one program. The rest of this page is `ctx`.

## Rectangles

| Call | What it does |
|---|---|
| `ctx.fillRect(x, y, w, h)` | A filled rectangle, top-left corner at `x, y` |
| `ctx.strokeRect(x, y, w, h)` | The outline of a rectangle |
| `ctx.clearRect(x, y, w, h)` | Erases that area, back to see-through |

```js
function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = "steelblue"
  ctx.fillRect(40, 40, 160, 100)

  ctx.strokeStyle = "crimson"
  ctx.lineWidth = 6
  ctx.strokeRect(240, 40, 160, 100)
}
```

## Paths: lines, circles and any shape

A path is a shape you build from pieces, then fill or outline. Start with `beginPath()`, add pieces, then call `fill()` or `stroke()` (or both).

| Call | What it adds |
|---|---|
| `ctx.beginPath()` | Starts a new, empty shape |
| `ctx.moveTo(x, y)` | Lifts the pen and puts it down at `x, y` |
| `ctx.lineTo(x, y)` | A straight line to `x, y` |
| `ctx.arc(x, y, r, start, end)` | Part of a circle around `x, y`. `0` to `Math.PI * 2` is a whole circle. Add `true` at the end to go anticlockwise. |
| `ctx.ellipse(x, y, rx, ry, rotation, start, end)` | Part of an oval |
| `ctx.rect(x, y, w, h)` | A rectangle, as part of the path |
| `ctx.roundRect(x, y, w, h, r)` | A rectangle with rounded corners of radius `r` |
| `ctx.quadraticCurveTo(cx, cy, x, y)` | A curve to `x, y`, pulled towards one control point |
| `ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x, y)` | A curve with two control points |
| `ctx.closePath()` | A straight line back to the start of the shape |
| `ctx.fill()` | Fills the shape with `fillStyle` |
| `ctx.stroke()` | Draws its outline with `strokeStyle` and `lineWidth` |

```js
function draw() {
  ctx.fillStyle = "#f4f1ea"
  ctx.fillRect(0, 0, width, height)

  // a circle
  ctx.fillStyle = "orange"
  ctx.beginPath()
  ctx.arc(100, 100, 50, 0, Math.PI * 2)
  ctx.fill()

  // a triangle, filled and outlined
  ctx.beginPath()
  ctx.moveTo(200, 150)
  ctx.lineTo(260, 50)
  ctx.lineTo(320, 150)
  ctx.closePath()
  ctx.fillStyle = "mediumseagreen"
  ctx.fill()
  ctx.strokeStyle = "darkgreen"
  ctx.lineWidth = 4
  ctx.stroke()

  // a wave
  ctx.beginPath()
  ctx.moveTo(20, 220)
  ctx.bezierCurveTo(120, 140, 220, 300, 340, 220)
  ctx.strokeStyle = "royalblue"
  ctx.stroke()

  // a rounded button
  ctx.beginPath()
  ctx.roundRect(360, 60, 140, 60, 16)
  ctx.fillStyle = "teal"
  ctx.fill()
}
```

## Colours, gradients, lines and transparency

| Setting | What it does |
|---|---|
| `ctx.fillStyle = "red"` | The colour (or gradient) for fills and `fillText` |
| `ctx.strokeStyle = "blue"` | The colour (or gradient) for outlines |
| `ctx.lineWidth = 4` | Outline thickness, in points |
| `ctx.lineCap = "round"` | How line ends look: `"butt"`, `"round"` or `"square"` |
| `ctx.lineJoin = "round"` | How corners look: `"miter"`, `"round"` or `"bevel"` |
| `ctx.setLineDash([10, 5])` | Dashed lines: 10 drawn, 5 gap. `[]` is solid again. |
| `ctx.globalAlpha = 0.5` | Makes everything after it see-through: 0 invisible, 1 solid |
| `ctx.shadowColor`, `ctx.shadowBlur`, `ctx.shadowOffsetX`, `ctx.shadowOffsetY` | A soft shadow behind what you draw |
| `ctx.globalCompositeOperation = "lighter"` | How new drawing mixes with what is there (`"source-over"` is normal) |

A **gradient** is made once, given colour stops from 0 to 1, then used as a style:

| Call | Makes |
|---|---|
| `ctx.createLinearGradient(x0, y0, x1, y1)` | A gradient along a line |
| `ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)` | A gradient between two circles |
| `gradient.addColorStop(position, colour)` | A colour at a point along it |

```js
const sky = ctx.createLinearGradient(0, 0, 0, 400)
sky.addColorStop(0, "#1e3c72")
sky.addColorStop(1, "#f7b267")

const glow = ctx.createRadialGradient(300, 120, 5, 300, 120, 60)
glow.addColorStop(0, "white")
glow.addColorStop(1, "rgba(255, 220, 120, 0)")

function draw() {
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = glow
  ctx.fillRect(220, 40, 160, 160)

  // see-through circles
  ctx.globalAlpha = 0.6
  const colours = ["red", "lime", "blue"]
  for (let i = 0; i < colours.length; i++) {
    ctx.fillStyle = colours[i]
    ctx.beginPath()
    ctx.arc(100 + i * 40, 260, 50, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // a dashed, round-ended line
  ctx.strokeStyle = "white"
  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.setLineDash([12, 14])
  ctx.beginPath()
  ctx.moveTo(20, 360)
  ctx.lineTo(width - 20, 360)
  ctx.stroke()
  ctx.setLineDash([])
}
```

## Text and fonts: drawing text on the canvas

| Call or setting | What it does |
|---|---|
| `ctx.font = "bold 24px sans-serif"` | Style, size and family, written the way web pages write fonts. Families that always work: `sans-serif`, `serif`, `monospace`, `system-ui`. |
| `ctx.fillText(text, x, y)` | Draws filled text |
| `ctx.strokeText(text, x, y)` | Draws the outline of the text |
| `ctx.textAlign = "center"` | Where `x` is: `"left"`, `"center"` or `"right"` |
| `ctx.textBaseline = "middle"` | Where `y` is: `"alphabetic"` (the default, the line letters sit on), `"top"`, `"middle"` or `"bottom"` |
| `ctx.measureText(text).width` | How wide the text will be, in points, in the font set now (see [Reading a value back](program-shape.md#reading-a-value-back)) |

Emoji are text too, so `ctx.fillText("🚀", x, y)` draws a rocket.

```js
function draw() {
  ctx.fillStyle = "#202833"
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = "white"
  ctx.font = "bold 40px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Centred title", width / 2, 60)

  ctx.font = "20px monospace"
  ctx.textAlign = "left"
  ctx.fillStyle = "#9fe"
  const lines = ["first line", "second line", "third line"]
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 30, 130 + i * 30)
  }

  ctx.font = "64px sans-serif"
  ctx.fillText("🌈 ⭐ 🚀", 30, 260)

  ctx.font = "bold 48px serif"
  ctx.strokeStyle = "gold"
  ctx.lineWidth = 2
  ctx.strokeText("Outline", 30, 340)
}
```

## Moving, turning and scaling: transforms

A transform moves the whole drawing grid, so the shapes after it are drawn in the moved grid. It is the easy way to rotate something around its own centre.

| Call | What it does |
|---|---|
| `ctx.translate(x, y)` | Moves the starting corner `(0, 0)` to `x, y` |
| `ctx.rotate(angle)` | Turns the grid around `(0, 0)`, by `angle` radians clockwise |
| `ctx.scale(sx, sy)` | Stretches the grid. `ctx.scale(2, 2)` draws everything twice as big. |
| `ctx.save()` | Remembers the current transform and every style setting |
| `ctx.restore()` | Goes back to what `save()` remembered |

Always pair `save()` with `restore()`, so one shape's transform does not leak into the next.

```js
let angle = 0

function update(dt) {
  angle += dt
}

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  for (let i = 0; i < 5; i++) {
    ctx.save()
    ctx.translate(80 + i * 110, height / 2)   // move to the square's centre
    ctx.rotate(angle * (i + 1) / 2)           // spin around it
    ctx.scale(1 + i * 0.2, 1 + i * 0.2)
    ctx.fillStyle = `hsl(${i * 60}, 70%, 50%)`
    ctx.fillRect(-20, -20, 40, 40)            // drawn around (0, 0)
    ctx.restore()
  }
}
```

## Pictures

`loadImage(address)` loads a picture and gives you an image to draw. The address can be a path from the scene's file, a web address or a `data:` address. The picture draws once it has finished loading, so draw it in `draw()` and it appears as soon as it is ready.

| Call | What it does |
|---|---|
| `const img = loadImage("https://…/picture.png")` | Starts loading a picture |
| `const img = loadImage("cat.png")` | A picture beside your scene, by its path from the scene. `build` copies the scene's folder, so it goes too. |
| `ctx.drawImage(img, x, y)` | Draws it at its own size, top-left at `x, y` |
| `ctx.drawImage(img, x, y, w, h)` | Draws it stretched to `w` by `h` |
| `ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)` | Draws one part of it (for sprite sheets) |
| `ctx.imageSmoothingEnabled = false` | Keeps pixel art crisp when you scale it up |

This picture is made in the scene as a small SVG drawing, so it needs no file and no internet:

```js
const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
<circle cx='32' cy='32' r='30' fill='gold'/>
<circle cx='22' cy='26' r='5' fill='black'/>
<circle cx='42' cy='26' r='5' fill='black'/>
<path d='M18 40 Q32 54 46 40' stroke='black' stroke-width='4' fill='none'/>
</svg>`
const smiley = loadImage("data:image/svg+xml," + encodeURIComponent(svg))

function draw() {
  ctx.fillStyle = "#cde"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(smiley, 20, 20)
  ctx.drawImage(smiley, 120, 20, 160, 160)
}
```

## Sprites

A `Sprite` is a picture that moves. The picture can be an emoji or any short text, an image from `loadImage`, or a function that draws it. It draws itself centred on its `x, y`.

```js
const rocket = new Sprite("🚀", 100, 200, 64)
```

The numbers are `x`, `y` and `size`. The size can be left out, or written as `{ size: 64 }`.

| Part | What it is |
|---|---|
| `picture` | An emoji or text, an image from `loadImage`, or a function that draws it |
| `x`, `y` | Where its centre is |
| `vx`, `vy` | Its speed in points per second, used by `update(dt)` |
| `angle` | How far it is turned. 0 faces right, and it grows clockwise. Say it in degrees with `degrees(90)` |
| `spin` | How fast it turns each second, used by `update(dt)`: `degrees(180)` is half a turn a second |
| `size` | How big it is, in points (48 unless you say) |
| `visible` | `false` hides it |
| `sprite.update(dt)` | Moves it by its speed and turns it by its spin |
| `sprite.draw()` | Draws it (call this in your `draw()`) |

```js
const fish = []
for (let i = 0; i < 6; i++) {
  const f = new Sprite("🐟", Math.random() * 400, 40 + Math.random() * 260, 40)
  f.vx = 40 + Math.random() * 80
  fish.push(f)
}
const shark = new Sprite("🦈", 0, 200, 72)
shark.vx = 60

function update(dt) {
  for (const f of [...fish, shark]) {
    f.update(dt)
    f.wrap()
  }
  for (const f of fish) {
    f.visible = !f.touches(shark)
  }
  shark.angle = Math.sin(shark.x / 40) * 0.2
}

function draw() {
  ctx.fillStyle = "#0b4f6c"
  ctx.fillRect(0, 0, width, height)
  for (const f of fish) f.draw()
  shark.draw()
}
```

### Sprites that touch

| Call | What it gives |
|---|---|
| `sprite.touches(other)` | `true` when the two overlap |
| `sprite.hit(list)` | The first sprite in the list that it touches, or `null` when it touches none |
| `sprite.contains(x, y)` | `true` when that point is on it. `sprite.contains(mouse)` works too: anything with an `x` and a `y` |

`hit` is the one a game uses most: one thing against many.

```js
const rock = bullet.hit(rocks)
if (rock) {
  remove(rocks, rock)
  score += 10
}
```

`sprite.touches(other)` is a question you ask a sprite. The list called [`touches`](program-shape.md#every-finger-touches) is a different thing: every finger that is down, which you loop over.

A sprite is tested as a circle or as a box. It is a circle unless you say otherwise.

| Part | What it is |
|---|---|
| `shape` | `"circle"` (as it starts) or `"box"` |
| `radius` | The size of its circle. It starts at 0.4 of `size`, because an emoji has some space round it. Set it to make a sprite easier or harder to hit |
| `width`, `height` | The size of its box. Both are `size` until you set them, so a box can be wider than it is tall |

What is exact, and what is not:

- Circle against circle, box against box and circle against box are all exact for the shapes above.
- A box that is turned (its `angle` is not 0) is tested properly against a circle and against a point. Two boxes are tested as if neither were turned.
- The shape is a circle or a box, never the outline of the picture. A long thin picture wants a box.
- Two shapes that only just meet at their edges do not touch. A sprite of size 0 touches nothing.
- A hidden sprite still touches. That is useful for a goal you cannot see. To stop a sprite touching, take it out of its list.

### Leaving the picture, and moving the way it faces

| Call | What it does |
|---|---|
| `sprite.wrap()` | When it has gone off one edge, it comes back on the opposite one |
| `sprite.bounce()` | Bounces it off the edges. Name the edges to use only some: `ball.bounce("top", "bottom")`. It gives the edge it bounced off (`"left"`, `"right"`, `"top"`, `"bottom"`), or `null` |
| `sprite.offscreen()` | `true` when all of it is outside the picture |
| `sprite.push(amount)` | Speeds it up the way it faces: this is an engine |
| `sprite.forward(distance)` | Steps it the way it faces, without changing its speed |
| `sprite.limit(speed)` | Slows it to that speed if it is going faster |
| `sprite.angleTo(other)` | The angle from it to another sprite, to `mouse`, or to a point: `angleTo(x, y)` |
| `sprite.distanceTo(other)` | How far it is to another sprite, to `mouse`, or to a point: `distanceTo(x, y)` |

Call `wrap()` or `bounce()` after `update(dt)`, every frame. With these there is no trigonometry to write: a ship that turns, flies and faces the mouse is

```js
ship.spin = keys.has("ArrowRight") ? 4 : 0
if (keys.has("ArrowUp")) ship.push(300 * dt)
if (mouse.down) ship.angle = ship.angleTo(mouse)
ship.update(dt)
ship.wrap()
```

### Pictures you draw yourself

Give a sprite a function in place of a picture and it is called to draw the sprite. It is given the sprite's size. Draw round `0, 0`, which is the sprite's centre, and facing right: the sprite puts it in place and turns it.

```js
function arrow(size) {
  triangle(size / 2, 0, -size / 2, -size / 3, -size / 2, size / 3, "gold")
}

const pointer = new Sprite(arrow, 200, 150, 60)

function update(dt) {
  pointer.angle = pointer.angleTo(mouse)
}

function draw() {
  ctx.fillStyle = "#123"
  ctx.fillRect(0, 0, width, height)
  pointer.draw()
}
```

To draw with `ctx` itself, write the function as `function arrow(ctx, size)`: it is then given `ctx` as well. A function is given the size alone only when it has one parameter and that parameter is called `size`.

Two plain shapes are ready made. Each is hit-tested as exactly the shape you see.

| Call | What it makes |
|---|---|
| `Sprite.box(x, y, width, height, colour)` | A coloured box, tested as a box |
| `Sprite.circle(x, y, size, colour)` | A coloured circle `size` across, tested as that circle |

The colour is white unless you say, and can be changed later: `ball.colour = "red"` (`color` works too). There is no `new` in front of these two.

```js
const ball = Sprite.circle(200, 100, 20, "orange")
const bat = Sprite.box(200, 260, 100, 14)
ball.vx = 150
ball.vy = 200

function update(dt) {
  bat.x = mouse.x
  ball.update(dt)
  ball.bounce()
  if (ball.vy > 0 && ball.touches(bat)) ball.vy = -ball.vy
}

function draw() {
  ctx.fillStyle = "#123"
  ctx.fillRect(0, 0, width, height)
  ball.draw()
  bat.draw()
}
```

### Taking things out of a list

Games remove things all the time: a bullet that has left the picture, a rock that was hit. `remove(list, thing)` takes one thing out of a list (and does nothing if it is not there).

Removing from a list while a loop is going through that same list makes the loop skip things. So loop over a copy, written `[...list]`, and remove from the real one:

```js
for (const bullet of [...bullets]) {
  bullet.update(dt)
  if (bullet.offscreen()) remove(bullets, bullet)
}
```

Use this one way everywhere and it is never wrong.

The [simple game tutorial](tutorials/game.md) builds a game from emoji sprites, and the [Space Rocks tutorial](tutorials/space-rocks.md) builds one from sprites you draw. The examples `space_rocks.js`, `bat_and_ball.js` and `brick_breaker.js` are whole games made this way.

## Everything else

`ctx` is the standard 2D drawing surface, so any other operation it has works the same way: clipping (`ctx.clip()`), pixel access (`ctx.getImageData`, `ctx.putImageData`), filters (`ctx.filter = "blur(4px)"`) and the rest. They are listed in [2D functions](2d-functions.md).

## Related

- [How a program is shaped](program-shape.md)
- [Tutorial: your first drawing](tutorials/first-drawing.md)
- [3D scenes](3d.md)

← [How a program is shaped](program-shape.md) · [3D scenes](3d.md) →
