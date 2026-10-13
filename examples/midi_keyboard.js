// MIDI Keyboard: plug a MIDI keyboard in and play this synth with it, and turn its dials with the keyboard's knobs.
// Use: play the keyboard. The first three knobs or sliders you move become the cutoff, the resonance and the echo,
// and the dial on the screen turns with the knob. With nothing plugged in it is still a synth: play the keys on the
// screen with the mouse, your fingers or A S D F G H J, and drag the dials.
// Try changing: "lead" to "pad", "bass" or "keys"; learn another setting ("attack", "reverb"); or tie a knob by its
// number, with lead.mapMidi(74, "cutoff", (value) => { cutoff.value = value }), instead of learning it.
//
// Run it:   pictures run midi_keyboard.js
// Share it: pictures build midi_keyboard.js -o site/
// The browser asks whether the page may use your MIDI devices: say yes. (MIDI works in Chrome, Edge and Firefox on
// a computer. Safari, iPhones and iPads have none for web pages.)

const lead = makeSynth("lead")

const cutoff = dial("cutoff", lead, "cutoff")
const resonance = dial("resonance", lead, "resonance")
const echo = dial("echo", lead, "echo")
scope(lead)
keyboard(lead, { octave: 4 })

lead.playFromMidi()        // the MIDI keyboard plays it: notes, how hard, the pitch wheel and the pedal

// learn: the next knob that is moved turns this setting from then on. The function is given each new value.
lead.learn("cutoff", (value) => { cutoff.value = value })
lead.learn("resonance", (value) => { resonance.value = value })
lead.learn("echo", (value) => { echo.value = value })

const found = label("Looking for a MIDI keyboard")

function onMidiDevices(devices) {
  if (devices.inputs.length) found.value = "Play " + devices.inputs.join(", ") + ", and move three knobs"
  else found.value = "No MIDI keyboard was found: play the keys below"
}

function draw() {
  background("midnightblue")
}
