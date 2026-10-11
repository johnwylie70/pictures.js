# Bringing a Pyctures Scene Across

Full reference: [www.circuitry.dev/docs/pictures/from-python](https://www.circuitry.dev/docs/pictures/from-python) (in Circuitry Studio's help)

pictures.js and [Pyctures](https://www.circuitry.dev/pyctures) are the same idea in two languages: a short file, no HTML, the web's 2D canvas for 2D and three.js for 3D. A program has the same shape in both, and the names are the same, so a Pyctures scene can be brought across to JavaScript by changing a handful of things, and a pictures.js scene can go back to Python the same way. This page lists those changes and shows two examples side by side, first in Python, then in JavaScript.

## The changes to make

| In Python (Pyctures) | In JavaScript (pictures.js) |
|---|---|
| `def draw():`, `def update(dt):`, `def setup():` | `function draw() {}`, `function update(dt) {}`, `function setup() {}` |
| `x = 1` | `let x = 1`, or `const x = 1` for a name that is never given a new value |
| `global x` inside a function | Not needed: a function can change a `let` made at the top |
| Indentation, after a `:` | `{ … }` around blocks |
| `ctx.fill_style = "red"`, `ctx.fill_rect(…)` | `ctx.fillStyle = "red"`, `ctx.fillRect(…)`: the canvas has its camelCase names only |
| `THREE.Mesh(g, m)` | `new THREE.Mesh(g, m)`: add `new` |
| `color=0xff0000, roughness=0.5` keyword arguments | `{ color: 0xff0000, roughness: 0.5 }`, an options object |
| `background("navy")`, `circle(x, y, 40, "gold")`, `rect`, `line`, `text` | the same |
| `Sprite("🚀", x, y, size=48)` | `new Sprite("🚀", x, y, 48)` |
| `Sprite.box(x, y, 80, 16)`, `Sprite.circle(x, y, 20)` | the same: no `new` for these two |
| `ship.angle_to(rock)`, `ship.distance_to(rock)` | `ship.angleTo(rock)`, `ship.distanceTo(rock)` |
| `rock = ship.hit(rocks)` gives `None` | `const rock = ship.hit(rocks)` gives `null` |
| `for rock in rocks[:]:` | `for (const rock of [...rocks])` |
| `pixel_ratio`, `load_image("a.png")` | `pixelRatio`, `loadImage("a.png")`. The Python spellings work too. |
| `on_key_down(key)`, `on_mouse_down(x, y)`, `on_touch_start(touch)`, `on_wheel(amount)`, `on_pinch(scale, change)` and the rest | `onKeyDown(key)`, `onMouseDown(x, y)`, `onTouchStart(touch)`, `onWheel(amount)`, `onPinch(scale, change)`. The Python spellings work too. |
| `"ArrowLeft" in keys`, `" " in pressed`, `"KeyW" in keys.codes` | `keys.has("ArrowLeft")`, `pressed.has(" ")`, `keys.codes.has("KeyW")`: these are sets, so `in` becomes `.has()` |
| `for touch in touches:`, `len(touches)`, `touch.start_x` | `for (const touch of touches)`, `touches.length`, `touch.startX` (`touch.start_x` works too) |
| `mouse.button is None` | `mouse.button === null` |
| `await frame()`, `await flush()`, `await sleep(1)` | The same |
| `w = await ctx.measure_text("hi").width` (a value read back) | `const w = ctx.measureText("hi").width`: drop the `await` |
| `async def clicked(event):` so that it can read a value | `function clicked(event) {}`: no `async` needed |
| `canvas.add_event_listener("click", clicked)`, `event.x` | `canvas.addEventListener("click", clicked)`, `event.offsetX` |
| `open("words.txt").read()` | `await loadText("words.txt")`, or `await loadJSON("level.json")` |
| `print("score", score)` | `console.log("score", score)`, which goes to the browser's console |
| `math.pi`, `math.tau`, `math.sin(a)`, `random.random()` | `Math.PI`, `Math.PI * 2`, `Math.sin(a)`, `Math.random()`, with no import |
| `random.uniform(a, b)` | `a + Math.random() * (b - a)` |
| `for i in range(10):` | `for (let i = 0; i < 10; i++) {}` |
| `for ball in balls:` | `for (const ball of balls) {}` |
| `f"hsl({hue}, 80%, 60%)"` | `` `hsl(${hue}, 80%, 60%)` ``, with backticks |
| `True`, `False`, `None` | `true`, `false`, `null` |
| `a and b`, `a or b`, `not a` | `a && b`, `a \|\| b`, `!a` |
| `len(balls)`, `balls.append(b)` | `balls.length`, `balls.push(b)` |
| `min(max(x, 0), width)` | `Math.min(Math.max(x, 0), width)` |
| `# a comment` | `// a comment` |
| `js.document`, `js.Path2D(...)`, `js.ImageData(...)` | `document`, `new Path2D(...)`, `new ImageData(...)`: they are simply there |
| Nothing in `draw()` for a resize in 3D | Three lines in `draw()`: see [below](#things-that-work-differently) |

## A 2D example

In Python:

```python
import math

angle = 0

def draw():
    global angle
    ctx.fill_style = "#102030"
    ctx.fill_rect(0, 0, width, height)
    for i in range(12):
        a = angle + i * math.pi / 6
        ctx.fill_style = f"hsl({i * 30}, 80%, 60%)"
        ctx.begin_path()
        ctx.arc(200 + math.cos(a) * 100, 150 + math.sin(a) * 100, 15, 0, math.pi * 2)
        ctx.fill()
    angle += 0.02
```

In JavaScript:

```js
let angle = 0

function draw() {
  ctx.fillStyle = "#102030"
  ctx.fillRect(0, 0, width, height)
  for (let i = 0; i < 12; i++) {
    const a = angle + i * Math.PI / 6
    ctx.fillStyle = `hsl(${i * 30}, 80%, 60%)`
    ctx.beginPath()
    ctx.arc(200 + Math.cos(a) * 100, 150 + Math.sin(a) * 100, 15, 0, Math.PI * 2)
    ctx.fill()
  }
  angle += 0.02
}
```

What changed: the `import` and `global angle` went, `angle` is made with `let`, `def draw():` became `function draw() {}` with braces round each block, the `for` is written out, `math` became `Math`, the f-string became text in backticks, and the canvas names are in camelCase. The calls themselves, and the shape of the program, are the same.

## A 3D example

In Python:

```python
renderer = THREE.WebGLRenderer(canvas=canvas, antialias=True)
renderer.setPixelRatio(pixel_ratio)
renderer.setSize(width, height, False)

scene = THREE.Scene()
camera = THREE.PerspectiveCamera(60, width / height, 0.1, 100)
camera.position.set(2, 2, 4)
controls = addons.OrbitControls(camera, canvas)

cube = THREE.Mesh(
    THREE.BoxGeometry(1, 1, 1),
    THREE.MeshStandardMaterial(color=0x44aaff, roughness=0.4),
)
scene.add(cube)
scene.add(THREE.AmbientLight(0xffffff, 0.4))
light = THREE.DirectionalLight(0xffffff, 2)
light.position.set(3, 4, 5)
scene.add(light)

def draw():
    cube.rotation.y += 0.01
    controls.update()
    renderer.render(scene, camera)
```

In JavaScript:

```js
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(pixelRatio)
renderer.setSize(width, height, false)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
camera.position.set(2, 2, 4)
const controls = new addons.OrbitControls(camera, canvas)

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.4 }),
)
scene.add(cube)
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(3, 4, 5)
scene.add(light)

function draw() {
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)

  cube.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
}
```

What changed: every capitalised name that makes something has `new` in front, the keyword arguments became options objects, `pixel_ratio` became `pixelRatio`, `True` and `False` became `true` and `false`, and `draw()` has three more lines so that the picture follows the canvas when it is resized. The three.js names are the same in both, because both are three.js.

Both JavaScript halves have a scene of their own in the `examples` folder, to run as they are: [`from_python_2d.js`](../examples/from_python_2d.js) and [`from_python_3d.js`](../examples/from_python_3d.js) show the same changes on two more small programs, including a click handler and a value read back without `await`.

## Things that work differently

- **Values read back at once.** In Pyctures a value the page works out needs `await`, and each read waits a frame. In pictures.js the scene calls the canvas directly, so `ctx.measureText("hi").width`, `mesh.position.x` and `hits.length` are ordinary values. Take the `await` off, and the `async` off the function round it.
- **Callbacks run straight away.** A function you pass to the page is called inside the page's own code, not a frame later. So functions that three.js expects an answer from, such as `traverse` or a custom sort, work.
- **Resizing in 3D is yours to do.** Pyctures refits the renderer and every perspective camera when the canvas changes size. pictures.js does not: put `camera.aspect = width / height`, `camera.updateProjectionMatrix()` and `renderer.setSize(width, height, false)` at the top of `draw()`.
- **A drawing made once is lost on a resize.** A top-level drawing, with no `draw()`, is wiped when the canvas changes size. Put it in `draw()` if it should stay.
- **The scene runs on the page's own thread.** In a built Pyctures page, Python runs in a background thread and a stuck scene offers a Stop button. Here a loop that never waits freezes the whole page: see [Tips and limits](tips.md#canvas-frozen-a-loop-must-wait-for-the-next-frame).
- **An endless loop at the top level hides the functions.** `draw`, `update` and the `on` functions are looked for when the top level reaches its end. A scene whose top level is a `while (true)` loop never reaches it, so read `keys` and `mouse` in the loop.
- **There are no Python libraries.** Anything a scene did with numpy, Pillow or a module of your own has to be written in JavaScript. Plain arrays and `Math` cover most scenes, and `Float32Array` stands in for a numpy array of numbers.
- **Files are read with `await`.** `open("words.txt")` becomes `await loadText("words.txt")`, and a JSON file comes back ready to use from `await loadJSON("level.json")`. Both take a path from the scene's file. A file is written with `await saveText("notes.txt", words)` or `await saveJSON("level.json", level)`, and a SQLite database is opened with `await openDatabase("scores")` ([Files and databases](files-and-databases.md)).
- **Printing goes to the browser's console**, not to the page or the terminal.

## Going back to Python

Read the table from right to left. The things to add are the ones JavaScript never needed: `await` in front of every value read back from the canvas, `global` in a function that changes a top-level name, and `import math, random`. Take out the three resize lines in a 3D `draw()`. Pyctures has a page for JavaScript that was not written for pictures.js, such as an example from the three.js website: [Bringing a JavaScript example across](https://github.com/johnwylie70/pyctures/blob/main/docs/from-javascript.md).

## Related

- [2D functions](2d-functions.md)
- [3D functions](3d-functions.md)
- [How a program is shaped](program-shape.md)
