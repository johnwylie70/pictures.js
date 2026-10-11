# How a Program Is Shaped

Full reference: [www.circuitry.dev/docs/pictures/program-shape](https://www.circuitry.dev/docs/pictures/program-shape) (in Circuitry Studio's help)

A program for the canvas can take one of four shapes: draw once, draw every frame, loop, or draw step by step. This page shows each one, then how to read the keyboard, mouse and touch, and how to read a value back from the canvas.

## The names you can use

These are ready in every file, with no import:

| Name | What it is |
|---|---|
| `ctx` | The 2D drawing surface. See [Drawing in 2D](drawing-2d.md). |
| `canvas` | The canvas itself, for 3D and for event listeners. |
| `THREE` | The 3D toolkit. See [3D scenes](3d.md). |
| `addons` | Extra 3D tools: `addons.OrbitControls`. |
| `width`, `height` | The size of the canvas, in screen points. They update when the canvas is resized. |
| `pixelRatio` | How many real pixels make one screen point (2 or 3 on most phones). |
| `frame`, `flush`, `sleep` | Used with `await` to wait for the next frame, show the drawing so far, or pause. |
| `vsync` | Another name for `frame`: `await vsync()`. |
| `keys`, `mouse` | What is pressed right now. |
| `pressed`, `released` | The keys that went down, and came up, since the last frame. |
| `touches`, `pinch` | Every finger that is down, and two fingers as a zoom. |
| `degrees` | An angle said in degrees: `ship.angle = degrees(90)`. |
| `background`, `circle`, `ellipse`, `rect`, `triangle`, `polygon`, `star`, `line`, `text`, `picture` | Plain drawing, one call each. See [the quick way](drawing-2d.md#the-quick-way-plain-functions). |
| `random`, `pick` | A number, or one thing from a list, by chance: `random(1, 6)`, `pick(["red", "gold"])`. |
| `Sprite`, `loadImage` | Moving pictures that can tell when they touch, and loading an image. See [Sprites](drawing-2d.md#sprites). |
| `remove` | Takes a thing out of a list: `remove(rocks, rock)`. |
| `loadText`, `loadJSON` | Used with `await` to read a file beside the scene, or one the scene wrote. |
| `saveText`, `saveJSON` | Used with `await` to write a file: `await saveText("notes.txt", words)`. See [Files and databases](files-and-databases.md). |
| `openDatabase` | Used with `await` to open a SQLite database: `const db = await openDatabase("scores")`. See [Files and databases](files-and-databases.md). |
| `save`, `load` | Keep a value for the next time the program runs: `save("best", 120)`, `load("best", 0)`. See [Saved values](saved-values.md). |

Everything else a web page has is there too, as in any JavaScript: `document`, `Path2D`, `Math`, `console` and the rest.

A scene is either 2D or 3D. It is 3D when its code uses `THREE.` or `addons.` anywhere; then three.js is loaded and there is no `ctx`. Otherwise it is 2D, and `THREE` and `addons` are not loaded.

## 1. Draw once

Write your drawing at the top level, with no functions. It runs once, top to bottom, and the program finishes.

```js
ctx.fillStyle = "white"
ctx.fillRect(0, 0, width, height)

for (let i = 0; i < 10; i++) {
  ctx.fillStyle = `hsl(${i * 36}, 80%, 55%)`
  ctx.fillRect(20 + i * 40, 40, 30, 120)
}
```

This is the simplest shape, good for trying things out. The drawing is lost when the canvas changes size, because a canvas is wiped when it is resized. For a picture that survives a resize and adapts to the canvas, or that moves, put the drawing in `draw()` (below), which redraws it every frame. Most examples in this guide do.

## 2. Draw every frame: `draw()` and `update(dt)`

Define a function called `draw` and it is called every frame, many times a second. Define `update(dt)` too and it is called just before each `draw()`, with `dt` the number of seconds since the last frame (about 0.016 at 60 frames a second).

Use `update` to move things and `draw` to paint them. Paint the background first in `draw()`: the canvas keeps what was drawn last frame until you cover it. Set the colours, font and line width in `draw()` too, next to what they style: a resize of the canvas resets them.

```js
let x = 0

function update(dt) {
  x = (x + 150 * dt) % width      // 150 points per second
}

function draw() {
  ctx.fillStyle = "#102030"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "tomato"
  ctx.fillRect(x, height / 2 - 25, 50, 50)
}
```

Moving by `speed * dt` keeps the speed the same on a fast device and a slow one.

You can also define `setup()`. It is called once, after the top level has run and before the first frame. Code at the top level does the same job, so use whichever reads better. `setup` can be an `async function`: the first frame waits until it has finished, which suits loading a file.

A program with `draw()` or `update()` keeps running until the page is closed.

## 3. A loop with `await frame()`

If you prefer to write a loop, `await frame()` waits for the next frame, and the browser shows what you have drawn. Every pass of the loop is one frame.

```js
let t = 0
while (true) {
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, width, height)
  const r = 60 + 40 * Math.sin(t)
  ctx.fillStyle = "hotpink"
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2)
  ctx.fill()
  t += 0.05
  await frame()
}
```

`await` works at the top level of the file, with no `async function` needed. `await frame()` also hands back the seconds since the last frame, should you want them: `const dt = await frame()`.

`await vsync()` is another name for `await frame()`: the same function, giving back the same seconds. Use whichever you prefer. Both wait for the screen's next refresh.

A page never shows a half-drawn frame. Everything you draw before the next `await frame()` or `await vsync()` appears together, at the next refresh. So clear the canvas and draw the new picture in the same frame, as the loop above does, and nothing flickers.

**Every `while (true)` loop must `await frame()`** (or `await sleep(...)`). The scene runs on the page's own thread, so a loop that never waits never lets the browser draw, and the whole page freezes. See [Tips and limits](tips.md).

`await sleep(seconds)` waits for that long, which is handy for slow, step-by-step programs:

```js
for (const word of ["3", "2", "1", "Go!"]) {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "black"
  ctx.font = "64px sans-serif"
  ctx.fillText(word, 40, 100)
  await sleep(1)
}
```

The functions `draw`, `update` and the `on` functions below are looked for when the top level reaches its end. A top level that loops for ever never reaches it, so in such a scene those functions are not called: do the drawing in the loop, and read `keys`, `mouse`, `pressed`, `touches` and `pinch` there.

## 4. Drawing step by step with `await flush()`

Without `draw()`, a top-level drawing appears all at once, when the program finishes. To watch it being built, call `await flush()`: the browser shows what has been drawn so far, and the program carries on at the next frame.

```js
ctx.fillStyle = "#fffbe8"
ctx.fillRect(0, 0, width, height)
const cx = width / 2, cy = height / 2
for (let i = 0; i < 360; i++) {
  const a = i * 7 * Math.PI / 180
  const r = i * Math.min(width, height) / 800
  ctx.fillStyle = `hsl(${i}, 70%, 50%)`
  ctx.beginPath()
  ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4, 0, Math.PI * 2)
  ctx.fill()
  if (i % 6 === 0) await flush()
}
```

Each `flush()` costs a frame, so flush every few steps rather than after every single shape. In pictures.js `flush` and `frame` do the same thing; both names are there so a scene reads the same as its Pyctures twin.

## Keyboard, mouse and touch input

Your program can read the keyboard, the mouse and touch. When the scene fills the page, as it does with `run` and `build`, it has the keyboard from the start. On a page with other things on it, click or tap the canvas first.

### What is pressed right now: `keys` and `mouse`

`keys` is a set of the keys held down, by name: `"ArrowLeft"`, `"ArrowRight"`, `"ArrowUp"`, `"ArrowDown"`, `" "` (space), `"a"`, `"Enter"` and so on. Ask it with `keys.has("ArrowLeft")`. `mouse.x` and `mouse.y` are where the pointer is, and `mouse.down` is `true` while the button or a finger is pressed. A finger on a touch screen counts as the mouse.

```js
let x = 200, y = 150

function update(dt) {
  if (keys.has("ArrowLeft")) x -= 200 * dt
  if (keys.has("ArrowRight")) x += 200 * dt
  if (keys.has("ArrowUp")) y -= 200 * dt
  if (keys.has("ArrowDown")) y += 200 * dt
  if (mouse.down) {
    x = mouse.x
    y = mouse.y
  }
}

function draw() {
  ctx.fillStyle = "#222"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "lime"
  ctx.fillRect(x - 15, y - 15, 30, 30)
}
```

`mouse` has more to read:

| Name | What it is |
|---|---|
| `mouse.x`, `mouse.y` | Where the pointer is, in points from the top left of the scene. |
| `mouse.down` | `true` while a button or a finger is pressed. |
| `mouse.button` | Which button is down: `"left"`, `"middle"` or `"right"`. `null` when none is. A finger is `"left"`. |
| `mouse.inside` | `true` while the pointer is over the scene. |
| `mouse.dx`, `mouse.dy` | How far the pointer moved since the last frame. |
| `mouse.wheel` | How far the wheel turned since the last frame. Rolling down is positive. One click of a mouse wheel is about 100. |

A scene that uses the pointer gets the right button too: no menu opens over it.

`keys` also says which of the modifier keys are held, with no name to remember:

| Name | What it is |
|---|---|
| `keys.shift`, `keys.ctrl`, `keys.alt`, `keys.meta` | `true` while that key is held. `meta` is the Command key on a Mac and the Windows key on a PC. |
| `keys.codes` | The keys held, by their place on the keyboard: `keys.codes.has("KeyW")`. See [Keys by their place](#keys-by-their-place-wasd-on-any-keyboard). |

### Once for each press: `pressed` and `released`

`keys` says a key is down for as long as it is held. To do something once for each press, such as a jump or a shot, use `pressed`: the set of keys that went down since the last frame. `released` is the set of keys that came up.

| You want it to happen | Use |
|---|---|
| Once for each press | `pressed.has(" ")` in `update`, or the function `onKeyDown(key)` |
| While the key is held, every frame | `keys.has(" ")` in `update` |
| While the key is held, at the speed a held key types | the function `onKeyRepeat(key)` |

```js
let y = 0      // how high the box is above the ground
let vy = 0     // its speed upwards

function update(dt) {
  if (pressed.has(" ") && y === 0) vy = 500   // one jump for each press of the space bar
  vy -= 1200 * dt
  y = Math.max(0, y + vy * dt)
}

function draw() {
  ctx.fillStyle = "#1b2a3a"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "seagreen"
  ctx.fillRect(0, height - 40, width, 40)
  ctx.fillStyle = "gold"
  ctx.fillRect(width / 2 - 20, height - 80 - y, 40, 40)
  ctx.fillStyle = "white"
  ctx.fillText("Press space to jump", 10, 20)
}
```

Hold the space bar down and the box jumps once. With `keys.has(" ")` in its place it would jump again each time it landed.

`pressed`, `released`, `mouse.dx`, `mouse.dy` and `mouse.wheel` tell you what happened since the last frame. They are set at the start of each frame and stay the same all through it, so they read the same in `update`, in `draw` and after an `await frame()`.

### When something happens: the `on` functions

Define any of these and they are called when the event happens:

| Function | Called when |
|---|---|
| `onKeyDown(key, code)` | A key is pressed. `key` is its name, as in `keys`. `code` is its place on the keyboard. |
| `onKeyUp(key, code)` | A key is let go. |
| `onKeyRepeat(key, code)` | A key that is held down repeats, as it does when you type. |
| `onMouseDown(x, y, button)` | The mouse button or a finger goes down. `button` is `"left"`, `"middle"` or `"right"`. |
| `onMouseMove(x, y)` | The pointer moves. |
| `onMouseUp(x, y, button)` | The button or finger comes up. |
| `onTouchStart(touch)` | A finger or a mouse button goes down. See [Every finger](#every-finger-touches). |
| `onTouchMove(touch)` | A finger that is down moves. |
| `onTouchEnd(touch, cancelled)` | A finger comes up. |
| `onWheel(amount)` | The wheel turns. Rolling down is positive. |
| `onPinch(scale, change)` | Two fingers move together or apart. See [Zooming](#zooming-pinch-and-the-wheel). |

A function may leave out the arguments it does not need: `onKeyDown(key)` and `onMouseDown(x, y)` are fine.

```js
let dots = []

function onMouseDown(x, y) {
  dots.push([x, y])
}

function onKeyDown(key) {
  if (key === "c") dots = []
}

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "crimson"
  for (const [x, y] of dots) {
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = "gray"
  ctx.fillText("Click to add dots, press c to clear", 10, 20)
}
```

Holding a key down does not repeat `onKeyDown`. Use `keys` for things that should keep happening while a key is held, and `onKeyRepeat` for a key that should repeat as it does in a text box, such as Backspace.

### Keys by their place: WASD on any keyboard

A key's name is the letter it types, and that depends on the keyboard. The key a British or American keyboard calls W types Z on a French one. A key's code is its place on the keyboard and is the same everywhere: `"KeyW"`, `"KeyA"`, `"KeyS"`, `"KeyD"`, `"Space"`, `"ArrowLeft"`, `"Digit1"`, `"ShiftLeft"`. `keys.codes` is the set of codes held, and `onKeyDown` is given the code after the name.

```js
let x = 200, y = 150

function update(dt) {
  if (keys.codes.has("KeyW")) y -= 200 * dt
  if (keys.codes.has("KeyS")) y += 200 * dt
  if (keys.codes.has("KeyA")) x -= 200 * dt
  if (keys.codes.has("KeyD")) x += 200 * dt
}

function onKeyDown(key, code) {
  if (code === "Space") {
    x = width / 2
    y = height / 2
  }
}

function draw() {
  ctx.fillStyle = "#222"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "orange"
  ctx.fillRect(x - 15, y - 15, 30, 30)
}
```

### Every finger: `touches`

`mouse` follows one pointer: the first finger to go down. `touches` is a list of every finger that is down right now. A pressed mouse button is in the list too, so one piece of code works on a phone and on a computer. Each touch has:

| Name | What it is |
|---|---|
| `touch.x`, `touch.y` | Where it is, in points, like `mouse.x`. |
| `touch.startX`, `touch.startY` | Where it went down. |
| `touch.dx`, `touch.dy` | How far it moved since the last frame. |
| `touch.id` | A number that tells it from the others. |
| `touch.type` | `"touch"` for a finger, `"mouse"` or `"pen"`. |

This scene paints with every finger at once, each in its own colour:

```js
const colours = ["crimson", "royalblue", "seagreen", "orange", "purple"]
let count = 0

ctx.fillStyle = "white"
ctx.fillRect(0, 0, width, height)

function onTouchStart(touch) {
  touch.colour = colours[count % colours.length]
  count += 1
}

function update() {
  ctx.lineWidth = 8
  ctx.lineCap = "round"
  for (const touch of touches) {
    ctx.strokeStyle = touch.colour
    ctx.beginPath()
    ctx.moveTo(touch.x - touch.dx, touch.y - touch.dy)   // where it was last frame
    ctx.lineTo(touch.x, touch.y)
    ctx.stroke()
  }
}
```

A touch is the same object from the moment it goes down until it comes up, so a scene can keep things of its own on it, as `touch.colour` is kept here. `onTouchEnd(touch, cancelled)` is given it one last time. `cancelled` is `true` when the device took the touch away, for example for a gesture of its own, so it should not count as a tap.

### Zooming: `pinch` and the wheel

Two fingers moving apart or together is a pinch. `pinch.scale` is 1 when the second finger goes down, 2 when the fingers are twice as far apart, and 0.5 when they are half as far. `pinch.change` is how much the scale changed since the last frame, so multiplying by it every frame is all a zoom needs. `pinch.x` and `pinch.y` are the point between the fingers. A pinch on a trackpad sets the same values.

```js
let zoom = 1

function update() {
  zoom *= pinch.change            // two fingers, or a pinch on a trackpad
  zoom *= 0.999 ** mouse.wheel    // the mouse wheel: rolling up zooms in
  zoom = Math.max(0.2, Math.min(5, zoom))
}

function draw() {
  ctx.fillStyle = "#111"
  ctx.fillRect(0, 0, width, height)
  const size = 100 * zoom
  ctx.fillStyle = "deepskyblue"
  ctx.fillRect(width / 2 - size / 2, height / 2 - size / 2, size, size)
  ctx.fillStyle = "white"
  ctx.fillText(`zoom ${zoom.toFixed(2)}`, 10, 20)
}
```

When no pinch is going on, `pinch.scale` and `pinch.change` are 1. `onPinch(scale, change)` and `onWheel(amount)` are called as it happens, if you would rather have a function.

A scene that names the wheel (`mouse.wheel` or `onWheel`) keeps it: the page does not scroll while the pointer is over the scene. Under any other scene the wheel scrolls the page as usual. In the same way, a scene that names `pinch` or `onPinch` keeps a trackpad's pinch, and the page is not zoomed.

### Callbacks

`canvas` is the page's own canvas element, so you can listen for any event a web page has. The function receives the browser's event. `event.offsetX` and `event.offsetY` are where it happened on the canvas, in points.

```js
function clicked(event) {
  ctx.fillStyle = "orange"
  ctx.fillRect(event.offsetX - 5, event.offsetY - 5, 10, 10)
}

ctx.fillStyle = "#eee"
ctx.fillRect(0, 0, width, height)
canvas.addEventListener("click", clicked)
```

Frames keep coming after a draw-once program like this one has finished, so a listener that is an `async function` can still `await frame()` or `await sleep(...)`.

## How calls work

There is nothing between your code and the canvas, so a scene is ordinary JavaScript:

- **The names are the browser's own.** `ctx` is the page's 2D drawing surface and `THREE` is three.js itself, so `ctx.fillRect` and `ctx.fillStyle` are spelt as every JavaScript reference spells them. This guide lists them in [2D functions](2d-functions.md).
- **`new` makes something new.** `new THREE.Mesh(geometry, material)` creates a mesh, and `new Sprite("🚀", 100, 200)` a sprite.
- **Options are an object.** `new THREE.MeshStandardMaterial({ color: "red", roughness: 0.4 })`.
- **Calls happen at once.** Nothing is recorded and sent later, so drawing runs at the browser's own speed.
- **The Python spellings of pictures.js's own names work too**: `pixel_ratio`, `load_image`, `load_text`, `load_json`, the `on` functions (`on_key_down`, `on_mouse_down`, `on_touch_start`, `on_wheel`, `on_pinch` and the rest) and a touch's `start_x` and `start_y`. That is to help a [Pyctures scene come across](from-python.md). The canvas's and three.js's names have one spelling only: `ctx.fill_rect` does not exist.

## Reading a value back

Occasionally you need an answer from the canvas, such as the width of some text. Just ask: the value comes back at once.

```js
ctx.font = "40px sans-serif"
const textWidth = ctx.measureText("Hello there").width
console.log("The text is", textWidth, "points wide")

function draw() {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "black"
  ctx.font = "40px sans-serif"
  ctx.fillText("Hello there", (width - textWidth) / 2, height / 2)
}
```

Things to know:

- **A read costs no frame.** In Pyctures a value read from the canvas needs `await` and waits a frame. In pictures.js it is an ordinary value, and you can read one every frame.
- **Canvas values are ordinary numbers.** `mesh.position.x > 3` and `ctx.measureText(name).width / 2` work as they stand.
- **Waiting is only for time and files.** `await` goes in front of `frame()`, `flush()`, `sleep(seconds)`, `loadText(path)` and `loadJSON(path)`, and in front of writing a file and using a database. To `await` inside a function, make it an `async function`. `setup` and the `on` functions can be async. So can `draw` and `update`, but the next frame does not wait for them to finish.

## Related

- [Drawing in 2D](drawing-2d.md)
- [3D scenes](3d.md)
- [Tips and limits](tips.md)

← [pictures.js](getting-started.md) · [Drawing in 2D](drawing-2d.md) →
