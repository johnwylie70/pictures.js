# Dials, sliders and a keyboard

A scene can put controls on itself: dials, sliders, buttons, switches, a piano keyboard, a scope and a level meter. You say what you want and it appears. There is nothing to position, nothing to draw and nothing to import, and they work with a finger, the mouse and the computer's keys.

```js
const points = dial("points", 3, 12, 5, { step: 1 })    // from 3 to 12, starting at 5

function draw() {
  background("midnightblue")
  star(width / 2, height / 2, 120, points.value, "gold")
}
```

Drag the dial up or down and the star changes. `points.value` is the number now. In sums the control stands for its number (`speed * dt`), and `points.value = 8` sets it.

## A synth you can play

A control can be tied to a setting of a synth. The dial then is that setting: it takes its range, its unit and where it starts from the synth, and turning it sets it.

```js
const lead = makeSynth("lead")

dial("cutoff", lead, "cutoff")
scope(lead)
keyboard(lead, { octave: 4 })

function draw() {
  background("midnightblue")
}
```

The scope draws the wave the synth is making. The keyboard plays it: with fingers (several at once), with the mouse, and with the keys A S D F G H J (the white keys) and W E T Y U (the black ones); Z and X step down and up an octave. [`examples/synth_panel.js`](../examples/synth_panel.js) has more dials and a meter. The synth comes from [Sound and music](sound.md#a-synth-of-your-own).

## The controls

Each one takes a last `{ … }` of options. All of them take `x` and `y` (to place it by hand: its top left corner), `colour`, `size`, `share` and `span`.

| Call | What it is |
|---|---|
| `dial(label, min, max, start)` | A dial. Options: `step`, `unit`, `log` (turned by ratio, as a pitch is), `digits`, `size`, `onChange` |
| `dial(label, target, "setting")` | A dial that is a setting of a target. The label may be left out: `dial(lead, "volume")` |
| `slider(…)` | The same as a dial, as a slider. `{ vertical: true }` stands it upright |
| `button(label, onPress)` | A button. `fire.pressed` is true once for each press (ask it in `update`), and `fire.held` while it is down |
| `toggle(label, on)` | A switch. `mute.on` is true or false. `toggle(label, target, "setting")` ties it to a setting |
| `rotary(label, choices, start)` | A knob that clicks between a few choices, with a notch for each and their names round it where there is room. Drag to turn it from notch to notch, or tap a name. `mode.value` is the choice and `mode.index` its place. `rotary(label, target, "setting")` takes the choices from the target: `rotary("reverb", lead, "reverbType")`. The choice is written under the knob only where no names are round it; `showValue: true` or `false` says otherwise |
| `select(label, choices, start)` | One of a list, stepped through with the arrows at its sides. `wave.value` is the choice and `wave.index` its place. `select(label, target, "setting")` takes the choices from the target, and keeps up when they change (a list of MIDI devices). `{ style: "rotary" }` makes it a rotary |
| `keyboard(target, { octave, octaves })` | A piano keyboard along the bottom. `piano.notes` is what is held now (60 is middle C). Options: `keys: false` (no computer keys), `hints: false` (no letters on the keys), `animate: false` (the keys jump to a new octave, not slide), `height`, `onNoteOn(note, velocity)`, `onNoteOff(note)`. It never shows so many octaves that a key is too narrow to play |
| `scope(source)` | A line of numbers, live: a synth, a function that returns a list, or a list. With no source, `graph.push(value)` adds a point, to draw any value over time |
| `meter(source)` | A level from 0 to 1 as a bar of lights: a synth, a function, or `level.value = 0.7` |
| `label(text)` | Words. Made just before some controls, it is their heading, on the plate they share |
| `group`, `row`, `column`, `grid`, `page`, `spacer`, `wrap` | What goes with what: see [Laying it out](#laying-it-out) |
| `number`, `textBox`, `readout`, `checkbox`, `choose`, `radio`, `dropdown`, `xyPad`, `colourPicker`, `progress`, `light`, `busy`, `rangeSlider`, `fader`, `joystick`, `dpad`, `actionButton`, `envelope`, `stepGrid`, `pads`, `pitchWheel`, `modWheel`, `steps`, `gatePattern`, `arpPattern`, `drumSeq` | More controls, for any program, for games and for music: see [More controls](#more-controls) |
| `layout({ at: "bottom" })` | Where the plates go (`"top"`, `"bottom"`, `"left"`, `"right"`), and `scale`, `wrap`, `fit`, `minScale`, `maxScale`, `columns`, `size`, `margin`, `compact`, `dividers`, `plates`, `align`, `backdrop` (true, false or a colour), `image` and `onResize`. It gives back `{ width, height, scale }` |
| `room()` | The rectangle no control is on, `{ x, y, width, height }`, for the scene to draw in |
| `theme({ accent: "deepskyblue" })` | The colours |
| `over(x, y)` | Is a control (or a tab, or the bar beside plates that can be moved) at this point? |

Every control has `value`, `label`, `remove()` and `place(x, y)`. `onChange(value)` is called when a hand changes it.

![Rotaries: a small one with its choice written under it, usual and large ones with the names round the knob, one with two choices, five, eight and twelve, and one beside dials](images/dials-rotary.png)

All the sound together is `soundOutput()`: `scope(soundOutput())` and `meter(soundOutput())` show everything the scene is playing.

## A button in a game

```js
const fire = button("fire")
let shots = 0

function update(dt) {
  if (fire.pressed) {
    shots += 1
    playSound("laser")
  }
}

function draw() {
  background("black")
  text("Shots " + shots, width / 2, height / 2, "white", 40, "centre")
}
```

A press on a control is the control's alone. The scene's `onMouseDown` and `onTouchStart` are not called for it and `mouse.down` stays false, so a game that fires on a click does not also fire when a dial is turned. A press anywhere else is the scene's, as always.

## With your hands

- Drag up or to the right on a dial to turn it up. The drag is the dial's until you let go, wherever the pointer wanders.
- Hold Shift to turn a tenth as far. On a touch screen, pull your finger well away from the dial for a quarter.
- Tap twice to put a dial or slider back where it started.
- Tap a slider's track and the handle comes to your finger.
- Each finger on the keyboard holds its own key, and sliding along plays each key in turn.
- The arrows above the keys step an octave, again and again while one is held, and the keys slide there. A finger on the strip between the arrows drags the keys sideways, and they settle on a whole octave.
- A rotary holds at each notch until you have gone most of the way to the next, then clicks over. Tap a name or a notch to go straight to it.
- When there is more than fits, drag a plate's title, or the room between controls, to move the plates. A drag that starts on a dial still turns the dial.
- On a touch screen the controls are made a little bigger, for fingers.

## Laying it out

**There is nothing to do.** Controls line up in the order you make them, on a plate, with the keyboard along the bottom. On a narrow screen the line wraps evenly (six dials are three and three, never five and one), on a touch screen everything is a little bigger, and when the picture changes size it is all laid out again. Controls are drawn a little smaller before a line has to wrap, but never tiny: when there is more than fits, the plates can be moved: with a finger (they carry on a little when it lets go), the mouse wheel, a trackpad or the thin bar beside them, while the keyboard and the scope above it stay where they are. A drag that starts on a dial turns the dial; one that starts on a plate's title, on words or between the plates moves them, passing over dials without turning any; and on a slider that lies across, a finger going along it moves the slider and one going up or down moves the plates. The keyboard is the instrument, and keeps its height: when the plates, the scope and the keyboard do not all fit, the scope is made shorter (never too short to read a wave), and if that is not enough it is the plates that are moved, under a scope and a keyboard that stay where they are. Only on a phone on its side, where there is hardly any height, does the keyboard give up some of its own and the scope go away. `keyboard(lead, { height: 200 })` is kept to, whatever the room.

**A label is a heading.** A `label` made just before some controls is the title of their plate, and they are kept together: a plate moves to the next line whole, never leaving its heading behind. Plates with titles fill the width: they stand side by side, as many to a line as fit, every line reaching both edges, and `row()` says where a line should end when one has to. This is a whole synth panel, and it needs nothing else:

```js
label("oscillator")
select("wave", lead, "wave")
dial("width", lead, "width")

row()
label("unison")
dial("voices", lead, "voices")
dial("detune", lead, "detune")
label("filter")
dial("cutoff", lead, "cutoff")
dial("resonance", lead, "resonance")
```

![A synth panel made of labels and controls: six titled plates, two of them side by side twice, a scope and a keyboard, at the width of a tablet's split view](images/dials-layout-headings.png)

**Groups.** `group` says the same thing out loud, and takes options. What the function makes is in the group:

```js
group("filter", () => {
  dial("cutoff", lead, "cutoff")
  dial("resonance", lead, "resonance")
})
```

Or in a straight line, with no brackets to match: `group("filter")` and then its controls, until the next `group`, `row()` or `page`. The plates of a line share its width and are as tall as each other, and every line is as wide as the others, so the panel looks made rather than poured. This is a whole synth in seven groups:

![The front panel example: oscillator, unison, filter, envelope, delay, reverb and output plates above a keyboard](images/dials-front-panel.png)

**Inside a group**, controls stand in a line. To arrange them another way, put these in it (they nest):

| | |
|---|---|
| `row(() => { … })` | In a line. (`row()` with nothing in it starts a new line.) |
| `column(() => { … })` | One under another. |
| `grid(3, () => { … })` | Three to a line, in columns that line up; fewer where three will not fit. `{ span: 2 }` on a control covers two columns. |
| `spacer()` | All the room that is left over, so what follows is pushed to the far end. `spacer(20)` is 20 points. |
| `{ size: "small" }`, `"large"`, `1.5` | On any control: smaller, larger, or so many times the usual size. A dial, slider and meter also take a size in points (a number over 4). |
| `{ share: 1 }` | On a control or a group: it takes the room its line has left over. Two things with shares of 2 and 1 split the line two to one. |

A group takes `colour` (for its title and every control in it), `columns: 3` (a grid), `gap`, `align` (`"start"`, `"center"`, `"end"`; left out, its controls are spread along the line), `dividers: true` (a line between the groups inside it) and `plate: false`.

```js
group("filter", { colour: "deepskyblue" }, () => {
  column(() => { select("kind", lead, "filter"); toggle("sync", lead, "sync") })
  grid(2, () => {
    dial("cutoff", lead, "cutoff", { size: "large", span: 2 })
    dial("resonance", lead, "resonance", { size: "small" })
    dial("chorus", lead, "chorus", { size: "small" })
  })
})
```

### Size and fit

**By itself**, a panel fits whatever it is on. On a phone held upright its plates are one to a line and are moved up and down with a finger, under a keyboard that stays put. In a tablet's split view they are two to a line, and across a whole tablet three or four, each line reaching both edges. On a touch screen everything is a little bigger, and nothing is ever drawn too small for a finger. Three lines change that: `layout({ scale: 1.3 })`, `layout({ wrap: false })` and `layout({ size: [900, 640] })`.

**Bigger or smaller.** `layout({ scale: 1.3 })` draws everything that much bigger, and it works with everything below.

**Fit the width.** `layout({ wrap: false })` keeps every row exactly as you wrote it (each `row()` is one row, whatever the screen) and draws the whole panel smaller until the widest row fits the width. There is one scale for the whole panel, set by that widest row, so a knob is the same size on every row.

```js
layout({ wrap: false })
label("oscillator"); select("wave", lead, "wave"); dial("width", lead, "width"); dial("pwm", lead, "pwm"); dial("sub", lead, "sub")
row()
label("unison"); dial("voices", lead, "voices"); dial("detune", lead, "detune"); dial("spread", lead, "spread")
label("filter"); select("filter", lead, "filter"); dial("cutoff", lead, "cutoff"); dial("resonance", lead, "resonance")
row()
label("shape"); slider("attack", lead, "attack"); slider("decay", lead, "decay"); slider("sustain", lead, "sustain"); slider("release", lead, "release")
row()
label("delay"); dial("delay", lead, "echo"); dial("time", lead, "echoTime"); dial("feedback", lead, "echoFeedback")
label("reverb"); dial("reverb", lead, "reverb"); dial("size", lead, "reverbSize")
scope(lead)
keyboard(lead)
```

`layout({ fit: "width" })` is the same, and also draws the panel bigger where there is room to spare, so that the widest row reaches both edges: no bigger than `maxScale` (1.6 unless you say), and no bigger than still fits the height.

Under a finger the panel is not drawn smaller than eight tenths of its size, which is as small as is comfortable to touch (with a mouse, half). If the rows are still too wide they are left that size and moved from side to side. You choose the floor: `layout({ wrap: false, minScale: 1 })` never shrinks at all, and `minScale: 0` shrinks as far as it takes.

**A panel of a set size.** `layout({ size: [900, 640] })` lays the panel out once, as if every screen were 900 by 640, and then makes the whole of it bigger or smaller to fit the screen it is on, keeping its shape and standing in the middle. Nothing moves about from one screen to the next: only the size changes. A width alone, `layout({ size: 900 })` (or `fit: "width"` beside a size), fills the width instead, and what does not fit is moved up and down. `x` and `y` are measured in the same size.

![One panel on a phone three ways: by itself, one plate to a line; with wrap false, its rows as written and smaller; and at a set size, the whole panel made to fit](images/dials-fit-phone.png)

A panel made for a tablet is small on a phone. One more line gives the phone its own:

```js
layout(layout().width < 600 ? { wrap: false } : { size: [900, 640] })
```

**A bigger knob is your choice, and it is kept.** `{ size: "large" }`, `"small"`, or a number of times the usual size (`{ size: 1.5 }`) on any control makes it that much bigger than its neighbours on every screen and at every scale. Its label and its value still line up with theirs.

```js
layout({ wrap: false })
group("filter", () => {
  rotary("kind", lead, "filter")
  dial("cutoff", lead, "cutoff", { size: "large" })
  dial("resonance", lead, "resonance")
  dial("drive", lead, "drive", { size: "small" })
})
group("mix", () => {
  dial("volume", lead, "volume", { size: 1.5 })
  dial("pan", lead, "pan")
})
```

![A filter plate with a large cutoff knob among usual and small ones, and a mix plate with a big volume knob, all their labels on one line](images/dials-fit-big-knob.png)

### Controlling wrapping

Say nothing and the panel decides. Say something and it does as it is told.

| | |
|---|---|
| `layout({ wrap: false })` | Never wrap. Every row is the row you wrote, drawn smaller to fit the width (see above). |
| `layout({ wrap: true })` | Every `row()` starts a new line, and a row is split only when it does not fit. |
| `layout({ columns: 3 })` | Three plates to a line, always. |
| `layout({ columns: { phone: 1, tablet: 2, wide: 3 } })` | How many at each width. `phone` is any width, `tablet` 600 points and up, `wide` 900 and up; a number is a width of your own: `{ 0: 1, 700: 3 }`. |
| `group("shape", { wrap: false }, …)` | This group's controls stay on one line, whatever the width. |
| `row({ wrap: false }, () => { group(…); group(…) })` | The two groups stay side by side. |
| `row()` | A new line starts here. Inside a group too. |
| `wrap()` | If this line has to be split, split it here. Nothing happens while it fits. |

When a row that may not wrap is too wide, the whole panel is drawn smaller, not that row alone: one scale, as above. Left to itself, a panel treats a `row()` between two plates with titles as the place to end a line when a line must end, and puts as many plates on a line as fit.

```js
layout({ columns: { phone: 1, tablet: 2, wide: 3 } })
```

![The same panel with three plates to a line on a wide screen](images/dials-fit-columns.png)

```js
group("shape", () => {
  slider("attack", lead, "attack"); slider("decay", lead, "decay")
  wrap()                                  // split here, if it must be split: never between sustain and release
  row({ wrap: false }, () => { slider("sustain", lead, "sustain"); slider("release", lead, "release") })
})
```

**Arranging it yourself.** `layout()` gives back what the layout came to: `layout().width`, `.height` and `.scale`. `layout({ onResize: (now) => { … } })` is called when the picture changes size, with the same three, so a scene can take everything away and make another arrangement.

### Pages, edges and exact places

**Pages.** When there is too much for one screen, give it pages. Each has a tab; the keyboard, and what is made before the first page and after the last, stay on every page.

```js
page("osc")
group("oscillator"); select("wave", lead, "wave"); dial("width", lead, "width")
page("filter")
group("filter"); dial("cutoff", lead, "cutoff"); dial("resonance", lead, "resonance")
page()                      // the pages end here
scope(lead)
keyboard(lead)
```

`page("fx", () => { … })` works too, and `fx.show()` turns to a page from your code.

![Three tabs, osc, filter and fx, with the filter page on show: two plates, then a scope and a keyboard that are on every page](images/dials-layout-pages.png)

**Along an edge, and the room that is left.** `layout({ at: "bottom" })` puts the plates at the bottom, and `"left"` or `"right"` in a column down that side. One group can be a strip along an edge, and `room()` is the rectangle no control is on, for the scene to draw in:

```js
group("moves", { at: "left" }, () => { dial("speed", 0, 10, 4); button("jump"); spacer(); toggle("trail") })
group({ at: "bottom" }, () => { button("left"); button("right"); spacer(); button("fire", { size: "large" }) })

function draw() {
  const area = room()                     // { x, y, width, height }
  rect(area.x, area.y, area.width, area.height, "steelblue")
}
```

![A strip of controls down the left, a strip of buttons along the bottom, and the scene drawn in the rectangle between them](images/dials-layout-strips.png)

**Exactly where you say.** `{ x, y }` on a control or a group places its top left corner, and `control.place(x, y)` moves it. With `layout({ size: [800, 480] })` those numbers are in a panel 800 by 480 that is scaled to fit the picture, so a front panel drawn once is right on every screen:

```js
layout({ size: [800, 480], image: "panel.png" })        // a picture behind the controls
dial("cutoff", lead, "cutoff", { x: 360, y: 30, size: "large" })
group("osc", { x: 20, y: 20, width: 300 }, () => { select("wave", lead, "wave"); dial("sub", lead, "sub") })
keyboard(lead, { x: 20, y: 340, width: 760, height: 120 })
```

**The look.** `layout` also takes `compact: true` (less room around everything), `dividers: true`, `plates: false` (no plates: a picture of your own behind), `backdrop` (a colour), `image`, `align: "center"` (plates keep their own widths) and `scale`. `theme({ accent: "deepskyblue", plate: "#20242c" })` is still one call for the colours.

## More controls

These are made and laid out like the ones above, are numbers or words in your code in the same way, and take the same options.

### For any program

![A number box with a minus and a plus, a text box holding a name, and three readouts: a score, a clock and a speed](images/dials-number-text-readout.png)

```js
const lives = number("lives", 0, 9, 3)         // − and +, or tap the number and type
const name = textBox("name", "Ada")            // tap it and type
let score = 0
readout("score", () => score, { size: "large" })

function draw() {
  background("midnightblue")
  text(`${name.value} has ${lives.value} lives`, 20, 120, "white", 20)
}
```

| | |
|---|---|
| `number(label, min, max, start)` | A number box. Tap − or + to step, hold one to keep stepping (faster and faster), drag up or down on the number, or tap the number and type it. It counts in ones (in tenths over a small range) unless `step` says otherwise. `number(label, target, "setting")` ties it to a setting. `stepper` is the same. |
| `textBox(label, text)` | One line of text. Tap it and type: Enter keeps what you typed, Escape puts back what was there. `name.value` is the text. Options: `placeholder`, `max` (letters), `width`, `onChange(text)` (as each letter is typed), `onEnter(text)`. `textBox(label, target, "setting")` ties it to a setting. |
| `readout(label, () => value)` | Shows a value or a message, and takes no hand. Give it a function (asked every frame), a target and a setting, or nothing: then `score.value = 12` says what it shows. Options: `unit`, `digits`, `size` (`"large"` for a score), `format: "clock"` (65 is 1:05) or a function that makes the words. |

![Two checkboxes, three choices side by side with the middle one lit, three one under another, and a dropdown with its list of planets open](images/dials-checkbox-choose-dropdown.png)

```js
const sound = checkbox("sound", true)                          // sound.on
const mode = choose("mode", ["easy", "medium", "hard"])        // mode.value, mode.index
const planet = dropdown("planet", ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"], "Earth")
```

| | |
|---|---|
| `checkbox(label, on)` | A box that is ticked, with its label beside it. `sound.on` is true or false, as a toggle's is. `checkbox(label, target, "setting")` ties it to a setting. |
| `choose(label, choices, start)` | One of a few, all in sight side by side: tap one, or slide a finger across them. `mode.value` is the choice and `mode.index` its place. Where they do not fit on one line they take two. `choose(label, target, "setting")` takes the choices from the target. |
| `radio(label, choices, start)` | The same, one under another with a round mark each. |
| `dropdown(label, choices, start)` | One of a long list. A tap opens the whole list over the controls; a long one is moved with a finger or the wheel; it closes on a pick or a touch outside it. `planet.open` says whether it is open. |

![An XY pad with its dot and the two numbers under it, a colour patch, a light that is on, a busy ring, a progress bar at 40%, a slider with two handles, and three faders](images/dials-pad-colour-progress-fader.png)

```js
const pad = xyPad("filter", lead, "cutoff", "resonance")      // one finger, two settings
const ink = colourPicker("ink", "tomato")
const price = rangeSlider("price", 0, 100, [20, 80])
const bar = progress("loading")

function draw() {
  background("midnightblue")
  circle(width / 2, height / 2, 60, ink.value)                 // a colour, as you would write one
  bar.value = frameCount / 600                                 // from 0 to 1
}
```

| | |
|---|---|
| `xyPad(label, target, "across", "up")` | A square where one finger sets two numbers at once: across is the first and up is the second. `pad.x` and `pad.y` are the numbers, and `pad.value` is both. `xyPad(label, [0, 100], [0, 50])` is two plain ranges, starting in the middle (a third number in a range says where). The dot comes to your finger; Shift moves it a tenth as far; two taps put it back. Options: `spring: true` (it goes back when you let go), `size`, `onChange(x, y)`. |
| `colourPicker(label, colour)` | A patch of the colour. A tap opens a picker: drag in the square for how strong and how bright, along the strip for the hue, or tap one of sixteen named colours. `ink.value` is the colour as you would write it (`"tomato"`, `"#3a7bd5"`), ready for a drawing call. Options: `colours` (your own named colours, or `false` for none), `onChange(colour)`. `colorPicker` is the same. |
| `progress(label, value)` | A bar that fills, from 0 to 1 (or `min` to `max`). Set `bar.value`, or give it a function: `progress("loading", () => done / all)`. `percent: false` leaves the number out. |
| `light(label, on)` | A light. `ready.on = true`; a number from 0 to 1 is how bright; a colour (`lamp.value = "red"`) shines that colour. `light("signal", lead)` is as bright as a target is loud, and `light("hot", () => heat > 90)` asks a function. |
| `busy(label)` | A ring that goes round while something is happening; `wait.on = false` stops it. |
| `rangeSlider(label, min, max, [low, high])` | A slider with two handles. `price.low` and `price.high` are the numbers. The handle nearer your finger moves, and neither passes the other. `rangeSlider(label, target, "start", "end")` is two settings. `onChange(low, high)`. |
| `fader(…)` | A slider that stands upright with the look of a mixing desk's. It is a slider in every other way: `fader("volume", lead, "volume")`. |

![The colour picker open under its patch: a square of one hue from white to black, a strip of hues, and sixteen named colours](images/dials-colour-picker.png)

**Typing.** A canvas cannot be typed into, so while you type a real box for text lies over the control: your device's own keyboard, caret, selection and paste all work. On a phone or tablet the keyboard comes up when your finger lifts, and a number asks for the number keys. What you type goes to the box and not to the scene's `keys`. It works the same when the picture is drawn smaller or larger, when the page is scrolled, and when the scene is shut inside a frame (as a preview's is): nothing is asked of the page around it.

**Keys.** The control you touched last takes the arrow keys: on a number box they step it (Shift ten at a time, Home and End go to the ends, Enter types). Space ticks a checkbox, the arrows move among choices, and on a dropdown Enter opens the list, the arrows move through it, Enter picks and Escape closes. The arrows move an XY pad's dot and the handle of a two-handled slider that was touched last. Tab goes to the next control that takes keys.

### For games

![A joystick pushed up and to the right, a pad of arrows with the left one lit, and two round buttons, B and A, with A pressed](images/dials-joystick-dpad-buttons.png)

```js
const stick = joystick()
const fire = actionButton("A")
let x = 200, y = 200

function update(dt) {
  x += stick.x * 300 * dt                    // each from -1 to 1, and 0 when you let go
  y += stick.y * 300 * dt
  if (fire.pressed) shoot()
}
```

Each finger holds its own control, so one thumb steers while the other fires.

| | |
|---|---|
| `joystick()` | A stick for a thumb, which springs back when you let go. `stick.x` and `stick.y` are each from -1 to 1 in the scene's own directions (y goes down the picture, so `y += stick.y * speed` goes where the thumb pushes). `stick.angle` is the way it is pushed (in radians) and `stick.distance` how far, from 0 to 1. Options: `floating: true` (it appears where the thumb lands, anywhere in its box: give `width` and `height`), `asKeys: true`, `size`, `onChange(x, y)`. |
| `dpad()` | A pad of arrows. `pad.left`, `pad.right`, `pad.up` and `pad.down` are true while pressed, and `pad.x` and `pad.y` are -1, 0 or 1. A thumb slides from one arrow to the next; between two, both are pressed, unless `ways: 4`. |
| `actionButton("A")` | A round button: `fire.pressed` is true once for each press and `fire.held` while it is down, as for any button. `{ key: "space" }` holds that key down for the scene while it is pressed. |

**A game written for the keyboard, on a phone.** `dpad({ asKeys: true })` holds the arrow keys down for the scene (`"wasd"` for those keys), so a game that asks `keys.has("ArrowLeft")` is played by touch with not a line changed:

```js
dpad({ asKeys: true })
actionButton("jump", { key: "space" })

function update(dt) {
  if (keys.has("ArrowLeft")) x -= 300 * dt   // the keyboard, or the pad
  if (keys.has(" ")) jump()
}
```

For a game, put the controls in a strip and draw in the room that is left: `group({ at: "bottom", plate: false }, () => { … })` and `room()`.

### For music

![The shape of a note as a graph with four corners, a pitch wheel and a mod wheel, four pads with the kick held, and a grid of sixteen steps for kick, snare and hat with the fifth column lit](images/dials-envelope-steps-pads.png)

```js
const lead = makeSynth("lead"), kick = makeSynth("kick")
envelope("shape", lead)                                    // lead's attack, decay, sustain and release
const grid = stepGrid("drums", 16, ["kick", "snare", "hat"])
const kit = pads("kit", ["kick", "snare", "hat", "clap"], kick)
let last = -1

function update(dt) {
  const step = Math.floor(beat() * 4) % 16                 // sixteen steps to four beats
  if (step === last) return
  last = grid.step = step                                  // light the column that is playing
  if (grid.get("kick", step)) kick.play("C2")
}
```

| | |
|---|---|
| `envelope(label, target)` | How a note begins, settles, holds and dies away, as a graph whose corners you drag: the first sets the attack, the second the decay (across) and the sustain (up and down), the last the release. It finds the target's `attack`, `decay`, `sustain` and `release` by those names, or takes the four names: `envelope("shape", lead, "a", "d", "s", "r")`. With no target, `shape.attack` and the rest are numbers to use. Two taps put it back; `onChange(attack, decay, sustain, release)`. |
| `stepGrid(label, steps, rows)` | A grid of steps, each on or off: a row for each sound. A tap turns a step over, and a finger dragged along turns on (or off) every step it crosses. `grid.value` is the rows, each a list of 0 and 1; `grid.get("kick", 0)` reads one step and `grid.put("kick", 0, true)` writes one; `grid.row("kick")`, `grid.clear()`. `grid.step = 3` lights that column as the one playing. On a narrow screen a long row is put on two lines. Options: `value` (the rows to start with), `velocity: true` (drag up or down on a step for how hard, 0 to 1), `onChange(row, step, on)`. |
| `pads(label, names, target)` | Pads to hit, several at once. Each plays a note of the target for as long as it is held (`noteOn(note, velocity)`, `noteOff(note)`), harder the nearer its middle it is hit. Pads named for drums play those drums' notes (a kick is 36, a snare 38, a hat 42); others count up from 36, or are told with `notes`. `kit.value` is the pads held now; `kit.flash("kick")` lights one from your code; `kit.hit("kick")` and `kit.lift("kick")` play one. Options: `notes`, `columns`, `size`, `onNoteOn(note, velocity, name)`, `onNoteOff(note, name)`. |
| `pitchWheel(label, target, "setting")` | A wheel that is rolled, and rolls back to where it started when you let go. Alone, `bend = pitchWheel("bend")` runs from -1 to 1. |
| `modWheel(…)`, `wheel(…)` | The same wheel, which stays where it is put (`{ spring: true }` makes it roll back). Both are sliders in every other way. |

**Patterns: a gate, an arpeggio and a drum sequencer.**

![A gate's pattern as sixteen bars of different heights with its rate, depth and smoothing beside it, and an arpeggio's pattern as a grid of notes with a tied note, an accent and a slide, with its pattern, rate, octaves and style beside it](images/dials-gate-arp-patterns.png)

```js
gatePattern("gate", pad)                                  // pad's gate pattern, with its rate and depth beside it
arpPattern("arp", lead)                                   // lead's arpeggio
const mine = gatePattern("chop", "x.x.x5x.X.3.xx..")      // or one of your own: mine.value, mine.text
```

| | |
|---|---|
| `gatePattern(label, target)` | The steps that open and shut a sound in time, each a bar as tall as the gate is open. Tap a bar on and off, drag up and down on it for its level, drag across to draw a line of them. The − and + at its corner set how many steps (up to 32, or what the target says). |
| `arpPattern(label, target)` | An arpeggio's pattern: steps across, and the notes of the chord up the side (1 is its root; the rows above are the same notes an octave up). Tap a cell and that step plays that note; tap it again for a rest; drag sideways from it and the note is held across the next steps. The lane under the grid gives a step an accent, and a second one a slide where the target has slides. `arp.preset("up-down")` writes a pattern by name (`"up"`, `"down"`, `"up-down"`). Options: `notes` (how many notes of the chord, 4), `octaves` (2), `steps`, `slide`. |
| `steps(label, 16)` | The lane of steps that the two above, and a row of a grid, are made of, to use for anything: a row of accents, a setting that changes each step. Tap and drag across; `{ levels: true }` makes each a bar, `{ accents: true }` gives an accent to a step you drag up on. `steps(label, target, "setting")` ties it to a setting. |
| `drumSeq(label, drums, target)` | A drum sequencer that plays by itself: see below. |

Each has `value` (a list: levels from 0 to 1 for a gate or a lane, and for an arpeggio a step each, `{ note, octave, tie, accent, slide }` with note 0 for a rest), `text` (the same as text), `length`, and `step`: set `gate.step = 3` and that step is lit as the one sounding. Any of `value` and `text` may be set, and `onChange(value)` hears a hand.

**As text**, a pattern can be saved, pasted into your code and handed to a target that keeps it that way:

| | |
|---|---|
| a gate, a lane, a drum's row | one mark a step: `.` off, `x` on, `X` on with an accent, `1` to `9` on at that many tenths. Spaces and `\|` are for the eye: `"x...x... \| x.5.X..."`. |
| an arpeggio | words with spaces between: `1` `2` `3` that note of the chord, `-` a rest, `_` the note before held on; after a note `^` an octave up (`v` down), `!` an accent, `~` a slide: `"1 - 3 2 _ 1! 3~ 5^"`. |

**Tied to a target**, a pattern is ONE setting of it, found by name when you give none (`gate_pattern`, `arp_pattern`, or `pattern`). It is read and written as the target keeps it: as text if the setting is text, else as a list. `describe(name)` may say `max` (the most steps) and, for an arpeggio, `notes`, `octaves` and `slide`. A target that has `step()` or `position()` lights the step that is sounding. The settings that go with it are put beside it on the same plate when the target has them (a rate, depth, smoothing and swing for a gate; a rate, order, octaves, length and style for an arpeggio): a `select` for one that is a choice and a small dial for a number. `{ beside: false }` leaves them out. The marks of the text and the names looked for are each one small table in `dials.js` (`STEP_MARKS`, `ARP_MARKS`, `BESIDE`), so they are changed in one place.

![A drum sequencer: play, a tempo of 124 with a minus and a plus, swing, four rows of sixteen steps for kick, snare, hat and clap with the seventh column lit and the clap's row muted, a breakbeat chosen, and clear](images/dials-drum-seq.png)

```js
const drums = drumSeq("beat", ["kick", "snare", "hat", "clap"], makeSynth("kick"), { pattern: "backbeat", tempo: 110 })
```

`drumSeq` is a whole drum machine in one control. Tap a step on and off, drag across to paint, and drag up on a step for an accent. Tap a drum's name to hear it and the dot beside it to mute its row. Its own strip has play and stop, the tempo (− and +, or tap the number in time), swing, starter patterns (four on the floor, a backbeat, a breakbeat) and clear. On a phone it shows as many steps as fit a finger, a page at a time, and turns the page as it plays.

It plays whatever it is given: `target` (or `targets`, a list or `{ kick: …, snare: … }`) is anything with `noteOn(note, velocity)`, and each row plays its drum's note (a kick is 36, a snare 38, a hat 42, a clap 39; `notes` says otherwise). `onStep(drum, step, velocity)` hears every step that sounds, so with no target at all your own code makes the sound. From code: `drums.play()`, `drums.stop()`, `drums.tempo`, `drums.swing`, `drums.pattern = "breakbeat"`, `drums.mute("hat")`, `drums.get("kick", 0)`, `drums.put("kick", 0, true)`, `drums.value` (the rows) and `drums.text` (a line of marks for each drum).

**Keeping time.** A target (or `{ clock }`) that offers `time()`, in seconds, is handed each step a little before it is due, as `noteOn(note, velocity, { at })` and `noteOff(note, { at })`, to play at exactly that time: the beat stays tight however busy the page is. With no such clock a step is played on the frame it falls due, and the beat will wobble when the page is busy.

## A control for anything

A control can be tied to any object, not only a synth. With nothing else to go on it reads and writes the property you name:

```js
const ball = { radius: 40 }
dial("size", ball, "radius", { min: 5, max: 120 })

function draw() {
  background("midnightblue")
  circle(width / 2, height / 2, ball.radius, "gold")
}
```

## How they are drawn

The controls are drawn on a canvas of their own, laid exactly over the scene's. So they sit on whatever the scene draws, in 2D or 3D, need no call in `draw()`, and cost the scene nothing: only a control that changed is drawn again. A scene that draws nothing at all is given a dark backdrop. They go when the scene stops.

They are made by dials.js, which sits in the `dials` folder beside `pictures.js`, which is loaded only by a scene that calls one of the names above. A scene with no controls loads nothing for them, and a scene that has a function or a variable of its own called `label`, `row`, `number`, `light` or any other of these names keeps its own, and loads nothing: a name counts only where it is called as a function the scene did not make itself. `pictures build` copies the folder for a scene that uses it.

The Python spellings of the options work too: `on_change`, `on_press`, `on_note_on`, `min_scale`, `on_resize`.

## Related

- [Sound and music](sound.md)
- [Function index](function-index.md#dials-sliders-and-a-keyboard)
