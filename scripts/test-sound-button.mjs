#!/usr/bin/env node
/**
 * The sound button (`soundButton()`) and the card a demo asks with (`askAboutSound()`), in real browsers: that a scene without them
 * is as it was, that the button is where it was asked for at a size a finger can hit and keeps off the on-screen
 * controls, that a tap on it silences the scene and is not a tap on the scene, that the choice is kept, that M
 * does the same, that the card holds the sound and the game until it is answered and each answer does what it
 * says, and that a host is told, so it does not ask for a tap as well.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-sound-button.mjs [--shots folder] [--batches file]
 *
 * `--shots` also saves pictures of the button and the card on a dark game, a light scene and a panel of controls,
 * at a phone's, a tablet's and a desktop's size, to be looked at.
 *
 * Listening and the audio worklet are as in test-sound.mjs. Chromium, and WebKit when Playwright has it. It ends
 * with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const shotsAt = process.argv.indexOf('--shots')
const SHOTS = shotsAt > 0 ? resolve(process.argv[shotsAt + 1]) : ''
if (SHOTS) await mkdir(SHOTS, { recursive: true })
const batchesAt = process.argv.indexOf('--batches')
const BATCHES = batchesAt > 0 ? resolve(process.argv[batchesAt + 1]) : ''

let failed = 0
const say = (ok, engine, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${engine}: ${what}${ok ? '' : `: ${JSON.stringify(got)}`}`)
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// The scenes, as a person would write them. `frames` counts update(), `draws` draw(), `downs` taps the scene heard.
const COUNT = 'window.frames = 0\nwindow.draws = 0\nwindow.downs = 0\nfunction update() { window.frames++ }\nfunction onMouseDown() { window.downs++ }\n'
const DARK = 'function draw() {\n  window.draws++\n  background("#0b1020")\n  circle(width / 2, height / 2, 40, "gold")\n}\n'
const LIGHT = 'function draw() {\n  window.draws++\n  background("#f4f1e8")\n  circle(width / 2, height / 2, 40, "tomato")\n}\n'
const TUNE = 'playNotes("C4 E4 G4 C5", 0.1, { repeat: true })\n'
const PANEL = 'const lead = makeSynth("lead")\ndial("cutoff", lead, "cutoff")\ndial("resonance", lead, "resonance")\nscope(lead)\nkeyboard(lead, { octave: 4 })\nfunction draw() { background("midnightblue") }\n'
const HANDED = 49

// --- with no browser: which scenes are given the part, and what `pictures build` copies
{
  const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
  const got = ['function draw() { background("navy") }\n', '// soundButton() would be nice\nconst words = "askAboutSound()"\n', 'soundButton()\n', 'ask_about_sound()\n', 'if (soundIsOn()) circle(1, 1, 1)\n'].map((text) => sceneUses(text).manners)
  say(same(got, [false, false, true, true, true]), 'node', 'a scene is given the sound button\'s part only when its code names soundButton, askAboutSound or soundIsOn', got)
  const work = await mkdtemp(join(tmpdir(), 'pictures-manners-'))
  const build = async (name, source) => {
    const src = join(work, `${name}-src`), out = join(work, `${name}-site`)
    await mkdir(src, { recursive: true })
    await writeFile(join(src, `${name}.js`), source)
    execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(src, `${name}.js`), '-o', out], { stdio: 'ignore' })
    return out
  }
  const withIt = await build('button', 'soundButton()\nfunction draw() { background("navy") }\n'), without = await build('plain', 'function draw() { background("navy") }\n')
  const got2 = [existsSync(join(withIt, 'pictures/manners/manners.js')), existsSync(join(withIt, 'pictures/sound')), existsSync(join(without, 'pictures/manners'))]
  say(same(got2, [true, false, false]), 'node', 'pictures build copies manners/ for a scene with a sound button (and no sound/), and not for a scene without', got2)
  await rm(work, { recursive: true, force: true })
  const core = (await readFile(join(ROOT, 'pictures.js'))).length, part = (await readFile(join(ROOT, 'manners', 'manners.js'))).length
  console.log(`     pictures.js is ${core} bytes, and manners/manners.js, fetched only on use, ${part}`)
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0"><div id="s" style="width:600px;height:400px"></div>')
  if (path === '/full.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0"><div id="s" style="width:100vw;height:100vh"></div>')
  if (path === '/framed.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0"><iframe src="/test.html" style="border:0;width:620px;height:420px"></iframe>')
  let body
  try { body = await readFile(join(ROOT, path)) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }).end(body)
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
  window.loudest = async (ms = 600) => {
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
let PLAYER = '({})'
// Start a scene and leave it running as `scene`. `fresh` forgets what the browser kept for it first.
const begin = async (page, source, { options = PLAYER, html = 'test.html', fresh = true } = {}) => {
  await page.goto(`${at}/${html}`)
  await page.evaluate(async ({ source, options, fresh }) => {
    if (fresh) localStorage.clear()
    const { runScene } = await import('/pictures.js')
    window.errors = []
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', onError: (message, line) => window.errors.push({ message, line }), ...(0, eval)(options) })
    const box = document.getElementById('s')
    for (let i = 0; i < 200 && !/running|finished|error/.test(box.dataset.picturesStatus); i++) await new Promise((done) => setTimeout(done, 20))
  }, { source, options, fresh })
}
// Switched off, a scene is silent: at once a twentieth of what it was at most (what is left is the echo and the room
// dying away, which no new note feeds), and nothing at all a few seconds on.
const quiet = async (page) => {
  await page.evaluate(() => window.settle(150))
  const soon = await page.evaluate(() => window.loudest(300))
  let later = 1
  for (let i = 0; i < 12 && later >= 0.001; i++) later = await page.evaluate(() => window.loudest(400))
  return soon < 0.03 && later < 0.001 ? true : false
}
const until = (page, test, ms = 4000) => page.waitForFunction(test, null, { timeout: ms }).then(() => true, () => false)
const asked = (page) => {
  const list = []
  page.on('request', (r) => { if (r.url().startsWith(at)) list.push(new URL(r.url()).pathname) })
  return list
}
// The button and the card as the page has them.
const button = (page) => page.evaluate(() => {
  const b = document.querySelector('#s [data-sound-button]'), box = document.getElementById('s').getBoundingClientRect()
  if (!b || getComputedStyle(b).display === 'none') return null
  const r = b.getBoundingClientRect()
  return { x: Math.round(r.left - box.left), y: Math.round(r.top - box.top), size: Math.round(r.width), right: Math.round(box.right - r.right), bottom: Math.round(box.bottom - r.bottom), sound: b.dataset.sound, look: b.dataset.look, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') }
})
const card = (page) => page.evaluate(() => {
  const c = document.querySelector('#s [data-sound-card]')
  if (!c) return null
  const active = document.activeElement
  return { title: c.querySelector('[data-part=title]').textContent, buttons: [...c.querySelectorAll('button')].map((b) => b.textContent), focus: active && active.dataset ? active.dataset.answer || null : null, role: c.getAttribute('role'), label: c.getAttribute('aria-label') }
})
const press = async (page, which) => page.click(`#s [data-sound-card] button[data-answer=${which}]`)
const kept = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => /sound:on$/.test(k)).map((k) => ['on', localStorage.getItem(k)])))
const forgetAsked = (page) => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (/sound:asked$/.test(k)) localStorage.removeItem(k) })

async function letWorkletsRun(page) {
  const cdp = await page.context().newCDPSession(page)
  let id = 0
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

const SCREENS = [
  ['phone', { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 44],
  ['tablet', { viewport: { width: 820, height: 1100 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 44],
  ['desktop', { viewport: { width: 1280, height: 800 } }, 34],
]

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch { console.log(`${name}: not installed, skipped`); continue }
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } })
  await context.addInitScript(LISTEN)
  const page = await context.newPage()
  if (name === 'chromium') await letWorkletsRun(page)
  let got
  await page.goto(`${at}/test.html`)
  const worklet = await page.evaluate(async () => {
    const context = new OfflineAudioContext(1, 128, 48000)
    const url = URL.createObjectURL(new Blob(['registerProcessor("probe", class extends AudioWorkletProcessor { process() { return true } })'], { type: 'text/javascript' }))
    return Promise.race([context.audioWorklet.addModule(url).then(() => true, () => false), new Promise((done) => setTimeout(() => done(false), 3000))])
  })
  PLAYER = worklet ? '({})' : '({ sound: { fallback: "always" } })'
  const withHost = worklet ? '({ sound: { onState: (s) => window.states.push(s) } })' : '({ sound: { fallback: "always", onState: (s) => window.states.push(s) } })'
  const requests = asked(page)

  // --- a scene with neither is as it was
  await begin(page, DARK.replace('window.draws++\n', '') + 'window.handed = arguments.length\n')
  await page.evaluate(() => window.settle(200))
  got = { handed: await page.evaluate(() => window.handed), button: await button(page), style: await page.evaluate(() => !!document.querySelector('style[data-sound-button-style]')), kids: await page.evaluate(() => document.getElementById('s').children.length), cards: await page.evaluate(() => cards.length), asked: requests.filter((r) => r !== '/test.html' && r !== '/pictures.js') }
  say(same(got, { handed: HANDED, button: null, style: false, kids: 1, cards: 0, asked: [] }), name, 'a scene with no sound button is handed the names it always was, and has nothing new on the page', got)

  // None of the examples that do not name it fetches the part.
  {
    const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
    const strays = []
    let plain = 0
    for (const file of (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()) {
      const uses = sceneUses(await readFile(join(ROOT, 'examples', file), 'utf8'))
      if (uses.manners || uses.sound || uses.dials || uses.scenes) continue
      plain++
      requests.length = 0
      await page.goto(`${at}/test.html`)
      await page.evaluate(async (src) => {
        const { runScene } = await import('/pictures.js')
        const box = document.getElementById('s')
        runScene(box, { src })
        for (let i = 0; i < 150 && !/running|finished|error/.test(box.dataset.picturesStatus); i++) await new Promise((done) => setTimeout(done, 20))
        await window.settle(100)
      }, `examples/${file}`)
      if (requests.some((r) => /\/manners\//.test(r)) || await page.evaluate(() => !!document.querySelector('[data-sound-button], [data-sound-card], style[data-sound-button-style]'))) strays.push(file)
    }
    say(!strays.length && plain > 15, name, `none of the ${plain} plain examples fetches manners/ or has a button, a card or their styles`, strays)
  }

  // --- a button and no sound: the icon, and nothing loaded for it but its own part
  requests.length = 0
  await begin(page, 'const sound = soundButton()\nwindow.sound = sound\n' + COUNT + DARK + 'window.handed = arguments.length\n')
  await page.evaluate(() => window.settle(300))
  got = { handed: await page.evaluate(() => window.handed), button: await button(page), card: await card(page), cards: await page.evaluate(() => cards.length), asked: requests.filter((r) => r !== '/test.html' && r !== '/pictures.js'), frames: await page.evaluate(() => window.frames > 5), errors: await page.evaluate(() => errors) }
  say(got.handed === HANDED + 6 && got.button && got.button.sound === 'on' && got.card === null && got.cards === 0 && same(got.asked, ['/manners/manners.js']) && got.frames && !got.errors.length, name, 'a scene with a sound button and no sound has the button, no card, fetches manners/manners.js and nothing else (no sound library), opens no sound card and runs', got)
  say(got.button && got.button.size === 34 && got.button.right === 8 && got.button.y === 8 && got.button.pressed === 'true' && /Sound is on/.test(got.button.label), name, 'the button is top right, 34 points across, 8 from the edges, and says what it is', got.button)
  // A tap on it is not a tap on the scene, the scene keeps the keyboard, and the choice is kept.
  await page.mouse.click(300, 200)
  const b0 = got.button
  await page.mouse.click(b0.x + b0.size / 2, b0.y + b0.size / 2)
  got = { downs: await page.evaluate(() => window.downs), button: await button(page), focus: await page.evaluate(() => document.activeElement === scene.canvas), kept: await kept(page), over: await page.evaluate(({ x, y }) => [window.sound.over(x, y), window.sound.over(300, 200)], { x: b0.x + 5, y: b0.y + 5 }) }
  say(got.downs === 1 && got.button.sound === 'off' && got.button.pressed === 'false' && got.focus && same(got.kept, { on: 'false' }) && same(got.over, [true, false]), name, 'a tap on the button switches it off, is not a tap on the scene, leaves the keyboard with the scene, and is kept; over(x, y) says where it is', got)
  // M does the same.
  await page.keyboard.press('m')
  got = { button: await button(page), kept: await kept(page), on: await page.evaluate(() => window.sound.on) }
  say(got.button.sound === 'on' && got.on === true && same(got.kept, { on: 'true' }), name, 'M switches it back on', got)
  await page.evaluate(() => scene.stop())
  got = { button: await button(page), kids: await page.evaluate(() => document.getElementById('s').children.length) }
  say(got.button === null && got.kids === 1, name, 'the button goes when the scene stops', got)

  // --- a scene that reads M itself keeps M
  await begin(page, 'soundButton()\nwindow.keysHeard = []\nfunction onKeyDown(key) { if (key === "m") window.keysHeard.push(key) }\n' + DARK.replace('window.draws++\n', ''))
  await page.mouse.click(300, 200)
  await page.keyboard.press('m')
  got = { button: await button(page), heard: await page.evaluate(() => window.keysHeard) }
  say(got.button.sound === 'on' && same(got.heard, ['m']), name, 'a scene that reads M itself is given M, and the button leaves it alone', got)

  // --- the four corners, and a mistake
  for (const corner of ['top left', 'bottom-left', 'bottomRight', { corner: 'right top', size: 50 }]) {
    await begin(page, `soundButton(${JSON.stringify(corner)})\n` + DARK.replace('window.draws++\n', ''))
    const b = await button(page), said = JSON.stringify(corner)
    const left = /left/i.test(said), top = /top/i.test(said), size = corner.size || 34
    say(b && b.size === size && (left ? b.x === 8 : b.right === 8) && (top ? b.y === 8 : b.bottom === 8), name, `soundButton(${said}) is in that corner`, b)
  }
  await begin(page, 'soundButton({ inset: [16, 84] })\n' + DARK.replace('window.draws++\n', ''))
  got = await button(page)
  say(got && got.right === 16 && got.y === 84, name, 'soundButton({ inset: [16, 84] }) is that far in from the right and the top, beside what the scene draws in its corner', got)
  await begin(page, 'function draw() { background("navy") }\nsoundButton({ corner: "middle" })\n')
  got = await page.evaluate(() => errors)
  say(got.length === 1 && (got[0].line === 2 || (name === 'webkit' && got[0].line === 0)) && /"middle" is not a corner/.test(got[0].message), name, 'a corner that is not one is said in plain words, with its line', got)
  await begin(page, 'soundButton({ korner: "top left" })\n')
  got = await page.evaluate(() => errors)
  say(got.length === 1 && /no option called "korner"/.test(got[0].message), name, 'and so is an option that is not one', got)

  await begin(page, 'soundButton({ title: "Music" })\n')
  got = await page.evaluate(() => errors)
  say(got.length === 1 && /no option called "title"/.test(got[0].message), name, 'the card\'s words are not the button\'s options: soundButton() never asks', got)
  // The card where the scene already has a button keeps that button; asked twice, it asks once.
  await begin(page, 'soundButton("bottom left")\naskAboutSound({ corner: "top left" })\naskAboutSound()\n' + DARK.replace('window.draws++\n', ''))
  got = { cards: await page.evaluate(() => document.querySelectorAll('#s [data-sound-card]').length), buttons: await page.evaluate(() => document.querySelectorAll('#s [data-sound-button]').length) }
  await press(page, 'off')
  got.button = await button(page)
  say(got.cards === 1 && got.buttons === 1 && got.button.x === 8 && got.button.bottom === 8 && got.button.sound === 'off', name, 'askAboutSound() after soundButton() keeps the button where it was put, and asked twice it asks once', got)
  // A demo with no sound library still asks: its author said it has sound.
  await begin(page, 'askAboutSound()\n' + COUNT + DARK)
  got = { card: !!(await card(page)), asked: requests.filter((r) => /\/sound\//.test(r)).length }
  say(got.card, name, 'askAboutSound() is the author saying the scene has sound: it asks whatever the scene loads', got)

  // --- sound, no card: a tap on the button silences what is heard, and brings it back
  await begin(page, TUNE + 'const sound = soundButton()\nwindow.sound = sound\nwindow.isOn = () => soundIsOn()\n' + COUNT + DARK)
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(300, 200)
  await until(page, 'scene.sound.state === "on"')
  got = { card: await card(page), playing: await page.evaluate(() => window.loudest(500)) }
  let b = await button(page)
  await page.mouse.click(b.x + b.size / 2, b.y + b.size / 2)
  got.muted = await quiet(page)
  got.off = await page.evaluate(() => [window.isOn(), window.sound.on, scene.sound])
  await page.mouse.click(b.x + b.size / 2, b.y + b.size / 2)
  await page.evaluate(() => window.settle(250))
  got.back = await page.evaluate(() => window.loudest(500))
  got.on = await page.evaluate(() => [window.isOn(), !!scene.sound])
  got.downs = await page.evaluate(() => window.downs)
  say(got.card === null && got.playing > 0.02 && got.muted && same(got.off, [false, false, null]) && got.back > 0.02 && same(got.on, [true, true]) && got.downs === 1, name, 'soundButton() alone asks nothing, even of a scene with a tune; a tap on the button silences the tune and another brings it back, and soundIsOn() says which', got)
  // M, measured.
  await page.keyboard.press('m')
  got = { muted: await quiet(page) }
  await page.keyboard.press('M')
  await page.evaluate(() => window.settle(250))
  got.back = await page.evaluate(() => window.loudest(400))
  say(got.muted && got.back > 0.02, name, 'M silences it and M brings it back', got)
  // The scene's own muteSound() is the same switch.
  await begin(page, TUNE + 'soundButton()\nwindow.api = { mute: () => muteSound(), unmute: () => unmuteSound(), on: () => soundIsOn() }\n' + DARK.replace('window.draws++\n', ''))
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(300, 200)
  await until(page, 'scene.sound.state === "on"')
  await page.evaluate(() => window.api.mute())
  got = { button: (await button(page)).sound, on: await page.evaluate(() => window.api.on()), muted: await quiet(page), kept: await kept(page) }
  await page.evaluate(() => window.api.unmute())
  await page.evaluate(() => window.settle(250))
  got.after = [(await button(page)).sound, await page.evaluate(() => window.api.on()), await page.evaluate(() => window.loudest(400)) > 0.02]
  say(got.button === 'off' && got.on === false && got.muted && same(got.kept, {}) && same(got.after, ['on', true, true]), name, 'muteSound() and unmuteSound() are the same switch: the button shows it and soundIsOn() says it, and what the code switched is not kept as a person\'s choice', got)

  // --- kept: switched off, the scene opened again is still off
  await begin(page, TUNE + 'soundButton()\nwindow.isOn = () => soundIsOn()\n' + DARK.replace('window.draws++\n', ''))
  b = await button(page)
  await page.mouse.click(b.x + b.size / 2, b.y + b.size / 2)
  await begin(page, TUNE + 'soundButton()\nwindow.isOn = () => soundIsOn()\n' + DARK.replace('window.draws++\n', ''), { fresh: false })
  await page.mouse.click(300, 200)
  await page.evaluate(() => window.settle(400))
  got = { button: (await button(page)).sound, on: await page.evaluate(() => window.isOn()), heard: await page.evaluate(() => window.loudest(500)) }
  say(got.button === 'off' && got.on === false && got.heard < 0.001, name, 'switched off, the scene opened again is still off: the button shows it and nothing is heard', got)

  // --- the card: nothing is heard and the game waits until it is answered
  const GAME = TUNE + 'askAboutSound()\nwindow.isOn = () => soundIsOn()\n' + COUNT + DARK
  await page.evaluate(() => { window.states = [] })
  await begin(page, 'window.states = []\n' + GAME, { options: withHost })
  await page.evaluate(() => window.settle(700))
  got = { card: await card(page), button: await button(page), frames: await page.evaluate(() => window.frames), draws: await page.evaluate(() => window.draws), on: await page.evaluate(() => window.isOn()), player: await page.evaluate(() => scene.sound), states: await page.evaluate(() => window.states) }
  say(got.card && got.card.title === 'This demo has sound' && same(got.card.buttons, ['Play with sound', 'Play without sound']) && got.card.focus === 'on' && got.card.role === 'dialog' && got.button === null, name, 'a scene that asks about sound shows the card first, with "Play with sound" under Enter, and the button waits behind it', got)
  say(got.frames === 1 && got.draws === 1 && got.on === false, name, 'behind the card the game waits: its first frame is shown, update() and draw() are not called again, and soundIsOn() is false', got)
  say(got.player === null && got.states.includes('asking') && !got.states.includes('waiting'), name, 'a host is told "asking" and never "waiting", and is shown no player, so it has no tap to ask for', got)
  // A tap anywhere is the card's, and the tune is not heard.
  await page.mouse.click(300, 40)
  got = { downs: await page.evaluate(() => window.downs), heard: await page.evaluate(() => window.loudest(500)), card: !!(await card(page)), states: await page.evaluate(() => window.states) }
  say(got.downs === 0 && got.heard < 0.001 && got.card && !got.states.includes('waiting') && !got.states.includes('on'), name, 'a tap beside the card is not a tap on the game, turns nothing on, and nothing is heard', got)
  if (SHOTS && name === 'chromium') await page.screenshot({ path: join(SHOTS, 'card-dark-600x400.png') })
  // Only the person answers: a click or a key that a program makes (an agent's scripted tap) is ignored.
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('#s [data-sound-card] button')) { b.click(); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })) }
    const card = document.querySelector('#s [data-sound-card]')
    for (const key of ['Escape', 'Enter', ' ']) for (const type of ['keydown', 'keyup']) (document.activeElement || card).dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }))
  })
  await page.evaluate(() => window.settle(300))
  got = { card: !!(await card(page)), frames: await page.evaluate(() => window.frames), kept: await kept(page), heard: await page.evaluate(() => window.loudest(300)) }
  say(got.card && got.frames === 1 && same(got.kept, {}) && got.heard < 0.001, name, 'a click or a key made by a program does not answer the card: it stays up, the game waits, nothing is kept or heard', got)
  await press(page, 'on')
  await page.evaluate(() => window.settle(400))
  got = { card: await card(page), button: await button(page), heard: await page.evaluate(() => window.loudest(500)), frames: await page.evaluate(() => window.frames), on: await page.evaluate(() => window.isOn()), kept: await kept(page), states: await page.evaluate(() => window.states.slice(-1)), player: await page.evaluate(() => scene.sound && scene.sound.state), focus: await page.evaluate(() => document.activeElement === scene.canvas), downs: await page.evaluate(() => window.downs) }
  say(got.card === null && got.button && got.button.sound === 'on' && got.heard > 0.02 && got.frames > 5 && got.on === true && same(got.kept, { on: 'true' }) && same(got.states, ['on']) && got.player === 'on' && got.focus && got.downs === 0, name, '"Play with sound" turns the sound on with that one tap: the tune is heard, the game starts with the keyboard, the button shows, the answer is kept and the host is told "on"', got)
  // Run again straight away: it does not ask twice in one visit.
  await page.evaluate(() => scene.restart())
  await page.evaluate(() => window.settle(500))
  got = { card: await card(page), button: (await button(page))?.sound }
  say(got.card === null && got.button === 'on', name, 'run again within a few minutes, it does not ask again', got)

  // --- "Play without sound"
  await begin(page, 'window.states = []\n' + GAME, { options: withHost })
  await page.evaluate(() => window.settle(300))
  await press(page, 'off')
  await page.evaluate(() => window.settle(400))
  got = { card: await card(page), button: (await button(page))?.sound, heard: await page.evaluate(() => window.loudest(500)), frames: await page.evaluate(() => window.frames), on: await page.evaluate(() => window.isOn()), kept: await kept(page), states: await page.evaluate(() => window.states), player: await page.evaluate(() => scene.sound) }
  say(got.card === null && got.button === 'off' && got.heard < 0.005 && got.frames > 5 && got.on === false && same(got.kept, { on: 'false' }) && got.states.at(-1) === 'off' && !got.states.includes('waiting') && got.player === null, name, '"Play without sound": nothing is heard, the game starts, the button shows off, the answer is kept, and the host is told "off" and is not asked for a tap', got)
  b = await button(page)
  await page.mouse.click(b.x + b.size / 2, b.y + b.size / 2)
  await page.evaluate(() => window.settle(400))
  got = { heard: await page.evaluate(() => window.loudest(500)), button: (await button(page)).sound }
  say(got.heard > 0.02 && got.button === 'on', name, 'and a tap on the button later turns the sound on', got)
  // Opened afresh (the few minutes are over): it asks again, with last time's answer ready.
  await page.mouse.click(b.x + b.size / 2, b.y + b.size / 2)
  await forgetAsked(page)
  await begin(page, GAME, { fresh: false })
  await page.evaluate(() => window.settle(300))
  got = await card(page)
  say(got && got.focus === 'off', name, 'opened afresh it asks again, with last time\'s answer, "Play without sound", under Enter', got)
  await page.keyboard.press('ArrowDown')
  got = { moved: (await card(page)).focus }
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await page.evaluate(() => window.settle(300))
  got.after = { card: await card(page), button: (await button(page))?.sound, frames: await page.evaluate(() => window.frames > 3) }
  say(got.moved === 'on' && same(got.after, { card: null, button: 'off', frames: true }), name, 'the arrows go between the two, and Enter presses the one that has the keyboard', got)
  // Escape is "without", and no key reaches the game.
  await begin(page, GAME + 'window.keysHeard = []\nfunction onKeyDown(key) { window.keysHeard.push(key) }\n')
  await page.evaluate(() => window.settle(300))
  await page.keyboard.press('x')
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.settle(300))
  got = { card: await card(page), button: (await button(page))?.sound, heard: await page.evaluate(() => window.keysHeard), kept: await kept(page) }
  say(got.card === null && got.button === 'off' && same(got.heard, []) && same(got.kept, { on: 'false' }), name, 'Escape is "Play without sound", and a key pressed while the card is up does not reach the game', got)

  // --- remember: true, wait: false, and the card's own words
  await begin(page, TUNE + 'askAboutSound({ remember: true })\n' + COUNT + DARK)
  got = { first: !!(await card(page)) }
  await press(page, 'off')
  await forgetAsked(page)
  await begin(page, TUNE + 'askAboutSound({ remember: true })\n' + COUNT + DARK, { fresh: false })
  await page.evaluate(() => window.settle(300))
  got.second = { card: await card(page), button: (await button(page))?.sound }
  say(got.first && same(got.second, { card: null, button: 'off' }), name, 'with { remember: true } it asks the first time and never again: the answer is used', got)
  await begin(page, TUNE + 'askAboutSound({ wait: false, title: "Music and sound effects", withSound: "Sound on", without_sound: "Quiet" })\n' + COUNT + DARK)
  await page.evaluate(() => window.settle(500))
  got = { card: await card(page), frames: await page.evaluate(() => window.frames > 5), heard: await page.evaluate(() => window.loudest(400)) }
  say(got.card && got.card.title === 'Music and sound effects' && same(got.card.buttons, ['Sound on', 'Quiet']) && got.frames && got.heard < 0.001, name, 'with { wait: false } the scene runs behind the card, still silent, and the card says the words it was given', got)

  // --- a sound asked for before the answer is dropped, not played late. (The engine's own rule: what was asked for more
  // than a third of a second before the sound could start is let go. So the engine is given time to be there first.)
  requests.length = 0
  await begin(page, 'askAboutSound()\nplaySound("explosion")\n' + COUNT + DARK)
  for (let i = 0; i < 100 && !requests.includes('/sound/synths_core.wasm'); i++) await page.evaluate(() => window.settle(50))
  await page.evaluate(() => window.settle(1500))
  const listening = page.evaluate(() => window.loudest(900))
  await press(page, 'on')
  got = { heard: await listening, state: await page.evaluate(() => scene.sound && scene.sound.state) }
  say(got.heard < 0.001 && got.state === 'on', name, 'a sound effect asked for before the answer is dropped, not played late when the answer comes', got)

  // --- a host that plays the sound itself (an app's own engine: `sound: { send }`): the button and the card reach it as
  // the player's own commands, mute and pause, in the scene's batches. No Web Audio is touched: no sound card is opened.
  {
    const HOST = '(() => { window.batches = []; return { sound: { send: (batch) => window.batches.push(JSON.parse(JSON.stringify(batch))) } } })()'
    const masters = () => page.evaluate(() => window.batches.flatMap((b) => b.cmds).filter((c) => c.op === 'master' && ('mute' in c || 'pause' in c)).map((c) => ('mute' in c ? 'mute ' + c.mute : 'pause ' + c.pause)))
    requests.length = 0
    await begin(page, TUNE + 'askAboutSound()\n' + COUNT + DARK, { options: HOST })
    await page.evaluate(() => window.settle(400))
    got = { asking: await masters(), tune: await page.evaluate(() => window.batches.flatMap((b) => b.cmds).some((c) => c.op === 'tune')) }
    await press(page, 'off')
    await page.evaluate(() => window.settle(300))
    got.without = await masters()
    b = await button(page)
    await page.mouse.click(b.x + b.size / 2, b.y + b.size / 2)
    await page.keyboard.press('m')
    await page.evaluate(() => window.settle(300))
    got.after = (await masters()).slice(-2)
    // (`--batches file` keeps what the host was sent, to be put through an app's own bridge.)
    if (BATCHES && name === 'chromium') await writeFile(BATCHES, JSON.stringify(await page.evaluate(() => window.batches)))
    got.cards = await page.evaluate(() => cards.length)
    got.engine = requests.filter((r) => /wasm|worklet/.test(r))
    say(got.asking.at(-1) === 'pause true' && got.tune && same(got.without.slice(-2), ['mute true', 'pause false']) && same(got.after, ['mute false', 'mute true']) && got.cards === 0 && !got.engine.length, name,
      'a host that plays the sound itself is sent the card as pause, the answer as mute then pause false, and the button and M as mute: the player\'s own commands, with no sound card opened and no engine fetched here', got)
  }

  // --- recorded a frame at a time (`runScene(…, { stepped })`, a host making a video): nobody is there to ask, and the
  // recording is made with its sound. No card and no button is ever on the page, the scene does not wait, its sound is
  // on though "off" was kept last time, and the first note is on sample 0. Filmed twice: the same both times.
  {
    const CLAP = 'const sound = askAboutSound()\nsoundButton("bottom left")\nconst beep = makeSynth({ wave: "sine", filter: "off", attack: 0, decay: 0, sustain: 1, release: 0, volume: 1 })\nlet n = 0\nwindow.on = []\nfunction draw() {\n  background(n % 30 === 0 ? "white" : "black")\n  if (n % 30 === 0) beep.play("A5", { length: 0.01 })\n  window.on.push([soundIsOn(), sound.asking])\n  n++\n}\n'
    const film = async ({ source, fps, frames }) => {
      localStorage.clear()
      let clock = 0, waiting = []
      const real = { raf: window.requestAnimationFrame, now: performance.now }
      window.requestAnimationFrame = (fn) => { waiting.push(fn); return waiting.length }
      window.cancelAnimationFrame = () => {}
      performance.now = () => clock
      let laid = 0
      new MutationObserver(() => { laid += document.querySelectorAll('[data-sound-card], [data-sound-button]').length }).observe(document.body, { childList: true, subtree: true })
      const { runScene } = await import('/pictures.js')
      const errors = []
      // "Sound off" was the choice last time.
      const scene = runScene(document.getElementById('s'), { source, name: 'clap.js', savedAs: 'clap', stepped: { fps }, onError: (m) => errors.push(m) })
      localStorage.setItem('pictures:clap:sound:on', 'false')
      await scene.ready
      const player = scene.sound
      if (!player || !player.stepped) return { skipped: true, errors }
      const white = [], parts = [], g = scene.canvas.getContext('2d')
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
      const left = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0))
      let at = 0
      for (const p of parts) { left.set(p.left, at); at += p.length }
      const starts = []
      let quiet = 300
      for (let i = 0; i < left.length; i++) { if (Math.abs(left[i]) > 1e-4) { if (quiet >= 300) starts.push(i); quiet = 0 } else quiet++ }
      const out = { white, starts, total: left.length, on: window.on.slice(0, 2), laid, now: document.querySelectorAll('[data-sound-card], [data-sound-button]').length, errors }
      scene.stop()
      window.requestAnimationFrame = real.raf
      performance.now = real.now
      return out
    }
    const films = []
    for (let i = 0; i < 2; i++) {
      await page.goto(`${at}/test.html`)
      films.push(await page.evaluate(film, { source: CLAP, fps: 30, frames: 60 }))
    }
    got = films[0]
    if (got.skipped) console.log(`     ${name}: no stepped player in this copy of the sound library, so the recording case is skipped`)
    else {
      say(same(got.white, [0, 30]) && same(got.starts, [0, 48000]) && got.total === 96000 && !got.errors.length, name, 'recorded a frame at a time, a scene that begins with askAboutSound() does not wait: every frame is made, and its first note is on sample 0', got)
      say(got.laid === 0 && got.now === 0 && same(got.on, [[true, false], [true, false]]), name, 'no card and no button is ever on the recorded page, and soundIsOn() is true from the first frame though "off" was kept last time', got)
      say(same(films[0], films[1]), name, 'filmed twice, it is the same', films)
    }
  }

  // --- inside a frame the button keeps no edge of the screen, and the page asks nothing of its parent
  await page.goto(`${at}/framed.html`)
  const frame = page.frames()[1]
  await frame.evaluate(async () => {
    localStorage.clear()
    const { runScene } = await import('/pictures.js')
    window.scene = runScene(document.getElementById('s'), { source: 'soundButton()\nfunction draw() { background("navy") }\n', name: 'scene.js' })
    await new Promise((done) => setTimeout(done, 400))
  })
  got = await frame.evaluate(() => { const b = document.querySelector('[data-sound-button]').getBoundingClientRect(); return [Math.round(600 - b.right), Math.round(b.top), document.querySelectorAll('div[style*="safe-area"]').length] })
  say(same(got, [8, 8, 0]), name, 'inside a frame the button sits 8 from the corner and measures no edge of the screen', got)

  await context.close()

  // --- on a phone, a tablet and a desktop: the size, the corner, and off the on-screen controls
  for (const [screen, device, size] of SCREENS) {
    // (WebKit takes no isMobile; a touch screen is enough to make its pointer coarse.)
    const made = { ...device }
    if (name === 'webkit') delete made.isMobile
    const ctx = await browser.newContext(made)
    await ctx.addInitScript(LISTEN)
    const p = await ctx.newPage()
    if (name === 'chromium') await letWorkletsRun(p)
    const { width, height } = device.viewport
    await begin(p, 'soundButton()\n' + DARK.replace('window.draws++\n', ''), { html: 'full.html' })
    await p.evaluate(() => window.settle(600))
    got = await button(p)
    say(got && got.size === size && got.right === (size === 44 ? 10 : 8) && got.y === (size === 44 ? 10 : 8), name, `${screen} (${width} by ${height}): the button is ${size} points across in the top right corner`, got)
    if (SHOTS && name === 'chromium') await p.screenshot({ path: join(SHOTS, `button-dark-${screen}.png`) })
    await begin(p, 'soundButton("bottom left")\n' + LIGHT.replace('window.draws++\n', ''), { html: 'full.html' })
    await p.evaluate(() => window.settle(600))
    got = await button(p)
    say(got && got.look === 'dark' && got.x === (size === 44 ? 10 : 8) && got.bottom === (size === 44 ? 10 : 8), name, `${screen}: on a light scene the button is dark, and bottom left where it was asked for`, got)
    if (SHOTS && name === 'chromium') await p.screenshot({ path: join(SHOTS, `button-light-${screen}.png`) })
    // Over a panel of controls: on none of them.
    await begin(p, PANEL + 'soundButton()\n', { html: 'full.html' })
    await until(p, 'scene.canvas[Symbol.for("dials.panel")] && scene.canvas[Symbol.for("dials.panel")].items.length >= 4')
    await p.evaluate(() => window.settle(1800))
    got = await p.evaluate(() => {
      const panel = scene.canvas[Symbol.for('dials.panel')], b = document.querySelector('[data-sound-button]').getBoundingClientRect()
      const hit = panel.items.filter((it) => it.w && it.h && b.left < it.x + it.w && b.right > it.x && b.top < it.y + it.h && b.bottom > it.y).map((it) => it.kind)
      const points = [[b.left + 2, b.top + 2], [b.right - 2, b.bottom - 2], [(b.left + b.right) / 2, (b.top + b.bottom) / 2]].map(([x, y]) => panel.covers(x, y))
      return { hit, points, inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, errors }
    })
    say(!got.hit.length && !got.points.some(Boolean) && got.inside && !got.errors.length, name, `${screen}: with a panel of dials, a scope and a keyboard the button is on none of the controls, and inside the scene`, got)
    if (SHOTS && name === 'chromium') await p.screenshot({ path: join(SHOTS, `button-panel-${screen}.png`) })
    if (SHOTS && name === 'chromium') {
      await begin(p, TUNE + 'askAboutSound()\n' + DARK.replace('window.draws++\n', ''), { html: 'full.html' })
      await p.evaluate(() => window.settle(500))
      await p.screenshot({ path: join(SHOTS, `card-dark-${screen}.png`) })
      await begin(p, TUNE + 'askAboutSound("Music and sound effects")\n' + LIGHT.replace('window.draws++\n', ''), { html: 'full.html' })
      await p.evaluate(() => window.settle(500))
      await p.screenshot({ path: join(SHOTS, `card-light-${screen}.png`) })
      await begin(p, PANEL + 'playNote("C4")\naskAboutSound()\n', { html: 'full.html' })
      await p.evaluate(() => window.settle(900))
      await p.screenshot({ path: join(SHOTS, `card-panel-${screen}.png`) })
    }
    await ctx.close()
  }
  if (SHOTS && name === 'chromium') {
    // A small scene among the words of a page: the card folds to fit.
    const ctx = await browser.newContext({ viewport: { width: 420, height: 260 } })
    const p = await ctx.newPage()
    await p.goto(`${at}/test.html`)
    await p.evaluate(async () => {
      const box = document.getElementById('s')
      box.style.cssText = 'width:320px;height:180px;margin:20px'
      const { runScene } = await import('/pictures.js')
      runScene(box, { source: 'playNote("C4")\naskAboutSound()\nfunction draw() { background("#0b1020"); circle(width / 2, height / 2, 30, "gold") }\n', name: 'scene.js' })
      await new Promise((done) => setTimeout(done, 600))
    })
    await p.screenshot({ path: join(SHOTS, 'card-small-320x180.png') })
    await ctx.close()
  }
  await browser.close()
}
server.close()
process.exit(failed ? 1 : 0)
