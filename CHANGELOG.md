# Changes

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
