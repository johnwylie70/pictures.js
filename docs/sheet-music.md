# Sheet music

A scene can write music out as notes on a staff, play it, and light each note as it sounds. There is nothing to import and nothing to draw: you give it a tune in one line.

```js
const page = showNotes("E4 D4 C4 D4 E4 E4 E4:2", "quarter", { title: "Mary had a little lamb" })

function onMouseDown() {
  page.play()
}

function draw() {
  background("midnightblue")
  text("Click here to play", width / 2, height - 30, "white", 18, "centre")
}
```

![A tune written out as sheet music over a scene, with the note that is sounding in orange and a line at its place](images/sheet-music.png)

The notes are written the way [`playNotes`](sound.md) takes them: a note is a letter and a number (`"C4"` is middle C, `"F#3"`, `"Bb5"`), `-` is a rest, `:2` makes a note last two steps, and `"quarter"` says how long a step is. The key, the clef and the bars are worked out for you. Change the notes in the line and both the music you hear and the music you see change.

`page.play()` plays it and follows it: the notes that are sounding turn orange, a line moves through the bar, and the page turns when the music reaches the next line. Tap a note to hear it. Tap a bar to play from there.

The first click, tap or key press on a page turns its sound on, as browsers require. A tune that is asked for before that waits, and begins when the sound is on: the line never moves through notes nobody can hear.

## What you can show

| You give | It is |
|---|---|
| `showNotes("C4 E4 G4 - C5:2", "quarter")` | a tune as text: notes, `-` for a rest, `:2` for two steps, `:q` `:h` `:e` `:s` `:w` for a length by name, `C4+E4+G4` or `Cm7` for a chord. The second thing is how long a step is (`"eighth"` if you leave it out) |
| `showNotes(["C4", null, ["C4", "E4"]], "quarter")` | the same as a list: `null` is a rest, a list inside is a chord |
| `showNotes(sheet)` | a sheet you write a note at a time |
| `showNotes(song, { channels: [0, 1] })` | a tracker song, a staff for each channel you choose |
| `showNotes([{ note: "C4", start: 0, length: 1 }])` | plain data, in beats: anything can make this |

**A sheet** is for writing music as code, with loops and all:

```js
const sheet = makeSheet({ key: "G", time: "3/4", tempo: 132, title: "Waltz" })
sheet.add("D4", "quarter")
sheet.add(["B4", "D5"], "half")          // a chord
sheet.rest("quarter")
for (const name of ["G4", "A4", "B4"]) sheet.add(name, "eighth")
showNotes(sheet)

function draw() {
  background("#102030")
  text("A waltz has three beats in a bar", width / 2, height - 30, "white", 18, "centre")
}
```

A length is `"whole"`, `"half"`, `"quarter"`, `"eighth"`, `"sixteenth"` or `"thirtysecond"`, with a dot for half as long again (`"quarter."`), or a number of beats. A sheet that is added to later is drawn again by itself.

## Something on every note

`page.onNote` is called as each note begins, so the scene can do something in time with the music.

```js
const page = showNotes("C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2", "quarter", { tempo: 100 })
const stars = []
page.onNote = (note) => stars.push({ x: random(40, width - 40), y: height - 30, size: note.note - 50 })

function onMouseDown() {
  if (page.playing) page.stop()
  else page.play()
}

function update(dt) {
  for (const s of stars) s.y -= 90 * dt
}

function draw() {
  background("midnightblue")
  for (const s of stars) star(s.x, s.y, s.size, 5, "gold")
  text("Click to play, and again to stop", width / 2, height - 30, "white", 18, "centre")
}
```

A note is `{ note, notes, name, start, length, staff, bar }`: `note.name` is `"C4"`, `note.note` is its number (60 is middle C), and `start` and `length` are in beats. `page.onBar = (bar) => { }` is called as each bar begins.

## Following a song

A tracker song (see [Sound and music](sound.md)) is written out from its own file, and the page follows it as it plays.

```js
const written = await loadJSON("tune.json")
const song = playSong("tune.json")
const page = showNotes(written, { channels: [0, 1], follow: song })

function draw() {
  background("#0b1020")
  text(song.position.state === "playing" ? `bar ${page.bar}` : "Tap to start the song", width / 2, height - 24, "white", 18, "centre")
}
```

Tap a bar and the song jumps there. A song's rows become beats (four rows to a beat at the usual speed), a note lasts until the next on its channel, a chord is written as a chord and an arpeggio as its chord with a wavy line beside it, and drums get a staff of their own. Notes that slide or bend are written as the notes they start from: the slide itself is not shown. `channels` chooses which channels and in what order, `grand: true` puts the tuned ones together on a piano's two staves, and `drums: ["kick", "snare"]` says which instruments are drums when their names do not.

## Playing along

The learner plays, and the page says how it went.

