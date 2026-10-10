# Use It on Your Website

Full reference: [www.circuitry.dev/docs/pictures/outside-circuitry](https://www.circuitry.dev/docs/pictures/outside-circuitry) (in Circuitry Studio's help)

A pictures.js scene can live on any web page: a blog post, a course page, a portfolio. The scene is plain JavaScript and runs in the visitor's browser, so your site needs nothing but files, and nothing is loaded from anywhere else.

There are two ways to put a scene on a page.

## 1. An iframe: the simplest

Build the scene into a folder of its own:

```bash
node bin/pictures.mjs build orbit.js -o my-site/orbit
```

Then, in any page of your site:

```html
<iframe src="orbit/index.html" style="width: 100%; aspect-ratio: 16 / 9; border: 0"
        title="An orbit, drawn in JavaScript"></iframe>
```

The scene fills the iframe and follows its size. Nothing on your page can disturb it, and it cannot disturb your page.

`build` copies the whole folder the scene is in, so keep `orbit.js` in a folder with only what it needs (see [Getting started](getting-started.md#what-goes-in-the-folder)).

## 2. Inline: scenes as part of the page

Put a `<div>` where each scene should go, naming its JavaScript file, and one script tag at the end of the page:

```html
<div data-pictures-src="balls.js"></div>
<div data-pictures-src="knot.js" style="height: 420px"></div>

<script type="module" src="pictures/pictures.js"></script>
```

Each scene has its own names and its own state: they cannot see each other. They all run on the page's own thread, alongside everything else on the page.

To get the `pictures/` folder beside your page, make a folder called `pictures` and copy two things into it from your copy of pictures.js:

```text
my-site/
├── index.html        your page
├── balls.js          your scenes
├── knot.js
└── pictures/
    ├── pictures.js   from the pictures.js folder
    └── three/        the whole three folder, needed only for 3D scenes
```

The `three` folder must sit beside `pictures.js`, because that is where a 3D scene's three.js is loaded from. A page with only 2D scenes never loads it, and can do without it.

### What a scene's box does

- **The canvas fills its box** and follows it when the box changes size, so size the `<div>` with CSS like any other element. A box with no height of its own is given a 16:9 shape.
- **A scene's frames run only while it is in view.** Each scene's code starts when the page loads, but `draw()`, `update()` and `await frame()` wait while the scene is scrolled out of view. A long page with many scenes only animates the ones being looked at.
- **The keyboard** reaches a scene after a visitor clicks or taps it, so the arrow keys still scroll the page until then. Once a scene has the keyboard, the arrow keys and the space bar go to it and do not scroll the page.
- **Touch** on a scene is the mouse (`mouse.down`, `mouse.x`), and every finger is in `touches`. A scene that uses the pointer (`mouse`, `touches`, `pinch`, the `onMouse`, `onTouch`, `onPinch` and `onWheel` functions, a listener of its own, or `OrbitControls`) keeps a finger that is put on it, so scrolling a phone with a finger on that scene moves the scene, not the page: leave some page around it to scroll by. On a scene that does not use the pointer, a finger scrolls the page as usual. In 3D, turn off zooming with `controls.enableZoom = false` so the mouse wheel scrolls the page.
- **The mouse wheel** scrolls the page when the pointer is over a scene, unless the scene names the wheel (`mouse.wheel` or `onWheel`). Such a scene keeps the wheel, so give visitors some page beside it to scroll by. A scene that names `pinch` keeps a trackpad's pinch in the same way.
- **The right mouse button** opens no menu over a scene that uses the pointer: the scene reads it as `mouse.button === "right"`.
- **`console.log()`** goes to the browser's console.
- **Errors** are shown along the bottom of the scene, with the line in the JavaScript file, and a **Run again** button.
- **The canvas is see-through** until the scene paints it, so the box's own background shows behind. Give the `<div>` a `background` in CSS for the colour you want while the scene starts.

### Settings

Put these on the `<div>`:

| Attribute | What it does |
|---|---|
| `data-pictures-src="game.js"` | The scene's JavaScript file, relative to the page. It can be in a folder, as in `scenes/game.js`. Required. |
| `data-pictures-fullpage` | The scene is the whole page: it has the keyboard from the start. |

The div also tells you how its scene is doing: `data-pictures-status` is `starting`, `running`, `finished` or `error`, and a `pictures-status` event fires on it when that changes, with the new status as the event's `detail`. A scene is `finished` when it has drawn once and defines none of `setup`, `draw`, `update` or the `on` functions; a scene that draws every frame stays `running`.

### From JavaScript

The module also exports what it uses, for a page that adds scenes itself:

```js
import { runScene } from "./pictures/pictures.js"

const scene = runScene(document.querySelector("#game"), { src: "game.js" })
// later
scene.stop()
```

`runScene(container, options)` takes these options:

| Option | What it is |
|---|---|
| `src` | The address of the scene's file, relative to the page. |
| `source` | The scene's code as text, in place of `src`. |
| `base` | Where the files the scene loads by a relative path are. Without it, they are beside the scene's file, or beside the page for a scene given as `source`. |
| `name` | The file name used when working out an error's line. Without it, the name from `src`, or `scene.js`. |
| `keyboard` | `true` gives the scene the keyboard from the start. |
| `files` | A table from a path, as the scene writes it, to an address to load in its place: `{ "ship.png": "https://…/ship.png" }`. For a host with no folder to serve; `loadImage`, `loadText`, `loadJSON` and three.js's loaders all use it. |
| `stopStuckLoops` | `true` stops a loop that holds the page for four seconds: the scene shows an error with the loop's line. A loop written without braces is not checked. Off unless asked for. |
| `onStatus(status)` | Called with `"starting"`, `"running"`, `"finished"` or `"error"` when the status changes. |
| `onError(message, line)` | Called when the scene stops with an error. `line` is 0 when the line is not known. |

It hands back an object with `stop()`, `restart()` and `canvas`. `stop()` ends the scene and leaves its last picture showing. `restart()` runs it again from the top, and `restart(newSource)` runs new code in its place. `canvas` is the scene's canvas element.

Loading the module starts every `[data-pictures-src]` on the page by itself, whether or not you also call `runScene`.

## Try the example

The [`examples/website`](../examples/website) folder is a page with two scenes, a 2D one and a 3D one further down. It needs a web server. From the `pictures.js` folder:

```bash
python3 -m http.server
```

Then open `http://localhost:8000/examples/website/`. Any other static web server does the same job.

## Things to know

- **Nothing big is loaded.** A 2D scene needs `pictures.js` alone, which is about 15 KB. A 3D scene also loads three.js from the `three` folder, about 750 KB, once for the whole page.
- **A loop that never waits** (`while (true)` without `await frame()`) freezes the whole page, not only its scene, because scenes run on the page's own thread. Use `draw()` and `update()`, or wait in every loop. A page that calls `runScene` itself can pass `stopStuckLoops: true` to have such a loop stopped.
- **A page with scenes must be served** over `http://` or `https://`. Opening it straight from disk (`file://`) does not work, because the browser will not load the scene's `.js` file that way.
- **Paths a scene loads are relative to the scene's file**, not the page: a scene at `scenes/game.js` that calls `loadImage("sprites/ship.png")` reads `scenes/sprites/ship.png`. The same goes for `loadText` and `loadJSON`. The one exception is `new THREE.TextureLoader().load(...)`, which is three.js's own loader and takes a path from the page.
