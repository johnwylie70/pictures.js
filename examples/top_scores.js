// Top Scores: catch the star as often as you can in 10 seconds. Every game goes into a database, and the five best are shown.
// Use: click or tap the star. When the time is up, click anywhere to play again.
// Try changing: 5, how many scores the table shows; the names a player can be given; "scores", the name of the database.
//
// Run it:   pictures run top_scores.js

const db = await openDatabase("scores")          // the file scores.db: made the first time, still there the next
await db.run("create table if not exists games (player text, points integer)")
let table = await db.query("select player, points from games order by points desc limit 5")

const names = ["Ada", "Grace", "Alan", "Linus", "Hedy", "Tim"]
let player = pick(names)
let score = 0
let left = 10                                    // seconds left in this game
const star = new Sprite("⭐", 200, 160, 60)

async function keepScore() {
  await db.run("insert into games values (?, ?)", player, score)
  table = await db.query("select player, points from games order by points desc limit 5")
}

function update(dt) {
  if (left <= 0) return                          // the game is over
  left -= dt
  if (left <= 0) keepScore()
}

function onMouseDown(x, y) {
  if (left <= 0) {                               // the next game, and the next player
    player = pick(names)
    score = 0
    left = 10
  } else if (star.contains(x, y)) {
    score += 1
    star.x = random(40, width - 40)
    star.y = random(90, height - 40)
  }
}

function draw() {
  background("midnightblue")
  if (left > 0) {
    star.draw()
    text(player + ": " + score, 16, 34, "white", 22, "left")
    text(Math.round(left), width - 16, 34, "white", 22, "right")
    return
  }
  text("The best games. Click to play again", width / 2, 40, "white", 22, "centre")
  let y = 90
  for (const row of table) {
    text(row.player, width / 2 - 20, y, "gold", 22, "right")
    text(row.points, width / 2 + 20, y, "gold", 22, "left")
    y += 34
  }
}
