#!/usr/bin/env node
/**
 * Build the online gallery: every example, running, with its code beside it.
 *
 *   node scripts/build-gallery.mjs            -> site/
 *   node scripts/build-gallery.mjs --shots    also take the card pictures and the
 *                                             README's pictures (needs Playwright:
 *                                             PLAYWRIGHT=/path/to/node_modules/playwright)
 *   node scripts/build-gallery.mjs --gif      also record docs/images/gallery.gif, the
 *                                             moving picture at the top of the README
 *                                             (needs Playwright and ffmpeg)
 *
 * The pages are plain HTML with scenes put in by data-pictures-src, the way
 * any website would use the library.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const EXAMPLES = join(ROOT, 'examples')
const SITE = join(ROOT, 'site')
const HOME = 'https://www.circuitry.dev/pictures'
const PYCTURES = 'https://www.circuitry.dev/pyctures'

// [file, title, what it is, how to play with it]. Shown in this order.
const SCENES = [
  ['solar_system.js', 'Solar System', 'Planets in turning groups, a moon, a light at the sun and 2,000 stars.', 'Drag to look around.'],
  ['star_catcher.js', 'Star Catcher', 'A 2D game with emoji sprites, a score, lives and sound effects.', 'Arrow keys or drag. Catch the stars, dodge the rocks.'],
  ['synth_panel.js', 'Synth Panel', 'A synth with dials for its settings, the wave it is making, a meter and a piano keyboard.', 'Play the keys with the mouse, your fingers or A S D F G H J. Drag a dial to turn it.'],
  ['space_rocks.js', 'Space Rocks', 'Steer a ship and shoot the rocks, which break in two.', 'Left and right turn, up flies, space shoots. Or hold to fly to your finger, and tap to shoot.'],
  ['brick_breaker.js', 'Brick Breaker', 'A bat, a ball and a wall of bricks.', 'Arrow keys or drag. Clear the wall to win.'],
  ['bat_and_ball.js', 'Bat and Ball', 'One player against the computer. First to 5 wins.', 'Up and down, or drag.'],
  ['snake.js', 'Snake', 'A game on a grid: eat the apples and grow. Your best score is kept.', 'Arrow keys, or tap the side to turn to.'],
  ['high_score.js', 'High Score', 'Catch the star as often as you can in 10 seconds. The best score is still there next time: save() and load().', 'Click or tap the star.'],
  ['top_scores.js', 'Top Scores', 'Every game goes into a SQLite database, and the five best are shown: openDatabase().', 'Click or tap the star. When the time is up, click to play again.'],
  ['tune.js', 'Tune', 'A melody, a bass line and drums, each a line of notes: playNotes().', 'Click or tap to start it, and again to stop.'],
  ['midi_keyboard.js', 'MIDI Keyboard', 'A synth that a MIDI keyboard plays, with dials that its knobs turn: playFromMidi() and learn().', 'Play a MIDI keyboard and move three knobs. Or play the keys on the screen and drag the dials.'],
  ['midi_lights.js', 'MIDI Lights', 'Every key of a MIDI keyboard rings a bell and throws a ball up the picture: onMidiNote().', 'Play a MIDI keyboard and turn a knob. Or click, tap or press a key to pretend.'],
  ['voice_changer.js', 'Voice Changer', 'Your voice as a robot, a chipmunk or a monster, with a scope that draws it: useMicrophone().', 'Say yes to the microphone, pick a voice and press listen (wear headphones). Or record, then play.'],
  ['sampler.js', 'Sampler', 'Record a word and play it on the keys, higher and lower: mic.record() gives a sample.', 'Press record and say a word, then play the keys. With no microphone the keys play a bell.'],
  ['arpeggio.js', 'Arpeggio', 'Chords from one voice, as a Commodore 64 played them, over a chip bass and drums: startArp().', 'Click or tap to start it, and again to stop.'],
  ['cube_spiral.js', 'Cube Spiral', '400 cubes in a rainbow spiral, turning.', 'Drag to look around.'],
  ['cube_dodge.js', 'Cube Dodge', 'A 3D game with shadows, fog and the keyboard.', 'Arrow keys or drag. Dodge the red blocks.'],
  ['bouncing_balls.js', 'Bouncing Balls', 'A 2D animation with trails and hsl() colours.', 'Click or tap to add a ball.'],
  ['textured_cube.js', 'Textured Cube', 'A picture from a file, wrapped round a turning crate.', 'Drag to turn it.'],
  ['torus_knot.js', 'Torus Knot', 'One shape, lit, turning.', 'Drag to look around it.'],
  ['live_chart.js', 'Live Chart', 'A line chart of a made-up sensor, updating as you watch.', 'Move the mouse over it to read a value.'],
  ['wave_grid.js', 'Wave Grid', '225 cubes rising and falling like water.', 'Drag to look around.'],
  ['starfield.js', 'Starfield', 'Fly through 300 stars.', 'Hold the mouse down (or a finger) to go faster.'],
  ['lit_scene.js', 'Lit Scene', 'Shapes on a floor, with a spotlight and shadows.', 'Drag to orbit, pinch or scroll to zoom.'],
  ['spiral_garden.js', 'Spiral Garden', '200 dots placed on the golden angle, turning slowly.', ''],
  ['from_python_3d.js', 'From Python: 3D', 'The Pyctures spinning cube, line for line in JavaScript.', ''],
  ['from_python_2d.js', 'From Python: 2D', 'A Pyctures canvas scene written in JavaScript.', 'Click it.'],
  ['type_and_measure.js', 'Typing', 'Type and your words appear, with a box drawn to fit them.', 'Click it, then type.'],
  ['night_sky.js', 'Night Sky', 'A whole picture from the plain drawing functions: stars, a moon, a hill and a house.', ''],
  ['hello.js', 'Hello', 'The smallest scene: a background and one circle.', ''],
  ['moving.js', 'Moving', 'A circle crossing the picture: update(dt) and one number.', 'Change the 200 in the code to change its speed.'],
  ['follow.js', 'Follow', 'A circle you move.', 'Arrow keys, or hold the mouse or a finger on it.'],
  ['first_game.js', 'First Game', 'Catch the falling stars in the basket: sprites, touches() and a score.', 'Move the mouse, or drag a finger.'],
  ['ring.js', 'Ring', 'Twelve circles in a ring.', ''],
  ['pulse_loop.js', 'Pulse', 'A loop with await frame(): every pass is one frame.', ''],
].filter(([file]) => existsSync(join(EXAMPLES, file)))

// The README's pictures: [scene, picture].
const README_SHOTS = [['hello.js', 'readme-hello.jpg'], ['first_game.js', 'readme-first-game.jpg'], ['from_python_3d.js', 'readme-from-python.jpg'], ['textured_cube.js', 'readme-textured-cube.jpg']]

// How long a scene runs before its picture, in milliseconds, where the usual
// moment is a poor one (this cube is seen from straight above at 2.5 s).
const SHOT_AFTER = { 'from_python_3d.js': 750 }

const STYLE = `
:root { --bg: #0d1117; --panel: #161b22; --line: #30363d; --text: #e6edf3; --dim: #9198a1; --accent: #58a6ff; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, sans-serif; }
a { color: var(--accent); }
header, main, footer { max-width: 1120px; margin: 0 auto; padding: 0 16px; }
header { padding-top: 40px; padding-bottom: 8px; }
h1 { margin: 0 0 8px; font-size: 34px; }
.lead { color: var(--dim); max-width: 760px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; padding: 24px 0 48px; }
.card { display: block; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; color: inherit; text-decoration: none; }
.card:hover { border-color: var(--accent); }
.card img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: #000; }
.card div { padding: 12px 14px; }
.card b { display: block; }
.card span { color: var(--dim); font-size: 14px; }
.scene { height: min(62vh, 560px); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #000; }
.how { color: var(--dim); margin: 10px 0 24px; }
pre { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px; overflow-x: auto; font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; }
footer { color: var(--dim); font-size: 14px; padding-top: 16px; padding-bottom: 40px; border-top: 1px solid var(--line); }
`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const head = (title) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>`
const foot = `<footer>pictures.js, MIT licence. <a href="${HOME}">Its page, where you can edit a scene and run it</a>. For Python: <a href="${PYCTURES}">Pyctures</a>.</footer>
</body>
</html>
`

async function build() {
  await rm(SITE, { recursive: true, force: true })
  await mkdir(join(SITE, 'pictures'), { recursive: true })
  await cp(join(ROOT, 'pictures.js'), join(SITE, 'pictures', 'pictures.js'))
  await cp(join(ROOT, 'three'), join(SITE, 'pictures', 'three'), { recursive: true })
  await cp(join(ROOT, 'sqlite'), join(SITE, 'pictures', 'sqlite'), { recursive: true })
  await cp(join(ROOT, 'sound'), join(SITE, 'pictures', 'sound'), { recursive: true })
  await cp(join(ROOT, 'dials'), join(SITE, 'pictures', 'dials'), { recursive: true })
  if (existsSync(join(EXAMPLES, 'textures'))) await cp(join(EXAMPLES, 'textures'), join(SITE, 'textures'), { recursive: true })
  if (existsSync(join(ROOT, 'docs', 'images', 'gallery'))) await cp(join(ROOT, 'docs', 'images', 'gallery'), join(SITE, 'shots'), { recursive: true })

  const cards = []
  for (const [file, title, what, how] of SCENES) {
    const name = file.replace(/\.js$/, '')
    const code = await readFile(join(EXAMPLES, file), 'utf8')
    await writeFile(join(SITE, file), code)
    await writeFile(join(SITE, `${name}.html`), `${head(`${title}: pictures.js`)}
<header>
<p><a href="index.html">← All the scenes</a></p>
<h1>${esc(title)}</h1>
<p class="lead">${esc(what)}</p>
</header>
<main>
<div class="scene" data-pictures-src="${file}"></div>
<p class="how">${esc(how)}</p>
<h2>${esc(file)}</h2>
<pre><code>${esc(code)}</code></pre>
</main>
<script type="module" src="pictures/pictures.js"></script>
${foot}`)
    cards.push(`<a class="card" href="${name}.html"><img src="shots/${name}.jpg" alt="${esc(`${title}: ${what}`)}" loading="lazy"><div><b>${esc(title)}</b><span>${esc(what)}</span></div></a>`)
  }
  await writeFile(join(SITE, 'index.html'), `${head('pictures.js: the gallery')}
<header>
<h1>pictures.js</h1>
<p class="lead">2D and 3D graphics and games in plain JavaScript, with no HTML to write. Every scene here is one short .js file: open one to see it running with its code. The same scenes in Python are in the <a href="${PYCTURES}">Pyctures</a> gallery.</p>
</header>
<main>
<div class="grid">
${cards.join('\n')}
</div>
</main>
${foot}`)
  console.log(`Built ${SITE} (${SCENES.length} scenes)`)
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.wasm': 'application/wasm' }
function serve(root) {
  const server = createServer(async (req, res) => {
    try {
      const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(await readFile(path))
    } catch { res.writeHead(404).end() }
  })
  return new Promise((done) => server.listen(0, () => done(server)))
}

/** A picture of each scene after it has run for a moment. */
async function shots() {
  const from = process.env.PLAYWRIGHT || 'playwright'
  const { chromium } = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
  const server = await serve(SITE)
  const at = `http://localhost:${server.address().port}`
  const browser = await quietly(chromium, 'chromium')
  const page = await browser.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 2 })
  const take = async (file, out) => {
    await page.goto(`${at}/${file.replace(/\.js$/, '.html')}`)
    await page.waitForSelector('[data-pictures-status="running"], [data-pictures-status="finished"]', { timeout: 15000 })
    await page.waitForTimeout(SHOT_AFTER[file] ?? 2500)
    await mkdir(dirname(out), { recursive: true })
    await page.locator('.scene').screenshot({ path: out, type: 'jpeg', quality: 85 })
  }
  for (const [file] of SCENES) {
    const name = file.replace(/\.js$/, '')
    await take(file, join(ROOT, 'docs', 'images', 'gallery', `${name}.jpg`))
    console.log(`shot ${name}`)
  }
  for (const [file, picture] of README_SHOTS) {
    if (SCENES.some(([f]) => f === file)) await take(file, join(ROOT, 'docs', 'images', picture))
  }
  await browser.close()
  server.close()
  await cp(join(ROOT, 'docs', 'images', 'gallery'), join(SITE, 'shots'), { recursive: true })
}

