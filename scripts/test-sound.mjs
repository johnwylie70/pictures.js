#!/usr/bin/env node
/**
 * Sound and on-screen controls, in real browsers: that a scene which uses neither loads nothing for them,
 * that a scene which plays is heard, that a dial dragged with the mouse changes its synth, that sound stops
 * and pauses with the scene, that a host can take the commands instead, and that `pictures build` makes a
 * folder that plays from a static server.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-sound.mjs
 *
 * LISTENING. Every page notes each node that is connected to the sound card (`heard`), and the test puts an
 * analyser on it: `loudest()` is the largest sample seen over some time. The browsers are started as a person
 * finds them, with sound kept off until a tap, so that the tap is tested too.
 *
 * THE AUDIO WORKLET. Playwright holds Chromium's worklets back, and `letWorkletsRun` lets them go. Each browser is
 * still asked first with a one-line worklet. Where one will not load, the cases that listen are run with the engine on the page's thread (`sound: { fallback:
 * 'always' }`, the same engine and the same commands), the case that needs the worklet itself is said to be skipped,
 * and so is the listening half of the built folder's, which has no options to pass.
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)

let failed = 0
const say = (ok, engine, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${engine}: ${what}${ok ? '' : `: ${JSON.stringify(got)}`}`)
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// The scenes the task is about, as a person would write them.
const PANEL = 'const lead = makeSynth("lead")\ndial("cutoff", lead, "cutoff")\nscope(lead)\nkeyboard(lead, { octave: 4 })\nfunction draw() { background("midnightblue") }\n'
const LASER = 'function onMouseDown() { playSound("laser") }\n'
// How many things a scene with neither is handed: the 48 names it always had and the function that sets its size.
const HANDED = 49

// --- with no browser: what a scene's text asks for
const USES = [
  ['ordinary words are not controls or sound', 'const row = 3\nlet label = "score"\nfor (let beat = 0; beat < 4; beat++) { text(label, 10, row * beat) }\n', '--'],
  ['a function the scene writes itself is its own', 'function label(words) { text(words, 10, 10) }\nfunction beat() { return 1 }\nlabel("x")\nbeat()\n', '--'],
  ['a method being written, and a method being called, are not calls of a control', 'class Grid { row(i) { return i } }\nconst grid = new Grid()\ngrid.row(1)\nthing.dial(3)\nconst menu = { select(i) { return i }, over() {} }\n', '--'],
  ['a name in a comment or in a string does not count', '// playSound("coin") would be nice\nconst words = "dial(1) and makeSynth()"\n/* keyboard(lead) */\n', '--'],
  ['names taken from a file with use() are the scene\'s own', 'const { dial, playSound } = await use("mine.js")\ndial(1)\nplaySound("a")\n', '--'],
  ['a sound', 'function onMouseDown() { playSound("laser") }\n', 'S-'],
  ['a sound in the Python spelling', 'play_sound("coin")\n', 'S-'],
  ['a sound function handed on, not called', 'const play = playNote\n', 'S-'],
  ['note, chord and rest as words of the scene\'s own', 'const chord = [1, 2]\nlet rest = 3\nfor (const note of chord) circle(note, rest, 5)\nchord.map((note) => note + rest)\n', '--'],
  ['a tune written a line at a time', 'note("E4", "quarter")\nrest()\n', 'S-'],
  ['beat() called', 'function draw() { circle(100, 100, 20 + 10 * (beat() % 1), "gold") }\n', 'S-'],
  ['the new controls\' names as ordinary words', 'let number = 3, light = "on", progress = 0.5, busy = false, radio = [1], wheel = 2, pads = [], steps = 8\nconst fader = { level: 1 }, envelope = [0, 1], readout = "", stepper = 0, checkbox = true, dropdown = null, joystick = { x: 0 }, dpad = "up"\nfunction draw() { if (busy) return\n  text(number + light + radio.length + wheel + pads.length + steps, 10, 10 + progress) }\n', '--'],
  ['and as what a function of the scene\'s is handed, then called', 'function load(progress) { progress(0.5) }\nconst each = (light, number = 1) => light(number)\nconst pick = choose => choose(2)\nfunction onKeyDown(key) { load((wheel) => wheel) }\n', '--'],
  ['and as properties, methods and words in a loop', 'const car = { wheel: 4, light() { return 1 }, steps(n) { return n } }\ncar.light()\ncar.steps(3)\nfor (const number of [1, 2]) circle(number, car.wheel, 5)\nfor (let steps = 0; steps < 3; steps++) { }\nif (car.wheel) { car.light() }\n', '--'],
  ['a new control, called', 'const lives = number("lives", 0, 9, 3)\n', '-C'],
  ['a light, a bar and a stick, called', 'const on = light("ready")\nprogress("loading", 0.4)\nconst stick = joystick()\n', '-C'],
  ['a control inside an if is still a control', 'if (true) { busy("thinking") }\n', '-C'],
  ['a dial', 'const speed = dial("speed", 0, 10)\n', '-C'],
  ['over() asked in an if', 'function onMouseDown(x, y) {\n  if (over(x, y)) {\n    return\n  }\n}\n', '-C'],
  ['the synth panel', PANEL, 'SC'],
]
for (const [what, source, want] of USES) {
  const uses = sceneUses(source)
  const got = (uses.sound ? 'S' : '-') + (uses.dials ? 'C' : '-')
  say(got === want, 'node', `what a scene uses: ${what}`, got)
}
{
  // The examples: those written before there were controls or sound use neither still, whatever names the libraries gain.
  const WITH = { 'arpeggio.js': 'S-', 'star_catcher.js': 'S-', 'bat_and_ball.js': 'S-', 'brick_breaker.js': 'S-', 'snake.js': 'S-', 'space_rocks.js': 'S-', 'tune.js': 'S-', 'midi_lights.js': 'S-', 'midi_keyboard.js': 'SC', 'sampler.js': 'SC', 'synth_panel.js': 'SC', 'voice_changer.js': 'SC' }
  const files = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js'))
  const wrong = []
  for (const f of files) {
    const uses = sceneUses(await readFile(join(ROOT, 'examples', f), 'utf8'))
    const got = (uses.sound ? 'S' : '-') + (uses.dials ? 'C' : '-')
    if (got !== (WITH[f] || '--')) wrong.push(`${f}: ${got}`)
  }
  say(!wrong.length && files.length - Object.keys(WITH).length >= 24, 'node', `what a scene uses: the ${files.length - Object.keys(WITH).length} examples with no sound and no controls load neither library, and the ${Object.keys(WITH).length} with them load theirs`, wrong)
}
{
  // The start-up cost for a scene that uses neither: reading its text once. The longest example, a hundred times.
  const files = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js'))
  const texts = await Promise.all(files.map((f) => readFile(join(ROOT, 'examples', f), 'utf8')))
  const longest = texts.reduce((a, b) => (a.length > b.length ? a : b))
  for (let i = 0; i < 20; i++) sceneUses(longest)
  const t0 = performance.now()
  for (let i = 0; i < 100; i++) sceneUses(longest)
  const each = (performance.now() - t0) / 100
  say(each < 2, 'node', `asking what the longest example uses (${longest.length} characters) takes ${each.toFixed(3)} ms, once, before it runs`, each)
}

