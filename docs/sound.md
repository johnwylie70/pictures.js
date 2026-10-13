# Sound and music

A scene can make sound: a game sound in one line, notes and tunes, synths you shape yourself, recorded sounds from a file, and your own voice from the microphone. The names are ready in every scene, with nothing to import and nothing to load.

```js
function onMouseDown() {
  playSound("laser")
}
```

Run it and click. That is a whole program.

## The first click

Browsers keep a page silent until the person using it has clicked, tapped or pressed a key. You do not have to do anything about it: the first touch turns the sound on. A tune you started before it waits, and begins at that touch. So in a game, where the player is clicking or pressing keys anyway, sound just works. For music, start it from a click, as the tune below does.

## Game sounds

```js
playSound("coin")
```

There are fourteen: `coin`, `jump`, `laser`, `explosion`, `hit`, `shoot`, `powerup`, `blip`, `click`, `zap`, `bounce`, `pop`, `win` and `lose`. Put the line where the thing happens:

```js
if (star.touches(basket)) {
  score += 1
  playSound("coin")
}
```

A second value is how loud (1 is as it comes, 0.5 is half), and options go in braces: `playSound("coin", 0.5)`, `playSound("laser", { pitch: 5, pan: -1 })`. `pitch` moves it up or down in semitones and `pan` goes from -1 (left) to 1 (right). [`examples/star_catcher.js`](../examples/star_catcher.js) is a game with four of them.

## Notes

```js
playNote("C4")                    // middle C, for half a second
playNote("C4", 2)                 // for two seconds
playNote("C4", 2, 0.3)            // and quiet: loudness goes from 0 to 1
playNote(["C4", "E4", "G4"])      // three notes at once: a chord
playNote("Cm7")                   // a chord by its name
```

A note is a letter and a number: `"C4"` is middle C, `"A4"` is the A above it, `"F#3"` is F sharp and `"Bb5"` is B flat. It can also be a number, where 60 is middle C and each whole number is one key of a piano. `noteNumber("A4")` gives 69.

## Tunes

```js
let playing = false

function onMouseDown() {
  if (playing) return
  playing = true
  playNotes("E4 G4 A4 - A4 G4 E4:2", 0.25, { repeat: true })
}

function draw() {
  background("midnightblue")
  text(playing ? "Playing" : "Click to play", width / 2, height / 2, "white", 30, "centre")
}
```

`playNotes` plays a tune a step at a time, here a step every quarter of a second. In the text, `-` is a rest, `:2` makes a note last two steps, and `C4+E4+G4` is a chord. `{ repeat: true }` plays it round and round, and `{ repeat: 4 }` four times. It hands back the tune, so you can stop it: `const tune = playNotes(…)`, then `tune.stop()`.

The sound engine keeps the time, not your program. A tune stays even when a frame is slow, and several tunes started together stay together. [`examples/tune.js`](../examples/tune.js) has a melody, a bass line and drums.

## A tune, one note a line

`playNote` plays a note now. `note` plays the next note of a tune: each one begins where the one before it ended, so a tune is ordinary lines of code, with loops and ifs.

```js
function onMouseDown() {
  setTempo(100)
  note("E4", "quarter")
  note("G4", "quarter")
  rest("quarter")
  note("C5", "half")
  chord("Cm", "whole")
  for (const name of ["C4", "D4", "E4"]) note(name, "eighth")
}
```

A length is a name (`"whole"`, `"half"`, `"quarter"`, `"eighth"`) or a number of beats, and a quarter when you leave it out. Every synth has a line of its own (`lead.note("C4", "eighth")`), and lines written in the same go begin together. `loopNotes(() => { … })` has a section go round until its `stop()`, and `startLines()` begins every line again from now.

## A synth of your own

```js
const lead = makeSynth("lead")

function onMouseDown(x, y) {
  lead.cutoff = 200 + y * 10          // brighter towards the bottom
  lead.play("E4", 0.5)
}
```

`makeSynth` gives you an instrument. Start from a ready-made one, change one, or make one from nothing:

```js
const bass = makeSynth("bass")
const soft = makeSynth("lead", { cutoff: 900 })
const mine = makeSynth({ wave: "saw", attack: 0.01, release: 0.3 })
```

The ready-made synths are `keys` (the one `playNote` uses), `bass`, `lead`, `pad`, `pluck`, `organ`, `strings`, `bell` and `flute`; the chip sounds `chip`, `chipLead`, `chipBass`, `chipNoise`, `chipKick`, `chipSnare` and `chipHat`; and the drums `kick`, `snare` and `hat`.

