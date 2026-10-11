# Files and databases

A scene can write a file and read it back the next time it runs: some notes, a level you drew, a list of words. For a lot of things of the same kind, such as every score of every game, it can keep a database and ask it questions.

```js
let notes = await loadText("notes.txt").catch(() => "")    // what was written last time, or nothing the first time

async function onKeyDown(key) {
  if (key.length === 1) notes += key
  if (key === "Enter") await saveText("notes.txt", notes)
}

function draw() {
  background("midnightblue")
  text(notes + "|", 20, 60, "white", 24)
  text("Type, then press Enter to save", 20, height - 20, "gray", 16)
}
```

Click the scene, type a few words and press Enter. Load the page again and they are still there.

For one number or one small thing, [`save` and `load`](saved-values.md) are simpler: they need no `await` and no file name. Use a file when you want text in a shape of your own, or something big. Use a database when you want to keep many rows and pick some out.

## Writing and reading a file

| Call | What it does |
|---|---|
| `await saveText(path, text)` | Writes the text as a file. Writing to the same path again replaces what was there. |
| `await saveJSON(path, value)` | Writes a value as a JSON file: a number, text, `true` or `false`, a list or an object. |
| `await loadText(path)` | The text of the file. |
| `await loadJSON(path)` | The value in a JSON file, ready to use. |

All four are used with `await`, because a file takes a moment. To `await` inside a function of your own, make it an `async function`.

```js
const level = { name: "Caves", walls: [[0, 0, 200, 20], [80, 120, 20, 200]], start: { x: 40, y: 60 } }
await saveJSON("levels/caves.json", level)

const back = await loadJSON("levels/caves.json")
console.log(back.name, back.walls.length)
```

`loadText` and `loadJSON` look first for a file the scene has written. If there is none, they read the file of that name that sits beside the scene, as they always have. So a scene can come with a `level.json` beside it and write its own over the top once the player changes something. A file that is in neither place stops the scene with an error that names it. To carry on with a value of your own, catch it:

```js
const words = await loadText("words.txt").catch(() => "")
const level = await loadJSON("level.json").catch(() => ({ walls: [] }))
```

### Paths

A path is a file's name, with folders in front if you like: `"notes.txt"`, `"levels/caves.json"`. It starts from the scene's own place and stays inside it. A `/` at the front and any `.` or `..` parts are dropped, so `"/notes.txt"` and `"../notes.txt"` are both `notes.txt`.

## A database

A database keeps rows in tables, like a spreadsheet with named columns, and answers questions written in SQL: the five best scores, every game by one player, how many games there have been. The database here is SQLite, the same one phones and browsers use themselves.

```js
const db = await openDatabase("scores")
await db.run("create table if not exists best (name text, points integer)")

await db.run("insert into best values (?, ?)", "Ann", 12)
await db.run("insert into best values (?, ?)", "Bob", 7)

const rows = await db.query("select name, points from best where points > ? order by points desc", 10)
for (const row of rows) console.log(row.name, row.points)       // Ann 12
```

| Call | What it does |
|---|---|
| `await openDatabase(name)` | Opens the database of that name, making it the first time. Gives you the database, here called `db`. |
| `await db.query(sql, ...values)` | Asks a question (`select`). Gives a list of rows. Each row is an object with the columns as its names: `row.name`, `row.points`. No rows is an empty list. |
| `await db.run(sql, ...values)` | Changes the database: `create table`, `insert`, `update`, `delete`. Gives the number of rows that changed. |
| `await db.close()` | Finishes with the database. |

`openDatabase("scores")` is the file `scores.db`. A name can have a folder and an ending of its own, as in `"data/scores.sqlite"`. Several databases can be open at once. Opening one that is already open gives you the same database again.

### Values go in the ? marks

Put a `?` in the SQL wherever a value belongs, and give the values after it, in the same order. There must be one value for each `?`.

```js
await db.run("insert into best values (?, ?)", player, score)
await db.query("select * from best where name = ? and points >= ?", "Ann", 10)
await db.query("select * from best where name = ? and points >= ?", ["Ann", 10])    // one list does the same
```

Do not build the SQL by joining text together. A name with a `'` in it, such as O'Brien, would break the SQL, and a `?` never does.

A value can be a number, text, `true` or `false` (kept as 1 and 0), or `null` for nothing.

### One piece of SQL at a time

Give `run` and `query` one statement each. The table is made with one `run`, and each row is put in with another.

`create table if not exists` is the line to start with: it makes the table the first time and does nothing after that, so the same program runs the first time and every time.

### When it is written

You do not save a database. A moment after a change it is written by itself, and it is written when you `close()` it and when the scene stops. A burst of changes, such as a hundred rows put in one after another, is written once at the end.

If you use `begin` and `commit` to make several changes as one, the database is written after the `commit`. Changes that were never committed are dropped when the database is closed.

### When SQL goes wrong

A mistake in the SQL stops the scene with an error that shows the SQL and what SQLite said about it:

```text
Line 4: db.query("select nme from best"): no such column: nme
```

[`examples/top_scores.js`](../examples/top_scores.js) is a small game that puts every game into a database and shows the five best.

## Where files and databases are kept

- **In your browser, on the computer, tablet or phone you are using**, when a scene runs on a web page: with `run`, in a built folder, or on a website. They are not sent anywhere, and another device, or another browser on the same one, starts with nothing.
- **As real files, in an app that gives the scene somewhere to put them.** Circuitry Studio and other apps that run scenes can keep a scene's files on the device itself. The scene is written the same way in both.
- **For this scene alone.** Each scene has its own files, so two scenes can both write `notes.txt` and neither sees the other's. They are apart from saved values too: `save("notes.txt", 1)` and `saveText("notes.txt", "one")` are two different things.
- **By the scene's address,** in a browser. A scene at a new address, such as a copy on another site or under another name, starts with nothing. With `run` the address includes the port, 8000 unless you choose another.
- **Until the browser's data for the site is cleared.**
- **In a private window, or where the browser will not keep anything,** files and databases still work, and last until the page is closed.

In a browser a file is not a file you can find on the disk: the browser keeps it for the page. Text files share the few million characters a browser gives a site, so keep them small. Databases have far more room.

A database needs SQLite, which is loaded the first time a scene calls `openDatabase` (about 700 KB, once for the whole page). A scene that opens no database never loads it. On a website of your own it comes from the `sqlite` folder beside `pictures.js` ([Use it on your website](website.md)).

The Python spellings work here too: `save_text`, `save_json`, `load_text`, `load_json` and `open_database`.
