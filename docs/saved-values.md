# Saved values

A program forgets everything when it stops. `save` keeps a value so that it is still there the next time the program runs, and `load` gives it back: a best score, a player's name, the level you reached.

```js
let clicks = load("clicks", 0)      // what was saved last time, or 0 the first time

function onMouseDown() {
  clicks += 1
  save("clicks", clicks)
}

function draw() {
  background("midnightblue")
  text("Clicks " + clicks, width / 2, height / 2, "white", 40, "centre")
}
```

Click a few times, then load the page again. The count carries on from where it was.

## save and load

| Call | What it does |
|---|---|
| `save(name, value)` | Keeps the value under that name. Saving under the same name again replaces what was there. |
| `load(name, otherwise)` | Gives back the value saved under that name. If nothing has been saved under it, gives `otherwise`. |

The name is any text you choose: `"best"`, `"player"`, `"level 3 time"`. Both answer at once, so there is no `await`.

Always give `load` its second value. The first time a program runs nothing has been saved yet, and that value is what you get: `load("best", 0)` is 0, `load("name", "nobody")` is `"nobody"`. Left out, you get `undefined`.

## What can be saved

Numbers, text, `true` and `false`, lists, and objects with names and values. Lists and objects can hold each other, as deep as you like.

```js
save("player", { name: "Ada", level: 3, keys: ["red", "blue"] })

const player = load("player", { name: "", level: 1, keys: [] })
console.log(player.name, player.keys.length)
```

A function, a sprite or an image cannot be saved, and trying to stops the scene with an error that says so. Save the numbers that describe the thing: `save("ship", { x: ship.x, y: ship.y })`.

What `load` gives you is a copy. Changing it does not change what is saved, so save it again when you want the change kept:

```js
const player = load("player", { name: "", level: 1, keys: [] })
player.level += 1
save("player", player)
```

## When to save

Save when something worth keeping changes: a game ends, a level is finished, a setting is switched. There is no need to save every frame.

A best score is saved at the moment the game ends, and only when it has been beaten:

```js
if (score > best) {
  best = score
  save("best", best)
}
```

[`examples/high_score.js`](../examples/high_score.js) is a small game built round those lines, and [`examples/snake.js`](../examples/snake.js) keeps its best score the same way.

To start again from nothing, save the starting value: `save("best", 0)`.

## Where the values are kept

- **In your browser, on the computer, tablet or phone you are using.** They are not sent anywhere, and another device, or another browser on the same one, starts with nothing.
- **For this scene alone.** Each scene has its own names, so two scenes can both save `"best"` and neither sees the other's. Nothing else a web page keeps is touched.
- **By the scene's address.** A scene at a new address, such as a copy on another site or under another name, starts with nothing. With `run` the address includes the port, 8000 unless you choose another.
- **Until the browser's data for the site is cleared.**
- **In a private window, or where the browser will not keep anything,** `save` and `load` still work, and the values last until the page is closed.

Keep what you save small: scores, names and settings, not pictures. A browser gives a site a few million characters in all.

These are not the functions for files. `loadText` and `loadJSON` read a file that sits beside the scene ([2D functions](2d-functions.md)).
