# Code-along

Code typed on one side, and on the other side what that code really draws, for each stage of the typing. It is for a tutorial video, a lesson or a demo: the picture is never faked, so if the code is wrong the picture is wrong, and you see it.

```js
const stages = [
  { code: `function draw() {
  background("navy")
}` },
  { code: `function draw() {
  background("navy")
  circle(width / 2, height / 2, 80, "gold")
}` },
]

function draw() {
  background(houseStyle.palette.ink)
  codeAlong({ stages, duration: 8 })
}
```

Stage 1 is typed from an empty editor. Stage 2 types only what changed (the new `circle` line) and the lines that were already right stay where they are. When a stage is typed the preview on the right runs it, and the new lines are lit on the left. The same call works in a wide frame (1920 by 1080, code on the left) and a tall one (1080 by 1920, code above the preview): it is laid out from the size of the scene.

Nothing to import. The part that does this is loaded only by a scene that uses one of its names (it takes its colours from the [kinetic text](kinetic-text.md), which is loaded with it). See the example `code_along_circle.js`.

## Stages

A stage is `{ code, language, hold, preview }`, and a string is a stage of its own.

| Field | Meaning |
|---|---|
| `code` | The text of the editor after this stage |
| `language` | `"javascript"` (the default) or `"python"`: what the colours are for, and whether the preview can run it (see below) |
| `hold` | Seconds the finished stage stays before the next one is typed (1.5) |
| `preview` | For a stage the scene cannot run (Python): a picture, a canvas or a function `(ctx, width, height, seconds)` to draw in its place |
| `at`, `typeAt`, `typeTime` | When this stage's typing begins, to match a voice-over: `at` in seconds into the beat, `typeAt` as a share (0 to 1) of `duration`; `typeTime` is how many seconds the typing takes. See below |

Between two stages the editor does what a person does: the lines both have stay, each run of lines that differ is a place to type, and in a line that changes only the part that differs is typed again (`80` becomes `r`, and the rest of the line is not touched). The old text stays until the cursor gets there.

## Options

All of them but `stages` are optional.

| Option | Meaning |
|---|---|
| `start` | Seconds into the scene when the beat begins (0). Before that nothing is drawn |
| `duration` | Seconds the whole beat takes. Typing is made faster (or the holds shorter) to fit, and the holds longer when there is time to spare. Left out, it is the natural time |
| `typingSpeed` | Characters a second (22), before it is fitted to `duration` |
| `layout` | `"auto"`: code beside the preview in a wide frame, above it in a tall one. Or `"side"` or `"stack"` |
| `x`, `y`, `w`, `h` | The box, in pixels. The safe area of the frame by default |
| `style` | A voice of `houseStyle` (`"techy"`), or an object that changes one. Its accent lights the changed lines, the cursor and the callouts |
| `run` | `true` (the default): the preview runs each stage. `false`: only the code, in the whole box |
| `live` | `false` (the default): the preview changes when a stage is fully typed. `true`: it runs the typed text whenever that is a program, for a live-coding feel |
| `fontScale` | 1. The text is never smaller than 3 percent of the frame's height; a smaller scale is raised to that and reported |
| `callouts` | `[{ at, line, text, duration }]`: a label with an arrow at a line of the code, `at` seconds into the beat, for `duration` seconds (2.5) |
| `previews` | A list with a `preview` for each stage, as in a stage |
| `t` | The time to draw at. Left out, it is the scene's own seconds, `kineticTime()` |
| `hold` | `hold: false` takes the whole thing away when the beat ends |
| `seed` | Changes the typing's unevenness (1) |
| `previewPad` | Pixels the stage's box is set in from the preview's edges (4 percent of its smaller side) |
| `demoVoice` | `false`. `true` makes the mouth in a stage talk (see below) |

```js
codeAlong({
  stages,
  duration: 12,
  callouts: [{ at: 6.4, line: 3, text: "half the width" }],
})
```

Each call gives back `{ progress, stage, phase, typed, warnings }`, or `null` before it starts. `phase` is `"lead"`, `"type"`, `"hold"` or `"done"`, and `typed` is how many characters of the stage's new text are typed. `warnings` is a list of what could not be shown as asked.

## The preview

