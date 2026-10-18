// Kinetic text gallery: every moving-text effect in turn, three
// seconds each, in three voices, in a wide frame or a tall one.
// Try changing: the words (put *stars* round the word that matters);
// "playful", "techy" or "calm"; each, how long an effect shows.
//
// Run it:   pictures run kinetic_gallery.js

// Each effect: its name, the function, and the words it is given.
const show = [
  ["wordSlam", wordSlam, "Learn *to code* today"],
  ["letterWave", letterWave, "Everything *moves*"],
  ["letterBounce", letterBounce, "Drop in *bounce*"],
  ["typewriterText", typewriterText, "print('hello, world')"],
  ["glitchText", glitchText, "Signal *lost*"],
  ["maskReveal", maskReveal, "Wipe *it* clean"],
  ["scalePop", scalePop, "Make it *pop* now"],
  ["tickerText", tickerText, "Free to try   *Python*   JavaScript"],
  ["countUp", countUp, "12,000+"],
  ["highlightSweep", highlightSweep, "Mark the *important* part"],
]
const voices = ["playful", "techy", "calm"]

// Seconds each effect is shown for.
const each = 3

function draw() {
  background(houseStyle.palette.ink)

  // Which effect it is, and how far into its slot.
  const clock = kineticTime()
  const n = Math.floor(clock / each) % show.length
  const local = clock % each
  const [name, effect, words] = show[n]

  // The name, at the top of the safe area.
  const safe = kineticSafe()
  const label = safe.top + height * 0.03
  text(name, width / 2, label, houseStyle.palette.dim,
    height * 0.035, "centre")

  // The effect, given room under the name. t is the time in the slot.
  const room = (safe.top + height * 0.08) / height
  effect(words, {
    t: local,
    style: voices[n % 3],
    safe: { top: room },
  })
}