```js
const lead = makeSynth("keys")
const page = showNotes("E4 D4 C4 D4 E4 E4 E4:2", "quarter")
page.playAlong({ mode: "wait", synth: lead })
keyboard(page, { octave: 4, octaves: 1 })        // the keys play the page

function draw() {
  background("#12261e")
  text(`${page.result.right} right, ${page.result.wrong} wrong`, width / 2, height / 2, "white", 20, "centre")
}
```

The line waits at each note until it is played, and the key to press is lit. A right note turns green; a wrong one shows in red for a moment where it was played. `"time"` in place of `"wait"` keeps going at the tempo, after a bar counted in, and a note that is never played turns red. A [MIDI keyboard](sound.md) plays the page too:

```js
const page = showNotes("C4 D4 E4 F4 G4:2", "quarter")
page.playAlong("wait")

function onMidiNote(note, velocity) {
  if (velocity > 0) page.noteOn(note)
  else page.noteOff(note)
}

function draw() {
  background("#12261e")
}
```

`page.result` is `{ right, wrong, missed, total, percent, timing, done }` as it goes, and `page.onDone = (result) => { }` is called at the end.

## Options

`showNotes(music, { ... })`, or after the step: `showNotes("C4 D4", "quarter", { ... })`.

| Option | |
|---|---|
| `key` | `"C"`, `"G"`, `"Bb"`, `"Am"`, or sharps as a number (`2`) and flats as a negative one (`-3`). Left out: the key with the fewest sharps, flats and naturals to write |
| `time` | `"4/4"` unless you say: `"3/4"`, `"6/8"`, `"2/2"` |
| `clef` | `"treble"`, `"bass"`, `"grand"` (both, joined by a brace) or `"percussion"`. Left out: whichever the notes sit best in |
| `tempo` | beats a minute, for the mark over the first line and for `page.play()` |
| `title` | written over the music |
| `at` | `"top"` (where it goes unless you say), `"bottom"`, `"middle"`, `"fill"` (the whole picture), or `{ x, y, width, height }` |
| `zoom` | 1 unless you say: 1.5 is half as big again |
| `paper` | `"light"` (cream paper, dark ink), `"dark"`, or `"clear"` (no paper: white ink straight on your scene) |
| `colours` | any of `{ paper, ink, line, now, right, wrong, cursor }`: `now` is the colour of a note that is sounding |
| `scroll` | `"down"`: lines of music one under another, and the page turns. `"across"`: one long line that slides past |
| `voice` | the ready-made synth `page.play()` plays on (`"keys"` unless you say: `"bell"`, `"lead"`…); `synth: lead` gives it a synth of yours |
| `follow` | a song to follow from the start |
| `lines`, `barNumbers`, `line` | `false` hides the staff lines, the bar numbers, the moving line |
| `hear`, `seek` | `false`: a tapped note is not played; a tapped bar does not move the music |

## The page

| | |
|---|---|
| `page.play()` | play it and follow it. `page.play({ from: 8 })` starts eight beats in; `{ tempo: 90 }`, `{ repeat: true }` |
| `page.stop()`, `page.playing` | stop it; is it playing? |
| `page.follow(song)` | follow a song from `playSong`, or a function that gives how many beats have gone by (`page.follow(beat)`) |
| `page.beat`, `page.bar`, `page.sounding` | where the music has got to, and the notes sounding now |
| `page.onNote`, `page.onBar`, `page.onTap`, `page.onDone` | yours to set: a note began, a bar began, a note or a bar was tapped, the music ended |
| `page.playAlong("wait")`, `page.noteOn(note)`, `page.noteOff(note)`, `page.result` | playing along |
| `page.seek(5)`, `page.show(music)` | go to bar 5; show other music in its place |
| `page.zoom = 1.5`, `page.place({ at: "bottom" })` | its size and place |
| `page.x`, `.y`, `.width`, `.height` | where it is in the scene, for drawing around it |
| `page.remove()` | take it away |

## Good to know

- **The sound keeps the time.** Which note is lit is read every frame from the sound's own clock, or from the song's place, so the note that is lit is the note you hear, however busy the scene is.
- **The music is drawn over your scene and under its dials.** It is on a canvas of its own: nothing in `draw()` is needed, and a `background()` does not wipe it.
- **A staff has one rhythm.** Notes that begin together are a chord, and a note ends where the next begins. Two tunes at once want two pages, or a song with a channel each.
- **Lengths are halves of halves.** Triplets are written to the nearest thirty-second note.
- **It is loaded only by a scene that uses it**, and such a scene has the sound as well. A scene that shows no music loads exactly what it always did.

Sheet music is made by [notation.js](https://github.com/johnwylie70/notation.js), in the `notation` folder. Its music symbols are outlines from the Leland font (SIL Open Font Licence).