The preview is the stage's code run for real, as a scene of its own: it has `width` and `height` (the preview's, not the frame's), the drawing functions and the rest of what a scene is given, and its own `setup()`, `update(dt)` and `draw()`. It is clipped to its box, and the box the stage sees is set in from the edge (`previewPad`), so a ball at `x = 40` is whole on the first frame. `update(dt)` is called with a fixed 1/60 of a second from 0 up to the stage's own time, so a ball that moves is in the same place whenever you ask. A stage that does not compile or throws shows its message in the preview, and the message is in `warnings`.

A stage's `random()` and `pick()` are seeded, so a stage that uses chance draws the same picture every time. (`Math.random` is not changed: a stage that calls it is not the same twice.)

Before stage 1 is typed there is nothing to show yet, and while a stage is typed the preview keeps showing the one before it.

A Python stage cannot be run by pictures.js. Give it a `preview` (a picture made earlier, or a function that draws), or the preview says "Python output pending" and the call warns. In Pyctures the same call runs a Python stage for real: see the Pyctures page.

## Timing the typing to a voice-over

By default the stages share the beat equally. To type a stage when the words about it are said, give it a time:

```js
const stages = [
  { code: "…" },                               // typed from the start
  { code: "…", at: 4.2, typeTime: 1.5 },       // begins 4.2 s into the beat
  { code: "…", typeAt: 0.75 },                 // begins three quarters of the way through `duration`
]
```

A stage with no time follows the one before it. A stage that has a next one at a set time is typed to be finished 0.3 s before it, and held until then; the last is held to `duration`.

## Voice in a preview

A stage that calls `say("Hello!")` never speaks in the preview: the beat's voice-over owns the sound, so nothing is said twice. `say()` gives back how long the line would take. `mouth(x, y)` in a preview is a sixth of the preview's smaller side across (not of the whole frame) and stays shut, unless the call has `demoVoice: true`: then the mouth talks from a made-up level for the stage's last `say()`, the same as the draft voice's. `demoVoice: { delay: 0.3 }` starts it later.

## Readable

Code in a video is read on a phone, so it is larger than anyone codes, and the code-along never shrinks it to make it fit.

- **Size.** The text is 3 percent of the frame's height or more (a little more in a wide frame). In 1920 by 1080 that is 37 pixels, in 1080 by 1920 it is 58.
- **Line length.** About 60 characters a line is the budget in a wide frame and 34 in a tall one, and what really fits is less: about 43 and 23 with the examples' sizes. A line that does not fit is wrapped after a comma, or after an opening bracket so the argument starts the next row (`background(` then `"navy")`), with its indent and two more; a stage with more lines than fit scrolls to keep the cursor in view. Both are in `warnings`, with the line, so you can shorten it: keep lines under about 24 characters if the video is tall.
- **Safe area.** Nothing is drawn outside the part of the frame that phone apps leave clear (the same as the kinetic text: 14 percent kept clear at the top of a tall frame and 18 at the bottom, 5 percent all round in a wide one).

## Which stage, and when

`codeAlongStageAt(stages, t, options)` tells you, with no drawing, which stage is being typed `t` seconds into the beat and how many characters of it are in. It takes the options that change the timing (`duration`, `typingSpeed`, `seed`).

```js
const now = codeAlongStageAt(stages, 5.5, { duration: 12 })
// now.stage (0 first), now.phase, now.typed, now.inserted (how many in all),
// now.text (what the editor shows), now.cursor, now.changed (the lines lit),
// now.preview (the stage on show, -1 for none), now.previewTime, now.total
```

It is a pure function of its arguments: the same answer every time. A video script can use it to place a voice-over line on the stage it is about.

## Time

Like the kinetic text, the code-along is a function of time and nothing else: no wall clock, no `Math.random`. The time is the scene's own `kineticTime()` (which a recorded scene moves by exactly one frame), or the `t` you give, which wins. A still at an explicit time is exact, and drawing it twice gives the same pixels.

## Drawing the preview yourself

`codeAlongBegin(options)` draws the code and opens the preview's pane, clipped and moved to its corner; what the scene draws until `codeAlongEnd()` is drawn inside it, and `previewError: "text"` shows a message in it instead. It is what Pyctures uses to run a Python stage; use it for a preview that is not code.

## Related

- [Kinetic text](kinetic-text.md): moving words for the first seconds of a video, and the house style the code-along borrows
- [Make it talk](say.md): a voice for the lines the code-along is about
