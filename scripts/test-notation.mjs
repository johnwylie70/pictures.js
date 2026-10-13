#!/usr/bin/env node
/**
 * Sheet music (notation/notation.js) as a scene has it, in real browsers: that a scene which shows none asks for
 * nothing and no example would, that a scene which calls showNotes is given it in both spellings with nothing to
 * load (and the sound with it), that its music is drawn over the scene and under its controls, that a tune waits
 * for the sound to be on and then lights the note that is sounding, that a song is followed from its own place,
 * that a keyboard plays a page, that the music goes with the scene, and that `pictures build` carries the folder
 * only for a scene that uses it.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-notation.mjs
 *
 * How music is written out and laid out is measured in the library's own repository (notation.js:
 * scripts/test-notation.mjs). Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 * No sound is made, and no MIDI device is asked for.
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
const SHOTS = process.env.SHOTS || ''

// A small song in the sound's own format, version 2: a tune with a chord, an arpeggio and a glide, and a bass.
const SONG = { format: 'synths-song', version: 2, title: 'Test Tune', speed: 6, tempo: 150, channels: 2, order: [0, 0], patterns: [{ rows: 32, events: [
  { row: 0, ch: 0, note: 'C-5', ins: 1 }, { row: 4, ch: 0, note: 'E-5', ins: 1 }, { row: 8, ch: 0, note: 'G-5', ins: 1, chord: 'maj' }, { row: 12, ch: 0, note: 'A-5', ins: 1, glide: '1/16' },
  { row: 16, ch: 0, note: 'C-5', ins: 1, arp: { chord: 'min', rate: '1/16' } }, { row: 24, ch: 0, note: 'D-5', ins: 1 }, { row: 28, ch: 0, note: 'off' },
  { row: 0, ch: 1, note: 'C-3', ins: 2 }, { row: 8, ch: 1, note: 'G-2', ins: 2 }, { row: 16, ch: 1, note: 'A-2', ins: 2 }, { row: 24, ch: 1, note: 'F-2', ins: 2 },
] }], instruments: [{ name: 'tune', patch: 'keys' }, { name: 'bass', patch: 'bass' }] }

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.json': 'application/json' }
const asked = []
const server = createServer(async (request, reply) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname)
  if (path === '/test.html') {
    reply.writeHead(200, { 'content-type': 'text/html' })
    return reply.end('<!doctype html><body style="margin:0;background:#fff"><div id="s" style="position:relative;width:600px;height:480px"></div>')
  }
  if (path === '/tune.json') { reply.writeHead(200, { 'content-type': 'application/json' }); return reply.end(JSON.stringify(SONG)) }
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
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${browser}: ${what}${ok ? '' : `\n       got ${JSON.stringify(got)?.slice(0, 1200)}`}`)
}

async function play(page, source, { until = 'window.result !== undefined', wait = 6000 } = {}) {
  asked.length = 0
  const begin = () => page.evaluate(async (source) => {
    const { runScene } = await import('/pictures.js')
    window.scene?.stop()
    document.getElementById('s').replaceChildren()
    window.result = undefined
    window.error = null
    // (MIDI is switched off: a test must not reach for the devices of the computer it runs on.)
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', keyboard: true, midi: false, onError: (message, line) => { window.error = { error: message, line } } })
  }, source)
  try { await begin() } catch (e) {
    if (!/context was destroyed/i.test(String(e.message))) throw e
    await page.waitForLoadState('load').catch(() => {})
    await page.waitForTimeout(300)
    await begin()
  }
  await page.waitForFunction(`window.error || (${until})`, null, { timeout: wait }).catch(() => {})
  return page.evaluate(() => window.error || window.result || {})
}
// The pages of music of the scene's canvas, for a test: the stage the library keeps on it.
const PAGES = 'canvas[Symbol.for("notation.stage")].pages'
const LAYERS = `[...document.querySelector("#s canvas").parentElement.children].map((c) => c === canvas ? "scene" : c.dataset.notationLayer !== undefined ? "notation" : c.dataset.dialsLayer !== undefined ? "dials" : c.tagName.toLowerCase()).join()`
const DRAW = 'function draw() { background("navy") }\n'

// --- with no browser: what the text of a scene asks for
{
  const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
  const files = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()
  const want = []
  for (const f of files) if (sceneUses(await readFile(join(ROOT, 'examples', f), 'utf8')).notation) want.push(f)
  say(files.length >= 28 && want.length === 0, 'node', `none of the ${files.length} examples, which show no sheet music, would be sent it`, want)
  const uses = (text) => sceneUses(text)
  const yes = ['showNotes("C4 E4")', 'const page = show_notes("C4", "quarter")', 'const sheet = makeSheet()\nsheet.add("C4")', 'make_sheet({ key: "G" })']
  const no = ['function showNotes(n) { return n }\nshowNotes(1)', 'const makeSheet = () => 1\nmakeSheet()', '// showNotes("C4")\ntext("call showNotes to see notes", 1, 1)', 'const { showNotes } = await use("notation.js")\nshowNotes("C4")', 'playNotes("C4 E4")', 'const notes = [1, 2]\ncircle(notes[0], 1, 1)']
  say(yes.every((t) => uses(t).notation && uses(t).sound) && !no.some((t) => uses(t).notation), 'node', 'a scene is given sheet music (and the sound with it) when it calls showNotes or makeSheet, in either spelling, and not for a function of its own or a word in a comment', { missed: yes.filter((t) => !uses(t).notation), wrongly: no.filter((t) => uses(t).notation) })
  say(uses('playNotes("C4 E4")').sound && !uses('circle(1, 2, 3)').sound && !uses('circle(1, 2, 3)').notation, 'node', 'a scene with sound and no sheet music is not sent it, and a plain scene is sent neither', null)

  // The names a scene is given clash with none it already has.
  const text = await readFile(join(ROOT, 'pictures.js'), 'utf8')
  const list = (name) => JSON.parse(text.match(new RegExp(`\\nconst ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'))
  const mine = list('NOTATION_NAMES'), others = [...list('GIVEN'), ...list('SOUND_NAMES'), ...list('DIAL_NAMES'), ...list('SCENE_NAMES')]
  say(mine.length >= 2 && !mine.some((n) => others.includes(n)), 'node', `the names of sheet music (${mine.join(', ')}) are no other name a scene is given`, mine.filter((n) => others.includes(n)))

  // What a built folder carries.
  const work = await mkdtemp(join(tmpdir(), 'pictures-notation-'))
  try {
    await mkdir(join(work, 'src'))
    await writeFile(join(work, 'src', 'plain.js'), 'function draw() { background("navy"); circle(100, 100, 30, "gold") }\n')
    await writeFile(join(work, 'src', 'tune.js'), 'function draw() { background("navy") }\nshowNotes("C4 E4 G4", "quarter")\n')
    for (const name of ['plain', 'tune']) execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(work, 'src', `${name}.js`), '-o', join(work, `out-${name}`)], { stdio: 'ignore' })
    const has = (name, part) => existsSync(join(work, `out-${name}`, 'pictures', part))
    say(has('tune', 'notation/notation.js') && has('tune', 'notation/LICENSE-GLYPHS') && has('tune', 'sound/synths.js') && !has('plain', 'notation') && !has('plain', 'sound') && has('plain', 'pictures.js'), 'node', 'pictures build puts sheet music (with the licence of its symbols) and the sound in the folder of a scene that uses it, and of no other', { tune: has('tune', 'notation/notation.js'), plain: has('plain', 'notation') })
  } finally { await rm(work, { recursive: true, force: true }) }
  let said = ''
  try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'sync-siblings.mjs'), '--keep', '--check'], { encoding: 'utf8' }) } catch (e) { said = (e.stdout || e.message).trim() }
  say(!/names a scene is given/.test(said), 'node', 'the list of names in pictures.js is the one the copy of notation.js gives', said)
}

if (SHOTS) await mkdir(SHOTS, { recursive: true })
for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch (e) { console.log(`     ${name}: not installed, skipped`); continue }
  const page = await browser.newPage({ viewport: { width: 700, height: 560 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (process.env.WATCH) page.on('console', (m) => console.log('     says:', m.text().slice(0, 300)))
  await page.goto(`${at}/test.html`)

  let got = await play(page, `function draw() { background("navy"); circle(100, 100, 30, "gold") }\nawait frame(); await frame()\nwindow.result = { children: document.querySelector("#s canvas").parentElement.children.length }`)
  say(got.children === 1 && !asked.some((a) => /notation|sound\//.test(a)), name, 'a scene that shows no sheet music asks for nothing more and has one canvas', { got, asked: [...asked] })

  got = await play(page, `${DRAW}const page = showNotes("C4 E4 G4 - C5:2", "quarter", { title: "Up" })
const sheet = make_sheet({ key: "G" })
sheet.add("G4", "quarter")
const second = show_notes(sheet, { at: "bottom" })
const d = dial("speed", 0, 10)
setTimeout(async () => {
  for (let i = 0; i < 4; i++) await frame()
  const pages = ${PAGES}
  window.result = { layers: ${LAYERS}, pages: pages.length, notes: pages[0].plan.hits.length, key: pages[1].score.key, inside: page.x >= 0 && page.y >= 0 && page.x + page.width <= width && second.y + second.height <= height && page.y + page.height <= second.y,
    names: [typeof showNotes, typeof show_notes, typeof makeSheet, typeof make_sheet], sound: typeof playNote, on: typeof page.on_note }
}, 0)`)
  say(got.layers === 'scene,notation,notation,dials' && got.pages === 2 && got.notes === 4 && got.key === 1 && got.inside === true && got.names?.every((t) => t === 'function') && got.sound === 'function' && asked.includes('notation/notation.js') && asked.includes('sound/synths.js'),
    name, 'a scene that calls showNotes is given it and makeSheet in both spellings, and the sound, with nothing to load; its pages are drawn over the scene and under its controls, inside the picture', { got, asked: [...asked] })
  if (SHOTS && name === 'chromium') await page.screenshot({ path: join(SHOTS, 'two-pages.png'), clip: { x: 0, y: 0, width: 600, height: 480 } })

  // A tune is begun when the sound is on. Before the page is touched the sound's clock runs, and nothing must light.
  got = await play(page, `${DRAW}const page = showNotes("C4 E4 G4 C5 E5 G5 C6 G5", "quarter", { tempo: 160 })
window.began = []
page.onNote = (note) => window.began.push([note.name, soundTime()])
page.play()
window.page = page
window.state = () => ({ playing: page.playing, lit: page.sounding, on: window.scene.sound.state, began: window.began.length })
setTimeout(async () => { for (let i = 0; i < 3; i++) await frame(); window.result = 1 }, 0)`)
  const before = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 700)); return window.state() })
  await page.mouse.click(300, 400)
  await page.waitForFunction('window.error || window.began.length >= 5', null, { timeout: 12000 }).catch(() => {})
  const after = await page.evaluate(() => {
    const b = window.began
    return { on: window.scene.sound.state, names: b.slice(0, 5).map((n) => n[0]), gaps: b.slice(1, 5).map((n, i) => Math.round((n[1] - b[i][1]) * 1000)), lit: window.page.sounding, error: window.error }
  })
  // (Headless browsers let a page play before it is touched; where one does, the tune simply begins at once.)
  const waited = before.on === 'on' ? before.began > 0 : before.playing === true && before.began === 0 && before.lit.length === 0
  say(waited && !after.error && after.on === 'on' && String(after.names) === 'C4,E4,G4,C5,E5' && after.gaps.every((g) => Math.abs(g - 375) < 60) && after.lit.length === 1, name,
    `page.play() waits until the sound is on (it was "${before.on}" before the click) and then says each note as it begins, a quarter note apart on the sound's clock`, { before, after })
  if (SHOTS && name === 'chromium') await page.screenshot({ path: join(SHOTS, 'playing.png'), clip: { x: 0, y: 0, width: 600, height: 480 } })

  // A song in format version 2, followed from its own place.
  got = await play(page, `${DRAW}const written = await loadJSON("/tune.json")
const song = playSong("/tune.json", { patches: { tune: "keys", bass: "bass" } })
const page = showNotes(written, { follow: song })
window.seen = []
function update() {
  const p = song.position
  if (p.state !== "playing") return
  const row = p.order * 32 + p.row + p.tick / p.speed
  window.seen.push({ row, beat: page.beat, bass: page.active.filter((e) => e.staff === 1).map((e) => e.sounds[0])[0] })
}
window.info = () => ({ staves: page.score.staves.map((s) => s.name + ":" + s.clef), first: page.score.staves[0].events.slice(0, 5).map((e) => [e.start / 8, e.sounds, e.arp]), bars: page.score.bars })`, { until: 'window.scene.sound && window.scene.sound.state !== "loading"', wait: 20000 })
  await page.mouse.click(300, 400)
  await page.waitForFunction('window.error || window.seen.length > 90', null, { timeout: 15000 }).catch(() => {})
  got = await page.evaluate(() => {
    const want = (row) => [[0, 48], [8, 43], [16, 45], [24, 41]].filter(([r]) => r <= row % 32).pop()[1]
    const edge = (row) => Math.min(...[0, 8, 16, 24, 32].map((r) => Math.abs(r - (row % 32))))
    const wrong = window.seen.filter((s) => s.bass !== want(s.row))
    return { error: window.error, n: window.seen.length, rows: window.seen.length ? window.seen[window.seen.length - 1].row - window.seen[0].row : 0, worst: Math.max(0, ...wrong.map((s) => edge(s.row))), off: Math.max(0, ...window.seen.map((s) => Math.abs(s.beat - s.row / 4))), ...window.info() }
  })
  say(!got.error && got.n > 90 && got.rows > 8 && got.worst <= 1 && got.off < 0.3 && String(got.staves) === 'tune:treble,bass:bass' && got.bars === 4
    && JSON.stringify(got.first) === JSON.stringify([[0, [72], false], [1, [76], false], [2, [79, 83, 86], false], [4, [72, 75, 79], true], [6, [74], false]]), name,
    `a song in format version 2 is written out (a chord together, an arpeggio as its chord with a wavy line, a glide not a new note) and followed: the bass note that is lit is the one the song's rows give, to within a row (worst ${got.worst?.toFixed?.(2)} over ${got.n} frames)`, got)

  // A keyboard from the dials plays a page, in the page.
  got = await play(page, `${DRAW}const lead = makeSynth("keys")
const page = showNotes("C4 E4 G4", "quarter")
page.playAlong({ mode: "wait", synth: lead })
const piano = keyboard(page, { octave: 4, octaves: 1 })
window.page = page
setTimeout(async () => { for (let i = 0; i < 5; i++) await frame(); const b = canvas.getBoundingClientRect(); window.result = { keys: [0, 2, 1].map((i) => [b.left + piano.x + piano.w / 8 * (i + 0.5), b.top + piano.y + piano.h * 0.85]), hint: page.notes() } }, 0)`)
  for (const [x, y] of got.keys || []) { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(60) }
  const tally = await page.evaluate(() => window.error || { right: window.page.result.right, wrong: window.page.result.wrong, next: window.page.notes() })
  say(String(got.hint) === '60' && tally.right === 2 && tally.wrong === 1 && String(tally.next) === '67', name, 'keyboard(page) plays a page that waits for a learner: two right keys and a wrong one are counted, and the key to press next is the one it lights', { got, tally })

  got = await play(page, `${DRAW}showNotes("C4 E4", "quarter"); showNotes("C3", { at: "bottom" })\nsetTimeout(async () => { for (let i = 0; i < 3; i++) await frame(); window.kept = document.querySelector("#s [data-notation-layer]"); window.result = { layers: ${LAYERS} } }, 0)`)
  const gone = await page.evaluate(async () => { window.scene.stop(); await new Promise((r) => setTimeout(r, 80)); return { layers: document.querySelectorAll('#s [data-notation-layer]').length, attached: window.kept?.isConnected } })
  say(got.layers === 'scene,notation,notation' && gone.layers === 0 && gone.attached === false, name, 'a scene that is stopped takes its sheet music with it', { got, gone })

  got = await play(page, `${DRAW}const tune = "C4 E4 H4"\nshowNotes(tune, "quarter")`)
  say(/"H4" is not a note/.test(got.error || '') && (got.line === 3 || name === 'webkit'), name, 'a mistake in the notes is said in plain words, with its line where the browser gives it', got)

  // Every program on the Sheet music page of the docs is run as it is written.
  const programs = [...(await readFile(join(ROOT, 'docs', 'sheet-music.md'), 'utf8')).matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1].replace(/"tune\.json"/g, '"/tune.json"'))
  const broken = []
  await page.goto(`${at}/test.html`)
  for (const [i, program] of programs.entries()) {
    got = await play(page, program, { until: `window.scene && window.scene.canvas && window.scene.canvas[Symbol.for("notation.stage")]?.pages[0]?.plan?.hits.length > 0`, wait: 8000 })
    await page.waitForTimeout(150)
    const shown = await page.evaluate(() => { const c = document.querySelector('#s [data-notation-layer] canvas'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 53) seen.add(d[i] >> 5 << 6 | d[i + 1] >> 5 << 3 | d[i + 2] >> 5); return seen.size })
    const error = await page.evaluate(() => window.error)
    if (error || got.error || shown < 3) broken.push({ program: program.slice(0, 60), got, error, shown })
    if (SHOTS && name === 'chromium' && i === 0) await page.screenshot({ path: join(SHOTS, 'docs-first.png'), clip: { x: 0, y: 0, width: 600, height: 480 } })
  }
  say(programs.length >= 6 && broken.length === 0, name, `the ${programs.length} programs on the Sheet music page of the docs each run and draw their music`, broken)

  say(errors.length === 0, name, 'no case left an error on its page', errors)
  await browser.close()
}
server.close()
console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
