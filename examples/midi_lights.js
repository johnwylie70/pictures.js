// MIDI Lights: every key played on a MIDI keyboard rings a bell and throws a ball up the picture, and any knob
// or slider you turn changes how big the balls are. onMidiNote and onMidiControl are functions you write, and
// they are called when a key goes down and when a knob moves.
// Use: play a MIDI keyboard and turn a knob. With none plugged in, click or tap (left to right is low to high),
// or press a key of the computer: that pretends to be one.
// Try changing: "bell" to "pluck"; the colours; make the knob change the reverb instead (bell.reverb = value).
//
// Run it:   pictures run midi_lights.js
// Share it: pictures build midi_lights.js -o site/
// The browser asks whether the page may use your MIDI devices: say yes. (MIDI works in Chrome, Edge and Firefox on
// a computer. Safari, iPhones and iPads have none for web pages.)

const bell = makeSynth("bell", { reverb: 0.4 })
let balls = []
let size = 0.4
let message = "Looking for a MIDI keyboard"

// A key went down. note is its number (60 is middle C), velocity is how hard, from 0 to 1.
function onMidiNote(note, velocity, channel) {
  bell.play(note, 0.4, velocity)
  balls.push({ x: width * (note - 36) / 60, y: height, speed: 150 + 450 * velocity, colour: `hsl(${note * 30}, 90%, 60%)` })
}

// A key came up. (Without this function, onMidiNote would be called for it with velocity 0.)
function onMidiNoteOff(note, channel) {
}

// A knob or slider moved. number says which one, and value goes from 0 to 1.
function onMidiControl(number, value, channel) {
  size = value
}

function onMidiDevices(devices) {
  if (devices.inputs.length) message = "Play " + devices.inputs.join(", ") + ", and turn a knob"
  else message = "No MIDI keyboard was found: click, or press a key, to pretend"
}

// With no keyboard: receiveMidi hands the scene a message just as a keyboard would.
function onMouseDown(x, y) {
  receiveMidi({ type: "noteOn", note: Math.round(36 + 60 * x / width), velocity: 0.8, channel: 1 })
  size = 1 - y / height
}

function onKeyDown(key) {
  receiveMidi({ type: "noteOn", note: 48 + key.charCodeAt(0) % 25, velocity: 0.8, channel: 1 })
}

function update(dt) {
  for (const ball of balls) ball.y -= ball.speed * dt
  balls = balls.filter((ball) => ball.y > -60)
}

function draw() {
  background("black")
  for (const ball of balls) circle(ball.x, ball.y, 6 + 44 * size, ball.colour)
  text(message, width / 2, 30, "white", 16, "centre")
}
