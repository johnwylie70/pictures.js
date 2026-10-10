// Space Rocks: steer a ship, shoot the rocks, and do not get hit. A rock breaks in two when it is shot.
// Use: left and right turn, up fires the engine, space shoots. Or hold the mouse or a finger to fly towards it; every tap shoots.
// Try changing: 3, the rocks in a wave; 500, the speed of a bullet; 7, the sides of a rock.
//
// Run it:   pictures run space_rocks.js

const ship = new Sprite(drawShip, 0, 0, 30)
let rocks = []
let bullets = []
let score = 0
let lives = 3
let safe = 0                    // seconds in which nothing can hurt the ship

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

function onMouseDown() {
  if (lives === 0) newGame()
  else shoot()
}

function steer(dt) {
  ship.spin = 0
  if (keys.has("ArrowLeft")) ship.spin = degrees(-230)
  if (keys.has("ArrowRight")) ship.spin = degrees(230)
  if (keys.has("ArrowUp")) ship.push(300 * dt)
  if (pressed.has(" ")) shoot()
  if (mouse.down) {
    ship.angle = ship.angleTo(mouse)
    ship.push(300 * dt)
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
