# Tutorial: Space Rocks

Full reference: [www.circuitry.dev/docs/pictures/tutorials/space-rocks](https://www.circuitry.dev/docs/pictures/tutorials/space-rocks) (in Circuitry Studio's help)

Steer a ship and shoot the rocks: a ship that turns and fires its engine, rocks that drift and break in two when shot, and a picture that wraps round at its edges. It is built in four steps, and each step is a whole program you can run. Nothing is downloaded: the ship is a triangle and the rocks are seven-sided shapes.

The game is made of sprites. A sprite knows how to move, how to wrap round the edges and how to tell what it is touching, so the game reads much like a description of itself. See [Sprites](../drawing-2d.md#sprites) for everything a sprite can do.

## Step 1: a ship you can fly

A sprite's picture can be a function that draws it. The function is given the sprite's size, and draws round `0, 0` facing right: here one `triangle`, with an outline and no colour, so only its edge is drawn. The sprite puts the drawing where the ship is and turns it to the ship's angle.

```js
const ship = new Sprite(drawShip, 200, 150, 30)

// A sprite's picture is drawn round 0, 0, facing right.
function drawShip(size) {
  triangle(size / 2, 0, -size / 2, -size / 3, -size / 2, size / 3, { outline: "white", thickness: 2 })
}

function update(dt) {
  ship.spin = 0
  if (keys.has("ArrowLeft")) ship.spin = degrees(-230)
  if (keys.has("ArrowRight")) ship.spin = degrees(230)
  if (keys.has("ArrowUp")) ship.push(300 * dt)
  ship.limit(350)
  ship.update(dt)
  ship.wrap()
}

function draw() {
  background("black")
  ship.draw()
}
```

Click the picture first, so it has the keyboard. Left and right turn the ship and up fires the engine.

- `ship.spin` is how fast the ship turns: `degrees(230)` is 230 degrees a second. `ship.update(dt)` does the turning and the moving.
- `ship.push(300 * dt)` speeds the ship up in the direction it faces. Let go and it keeps drifting, as things do in space. `ship.limit(350)` stops it going faster than 350 points a second.
- `ship.wrap()` brings the ship back on the opposite side when it leaves the picture.

## Step 2: rocks

The rocks are sprites too, kept in a list. Each has a speed and a spin of its own, and wraps like the ship.

```js
const ship = new Sprite(drawShip, 200, 150, 30)
const rocks = []

function drawShip(size) {
  triangle(size / 2, 0, -size / 2, -size / 3, -size / 2, size / 3, { outline: "white", thickness: 2 })
}

function drawRock(size) {
  polygon(0, 0, size / 2, 7, { outline: "white", thickness: 2 })
}

function addRock(x, y, size) {
  const rock = new Sprite(drawRock, x, y, size)
  rock.vx = random(-70, 70)
  rock.vy = random(-70, 70)
  rock.spin = degrees(random(-60, 60))
  rocks.push(rock)
}

for (let i = 0; i < 4; i++) addRock(0, random(0, height), 80)

function update(dt) {
  ship.spin = 0
  if (keys.has("ArrowLeft")) ship.spin = degrees(-230)
  if (keys.has("ArrowRight")) ship.spin = degrees(230)
  if (keys.has("ArrowUp")) ship.push(300 * dt)
  ship.limit(350)
  ship.update(dt)
  ship.wrap()
  for (const rock of rocks) {
    rock.update(dt)
    rock.wrap()
  }
  // Hit a rock and the ship goes back to the middle.
  if (ship.hit(rocks)) {
    ship.x = width / 2
    ship.y = height / 2
    ship.vx = 0
    ship.vy = 0
  }
}

function draw() {
  background("black")
  for (const rock of rocks) rock.draw()
  ship.draw()
}
```

- `drawRock` is one `polygon` with seven sides. Its radius is half the rock's size, so the same function draws a big rock and a small one.
- `ship.hit(rocks)` gives the first rock the ship is touching, or `null` when it touches none. That is all a collision takes.
- Sprites are tested as circles. A rock's circle is a little smaller than its picture, which is fair to the player: a near miss is a miss.

## Step 3: shooting, and rocks that split

A bullet is a small white circle, `Sprite.circle`. It starts at the ship, takes the ship's angle, and one `push` sends it on its way.

```js
const ship = new Sprite(drawShip, 200, 150, 30)
const rocks = []
const bullets = []
let score = 0

function drawShip(size) {
  triangle(size / 2, 0, -size / 2, -size / 3, -size / 2, size / 3, { outline: "white", thickness: 2 })
}

function drawRock(size) {
  polygon(0, 0, size / 2, 7, { outline: "white", thickness: 2 })
}

function addRock(x, y, size) {
  const rock = new Sprite(drawRock, x, y, size)
  rock.vx = random(-70, 70)
  rock.vy = random(-70, 70)
  rock.spin = degrees(random(-60, 60))
  rocks.push(rock)
}

for (let i = 0; i < 4; i++) addRock(0, random(0, height), 80)

// A bullet starts at the ship and is pushed the way the ship faces.
function shoot() {
  const bullet = Sprite.circle(ship.x, ship.y, 5)
  bullet.angle = ship.angle
  bullet.push(500)
  bullets.push(bullet)
}

function update(dt) {
  ship.spin = 0
  if (keys.has("ArrowLeft")) ship.spin = degrees(-230)
  if (keys.has("ArrowRight")) ship.spin = degrees(230)
  if (keys.has("ArrowUp")) ship.push(300 * dt)
  if (pressed.has(" ")) shoot()
  ship.limit(350)
  ship.update(dt)
  ship.wrap()
  for (const rock of rocks) {
    rock.update(dt)
    rock.wrap()
  }
  // Loop over a copy of the list ([...bullets]), because the loop removes bullets from it.
  for (const bullet of [...bullets]) {
    bullet.update(dt)
    const rock = bullet.hit(rocks)
    if (rock) {
      remove(bullets, bullet)
      remove(rocks, rock)
      score += 10
      if (rock.size > 20) {
        addRock(rock.x, rock.y, rock.size / 2)
        addRock(rock.x, rock.y, rock.size / 2)
      }
    } else if (bullet.offscreen()) {
      remove(bullets, bullet)
    }
  }
  // Hit a rock and the ship goes back to the middle.
  if (ship.hit(rocks)) {
    ship.x = width / 2
    ship.y = height / 2
    ship.vx = 0
    ship.vy = 0
  }
}

function draw() {
  background("black")
  for (const rock of rocks) rock.draw()
  for (const bullet of bullets) bullet.draw()
  ship.draw()
  text("Score " + score, 12, 30, "white", 20)
}
```

Press space to shoot.

- `pressed.has(" ")` is true once for each press of the space bar. With `keys` in its place, holding space would pour out sixty bullets a second.
- `bullet.hit(rocks)` finds the rock a bullet has met. Both are taken out of their lists with `remove`, and a big rock leaves two rocks of half the size.
- The loop goes over a copy of the list, written `[...bullets]`. Removing things from a list while a loop is going through that same list makes it skip some. Looping over a copy and removing from the real list is always safe.
- `bullet.offscreen()` is true when a bullet has left the picture, so it can be removed too. Without this the list would grow for ever.

## Step 4: lives, waves and starting again

The last step turns it into a game: three lives, a new wave of rocks when the last one is shot, a ship that cannot be hurt for two seconds after it appears, and a way to play on a phone.

```js
const ship = new Sprite(drawShip, 0, 0, 30)
let rocks = []
let bullets = []
let score = 0
let lives = 3
let safe = 0                    // seconds in which nothing can hurt the ship
let held = 0                    // seconds the mouse or a finger has been down

// A sprite's picture is drawn round 0, 0, facing right.
function drawShip(size) {
  triangle(size / 2, 0, -size / 2, -size / 3, -size / 2, size / 3, { outline: "white", thickness: 2 })
}

function drawRock(size) {
  polygon(0, 0, size / 2, 7, { outline: "white", thickness: 2 })
}

function addRock(x, y, size) {
  const rock = new Sprite(drawRock, x, y, size)
  rock.vx = random(-70, 70)
  rock.vy = random(-70, 70)
  rock.spin = degrees(random(-60, 60))
  rocks.push(rock)
}

function newShip() {
  ship.x = width / 2
  ship.y = height / 2
  ship.vx = 0
  ship.vy = 0
  ship.angle = degrees(-90)     // pointing up: 0 faces right
  safe = 2
}

function newGame() {
  score = 0
  lives = 3
  rocks = []
  bullets = []
  newShip()
}

function shoot() {
  const bullet = Sprite.circle(ship.x, ship.y, 5)
  bullet.angle = ship.angle
  bullet.push(500)              // off it goes, the way the ship faces
  bullets.push(bullet)
}

function onMouseDown(x, y) {
  held = 0
  if (lives === 0) {
    newGame()
  } else {
    ship.angle = ship.angleTo(x, y)
    shoot()
  }
}

function steer(dt) {
  ship.spin = 0
  if (keys.has("ArrowLeft")) ship.spin = degrees(-230)
  if (keys.has("ArrowRight")) ship.spin = degrees(230)
  if (keys.has("ArrowUp")) ship.push(300 * dt)
  if (pressed.has(" ")) shoot()
  // A tap is over before the engine starts. Keep holding and the ship flies to your finger.
  if (mouse.down) {
    held += dt
    ship.angle = ship.angleTo(mouse)
    if (held > 0.18) ship.push(300 * dt)
  }
  ship.limit(350)
}

function update(dt) {
  if (lives === 0) {
    if (pressed.has(" ")) newGame()
    return
  }
  if (rocks.length === 0) {     // a new wave, starting on the left edge
    for (let i = 0; i < 3; i++) addRock(0, random(height), 80)
    safe = 2
  }
  safe -= dt
  steer(dt)
  ship.update(dt)
  ship.wrap()
  for (const rock of rocks) {
    rock.update(dt)
    rock.wrap()
  }
  // Loop over a copy of the list ([...bullets]), because the loop removes bullets from it.
  for (const bullet of [...bullets]) {
    bullet.update(dt)
    const rock = bullet.hit(rocks)
    if (rock) {
      remove(bullets, bullet)
      remove(rocks, rock)
      score += 10
      if (rock.size > 20) {     // a big rock breaks in two
        addRock(rock.x, rock.y, rock.size / 2)
        addRock(rock.x, rock.y, rock.size / 2)
      }
    } else if (bullet.offscreen()) {
      remove(bullets, bullet)
    }
  }
  if (safe <= 0 && ship.hit(rocks)) {
    lives -= 1
    newShip()
  }
}

function draw() {
  background("black")
  for (const rock of rocks) rock.draw()
  for (const bullet of bullets) bullet.draw()
  ship.visible = lives > 0 && (safe <= 0 || safe % 0.25 > 0.12)   // it blinks while it is safe
  ship.draw()
  text("Score " + score + "   Lives " + lives, 12, 30, "white", 20, "left")
  if (lives === 0) {
    text("Game over", width / 2, height / 2, "white", 32, "centre")
    text("Tap or press space to play again", width / 2, height / 2 + 40, "white", 18, "centre")
  }
}

newGame()
```

- `safe` counts down the seconds in which nothing can hurt the ship. Without it, a new ship could appear inside a rock and be lost at once. While it is safe the ship blinks: `ship.visible` is switched on and off.
- A new wave of three rocks starts whenever the list of rocks is empty. They start on the left edge, away from the ship.
- On a phone or with a mouse, `onMouseDown` is called once for each press. It turns the ship to face the press with `ship.angleTo(x, y)` and shoots, so a tap aims and fires.
- `held` counts the seconds the mouse or a finger has been down. A tap is over in about a tenth of a second, so the engine, which waits for 0.18, never starts. Keep holding a moment longer and the ship flies towards your finger, turning to follow it with `ship.angleTo(mouse)`.
- When the lives run out, the same tap or the space bar starts a new game.

This is the example `space_rocks.js`. Three more small games are written the same way: `bat_and_ball.js`, `brick_breaker.js` and `snake.js`.

## Make it yours

- Change the numbers: a faster ship, slower rocks, bigger bullets.
- Give the rocks five sides, or nine. Make the ship a `star`.
- Give the ship a little drag, so it slows down by itself: multiply `ship.vx` and `ship.vy` by 0.99 in `steer`.
- Add a flying saucer worth 100 points: one more sprite, and one more `hit`.
- Keep the best score in a variable that `newGame` does not reset.

## Related

- [Drawing in 2D: sprites](../drawing-2d.md#sprites)
- [How a program is shaped: keyboard, mouse and touch](../program-shape.md#keyboard-mouse-and-touch-input)
- [Tutorial: a simple game](game.md), with emoji sprites
- Next: [a spinning 3D cube](spinning-cube.md)