| Call | What it does |
|---|---|
| `lead.play("E4", 0.5)` | A note for half a second. A list of notes is a chord |
| `lead.play("E4", { length: 1, volume: 0.5, pan: -1, after: 0.5 })` | The same things by name, and when |
| `const note = lead.start("E4")` | A note that stays until `note.stop()`. While it sounds: `note.slideTo("G4", 0.5)`, `note.volume = 0.5` |
| `lead.stop()` | Lets go of every note of the synth |
| `lead.playNotes("C4 E4 G4", 0.25)` | A tune on this synth |
| `lead.cutoff = 800` | Changes a setting. Notes that are sounding change too |
| `lead.set({ cutoff: 4000 }, { glide: 2 })` | Changes several, or slides there over two seconds (`slide` is understood too) |

### Settings

Every setting is a plain property, and reads back what you set.

| Setting | What it is |
|---|---|
| `wave` | The raw sound: `"sine"`, `"triangle"`, `"saw"`, `"square"`, or `"pulse"` with a `width` |
| `volume`, `pan` | How loud (1 is normal), and left (-1) to right (1) |
| `attack`, `decay`, `sustain`, `release` | The shape of a note's loudness: seconds to reach full, seconds to fall to the `sustain` level (0 to 1), and seconds to die away at the end |
| `cutoff`, `resonance` | The filter: how bright (20 to 20000), and a whistle at the cutoff (0 to 1) |
| `octave`, `pitch` | Move every note by octaves, or by semitones |
| `glide` | Seconds to slide from one note to the next |
| `vibrato`, `tremolo` | A wobble of pitch, and of loudness |
| `pwm`, `pwmRate` | How far a `"pulse"` wave's width moves by itself (0 to 1), and how many times a second: the thick, moving sound of an old string synth |
| `echo`, `reverb`, `chorus` | How much of the synth goes to each effect (0 to 1) |
| `distortion`, `crush` | Grit (0 to 1), and the bits each sample keeps (16 is clean, 4 is an old games console) |

There are more: `settingNames()` lists every one. The echo, the reverb and the chorus are shared by all the synths, and are shaped with `setEffects({ echoTime: 0.3, echoFeedback: 0.5, reverbSize: 0.8 })`. The reverb is one room that every synth sends into: `setEffects({ reverbType: "hall" })` chooses what kind of space it is (`"room"`, `"hall"`, `"plate"`, `"cathedral"` or `"spring"`), `reverbDecay: 3` how many seconds it rings, `reverbPredelay: 0.03` how long before it starts, and `reverbLowCut: 300` how much of the bass it leaves out (in hertz). A shared setting has one value whoever set it: `lead.reverbType = "hall"` is the same thing, and every synth reads it back.

To change a synth by hand while it plays, put a dial on it: see [Dials, sliders and a keyboard](dials.md).

## Arpeggios, fast and musical

A chord is notes together. An arpeggio is the notes of a chord one at a time. There are two kinds here, and they sound nothing alike.

**Fast: the chord of a Commodore 64 tune.** One voice whose pitch jumps through the chord fifty times a second, which the ear hears as a shimmering chord. The chip had only three voices to spend.

```js
playArp("Cm7")                             // half a second of C minor seventh
playArp("C4", "minor", 2)                  // a note and a kind, for two seconds
playArp(["C4", "E4", "G4", "C5"], 1, { speed: 12, order: "up-down" })
```

`speed` is steps a second: 50 unless you say, which is the speed chip music was written at; at 12 you can hear each step.

**Musical: each step a note of its own, in time with the tempo.** Say how long a step is with `step`, a note length, and every step is struck afresh, held for part of the step and let go.

```js
setTempo(138)
const lead = makeSynth("pluck")
lead.arp("Am", "whole", { step: "sixteenth", octaves: 2, gate: 0.5 })       // a trance arpeggio: up through two octaves
lead.arp("C", "whole", { step: "eighth", order: "up-down", gate: 0.9 })     // a pop arpeggio: slower, nearly joined up
```

What an arpeggio can be told:

| | |
|---|---|
| `step` | how long a step is: `"sixteenth"`, `"eighth"`, `"eighth."`, `"1/12"`, or a number of beats. It follows `setTempo`, even while the arpeggio is sounding |
| `speed` | steps a second instead (50): the fast kind |
| `order` | `"up"`, `"down"`, `"up-down"`, `"up-down2"` (the top and bottom notes twice), `"as written"`, `"random"`, `"together"` (the whole chord at each step: stabs) |
| `octaves` | 1 to 4: through the chord, then the same an octave up |
| `gate` | how much of its step each note is held, 0.05 to 1 (0.5). Short is plucked; 1 is joined up |
| `swing` | 0 to 0.75: every second step is that much of a step late (0.33 is a triplet feel) |
| `accent` | how hard each step is struck, up to eight numbers from 0 to 1 that go round: `[1, 0.5, 0.5, 0.5]`. 0 is a rest |
| `pattern` | a rhythm of its own in the place of the order: `"1 - 3 2 _ 1 3 5^"`, or one by name |
| `style` | `"strike"` (each step a new note: what `step` gives) or `"slide"` (one voice whose pitch jumps: what `speed` gives). Say it to have the other |