// --- pictures build, into a folder of its own
const work = await mkdtemp(join(tmpdir(), 'pictures-sound-'))
const build = async (name, source) => {
  await writeFile(join(work, `${name}.js`), source)
  // Each scene from a folder of its own: build copies the scene's whole folder.
  const src = join(work, `${name}-src`), out = join(work, `${name}-site`)
  execFileSync('mkdir', ['-p', src])
  await writeFile(join(src, `${name}.js`), source)
  execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(src, `${name}.js`), '-o', out])
  return out
}
const builtPanel = await build('panel', PANEL)
const builtPlain = await build('plain', 'function draw() { background("navy")\n  circle(100, 100, 40, "gold") }\n')
{
  const need = ['index.html', 'panel.js', 'pictures/pictures.js', 'pictures/sound/synths.js', 'pictures/sound/synths_core.wasm', 'pictures/sound/synths-worklet.js', 'pictures/sound/LICENSE', 'pictures/dials/dials.js', 'pictures/dials/LICENSE']
  const missing = need.filter((f) => !existsSync(join(builtPanel, f)))
  say(!missing.length, 'node', 'pictures build copies sound/ and dials/ for a scene that uses them', missing)
  const extra = ['pictures/sound', 'pictures/dials', 'pictures/three', 'pictures/sqlite'].filter((f) => existsSync(join(builtPlain, f)))
  say(!extra.length, 'node', 'pictures build copies neither for a scene that uses neither', extra)
  const also = ['pictures/three', 'pictures/sqlite'].filter((f) => existsSync(join(builtPanel, f)))
  say(!also.length, 'node', 'and a sound scene\'s folder has no three.js or SQLite in it', also)
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.wav': 'audio/wav' }
// The library's own folder, and under /built/ the folders `pictures build` made: plain files, as any static host serves them.
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0"><div id="s" style="width:600px;height:400px"></div>')
  const file = path.startsWith('/built/') ? join(work, path.slice(7) || 'index.html') : join(ROOT, path)
  let body
  try { body = await readFile(path.endsWith('/') ? join(file, 'index.html') : file) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'text/html' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// On every page, before anything else: note what is connected to the sound card, and every sound card opened.
const LISTEN = () => {
  window.heard = []
  window.cards = []
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Real = window[name]
    if (!Real) continue
    window[name] = class extends Real { constructor(...a) { super(...a); window.cards.push(this) } }
  }
  const connect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (to, ...rest) {
    if (to instanceof AudioDestinationNode) window.heard.push(this)
    return connect.call(this, to, ...rest)
  }
  // The largest sample that reaches the sound card over `ms`.
  window.loudest = async (ms = 700) => {
    const ears = window.heard.map((node) => { const a = node.context.createAnalyser(); a.fftSize = 2048; node.connect(a); return a })
    const data = new Float32Array(2048)
    let peak = 0
    const until = performance.now() + ms
    while (performance.now() < until) {
      for (const a of ears) { a.getFloatTimeDomainData(data); for (const v of data) peak = Math.max(peak, Math.abs(v)) }
      await new Promise((done) => setTimeout(done, 15))
    }
    return peak
  }
  window.settle = (ms) => new Promise((done) => setTimeout(done, ms))
}
// Start a scene on test.html and leave it running as `scene`; its errors go to `errors`. `options` is JavaScript, read on the page.
let PLAYER = '({})'
const begin = async (page, source, options = PLAYER) => {
  await page.goto(`${at}/test.html`)
  await page.evaluate(async ({ source, options }) => {
    const { runScene } = await import('/pictures.js')
    window.errors = []
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', onError: (message, line) => window.errors.push({ message, line }), ...(0, eval)(options) })
    const box = document.getElementById('s')
    for (let i = 0; i < 200 && !/running|finished|error/.test(box.dataset.picturesStatus); i++) await new Promise((done) => setTimeout(done, 20))
  }, { source, options })
}
// Wait for something on the page to be true (JavaScript, read there), for at most `ms`.
const until = (page, test, ms = 4000) => page.waitForFunction(test, null, { timeout: ms }).then(() => true, () => false)
// The paths a page asked the server for, most useful as "did it ask for sound/ or dials/".
const asked = (page) => {
  const list = []
  page.on('request', (r) => { if (r.url().startsWith(at)) list.push(new URL(r.url()).pathname) })
  return list
}
const SIBLING = /\/(?:sound|dials)\//
// A control of the panel on the page: its middle, in the page's points.
const middle = (page, kind) => page.evaluate((kind) => {
  const canvas = window.scene.canvas, panel = canvas[Symbol.for('dials.panel')]
  const item = panel.items.find((it) => it.kind === kind)
  const box = canvas.getBoundingClientRect()
  return [box.left + item.x + item.w / 2, box.top + item.y + item.h / 2]
}, kind)

// THE AUDIO WORKLET UNDER PLAYWRIGHT. Playwright starts every Chromium target waiting for a debugger and lets pages
// and workers go, but not worklets, so an audio worklet's module never loads (the same browser started by hand loads
// it). A second session on the page lets worklets run, in the page and in frames inside it. (From synths.js's tests.)
async function letWorkletsRun(page) {
  const cdp = await page.context().newCDPSession(page)
  let id = 0
  // `path` is the chain of sessions from the page down to a frame inside it.
  const send = (path, method, params = {}) => {
    let message = { method, params }
    for (let i = path.length - 1; i >= 0; i--) message = { method: 'Target.sendMessageToTarget', params: { sessionId: path[i], message: JSON.stringify({ id: ++id, ...message }) } }
    return cdp.send(message.method, message.params).catch(() => {})
  }
  const seen = (path, method, params) => {
    if (method === 'Target.attachedToTarget') {
      const child = [...path, params.sessionId]
      if (params.targetInfo.type === 'worklet') send(child, 'Runtime.runIfWaitingForDebugger')
      else send(child, 'Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: false })
    } else if (method === 'Target.receivedMessageFromTarget') {
      const inner = JSON.parse(params.message)
      if (inner.method) seen([...path, params.sessionId], inner.method, inner.params)
    }
  }
  cdp.on('Target.attachedToTarget', (params) => seen([], 'Target.attachedToTarget', params))
  cdp.on('Target.receivedMessageFromTarget', (params) => seen([], 'Target.receivedMessageFromTarget', params))
  await send([], 'Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: false })
}

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch { console.log(`${name}: not installed, skipped`); continue }
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } })
  await context.addInitScript(LISTEN)
  let page = await context.newPage()
  if (name === 'chromium') await letWorkletsRun(page)
  let got
  // Will this browser load an audio worklet at all? (See THE AUDIO WORKLET.)
  await page.goto(`${at}/test.html`)
  const worklet = await page.evaluate(async () => {
    const context = new OfflineAudioContext(1, 128, 48000)
    const url = URL.createObjectURL(new Blob(['registerProcessor("probe", class extends AudioWorkletProcessor { process() { return true } })'], { type: 'text/javascript' }))
    return Promise.race([context.audioWorklet.addModule(url).then(() => true, () => false), new Promise((done) => setTimeout(() => done(false), 3000))])
  })
  if (!worklet) console.log(`     ${name}: no audio worklet loads in this browser as it is run here, so the engine is run on the page's thread for the cases that listen`)
  PLAYER = worklet ? '({})' : '({ sound: { fallback: "always" } })'
  const KIND = worklet ? 'worklet' : 'fallback'

  // --- a scene that uses no sound and no controls loads exactly what it did
  let requests = asked(page)
  await begin(page, 'function draw() {\n  background("navy")\n  circle(100, 100, 40, "gold")\n}\nwindow.handed = arguments.length\n')
  await page.evaluate(() => window.settle(300))
  got = { requests: [...requests], handed: await page.evaluate(() => window.handed), cards: await page.evaluate(() => window.cards.length), layers: await page.evaluate(() => document.querySelectorAll('#s canvas').length) }
  say(same(got, { requests: ['/test.html', '/pictures.js'], handed: HANDED, cards: 0, layers: 1 }), name, 'a plain scene asks for pictures.js and nothing else, is handed the names it always was, opens no sound card and has one canvas', got)
  await begin(page, 'const row = 3\nfunction label(words) { text(words, 10, 20, "white") }\nclass Grid { select(i) { return i } }\n// playSound("coin")\nfunction draw() {\n  background("navy")\n  label("beat " + new Grid().select(row))\n}\nwindow.handed = arguments.length\n')
  got = { requests: requests.filter((r) => SIBLING.test(r)), handed: await page.evaluate(() => window.handed), errors: await page.evaluate(() => window.errors) }
  say(same(got, { requests: [], handed: HANDED, errors: [] }), name, 'a scene with words of its own that are also names of controls loads nothing for them', got)
  // Every example that was here before sound: none asks for either folder.
  const examples = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()
  const strays = []
  const quiet = []
  for (const file of examples) {
    const uses = sceneUses(await readFile(join(ROOT, 'examples', file), 'utf8'))
    if (uses.sound || uses.dials) continue
    quiet.push(file)
    requests.length = 0
    await page.goto(`${at}/test.html`)
    await page.evaluate(async (src) => {
      const { runScene } = await import('/pictures.js')
      const box = document.getElementById('s')
      runScene(box, { src })
      for (let i = 0; i < 150 && !/running|finished|error/.test(box.dataset.picturesStatus); i++) await new Promise((done) => setTimeout(done, 20))
      await window.settle(150)
    }, `examples/${file}`)
    if (requests.some((r) => SIBLING.test(r)) || await page.evaluate(() => window.cards.length)) strays.push(file)
  }
  say(!strays.length, name, `none of the ${quiet.length} examples without sound or controls asks for sound/ or dials/, or opens a sound card`, strays)

  // --- a three-line game sound: silent until a tap on the canvas, heard after it, and the scene's own handler is called
  requests.length = 0
  await begin(page, LASER + 'window.downs = 0\ncanvas.addEventListener("pointerdown", () => { window.downs++ })\n')
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  got = await page.evaluate(() => ({ state: scene.sound.state, kind: scene.sound.kind, card: cards[0]?.state, errors }))
  // (A browser that lets a page play without a tap is already on: Playwright's WebKit does.)
  say(!got.errors.length && got.kind === KIND && (got.state === 'waiting' || got.state === 'on'), name, `a sound scene loads the engine ${worklet ? 'into an audio worklet' : '(on the page\'s thread here)'} before the first tap`, got)
  const before = got.state
  got = { asked: requests.filter((r) => SIBLING.test(r)) }
  say(same(got.asked, ['/sound/synths.js', '/sound/synths_core.wasm']), name, 'it asks for the sound library and the engine, and no controls', got)
  const listening = page.evaluate(() => window.loudest(900))
  await page.mouse.click(300, 200)
  got = { peak: await listening, state: await page.evaluate(() => scene.sound.state), downs: await page.evaluate(() => window.downs), before, errors: await page.evaluate(() => errors) }
  say(got.peak > 0.02 && got.state === 'on' && got.downs === 1 && !got.errors.length, name, 'a click on the canvas turns the sound on, the laser is heard, and the scene\'s own listener heard the click', got)

  // --- sound stops with the scene, and pauses out of view
  await begin(page, 'playNotes("C4 E4 G4 C5", 0.1, { repeat: true })\nfunction draw() { background("black") }\n')
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(300, 200)
  await until(page, 'scene.sound.state === "on"')
  got = { playing: await page.evaluate(() => window.loudest(500)) }
  // Out of view: the box is pushed far below the window.
  await page.evaluate(() => { document.getElementById('s').style.marginTop = '5000px' })
  got.suspended = await until(page, 'cards[0].state === "suspended"')
  got.hidden = await page.evaluate(() => window.loudest(400))
  await page.evaluate(() => { document.getElementById('s').style.marginTop = '0' })
  got.resumed = await until(page, 'cards[0].state === "running"')
  got.back = await page.evaluate(() => window.loudest(500))
  say(got.playing > 0.02 && got.suspended && got.hidden < 0.001 && got.resumed && got.back > 0.02, name, 'a tune is heard, is paused while the scene is out of view, and carries on when it is back', got)
  await page.evaluate(() => { window.old = scene.sound; scene.stop() })
  got = { closed: await until(page, 'cards[0].state === "closed"'), state: await page.evaluate(() => old.state), now: await page.evaluate(() => scene.sound), after: await page.evaluate(() => window.loudest(300)) }
  say(got.closed && got.state === 'closed' && got.now === null && got.after < 0.001, name, 'stopping the scene stops the sound and lets go of the sound card', got)
  await begin(page, 'playNotes("C4 E4 G4 C5", 0.1, { repeat: true })\n')
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.evaluate(() => { window.old = scene.sound; scene.restart('function draw() { background("black") }\n') })
  got = { closed: await until(page, 'cards[0].state === "closed"'), state: await page.evaluate(() => old.state), cards: await page.evaluate(() => cards.length), now: await page.evaluate(() => scene.sound) }
  say(got.closed && got.state === 'closed' && got.cards === 1 && got.now === null, name, 'a scene that is replaced by one with no sound takes its sound with it, and the new one opens no sound card', got)

  // --- two scenes on one page share one sound card, and each stops alone
  await begin(page, 'playNotes("C4 E4 G4 C5", 0.1, { repeat: true })\n')
  await page.evaluate(async (options) => {
    const { runScene } = await import('/pictures.js')
    const box = document.body.appendChild(Object.assign(document.createElement('div'), { style: 'width:300px;height:100px' }))
    window.second = runScene(box, { source: 'makeSynth("bass").playNotes("C2 G2", 0.1, { repeat: true })\n', ...(0, eval)(options) })
  }, PLAYER)
  await until(page, 'scene.sound && scene.sound.state !== "loading" && second.sound')
  await page.mouse.click(300, 200)
  await until(page, 'scene.sound.state === "on"')
  got = { cards: await page.evaluate(() => cards.length), one: await page.evaluate(() => scene.sound === second.sound), both: await page.evaluate(() => window.loudest(400)) }
  await page.evaluate(() => scene.stop())
  got.left = await page.evaluate(() => window.loudest(400))
  got.card = await page.evaluate(() => cards[0].state)
  await page.evaluate(() => second.stop())
  got.closed = await until(page, 'cards[0].state === "closed"')
  say(got.cards === 1 && got.one && got.both > 0.02 && got.left > 0.02 && got.card === 'running' && got.closed, name, 'two scenes on a page share one sound card: one stops and the other plays on, and the card is let go with the last', got)

  // --- the synth panel: its controls are built, a drag on the dial changes the synth, and a key of the keyboard is heard
  requests.length = 0
  await begin(page, PANEL + 'window.lead = lead\nwindow.downs = 0\nfunction onMouseDown() { window.downs++ }\n')
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.evaluate(() => window.settle(200))
  got = await page.evaluate(() => {
    const panel = scene.canvas[Symbol.for('dials.panel')]
    return { errors, kinds: panel ? panel.items.map((it) => it.kind) : null, layers: document.querySelectorAll('#s canvas').length, cutoff: lead.cutoff }
  })
  const start = got.cutoff
  got.asked = requests.filter((r) => SIBLING.test(r)).sort()
  say(!got.errors.length && same(got.kinds, ['dial', 'scope', 'keyboard']) && got.layers === 2 && same(got.asked, ['/dials/dials.js', '/sound/synths.js', '/sound/synths_core.wasm']), name, 'the synth panel builds a dial, a scope and a keyboard on a canvas of their own', got)
  if (got.kinds) {
    const [x, y] = await middle(page, 'dial')
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 60, { steps: 4 }); await page.mouse.up()
    got = await page.evaluate(() => ({ cutoff: lead.cutoff, downs: window.downs, errors }))
    say(!got.errors.length && typeof got.cutoff === 'number' && got.cutoff < start && got.downs === 0, name, `dragging the dial down turns the synth's cutoff down from ${start}, and the scene is not told of a press on a control`, got)
    // A key of the keyboard, held: the synth is heard.
    const [kx, ky] = await middle(page, 'keyboard')
    const hearing = page.evaluate(() => window.loudest(700))
    await page.mouse.move(kx, ky + 20); await page.mouse.down()
    got = { peak: await hearing }
    await page.mouse.up()
    got.errors = await page.evaluate(() => errors)
    // (Quieter than the others: the dial has just closed the filter. Silence is 0.)
    say(got.peak > 0.004 && !got.errors.length, name, 'a key of the on-screen keyboard plays the synth', got)
    // A press away from every control is the scene's.
    await page.mouse.click(8, 300)
    got = await page.evaluate(() => window.downs)
    say(got === 1, name, 'a press beside the controls is the scene\'s own', got)
    await page.evaluate(() => scene.stop())
    got = await page.evaluate(() => ({ layers: document.querySelectorAll('#s canvas').length, panel: !!scene.canvas[Symbol.for('dials.panel')] }))
    say(same(got, { layers: 1, panel: false }), name, 'the controls go when the scene stops', got)
  }

  // --- the examples that play: each is clicked, and heard
  for (const file of ['tune.js', 'arpeggio.js', 'synth_panel.js']) {
    await begin(page, await readFile(join(ROOT, 'examples', file), 'utf8'))
    await until(page, 'scene.sound && scene.sound.state !== "loading"')
    await page.evaluate(() => window.settle(200))
    const hearing = page.evaluate(() => window.loudest(900))
    if (file === 'synth_panel.js') { const [x, y] = await middle(page, 'keyboard'); await page.mouse.move(x, y + 20); await page.mouse.down() } else await page.mouse.click(300, 100)
    got = { peak: await hearing, errors: await page.evaluate(() => errors) }
    await page.mouse.up()
    say(got.peak > 0.02 && !got.errors.length, name, `examples/${file} is heard`, got)
  }

  // --- the Python spellings
  await begin(page, 'const lead = make_synth("lead")\nlead.filter_cutoff = 900\nconst tune = play_notes("C4 E4", 0.1)\nset_volume(0.5)\nset_tempo(90)\nconst speed = dial("speed", 0, 10, 4, { on_change: () => {} })\nwindow.result = [lead.cutoff, typeof tune.stop, note_number("A4"), sound_names().includes("laser"), speed.value, typeof play_sound, typeof load_sample, typeof stop_sound, beats(3)]\n')
  got = await page.evaluate(() => ({ result: window.result, errors }))
  say(same(got, { result: [900, 'function', 69, true, 4, 'function', 'function', 'function', 2], errors: [] }), name, 'the Python spellings work: make_synth, play_notes, set_volume, a setting as filter_cutoff, on_change', got)

  // --- mistakes, in plain words with the line. (Safari's engine does not say which of the scene's lines called the library.)
  const MISTAKES = [
    ['a sound that does not exist', 'background("navy")\n\nplaySound("lazer")\n', 3, /there is no sound called "lazer"\. Did you mean "laser"\?/],
    ['a synth that does not exist', 'const a = 1\nconst lead = makeSynth("leed")\n', 2, /there is no synth called "leed"\. Did you mean "lead"\?/],
    ['a setting that does not exist', 'const lead = makeSynth("lead")\nfunction update(dt) {\n  lead.cutof = 800\n}\n', 3, /no setting called "cutof"\. Did you mean "cutoff"\?/],
    ['a setting that does not exist, when a synth is made', 'const lead = makeSynth({ wave: "saw", atack: 0.1 })\n', 1, /no setting called "atack"\. Did you mean "attack"\?/],
    ['a note that is not a note', 'function setup() {\n  playNote("H4")\n}\n', 2, /"H4" is not a note/],
    ['a control that is asked for a setting its synth does not have', 'const lead = makeSynth("lead")\n\n\ndial("brightness", lead, "brightnes")\n', 4, /brightnes/],
  ]
  for (const [what, source, line, says] of MISTAKES) {
    await begin(page, source)
    await until(page, 'errors.length > 0', 1500)
    got = await page.evaluate(() => errors[0] || null)
    say(!!got && says.test(got.message) && (got.line === line || (name === 'webkit' && got.line === 0)), name, `a mistake is said in plain words with its line: ${what}`, got)
  }

  // --- a host that takes the commands: it is sent the batches, and the page plays nothing
  page = await context.newPage()
  if (name === 'chromium') await letWorkletsRun(page)
  requests = asked(page)
  const HOST = '(() => { const host = window.host = { batches: [] }; return { sound: { send: (batch) => host.batches.push(batch) } } })()'
  await begin(page, LASER + 'playNotes("C4 E4", 0.2)\nconst lead = makeSynth("lead")\nlead.cutoff = 700\n', HOST)
  await page.mouse.click(300, 200)
  await page.evaluate(() => window.settle(200))
  got = await page.evaluate(() => ({ ops: host.batches.flatMap((b) => b.cmds.map((c) => c.op)), shape: host.batches.every((b) => b.synths === 1 && typeof b.now === 'number' && b.cmds.every((c) => JSON.stringify(c))), laser: host.batches.flatMap((b) => b.cmds).find((c) => c.op === 'sound')?.name, cards: cards.length, heard: heard.length, sound: scene.sound, errors }))
  got.asked = requests.filter((r) => SIBLING.test(r))
  say(same(got.ops, ['master', 'synth', 'tune', 'synth', 'set', 'sound']) && got.shape && got.laser === 'laser' && got.cards === 0 && got.heard === 0 && got.sound === null && !got.errors.length && same(got.asked, ['/sound/synths.js']), name, 'with the sound option the host is sent every batch of commands, and the page opens no sound card and never asks for the engine', got)
  await page.evaluate(() => { document.getElementById('s').style.marginTop = '5000px' })
  const pauses = '(() => host.batches.flatMap((b) => b.cmds).filter((c) => c.op === "master" && "pause" in c).map((c) => c.pause))()'
  await until(page, `${pauses}.length === 2`)
  await page.evaluate(() => { document.getElementById('s').style.marginTop = '0' })
  await until(page, `${pauses}.length === 3`)
  got = { pauses: await page.evaluate(pauses) }
  await page.evaluate(() => { host.batches.length = 0; scene.stop() })
  got.last = await page.evaluate(() => host.batches.flatMap((b) => b.cmds.map((c) => c.op)))
  say(same(got, { pauses: [false, true, false], last: ['stop', 'close'] }), name, 'the host is sent a pause as the scene leaves view and its end as it comes back, and a stop and a close when the scene stops', got)

  // --- a host that passes the engine as bytes: the page plays, and asks for no engine file
  requests.length = 0
  await page.goto(`${at}/test.html`)
  await page.evaluate(async () => { window.engine = new Uint8Array(await (await fetch('/sound/synths_core.wasm')).arrayBuffer()) })
  requests.length = 0
  await page.evaluate(async (source) => {
    const { runScene } = await import('/pictures.js')
    window.errors = []
    window.scene = runScene(document.getElementById('s'), { source: source[0], sound: { wasm: window.engine, worklet: 'blob', ...(source[1] ? null : { fallback: 'always' }) }, onError: (message, line) => window.errors.push({ message, line }) })
  }, [LASER, worklet])
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  const hearing = page.evaluate(() => window.loudest(900))
  await page.mouse.click(300, 200)
  got = { peak: await hearing, asked: requests.filter((r) => SIBLING.test(r)), worklet: await page.evaluate(() => scene.sound.worklet), errors: await page.evaluate(() => errors) }
  say(got.peak > 0.02 && same(got.asked, ['/sound/synths.js']) && got.worklet === (worklet ? 'blob' : undefined) && !got.errors.length, name, 'given the engine as bytes, the page plays and asks for nothing but the library', got)
  await page.close()

  // --- what pictures build made, from a static server
  page = await context.newPage()
  if (name === 'chromium') await letWorkletsRun(page)
  requests = asked(page)
  const problems = []
  page.on('pageerror', (e) => problems.push(String(e)))
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${new URL(r.url()).pathname}`) })
  await page.goto(`${at}/built/panel-site/`)
  await until(page, `document.getElementById("scene").dataset.picturesStatus === "running" && ${worklet ? 'heard.length > 0' : 'true'}`)
  await page.evaluate(() => window.settle(300))
  const keys = await page.evaluate(() => {
    const canvas = document.querySelector('#scene canvas'), panel = canvas[Symbol.for('dials.panel')]
    const item = panel?.items.find((it) => it.kind === 'keyboard')
    const box = canvas.getBoundingClientRect()
    return item ? [box.left + item.x + item.w / 2, box.top + item.y + item.h / 2 + 20] : null
  })
  got = { keys: !!keys, problems, status: await page.evaluate(() => document.getElementById('scene').dataset.picturesStatus) }
  if (!worklet) { got.peak = 1; console.log(`     ${name}: the built folder's sound is not listened to here (no audio worklet loads)`) }
  else if (keys) {
    const sounding = page.evaluate(() => window.loudest(700))
    await page.mouse.move(...keys); await page.mouse.down()
    got.peak = await sounding
    await page.mouse.up()
  }
  got.asked = requests.filter((r) => SIBLING.test(r)).map((r) => r.replace('/built/panel-site', '')).sort()
  say(got.keys && got.peak > 0.02 && !problems.length && got.status === 'running' && same(got.asked, ['/pictures/dials/dials.js', '/pictures/sound/synths.js', '/pictures/sound/synths_core.wasm']), name, 'the folder pictures build made runs from a static server: the panel is there and a key is heard', got)
  requests.length = 0
  await page.goto(`${at}/built/plain-site/`)
  await until(page, 'document.getElementById("scene").dataset.picturesStatus === "running"')
  got = { asked: [...requests].map((r) => r.replace('/built/plain-site', '')), problems }
  say(same(got.asked, ['/', '/pictures/pictures.js', '/plain.js']) && !problems.length, name, 'and the folder built for a plain scene asks for the page, pictures.js and the scene', got)
  await page.close()

  await browser.close()
}
server.close()
await rm(work, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
