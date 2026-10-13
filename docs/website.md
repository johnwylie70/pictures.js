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
    ├── three/        the whole three folder, needed only for 3D scenes
    ├── sqlite/       the whole sqlite folder, needed only for scenes that open a database
    ├── sound/        the whole sound folder, needed only for scenes that make sound
    └── dials/        the whole dials folder, needed only for scenes with dials, sliders or a keyboard
```

The `three` folder must sit beside `pictures.js`, because that is where a 3D scene's three.js is loaded from. A page with only 2D scenes never loads it, and can do without it. The `sqlite` folder is the same for a scene that calls `openDatabase`: SQLite is loaded from it the first time a database is opened, and never by a scene that opens none. The `sound` and `dials` folders are the same again: each is loaded by a scene that uses one of its names ([Sound and music](sound.md), [Dials, sliders and a keyboard](dials.md)), and by no other.

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
| `storage` | Where the files the scene writes are kept, for an app that has real files to give it. See [Storage](#storage) below. Without it the browser keeps them. |
| `pictures` | The methods a loaded picture has (`await img.removeBackground()`), for an app that can change pictures. See [Picture methods](#picture-methods) below. Without it a picture has none. |
| `sound` | Where a scene's sound is made, for an app that plays it somewhere else, or that must hand the page the sound engine. See [Sound](#sound) below. Without it the page plays. |
| `sqlite` | The address of the folder SQLite is loaded from (it holds `sql-wasm.js` and `sql-wasm.wasm`), in place of the `sqlite` folder beside `pictures.js`. |
| `savedAs` | The name the scene's saved values and files are kept under in the browser. Without it, the scene's address. |
| `stopStuckLoops` | `true` stops a loop that holds the page for four seconds: the scene shows an error with the loop's line. A loop written without braces is not checked. Off unless asked for. |
| `onStatus(status)` | Called with `"starting"`, `"running"`, `"finished"` or `"error"` when the status changes. |
| `onError(message, line)` | Called when the scene stops with an error. `line` is 0 when the line is not known. |

It hands back an object with `stop()`, `restart()`, `canvas` and `sound`. `stop()` ends the scene and leaves its last picture showing. `restart()` runs it again from the top, and `restart(newSource)` runs new code in its place. `canvas` is the scene's canvas element. `sound` is the page's sound player while a scene that makes sound is running, and `null` otherwise.

Loading the module starts every `[data-pictures-src]` on the page by itself, whether or not you also call `runScene`.

### Storage

A scene writes files with `saveText` and `saveJSON`, and keeps databases with `openDatabase` ([Files and databases](files-and-databases.md)). On a web page the browser keeps them. An app that runs scenes and has real files, such as one on a phone or a desktop, can take them instead by passing `storage`, an object with any of these four functions:

```js
runScene(box, {
  src: "game.js",
  storage: {
    async readText(path) { … },          // the file's text, or null when there is no such file
    async writeText(path, text) { … },
    async readBytes(path) { … },         // the file's bytes as a Uint8Array, or null when there is no such file
    async writeBytes(path, bytes) { … }, // bytes is a Uint8Array
  },
})
```

- **A path** is relative, with `/` between its parts and no `.` or `..` in it: `notes.txt`, `levels/caves.json`, `scores.db`. It never starts with `/`. Put it under a folder you choose for the scene.
- **`saveText` and `saveJSON`** call `writeText`. **`loadText` and `loadJSON`** call `readText` first, and read the file beside the scene when it gives `null`.
- **A database is one file.** SQLite runs inside pictures.js, so the app needs no SQLite of its own. `openDatabase("scores")` calls `readBytes("scores.db")` once. After a change, the whole file is handed to `writeBytes`: about a twentieth of a second after a burst of changes, when the scene calls `close()`, and when the scene is stopped.
- **A function you leave out** is done by the browser, as on a web page. With only `readBytes` and `writeBytes`, text files stay in the browser.
- **A function that fails** (a promise that rejects) stops the scene with an error that carries your message, except for a database's write a moment after a change: that one is warned about in the console and tried again at the next change.

Without `storage`, text files are in the page's `localStorage` under `pictures:<scene>:file:<path>`, and databases are in IndexedDB: the database `pictures`, its store `files`, under the same key. `<scene>` is the scene's address, or `savedAs` when you give it.

### Sound

A scene makes sound with `playSound`, `makeSynth` and the rest ([Sound and music](sound.md)). Those functions only write commands, a batch at a time, and a player carries them out. On a web page the player is on the page: there is nothing to set up, and the first click or tap on the page turns the sound on, as browsers require.

An app that runs scenes where they may not make sound (a frame that is locked down, a worker) can take the batches instead, by passing `sound` with a `send` function, and play them wherever it likes:

```js
import { createPlayer } from "./pictures/sound/synths.js"

const player = createPlayer()          // in a page that may make sound