In a **pattern** each step is a number (that note of the chord, counted from 1 at the lowest; past the top it carries on an octave up), `-` for a rest, or `_` to hold the last note through the step. After a note, `'` is an octave up, `,` an octave down, `^` an accent and `:3` its own gate in tenths; `~` before a note slides into it. The patterns by name are `bounce`, `octaves`, `root-fifth`, `thumb`, `converge`, `diverge`, `offbeat`, `gallop`, `trance` and `acid`.

One that stays, and changes chord under your hands:

```js
const chord = lead.startArp("Am", { step: "sixteenth", pattern: "trance" })
chord.change("F")                          // from the next step, and it keeps its place in the pattern
chord.gate = 0.3                           // so do gate, octaves, swing, accent, pattern, order, step and speed
chord.stop()
```

A chord has room for eight notes. Every synth has `arp` and `startArp`; with no synth (`playArp`, `startArp`) they play on a plain square wave. The length after the chord is how long the arpeggio sounds, as for any note (half a second unless you say), and it takes `volume`, `pan`, `after`, `at` and `beat` like any note; `chord.change("F", { after: 2 })` changes it later. A struck arpeggio is ordinary notes, so it goes through the synth's envelope and filter at every step, and plays the right recordings of an instrument from `loadSamples`. The tempo an arpeggio in steps keeps is the page's: where several scenes share a page, it is the tempo that was set last. [`examples/arpeggio.js`](../examples/arpeggio.js) plays four chords over a chip bass and drums.

A synth can have a pattern of its own, which every arpeggio of it follows unless it says another: `lead.arpPattern = "trance"` (or the steps, or a list of them such as `[1, 0, 3, 2]`, where 0 is a rest). It reads back as its text, `"1^ - 3 2 - 1^ 3 -"`, and `lead.arpPattern = "off"` takes it away. `lead.arpStep()` is the step that is sounding, counted from 0, for drawing it.

For a sequencer of your own that looks ahead: `soundTime()` is the sound's clock in seconds, and `lead.play("C4", { at: soundTime() + 0.25 })`, `lead.noteOn("C4", 0.8, { at })` and `lead.noteOff("C4", { at })` happen on the exact sample of that time.

### Bending a note

A note's pitch can move, on any synth and on a sample:

```js
lead.play("A4", 1, { bend: "scoop" })                  // up into the note from just below, as a singer starts one
lead.play("C5", 1, { glide: "sixteenth" })             // slides to C5 from the note this synth played last
lead.play("E5", 2, { vibrato: true })                  // begins straight, then starts to sing
lead.play("A3", 1, { bend: "fall" })                   // droops away at its end
lead.play("C4", 1, { slide: 12 })                      // an octave up, at once: a laser
```

| | |
|---|---|
| `glide` | the note starts at the pitch of the synth's last note and slides to its own: `true` (a sixteenth), a note length, or seconds |
| `bend` | `"scoop"` (from 2 semitones below, over a sixteenth), `"fall"` (5 down over an eighth, ending with the note), `"dip"` (a semitone down and back), or `{ to: 2, over: "eighth" }`: how far in semitones, or to a note by name, and how long. `{ shape: "scoop", to: -5 }` is a scoop of another size |
| `slide` | a bend by a number of semitones over a sixteenth, or `{ to, over }` |
| `vibrato` | `true`, or `{ depth: 0.3, rate: 6, delay: "eighth" }`: semitones each way, times a second, and how long the note sounds first |

