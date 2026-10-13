// Synth Panel: a synth with a dial for each of its settings, the wave it is making, a level meter and a piano keyboard.
// Use: play the keys with the mouse, with fingers (several at once), or with the computer's keys A S D F G H J
// (white) and W E T Y U (black); Z and X go down and up an octave. Drag a dial up or down to turn it.
// Try changing: "lead" to "bass", "pad" or "chip"; add dial("vibrato", lead, "vibrato"); { octave: 4 } to 3.
//
// Run it:   pictures run synth_panel.js
// Share it: pictures build synth_panel.js -o site/

const lead = makeSynth("lead")

select("wave", lead, "wave")
dial("cutoff", lead, "cutoff")
dial("resonance", lead, "resonance")
dial("echo", lead, "echo")
slider("attack", lead, "attack")
slider("release", lead, "release")
scope(lead)
meter(lead)
keyboard(lead, { octave: 4 })

function draw() {
  background("midnightblue")
}
