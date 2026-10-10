# Tutorial: A Bouncing Ball

Full reference: [www.circuitry.dev/docs/pictures/tutorials/bouncing-ball](https://www.circuitry.dev/docs/pictures/tutorials/bouncing-ball) (in Circuitry Studio's help)

A ball that falls, bounces off the floor and walls, and slows down a little with every bounce. Tap or click to throw it again. Then a version with many balls. This is the pattern behind almost every moving picture: keep numbers in variables, change them in `update(dt)`, and paint them in `draw()`.

## 1. A ball that moves

```js
let x = 100, y = 100       // where the ball is
let vx = 180, vy = 0       // how fast it moves, in points per second
const r = 24               // its radius

function update(dt) {
  x += vx * dt
  y += vy * dt
}

function draw() {
  background("#16213e")
  circle(x, y, r, "orange")
}
```

Run it and the ball slides off to the right and away. Each frame, `update(dt)` moves it by its speed times `dt`, the time since the last frame. The numbers that change are made with `let`; `r` never changes, so it is a `const`.

## 2. Gravity and bounces

Gravity is a steady push downwards: add to `vy` every frame. A bounce is a speed turned round: when the ball reaches the floor, put it back on the floor and flip `vy`. Multiplying by 0.8 rather than 1 loses a little speed on each bounce.

```js
let x = 100, y = 100
let vx = 180, vy = 0
const r = 24
const gravity = 900        // points per second, per second
const bounce = 0.8         // how much speed is kept after a bounce

function update(dt) {
  vy += gravity * dt
  x += vx * dt
  y += vy * dt

  if (y > height - r) {        // the floor
    y = height - r
    vy = -vy * bounce
    vx *= 0.99                 // a little friction
  }
  if (x < r) {                 // the left wall
    x = r
    vx = -vx * bounce
  }
  if (x > width - r) {         // the right wall
    x = width - r
    vx = -vx * bounce
  }
}

function onMouseDown(mx, my) {
  x = mx
  y = my
  vx = 300                     // throw it up and to the right
  vy = -500
}

function draw() {
  background("#16213e")
  circle(x, y, r, "orange")
  ctx.fillStyle = "white"
  ctx.font = "16px sans-serif"
  ctx.fillText("Tap or click to throw the ball", 12, 24)
}
```

`onMouseDown(mx, my)` is called when you click, or touch the canvas with a finger. It moves the ball to that spot and throws it.

## 3. Lots of balls

With many balls, each one needs its own numbers. A small class keeps them together.

```js
class Ball {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = random(-250, 250)
    this.vy = random(-600, -200)
    this.r = random(8, 26)
    this.colour = `hsl(${random(360)}, 85%, 60%)`
  }

  update(dt) {
    this.vy += 900 * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (this.y > height - this.r) {
      this.y = height - this.r
      this.vy *= -0.8
    }
    if (this.x < this.r || this.x > width - this.r) {
      this.x = Math.min(Math.max(this.x, this.r), width - this.r)
      this.vx *= -0.8
    }
  }

  draw() {
    circle(this.x, this.y, this.r, this.colour)
  }
}

const balls = []
for (let i = 0; i < 20; i++) {
  balls.push(new Ball(random(50, 350), 100))
}

function onMouseDown(x, y) {
  for (let i = 0; i < 10; i++) {
    balls.push(new Ball(x, y))
  }
}

function update(dt) {
  for (const ball of balls) ball.update(dt)
}

function draw() {
  background("#16213e")
  for (const ball of balls) ball.draw()
  ctx.fillStyle = "white"
  ctx.font = "16px sans-serif"
  ctx.fillText(`${balls.length} balls. Tap to add more.`, 12, 24)
}
```

Keep adding balls to see how many your device draws smoothly. [Finding mistakes](../finding-mistakes.md#the-frame-rate) shows how to put the frame rate on the canvas.

## The same thing as a loop

The ball of step 2 can also be written as one loop, with no `update` and no `draw`. `await frame()` waits for the screen's next refresh, so each pass of the loop is one frame. It also hands back the seconds since the last frame.

```js
let x = 100, y = 100
let vx = 180, vy = 0
const r = 24
const gravity = 900
const bounce = 0.8

while (true) {
  const dt = await frame()     // wait for the screen; dt is the time since the last frame

  if (mouse.down) {            // hold to carry the ball, let go to throw it
    x = mouse.x
    y = mouse.y
    vx = 300
    vy = -500
  }
  vy += gravity * dt
  x += vx * dt
  y += vy * dt
  if (y > height - r) {
    y = height - r
    vy = -vy * bounce
    vx *= 0.99
  }
  if (x < r) {
    x = r
    vx = -vx * bounce
  }
  if (x > width - r) {
    x = width - r
    vx = -vx * bounce
  }

  background("#16213e")
  circle(x, y, r, "orange")
}
```

The `on` functions are not called while a loop like this runs, so the loop reads `mouse` itself.

`update` and `draw` suit games, where things happen in any order and the `on` functions tell you about them. A loop suits a drawing made step by step, or a sequence: first this, then wait, then that. `await frame()` is also how a scene stays in step with the screen: everything drawn in one pass appears together at the next refresh, so nothing is ever shown half drawn.

## Try this

- Change `gravity` to 200 for the Moon, or make it negative.
- Let the balls bounce off the ceiling too.
- Give each ball a trail: paint the background with `"rgba(22, 33, 62, 0.3)"` instead of a solid colour, so the last few frames fade out slowly.

## Related

- [How a program is shaped](../program-shape.md): `update`, `draw` and the `on` functions
- Next: [a simple game](../tutorials/game.md)