runScene(box, {
  src: "game.js",
  sound: {
    send(batch) { player.send(batch) },   // or post it to another frame, or to a native engine
    read(id) { return player.read(id) },
  },
})
```

- **With `send`, the page plays nothing.** It makes no player, opens no sound card and never asks for the engine's file. Every batch the scene writes is handed to `send`. A batch is plain data, `{ synths: 1, now, cmds: [{ op: "sound", name: "laser", t }, …] }`, and goes through `postMessage` or JSON as it is. The format is synths.js's [command format](https://github.com/johnwylie70/synths.js/blob/main/docs/commands.md).
- **Pausing and stopping are commands too.** `{ op: "master", pause: true }` is sent when the scene goes out of view or its tab is hidden, and `pause: false` when it comes back and once when the scene starts. When the scene stops or is run again, a batch with `stop` and then `close` is sent. A synths.js player carries all of them out.
- **`read(id)`** is what a synth is doing now (`{ samples, level, notes }`), for a scope, a meter and the lit keys of a keyboard on the scene. It must answer at once. Leave it out and they show nothing.
- **`readBytes(path)`**, a promise of a file's bytes, is asked for each sample the scene loads, and the bytes go in the batch. Without it the batch carries the sample's address, for the player to fetch.
- **`ids`** is text that begins every id the scene's commands use, for two scenes that share one player.

A page that plays but may fetch nothing can be handed the engine instead. Leave `send` out and pass the engine's file as bytes:

```js
runScene(box, { src: "game.js", sound: { wasm: bytes, worklet: "blob" } })
```

`wasm` is `sound/synths_core.wasm` as a `Uint8Array` or an `ArrayBuffer`. `worklet: "blob"` loads the audio worklet from text that is already inside the library, so no second file is asked for. Anything else in `sound` is an option of the player (`latency`, `context`, `destination`, `fallback`): `destination` is a node to play into, for an app that records.

The scenes on one page share one player (one sound card and one engine), made with the options of the first scene that makes sound. Each scene is still paused and stopped alone, and the player closes when the last of them stops.

Sound is kept silent by the browser until a click, a tap or a key press in the scene's own page. Inside an `<iframe>` that means inside the frame, unless the frame has `allow="autoplay"`.

### Picture methods

pictures.js loads and draws pictures. It does not change them: it has no background remover, no resizer and no tracer of its own. An app that runs scenes and has such tools can lend them to a scene, as methods of every picture `loadImage` gives: `await img.removeBackground()`, `await img.resize({ width: 800 })`. [Circuitry Studio](https://www.circuitry.dev/docs/pictures/images) does, and its page lists the methods it supplies. They are the app's, not the library's: on a page of your own, and in a page made with `pictures build`, a picture has none.

The app passes `pictures`. The library names no method itself. It makes one for each entry of `methods`, so a new one needs no change here:

```js
runScene(box, {
  src: "shop.js",
  pictures: {
    methods: [
      { name: "remove_background" },
      { name: "resize", options: ["width", "height", "percent", "fit"] },
      { name: "classify", options: ["max_labels"] },
    ],
    async run(picture, name, options) { … },   // what it made, see below
    async save(picture, path) { … },           // the path written
    async available() { … },                   // the names this device can run, a list
  },
})
```

- **Names are in your spelling, the scene writes either.** `remove_background` (or `removeBackground`) gives a picture both `img.removeBackground()` and `img.remove_background()`, and an option named `max_labels` is taken as `maxLabels` too. `run` is always called with the name and the option names exactly as `methods` has them.
- **`run(picture, name, options)`** is given the picture (the image element `loadImage` made), and gives a promise of one of:

  | It gives | The scene gets |
  |---|---|
  | `{ picture: address }` | A new picture, loaded, with all the methods. The address is anything an image can load, such as a `blob:` address. |
  | `{ data }` | The data as it is. With `overlay: address` beside it, `{ found: data, overlay: picture }`. |
  | `{ vector: svgText, shapes }` | A picture of the SVG, to draw at any size, with `svg` and `shapes` on it and `save()` as its only method. |
  | `{ files: names }` | `{ names, save(folder) }`. |

  Put `ref` beside any of them (`overlayRef` for the overlay) and that value is what `run` and `save` are given, in place of the picture, when the scene changes or saves that result. It is your own name for something you made, so its pixels need not come back to you.
- **A method never changes the picture it is called on.** The library sees to that: what `run` gives is always a new thing.
- **`available()`** gives the names that work on this device. Without it, every name in `methods` is given. The scene gets them in JavaScript's spelling.
- **`await img.run("name", options)`** in a scene calls `run` for any name in `methods`.
- **A promise that rejects** stops the scene with an error that carries your message. The library itself refuses an option that `methods` does not list, and a method that is not there, before it asks you.

Without `pictures`, a picture has `run`, `save` and `available` and nothing else. `available()` gives an empty list, and calling a method stops the scene with: *A picture has no removeBackground() on this page: the methods that change a picture work inside Circuitry, where the app does the work*.

## Try the example

The [`examples/website`](../examples/website) folder is a page with two scenes, a 2D one and a 3D one further down. It needs a web server. From the `pictures.js` folder:

```bash
python3 -m http.server
```

Then open `http://localhost:8000/examples/website/`. Any other static web server does the same job.

## Things to know

- **Nothing big is loaded.** A 2D scene needs `pictures.js` alone, which is about 15 KB. A 3D scene also loads three.js from the `three` folder, about 750 KB, once for the whole page. A scene that opens a database loads SQLite from the `sqlite` folder, about 700 KB, in the same way. A scene that makes sound loads the `sound` folder, about 450 KB, and one with dials or a keyboard the `dials` folder, about 60 KB. A scene that uses none of these loads none of them.
- **A loop that never waits** (`while (true)` without `await frame()`) freezes the whole page, not only its scene, because scenes run on the page's own thread. Use `draw()` and `update()`, or wait in every loop. A page that calls `runScene` itself can pass `stopStuckLoops: true` to have such a loop stopped.
- **A page with scenes must be served** over `http://` or `https://`. Opening it straight from disk (`file://`) does not work, because the browser will not load the scene's `.js` file that way.
- **Paths a scene loads are relative to the scene's file**, not the page: a scene at `scenes/game.js` that calls `loadImage("sprites/ship.png")` reads `scenes/sprites/ship.png`. The same goes for `loadText` and `loadJSON`. The one exception is `new THREE.TextureLoader().load(...)`, which is three.js's own loader and takes a path from the page.
