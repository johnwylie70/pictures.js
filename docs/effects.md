# Effects

A scene can have effects on it: a glow, trails, a kaleidoscope, an old television, rain. You draw some shapes and turn one on. The graphics card does the work, so they are fast, and there is nothing to import.

![Every effect and every look, each on the same small scene](images/effects.jpg)

```js
glow(1)                 // bright things shine
trails(1.5)             // and leave a trail that takes a second and a half to fade

function draw() {
  background("black")
  circle(mouse.x, mouse.y, 40, "gold")
}
```

That is a whole scene. There is nothing to call in `draw()`: an effect that is on is done to every frame, after your drawing.

**[Every effect](effects-reference.md)** is the list, with a picture of each and its settings.

## Turn one on

```js
kaleidoscope(8)         // eight segments

function draw() {
  background("midnightblue")
  for (let i = 0; i < 12; i++) circle(width / 2 + i * 30, height / 2 + 20 * Math.sin(i), 14, "gold")
}
```

Every effect is a function, and calling it turns it on. The first value is the one you most often want to change, and it has a sensible value if you leave it out.

A kaleidoscope shows one slice of your picture, the one that starts at the middle and points right, folded round and round. If the screen goes dark, nothing was drawn in that slice: fill the picture, or turn the slice with `angle`.

## Change its settings

```js
const pattern = kaleidoscope(8, { zoom: 1.5 })

function update(dt) {
  pattern.angle += 20 * dt        // turn it, twenty degrees a second
  pattern.x = mouse.x             // its middle follows the mouse
  pattern.y = mouse.y
}

function draw() {
  background("midnightblue")
  for (let i = 0; i < 40; i++) star((i * 97) % width, (i * 61) % height, 16, 5, i % 2 ? "gold" : "tomato")
}
```

An effect's settings are plain properties: read them, set them, add to them, every frame if you like. Lengths are in the same points as the rest of your scene and angles are in degrees, so a scene looks the same on a phone and on a big screen. Give a setting a function and it is asked every frame: `pattern.zoom = () => 1 + bass()`.

Each effect has `off()`, `on()` and `remove()`, and `amount` from 0 to 1 for how much of it is mixed in. `clearEffects()` takes them all away. A wrong name is said plainly:

```
kaleidoscope has no setting called "segmnts". Its settings are segments, angle, zoom, x, y, amount
```

## Several at once

```js
kaleidoscope(6)
trails(0.7, { zoom: 1.5, spin: 25, hue: 90 })
glow(0.7)
vignette()

let t = 0
function update(dt) { t += dt }
function draw() {
  background("black")
  star(width / 2 + 120, height / 2 + 40 * Math.sin(t), 16, 5, "gold")
  circle(width / 2 + 60, height / 2 + 20, 10 + 6 * Math.sin(t * 3), "tomato")
}
```

Effects are done **in the order you turn them on**. Here the picture is folded, then the folded picture leaves trails, then all of it glows. Swap two lines and you get a different picture.

**Trails** are how the classic screensaver tunnel is made: each frame is last frame's picture, a little bigger (`zoom`: 2 doubles its size every second), a little turned (`spin`, degrees a second) and a little changed in colour (`hue`), with this frame's drawing on top. Trails want a dark background: only what is brighter than the trail is seen over it.

`look("arcade")` is several effects at once, ready-made: `dream`, `arcade`, `vhs`, `neon`, `comic`, `noir`, `storm`, `gameboy` and more. It gives its parts back by name, so `look("vhs").glitch.strength = 1` works.

## A picture with no drawing at all

```js
metaballs("lava")       // blobs that melt into each other
glow(0.6)

function draw() {
  background()          // with no colour: wipe the picture clear
}
```

`plasma`, `flow`, `metaballs`, `starfield`, `fire`, `aurora`, `clouds`, `matrixRain` and the rest of the **backdrops** are pictures the graphics card makes by itself. They are behind whatever you draw, and show wherever you have left the canvas clear. So do not paint a background colour over them: `background()` with no colour wipes the canvas clear each frame.

## Music

In a scene that makes sound, the effects can move to it. Five numbers follow the music, each from 0 to 1 and smoothed so they look musical: `bass()`, `mids()`, `highs()`, `loudness()`, and `pulse()`, which jumps to 1 on each beat and falls away.

