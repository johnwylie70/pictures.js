#!/usr/bin/env node
/**
 * The kinetic text (kinetic/kinetic.js) as a scene has it, in real browsers: that a scene which names none asks
 * for nothing, that one which does is given every effect in both spellings, that the two examples that use
 * them (kinetic_gallery.js, hook.js) draw frames at 1920x1080 and at 1080x1920 that are not blank, that change
 * with time, that stay inside the safe area of their shape, that are the same pixels when drawn twice and make no
 * call to Math.random, that no text is smaller than the minimum, and that `pictures build` carries the folder
 * only for a scene that uses it. Stills of the frames are laid out in a contact sheet to look at.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-kinetic.mjs
 *   SHEETS=/some/folder  where the contact sheets go (the system's temporary folder otherwise)
 *
 * Chromium, and WebKit when Playwright has it (the first of them draws the contact sheets). No sound, no microphone.
 * It ends with code 1 if a case fails.
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
const SHEETS = process.env.SHEETS || (await mkdtemp(join(tmpdir(), 'kinetic-sheets-')))
await mkdir(SHEETS, { recursive: true })

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' }
const asked = []
const server = createServer(async (request, reply) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname)
  if (path === '/test.html') {
    reply.writeHead(200, { 'content-type': 'text/html' })
    return reply.end('<!doctype html><body style="margin:0;background:#fff"><div id="s" style="position:relative;width:100vw;height:100vh"></div>')
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

// The two shapes under test, and the safe area each must keep (the contract's numbers, written out here on purpose).
const FORMATS = {
  '16x9': { w: 1920, h: 1080, safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
  '9x16': { w: 1080, h: 1920, safe: { top: 0.14, bottom: 0.18, side: 0.06 } },
}
// The effects the gallery shows, in order, and the stills of each: just begun, moving, and at the end of its three seconds.
const GALLERY = ['wordSlam', 'letterWave', 'letterBounce', 'typewriterText', 'glitchText', 'maskReveal', 'scalePop', 'tickerText', 'countUp', 'highlightSweep']
const GALLERY_AT = [0.05, 0.9, 2.9]
const HOOK_AT = [0, 3, 6.2]
const NAMES = ['wordSlam', 'letterWave', 'letterBounce', 'typewriterText', 'glitchText', 'maskReveal', 'scalePop', 'tickerText', 'countUp', 'highlightSweep', 'kineticText', 'kineticTime', 'kineticSafe', 'kineticEffects', 'houseStyle', 'seededRandom']

// --- with no browser: what the text of a scene asks for, and what a built folder carries
{
  const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
  const files = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()
  const users = []
  for (const f of files) if (sceneUses(await readFile(join(ROOT, 'examples', f), 'utf8')).kinetic) users.push(f)
  say(JSON.stringify(users) === JSON.stringify(['hook.js', 'kinetic_gallery.js']), 'node', `of the ${files.length} examples only hook.js and kinetic_gallery.js would be sent the moving text`, users)
  const uses = (text) => sceneUses(text).kinetic
  const yes = ['wordSlam("Hi")', 'word_slam("Hi")', 'count_up("5")', 'const s = houseStyle.palette.ink', 'kineticText("slam", "Hi")', 'if (x) highlight_sweep("a *b*")']
  const no = ['function wordSlam(t) { return t }\nwordSlam(1)', 'const countUp = 3\ncircle(countUp, 1, 1)', '// wordSlam("Hi")\ntext("call wordSlam", 1, 1)', 'ship.scalePop()', 'let houseStyle\nhouseStyle = 1']
  say(yes.every(uses) && !no.some(uses), 'node', 'a scene is given the moving text when it calls one, in either spelling, and not for a word of its own or in a comment', { missed: yes.filter((t) => !uses(t)), wrongly: no.filter(uses) })
  const work = await mkdtemp(join(tmpdir(), 'pictures-kinetic-'))
  try {
    await mkdir(join(work, 'src'))
    await writeFile(join(work, 'src', 'plain.js'), 'function draw() { background("navy"); circle(100, 100, 30, "gold") }\n')
    await writeFile(join(work, 'src', 'moving.js'), 'function draw() { background("navy"); wordSlam("Hi") }\n')
    for (const name of ['plain', 'moving']) execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(work, 'src', `${name}.js`), '-o', join(work, `out-${name}`)], { stdio: 'ignore' })
    const has = (name, file) => existsSync(join(work, `out-${name}`, 'pictures', 'kinetic', file))
    say(has('moving', 'kinetic.js') && !existsSync(join(work, 'out-plain', 'pictures', 'kinetic')), 'node', 'pictures build puts kinetic/ in the folder of a scene that uses one, and of no other', { moving: has('moving', 'kinetic.js'), plain: existsSync(join(work, 'out-plain', 'pictures', 'kinetic')) })
  } finally { await rm(work, { recursive: true, force: true }) }
}

// What a page does with a scene: the scene is run, and `window.grab(t)` draws it at t seconds and says what is on the canvas.
const PAGE = `
window.__random = 0
Math.random = () => { window.__random++; return 0.5 }
window.grab = async (t, ink, safe) => {
  window.__seek(t)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const c = document.querySelector('#s canvas')
  const w = c.width, h = c.height
  const d = c.getContext('2d').getImageData(0, 0, w, h).data
  let lit = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, sum = 0, outside = 0
  const left = safe.left * w, right = (1 - safe.side) * w, top = safe.top * h, bottom = (1 - safe.bottom) * h
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    sum = (Math.imul(sum, 31) + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) | 0
    if (Math.abs(d[i] - ink[0]) + Math.abs(d[i + 1] - ink[1]) + Math.abs(d[i + 2] - ink[2]) < 30) continue
    lit++
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    if (x < left - 1 || x > right + 1 || y < top - 1 || y > bottom + 1) outside++
  }
  // A small picture of it for the contact sheet.
  const small = document.createElement('canvas')
  small.width = Math.round(w / 4); small.height = Math.round(h / 4)
  small.getContext('2d').drawImage(c, 0, 0, small.width, small.height)
  return { lit, box: [x0, y0, x1, y1], sum, outside, random: window.__random, png: small.toDataURL('image/png') }
}
`
// (Chromium now and then loses the page's context as a scene is replaced, though nothing navigates: the scene is started again.)
async function scene(page, source, seek = true) {
  try { await start(page, source, seek) } catch (e) {
    if (!/context was destroyed/i.test(String(e.message))) throw e
    await page.waitForTimeout(300)
    await start(page, source, seek)
  }
  await page.waitForFunction('window.error || window.__ready', null, { timeout: 8000 })
  const error = await page.evaluate(() => window.error)
  if (error) throw new Error(`${error.error} (line ${error.line})`)
}
async function start(page, source, seek) {
  await page.evaluate(async ([source, helper, seek]) => {
    const { runScene } = await import('/pictures.js')
    window.scene?.stop()
    document.getElementById('s').replaceChildren()
    window.error = null
    window.__ready = false
    window.scene = runScene(document.getElementById('s'), { source: source + (seek ? '\nwindow.__seek = (t) => kineticTime(t, { hold: true })' : '') + '\nwindow.__ready = true\n', name: 'scene.js', onError: (m, line) => { window.error = { error: m, line } } })
    ;(0, eval)(helper)
  }, [source, PAGE, seek])
}

// The page at the size of a frame, fresh (a resize alone can leave the scene's page without its context).
const resized = async (page, f) => { await page.setViewportSize({ width: f.w, height: f.h }); await page.goto(`${at}/test.html`) }
let first = true
for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch (e) { console.log(`     ${name}: not installed, skipped`); continue }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${at}/test.html`)

  // A scene that names none asks for nothing.
  asked.length = 0
  await scene(page, 'function draw() { background("navy"); circle(100, 100, 30, "gold") }', false)
  await page.waitForTimeout(200)
  say(!asked.some((a) => /kinetic/.test(a)), name, 'a scene that uses no moving text asks for nothing of it', [...asked])

  // Every name, in both spellings, and the helpers.
  await scene(page, `function draw() { background("navy") }\nwindow.found = [${NAMES.map((n) => `["${n}", typeof ${n}]`).join(', ')}]\nwindow.snake = [typeof word_slam, typeof letter_bounce, typeof typewriter_text, typeof kinetic_text, typeof house_style, typeof seeded_random, typeof count_up]`)
  const names = await page.evaluate(() => ({ found: window.found, snake: window.snake }))
  say(names.found.every(([n, t]) => (n === 'houseStyle' ? t === 'object' : t === 'function')) && names.snake.every((t) => t === (t === 'object' ? 'object' : 'function')) && names.snake.filter((t) => t !== 'function').length === 1, name, 'a scene that uses one is given every name of the kit, in both spellings (house_style is the style object)', names)

  // Seeded random: the same numbers for the same seed.
  await scene(page, 'function draw() { background("navy") }\nconst a = seededRandom(7), b = seededRandom(7), c = seededRandom(8)\nwindow.rolls = [[a(), a(), a()], [b(), b(), b()], [c()]]')
  const rolls = await page.evaluate(() => window.rolls)
  say(JSON.stringify(rolls[0]) === JSON.stringify(rolls[1]) && rolls[0][0] !== rolls[2][0] && rolls[0].every((x) => x >= 0 && x < 1), name, 'seededRandom(seed) gives the same numbers for the same seed', rolls)

  // Sizes and mistakes, in both shapes.
  for (const [shape, f] of Object.entries(FORMATS)) {
    await resized(page, f)
    await scene(page, `function draw() { background("navy") }
const out = {}
for (const [k, fn] of [["slam", wordSlam], ["wave", letterWave], ["bounce", letterBounce], ["type", typewriterText], ["glitch", glitchText], ["reveal", maskReveal], ["pop", scalePop], ["ticker", tickerText], ["count", countUp], ["highlight", highlightSweep]]) {
  out[k] = [fn("tiny text here", { t: 9, size: 8 }).size, fn("A very long line of words that cannot fit on one line of a phone, so it must wrap onto several", { t: 9 }).size]
}
let said = ""
try { kineticText("spin", "x") } catch (e) { said = e.message }
let styled = ""
try { wordSlam("x", { style: "loud" }) } catch (e) { styled = e.message }
window.sizes = { out, said, styled, before: wordSlam("late", { start: 5, t: 1 }) }`)
    const got = await page.evaluate(() => window.sizes)
    const min = f.h * 0.03
    const small = Object.entries(got.out).filter(([, s]) => s.some((v) => v < min - 0.01))
    say(!small.length && /no kinetic effect "spin"/.test(got.said) && /no style "loud"/.test(got.styled) && got.before === null, name, `${shape}: no effect sets text smaller than ${Math.round(min)} px (3 percent of the height), a tiny size is raised to it, and a wrong name says what to use`, { small, said: got.said, styled: got.styled, before: got.before })
  }

  // The wipe does not cut the first letter: while it uncovers the text, which slides half a letter as it comes, the
  // leftmost pixel of the text is where the finished text's is, less that slide, at every moment the letter is there.
  for (const [shape, f] of Object.entries(FORMATS)) {
    await resized(page, f)
    await scene(page, 'function draw() { background(houseStyle.palette.ink); window.__ret = maskReveal("Press run.", { start: 0, duration: 0.9, size: "title" }) }')
    const left = (t) => page.evaluate(async (t) => {
      window.__seek(t)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const c = document.querySelector('#s canvas'), w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data
      let x0 = w
      for (let y = 0; y < h; y++) for (let x = 0; x < x0; x++) { const i = (y * w + x) * 4; if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) { x0 = x; break } }
      return { x0: x0 === w ? null : x0, size: window.__ret?.size }
    }, t)
    await page.evaluate(() => {})
    const done = await left(2)
    const rows = []
    for (const u of [0.4, 0.55, 0.7, 0.85, 0.95]) {
      const e = u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2
      const got = await left(u * 0.9)
      const want = done.x0 - (1 - e) * done.size * 0.5
      rows.push({ u, got: got.x0, want: Math.round(want) })
    }
    // (Until the edge of the wipe has reached the letter nothing white is drawn: only frames with some are compared.)
    const seen = rows.filter((r) => r.got !== null)
    const cut = seen.filter((r) => Math.abs(r.got - r.want) > 3)
    say(done.x0 !== null && seen.length >= 3 && !cut.length, name, `${shape}: maskReveal does not clip the first letter while it wipes (its left edge is where the finished text's is, less the slide)`, { done, rows })
  }

  // The examples, a few frames each, in both shapes.
  const INK = [11, 16, 32]
  const sets = {}
  const grab = (page, t, f) => page.evaluate(([t, ink, safe]) => window.grab(t, ink, safe), [t, INK, f.safe])
  for (const [file, label] of [['kinetic_gallery.js', 'gallery'], ['hook.js', 'hook']]) {
    const source = await readFile(join(ROOT, 'examples', file), 'utf8')
    const times = label === 'gallery' ? GALLERY.flatMap((effect, i) => GALLERY_AT.map((t) => ({ effect, t: i * 3 + t }))) : HOOK_AT.map((t) => ({ effect: 'hook', t }))
    for (const [shape, f] of Object.entries(FORMATS)) {
      await resized(page, f)
      await scene(page, source)
      const frames = []
      for (const { effect, t } of times) frames.push({ effect, t, ...(await grab(page, t, f)) })
      sets[`${shape}-${label}`] = frames
      const where = `${file} at ${f.w}x${f.h}`
      // Not blank once it is moving or has ended (the first still of each effect may be: an effect begins when it starts).
      const blank = frames.filter((fr, i) => i % 3 !== 0 && fr.lit < 400).map((fr) => `${fr.effect}@${fr.t}`)
      say(!blank.length, name, `${where}: every still of an effect that is moving or has ended has text in it`, blank)
      // Moves: an effect's three stills are not all the same pixels.
      const still = [...new Set(frames.map((fr) => fr.effect))].filter((e) => new Set(frames.filter((fr) => fr.effect === e).map((fr) => fr.sum)).size < 2)
      say(!still.length, name, `${where}: what is drawn changes over time`, still)
      // Safe: nothing is drawn outside the safe area of its shape.
      const spill = frames.filter((fr) => fr.outside > 0).map((fr) => `${fr.effect}@${fr.t}: ${fr.outside} px, box ${fr.box}`)
      say(!spill.length, name, `${where}: nothing is drawn outside the safe area (top ${f.safe.top * 100}%, bottom ${f.safe.bottom * 100}%, sides ${f.safe.side * 100}%)`, spill)
      // Pure: no call to Math.random, and a second run draws the same pixels.
      const calls = Math.max(...frames.map((fr) => fr.random))
      await scene(page, source)
      const again = []
      for (const { effect, t } of times) again.push({ effect, t, ...(await grab(page, t, f)) })
      const differ = frames.filter((fr, i) => fr.sum !== again[i].sum).map((fr) => `${fr.effect}@${fr.t}`)
      say(calls === 0 && !differ.length, name, `${where}: Math.random is never called, and drawn twice it is the same pixels`, { calls, differ })
    }
  }
  say(!errors.length, name, 'no page error was raised', errors)

  // Contact sheets of the stills, from the first browser that is here.
  if (first) {
    first = false
    for (const [shape, f] of Object.entries(FORMATS)) {
      const cells = [...sets[`${shape}-gallery`], ...sets[`${shape}-hook`]]
      const tall = f.h > f.w
      const sheet = await browser.newPage({ viewport: { width: tall ? 1700 : 1500, height: 800 }, deviceScaleFactor: 1 })
      await sheet.setContent(`<body style="margin:0;background:#222;color:#ccc;font:13px system-ui"><div style="display:grid;grid-template-columns:repeat(${tall ? 6 : 3}, auto);gap:6px;padding:6px;width:max-content">${cells.map((c) => `<figure style="margin:0"><img src="${c.png}" style="display:block;outline:1px solid #555"><figcaption>${c.effect} t=${c.t}</figcaption></figure>`).join('')}</div>`)
      await sheet.waitForFunction(() => [...document.images].every((i) => i.complete))
      const file = join(SHEETS, `kinetic-contact-${shape}.png`)
      await sheet.screenshot({ path: file, fullPage: true })
      await sheet.close()
      console.log(`     ${name}: contact sheet ${file}`)
    }
  }
  await browser.close()
}
server.close()
console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
