# Scenes

A program can be made of several scenes: a title screen, the game and a game-over screen, or the parts of a show that play one after another. Each scene has its own `setup`, `update`, `draw` and `on` functions, and starts empty. This page shows two screens of a game, then scenes on a timer, then the transitions between them, then the scrubber.

A file with no scenes in it is one scene, as it always was. Nothing on this page changes it.

## Two screens

A scene is a class that extends `Scene`. Inside it go the same functions a file has, without the word `function`.

```js
class Title extends Scene {
  draw() {
    background("midnightblue")
    text("Click to start", width / 2, height / 2, "white", 30, "centre")
  }
  onMouseDown() {
    go("Game")
  }
}

class Game extends Scene {
  setup() {
    this.x = 0
  }
  update(dt) {
    this.x = (this.x + 200 * dt) % width
  }
  draw() {
    background("black")
    circle(this.x, height / 2, 20, "gold")
  }
  onMouseDown() {
    go("Title")
  }
}
```

You do not create a scene or call anything. pictures.js finds every `Scene` class in the file. The first one written starts, and `go("Game")` changes to another by its name. `go(Game)`, with the class itself, does the same.

Three things to know:

- **A scene's own variables go on `this`.** `this.x` belongs to the scene. Set them in `setup()`.
- **`setup()` is called every time the scene begins**, so each game starts afresh.
- **Only the scene on show is called.** While `Title` is on show, `Game`'s `update`, `draw` and `onMouseDown` are not called.

### What is shared and what is a scene's own

Anything made at the top level of the file, outside every class, is shared by all the scenes: the score, a synth, a picture that was loaded.

```js
let score = 0     // shared: Game adds to it and GameOver shows it
```

Each scene starts empty:

| A scene's own | What happens when the scene ends |
|---|---|
| Its variables on `this` | Forgotten. The next time it begins they are as you wrote them |
| On-screen controls it made in `setup()` (`dial`, `slider`, `button`…) | Taken away. Controls made at the top level of the file stay |
| The picture | The next scene starts with a clear canvas and the drawing settings (`ctx.fillStyle`, `ctx.font`…) as they start |

Sound is not a scene's own. A song or a tune that is playing goes on playing across scenes until something stops it (`stopSound()`, `song.stop()`). To stop it with a scene, do so in the scene's `onStop()`, which is called when the scene ends.

The file's own top-level functions still work. A `function onKeyDown(key)` outside every class is called for every key, before the scene's own, whichever scene is on show: a good place for a key that mutes the sound. A top-level `draw()` is drawn before the scene's.

### Changing scene

| Call | What it does |
|---|---|
| `go("Game")`, `go(Game)` | Change to that scene. Capital letters in the name do not matter |
| `nextScene()` | Change to the next scene written. After the last one comes the first |
| `restart()` | Begin this scene again, from empty |
| `go("Menu", { keep: true })` | Go back to a scene as it was left: see below |

The change happens at the start of the next frame, so the function that asked for it runs to its end.

`go("Menu", { keep: true })` goes back to a scene with its variables as they were when it was left. Its `setup()` is not called again. If the scene has a `resume()`, that is called. Use it for a pause screen: the game goes to `"Pause"`, and the pause screen goes back with `go("Game", { keep: true })`. On-screen controls the scene made are not kept; make them again in `resume()`.

### Without classes

If you are not ready for classes, `scene` groups plain functions under a name.

```js
function drawTitle() {
  background("midnightblue")
  text("Click to start", width / 2, height / 2, "white", 30, "centre")
}

function drawGame() {
  background("black")
  circle(mouse.x, mouse.y, 20, "gold")
}

scene("title", { draw: drawTitle, onMouseDown: () => go("game") })
scene("game", { draw: drawGame, onMouseDown: () => go("title") })
```

The names inside the braces are the ones a class would use: `setup`, `update`, `draw`, `onMouseDown`, `onKeyDown` and the rest, and the settings below (`length`, `transition`). Scenes made this way keep their variables at the top level of the file, so they are not emptied when a scene begins: set them in the scene's `setup`.

`examples/three_screens.js` is a whole game with a title, the game and a game-over screen.

## Scenes on a timer

Give a scene a `length` in seconds and it ends by itself. The next scene written begins, and after the last one the first comes round again.

```js
class Intro extends Scene {
  length = 4
  draw() {
    background("navy")
    text("Part one", width / 2, height / 2, "white", 40, "centre")
  }
}

class Main extends Scene {
  length = 8
  draw() {
    background("black")
    circle(width * sceneProgress, height / 2, 30, "tomato")
  }
}
```

| Name | What it is |
|---|---|
| `sceneTime` | Seconds since this scene began |
| `sceneProgress` | How far through its length the scene is, from 0 to 1. It is 0 in a scene with no length |
| `sceneName` | The name of the scene on show |

`update(dt)` works as it always did.

### Lengths in beats

A scene that goes with music can be so many beats long, or so many bars. A bar is four beats.

```js
setTempo(120)

class Verse extends Scene {
  bars = 4        // 16 beats: 8 seconds at 120 beats a minute
}

class Break extends Scene {
  beats = 8
}
```

