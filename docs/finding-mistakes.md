# Finding Mistakes

Full reference: [www.circuitry.dev/docs/pictures/debugging](https://www.circuitry.dev/docs/pictures/debugging) (in Circuitry Studio's help)

When a drawing program does something you did not expect, read its errors and printed output, and check how fast it runs. This page covers each of them.

## Errors: read them, then fix the line

When your program stops with an error, the page shows it along the bottom of the scene, with the line it happened on:

```text
Line 14: speed is not defined   [Run again]
```

The same error is in the browser's console (open the browser's developer tools to see it), with the list of functions that led to it. With `run`, fix the line and save, and the scene runs again. On a page of your own, fix the file and reload the page.

A misspelt function name, such as `ctx.filRect`, is reported the same way, with the line in your file that made it:

```text
Line 6: ctx.filRect is not a function   [Run again]
```

Three kinds of mistake are quieter:

- **A misspelt setting gives no error.** `ctx.fillStlye = "red"` is allowed in JavaScript: it makes a new, useless setting, and the colour does not change. If a colour, font or line width is ignored, check its spelling.
- **A mistake in the shape of the code**, such as a missing bracket or brace, stops the scene before it starts. The message names the line where the browser noticed it, which may be the line after the mistake. A `{`, `(` or `[` that is never closed is reported on the line that opens it: `A { is opened here and never closed: its } is missing`.
- **A mistake inside a helper file** (one loaded with `use`) names the file and its line at the end of the message: `(in helper.js, line 3)`.
- **An error inside a listener you added yourself**, with `canvas.addEventListener(...)`, is not shown on the page. It is in the browser's console.

## Printing

`console.log()` prints to the browser's console. Open the browser's developer tools to see it; nothing is printed on the page or in the terminal. It is the quickest way to see a value:

```js
let score = 0

function update(dt) {
  score += 1
  if (score % 60 === 0) console.log("score is", score)
}

function draw() {
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, width, height)
}
```

Print now and then, as above, rather than every frame: sixty lines a second is hard to read.

To see a value without opening the console, draw it: `ctx.fillText(String(score), 12, 24)` at the end of `draw()`.

## The frame rate

`update(dt)` is given the seconds since the last frame, so `1 / dt` is the frame rate. This scene shows it in the corner; copy the lines that use `fps` into a scene of your own:

```js
let fps = 60

function update(dt) {
  fps += (1 / dt - fps) * 0.05      // smoothed, so the number can be read
}

function draw() {
  ctx.fillStyle = "#101820"
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = "lime"
  ctx.font = "16px monospace"
  ctx.fillText(`${Math.round(fps)} fps`, 12, 24)
}
```

Most screens show 60 frames a second, and some 120. The browser's developer tools have a fuller picture, in their performance panel.

If the number drops, your program is doing more each frame than the device can keep up with. The usual causes:

- **Very many separate drawing calls.** Thousands of shapes a frame is fine; tens of thousands is slow. Draw fewer, bigger things, or join many lines into one path and `stroke()` it once.
- **Heavy work every frame.** Work things out once at the start and keep the results.
- **Reading pixels every frame.** `ctx.getImageData` copies every pixel it is asked for. Other reads cost nothing (see [Tips and limits](tips.md)).
- **Printing every frame.** `console.log` is slow when the console is open.

## When the canvas is frozen or stops moving

If the canvas stays blank, and the page stops answering clicks, the program is stuck. The usual cause is a `while (true)` loop that never waits: every loop that runs forever must `await frame()` (or `await sleep(...)`) inside it. Nothing on the page can tell you so, because a stuck scene stops the whole page, unless the page asked for stuck loops to be stopped. See [Tips and limits](tips.md#canvas-frozen-a-loop-must-wait-for-the-next-frame) for how to free it.

If the canvas is blank but the page still works, look for an error along the bottom of the scene, and check that the scene paints something: a 3D scene shows nothing until `renderer.render(scene, camera)` is called in `draw()`.

## Related

- [How a program is shaped](program-shape.md)
- [Tips and limits](tips.md)
