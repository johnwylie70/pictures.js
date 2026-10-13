#!/usr/bin/env node
/**
 * A scene recorded a frame at a time (`runScene(…, { stepped: { fps } })`), in real browsers: a page's clock is
 * moved one frame at a time as a video recorder moves it, and the scene's sound is made on that clock, by a
 * player with no sound card, so it is in step with the pictures to the sample.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-stepped.mjs
 *
 * The scene is a clapperboard: on every thirtieth frame its picture is white and a short note begins. The
 * frames are read from the canvas and the sound from the player's samples, and the two are compared.
 *
 * It needs the copy of synths.js in sound/ to have a stepped player; with an older copy the cases are said to be
 * skipped. SYNTHS=/path/to/synths.js serves that folder as sound/ instead (a copy not yet brought in here).
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOUND = process.env.SYNTHS ? resolve(process.env.SYNTHS) : join(ROOT, 'sound')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

let failed = 0
const say = (ok, engine, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${engine}: ${what}${ok ? '' : `: ${JSON.stringify(got)}`}`)
}
if (!(await readFile(join(SOUND, 'synths.js'), 'utf8')).includes('createSteppedPlayer')) {
  console.log(`skipped: the synths.js in ${SOUND} has no stepped player yet (bring it in with scripts/sync-siblings.mjs, or name another with SYNTHS=)`)
  process.exit(0)
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' }
const PAGE = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><div id="s" style="width:320px;height:180px"></div>'
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  try {
    if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE)
    const body = await readFile(path.startsWith('/sound/') ? join(SOUND, path.slice(7)) : join(ROOT, path))
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
  } catch (e) { res.writeHead(404).end('not found') }
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// The clapperboard. It also writes down what the sound's own clocks said in each frame.
const CLAP = `const beep = makeSynth({ wave: "sine", filter: "off", attack: 0, decay: 0, sustain: 1, release: 0, volume: 1 })
setTempo(120)
let n = 0
window.seen = []
function update(dt) { window.seen.push([dt, soundTime(), beat()]) }
function draw() {
  background(n % 30 === 0 ? "white" : "black")
  if (n % 30 === 0) beep.play("A5", { length: 0.01 })
  n++
}
`
// In the page: a clock a recorder moves, the scene stepped `frames` frames at `fps`, and what was drawn and heard.
const record = async ({ source, fps, frames, stepped }) => {
  let clock = 0, waiting = []
  const real = { raf: window.requestAnimationFrame, now: performance.now }
  window.requestAnimationFrame = (fn) => { waiting.push(fn); return waiting.length }
  window.cancelAnimationFrame = () => {}
  performance.now = () => clock
  const { runScene } = await import('/pictures.js')
  const errors = []
  const scene = runScene(document.getElementById('s'), { source, name: 'clap.js', stepped: stepped ? { fps } : undefined, onError: (m) => errors.push(m) })
  await scene.ready
  const player = scene.sound
  if (!stepped) { const kind = player && player.kind, has = !!(player && player.stepped); scene.stop(); window.requestAnimationFrame = real.raf; performance.now = real.now; return { kind, has, errors } }
  const white = [], parts = []
  const g = scene.canvas.getContext('2d')
  for (let f = 0; f < frames; f++) {
    clock = f * 1000 / fps
    await player.stepped.advance(clock / 1000)
    parts.push(player.stepped.take())
    for (const fn of waiting.splice(0)) fn(clock)
    if (g.getImageData(5, 5, 1, 1).data[0] > 128) white.push(f)
    await new Promise((done) => setTimeout(done, 0))
  }
  await player.stepped.advance(frames / fps)
  parts.push(player.stepped.take())
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const left = new Float32Array(total)
  let at = 0
  for (const p of parts) { left.set(p.left, at); at += p.length }
  // Where each note begins: the first sample that is not silence after a stretch that was.
  const starts = []
  let quiet = 300
  for (let i = 0; i < total; i++) { if (Math.abs(left[i]) > 1e-4) { if (quiet >= 300) starts.push(i); quiet = 0 } else quiet++ }
  const out = { kind: player.kind, state: player.state, context: player.context, white, starts, total, each: parts.slice(1).map((p) => p.length), seen: window.seen.slice(0, frames), errors, rate: player.stepped.sampleRate }
  scene.stop()
  out.closed = player.state
  window.requestAnimationFrame = real.raf
  performance.now = real.now
  return out
}

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch { console.log(`${name}: not installed, skipped`); continue }
  const context = await browser.newContext({ viewport: { width: 400, height: 300 } })
  for (const fps of [60, 30]) {
    const page = await context.newPage()
    await page.goto(`${at}/test.html`)
    const frames = fps * 3
    const r = await page.evaluate(record, { source: CLAP, fps, frames, stepped: true })
    const want = r.white.map((f) => Math.round(f * 48000 / fps))
    say(r.kind === 'stepped' && r.context === null && r.state === 'on' && !r.errors.length, name, `at ${fps} frames a second a stepped scene's sound is a player with no sound card, on before any tap`, [r.kind, r.state, r.errors])
    say(r.white.length === frames / 30 && r.white.every((f, i) => f === i * 30) && JSON.stringify(r.starts) === JSON.stringify(want), name, `the picture is white on frames ${r.white.join(', ')} and a note begins on the first sample of each (${want.join(', ')}): not one sample apart`, { white: r.white, starts: r.starts, want })
    say(r.total === Math.round(frames * 48000 / fps) && r.each.every((n) => n === 48000 / fps) && r.rate === 48000, name, `${frames} frames are ${Math.round(frames * 48000 / fps)} samples, ${48000 / fps} for every frame`, [r.total, r.each.slice(0, 3)])
    const clocks = r.seen.every(([dt, time, beat], f) => Math.abs(dt - 1 / fps) < 1e-9 && Math.abs(time - f / fps) < 1e-9 && Math.abs(beat - f / fps * 2) < 1e-6)
    say(clocks && r.seen.length === frames, name, 'in every frame dt is 1/fps and soundTime() and beat() read the frame\'s own time, the first frame included', r.seen.slice(0, 3))
    say(r.closed === 'closed', name, 'stopping the scene closes its player', r.closed)
    await page.close()
  }
  const page = await context.newPage()
  await page.goto(`${at}/test.html`)
  const plain = await page.evaluate(record, { source: CLAP, fps: 60, frames: 0, stepped: false })
  say(plain.kind !== 'stepped' && !plain.has, name, 'a scene that is not stepped has the page\'s ordinary player, as before', plain)
  await browser.close()
}
server.close()
process.exit(failed ? 1 : 0)
