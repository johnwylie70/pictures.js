#!/usr/bin/env node
/**
 * The effects (visualfx/visualfx.js) as a scene has them, in real browsers: that a scene which uses none asks
 * for nothing and no example that uses none would, that a scene which calls one is given it in both spellings
 * with nothing to load, that the effects see the frame the scene has just drawn and sit under its controls,
 * that a change of scene is seen THROUGH the effects, that they listen to the scene's sound, that they go
 * with the scene, and that `pictures build` carries the folder only for a scene that uses one.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-effects.mjs
 *
 * The effects' own pixels are measured in the effects' own repository (visualfx.js: scripts/test-visualfx.mjs).
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails. No sound is made.
 */
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

const SONG = resolve(ROOT, '..', 'synths.js', 'examples', 'songs', 'night_drive.json')
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.json': 'application/json' }
const asked = []
const server = createServer(async (request, reply) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname)
  if (path === '/test.html') {
    reply.writeHead(200, { 'content-type': 'text/html' })
    return reply.end('<!doctype html><body style="margin:0;background:#fff"><div id="s" style="position:relative;width:300px;height:200px"></div>')
  }
  // A real tracker song for the music tests: synths.js's own example, from the repository beside this one.
  if (path === '/song.json') {
    try { reply.writeHead(200, { 'content-type': 'application/json' }); return reply.end(await readFile(SONG)) } catch (e) { reply.writeHead(404); return reply.end() }
  }
  asked.push(path.slice(1))
  try {
    const body = await readFile(join(ROOT, path))
    reply.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' })
    reply.end(body)
  } catch (e) { reply.writeHead(404); reply.end() }
})
await new Promise((ready) => server.listen(0, ready))
const at = `http://localhost:${server.address().port}`

