# Tips and Limits

Full reference: [www.circuitry.dev/docs/pictures/tips](https://www.circuitry.dev/docs/pictures/tips) (in Circuitry Studio's help)

A few things that are good to know once your programs grow: what keeps them fast, what happens to a loop that never waits, and why a drawing can disappear.

## Reads are free

Your code calls the canvas directly, so a value comes back at once: the width of some text, where a mesh is, what a ray hit. There is no `await` on a read and no frame lost to it, so read whenever it is useful, every frame if you like.

- `ctx.measureText(text).width`, `mesh.position.x` and `hits.length` are ordinary numbers. Use them in sums and in `if`.
- `await` is only for time and files: `frame()`, `flush()`, `sleep(seconds)`, `loadText(path)` and `loadJSON(path)`, `saveText` and `saveJSON`, and a database (`openDatabase`, `db.query`, `db.run`, `db.close`). `await vsync()` is another name for `await frame()`.
- Reading pixels with `ctx.getImageData` is the one read that is slow, because it copies every pixel. Keep it for small areas or one-off effects.

## Canvas frozen? A loop must wait for the next frame

The browser draws between frames, and a scene runs on the page's own thread. A loop that runs forever without waiting never gives the browser the chance, and the whole page freezes: the canvas, the buttons, everything.

```js
// The page freezes: this loop never waits.
let x = 0
while (true) {
  x += 1
  ctx.fillRect(x % width, 50, 10, 10)
}
```

Put `await frame()` at the end of the loop, and each pass becomes one frame:

```js
let x = 0
while (true) {
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "black"
  ctx.fillRect(x % width, 50, 10, 10)
  x += 2
  await frame()
}
```

Or use `update()` and `draw()`, which can never freeze the page this way.

If a program does get stuck, nothing on the page answers, and saving the file cannot reload it. To free it:

- Close the tab. After a while the browser also offers to stop the page for you.
- Add the missing `await frame()` and save.
- Open the address again. With `run`, the server is still going, so the address it printed still works.

A page can ask for stuck loops to be stopped instead, by giving `runScene` the option `stopStuckLoops: true` ([Use it on your website](website.md#from-javascript)). Then a loop that holds the page for four seconds is stopped, and the scene shows an error with the loop's line:

```text
Line 3: A loop ran for 4 seconds without waiting, so it was stopped. Put `await frame()` inside it, or draw in draw()   [Run again]
```

A loop written without braces, such as `while (busy) step()`, is not checked. Circuitry Studio's preview turns this on; `run` and a built folder do not.

## Starting and stopping

With `run`, and on a page you build, a scene starts as soon as the page opens, and starts again each time you save the file. It runs until you close the page. On a web page with several scenes, a scene that is scrolled out of view waits until it is in view again.

In [Circuitry Studio](https://www.circuitry.dev) a scene starts by itself when its tab comes on screen, and the footer has Run and Stop; a scene also starts over a moment after you stop typing. To make a file wait for Run there, put this comment near the top, within the first 30 lines:

```js
// pictures: manual
function draw() {
  background("navy")
}
```

Outside Circuitry Studio the line is only a comment, and does nothing.

## When the canvas changes size

The canvas follows the size of the window, or of the box it sits in on a web page. It changes size when you resize the window, rotate a tablet or turn a phone.

- A drawing made once, at the top level, is lost: a canvas is wiped when it changes size. Run it again (save the file, or reload the page) to draw it at the new size.
- A program with `draw()` redraws every frame using the new `width` and `height`.
- A resize also resets the colours, font, line width and every other setting of `ctx`. Set them in `draw()`, next to what they style.
- 3D scenes are not refitted for you. Put these three lines at the top of `draw()` and the picture follows the canvas:

```js
camera.aspect = width / height
camera.updateProjectionMatrix()
renderer.setSize(width, height, false)
```

## Paint your own background

The canvas starts see-through, so what is behind it shows: black with `run` and `build`, and the box's own background on a web page. Start `draw()` by painting your own background (`ctx.fillRect(0, 0, width, height)`, or `scene.background` in 3D), so your picture looks the way you meant it.

## Fit any screen

The canvas can be a tall, narrow phone or a wide desktop window. Work out positions from `width` and `height` (`width / 2` for the middle, `height - 50` for near the bottom) rather than fixed numbers, and read them inside `draw()` and `update()` so they follow a resize.

## 2D or 3D, not both

A canvas is either 2D or 3D. A scene is 3D when its code uses `THREE.` or `addons.`, and then it has no `ctx`. Two things follow:

- A 2D scene must not use `THREE.` in its code. A comment or a string that says `THREE.` does not count. If `ctx` is suddenly `undefined`, look for a line that uses it.
- To put 2D drawing into a 3D scene, such as a label or a score, draw it on a small canvas of your own and use that as a texture ([3D functions: textures](3d-functions.md#textures)).

## Speed

- Most devices draw 60 frames a second, and some 120. To see yours, show `1 / dt` on the canvas ([Finding mistakes](finding-mistakes.md#the-frame-rate)).
- Move things by `speed * dt` in `update(dt)`, so they move at the same speed whatever the frame rate.
- Thousands of shapes a frame are fine. For tens of thousands, draw fewer, bigger things, or join lines into one path and stroke it once. In 3D, one `Points` object with thousands of positions is far quicker than thousands of separate meshes.
- Do heavy work once, at the start, and keep the results.
- `dt` is never more than 0.1, so a long pause (a slow frame, or coming back to a scene that was out of view) does not make things jump.

## Keyboard focus

When a scene fills the page, key presses go straight to it. On a web page with other things on it, key presses go to a scene only after you click or tap it, so the page's own keys (scrolling with the arrows, typing in a box) keep working. If the arrow keys do nothing, click the scene first.

A key's name is what the key types, so with Shift held the A key is `"A"`, not `"a"`. A game that uses letter keys can check both: `keys.has("a") || keys.has("A")`. Or ask for the key by its place on the keyboard, which Shift and the keyboard's language do not change: `keys.codes.has("KeyA")`.

To ask whether Shift, Control, Alt or Command is held, read `keys.shift`, `keys.ctrl`, `keys.alt` and `keys.meta`.

For something that should happen once for each press, such as a jump or a shot, use `pressed.has(" ")` in `update`, or the function `onKeyDown`. `keys.has(" ")` stays true for as long as the key is held. See [Once for each press](program-shape.md#once-for-each-press-pressed-and-released).

## Fingers, the wheel and zooming

- **More than one finger.** `mouse` follows the first finger only. `touches` has every finger that is down, and a pressed mouse button too. See [Every finger](program-shape.md#every-finger-touches).
- **Zoom.** Multiply by `pinch.change` every frame for two fingers or a trackpad, and read `mouse.wheel` for the mouse wheel. See [Zooming](program-shape.md#zooming-pinch-and-the-wheel).
- **The wheel belongs to the page** unless the scene names it. A scene that reads `mouse.wheel` or defines `onWheel` keeps the wheel while the pointer is over it.
- **Movement since the last frame.** `mouse.dx`, `mouse.dy`, `mouse.wheel`, `pinch.change`, `pressed` and `released` are set at the start of a frame and are back to nothing at the start of the next. Read them every frame, in `update` or in your loop.
- **You do not need `addEventListener` for these.** A listener of your own still works, for anything this list does not cover.

## Files and libraries

A scene is a plain script, not a module, so an `import` line at the top is an error. What a scene has is what the list in [How a program is shaped](program-shape.md#the-names-you-can-use) gives it, and everything the browser has.

- Files beside the scene are read with `loadImage(path)`, `await loadText(path)` and `await loadJSON(path)`. A text or JSON file that is not there stops the scene with an error that names it. A picture that is not there is simply never drawn.
- Files a scene writes itself, with `await saveText(path, text)` and `await saveJSON(path, value)`, are read back the same way, and `await openDatabase(name)` keeps rows in a SQLite database ([Files and databases](files-and-databases.md)).
- Of three.js, the core and `addons.OrbitControls` are there. Its other add-ons are not loaded.

## The rest of JavaScript

A scene's code runs directly in the page, so everything a web page's JavaScript has is there: `localStorage`, `fetch`, `Date`, Web Audio, and `document.createElement("canvas")` with its own `getContext("2d")` for drawing off screen. Nothing needs switching on.

This scene keeps a high score in `localStorage`, so it is still there the next time the page opens:

```js
let score = 0
let best = Number(localStorage.getItem("best") || 0)

function onMouseDown() {
  score += 1
  if (score > best) {
    best = score
    localStorage.setItem("best", String(best))
  }
}

function draw() {
  ctx.fillStyle = "#14213d"
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = "white"
  ctx.font = "24px sans-serif"
  ctx.fillText(`Score ${score}   Best ${best}`, 20, 40)
  ctx.fillText("Click or tap to score", 20, 80)
}
```

`localStorage` keeps text, so a number is turned back into one with `Number(...)`. It belongs to the web address the page is on: every scene at that address shares it, so give each value a name of its own.

## Related

- [How a program is shaped](program-shape.md)
- [Finding mistakes](finding-mistakes.md)
- [Use it on your website](website.md)
