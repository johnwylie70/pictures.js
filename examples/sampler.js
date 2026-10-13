// Sampler: record a word, then play it on the keys.
// Use: press "record" and say a word. Middle C is the word as you said it; higher keys are higher and faster,
// lower keys lower and slower, and several keys make a chord of you. Play with the mouse, your fingers or the
// keys A S D F G H J (white) and W E T Y U (black). With no microphone the keys play a bell instead.
// Try changing: 1.5, the seconds recorded; "bell" to "pluck"; take.loop = true; take.voice = "robot".
//
// Run it:   pictures run sampler.js
// Share it: pictures build sampler.js -o site/
// The browser asks whether the page may use the microphone: say yes.

const mic = useMicrophone()
let word = makeSynth("bell")       // what the keys play until a word is recorded

const says = label("Press record and say a word")
button("record", () => {
  const take = mic.record(1.5)
  says.value = "Recording"
  take.onDone(() => {
    if (!take.seconds) {
      says.value = "No microphone here, so the keys play a bell"
      return
    }
    take.release = 0.2
    take.reverb = 0.2
    word = take
    says.value = "Now play the keys"
  })
})
button("backwards", () => { word.reverse = !word.reverse })
dial("echo", 0, 1, 0, (value) => { word.echo = value })

// The keyboard plays whatever `word` is now: it only needs something with noteOn, noteOff and notes.
keyboard({
  noteOn: (note, loud) => word.noteOn(note, loud),
  noteOff: (note) => word.noteOff(note),
  notes: () => word.notes(),
}, { octave: 4 })

function draw() {
  background("darkslategray")
}