// The scenes in the README's moving picture, three seconds each: the same five,
// in the same order, as Pyctures' (its scripts/build_gallery.py), so the two
// libraries open on the same picture.
const GIF_SCENES = ['solar_system.js', 'star_catcher.js', 'cube_spiral.js', 'bouncing_balls.js', 'wave_grid.js']

async function gif(seconds = 3, fps = 15) {
  const { mkdtemp } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { execFileSync } = await import('node:child_process')
  const from = process.env.PLAYWRIGHT || 'playwright'
  const { chromium } = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
  const frames = await mkdtemp(join(tmpdir(), 'pictures-gif-'))
  const server = await serve(SITE)
  const at = `http://localhost:${server.address().port}`
  const browser = await quietly(chromium, 'chromium', { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  let n = 0
  for (const file of GIF_SCENES) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
    await page.goto(`${at}/${file.replace(/\.js$/, '.html')}`)
    await page.waitForSelector('[data-pictures-status="running"], [data-pictures-status="finished"]', { timeout: 15000 })
    await page.waitForTimeout(1500)
    for (let i = 0; i < seconds * fps; i++) {
      await page.locator('.scene').screenshot({ path: join(frames, `f${String(n++).padStart(5, '0')}.png`) })
      await page.waitForTimeout(1000 / fps)
    }
    await page.close()
  }
  await browser.close()
  server.close()
  const target = join(ROOT, 'docs', 'images', 'gallery.gif')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, 'f%05d.png'),
    '-vf', 'scale=720:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop', '0', target])
  await rm(frames, { recursive: true })
  console.log(`recorded docs/images/gallery.gif`)
}

await build()
if (process.argv.includes('--shots')) await shots()
if (process.argv.includes('--gif')) await gif()
