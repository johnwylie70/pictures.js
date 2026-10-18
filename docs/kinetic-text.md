# Kinetic text

Words that move: for the first seconds of a video, a title, a caption that needs to catch the eye. Each effect is one line, and the same line works in a wide video (1920 by 1080) and a tall one (1080 by 1920): the words lay themselves out from the size of the scene.

```js
function draw() {
  background(houseStyle.palette.ink)
  wordSlam("Learn *to code*. From zero.")
}
```

Nothing to import. The part that does this is loaded only by a scene that uses one of its names. See the examples `kinetic_gallery.js` (every effect in turn) and `hook.js` (six seconds that open a video).

## The effects

| Call | What you see |
|---|---|
| `wordSlam(text, options)` | The words land one at a time, hard, and the whole text shakes a little |
| `letterWave(text, options)` | The letters appear one after another, then ride a wave |
| `letterBounce(text, options)` | The letters drop in and bounce |
| `typewriterText(text, options)` | Typed out, a little unevenly, with a cursor that blinks after |
| `glitchText(text, options)` | Red and blue copies split apart and slices jump sideways, strongly at first and in short bursts after |
| `maskReveal(text, options)` | A wipe uncovers the text; `direction` is `"right"` (the usual), `"left"`, `"up"` or `"down"` |
| `scalePop(text, options)` | The words rise into place and each `*starred*` word swells and settles |
| `tickerText(text, options)` | One line scrolling along a strip, for as long as it is on |
| `countUp("12,000+", options)` | A number counting up, with its commas, decimals and the words round it; `from` is where it starts (0) |
| `highlightSweep(text, options)` | A highlighter sweeps under the `*starred*` words (or under each line, if none) |

`kineticText("slam", text, options)` is any of them by a short name: `"slam"`, `"wave"`, `"bounce"`, `"type"`, `"glitch"`, `"reveal"`, `"pop"`, `"ticker"`, `"count"` or `"highlight"`. `kineticEffects()` gives that list of names.

Put stars round a word to make it the one that matters: `"Make it *pop*"`. It is coloured in every effect, and the effects above that single words out use it.

## Options

All of them are optional.

| Option | Meaning |
|---|---|
| `start` | Seconds into the scene when it begins (0). Before that nothing is drawn |
| `duration` | Seconds the movement takes. After that the text stays as it ended; `hold: false` takes it away instead |
| `t` | The time to draw at. Left out, it is the scene's own seconds, `kineticTime()` |
| `x`, `y` | Where the middle of the text goes, as a share of the scene: 0 is the left or top, 1 the right or bottom. The middle by default |
| `size` | `"hook"`, `"title"`, `"body"` or `"caption"`, or a number: up to 1 is a share of the scene's shorter side, above 1 is pixels |
| `style` | `"playful"`, `"techy"` or `"calm"`, or an object that changes one: `{ voice: "techy", accent: "hotpink" }` |
| `colour`, `accent` | The text's colour, and the colour of the starred words |
| `beat` | A number of beats, or a music object with a `.beat` (such as the one a tracker song gives): the text pulses on each beat. Without it nothing pulses; `pulse: 0.1` makes it stronger |
| `safe` | `{ top, bottom, side }`, shares of the scene to keep clear, in place of the usual |
| `seed` | Changes the shaking and the unevenness (1) |

Each call gives back `{ progress, box, size }` (how far along it is from 0 to 1, where the text is, and the size in pixels), or `null` before it starts.

## Wide and tall

A scene is laid out from its own size, so the same call makes a wide video and a tall one. In a tall one the text wraps onto more lines. Two rules hold in both:

- **Safe area.** Text stays inside the part of the scene that phone apps leave clear. In a tall scene that is the middle: 14 percent is kept clear at the top and 18 percent at the bottom, for the buttons and captions the app lays over the video. In a wide one it is 5 percent all round. `kineticSafe()` gives the area in pixels if you want to put something of your own inside it.
- **Readable.** Text is never smaller than 3 percent of the scene's height, however small a `size` you ask for. A text that will not fit is wrapped onto more lines and only then made smaller, and never below that.

## Time

An effect is a function of the time it is given, so a recorded video is exact and a frame can be drawn again. By default the time is the scene's seconds, which start at 0 and go on by one frame's time each frame (exactly one over the frame rate in a scene recorded a frame at a time). `kineticTime()` reads them; `kineticTime(5)` sets them, and `kineticTime(5, { hold: true })` stops them there. To time one effect by hand give it `t`, as the gallery does, so that each effect starts at 0 in its own slot.

The shaking and the unevenness are never random: they come from a fixed recipe of the letter's place, the time and `seed`, so the same time always draws the same picture. `seededRandom(seed)` gives you a random function of your own that does the same.

## The house style

`houseStyle` is what every video of ours shares, and the effects read it:

- `houseStyle.palette`: `ink` (the dark backdrop), `paper`, `dim`, and `blue`, `cyan`, `pink`, `yellow`, `green`
- `houseStyle.fonts`: `display` and `mono`
- `houseStyle.scale`: the sizes `hook`, `title`, `body` and `caption`, as shares of the scene's shorter side
- `houseStyle.minimum`: 0.03, the least size, as a share of the height
- `houseStyle.safe`: the safe area of each shape
- `houseStyle.voices`: **playful** (big, round, heavy, springy), **techy** (monospace, cyan, little spring) and **calm** (light, quiet, no spring)

Change a number there and every effect follows. A scene may also pass its own `style` object to one call.

## From Python

In Pyctures they are `word_slam`, `letter_wave`, `letter_bounce`, `typewriter_text`, `glitch_text`, `mask_reveal`, `scale_pop`, `ticker_text`, `count_up`, `highlight_sweep`, `kinetic_text`, `kinetic_time`, `kinetic_safe`, `house_style` and `seeded_random`, with the same options as keywords (`from_` for `from`), and the same call draws the same pixels. A call gives back nothing there. See [Kinetic text in Pyctures](https://www.circuitry.dev/docs/pyctures/kinetic-text).
