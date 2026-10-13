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

Each one takes a last `{ … }` of options. All of them take `x` and `y` (to place it by hand: its top left corner) and `colour`.

| Call | What it is |
|---|---|
| `dial(label, min, max, start)` | A dial. Options: `step`, `unit`, `log` (turned by ratio, as a pitch is), `digits`, `size`, `onChange` |
| `dial(label, target, "setting")` | A dial that is a setting of a target |
| `slider(…)` | The same as a dial, as a slider. `{ vertical: true }` stands it upright |
| `button(label, onPress)` | A button. `fire.pressed` is true once for each press (ask it in `update`), and `fire.held` while it is down |
| `toggle(label, on)` | A switch. `mute.on` is true or false. `toggle(label, target, "setting")` ties it to a setting |
| `select(label, choices, start)` | One of a list, stepped through with the arrows at its sides. `wave.value` is the choice and `wave.index` its place. `select(label, target, "setting")` takes the choices from the target |
| `keyboard(target, { octave, octaves })` | A piano keyboard along the bottom. `piano.notes` is what is held now (60 is middle C). Options: `keys: false` (no computer keys), `hints: false` (no letters on the keys), `onNoteOn(note, velocity)`, `onNoteOff(note)` |
| `scope(source)` | A line of numbers, live: a synth, a function that returns a list, or a list. With no source, `graph.push(value)` adds a point, to draw any value over time |
| `meter(source)` | A level from 0 to 1 as a bar of lights: a synth, a function, or `level.value = 0.7` |
| `label(text)` | Words in the row, as a heading |
| `row()` | The controls after this start a new row |
| `layout({ at: "bottom" })` | Where the rows go (`"top"` or `"bottom"`), and `scale`, `margin` and `backdrop` (true, false or a colour) |
| `theme({ accent: "deepskyblue" })` | The colours |
| `over(x, y)` | Is a control at this point? |

Every control has `value`, `label`, `remove()` and `place(x, y)`. `onChange(value)` is called when a hand changes it.

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

They are made by dials.js, which sits in the `dials` folder beside `pictures.js`, which is loaded only by a scene that calls one of the names above. A scene with no controls loads nothing for them, and a scene that has a function of its own called `label` or `row` keeps its own. `pictures build` copies the folder for a scene that uses it.

The Python spellings of the options work too: `on_change`, `on_press`, `on_note_on`.

## Related

- [Sound and music](sound.md)
- [Function index](function-index.md#dials-sliders-and-a-keyboard)
