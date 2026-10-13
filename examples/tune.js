// Tune: a melody, a bass line and drums, each a line of notes, kept in time by the sound engine.
// Use: click or tap to start it, and again to stop.
// Try changing: the notes ("-" is a rest, ":2" makes a note last two steps); 132, the beats a minute;
// "pluck" to "bell", "flute" or "chipLead".
//
// Run it:   pictures run tune.js
// Share it: pictures build tune.js -o site/

let playing = false

function onMouseDown() {
  playing = !playing
  if (!playing) return stopSound()
  setTempo(132)                          // beat 0 is now
  const step = beats(0.5)                // every note below lasts half a beat
  makeSynth("pluck").playNotes("E4 G4 A4 - A4 G4 E4 D4 C4 D4 E4 - E4:2 - -", step, { repeat: true })
  makeSynth("bass").playNotes("A2:4 F2:4 C2:4 G2:4", step, { repeat: true })
  makeSynth("kick").playNotes("C2 - - -", step, { repeat: true })
  makeSynth("hat").playNotes("- - C5 -", step, { repeat: true, volume: 0.4 })
}

function draw() {
  background("midnightblue")
  // 1 on each beat, falling away until the next one.
  const pulse = playing ? 1 - (beat() % 1) : 0
  circle(width / 2, height / 2, 60 + 40 * pulse, "gold")
  text(playing ? "Click to stop" : "Click to play", width / 2, height - 40, "white", 18, "centre")
}
