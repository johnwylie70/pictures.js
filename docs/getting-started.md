# Getting Started

Full reference: [www.circuitry.dev/docs/pictures](https://www.circuitry.dev/docs/pictures) (in Circuitry Studio's help)

pictures.js is for making 2D and 3D graphics and games in plain JavaScript, with no HTML to write. It is for any age and any level, a first program or a thousandth, and it is designed to bring the joy back into programming: you type a few lines and see something move. Your program draws in a web browser: shapes, text, pictures, moving sprites, games, charts and 3D scenes. A few plain functions draw your first shapes; behind them are the web's 2D canvas for 2D and three.js for 3D, under the browser's own names, so what you learn here is ordinary JavaScript graphics.

It is the JavaScript sibling of [Pyctures](https://www.circuitry.dev/pyctures) ([on GitHub](https://github.com/johnwylie70/pyctures)), which does the same from Python. A program has the same shape in either language: `draw()` every frame, `update(dt)` to move things, `await frame()` in a loop. See [Bringing a Pyctures scene across](from-python.md).

## What you need

- [Node.js](https://nodejs.org), version 20 or newer, for the command that runs and builds scenes.
- pictures.js itself: installed in the folder where your scenes are ([Install](../README.md#install)), or a copy of the `pictures.js` folder.
- A web browser.

The command uses only what comes with Node.

## Your first scene

Save this as `hello.js`:

```js
function draw() {
  background("midnightblue")
  circle(width / 2, height / 2, 80, "gold")
}
```

Then run it, in the folder where pictures.js is installed:

```bash
npx pictures run hello.js
```

From a copy of the `pictures.js` folder there is nothing to install. The same command there is `node bin/pictures.mjs`:

```bash
node bin/pictures.mjs run hello.js
```

Your browser opens and shows the scene. That is a whole program. There is nothing to import, no HTML to write and nothing to set up: `draw()` is called every frame. `background` paints the whole canvas and `circle(x, y, radius, colour)` draws a circle. `width` and `height` are the size of the canvas, so the circle sits in the middle. For everything else there is `ctx`, the web's own 2D drawing surface.

The scene can be anywhere on your computer. Give the command its path: `npx pictures run ../my-scenes/hello.js`.

## The next three steps

Change `hello` a little at a time. Each of these is a whole program too.

### Make it move

```js
let x = 0

function update(dt) {
  x += 200 * dt              // 200 points every second
  if (x > width) x = 0       // off the right edge: start again on the left
}

function draw() {
  background("midnightblue")
  circle(x, height / 2, 40, "gold")
}
```

`update(dt)` is called before every `draw()`. `dt` is the time since the last frame, so `200 * dt` moves the circle 200 points a second on any screen. Change the 200 and run it again.

### Make it answer you

```js
let x = 200, y = 150

function update(dt) {
  if (keys.has("ArrowLeft")) x -= 300 * dt
  if (keys.has("ArrowRight")) x += 300 * dt
  if (mouse.down) {          // a mouse button, or a finger
    x = mouse.x
    y = mouse.y
  }
}

function draw() {
  background("midnightblue")
  circle(x, y, 40, "gold")
}
```

`keys.has("ArrowLeft")` is true while that key is held, and `mouse` is the pointer, or a finger on a touch screen. Click the scene first, so it has the keyboard.

### A bit more: a small game

```js
const basket = new Sprite("🧺", 200, 250, 64)
const stars = []
for (let i = 0; i < 5; i++) stars.push(new Sprite("⭐", random(400), random(300), 36))
let score = 0

function update(dt) {
  if (mouse.inside) basket.x = mouse.x   // the pointer is over the picture
  basket.y = height - 50
  for (const star of stars) {
    star.y += 200 * dt
    const caught = star.touches(basket)
    if (caught) score += 1
    if (caught || star.y > height) {   // caught or missed: back to the top
      star.x = random(width)
      star.y = 0
    }
  }
}

function draw() {
  background("midnightblue")
  for (const star of stars) star.draw()
  basket.draw()
  text("Score " + score, 12, 30, "white", 20)
}
```

A `Sprite` is a picture that moves, here an emoji, and `touches` says when two of them meet. Move the mouse, or drag a finger, to catch the stars.

These four are in the examples folder as `hello.js`, `moving.js`, `follow.js` and `first_game.js`. The tutorials carry on from here: [your first drawing](tutorials/first-drawing.md), [a bouncing ball](tutorials/bouncing-ball.md), [a simple game](tutorials/game.md) and [Space Rocks](tutorials/space-rocks.md). The plain functions (`background`, `circle`, `rect`, `line`, `text`) cover a first picture; for everything else there is `ctx`, the web's own 2D drawing surface ([Drawing in 2D](drawing-2d.md)).

## `run`: see it as you write it

- A small web server starts on your computer, at `http://localhost:8000/`, and your browser opens on the scene. The scene fills the window.
- The server answers this computer only. Another device on your network cannot open the address; to see a scene on a phone, `build` it and put the folder on a web host.
- **Your program runs in the browser.** The server only hands it the files.
- **Save the file and the scene runs again.** Keep the browser beside your editor and save to see each change. Saving any other file in the scene's folder does the same.
- Anything your program writes with `console.log()` appears in the browser's console (open the browser's developer tools to see it).
- When something goes wrong, the page shows the error along its bottom edge, with the line it happened on. Fix it and save.
- Press `Ctrl+C` in the terminal to stop.

| Option | What it does |
|---|---|
| `--port 9000` | Use this port. Without it, the port is 8000. If something else is already using the port, the command stops with an error that says `EADDRINUSE`: give it another port. |
| `--no-browser` | Do not open a browser. Open the address it prints yourself. |

The server shows the scene's own folder, so a scene finds the files beside it: `loadImage("cat.png")`, `await loadText("words.txt")` and `await loadJSON("level.json")` all take a path from the scene's file.

## `build`: share it

```bash
npx pictures build hello.js -o site/
```

This writes a folder that runs the scene with nothing on the server but files:

```text
site/
├── index.html        the page: the scene, filling the window
├── hello.js          your scene, and everything else that was in its folder
└── pictures/         pictures.js itself, and three.js if the scene is 3D
```

Put the folder on any static web host, or try it on your own computer with any web server, such as:

```bash
python3 -m http.server --directory site
```

Open the address it prints. Opening `index.html` straight from your disk does not work: the browser will only load the scene from a web server.

### What goes in the folder

`build` copies **the whole folder the scene is in**, so the pictures and files the scene loads go with it. Keep a scene you mean to share in a folder of its own, with only what it needs. Folders called `node_modules` and `.git` are left out. If the scene's folder has an `index.html` of its own, the built one takes its place in the output.

### What runs where

The scene runs in the browser, on the page itself. Nothing is loaded from anywhere else: three.js is in the `pictures/` folder, and it is only put there, and only loaded, when the scene is 3D. Every path in the folder is relative, so it works wherever you put it.

| Option | What it does |
|---|---|
| `-o site/` | The folder to write. It must be given. Files of the same name in it are replaced; nothing else is removed. |

## pictures.js in Circuitry Studio

pictures.js comes from [Circuitry Studio](https://www.circuitry.dev), where a JavaScript scene runs in a code editor with a live preview beside the code, on phones, iPad, the web and desktop. It is designed for projects made there, and runs anywhere a browser does. Scenes written with this library run there unchanged, and the other way round. Its page, where you can edit a scene and run it, is [circuitry.dev/pictures](https://www.circuitry.dev/pictures). Its Python sibling, Pyctures, is at [circuitry.dev/pyctures](https://www.circuitry.dev/pyctures).

## What's in these docs

- [How a program is shaped](program-shape.md): drawing once, drawing every frame, loops, input, and reading values back.
- [Drawing in 2D](drawing-2d.md): shapes, colours, text, transforms, pictures and sprites.
- [3D scenes](3d.md): renderer, camera, shapes, materials, groups, orbit controls and picking.
- [Colours](colours.md): names, hex, rgb, hsl, see-through colours, gradients and patterns.
- [2D functions](2d-functions.md) and [3D functions](3d-functions.md): everything, one line each.
- [Bringing a Pyctures scene across](from-python.md).
- [Use it on your website](website.md).
- Tutorials: [your first drawing](tutorials/first-drawing.md), [a bouncing ball](tutorials/bouncing-ball.md), [a simple game](tutorials/game.md), [Space Rocks](tutorials/space-rocks.md), [a spinning cube](tutorials/spinning-cube.md), [lighting a scene](tutorials/lighting.md), [a solar system](tutorials/solar-system.md) and [a live chart](tutorials/live-chart.md).
- [Finding mistakes](finding-mistakes.md): errors, printing, and a scene that is stuck.
- [Tips and limits](tips.md).
