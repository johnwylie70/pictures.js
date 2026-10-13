#!/usr/bin/env node
/**
 * MIDI in a scene, in real browsers: that a scene without it loads nothing for it, that a scene's own
 * `onMidiNote` and the rest are called with what a keyboard sends, that a keyboard plays a synth and is heard
 * with none of the scene's code in between, that a knob which is learnt turns a setting and its dial, that what
 * is sent leaves as the right bytes at the right times, and that a place with no MIDI says so once and carries on.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-midi.mjs
 *
 * NOTHING IS EVER SENT TO A REAL DEVICE. The machine that runs this may have MIDI devices plugged in, so every
 * scene here that sends is given a pretend transport as `runScene`'s `midi` option (`PRETEND`): what is sent is
 * kept in a list, and `midi.play(bytes)` is a keyboard sending bytes. The browser's own Web MIDI is only ever
 * asked and listened to. Listening to the sound, and the audio worklet under Playwright, are as in test-sound.mjs.
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

const HOOKS = 'window.got = []\nfunction onMidiNote(note, velocity, channel) { got.push(["on", note, velocity, channel]) }\nfunction onMidiNoteOff(note, channel) { got.push(["off", note, channel]) }\nfunction onMidiControl(number, value, channel) { got.push(["control", number, value, channel]) }\nfunction onMidi(message) { if (message.type !== "devices") got.push(["any", message.type, message.device, typeof message.time, message.data]) }\nfunction onMidiDevices(devices) { window.devices = devices }\n'
const LASER = 'function onMouseDown() { playSound("laser") }\n'

// --- with no browser: what a scene's text asks for
const USES = [
  ['a function onMidiNote of the scene\'s own, and nothing else of sound\'s', 'function onMidiNote(note, velocity) { circle(note, 50, 10) }\n', true],
  ['the Python spelling', 'function on_midi_control(number, value) { }\n', true],
  ['one written as an arrow function', 'const onMidi = (message) => { }\n', true],
  ['onMidiNote called with a function', 'onMidiNote((note) => { })\n', true],
  ['a synth method alone is not enough to tell, but the synth is', 'makeSynth("lead").playFromMidi()\n', true],
  ['a name in a comment or a string', '// function onMidiNote(note) {}\nconst words = "sendMidiNote(60)"\n', false],
  ['names taken from a file with use()', 'const { onMidiNote, sendMidi } = await use("mine.js")\nonMidiNote(() => {})\nsendMidi([144, 60, 100])\n', false],
  ['a longer name that begins the same', 'function onMidiNoteBook() { }\nlet onMidiX = 1\n', false],
]
for (const [what, source, want] of USES) say(sceneUses(source).sound === want, 'node', `a scene ${want ? 'uses' : 'does not use'} sound: ${what}`, sceneUses(source))

// --- pictures build
const work = await mkdtemp(join(tmpdir(), 'pictures-midi-'))
{
  const src = join(work, 'src'), out = join(work, 'site')
  execFileSync('mkdir', ['-p', src])
  await writeFile(join(src, 'lights.js'), 'function onMidiNote(note) { circle(note * 4, 100, 20, "gold") }\n')
  execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(src, 'lights.js'), '-o', out])
  const missing = ['pictures/sound/synths.js', 'pictures/sound/synths-midi.js', 'pictures/sound/synths_core.wasm'].filter((f) => !existsSync(join(out, f)))
  say(!missing.length, 'node', 'pictures build copies the sound folder, with synths-midi.js in it, for a scene whose only sound name is its own onMidiNote', missing)
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.wav': 'audio/wav' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0"><div id="s" style="width:600px;height:400px"></div>')
  let body
  try { body = await readFile(join(ROOT, path)) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// On every page, before anything else: note what is connected to the sound card, and what the console is told about MIDI.
const LISTEN = () => {
  window.heard = []
  window.told = []
  for (const kind of ['log', 'warn', 'error', 'info']) {
    const real = console[kind]
    console[kind] = (...a) => { if (/MIDI/.test(a.join(' '))) window.told.push(a.join(' ')); real.apply(console, a) }
  }
  const connect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (to, ...rest) {
    if (to instanceof AudioDestinationNode) window.heard.push(this)
    return connect.call(this, to, ...rest)
  }
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
// A PRETEND MIDI TRANSPORT, made on the page as `window.midi`: one keyboard and one box to send to.
const PRETEND = `(() => {
  const m = window.midi = { sent: [], opened: 0, listener: null,
    open() { m.opened++ }, inputs: () => ['Keys'], outputs: () => ['Box'],
    send(bytes, time, output) { m.sent.push([Array.from(bytes), time, output ?? null]) },
    receive(listener) { m.listener = listener },
    play(bytes) { m.listener(bytes, performance.now(), 'Keys') } }
  return m
})()`
let PLAYER = ''
const withMidi = (midi = PRETEND) => `({ midi: ${midi}${PLAYER} })`
const begin = async (page, source, options = withMidi()) => {
  await page.goto(`${at}/test.html`)
  await page.evaluate(async ({ source, options }) => {
    const { runScene } = await import('/pictures.js')
    window.errors = []
    window.statuses = []
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', onError: (message, line) => window.errors.push({ message, line }), onStatus: (s) => window.statuses.push(s), ...(0, eval)(options) })
    const box = document.getElementById('s')
    for (let i = 0; i < 200 && !/running|finished|error/.test(box.dataset.picturesStatus); i++) await new Promise((done) => setTimeout(done, 20))
  }, { source, options })
}
const until = (page, test, ms = 4000) => page.waitForFunction(test, null, { timeout: ms }).then(() => true, () => false)
const asked = (page) => {
  const list = []
  page.on('request', (r) => { if (r.url().startsWith(at)) list.push(new URL(r.url()).pathname) })
  return list
}
const SIBLING = /\/(?:sound|dials)\//
// The scene is listening: the desk has the transport's listener, and the scene has been told the devices.
const ready = (page) => until(page, 'window.midi && midi.listener && midi.opened === 1')

// (From synths.js's tests: Playwright holds Chromium's audio worklets back, and this lets them go.)
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

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await playwright[name].launch() } catch { console.log(`${name}: not installed, skipped`); continue }
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
  if (!worklet) console.log(`     ${name}: no audio worklet loads in this browser as it is run here, so the engine is run on the page's thread for the cases that listen`)
  PLAYER = worklet ? '' : ', sound: { fallback: "always" }'
  const hasWebMidi = await page.evaluate(() => typeof navigator.requestMIDIAccess === 'function')

  // --- nothing new for a scene without MIDI
  const requests = asked(page)
  await begin(page, 'function draw() {\n  background("navy")\n  circle(100, 100, 40, "gold")\n}\nwindow.handed = arguments.length\n')
  await page.evaluate(() => window.settle(300))
  got = { requests: [...requests], handed: await page.evaluate(() => window.handed), opened: await page.evaluate(() => midi.opened), told: await page.evaluate(() => told) }
  say(same(got, { requests: ['/test.html', '/pictures.js'], handed: 49, opened: 0, told: [] }), name, 'a plain scene asks for pictures.js and nothing else, is handed the names it always was, and MIDI is never opened', got)
  requests.length = 0
  await begin(page, LASER + 'const lead = makeSynth("lead")\nlead.play("C4", 0.2)\n')
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(300, 200)
  await page.evaluate(() => window.settle(400))
  got = { asked: requests.filter((r) => SIBLING.test(r)), opened: await page.evaluate(() => midi.opened), errors: await page.evaluate(() => errors) }
  say(same(got, { asked: ['/sound/synths.js', '/sound/synths_core.wasm'], opened: 0, errors: [] }), name, 'a scene with sound and no MIDI asks for the library and the engine, never for synths-midi.js, and MIDI is never opened', got)

  // --- a scene's own functions are called with what a keyboard sends
  requests.length = 0
  await begin(page, HOOKS)
  got = { ready: await ready(page) }
  await until(page, 'window.devices')
  await page.evaluate(() => { midi.play([0x91, 60, 127]); midi.play([0x81, 60, 0]); midi.play([0xb1, 74, 127]) })
  await until(page, 'got.length >= 6')
  Object.assign(got, await page.evaluate(() => ({ got: window.got, devices: window.devices, errors, status: document.getElementById('s').dataset.picturesStatus, sent: midi.sent.length })))
  got.fetched = requests.filter((r) => r.endsWith('/synths-midi.js')).length
  say(got.ready && same(got.got, [['on', 60, 1, 2], ['any', 'noteOn', 'Keys', 'number', [0x91, 60, 127]], ['off', 60, 2], ['any', 'noteOff', 'Keys', 'number', [0x81, 60, 0]], ['control', 74, 1, 2], ['any', 'control', 'Keys', 'number', [0xb1, 74, 127]]])
    && same(got.devices, { inputs: ['Keys'], outputs: ['Box'], available: true }) && !got.errors.length && got.status === 'running' && got.fetched === 1 && got.sent === 0, name,
  'a scene\'s own onMidiNote, onMidiNoteOff, onMidiControl, onMidi and onMidiDevices are called with the note, how hard, the knob, its value and the channel; the scene is running, not finished; synths-midi.js was fetched once', got)

  await begin(page, 'window.got = []\nfunction on_midi_note(note, velocity, channel) { got.push([note, Math.round(velocity * 100), channel]) }\nfunction on_midi_control(number, value, channel) { got.push([number, Math.round(value * 100), channel]) }\n')
  await ready(page)
  await page.evaluate(() => { midi.play([0x90, 64, 64]); midi.play([0x80, 64, 0]); midi.play([0xb0, 1, 0]) })
  await until(page, 'got.length >= 3')
  got = await page.evaluate(() => ({ got: window.got, errors }))
  say(same(got, { got: [[64, 50, 1], [64, 0, 1], [1, 0, 1]], errors: [] }), name, 'the Python spellings on_midi_note and on_midi_control are called, and a key coming up calls on_midi_note with velocity 0 when there is no on_midi_note_off', got)

  await begin(page, 'window.got = []\nonMidiNote((note, velocity, channel) => { got.push(["a", note, channel]) })\non_midi_note((note) => { got.push(["b", note]) })\nonMidiControl((number, value) => { got.push(["c", number, value]) })\nwindow.kinds = [typeof sendMidiNote, typeof send_midi_note, typeof midiDevices, typeof receive_midi, typeof stopMidi]\n')
  await ready(page)
  await page.evaluate(() => { midi.play([0x92, 48, 100, 0xb0, 7, 0]) })
  await until(page, 'got.length >= 3')
  got = await page.evaluate(() => ({ got: window.got, kinds, errors }))
  say(same(got, { got: [['a', 48, 3], ['b', 48], ['c', 7, 0]], kinds: ['function', 'function', 'function', 'function', 'function'], errors: [] }), name, 'onMidiNote(fn) and onMidiControl(fn) keep a function each, in either spelling, and the sending names are functions in both spellings', got)

  // --- the scene's own declaration wins, and its own variables are its own
  await begin(page, 'const midiDevices = ["mine"]\nlet sendMidi = 5\nfunction receiveMidi() { return "mine too" }\nwindow.got = []\nfunction onMidiNote(note) { got.push(note) }\nonMidiControl((number) => { got.push("knob " + number) })\nwindow.own = [midiDevices, sendMidi, receiveMidi()]\n')
  await ready(page)
  await page.evaluate(() => midi.play([0x90, 70, 100, 0xb0, 10, 5]))
  await until(page, 'got.length >= 2')
  got = await page.evaluate(() => ({ got: window.got, own, errors }))
  say(same(got, { got: [70, 'knob 10'], own: [['mine'], 5, 'mine too'], errors: [] }), name, 'a scene\'s own onMidiNote is called and not mistaken for the library\'s, beside onMidiControl(fn) from the library, and its own midiDevices, sendMidi and receiveMidi stay its own', got)
  await begin(page, 'function draw() { background("navy") }\n\nfunction onMidiNote(note) {\n  note.nothing.here = 1\n}\n')
  await ready(page)
  await page.evaluate(() => midi.play([0x90, 70, 100]))
  await until(page, 'errors.length > 0', 1500)
  got = await page.evaluate(() => ({ error: errors[0] || null, status: document.getElementById('s').dataset.picturesStatus }))
  say(!!got.error && got.status === 'error' && (got.error.line === 4 || (name === 'webkit' && got.error.line === 0)), name, 'a mistake inside onMidiNote stops the scene with its line, as one inside onKeyDown does', got)
  await begin(page, 'window.got = []\nfunction onMidiNote(note) { got.push(note) }\nfunction draw() { background("navy") }\n')
  await ready(page)
  await page.evaluate(() => { scene.stop(); midi.play([0x90, 70, 100]) })
  await page.evaluate(() => window.settle(150))
  got = await page.evaluate(() => window.got)
  say(same(got, []), name, 'nothing is called after the scene has stopped', got)

  // --- a keyboard plays a synth, with none of the scene's code in between
  await begin(page, 'const lead = makeSynth("lead")\nlead.playFromMidi()\nwindow.frames = 0\n')
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(300, 200)
  await until(page, 'scene.sound.state === "on"')
  await ready(page)
  got = { before: await page.evaluate(() => window.loudest(300)) }
  let hearing = page.evaluate(() => window.loudest(700))
  await page.evaluate(() => midi.play([0x90, 69, 127]))
  got.down = await hearing
  await page.evaluate(() => midi.play([0x80, 69, 0]))
  await page.evaluate(() => window.settle(900))
  got.up = await page.evaluate(() => window.loudest(300))
  Object.assign(got, await page.evaluate(() => ({ errors, status: document.getElementById('s').dataset.picturesStatus, sent: midi.sent.length })))
  // (The scene has no update, no draw and no MIDI function: its top level ended before the key went down. What is left after the key comes up is the lead's echo dying away.)
  say(got.before < 0.001 && got.down > 0.02 && got.up < got.down / 10 && got.status === 'finished' && !got.errors.length && got.sent === 0, name, 'a key on the pretend keyboard plays a synth that was told playFromMidi(), is heard, and stops when the key comes up, in a scene whose own code has finished', got)

  // --- learn: the next knob turns the setting, and the dial on the screen
  await begin(page, 'const lead = makeSynth("lead")\nconst cutoff = dial("cutoff", lead, "cutoff")\nlead.learn("cutoff", (value) => { cutoff.value = value })\nlead.map_midi(71, "resonance")\nwindow.lead = lead\nwindow.cutoff = cutoff\nwindow.learned = []\nonMidi((m) => { if (m.type === "learned") learned.push([m.setting, m.control]) })\n')
  await ready(page)
  await page.evaluate(() => window.settle(200))
  got = { start: await page.evaluate(() => [lead.cutoff, cutoff.value, lead.resonance]) }
  await page.evaluate(() => midi.play([0xb0, 21, 0]))
  await until(page, 'learned.length === 1')
  await page.evaluate(() => window.settle(100))
  got.low = await page.evaluate(() => [lead.cutoff, cutoff.value])
  await page.evaluate(() => midi.play([0xb0, 21, 127, 0xb0, 71, 127]))
  await until(page, `lead.cutoff !== ${got.low[0]}`)
  await page.evaluate(() => window.settle(100))
  Object.assign(got, await page.evaluate(() => ({ high: [lead.cutoff, cutoff.value], resonance: lead.resonance, learned, errors, range: [lead.describe("cutoff").min, lead.describe("cutoff").max, lead.describe("resonance").max] })))
  say(same(got.learned, [['cutoff', 21]]) && same(got.low, [got.range[0], got.range[0]]) && same(got.high, [got.range[1], got.range[1]]) && got.resonance === got.range[2] && got.start[2] !== got.resonance && !got.errors.length, name,
    `learn("cutoff") takes the next knob that moves (21): at its least the synth's cutoff and the dial are ${got.low?.[0]}, at its most ${got.high?.[0]}, and map_midi(71, "resonance") turns the resonance`, got)

  // --- sending: the bytes, and when
  await begin(page, 'setTempo(120)\nwindow.asked = performance.now()\nsendMidiNote("C4", 1, { length: 0.25, after: 0.1 })\nsendMidiNote("E4", 0.5, { length: "quarter", after: 0.1, channel: 10, output: "Box" })\nsend_midi_control(74, 0.5, { channel: 2 })\nsendMidi([0xc0, 5])\nsendMidiNoteOff("G4")\nsendMidiBend(-1)\nsendMidiProgram(7, { channel: 16 })\n')
  await until(page, 'window.midi && midi.sent.length >= 9')
  await page.evaluate(() => window.settle(100))
  got = await page.evaluate(() => ({ sent: midi.sent.map(([bytes, time, output]) => [bytes, time, output]), asked, errors }))
  {
    const find = (status, a) => got.sent.find(([b]) => b[0] === status && (a === undefined || b[1] === a))
    const bytes = got.sent.map(([b]) => b.join(' ')).sort()
    const want = [[0x90, 60, 127], [0x80, 60, 0], [0x99, 64, 64], [0x89, 64, 0], [0xb1, 74, 64], [0xc0, 5], [0x80, 67, 0], [0xe0, 0, 0], [0xcf, 7]].map((b) => b.join(' ')).sort()
    const gap = find(0x80, 60)?.[1] - find(0x90, 60)?.[1], beat = find(0x89)?.[1] - find(0x99)?.[1], after = find(0x90, 60)?.[1] - find(0xb1)?.[1]
    got.times = { gap, beat, after, output: find(0x99)?.[2], first: find(0xb1)?.[2] }
    say(same(bytes, want) && Math.abs(gap - 250) < 1 && Math.abs(beat - 500) < 1 && Math.abs(after - 100) < 3 && got.times.output === 'Box' && got.times.first === null && !got.errors.length, name,
      `what is sent reaches the transport as the right bytes: a note-on, and its note-off ${gap?.toFixed(2)} ms later (0.25 seconds), a "quarter" at 120 beats a minute ${beat?.toFixed(2)} ms long on channel 10 to the output named, the notes ${after?.toFixed(1)} ms after the control (after: 0.1), a control, a program, a bend and bytes as written`, got)
  }

  // --- a host that takes the commands itself is handed MIDI's too, and hands back what was received
  await begin(page, HOOKS + 'makeSynth("lead").playFromMidi()\nsendMidiNote(60)\n', '(() => { const host = window.host = { batches: [], listener: null, scope: null }; return { sound: { send: (batch) => host.batches.push(batch), onMidi: (listener, scope) => { host.listener = listener; host.scope = scope; return () => { host.listener = null } } } } })()')
  await until(page, 'host.listener')
  await page.evaluate(() => window.settle(200))
  await page.evaluate(() => host.listener && host.listener([{ type: 'devices', inputs: ['Far'], outputs: [], available: true }, { type: 'noteOn', note: 62, velocity: 0.5, channel: 4, time: 1, device: 'Far', data: [0x93, 62, 64] }]))
  got = await page.evaluate(() => ({ does: host.batches.flatMap((b) => b.cmds).filter((c) => c.op === 'midi').map((c) => c.do).sort(), bytes: host.batches.flatMap((b) => b.cmds).filter((c) => c.do === 'send').map((c) => c.bytes), got: window.got, devices: window.devices, errors, card: heard.length }))
  await page.evaluate(() => scene.stop())
  got.after = await page.evaluate(() => host.listener)
  say(same(got.does, ['devices', 'listen', 'play', 'send', 'send']) && same(got.bytes, [[0x90, 60, 102], [0x80, 60, 0]]) && same(got.got, [['on', 62, 0.5, 4], ['any', 'noteOn', 'Far', 'number', [0x93, 62, 64]]]) && same(got.devices?.inputs, ['Far']) && !got.errors.length && got.card === 0 && got.after === null, name,
    'with sound.send the host is handed the midi commands in the batches, and what it gives its onMidi listener reaches the scene\'s functions; the listener is let go when the scene stops', got)

  // --- where there is no MIDI: one plain message, and the scene carries on
  await begin(page, HOOKS + 'const lead = makeSynth("lead")\nlead.playFromMidi()\nlead.learn("cutoff")\nsendMidiNote("C4")\nsendMidiControl(1, 1)\nwindow.now = midiDevices()\nfunction draw() { background("navy"); window.drawn = true }\n', withMidi('{ open() { throw new Error("there is no MIDI in this app") }, inputs: () => [], outputs: () => [], send() { window.sentAnyway = true }, receive() {} }'))
  await until(page, 'window.devices')
  await page.evaluate(() => window.settle(300))
  got = await page.evaluate(() => ({ told, devices: window.devices, now: window.now, errors, drawn: window.drawn, sent: !!window.sentAnyway, status: document.getElementById('s').dataset.picturesStatus }))
  say(got.told.length === 1 && same(got.devices, { inputs: [], outputs: [], available: false }) && same(got.now, { inputs: [], outputs: [], available: null }) && !got.errors.length && got.drawn && !got.sent && got.status === 'running', name,
    `a transport that cannot open is said once in plain words ("${got.told[0]}"), onMidiDevices says available: false, nothing is sent and the scene runs on`, got)
  await begin(page, HOOKS + 'makeSynth("lead").playFromMidi()\nfunction draw() { background("navy"); window.drawn = true }\n', withMidi('false'))
  await page.evaluate(() => window.settle(500))
  got = await page.evaluate(() => ({ told, errors, drawn: window.drawn, devices: window.devices ?? null }))
  say(got.told.length <= 1 && !got.errors.length && got.drawn && got.devices?.available !== true, name, 'with midi: false the scene runs, and has no MIDI', got)
  // The browser's own Web MIDI: asked and listened to, and NOTHING SENT (there may be real devices here).
  await begin(page, HOOKS + 'makeSynth("lead").playFromMidi()\nfunction draw() { background("navy"); window.drawn = true }\n', `({ ${PLAYER.replace(/^, /, '')} })`)
  await until(page, 'window.devices', 5000)
  got = await page.evaluate(() => ({ told, errors, drawn: window.drawn, devices: window.devices ?? null }))
  if (hasWebMidi) say(!got.errors.length && got.drawn && got.told.length <= 1 && (got.devices ? typeof got.devices.available === 'boolean' : true), name, `with no midi option the browser's own Web MIDI is asked (${got.devices ? (got.devices.available ? `allowed: ${got.devices.inputs.length} inputs, listened to and never sent to` : 'refused, and one plain message says so') : 'no answer yet'}), and the scene runs`, got)
  else say(got.told.length === 1 && /MIDI is not available in this browser/.test(got.told[0]) && same(got.devices, { inputs: [], outputs: [], available: false }) && !got.errors.length && got.drawn, name, `this browser has no Web MIDI: one plain message says so ("${got.told[0]}"), onMidiDevices says available: false, and the scene runs`, got)

  // --- the two examples, with the pretend keyboard
  await begin(page, await readFile(join(ROOT, 'examples', 'midi_lights.js'), 'utf8') + '\nwindow.count = () => balls.length\nwindow.said = () => message\nwindow.big = () => size\n')
  await ready(page)
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(300, 100)
  await until(page, 'scene.sound.state === "on"')
  got = { clicked: await page.evaluate(() => count()) }
  hearing = page.evaluate(() => window.loudest(600))
  await page.evaluate(() => midi.play([0x90, 72, 110, 0xb0, 7, 127]))
  got.peak = await hearing
  Object.assign(got, await page.evaluate(() => ({ balls: count(), said: said(), size: big(), errors })))
  say(got.clicked === 1 && got.balls >= 1 && got.peak > 0.02 && got.size === 1 && /Play Keys/.test(got.said) && !got.errors.length, name, 'examples/midi_lights.js: a click pretends to be a key and throws a ball, a key of the keyboard rings the bell and is heard, and a knob sets the size', got)
  await begin(page, await readFile(join(ROOT, 'examples', 'midi_keyboard.js'), 'utf8') + '\nwindow.lead = lead\nwindow.dials = [cutoff, resonance, echo]\nwindow.said = () => found.value\n')
  await ready(page)
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(8, 8)
  await until(page, 'scene.sound.state === "on"')
  hearing = page.evaluate(() => window.loudest(600))
  await page.evaluate(() => midi.play([0x90, 60, 110]))
  got = { peak: await hearing }
  await page.evaluate(() => midi.play([0x80, 60, 0, 0xb0, 20, 127, 0xb0, 21, 127, 0xb0, 22, 127]))
  await until(page, 'lead.echo === lead.describe("echo").max')
  await page.evaluate(() => window.settle(100))
  Object.assign(got, await page.evaluate(() => ({ set: [lead.cutoff, lead.resonance, lead.echo], most: ['cutoff', 'resonance', 'echo'].map((n) => lead.describe(n).max), dials: dials.map((d) => d.value), said: said(), errors })))
  say(got.peak > 0.02 && same(got.set, got.most) && same(got.dials, got.most) && /Play Keys/.test(got.said) && !got.errors.length, name, 'examples/midi_keyboard.js: the keyboard plays the synth and is heard, and the first three knobs moved become the cutoff, the resonance and the echo, each dial turning with its knob', got)
  await begin(page, await readFile(join(ROOT, 'examples', 'midi_keyboard.js'), 'utf8') + '\nwindow.said = () => found.value\n', withMidi('{ open() { throw new Error("none") }, inputs: () => [], outputs: () => [], send() {}, receive() {} }'))
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await until(page, '/No MIDI/.test(said())')
  const key = await page.evaluate(() => {
    const canvas = window.scene.canvas, panel = canvas[Symbol.for('dials.panel')]
    const item = panel.items.find((it) => it.kind === 'keyboard'), box = canvas.getBoundingClientRect()
    return [box.left + item.x + item.w / 2, box.top + item.y + item.h / 2 + 20]
  })
  hearing = page.evaluate(() => window.loudest(700))
  await page.mouse.move(...key); await page.mouse.down()
  got = { peak: await hearing, said: await page.evaluate(() => said()), errors: await page.evaluate(() => errors) }
  await page.mouse.up()
  say(got.peak > 0.02 && /No MIDI keyboard was found/.test(got.said) && !got.errors.length, name, 'and with no MIDI it says so on the picture and is still a synth: a key of the on-screen keyboard is heard', got)

  await browser.close()
}
server.close()
await rm(work, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