let failed = 0
const say = (ok, browser, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${browser}: ${what}${ok ? '' : `\n       got ${JSON.stringify(got)?.slice(0, 900)}`}`)
}
const near = (a, b, by = 6) => a && a.length >= b.length && b.every((v, i) => Math.abs(v - a[i]) <= by)

async function play(page, source, { until = 'window.result !== undefined', wait = 5000 } = {}) {
  asked.length = 0
  const begin = () => page.evaluate(async (source) => {
    const { runScene } = await import('/pictures.js')
    window.scene?.stop()
    document.getElementById('s').replaceChildren()
    window.result = undefined
    window.error = null
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', keyboard: true, onError: (message, line) => { window.error = { error: message, line } } })
  }, source)
  // Headless Chromium now and then replaces the page's world just after a scene that played a song is stopped
  // (the reason is not known: nothing navigates and nothing is said). The scene is then started again, once.
  try { await begin() } catch (e) {
    if (!/context was destroyed/i.test(String(e.message))) throw e
    await page.waitForLoadState('load').catch(() => {})
    await page.waitForTimeout(300)
    await begin()
  }
  await page.waitForFunction(`window.error || (${until})`, null, { timeout: wait }).catch(() => {})
  return page.evaluate(() => window.error || window.result || {})
}
// The effects of the scene's canvas, for a test: the very module pictures.js loaded, so the same effects.
const PIPE = `(await use("/visualfx/visualfx.js")).effects(canvas)`
const LAYERS = `[...document.querySelectorAll("#s canvas")].map((c) => c === canvas ? "scene" : c.dataset.effectsLayer !== undefined ? "effects" : c.dataset.dialsLayer !== undefined ? "dials" : c.dataset.picturesTransition !== undefined ? "transition" : "other").join()`

// --- with no browser: what the text of a scene asks for
{
  const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
  const files = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()
  const want = []
  for (const f of files) if (sceneUses(await readFile(join(ROOT, 'examples', f), 'utf8')).effects) want.push(f)
  say(files.length >= 28 && want.length === 0, 'node', `none of the ${files.length} examples, which use no effect, would be sent the effects`, want)
  const uses = (text) => sceneUses(text).effects
  const yes = ['glow(1)', 'const t = trails(0.5, { zoom: 2 })', 'zoom_blur(0.2)', 'look("arcade")', 'circle(1, 2, 20 * bass(), "red")', 'colourCycle()', 'kaleidoscope(8)\nfunction draw() {}']
  const no = ['function glow(x) { return x }\nglow(1)', 'const blur = 3\ncircle(blur, 1, 1)', 'ship.shake()\nconst rain = []\nfor (const drop of rain) drop.fall()', '// glow(1)\ntext("call glow(1) to glow", 1, 1)',
    'const { glow } = await use("effects.js")\nglow(1)', 'class Fire { fire() { return 1 } }\nnew Fire().fire()', 'let snow\nsnow = 3', 'const look = (a) => a\nlook(2)']
  say(yes.every(uses) && !no.some(uses), 'node', 'a scene is given the effects when it calls one, in either spelling, and not for a word of its own or a word in a comment', { missed: yes.filter((t) => !uses(t)), wrongly: no.filter(uses) })

  // What a built folder carries.
  const work = await mkdtemp(join(tmpdir(), 'pictures-effects-'))
  try {
    await mkdir(join(work, 'src'))
    await writeFile(join(work, 'src', 'plain.js'), 'function draw() { background("navy"); circle(100, 100, 30, "gold") }\n')
    await writeFile(join(work, 'src', 'shiny.js'), 'function draw() { background("navy"); circle(100, 100, 30, "gold") }\nglow(1)\n')
    for (const name of ['plain', 'shiny']) execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(work, 'src', `${name}.js`), '-o', join(work, `out-${name}`)], { stdio: 'ignore' })
    const has = (name) => existsSync(join(work, `out-${name}`, 'pictures', 'visualfx', 'visualfx.js'))
    say(has('shiny') && !has('plain') && existsSync(join(work, 'out-plain', 'pictures', 'pictures.js')), 'node', 'pictures build puts the effects in the folder of a scene that uses one, and of no other', { shiny: has('shiny'), plain: has('plain') })
  } finally { await rm(work, { recursive: true, force: true }) }
}

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch (e) { console.log(`     ${name}: not installed, skipped`); continue }
  const page = await browser.newPage({ viewport: { width: 500, height: 400 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (process.env.WATCH) { page.on('framenavigated', (f) => console.log('     navigated to', f.url())); page.on('crash', () => console.log('     the page crashed')); page.on('console', (m) => { if (/error|warn/.test(m.type())) console.log('     says:', m.text().slice(0, 200)) }) }
  await page.goto(`${at}/test.html`)

  let got = await play(page, `function draw() { background("navy"); circle(100, 100, 30, "gold") }\nawait frame(); await frame()\nwindow.result = { canvases: document.querySelectorAll("#s canvas").length }`)
  say(got.canvases === 1 && !asked.some((a) => /visualfx/.test(a)), name, 'a scene that uses no effect asks for nothing more and has one canvas', { got, asked: [...asked] })

  got = await play(page, `let n = 0
function draw() { background("black"); circle(60 + n++, 60, 30, "gold") }
const k = kaleidoscope(6)
const z = zoom_blur(0.1)
setTimeout(async () => {
  for (let i = 0; i < 4; i++) await frame()
  const layer = document.querySelector("#s canvas[data-effects-layer]")
  window.result = { layers: ${LAYERS}, w: layer.width, cw: canvas.width, h: layer.height, ch: canvas.height, shown: layer.style.display, segments: k.segments, strength: z.strength, names: [typeof clear_effects, typeof listenTo, typeof colourCycle, typeof color_cycle] }
}, 0)`)
  say(got.layers === 'scene,effects' && got.w === got.cw && got.h === got.ch && got.shown === 'block' && got.segments === 6 && got.strength === 0.1 && got.names?.every((t) => t === 'function') && asked.includes('visualfx/visualfx.js'),
    name, 'a scene that calls an effect is given every one, in both spellings, with nothing to load; its picture is on a canvas over the scene\'s, the same size', { got, asked: [...asked] })

  got = await play(page, `const fxs = ${PIPE}
let n = 0, t = 0, began = null
const seen = []
function update(dt) { t += dt }
function draw() { n++; background(n % 2 ? "rgb(255,0,0)" : "rgb(0,0,255)") }
invert()
fxs.onFrame((fx) => { if (!n) return; seen.push((n % 2 ? "red" : "blue") + ">" + (fx.pixels().data[0] < 128 ? "cyan" : "yellow")); if (seen.length === 1) began = [t, fx.stats().time]; if (seen.length === 6) window.result = { seen, t: t - began[0], clock: fx.stats().time - began[1] } })`)
  say(got.seen?.every((s) => s === 'red>cyan' || s === 'blue>yellow') && new Set(got.seen).size === 2 && Math.abs(got.t - got.clock) < 1e-9 && got.t > 0, name, 'the effects are done to the frame the scene has just drawn, and are stepped by the scene\'s own dt', got)

  got = await play(page, `function draw() { background("black"); circle(150, 100, 60, "gold") }
const soft = blur(4)
const d = dial("radius", soft, "radius")
setTimeout(async () => { for (let i = 0; i < 4; i++) await frame(); d.value = 20; await frame(); window.result = { radius: soft.radius, max: d.max, layers: ${LAYERS} } }, 0)`)
  say(got.radius === 20 && got.max === 200 && got.layers === 'scene,effects,dials', name, 'a dial turns an effect\'s setting and takes its range from it, and the controls are drawn over the effects', got)

  // A change of scene. Red goes to blue by a crossfade, held half way: the effects must be given the mix of the two.
  got = await play(page, `const fxs = ${PIPE}
invert()
class Red extends Scene { draw() { background("rgb(255,0,0)") } onKeyDown() { go(Blue, { transition: "crossfade", seconds: 2 }) } }
class Blue extends Scene { draw() { background("rgb(0,0,255)") } }
window.read = () => new Promise((done) => fxs.onFrame((fx) => { fxs.onFrame(null); const p = fx.pixels(), i = (100 * p.width + 150) * 4; done({ colour: [p.data[i], p.data[i + 1], p.data[i + 2]], layers: ${LAYERS} }) }))`, { until: 'window.scene.scenes?.name === "Red"', wait: 8000 })
  if (!got.error) {
    got = [await page.evaluate(() => window.read())]
    await page.evaluate(() => { for (const type of ['keydown', 'keyup']) window.scene.canvas.dispatchEvent(new KeyboardEvent(type, { key: 'a', code: 'KeyA', bubbles: true })) })
    await page.waitForFunction(() => window.error || (window.scene.scenes?.name === 'Blue' && window.scene.transition), null, { timeout: 3000 }).catch(() => {})
    for (const p of [0, 0.5, 1]) {
      await page.evaluate((p) => window.scene.transition?.hold(p), p)
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
      got.push(await page.evaluate(() => window.read()))
    }
    await page.evaluate(() => window.scene.transition?.release())
    await page.waitForFunction(() => !window.scene.transition, null, { timeout: 4000 }).catch(() => {})
    got.push(await page.evaluate(() => window.read()))
    got.push(await page.evaluate(() => window.error))
  }
  // Inverted: red is cyan, blue is yellow, and half of each is a pale green.
  say(Array.isArray(got) && !got[5] && near(got[0].colour, [0, 255, 255], 2) && near(got[1].colour, [0, 255, 255], 3) && near(got[2].colour, [128, 255, 128], 5) && near(got[3].colour, [255, 255, 0], 3) && near(got[4].colour, [255, 255, 0], 2)
    && got[2].layers === 'scene,transition,effects' && got[4].layers === 'scene,effects', name, 'one scene changes to the next THROUGH the effects: the old picture and the new are mixed, then the effects are done to the mix, and they are shown over both', got)

  got = await play(page, `const fxs = ${PIPE}
playNotes("C2 C2", 0.25)
glow(1)
function draw() { background("black"); circle(150, 100, 20 + 40 * bass(), "gold") }
setTimeout(async () => { for (let i = 0; i < 3; i++) await frame(); const t = fxs.pipeline.listener.target; window.result = { listens: !!t && typeof t.samples === "function", bass: bass(), pulse: pulse() } }, 0)`)
  say(got.listens === true && typeof got.bass === 'number' && typeof got.pulse === 'number', name, 'in a scene with sound the effects listen to all of it without being told, and the music\'s numbers are there to draw with', got)

  got = await play(page, `function draw() { background("black"); circle(100, 100, 30, "gold") }\nglow(1); trails(0.5); blur(3)\nsetTimeout(async () => { for (let i = 0; i < 4; i++) await frame(); window.kept = document.querySelector("#s canvas[data-effects-layer]"); window.result = { layers: ${LAYERS} } }, 0)`)
  const after = await page.evaluate(async () => { window.scene.stop(); await new Promise((r) => setTimeout(r, 50)); return { layers: document.querySelectorAll('#s canvas[data-effects-layer]').length, attached: window.kept?.isConnected } })
  say(got.layers === 'scene,effects' && after.layers === 0 && after.attached === false, name, 'a scene that is stopped takes its effects with it', { got, after })

  got = await play(page, `function draw() { background("black") }\nconst k = kaleidoscope(6)\nk.segmnts = 3`)
  // Safari's engine does not say which line of the scene a mistake found inside a library came from (see lineOf).
  say(/kaleidoscope has no setting called "segmnts"/.test(got.error || '') && (got.line === 3 || name === 'webkit'), name, 'a mistake with an effect is said in plain words, with its line where the browser gives it', got)

  // A SONG as the music: a tracker song playing, heard through all the scene's sound and through one of its channels.
  if (existsSync(SONG)) {
    const music = async (listen) => {
      await play(page, `const fxs = ${PIPE}
const song = playSong("/song.json")
glow(1)
${listen}
window.most = { bass: 0, mids: 0, highs: 0, loudness: 0, pulses: 0 }
let was = 0
function draw() {
  background("black")
  circle(150, 100, 20 + 60 * bass(), "gold")
  const m = window.most
  m.bass = Math.max(m.bass, bass()); m.mids = Math.max(m.mids, mids()); m.highs = Math.max(m.highs, highs()); m.loudness = Math.max(m.loudness, loudness())
  if (pulse() > 0.9 && was < 0.5) m.pulses++
  was = pulse()
}`, { until: 'window.scene.sound && window.scene.sound.state !== "loading"', wait: 20000 })
      await page.mouse.click(150, 100)
      await page.waitForFunction('window.error || (window.most && window.most.loudness > 0.5)', null, { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2500)
      return page.evaluate(() => window.error || { ...window.most, state: window.scene.sound.state })
    }
    got = await music('')
    say(!got.error && got.loudness > 0.5 && got.bass > 0.3 && got.mids > 0.3 && got.pulses >= 2, name, 'a song that is playing moves the music\'s numbers with nothing said: the bass, the middle, how loud, and a pulse on its beats', got)
    got = await music('listenTo(soundOutput())')
    say(!got.error && got.loudness > 0.5 && got.bass > 0.3 && got.pulses >= 2, name, 'and the same through listenTo(soundOutput())', got)
    // One channel of the song: the first that is heard in its first seconds.
    got = await music(`window.picked = -1
const pick = setInterval(() => { for (let n = 0; n < 8; n++) { let l = 0; try { l = song.channel(n).level() } catch (e) { continue }; if ((Array.isArray(l) ? Math.max(...l) : l) > 0.02) { window.picked = n; listenTo(song.channel(n)); clearInterval(pick); return } } }, 50)`)
    got.picked = await page.evaluate(() => window.picked)
    say(!got.error && got.picked >= 0 && got.loudness > 0.5, name, 'and through one channel of the song, listenTo(song.channel(n))', got)
  } else console.log(`     ${name}: no song beside this repository (${SONG}), so the song as music is not tested`)

  // Every program on the Effects page of the docs is run as it is written.
  const programs = [...(await readFile(join(ROOT, 'docs', 'effects.md'), 'utf8')).matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1])
  const broken = []
  // (A page that has played a song is left behind first: now and then Chromium reloads it under the next scene.)
  await page.goto(`${at}/test.html`)
  for (const program of programs) {
    got = await play(page, program, { until: 'window.scene && document.querySelector("#s canvas[data-effects-layer]")?.style.display === "block"', wait: 6000 })
    const shown = await page.evaluate(() => document.querySelector('#s canvas[data-effects-layer]')?.style.display)
    if (got.error || shown !== 'block') broken.push({ program: program.slice(0, 60), got, shown })
  }
  say(programs.length >= 9 && broken.length === 0, name, `the ${programs.length} programs on the Effects page of the docs each run and show their effects`, broken)

  say(errors.length === 0, name, 'no case left an error on its page', errors)
  await browser.close()
}
{
  let said = ''
  try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'effects-docs.mjs'), '--check'], { encoding: 'utf8' }) } catch (e) { said = (e.stdout || e.message).trim() }
  say(said === '', 'node', 'docs/effects-reference.md and its pictures are what the table of effects in visualfx/visualfx.js gives', said)
}
server.close()
console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