The beats are the sound library's (`setTempo`, `beat()`), so a scene ends on the beat however the frames fall. In a program with no sound a beat is half a second. See [Sound and music](sound.md).

To end a scene when a song reaches a place of its own, ask the song in `update` and call `nextScene()`:

```js
const song = playSong("tune.mod")

class Opening extends Scene {
  update() {
    if (song.position.order >= 2) nextScene()
  }
}
```

### Settings for every scene

`config`, at the top of the file, sets things for every scene.

```js
config({ loop: false, transition: "crossfade", transitionTime: 0.8 })
```

| Setting | Starts as | What it is |
|---|---|---|
| `loop` | `true` | After the last scene, begin the first again. With `false` the last scene stays on show |
| `transition` | `"cut"` | How every scene arrives, unless it says otherwise |
| `transitionTime` | `0.5` | How long a transition takes, in seconds |
| `transitionColor` | `"black"` | The colour a `"fade"` goes through |
| `beatsPerBar` | `4` | How many beats `bars = 1` is |

## Transitions

A scene can arrive with a transition. Set it on the scene:

```js
class Main extends Scene {
  transition = "crossfade"
  transitionTime = 0.8
}
```

or say it when you change scene:

```js
go("Game", { transition: "wipe", transitionTime: 0.5 })
```

| Transition | What you see |
|---|---|
| `"cut"` | The new scene at once. This is what happens when nothing is said. `"none"` is the same |
| `"crossfade"` | The old scene fades into the new one |
| `"fade"` | The old scene fades to a colour, and the new one comes out of it. `transitionColor = "white"` changes the colour |
| `"wipe"` | An edge crosses from the left with the new scene behind it. `"wipe_left"`, `"wipe_up"` and `"wipe_down"` cross the other ways |
| `"slide_left"` | The old scene slides out to the left and the new one follows it in. Also `"slide_right"`, `"slide_up"`, `"slide_down"` |

During a transition the old scene is a still picture of its last frame. The new scene has already begun: its `setup()` has been called and its `update` and `draw` are running underneath. A transition starts and ends gently.

The first scene of a program arrives with no transition.

A 3D program has the same transitions. A file is 2D or 3D as a whole, so all its scenes are the one or the other.

`examples/three_parts.js` is three parts on a timer with a different transition into each.

## The scrubber

When every scene has a length, the program is a sequence with a length of its own, and it has a scrubber. Move the pointer over the picture to see it.

- The button pauses and plays.
- The track has a tick where each scene starts. Point at a tick for the scene's name.
- Press or drag on the track to go to that time. The scene there is set up, and `sceneTime` is already at that point in it.

`section("name")` adds a tick of your own at the moment it is called:

```js
class Main extends Scene {
  length = 20
  update() {
    if (sceneTime > 12) section("The chorus")
  }
}
```

A program that plays a song can move the song when the scrubber moves, with a top-level `onSeek`:

```js
function onSeek(seconds) {
  song.seek(seconds)
}
```

A program with a scene that has no length has no scrubber: its length is not known.

## Mistakes

A mistake in a scene says which scene, and its line:

```
Line 7: In the scene Menu: go("nowhere"): there is no scene called "nowhere". The scenes are: Menu, Game
```

Things to know:

- **Make things in `setup()`, not in a constructor.** pictures.js makes each scene once before the program starts, to read its `length` and `transition`.
- **Every class that extends `Scene` plays**, in the order written, including one that extends another scene.
- **Name scenes at the top level.** `scene("name", …)` inside a function that is called later is too late.

## If you know Pymations

[Pymations](https://github.com/johnwylie70/pymations) has scenes too, and the words here are the same wherever the thing is the same.

| The same | |
|---|---|
| `class Intro extends Scene` | A scene is a class. Every `Scene` class in the file plays, in the order written, each starting empty |
| `setup()` | Called when the scene begins |
| `section("name")` | A tick on the scrubber |
| `transition = "crossfade"`, `transitionTime = 0.5` | On a scene. Pymations writes `transition_time`, as Python does; that spelling works here too |
| `"crossfade"`, `"slide_left"`, `"slide_right"`, `"wipe"`, `"none"` | The same transitions, drawn the same way |
| `config({ transition: "crossfade" })` | For every scene |
| The scrubber | Play and pause, a tick where each scene starts, the time |

| Different | Why |
|---|---|
| `setup`, `update(dt)`, `draw()` in place of `construct()` | A Pymations scene describes a timeline once. A scene here runs every frame, for as long as it is on show |
| `go()`, `nextScene()`, `restart()` | A Pymations scene ends when its animations do. Here the program decides, or the scene has a `length` |
| `length`, `beats`, `bars` | A Pymations scene is as long as what it plays |
| The last scene is followed by the first | A Pymations timeline stops at its end. `config({ loop: false })` does that here |
| `"cut"`, `"fade"`, the other wipes and slides | Added here. `"none"` still works |
| `section()` takes a name only | A transition here belongs to a change of scene |

## Related

- [How a program is shaped](program-shape.md)
- [Sound and music](sound.md)
- [Dials, sliders and a keyboard](dials.md)
- [Use it on your website](website.md)