They are for one note at a time (a chord's notes would all be moved to one pitch), in `play`, `start` and `playNote`; a tune from `playNotes` does not take them. A note that is held can be moved as it sounds: `const note = lead.start("C4")`, then `note.slideTo("E4", 0.2)`, `note.vibrato()` and `note.vibrato(false)`.

## The trance gate

A trance gate turns a synth's sound up and down in a pattern of steps, in time with the tempo, so a held chord becomes a rhythm. It chops whatever the synth is playing.

```js
setTempo(138)
const pad = makeSynth("pad", { echo: 0.3 })
pad.tranceGate = "x.x.xx.x"                // x is open, . is closed; a step is a sixteenth
pad.start(["A3", "C4", "E4"])
```

`pad.tranceGate = "trance"` is a pattern by name: `eighths`, `offbeat`, `gallop`, `trance`, `stutter`, `pump`, `triplets` (with `tranceGateRate` 6) and `dotted`. A digit from `0` to `9` in a pattern is a step part of the way open, so `"2468"` swells; a list of levels from 0 to 1 is a pattern too. It reads back as the pattern's text, and `pad.tranceGate = "off"` takes it away.

Its settings, each one a dial can be tied to:

| | |
|---|---|
| `tranceGateRate` | steps to a beat: 4 is sixteenths, 2 eighths, 3 and 6 triplets |
| `tranceGateDepth` | how far a closed step closes: 1 is silence, 0.5 is half. Giving a pattern makes it 1 |
| `tranceGateSmooth` | seconds from one level to the next; longer is softer |
| `tranceGateSwing` | every second step that much of a step late |
| `tranceGateStereo` | left and right by turns |
| `tranceGateSends` | `false`: the echo and the reverb are fed the sound before it is chopped |

`pad.setTranceGate("x.x.xx.x", { rate: "eighth", depth: 0.8, smooth: 0.02 })` says a pattern and its settings in one line, with the rate as a note length. The steps begin at `setTempo`: call it where the bar begins and the gate is on the beat. `pad.tranceGateStep()` is the step that is sounding, for drawing it. (The word `gate` alone is something else twice over: an arpeggio's `gate` is how long each of its notes is held, and the microphone's `mic.gate` is its noise gate.)

## Recorded sounds

A sample is a recorded sound in a file beside the scene: a `.wav`, or an `.mp3` or `.ogg`.

```js
const meow = loadSample("meow.wav")

function onMouseDown() {
  meow.play()             // as it was recorded
}
```

A sample is a synth, so `meow.play("E4")` plays it higher (`"C4"` is its own pitch), and it has the same settings: `meow.reverb = 0.3`. There is no `await`: play it straight away, and it sounds as soon as the file has arrived.

A sample can also be the wave of any synth, under its filter and its envelope: `lead.sample = loadSample("piano.wav")` turns its wave to the recording (`lead.wave = "saw"` goes back), and `makeSynth({ sample: "piano.wav", note: "C4", cutoff: 1800 })` does it in one line, where `note` is the note the recording is at.

### Several recordings for one instrument

One recording stretched over a whole keyboard sounds thin at one end and muddy at the other. A real instrument is several recordings, each playing the keys near the note it was recorded at:

```js
const piano = loadSamples({ C2: "piano-C2.wav", "F#2": "piano-Fs2.wav", C3: "piano-C3.wav" })   // the note each was played at
piano.play("E2")                  // the nearest recording (F#2), moved down to E
piano.reverb = 0.3                // a synth like any other: settings, dials, keyboard(piano), a tune, an arpeggio
```

The keys are split halfway between neighbours, and every key plays, below the lowest recording and above the highest too. With the notes in the files' names there is less to write: `loadSamples(["piano-C2.wav", "piano-Fs2.wav", "piano-C3.wav"])` reads `C2`, `Fs2` (or `F#2`, `Gb2`) and `C3` from them, and a number alone (`60.wav`) is that key. A name with no note in it is refused, with what to do about it.

A drum kit is the same with `{ kit: true }`: each key is its own sound, played as it was recorded whatever the key, to its end, and the keys between are silent.

```js
const kit = loadSamples({ C2: "kick.wav", D2: "snare.wav", "F#2": "hat.wav" }, { kit: true })
kit.playNotes("C2 F#2 D2 F#2", 0.25, { repeat: true })
```

What else can be said:

- **`{ crossfade: 3 }`** fades neighbouring recordings into each other over three keys, where a change from one to the next would be heard. `{ crossfade: { keys: 3, loud: 0.1 } }` fades the loudness layers too.
- **Layers by how hard a note is played**, in the explicit form, a list of `{ file, note, … }`: `loadSamples([{ file: "soft-C4.wav", note: "C4", loud: [0, 0.5] }, { file: "hard-C4.wav", note: "C4", loud: [0.5, 1] }])`. `loud` is the note's volume, from and to.
- **Takes that go in turn**: several files for one note, `{ C4: ["snare-1.wav", "snare-2.wav"] }`, and each hit plays the next.
- **By hand**, for each recording: `from` and `to` (its keys), `tune` (cents), `volume`, `pan`, `release` (seconds), `oneShot`, `asRecorded`, `loop`, `start` (frames). `{ loop: true }` and `{ oneShot: true }` after the files are for all of them.
- **Release.** With nothing said each recording has a release that suits its note, longer for the low ones (0.48 seconds at C2, 0.19 at C4, 0.08 at C6), as a piano's are. `loadSamples(files, { release: 1 })` gives every recording that release in their place; set afterwards (`piano.release = 1`) it changes nothing while each recording has its own.
- **On an ordinary synth**: `lead.samples = { C3: "a.wav", C4: "b.wav" }`, `lead.setSamples(files, { crossfade: 3 })` or `makeSynth({ samples: { … }, cutoff: 1800 })`, and the recordings go through that synth's filter and envelope. `lead.samples = null` takes them away. (`lead.samples()` is still the wave for a scope.)
- **Reading it back**: `piano.zones()` is the list as it stands, `[{ file, note, from, to, loud, tune, volume, pan, release, oneShot, asRecorded, take }]`, and `piano.describe("zones")` has the same for an editor.
- **In a song**: `playSong("tune.json", { patches: { keys: piano } })` gives a song's instrument the piano.

The files are fetched together, and each recording plays as soon as it has arrived. If one cannot be loaded, the console names it once and its neighbours take its keys. `piano.remove()` lets go of the recordings as well as the synth. An instrument may have 512 recordings, and a note plays at most 4 at once.

## Songs

A song is a whole piece of music in one file beside the scene: a tracker's `.mod` or `.xm` file.

```js
let song = null

function onMouseDown() {
  if (song) song.stop()
  song = playSong("tune.mod")       // it goes round and round until it is stopped
}
```

`song.pause()`, `song.resume()` and `song.stop()` do as they say, `song.volume = 0.5` turns it down, `song.seek(2)` jumps to its third part, and `playSong("tune.xm", { repeat: false })` plays it once. `song.position` says where it is, for drawing: `{ state, order, pattern, row, … }`. One song plays at a time, and your notes and game sounds play over it.

A song is made of channels, counted from 0, and of patterns played in an order:

```js
song.mute(2)              // silence the third channel; song.mute(2, false) brings it back, and song.unmute() all of them
song.solo(0)              // hear only the first; song.solo("all", false) to hear the rest again
song.loopPattern()        // stay on the pattern that is playing, round and round; song.loopPattern(false) carries on
song.replace(edited)      // an edited song in its place, as it plays: its bytes, its JSON as text, or the song as an object
```

`song.channel(3)` is one channel to draw: `song.channel(3).level()`, `.samples()` and `.notes()`, as a synth has them.

**The mix.** Each channel has a place in the song's mix that can be moved while it plays, and the changes glide, so a fader can be dragged:

```js
song.channel(0).volume = 0.6               // its fader, 0 to 2
song.channel(0).pan = -0.5                 // -1 is left, 1 is right
song.channel(0).reverb = 0.4               // how much of it goes to the reverb, 0 to 1
song.channel(0).echo = 0.3                 // and to the echo
song.loop([1, 0], [5, 0])                  // go round from the top of place 1 in the order to the top of place 5; song.loop(null) runs on
```

`volume` and `pan` reach a channel whatever plays on it. `reverb` and `echo` reach a channel's sampled instruments; a synth instrument has the sends of its own synth (`reverb` and `echo` in its patch). Each reads back what was last set here. The reverb and the echo are the ones every synth shares, so `setEffects({ reverbType: "hall", reverbLevel: 0.8, echoTime: 0.3, echoLevel: 0.7 })` shapes them; `reverbLevel` and `echoLevel` are how loud each comes back, for everything sent to it.

## Your voice

The microphone is a synth whose sound comes in instead of being made. Ask for it, give it a voice, and listen:

```js
const mic = useMicrophone()       // the browser asks whether the page may use the microphone
mic.voice = "robot"
mic.listen()                      // now you hear yourself, as a robot. mic.mute() stops it
```

**Wear headphones when you listen.** Through loudspeakers the microphone hears itself, and the sound goes round and round until it howls. That is why nothing is heard until you say `listen()`. Recording does not need it.

| Voice | What it is |
|---|---|
| `robot` | A machine, ringing in a metal pipe |
| `chipmunk` | Small and squeaky: seven semitones higher |
| `monster` | Huge and deep: seven semitones lower, with a growl |
| `cave` | Far inside a cave: long echoes in a very big room |
| `telephone` | Down an old phone line |
| `alien` | Not from here: higher, with a slow metallic sweep |
| `whisper` | Hoarse and breathy, with no pitch at all |

`"none"` takes the voice off, and `voiceNames()` lists them. A voice is only a handful of settings, and you can turn them yourself once it is on. A microphone has every setting a synth has, and a few words of its own:

```js
mic.pitch = 7                     // semitones up or down, -12 to 12, without getting faster or slower
mic.echo = 0.4                    // and reverb, chorus, distortion, crush, cutoff, pan and volume, as on a synth
mic.ring = 1                      // multiply the voice by a wave: mic.ringSpeed = 50 is how fast (the robot)
mic.comb = 0.5                    // ring like a pipe at one note: mic.combTone = 110. mic.flanger sweeps it
mic.gain = 2                      // turn a quiet microphone up
mic.gate = -40                    // quieter than this (in dB) counts as silence. It starts at -50; "off" for none
```

Choosing another voice first puts back what the last one changed, so pick the voice and then turn the dials.

The microphone is a synth to the [controls](dials.md) too: `dial("pitch", mic, "pitch")`, `toggle("listen", mic, "listening")`, `scope(mic)` and `meter(mic)`. The scope and the meter show your voice even while it is muted. [`examples/voice_changer.js`](../examples/voice_changer.js) is all of this on one picture.

### Recording

```js
let take = null

function onMouseDown() {
  take = recordSound(3)             // three seconds of the microphone, starting now
  take.onDone(() => take.play())    // when it is over, play it back
}
```

`recordSound` gives you the recording at once and does not wait: your scene carries on drawing, and the take fills up behind it. A take is a sample, like one from `loadSample`, so everything a sample does it does, even while it is still recording:

```js
take.play()                       // as you said it
take.play("E4")                   // higher and faster: middle C is its own pitch
take.reverse = true               // backwards
take.loop = true                  // round and round while its note is held
take.voice = "monster"            // any voice, afterwards
take.done                         // false until it is over; take.seconds is then how long it is
```

- What is recorded is **your plain voice**, whether or not you are listening. The take is then given the voice the microphone has, so it plays back the way the microphone sounds, and you can change your mind afterwards: `take.voice = "none"` is you, and `take.soundLike(mic)` is the microphone as it is set now.
- `startRecording()` records until `stopRecording()`. It stops by itself after 30 seconds; `startRecording({ max: 60 })` gives it longer, up to 120.
- One recording is made at a time: starting another ends the one before, which keeps what it had.
- `mic.record(3)` is the same as `recordSound(3)`, and `await take.whenDone()` waits for it where your code can wait.

[`examples/sampler.js`](../examples/sampler.js) records a word and plays it from a keyboard on the scene.

### Recording what you play, and saving

```js
const tune = recordOutput(10)     // everything that is played for the next ten seconds, in stereo
playNotes("C4 E4 G4 C5", 0.25)
saveSound(tune, "my-tune.wav")    // saved as soon as it is over
```

`lead.record(4)` records one synth alone. `saveSound` makes a WAV file from a take or a sample. In a browser the file is downloaded. In an app that keeps your scene's files, such as [Circuitry Studio](https://www.circuitry.dev), it is written among your scene's other files. `await saveSound(take, { download: false })` gives the file's bytes and saves nothing.

### With no microphone

A computer with no microphone, a person who says no, a page that is not allowed to ask: none of these stops your scene. Every function still works, the console says once why there is no microphone and what to do about it, and a recording is simply empty and done straight away (`take.seconds` is 0). `mic.state` is `"on"`, or says why not: `"refused"`, `"none"`, `"busy"` or `"unavailable"`, and `mic.whenReady().then((there) => { … })` is told `true` or `false`. So write a scene that is still worth running without one, as the two examples are.

The browser asks about the microphone when `useMicrophone()` is called, which may be before the first click. Sound itself still waits for that click, so nothing is heard or recorded until then; a recording you asked for before it starts at the click. A page has to be served over `https` or from `localhost` (as `pictures run` does) to be given a microphone, and a page inside a frame needs `allow="microphone"` on the frame.

### The voice effects on a synth

The pitch shifter, the ring modulator and the comb are not only for voices. Every synth has them, under names that do not clash with its own `pitch` and `ring`:

```js
lead.pitchShift = 12              // an octave up, with the same length
lead.ringMod = 0.6                // bell-like and strange: lead.ringSpeed = 300
lead.comb = 0.5                   // a metal pipe: lead.combTone, lead.combFeedback
lead.flanger = 0.6                // the comb, sweeping: lead.flangerRate
lead.voice = "robot"              // or a whole voice at once
```

Eight synths can use the pitch shifter or the comb at once.

## When things start

Everything that makes a sound takes one of these:

```js
playSound("coin", { after: 0.5 })            // half a second from now
playNote("C4", 1, { at: soundTime() + 2 })   // at a time on the sound clock
lead.play("E4", beats(1), { beat: 8 })       // on beat 8
```

Beats are counted from `setTempo(120)` (beats a minute; beat 0 is the moment you call it). `beats(2)` is how many seconds two beats last, and `beat()` is which beat it is now, so a picture can move in time:

```js
const size = 60 + 40 * (1 - beat() % 1)      // biggest on each beat
```

## MIDI

MIDI is how music keyboards, drum pads, boxes of knobs and synths talk to each other and to a computer. Plug a MIDI keyboard into your computer and one line makes it play a synth:

```js
const lead = makeSynth("keys")
lead.playFromMidi()
```

It follows the notes, how hard you hit each key, the pitch wheel, the modulation wheel and the sustain pedal. The first time a scene uses MIDI the browser asks whether the page may use your MIDI devices: say yes. `lead.playFromMidi({ channel: 2 })` listens to one channel alone, and `lead.playFromMidi(false)` stops.

MIDI works in Chrome, Edge and Firefox on a computer. Safari, iPhones and iPads have no MIDI for web pages. Where there is none your scene still runs: the console says so once, and everything else carries on. So write a scene that also works by hand, as the two examples do.

### Your own functions

A scene has functions with names that pictures.js looks for, such as `update`, `draw` and `onKeyDown`. MIDI has some too. Write one and it is called:

```js
function onMidiNote(note, velocity, channel) {
  // a key went down
}

function onMidiNoteOff(note, channel) {
  // a key came up
}

function onMidiControl(number, value, channel) {
  // a knob, a slider or a pedal moved
}
```

`note` is a number, where 60 is middle C, and `velocity` is how hard the key was hit, from 0 to 1. If you leave `onMidiNoteOff` out, a key coming up calls `onMidiNote` with velocity 0. `number` is which knob it was (every one has a number from 0 to 127; the sustain pedal is 64) and `value` goes from 0 to 1. `channel` is from 1 to 16.

Two more: `onMidi(message)` is given everything that arrives, as `{ type, channel, note, velocity, control, value, bend, program, data, time, device }`, where `type` is `"noteOn"`, `"noteOff"`, `"control"`, `"bend"`, `"program"` and so on, `time` is when it happened on the clock `soundTime()` reads and `device` is the name of what sent it. `onMidiDevices(devices)` is called when the devices are known, and again when one is plugged in or pulled out, with `{ inputs, outputs, available }`: two lists of names, and `available` is `false` where there is no MIDI.

[`examples/midi_lights.js`](../examples/midi_lights.js) throws a ball up the picture for every key. Each name can be called instead, with a function to keep: `onMidiNote((note, velocity) => { … })`. That is the way inside a function of your own, or to have two.

### A knob turns a setting

```js
const cutoff = dial("cutoff", lead, "cutoff")

lead.learn("cutoff", (value) => { cutoff.value = value })    // the next knob you move turns the cutoff
lead.mapMidi(74, "resonance")                                // or say which knob, by its number
```

The knob goes through the setting's whole range, so nothing has to be worked out, and `lead.cutoff` reads back what the knob has set. The function is called with each new value, which is how a [dial](dials.md) on the screen turns with the knob. `{ min: 200, max: 4000 }` narrows the range, and `lead.unmapMidi("cutoff")` lets the knob go. [`examples/midi_keyboard.js`](../examples/midi_keyboard.js) is a synth played by a MIDI keyboard, with three dials its knobs can turn.

### Sending

A scene can play a synth on the desk, or anything else with a MIDI socket:

```js
sendMidiNote("C4")                                      // a note, let go half a second later
sendMidiNote("C4", 0.8, { length: "quarter", channel: 1 })    // how hard, how long (seconds, or a note length), which channel
sendMidiNote(["C4", "E4", "G4"], { beat: 4 })           // a chord, on beat 4
sendMidiControl(74, 0.5)                                // turn knob 74 on the other device to half way
sendMidi([0x90, 60, 100])                               // any message at all, as its bytes
```

Everything that is sent takes `{ after, at, beat }` like a sound ([When things start](#when-things-start)) and leaves at exactly that time. There are also `sendMidiNoteOff("C4")` (for a note sent with `length: null`, which is held), `sendMidiBend(0.5)` and `sendMidiProgram(5)`, which chooses a sound by its number. `lead.sendToMidi()` sends what a synth plays, tunes and all, out as MIDI too. `sendMidiClock()` sends the beat, so that another device's own sequencer keeps time with `setTempo`.

### Which device

`midiDevices()` gives `{ inputs, outputs, available }` at any time; the lists are empty until the browser has answered, which is why `onMidiDevices` is there. `useMidiInput("Keystation 49")` listens to that one alone (otherwise: all of them), and `useMidiOutput("Minilogue")` sends to that one (otherwise: the first). `receiveMidi({ type: "noteOn", note: 60, velocity: 0.8, channel: 1 })` hands your scene a message just as a keyboard would, for trying a scene with nothing plugged in. `stopMidi()` stops everything MIDI is doing; it stops by itself with the scene.

To choose on the screen instead, `midiInput()` and `midiOutput()` are things a control is tied to, with a `"device"` and a `"channel"` whose choices follow what is plugged in: `select("device", midiInput(), "device")`. `lead.midiInput()` is the same for one synth alone.

## Volume and stopping

```js
setVolume(0.5)      // everything half as loud. 1 is normal
muteSound()         // silence, and unmuteSound() brings it back
stopSound()         // stops everything that is sounding or waiting to sound
```

Sound stops by itself when the scene stops or is run again. Several scenes on one page share one sound card, and each is stopped and paused alone. It is paused while the scene is scrolled out of view or its tab is in the background, as the frames are, and carries on when you come back.

### If the sound clicks

```js
setSoundBuffer("large")        // "small" (1024 frames), "medium" (2048), "large" (4096), "auto", or a number of frames
const now = soundBuffer()      // { frames: 4096, delay: 179, thread: "page", underruns: 0, setting: 4096 }
```

A page that is not served over https (a page on your own computer opened on a phone or an iPad by the computer's address) makes its sound on the page's own thread, a buffer at a time, and clicks when the page is busy for longer than a buffer lasts. A larger buffer rides over that and is heard later: `"large"` is about a fifth of a second from a key to its note, `"small"` a twentieth. `"auto"` lets the library choose, and double it once if it keeps clicking. It may be called before the first sound or at any time. `delay` is the milliseconds from a key to its note, `underruns` counts the clicks, and `thread` is `"page"` there and `"audio"` on an https page, where there is nothing to fix and the same call sets how far ahead everything is scheduled instead.
## Recording a video with sound

**In Circuitry**, press the video button under the scene, choose a size and 30 or 60 frames a second, and press Record. The scene starts again from its beginning and is recorded until you press Stop. You get one `.mp4` file with the pictures and the sound in it, saved beside the scene (or to Photos or a folder you choose, on an iPad).

The sound in the video is exactly in step with the pictures, however slowly the frames were made. A recorder films a scene one frame at a time, and each frame may take much longer to draw and encode than the sixtieth of a second it stands for. So while a scene is recorded its sound is not played by the sound card: it is worked out for one frame at a time, on the same clock as the pictures, and you hear nothing until you play the video. Your scene does not change. `soundTime()`, `beat()`, a song's `position`, and what a scope or `bass()` shows all go by the video's time, a note you play in a frame starts on that frame's first sample, and recording the same scene twice gives the same sound. There is no microphone in a recording.

**On a page of your own**, tell the scene it will be stepped, move the page's clock yourself, and take the samples:

```js
const scene = runScene(box, { src: "main.js", stepped: { fps: 60 } })
await scene.ready                                   // its setup() has run
// for each frame: move your clock (requestAnimationFrame and performance.now are yours), then
await scene.sound.stepped.advance(performance.now() / 1000)   // the sound up to this frame, before it is drawn
const { left, right, sampleRate } = scene.sound.stepped.take()   // the samples of the frame before
// ... now run the frame, and copy the canvas
```

Sixty frames are 48000 samples: every frame is `sampleRate / fps` of them, with the remainder carried, so nothing drifts over a long film. `scene.sound` is the library's stepped player, and [its page for apps](https://github.com/johnwylie70/synths.js/blob/main/docs/commands.md) has the rest. If you would rather not write the loop, [visualfx.js](https://github.com/johnwylie70/visualfx.js) has it: `await recordVideo({ seconds: 20, fps: 60, sound: scene })` gives a WebM file with the sound in it.

## The Python spellings

Every name has its Python spelling too, so a scene comes across from [Pyctures](from-python.md) with little more than its syntax changed: `play_sound`, `play_note`, `play_notes`, `make_synth`, `load_sample`, `stop_sound`, `set_volume`, `set_tempo`, `sound_time`, `on_midi_note`, `on_midi_control`, `send_midi_note`, `midi_devices`, `lead.play_from_midi()`, `use_microphone`, `record_sound`, `start_recording`, `record_output`, `save_sound`, `take.on_done(…)`, `take.sound_like(mic)`. Settings too: `lead.vibrato_rate = 6`.

## Mistakes

A mistake stops the scene and is said in plain words, with its line and what was probably meant:

```
Line 3: playSound("lazer"): there is no sound called "lazer". Did you mean "laser"? The sounds are: coin, jump, laser, …
Line 7: A synth has no setting called "cutof". Did you mean "cutoff"?
Line 2: "H4" is not a note. Write a note as a name like "C4", "F#3" or "Bb5", or as a number, where 60 is middle C
Line 5: "robt" is not a voice. Did you mean "robot"? The voices are: robot, chipmunk, monster, cave, telephone, alien, whisper, and "none"
```

Things that are not your mistake do not stop the scene. They are said once in the browser's console and the rest carries on: sound that is waiting for a click, a sample whose file is missing, a browser with no MIDI, or no microphone.

## How it is loaded

The sound is made by [synths.js](https://github.com/johnwylie70/synths.js), which sits in the `sound` folder beside `pictures.js`. It is loaded only by a scene that uses one of the sound names: a scene with no sound loads nothing for it. Its engine runs on the browser's audio thread, away from your drawing, so sound does not slow a frame and a slow frame does not make the sound stutter. `pictures build` copies the folder for a scene that uses it. MIDI is one more file in that folder, `synths-midi.js`, fetched the first time a scene uses a MIDI name or has a function such as `onMidiNote`; a scene with sound and no MIDI never asks for it, and the browser is asked for its MIDI devices only then. The microphone needs no file of its own, and the browser is asked for it only when a scene calls `useMicrophone` or records it.

A page that is not served over `https` (or from `localhost`, as `pictures run` does) has no audio thread to use. The same engine then runs on the page's own thread, which sounds the same and may crackle when the page is busy; the console says so once.

An app that runs scenes can take the sound commands and play them itself, can supply MIDI or a microphone where the browser has none, and can keep the files `saveSound` makes: see [Use it on your website](website.md#sound).

## Related

- [Dials, sliders and a keyboard](dials.md): controls on the scene, tied to a synth
- [Function index](function-index.md#sound-and-music)