```js
playNotes("C2 - C2 C2 - C2 G1 -", 0.25, { repeat: true })

const shine = glow(0.5)
react(shine, "strength", "bass", { from: 0.4, to: 1.5 })     // the glow follows the bass

function draw() {
  background("black")
  circle(width / 2, height / 2, 30 + 60 * bass(), "tomato")
}
```

`react(effect, "setting", "bass", { from, to })` ties a setting to one of the five. The effects listen to all of the scene's sound by themselves; `listenTo(lead)` listens to one synth, a song or the microphone instead. With no sound the five numbers are 0 and nothing goes wrong. `spectrumBars()`, `spectrumRing()` and `waveformRing()` draw the music itself.

For motion that is exactly on the beat, the sound's own clock is better than listening: `pattern.angle = () => beat() * 45`.

## With dials

An effect is something a [dial](dials.md) can turn. The dial takes its range from the effect, and is drawn over the effects, so it is never blurred or folded.

```js
const soft = blur(4)
dial("blur", soft, "radius")

function draw() {
  background("midnightblue")
  star(width / 2, height / 2, 100, 5, "gold")
}
```

## With scenes

In a file of several [scenes](scenes.md), an effect turned on at the top of the file is on for all of them. One turned on in a scene's `setup` is yours to turn off when the scene ends:

```js
class Title extends Scene {
  setup() { this.shine = glow(1.2) }
  draw() { background("black"); text("PRESS A KEY", width / 2, height / 2, "gold", 40, "centre") }
  onKeyDown() { this.shine.remove(); go(Game, { transition: "crossfade" }) }
}
class Game extends Scene {
  draw() { background("navy"); circle(mouse.x, mouse.y, 30, "white") }
}
```

A change of scene is seen **through** the effects: the old scene's picture and the new one are mixed by the transition, and the effects are done to the mix. Trails carry across from one scene to the next.

## A shader of your own

If you know the language graphics cards speak (GLSL), an effect is one function: the colour at one place of the picture.

```js
const wave = shader(`
  vec4 effect(vec2 uv) {
    uv.x += 0.02 * sin(uv.y * 40.0 + time * speed);
    return texture(picture, uv);
  }`, { speed: 3 })

function draw() {
  background("midnightblue")
  star(width / 2, height / 2, 100, 5, "gold")
}
```

`uv` runs from (0, 0) at the top left to (1, 1) at the bottom right. The settings you give (`speed: 3`, or `speed: [3, 0, 10]` with a range, or a colour) are numbers the program can use by name, and plain properties of the effect (`wave.speed = 6`). It is also given `picture` (the scene so far), `previous` (what this effect made last frame), `resolution` and `size`, `time`, `dt` and `frame`, `amount`, the music (`bass`, `mids`, `highs`, `loudness`, `pulse`, and the pictures `spectrum` and `waveform`), and small helpers: `hash`, `noise`, `fbm`, `luma`, `turn`, `hueTurn`, `mirrored`. A mistake in it is said with its line.

## How fast they are, and video

The scene's canvas is handed to the graphics card once a frame, and each effect is one or a few passes over the picture. A scene that uses no effect is not sent the effects at all, and costs what it did before.

On an iPad or iPhone the hand-over is the dear part, because Safari reads every pixel of the canvas back first. So the effects work on fewer pixels there (about a 1080p picture's worth, and fewer still if frames are late) and the result is stretched to fit. `effectsQuality(1)` is every pixel, `effectsQuality(0.5)` half each way, and `effectsQuality("auto")` is what they do by themselves.

**On a phone or a tablet the speed has not been measured.** What has been measured is Safari's engine on a Mac, at an iPad's pixels (2360 x 1640) and a phone's (1170 x 2532): 9 to 12 milliseconds a frame for a chain of effects at every pixel, and 5 to 6 with `effectsQuality("auto")`, where a frame at 60 a second has 16. A real iPad or iPhone has a slower graphics card than that Mac, so expect less; if a scene is slow there, `effectsQuality(0.5)` is the first thing to try, and fewer effects the second.

Every effect is worked out from the picture, its own last frame, its settings and the scene's clock, never from the time of day; grain and glitches come from a seed. So a scene stepped one frame at a time by a video recorder gives exactly the pictures it should, the same every time.

On a page of your own with no recorder, `const film = await recordVideo({ seconds: 5, fps: 60 })` gives a WebM with every frame exactly a sixtieth of a second apart, and `saveVideo(film, "my-scene.webm")` downloads it.
