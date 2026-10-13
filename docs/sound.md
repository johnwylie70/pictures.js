# Sound and music

A scene can make sound: a game sound in one line, notes and tunes, synths you shape yourself, and recorded sounds from a file. The names are ready in every scene, with nothing to import and nothing to load.

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

There are thirteen: `coin`, `jump`, `laser`, `explosion`, `hit`, `powerup`, `blip`, `click`, `zap`, `bounce`, `pop`, `win` and `lose`. Put the line where the thing happens:

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
| `lead.set({ cutoff: 4000 }, { glide: 2 })` | Changes several, or slides there over two seconds |

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
| `echo`, `reverb`, `chorus` | How much of the synth goes to each effect (0 to 1) |
| `distortion`, `crush` | Grit (0 to 1), and the bits each sample keeps (16 is clean, 4 is an old games console) |

There are more: `settingNames()` lists every one. The echo, the reverb and the chorus are shared by all the synths, and are shaped with `setEffects({ echoTime: 0.3, echoFeedback: 0.5, reverbSize: 0.8 })`.

To change a synth by hand while it plays, put a dial on it: see [Dials, sliders and a keyboard](dials.md).

## Arpeggios

An arpeggio is a chord played one note at a time, very fast, on one voice: the shimmering chords of a Commodore 64 tune.

```js
function onMouseDown() {
  playArp("Cm7", 1)                 // a second of C minor seventh
}
```

`playArp("C4", "minor", 2)` takes a note and a kind, and a list of notes works too. Options: `speed` is steps a second (50 unless you say; at 12 you can hear each step) and `order` is `"up"`, `"down"`, `"up-down"`, `"as written"` or `"random"`. `startArp("Am")` gives one that stays: `chord.change("F")` moves it to another chord without starting the note again, and `chord.stop()` ends it. Every synth has `arp` and `startArp` too. [`examples/arpeggio.js`](../examples/arpeggio.js) plays four chords over a chip bass and drums.

## Recorded sounds

A sample is a recorded sound in a file beside the scene: a `.wav`, or an `.mp3` or `.ogg`.

```js
const meow = loadSample("meow.wav")

function onMouseDown() {
  meow.play()             // as it was recorded
}
```

A sample is a synth, so `meow.play("E4")` plays it higher (`"C4"` is its own pitch), and it has the same settings: `meow.reverb = 0.3`. There is no `await`: play it straight away, and it sounds as soon as the file has arrived.

## Songs

A song is a whole piece of music in one file beside the scene: a tracker's `.mod` or `.xm` file.

```js
let song = null

function onMouseDown() {
  if (song) song.stop()
  song = playSong("tune.mod")       // it goes round and round until it is stopped
}
```

`song.pause()`, `song.resume()` and `song.stop()` do as they say, `song.volume = 0.5` turns it down, and `playSong("tune.xm", { repeat: false })` plays it once. One song plays at a time, and your notes and game sounds play over it.

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

## Volume and stopping

```js
setVolume(0.5)      // everything half as loud. 1 is normal
muteSound()         // silence, and unmuteSound() brings it back
stopSound()         // stops everything that is sounding or waiting to sound
```

Sound stops by itself when the scene stops or is run again. Several scenes on one page share one sound card, and each is stopped and paused alone. It is paused while the scene is scrolled out of view or its tab is in the background, as the frames are, and carries on when you come back.

## The Python spellings

Every name has its Python spelling too, so a scene comes across from [Pyctures](from-python.md) with little more than its syntax changed: `play_sound`, `play_note`, `play_notes`, `make_synth`, `load_sample`, `stop_sound`, `set_volume`, `set_tempo`, `sound_time`. Settings too: `lead.vibrato_rate = 6`.

## Mistakes

A mistake stops the scene and is said in plain words, with its line and what was probably meant:

```
Line 3: playSound("lazer"): there is no sound called "lazer". Did you mean "laser"? The sounds are: coin, jump, laser, …
Line 7: A synth has no setting called "cutof". Did you mean "cutoff"?
Line 2: "H4" is not a note. Write a note as a name like "C4", "F#3" or "Bb5", or as a number, where 60 is middle C
```

Things that are not your mistake do not stop the scene. They are said once in the browser's console and the rest carries on: sound that is waiting for a click, or a sample whose file is missing.

## How it is loaded

The sound is made by [synths.js](https://github.com/johnwylie70/synths.js), which sits in the `sound` folder beside `pictures.js`. It is loaded only by a scene that uses one of the sound names: a scene with no sound loads nothing for it. Its engine runs on the browser's audio thread, away from your drawing, so sound does not slow a frame and a slow frame does not make the sound stutter. `pictures build` copies the folder for a scene that uses it.

A page that is not served over `https` (or from `localhost`, as `pictures run` does) has no audio thread to use. The same engine then runs on the page's own thread, which sounds the same and may crackle when the page is busy; the console says so once.

An app that runs scenes can take the sound commands and play them itself: see [Use it on your website](website.md#sound).

## Related

- [Dials, sliders and a keyboard](dials.md): controls on the scene, tied to a synth
- [Function index](function-index.md#sound-and-music)
