#!/usr/bin/env node
/**
 * Your voice in a scene, in real browsers: the microphone, recording, saving and the voices. That a scene without
 * them asks for nothing new and never for a microphone, that the microphone is heard only while it is listened to,
 * that a voice moves the pitch the way its name says, that a second of recording is a second-long sample that
 * plays, that saveSound makes a WAV file and gives it to the host's files, to a host's `save` or to a download,
 * that with no microphone one thing is said and nothing stops, and that the two examples are built and work.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-voice.mjs
 *
 * THERE IS NO MICROPHONE HERE, AND NONE IS EVER OPENED. On every page `navigator.mediaDevices.getUserMedia` is
 * replaced before anything runs (`PRETEND`): it counts how often it is asked and gives a steady 440 Hz tone as a
 * stream, or refuses as a person or a computer with no microphone would, as `window.micMode` says. Listening to
 * the sound, and the audio worklet under Playwright, are as in test-sound.mjs.
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)
const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
const synths = await import(pathToFileURL(join(ROOT, 'sound', 'synths.js')).href)

let failed = 0
const say = (ok, engine, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${engine}: ${what}${ok ? '' : `: ${JSON.stringify(got)}`}`)
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const example = (file) => readFile(join(ROOT, 'examples', file), 'utf8')

// --- with no browser: what a scene's text asks for
const USES = [
  ['useMicrophone()', 'const mic = useMicrophone()\n', true],
  ['the Python spelling', 'const take = record_sound(3)\n', true],
  ['saveSound alone', 'function onKeyDown() { saveSound(mainSynth(), "a.wav") }\n', true],
  ['names in a comment or a string', '// useMicrophone()\nconst words = "recordSound(3)"\n', false],
  ['a microphone of the scene\'s own', 'function useMicrophone() { return 1 }\nuseMicrophone()\n', false],
]
for (const [what, source, want] of USES) say(sceneUses(source).sound === want, 'node', `a scene ${want ? 'uses' : 'does not use'} sound: ${what}`, sceneUses(source))
for (const file of ['voice_changer.js', 'sampler.js']) {
  const uses = sceneUses(await example(file))
  say(uses.sound && uses.dials && !uses.three, 'node', `examples/${file} uses sound and controls`, uses)
}

// --- with no browser: the same commands, rendered with sound given in a microphone's place
{
  const rate = 48000
  const tone = Float32Array.from({ length: rate * 3 }, (_, i) => 0.5 * Math.sin(2 * Math.PI * 440 * i / rate))
  const peak = (a, from = 0, to = a.length) => { let p = 0; for (let i = from; i < to; i++) p = Math.max(p, Math.abs(a[i])); return p }
  // How often a second the sound crosses zero going up: its pitch, for a plain tone.
  const pitch = (a, from, to) => { let n = 0; for (let i = from + 1; i < to; i++) if (a[i - 1] < 0 && a[i] >= 0) n++; return n / ((to - from) / rate) }
  const render = async (program, seconds) => (await synths.renderSound(program, { seconds, sampleRate: rate, microphone: tone })).left
  let out = await render((s) => { const mic = s.useMicrophone(); mic.listen({ after: 1 }) }, 2).catch((e) => String(e))
  // (listen() may take no time: then it is listened to from the start, and the first case says so.)
  const timed = typeof out !== 'string' && peak(out, 0, rate * 0.9) < 0.001
  if (!timed) {
    const quiet = await render((s) => { s.useMicrophone() }, 1)
    const loud = await render((s) => { s.useMicrophone().listen() }, 1)
    say(peak(quiet) < 0.001 && peak(loud) > 0.1, 'node', 'offline, a microphone is silent until it is listened to and heard after', [peak(quiet), peak(loud)])
  } else say(peak(out, rate * 1.2, rate * 2) > 0.1, 'node', 'offline, a microphone is silent until it is listened to and heard after', [peak(out, 0, rate * 0.9), peak(out, rate * 1.2, rate * 2)])
  const hz = {}
  for (const voice of ['none', 'chipmunk', 'monster']) {
    out = await render((s) => { const mic = s.useMicrophone({ voice }); mic.reverb = 0; mic.distortion = 0; mic.listen() }, 2)
    hz[voice] = Math.round(pitch(out, rate, rate * 2))
  }
  say(Math.abs(hz.none - 440) < 8 && hz.chipmunk > 600 && hz.chipmunk < 720 && hz.monster > 260 && hz.monster < 330, 'node', 'offline, a 440 Hz voice stays at 440, is seven semitones higher as a chipmunk (659) and seven lower as a monster (294)', hz)
  let take = null, bytes = null
  out = await render((s) => { s.useMicrophone(); take = s.recordSound(1); take.play("C4", 1, { after: 1.5 }); bytes = s.saveSound(take, 'hello', { download: false }) }, 3)
  bytes = await Promise.race([bytes, new Promise((done) => setTimeout(() => done(null), 2000))])
  const view = bytes && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const wav = view && { riff: String.fromCharCode(...bytes.slice(0, 4)) + String.fromCharCode(...bytes.slice(8, 12)), channels: view.getUint16(22, true), rate: view.getUint32(24, true), bits: view.getUint16(34, true), seconds: view.getUint32(40, true) / 2 / rate }
  say(take.done && Math.abs(take.seconds - 1) < 0.01 && peak(out, 0, rate * 1.4) < 0.001 && peak(out, rate * 1.6, rate * 2.4) > 0.1 && same(wav, { riff: 'RIFFWAVE', channels: 1, rate, bits: 16, seconds: wav?.seconds }) && Math.abs(wav.seconds - 1) < 0.01, 'node',
    'offline, a one-second recording is done, one second long, plays, and is saved as a 16-bit WAV file of one channel and one second', { done: take.done, seconds: take.seconds, silent: peak(out, 0, rate * 1.4), played: peak(out, rate * 1.6, rate * 2.4), wav })
  const told = []
  const warn = console.warn
  console.warn = (...a) => told.push(a.join(' '))
  let empty = null, threw = null
  try { await synths.renderSound((s) => { const mic = s.useMicrophone(); mic.voice = 'robot'; mic.listen(); empty = s.recordSound(1); empty.play() }, { seconds: 1.5, sampleRate: rate }) } catch (e) { threw = String(e) }
  console.warn = warn
  say(!threw && told.filter((t) => /microphone/.test(t)).length === 1 && empty.done && empty.seconds === 0, 'node', 'offline with nothing in a microphone\'s place, one thing is said, nothing is thrown and the recording is empty and done', { threw, told, done: empty?.done, seconds: empty?.seconds })
}

// --- pictures build
const work = await mkdtemp(join(tmpdir(), 'pictures-voice-'))
{
  const out = join(work, 'site')
  execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(ROOT, 'examples', 'voice_changer.js'), '-o', out])
  const missing = ['pictures/sound/synths.js', 'pictures/sound/synths_core.wasm', 'pictures/dials/dials.js'].filter((f) => !existsSync(join(out, f)))
  say(!missing.length, 'node', 'pictures build makes a folder for the voice changer, with the sound and the controls in it', missing)
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.wav': 'audio/wav' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body style="margin:0"><div id="s" style="width:700px;height:500px"></div>')
  let body
  try { body = await readFile(join(ROOT, path)) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// On every page, before anything else: a pretend microphone, what the console is told, and what reaches the sound card.
const PRETEND = () => {
  window.heard = []
  window.told = []
  window.micAsked = []
  window.micMode = 'tone'
  window.streams = []
  for (const kind of ['log', 'warn', 'error', 'info']) {
    const real = console[kind]
    console[kind] = (...a) => { window.told.push(a.join(' ')); real.apply(console, a) }
  }
  const connect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (to, ...rest) {
    if (to instanceof AudioDestinationNode) window.heard.push(this)
    return connect.call(this, to, ...rest)
  }
  // A steady tone as a stream: what stands where a microphone would be.
  window.toneStream = (hz = 440, level = 0.5) => {
    const context = new AudioContext()
    const osc = context.createOscillator()
    osc.frequency.value = hz
    const gain = context.createGain()
    gain.gain.value = level
    const out = context.createMediaStreamDestination()
    osc.connect(gain).connect(out)
    osc.start()
    window.streams.push(out.stream)
    return out.stream
  }
  const getUserMedia = async (constraints) => {
    window.micAsked.push(constraints)
    if (window.micMode === 'tone') return window.toneStream()
    throw new DOMException('no', window.micMode === 'none' ? 'NotFoundError' : 'NotAllowedError')
  }
  try { Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia, enumerateDevices: async () => [], addEventListener() {}, removeEventListener() {} } }) } catch (e) { navigator.mediaDevices.getUserMedia = getUserMedia }
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
  // A sound card that stays silent until the page is touched, as a browser keeps one for a person: Playwright's
  // browsers let a page play at once, so the rule is kept by hand. (From synths.js's tests.)
  window.ruledCard = () => {
    const context = new AudioContext()
    context.suspend()
    let touched = false
    for (const g of ['pointerdown', 'keydown']) addEventListener(g, () => { touched = true }, true)
    const resume = context.resume.bind(context)
    context.resume = () => (touched ? resume() : new Promise(() => {}))
    return context
  }
  // The loudest frequency in what the player is putting out now, and how loud the sound is.
  window.spectrum = async (ms = 500) => {
    const player = window.scene.sound
    const a = player.context.createAnalyser()
    a.fftSize = 16384
    a.smoothingTimeConstant = 0
    player.node.connect(a)
    await window.settle(ms)
    const bins = new Float32Array(a.frequencyBinCount)
    a.getFloatFrequencyData(bins)
    const data = new Float32Array(a.fftSize)
    a.getFloatTimeDomainData(data)
    let peak = 0
    for (const v of data) peak = Math.max(peak, Math.abs(v))
    player.node.disconnect(a)
    let best = 1
    for (let i = 1; i < bins.length; i++) if (bins[i] > bins[best]) best = i
    return { peak, hz: Math.round(best * player.context.sampleRate / a.fftSize) }
  }
  // A WAV file's header, and how many seconds of sound it says it has.
  window.wavOf = (bytes) => {
    if (!bytes || !bytes.byteLength) return null
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), view = new DataView(b.buffer, b.byteOffset, b.byteLength)
    const word = (i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3])
    const channels = view.getUint16(22, true), rate = view.getUint32(24, true)
    return { riff: word(0) + word(8) + word(36), channels, bits: view.getUint16(34, true), seconds: Math.round(view.getUint32(40, true) / 2 / channels / rate * 100) / 100, whole: view.getUint32(40, true) + 44 === b.byteLength }
  }
  window.micTold = () => window.told.filter((t) => /^synths\.js: .*microphone/i.test(t))
}
let PLAYER = ''
// Start a scene on test.html as `scene`. `options` is JavaScript read on the page; `mode` is what the pretend microphone does.
const begin = async (page, source, options = '{}', mode = 'tone') => {
  await page.goto(`${at}/test.html`)
  await page.evaluate(async ({ source, options, mode, player }) => {
    window.micMode = mode
    const { runScene } = await import('/pictures.js')
    window.errors = []
    const given = (0, eval)(`(${options})`), more = (0, eval)(`(${player})`)
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', onError: (message, line) => window.errors.push({ message, line }), ...given, sound: { ...more.sound, ...given.sound } })
    const box = document.getElementById('s')
    for (let i = 0; i < 200 && !/running|finished|error/.test(box.dataset.picturesStatus); i++) await new Promise((done) => setTimeout(done, 20))
  }, { source, options, mode, player: PLAYER || '{}' })
}
const until = (page, test, ms = 5000) => page.waitForFunction(test, null, { timeout: ms }).then(() => true, () => false)
const asked = (page) => {
  const list = []
  page.on('request', (r) => { if (r.url().startsWith(at)) list.push(new URL(r.url()).pathname) })
  return list
}
const SIBLING = /\/(?:sound|dials)\//
const status = (page) => page.evaluate(() => document.getElementById('s').dataset.picturesStatus)
// The sound is on: the engine is loaded and the browser has been touched.
const on = async (page) => {
  await until(page, 'scene.sound && scene.sound.state !== "loading"')
  await page.mouse.click(350, 20)
  return until(page, 'scene.sound.state === "on"')
}
// A control of the panel by its kind and the words on it: its middle, in the page's points.
const control = (page, kind, label) => page.evaluate(({ kind, label }) => {
  const canvas = window.scene.canvas, panel = canvas[Symbol.for('dials.panel')]
  const item = panel.items.find((it) => it.kind === kind && (label == null || it.label === label))
  const box = canvas.getBoundingClientRect()
  return [box.left + item.x + item.w / 2, box.top + item.y + item.h / 2]
}, { kind, label })
const press = async (page, kind, label) => { const [x, y] = await control(page, kind, label); await page.mouse.click(x, y) }
const MIC = 'const mic = useMicrophone()\nwindow.mic = mic\nfunction draw() { background("navy") }\n'

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


const ALLOWED = { chromium: { args: ['--autoplay-policy=no-user-gesture-required'] }, webkit: {} }
for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await playwright[name].launch(ALLOWED[name]) } catch { console.log(`${name}: not installed, skipped`); continue }
  const context = await browser.newContext({ viewport: { width: 800, height: 600 }, acceptDownloads: true })
  await context.addInitScript(PRETEND)
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
  PLAYER = worklet ? '' : '{ sound: { fallback: "always" } }'

  // --- nothing new for a scene without the microphone
  const requests = asked(page)
  await begin(page, 'function draw() {\n  background("navy")\n  circle(100, 100, 40, "gold")\n}\nwindow.handed = arguments.length\n')
  await page.evaluate(() => window.settle(300))
  got = { requests: [...requests], asked: await page.evaluate(() => micAsked.length), told: await page.evaluate(() => told), handed: await page.evaluate(() => handed) }
  say(same(got.requests, ['/test.html', '/pictures.js']) && got.asked === 0 && !got.told.length && got.handed === 49, name, 'a plain scene asks for pictures.js and nothing else, is handed the names it always was, and no microphone is asked for', got)
  requests.length = 0
  await begin(page, 'const lead = makeSynth("lead")\nlead.voice = "robot"\nlead.pitchShift = 5\nfunction onMouseDown() { lead.play("C4", 0.3) }\nwindow.have = [typeof useMicrophone, typeof use_microphone, typeof recordSound, typeof record_sound, typeof saveSound, typeof save_sound, typeof startRecording, typeof stop_recording, typeof recordOutput, typeof stopMicrophone, typeof voiceNames, typeof receiveSoundEvents]\nwindow.voices = voiceNames()\n')
  got = { on: await on(page) }
  const hearing = page.evaluate(() => window.loudest(600))
  await page.mouse.click(300, 200)
  Object.assign(got, { peak: await hearing, sibling: requests.filter((r) => SIBLING.test(r)), ...(await page.evaluate(() => ({ asked: micAsked.length, have: window.have, voices: window.voices, mic: micTold(), errors }))) })
  say(got.on && got.peak > 0.02 && same(got.sibling, ['/sound/synths.js', '/sound/synths_core.wasm']) && got.asked === 0 && !got.mic.length && !got.errors.length
    && same(got.have, [...Array(11).fill('function'), 'undefined']) && same(got.voices, ['robot', 'chipmunk', 'monster', 'cave', 'telephone', 'alien', 'whisper']), name,
  'a scene with a synth in a robot\'s voice is heard, has the microphone\'s functions in both spellings and the seven voices by name, and no microphone is asked for', got)

  // --- heard only while it is listened to, and the voices move the pitch
  await begin(page, MIC)
  got = { on: await on(page), ready: await page.evaluate(() => mic.whenReady()) }
  await page.evaluate(() => window.settle(300))
  Object.assign(got, await page.evaluate(async () => ({ asked: micAsked.length, wanted: micAsked[0], state: mic.state, silent: await window.loudest(500), level: await (async () => { mic.level(); await window.settle(300); return Math.max(...[].concat(mic.level())) })() })))
  await page.evaluate(() => { mic.listen() })
  await page.evaluate(() => window.settle(300))
  got.plain = await page.evaluate(() => window.spectrum())
  await page.evaluate(() => { mic.voice = 'chipmunk' })
  await page.evaluate(() => window.settle(300))
  got.chipmunk = await page.evaluate(() => window.spectrum())
  await page.evaluate(() => { mic.voice = 'monster'; mic.reverb = 0 })
  await page.evaluate(() => window.settle(300))
  got.monster = await page.evaluate(() => window.spectrum())
  await page.evaluate(() => { mic.voice = 'none'; mic.mute() })
  await page.evaluate(() => window.settle(400))
  got.muted = await page.evaluate(() => window.loudest(400))
  got.errors = await page.evaluate(() => errors)
  say(got.on && got.ready === true && got.asked === 1 && got.state === 'on' && got.wanted?.audio?.echoCancellation === false && got.silent < 0.001 && got.level > 0.05, name,
    `useMicrophone() asks the browser once, for the plain microphone; it is on, shows on its meter (${got.level?.toFixed?.(2)}) and nothing is heard until it is listened to`, got)
  say(got.plain.peak > 0.05 && Math.abs(got.plain.hz - 440) < 12 && got.chipmunk.hz > 600 && got.chipmunk.hz < 720 && got.monster.hz > 260 && got.monster.hz < 330 && got.muted < 0.001 && !got.errors.length, name,
    `listen() lets a 440 Hz voice through at ${got.plain.hz} Hz, a chipmunk is higher (${got.chipmunk.hz}), a monster lower (${got.monster.hz}), and mute() is silence again`, got)

  // --- a second of recording is a sample a second long, which plays; and it is saved among the host's files
  const FILES = '{ storage: { writeBytes: async (path, bytes) => { (window.files ??= {})[path] = bytes }, readBytes: async () => null } }'
  await begin(page, MIC + 'window.take = null\nwindow.record = () => { window.take = recordSound(1); take.onDone(() => { window.told2 = take.seconds }) }\nwindow.keep = () => { window.bytes = null; saveSound(take, "../hello").then((b) => { window.bytes = b }) }\n', FILES)
  got = { on: await on(page), ready: await page.evaluate(() => mic.whenReady()) }
  await page.evaluate(() => { window.record(); window.atOnce = [take.done, take.recording, typeof take.play] })
  got.done = await until(page, 'take.done', 4000)
  Object.assign(got, await page.evaluate(() => ({ atOnce, seconds: take.seconds, told: window.told2, recording: take.recording })))
  got.before = await page.evaluate(() => window.loudest(300))
  const playing = page.evaluate(() => window.spectrum(500))
  await page.evaluate(() => { take.play() })
  got.played = await playing
  await page.evaluate(() => window.keep())
  got.saved = await until(page, 'window.bytes && window.files && window.files["hello.wav"]')
  Object.assign(got, await page.evaluate(() => ({ file: wavOf(window.files?.['hello.wav']), bytes: wavOf(window.bytes), names: Object.keys(window.files || {}), errors })))
  say(got.ready && same(got.atOnce, [false, true, 'function']) && got.done && Math.abs(got.seconds - 1) < 0.05 && got.told === got.seconds && got.recording === false && got.before < 0.001 && got.played.peak > 0.05 && Math.abs(got.played.hz - 440) < 12, name,
    `recordSound(1) gives a take at once that is done after a second, ${got.seconds?.toFixed?.(2)} seconds long, tells onDone, and plays back at the pitch it was said (${got.played?.hz} Hz) with the microphone not listened to`, got)
  const good = (w) => w && w.riff === 'RIFFWAVEdata' && w.channels === 1 && w.bits === 16 && w.whole && Math.abs(w.seconds - 1) < 0.05
  say(got.saved && good(got.file) && good(got.bytes) && same(got.names, ['hello.wav']) && !got.errors.length, name, 'saveSound(take, "hello") writes hello.wav through the host\'s storage, a 16-bit WAV file of one channel and one second, kept inside the scene\'s own folder, and gives the same bytes back', got)

  // --- a host's own save, and with neither a download
  await begin(page, MIC + 'window.take = recordSound(1)\nsaveSound(take, "mine.wav")\n', '{ save: (file) => { window.kept = file }, storage: { writeBytes: async (path) => { window.wrote = path } } }')
  got = { on: await on(page), kept: await until(page, 'window.kept', 6000) }
  Object.assign(got, await page.evaluate(() => ({ name: kept?.name, type: kept?.type, wav: wavOf(kept?.bytes), wrote: window.wrote ?? null, errors })))
  say(got.kept && got.name === 'mine.wav' && got.type === 'audio/wav' && good(got.wav) && got.wrote === null && !got.errors.length, name, 'a host\'s `save` option is given the file saveSound makes, asked for while it was still recording, and the storage is not', got)
  await begin(page, MIC + 'window.take = recordSound(1)\nwindow.keep = () => { saveSound(take, "said.wav") }\n')
  got = { on: await on(page), done: await until(page, 'take.done', 4000) }
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 6000 }).catch(() => null), page.evaluate(() => { window.keep() })])
  const file = download && await readFile(await download.path()).catch(() => null)
  got.name = download?.suggestedFilename()
  got.wav = file && await page.evaluate((b) => wavOf(new Uint8Array(b)), [...file])
  say(got.done && got.name === 'said.wav' && good(got.wav), name, 'with no storage and no save from a host, saveSound downloads the WAV file', got)

  // --- what is played is recorded, with no microphone asked for
  await begin(page, 'const lead = makeSynth("lead")\nwindow.tune = null\nwindow.go = () => { window.tune = recordOutput(1); lead.play("A4", 0.8); saveSound(tune, "tune.wav", { download: false }).then((b) => { window.bytes = b }) }\n')
  got = { on: await on(page) }
  await page.evaluate(() => window.go())
  got.saved = await until(page, 'window.bytes', 6000)
  Object.assign(got, await page.evaluate(() => ({ wav: wavOf(window.bytes), seconds: tune.seconds, asked: micAsked.length, errors })))
  say(got.saved && got.wav?.channels === 2 && Math.abs(got.wav.seconds - 1) < 0.05 && got.asked === 0 && !got.errors.length, name, 'recordOutput(1) records what a synth plays in stereo, and saveSound with { download: false } gives its bytes, with no microphone asked for', got)

  // --- no microphone: one thing is said, nothing is thrown, the scene runs on
  for (const [mode, state, what] of [['refused', 'refused', 'the person says no'], ['none', 'none', 'the computer has none']]) {
    await begin(page, MIC + 'mic.voice = "robot"\nmic.listen()\nwindow.take = recordSound(1)\nwindow.frames = 0\nfunction update() { window.frames++ }\nfunction onMouseDown() { playSound("coin") }\n', '{}', mode)
    got = { on: await on(page), ready: await page.evaluate(() => mic.whenReady()), done: await until(page, 'take.done', 3000) }
    const coin = page.evaluate(() => window.loudest(500))
    await page.mouse.click(300, 300)
    Object.assign(got, { coin: await coin, status: await status(page), ...(await page.evaluate(() => ({ state: mic.state, seconds: take.seconds, asked: micAsked.length, said: micTold(), errors, frames: window.frames }))) })
    say(got.ready === false && got.state === state && got.done && got.seconds === 0 && got.asked === 1 && got.said.length === 1 && !got.errors.length && got.status === 'running' && got.frames > 5 && got.coin > 0.02, name,
      `when ${what} the microphone's state is "${state}", one thing is said in the console, the recording is empty and done, nothing is thrown, and the scene runs on and plays its other sounds`, got)
  }
  await begin(page, MIC + 'window.take = recordSound(1)\n', '{ microphone: false }')
  got = { on: await on(page), ready: await page.evaluate(() => mic.whenReady()), done: await until(page, 'take.done', 3000) }
  Object.assign(got, await page.evaluate(() => ({ state: mic.state, seconds: take.seconds, asked: micAsked.length, said: micTold(), errors })))
  say(got.ready === false && got.state === 'unavailable' && got.done && got.seconds === 0 && got.asked === 0 && got.said.length === 1 && !got.errors.length, name, 'a host that says `microphone: false` has nobody asked: the scene is told there is none, once', got)

  // --- a host's own microphone, let go when the scene stops
  await begin(page, MIC + 'mic.listen()\n', '{ microphone: { open(wants) { window.wants = Object.keys(wants).sort(); return window.toneStream() }, close() { window.shut = (window.shut || 0) + 1 } } }')
  got = { on: await on(page), ready: await page.evaluate(() => mic.whenReady()) }
  await page.evaluate(() => window.settle(300))
  got.heard = await page.evaluate(() => window.spectrum(400))
  await page.evaluate(() => scene.stop())
  await page.evaluate(() => window.settle(200))
  Object.assign(got, await page.evaluate(() => ({ wants: window.wants, asked: micAsked.length, shut: window.shut ?? 0 })))
  say(got.ready === true && same(got.wants, ['constraints', 'push', 'raw', 'sampleRate']) && got.asked === 0 && got.heard.peak > 0.05 && Math.abs(got.heard.hz - 440) < 12 && got.shut === 1, name, 'a host\'s `microphone` option is opened in place of the browser\'s and heard, and is closed when the scene stops', got)
  await begin(page, MIC)
  got = { on: await on(page), ready: await page.evaluate(() => mic.whenReady()) }
  await page.evaluate(() => scene.stop())
  got.ended = await until(page, 'streams.length === 1 && streams[0].getTracks().every((t) => t.readyState === "ended")', 3000)
  say(got.ready && got.ended, name, 'a microphone the browser gave is let go when the scene stops, though the scene never said stopMicrophone()', got)

  // --- a host that plays the sound itself is sent the commands, and hands back what its player says
  await begin(page, MIC + 'window.take = recordSound(1)\nwindow.over = 0\ntake.onDone(() => { window.over++ })\n', '{ sound: { send(batch) { (window.batches ??= []).push(batch) }, onSoundEvents(listener, scope) { window.tell = listener; return () => { window.left = true } } } }')
  await until(page, 'window.batches && batches.some((b) => b.cmds.some((c) => c.op === "record"))')
  got = await page.evaluate(() => {
    const cmds = batches.flatMap((b) => b.cmds), record = cmds.find((c) => c.op === 'record')
    tell([{ type: 'microphone', state: 'on' }, { type: 'recorded', id: record.id, frames: 48000, seconds: 1 }])
    return { ops: [...new Set(cmds.map((c) => c.op))], from: record.from, len: record.len, state: mic.state, done: take.done, seconds: take.seconds, over: window.over, asked: micAsked.length, card: !!scene.sound, errors }
  })
  say(got.ops.includes('mic') && got.ops.includes('record') && got.from === 'mic' && got.len === 1 && got.state === 'on' && got.done && got.seconds === 1 && got.over === 1 && got.asked === 0 && !got.card && !got.errors.length, name,
    'with `sound.send` the host is sent the mic and record commands and no microphone is asked for here; what its player says, handed to `sound.onSoundEvents`\'s listener, turns the microphone on and ends the take', got)

  // --- the examples
  const voice = await example('voice_changer.js')
  requests.length = 0
  await begin(page, voice + '\nwindow.mic = mic\nwindow.said = () => says.value\nwindow.theTake = () => take\n')
  got = { on: await on(page), ready: await until(page, '/Say something/.test(said())') }
  Object.assign(got, await page.evaluate(() => ({ kinds: scene.canvas[Symbol.for('dials.panel')].items.map((it) => it.kind), errors, asked: micAsked.length })))
  got.sibling = requests.filter((r) => SIBLING.test(r)).sort()
  got.silent = await page.evaluate(() => window.loudest(300))
  await press(page, 'toggle', 'listen')
  await page.evaluate(() => window.settle(300))
  got.plain = await page.evaluate(() => window.spectrum(400))
  // The picker's right-hand arrow, twice: none, robot, chipmunk.
  const arrow = await page.evaluate(() => {
    const canvas = scene.canvas, item = canvas[Symbol.for('dials.panel')].items.find((it) => it.kind === 'select'), box = canvas.getBoundingClientRect()
    return [box.left + item.x + item.w - 8, box.top + item.y + item.h / 2]
  })
  await page.mouse.click(...arrow); await page.mouse.click(...arrow)
  got.voice = await page.evaluate(() => mic.voice)
  await page.evaluate(() => window.settle(300))
  got.chipmunk = await page.evaluate(() => window.spectrum(400))
  await press(page, 'toggle', 'listen')
  await press(page, 'button', 'record')
  got.recording = await page.evaluate(() => said())
  got.recorded = await until(page, '/Recorded/.test(said())', 6000)
  got.seconds = await page.evaluate(() => theTake()?.seconds)
  await page.evaluate(() => window.settle(300))
  const back = page.evaluate(() => window.spectrum(600))
  await press(page, 'button', 'play')
  got.back = await back
  got.errors = await page.evaluate(() => errors)
  say(got.on && got.ready && same(got.kinds, ['label', 'select', 'dial', 'dial', 'toggle', 'button', 'button', 'scope', 'meter']) && same(got.sibling, ['/dials/dials.js', '/sound/synths.js', '/sound/synths_core.wasm']) && got.asked === 1 && !got.errors.length, name,
    'examples/voice_changer.js builds a voice picker, two dials, a listen switch, record and play buttons, a scope and a meter, and asks for the microphone once', got)
  say(got.silent < 0.001 && got.plain.peak > 0.05 && Math.abs(got.plain.hz - 440) < 12 && got.voice === 'chipmunk' && got.chipmunk.hz > 600 && got.recording === 'Recording' && got.recorded && Math.abs(got.seconds - 3) < 0.1 && got.back.peak > 0.05 && got.back.hz > 600 && !got.errors.length, name,
    `and it is silent until "listen" is pressed, the voice picked changes the pitch (${got.plain.hz} to ${got.chipmunk.hz} Hz), "record" makes three seconds, and "play" plays them back in the voice chosen (${got.back.hz} Hz)`, got)
  await begin(page, voice + '\nwindow.mic = mic\nwindow.said = () => says.value\n', '{}', 'refused')
  got = { on: await on(page), said: await until(page, '/No microphone here \\(refused\\)/.test(said())') }
  await press(page, 'button', 'record')
  got.nothing = await until(page, '/Nothing was recorded/.test(said())')
  await press(page, 'button', 'play')
  await press(page, 'toggle', 'listen')
  await page.evaluate(() => window.settle(200))
  Object.assign(got, { status: await status(page), ...(await page.evaluate(() => ({ told: micTold().length, errors }))) })
  say(got.said && got.nothing && got.told === 1 && !got.errors.length && got.status === 'running', name, 'with the microphone refused the voice changer says so on the picture, every control still works, and the console is told once', got)

  const sampler = await example('sampler.js')
  await begin(page, sampler + '\nwindow.said = () => says.value\nwindow.word = () => word\n')
  got = { on: await on(page) }
  await until(page, 'word().describe')
  await press(page, 'button', 'record')
  got.now = await until(page, '/Now play the keys/.test(said())', 5000)
  got.seconds = await page.evaluate(() => word().seconds)
  got.before = await page.evaluate(() => window.loudest(300))
  let [kx, ky] = await control(page, 'keyboard')
  let key = page.evaluate(() => window.loudest(700))
  await page.mouse.move(kx, ky + 20); await page.mouse.down()
  got.peak = await key
  await page.mouse.up()
  got.errors = await page.evaluate(() => errors)
  say(got.on && got.now && Math.abs(got.seconds - 1.5) < 0.1 && got.before < 0.001 && got.peak > 0.02 && !got.errors.length, name, 'examples/sampler.js: "record" makes a second and a half of sample, and a key of the on-screen keyboard plays it', got)
  await begin(page, sampler + '\nwindow.said = () => says.value\n', '{}', 'none')
  got = { on: await on(page) }
  await press(page, 'button', 'record')
  got.bell = await until(page, '/the keys play a bell/.test(said())', 4000);
  [kx, ky] = await control(page, 'keyboard')
  key = page.evaluate(() => window.loudest(700))
  await page.mouse.move(kx, ky + 20); await page.mouse.down()
  got.peak = await key
  await page.mouse.up()
  Object.assign(got, await page.evaluate(() => ({ told: micTold().length, errors })))
  say(got.bell && got.peak > 0.02 && got.told === 1 && !got.errors.length, name, 'and with no microphone it says so on the picture and its keys play a bell', got)

  await browser.close()

  // --- the first moments, with a sound card that is silent until the page is touched: the microphone is asked for
  // at once, the sound still waits for a tap and says so, and neither holds the other up.
  browser = await playwright[name].launch(ALLOWED[name])
  const quiet = await browser.newContext({ viewport: { width: 800, height: 600 } })
  await quiet.addInitScript(PRETEND)
  const first = await quiet.newPage()
  if (name === 'chromium') await letWorkletsRun(first)
  for (const [mode, ready, state] of [['tone', true, 'on'], ['refused', false, 'refused']]) {
    await begin(first, 'const mic = useMicrophone()\nwindow.mic = mic\nconst take = recordSound(0.5)\nwindow.take = take\nfunction draw() { background("navy") }\n', '{ sound: { context: ruledCard() } }', mode)
    await until(first, 'scene.sound && scene.sound.state !== "loading"')
    got = { ready: await first.evaluate(() => Promise.race([mic.whenReady(), new Promise((done) => setTimeout(() => done('never'), 3000))])) }
    await first.evaluate(() => window.settle(1500))
    Object.assign(got, await first.evaluate(() => ({ before: scene.sound.state, asked: micAsked.length, mic: mic.state, waiting: told.filter((t) => /until the page has been touched/.test(t)).length, said: micTold(), errors })))
    await first.mouse.click(350, 20)
    got.on = await until(first, 'scene.sound.state === "on"')
    got.done = await until(first, 'take.done', 3000)
    Object.assign(got, { status: await status(first), ...(await first.evaluate(() => ({ seconds: take.seconds, waitingAfter: told.filter((t) => /until the page has been touched/.test(t)).length, saidAfter: micTold().length, errors }))) })
    say(got.ready === ready && got.asked === 1 && got.mic === state && got.before === 'waiting' && got.waiting === 1 && got.said.length === (ready ? 0 : 1) && got.on && got.done && (ready ? got.seconds > 0 : got.seconds === 0)
      && got.waitingAfter === got.waiting && got.saidAfter === got.said.length && !got.errors.length && got.status === 'running', name,
    `a scene whose first line is useMicrophone(), ${ready ? 'allowed' : 'refused'}: the microphone is asked for at once, before any tap, the console says once that nothing is heard or recorded until the page is touched${ready ? '' : ' and once that the microphone was not allowed'}, and after the tap the sound is on and the recording ${ready ? 'is made' : 'is empty and done'}`, got)
  }
  await browser.close()
}
server.close()
await rm(work, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
