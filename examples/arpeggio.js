// Arpeggio: a chord from one voice, stepping through its notes fifty times a second, as the tunes of a
// Commodore 64 did when they had three voices to spend. A chip bass and chip drums play underneath.
// Use: click or tap to start it, and again to stop.
// Try changing: the chords ("Am", "Fmaj7", "Dsus4"); speed: 50 to 12, to hear each step; "up" to "random".
//
// Run it:   pictures run arpeggio.js
// Share it: pictures build arpeggio.js -o site/

const chords = ["Am", "F", "C", "G"]
const bar = 1.6                          // seconds each chord lasts
let began = null                         // when it started, on the sound clock
let chord = null                         // the arpeggio, while it sounds

function onMouseDown() {
  if (began !== null) {
    began = null
    return stopSound()
  }
  began = soundTime()
  // One note that never starts again: only its chord changes, every bar, for sixteen bars.
  chord = startArp(chords[0], { speed: 50, order: "up", volume: 0.5 })
  for (let i = 1; i < 16; i++) chord.change(chords[i % 4], { after: i * bar })
  makeSynth("chipBass").playNotes("A1:4 F1:4 C2:4 G1:4", bar / 4, { repeat: 4 })
  makeSynth("chipKick").playNotes("C3 - - - C3 - - -", bar / 8, { repeat: 16 })
  makeSynth("chipSnare").playNotes("- - A3 - - - A3 -", bar / 8, { repeat: 16 })
  makeSynth("chipHat").playNotes("C5 C5", bar / 8, { repeat: 64, volume: 0.3 })
}

function draw() {
  background("black")
  const bars = began === null ? 16 : (soundTime() - began) / bar
  if (bars >= 16) {
    if (began !== null) chord.stop()
    began = null
    text("Click to play", width / 2, height / 2, "lime", 28, "centre")
    return
  }
  // The chord that is sounding, and a block for each of the four.
  const now = Math.floor(bars) % 4
  text(chords[now], width / 2, height / 2 - 30, "lime", 72, "centre")
  for (let i = 0; i < 4; i++) rect(width / 2 - 110 + i * 56, height / 2 + 40, 48, 16, i === now ? "lime" : "darkgreen")
}
