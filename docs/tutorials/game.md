# Tutorial: A Simple Game

Full reference: [www.circuitry.dev/docs/pictures/tutorials/game](https://www.circuitry.dev/docs/pictures/tutorials/game) (in Circuitry Studio's help)

Build a catching game in three steps: a basket you move with the arrow keys or your finger, stars that fall from the sky for you to catch, and then a score, lives and a game over screen. Each step is a whole program you can run.

The game uses sprites: pictures that move. Here every picture is an emoji, so there is nothing to download. See [Sprites](../drawing-2d.md#sprites) for everything a sprite can do.

## Step 1: a player you can move

```js
const player = new Sprite("🧺", 200, 300, 56)
const speed = 350          // points per second

function update(dt) {
  // arrow keys
  if (keys.has("ArrowLeft")) player.x -= speed * dt
  if (keys.has("ArrowRight")) player.x += speed * dt
  // a finger or the mouse: glide towards it
  if (mouse.down) player.x += (mouse.x - player.x) * 0.25
  // stay on the screen, near the bottom
  player.x = Math.min(Math.max(player.x, 30), width - 30)
  player.y = height - 50
}

function draw() {
  ctx.fillStyle = "#0b1026"
  ctx.fillRect(0, 0, width, height)
  player.draw()
}
```

Run it and press the left and right arrow keys. On a phone or tablet, put a finger on the canvas and slide it. If the keys do nothing, click the canvas once so it has the keyboard.

- `keys` holds the keys that are down right now, so holding an arrow keeps the basket moving.
- `mouse.down` is `true` while a finger or the mouse button is pressed, and `mouse.x` is where. Moving a quarter of the way there each frame makes the basket glide rather than jump.
- `Math.min(Math.max(...))` keeps the basket from leaving the screen. `player.y` follows the bottom edge, so it stays put if the canvas is resized.

## Step 2: falling stars to catch

Add a list of stars. Each frame they fall a little; when one reaches the bottom, or touches the basket, it goes back to the top at a random place.

```js
const player = new Sprite("🧺", 200, 300, 56)
const speed = 350
let score = 0

function newStar() {
  const star = new Sprite("⭐", random(20, width - 20), random(-300, -20), 36)
  star.vy = random(100, 220)      // its falling speed
  return star
}

const stars = []
for (let i = 0; i < 5; i++) stars.push(newStar())

function update(dt) {
  if (keys.has("ArrowLeft")) player.x -= speed * dt
  if (keys.has("ArrowRight")) player.x += speed * dt
  if (mouse.down) player.x += (mouse.x - player.x) * 0.25
  player.x = Math.min(Math.max(player.x, 30), width - 30)
  player.y = height - 50

  for (let i = 0; i < stars.length; i++) {
    const star = stars[i]
    star.update(dt)                // moves it by its speed
    star.angle += dt               // and spins it slowly
    if (star.touches(player)) {
      score += 1
      stars[i] = newStar()
    } else if (star.y > height + 20) {
      stars[i] = newStar()
    }
  }
}

function draw() {
  ctx.fillStyle = "#0b1026"
  ctx.fillRect(0, 0, width, height)
  for (const star of stars) star.draw()
  player.draw()
  ctx.fillStyle = "white"
  ctx.font = "bold 22px sans-serif"
  ctx.fillText(`Score: ${score}`, 14, 32)
}
```

- `star.vy` is the star's speed downwards. `star.update(dt)` moves it by that speed every frame.
- `star.touches(player)` is `true` when the two pictures overlap.
- `score` is made with `let` at the top of the file, so `update` can change it and `draw` can show it.

## Step 3: lives, bombs and game over

Now some things are dangerous: a bomb costs a life, and so does a star you miss. With no lives left, the game stops and waits for a tap, or the space bar, to start again.

```js
const player = new Sprite("🧺", 200, 300, 56)
const speed = 350
let score, lives, playing, things

function newThing() {
  const picture = pick(["💣", "⭐", "⭐", "⭐"])
  const thing = new Sprite(picture, random(20, width - 20), random(-300, -20), 36)
  thing.vy = random(100, 220) + score * 4     // faster as you score
  return thing
}

function start() {
  score = 0
  lives = 3
  playing = true
  things = []
  for (let i = 0; i < 6; i++) things.push(newThing())
}

start()

function onKeyDown(key) {
  if (key === " " && !playing) start()
}

function onMouseDown(x, y) {
  if (!playing) start()
}

function update(dt) {
  if (!playing) return
  if (keys.has("ArrowLeft")) player.x -= speed * dt
  if (keys.has("ArrowRight")) player.x += speed * dt
  if (mouse.down) player.x += (mouse.x - player.x) * 0.25
  player.x = Math.min(Math.max(player.x, 30), width - 30)
  player.y = height - 50

  for (let i = 0; i < things.length; i++) {
    const thing = things[i]
    thing.update(dt)
    if (thing.touches(player)) {
      if (thing.picture === "💣") lives -= 1
      else score += 1
      things[i] = newThing()
    } else if (thing.y > height + 20) {
      if (thing.picture === "⭐") lives -= 1      // a missed star costs a life
      things[i] = newThing()
    }
  }
  if (lives <= 0) {
    lives = 0
    playing = false
  }
}

function draw() {
  ctx.fillStyle = "#0b1026"
  ctx.fillRect(0, 0, width, height)
  for (const thing of things) thing.draw()
  player.draw()

  ctx.fillStyle = "white"
  ctx.font = "bold 22px sans-serif"
  ctx.textAlign = "left"
  ctx.fillText(`Score: ${score}`, 14, 32)
  ctx.textAlign = "right"
  ctx.fillText("❤️".repeat(lives), width - 14, 32)

  if (!playing) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.font = "bold 44px sans-serif"
    ctx.fillText("Game over", width / 2, height / 2 - 10)
    ctx.font = "20px sans-serif"
    ctx.fillText(`You caught ${score} stars.`, width / 2, height / 2 + 30)
    ctx.fillText("Tap or press space to play again.", width / 2, height / 2 + 58)
  }
}
```

What changed:

- `start()` sets everything up, so the same function starts the first game and every game after. `let score, lives, playing, things` makes the names; `start()` gives them their values.
- `playing` says whether the game is on. When it is `false`, `update` does nothing and `draw` shows the game over screen on top.
- `onKeyDown` and `onMouseDown` are called once per press, which suits "press to restart". Moving uses `keys` and `mouse`, which say what is held down right now.
- `"❤️".repeat(lives)` repeats the heart once for each life. `lives` is set back to 0 when it runs out, because two bombs in one frame could take it below, and `repeat` does not accept a number below 0.

## Make it yours

- Use your own pictures: `new Sprite(loadImage("basket.png"), ...)` works the same as an emoji, with a picture beside your scene or a web address.
- Add a power-up, such as a 🍀 that gives back a life.
- Ask one question in place of a loop: `const thing = player.hit(things)` gives the first thing the basket touches, or `null`.
- Add a high score: keep the best `score` in a variable that `start()` does not reset.

## Related

- [Drawing in 2D: sprites](../drawing-2d.md#sprites)
- [How a program is shaped: keyboard, mouse and touch](../program-shape.md#keyboard-mouse-and-touch-input)
- [Finding mistakes](../finding-mistakes.md): errors, printing and speed
- Next: [Space Rocks](space-rocks.md), a game with sprites you draw yourself
