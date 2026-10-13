# Changes

## Unreleased

Everything written for 0.1.0 still runs, and a scene that uses nothing below loads exactly what it did.

### New

- Sound, with nothing to import: `playSound("coin")` is a ready-made game sound, `playNote("C4")` a note, `playNotes("C4 E4 G4 - C5", 0.25, { repeat: true })` a tune, and `const lead = makeSynth("lead")` a synth whose settings are plain properties (`lead.cutoff = 800`). A tune can be written a line at a time with `note("E4", "quarter")`, `chord`, `rest` and `loopNotes`. Also `loadSample("kick.wav")`, `playArp("Cm7")` and `startArp("Am")` for Commodore 64 chords, `setEffects`, `setVolume`, `muteSound`, `stopSound`, `setTempo`, `beats` and `beat`. The sound is made by synths.js, in the new `sound` folder, and its engine runs on the browser's audio thread.
- Controls on the scene, with nothing to import: `dial("speed", 0, 10)` is a number to read, `dial("cutoff", lead, "cutoff")` is that setting of a synth, `keyboard(lead)` is a piano keyboard that plays it and `scope(lead)` draws its wave. Also `slider`, `button`, `toggle`, `select`, `meter`, `label`, `row`, `layout`, `theme` and `over`. They are drawn on a canvas of their own over the scene's, from the new `dials` folder (dials.js). A press on a control is not the scene's: `onMouseDown` is not called for it.
- Each of the two is loaded only by a scene that uses one of its names. A scene that uses neither asks for no new file and is run exactly as before.
- The first click, tap or key press on the page turns the sound on, as browsers require. Sound is paused while its scene is out of view or its tab is hidden, and stops when the scene stops or is run again.
- The Python spellings work: `play_sound`, `make_synth`, `lead.filter_cutoff`, `on_change`.
- A mistake is said in plain words with its line: `playSound("lazer"): there is no sound called "lazer". Did you mean "laser"?`
- An app that runs scenes can take the sound commands and play them itself, with `runScene`'s new `sound` option (`send(batch)`, `pause()`, `resume()`, `read(id)`, `readBytes(path)`); the page then makes no sound and loads no engine. Or it can hand the page the engine as bytes (`sound: { wasm, worklet: "blob" }`) for a page that may fetch nothing. What `runScene` gives back has `sound`, the page's player.
- `pictures build` copies the `sound` and `dials` folders for a scene that uses them.
- MIDI, with nothing to import: `lead.playFromMidi()` has a MIDI keyboard play a synth, and a scene's own `function onMidiNote(note, velocity, channel) { }`, `onMidiNoteOff`, `onMidiControl(number, value, channel)`, `onMidi(message)` and `onMidiDevices(devices)` are called with what arrives, as `onKeyDown` is with a key. `lead.learn("cutoff", fn)` and `lead.mapMidi(74, "cutoff")` give a setting to a knob, `sendMidiNote("C4", 0.8, { length: "quarter" })`, `sendMidiControl`, `sendMidi` and `lead.sendToMidi()` play another device, and `midiDevices()`, `useMidiInput` and `useMidiOutput` choose one. The Python spellings work (`on_midi_note`, `play_from_midi`). It is one more file in the `sound` folder, `synths-midi.js`, fetched only by a scene that uses MIDI; where the browser has no MIDI the scene still runs and the console says so once. An app whose browser has none can supply the devices with `runScene`'s new `midi` option. New examples: `midi_keyboard.js` and `midi_lights.js`.
- New examples: `synth_panel.js`, `tune.js` and `arpeggio.js`, and Star Catcher has sound effects. New docs pages: Sound and music, and Dials, sliders and a keyboard.

## 0.1.0 (2026-10-11)

First release.

- A scene can write files: `await saveText("notes.txt", words)` and `await saveJSON("level.json", level)`. `loadText` and `loadJSON` give back what was written, and read the file beside the scene when nothing was.
- SQLite databases: `const db = await openDatabase("scores")`, then `await db.query(sql, ...values)` for a list of rows, `await db.run(sql, ...values)` to change it, and `await db.close()`. Values go in the SQL's `?` marks. SQLite (sql.js, in the new `sqlite` folder) is loaded the first time a scene opens a database, and never by a scene that opens none.
- On a web page the browser keeps a scene's files and databases, for that scene alone. An app that runs scenes can keep them as real files by passing `runScene` a `storage` option with `readText`, `writeText`, `readBytes` and `writeBytes`; a database is one file to it. The `sqlite` option names another folder to load SQLite from.
- `pictures build` copies the `sqlite` folder for a scene that opens a database.
- A new example, `top_scores.js`, and a new docs page, Files and databases.
- An app that runs scenes can give every loaded picture methods that change it, with `runScene`'s new `pictures` option: `await img.removeBackground()`, `await img.resize({ width: 800 })`, `await img.save("cutout.png")`, `await img.available()`, `await img.run("name", options)`. Each gives a new picture, or data, and leaves the picture it was called on alone. The library names no method and does none of the work: the app lists them and does it (Circuitry Studio does). Both spellings work (`removeBackground` and `remove_background`, `maxLabels` and `max_labels`). On a page of its own a picture has none, and calling one says they work inside Circuitry.
- A scene is one plain `.js` file with `setup()`, `update(dt)` and `draw()`, and nothing to import.
- Plain drawing functions (`background`, `circle`, `rect`, `line`, `text`, `picture` and more), the web's 2D canvas as `ctx`, and three.js as `THREE` for 3D.
- `keys`, `mouse`, `touches` and `pinch` for input, and `Sprite` for moving pictures that can tell when they touch.
- `save("best", 120)` keeps a value for the next time the program runs, and `load("best", 0)` gives it back.
- A mistake names its line, in Chrome and in Safari, on iPad and iPhone too: one made while the scene runs, one in a file loaded with `use()`, and a `{`, `(` or `[` that is never closed.
- `pictures run scene.js` opens a scene in your browser and runs it again when you save. `pictures build scene.js -o site/` makes a folder of plain files for any static host.
- The same shape of program as [Pyctures](https://github.com/johnwylie70/pyctures), its Python sibling, with the same examples under the same names.
