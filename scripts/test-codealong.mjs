#!/usr/bin/env node
/**
 * The code-along scene (codealong/codealong.js) as a scene has it, in real browsers: that a scene which names none asks for nothing,
 * that one which does is given every name in both spellings, that the typing is a pure function of time (which stage, how many
 * characters, fitted to the duration), that the tokenizer colours both languages, that the example (code_along_circle.js) draws frames
 * at 1920x1080 and at 1080x1920 that are not blank, stay inside the safe area, show the code typed a little more each time, show
 * what each stage really draws in the preview, are the same pixels when drawn twice and make no call to Math.random, that no text is
 * smaller than the minimum, that mistakes are shown and reported (a stage that does not run, a Python stage with no preview, a line
 * over the budget), and that `pictures build` carries the folders only for a scene that uses it. Stills are laid out in a contact
 * sheet to look at.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-codealong.mjs
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
const SHEETS = process.env.SHEETS || (await mkdtemp(join(tmpdir(), 'codealong-sheets-')))
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
// The example's stills: typing the first stage, its hold, the second stage, its hold, the third, and the end.
const TIMES = [0.3, 0.9, 1.6, 2.6, 5.5, 6.8, 8.6, 10, 11.9]
const NAMES = ['codeAlong', 'codeAlongStageAt', 'codeAlongBegin', 'codeAlongEnd']

// --- with no browser: the pure helpers, the tokenizer, what the text of a scene asks for, and what a built folder carries
const lib = await import(pathToFileURL(join(ROOT, 'codealong', 'codealong.js')).href)
{
  const stages = [
    { code: 'function draw() {\n  background("navy")\n}' },
    { code: 'function draw() {\n  background("navy")\n  circle(50, 50, 20)\n}', hold: 2 },
    { code: 'let r = 5\nfunction draw() {\n  background("navy")\n  circle(50, 50, r)\n}' },
  ]
  const frames = []
  for (let t = 0; t <= 12; t += 0.05) frames.push({ t, ...lib.stageAt(stages, t, { duration: 12 }) })
  const order = frames.every((f, i) => i === 0 || f.stage >= frames[i - 1].stage)
  const typed = frames.every((f, i) => i === 0 || f.stage > frames[i - 1].stage || f.typed >= frames[i - 1].typed)
  say(order && typed, 'node', 'stageAt: the stage never goes back, and within a stage the characters typed never fall', frames.filter((f, i) => i && (f.stage < frames[i - 1].stage || (f.stage === frames[i - 1].stage && f.typed < frames[i - 1].typed))).slice(0, 3))
  say(frames[0].typed === 0 && frames[0].text === '' && frames[0].stage === 0, 'node', 'stageAt: at 0 nothing is typed, and the first stage is the one being typed', frames[0])
  const ends = [0, 1, 2].map((i) => frames.filter((f) => f.stage === i && f.phase === 'hold').pop())
  say(ends.every((f, i) => f && f.text === stages[i].code && f.typed === f.inserted), 'node', 'stageAt: when a stage is typed its text is exactly its code', ends.map((f) => f?.text))
  say(ends[1].inserted === 20 && ends[2].inserted < stages[2].code.length / 2, 'node', 'stageAt: a later stage types only what changed (stage 2 types its one new line, 20 characters; stage 3 less than half of its code)', ends.map((f) => f.inserted))
  const whole = lib.stageAt(stages, 5, { duration: 12 })
  say(Math.abs(whole.total - 12) < 1e-6 && lib.stageAt(stages, 99, { duration: 12 }).phase === 'done' && lib.stageAt(stages, 99, { duration: 12 }).stage === 2, 'node', 'stageAt: the whole beat is fitted to duration, and after it the last stage stays', { total: whole.total })
  const fast = lib.stageAt(stages, 1, { duration: 3 }), slow = lib.stageAt(stages, 1, { duration: 12 })
  say(fast.rate > slow.rate && Math.abs(fast.total - 3) < 1e-6, 'node', 'stageAt: a short duration types faster (and still ends on time)', { fast: fast.rate, slow: slow.rate, total: fast.total })
  const same = JSON.stringify(lib.stageAt(stages, 4.321, { duration: 12 })) === JSON.stringify(lib.stageAt(stages, 4.321, { duration: 12 }))
  say(same, 'node', 'stageAt is the same answer every time it is asked', null)
  const hurried = lib.stageAt([{ code: 'x'.repeat(2000) }], 0, { duration: 2 })
  say(hurried.warnings.some((w) => /too fast/.test(w)), 'node', 'a beat too short for its code says so in warnings', hurried.warnings)
  const kinds = (code, lang) => lib.tokenize(code, lang).flat().filter((t) => t.kind !== 'plain' && t.kind !== 'punct').map((t) => `${t.kind}:${t.text}`)
  const js = kinds('const r = 20 // size\nfunction draw() { circle(1, 2, "gold") }', 'javascript')
  const py = kinds('def draw():\n    x = 3.5  # size\n    circle(x, 2, "gold", True)', 'python')
  say(['keyword:const', 'number:20', 'comment:// size', 'keyword:function', 'fn:draw', 'fn:circle', 'string:"gold"'].every((k) => js.includes(k)), 'node', 'the tokenizer colours JavaScript: keywords, numbers, comments, function names, strings', js)
  say(['keyword:def', 'fn:draw', 'number:3.5', 'comment:# size', 'fn:circle', 'string:"gold"', 'constant:True'].every((k) => py.includes(k)), 'node', 'the tokenizer colours Python the same way', py)
  const multi = lib.tokenize('"""a\nb""" + 1\n/* c */', 'python').flat().map((t) => t.kind)
  say(multi.filter((k) => k === 'string').length === 2, 'node', 'a Python triple-quoted string spans lines', multi)
  let said = ''
  try { lib.tokenize('x', 'cobol') } catch (e) { said = e.message }
  say(/no tokenizer for "cobol"/.test(said), 'node', 'a language with no tokenizer says what to use', said)

  // Typing synced to a voice-over: a stage that says when it begins is typed then, and the others follow.
  const synced = [{ code: 'a = 1' }, { code: 'a = 1\nb = 2', at: 4, typeTime: 1 }, { code: 'a = 1\nb = 2\nc = 3', typeAt: 0.75 }]
  const timed = lib.plan(synced, { duration: 12 }).segments.map((s) => [s.typeStart, s.typeEnd, s.holdEnd].map((x) => Math.round(x * 1000) / 1000))
  say(timed[1][0] === 4 && timed[1][1] === 5 && timed[2][0] === 9 && timed[0][2] === 4 && timed[1][2] === 9 && timed[2][2] === 12, 'node', 'a stage may say when its typing begins (at: seconds, typeAt: a share of duration) and how long it takes (typeTime); the others follow, and the last is held to the end', timed)
  const during = lib.stageAt(synced, 4.5, { duration: 12 })
  say(during.stage === 1 && during.phase === 'type' && lib.stageAt(synced, 3.9, { duration: 12 }).stage === 0 && lib.stageAt(synced, 3.9, { duration: 12 }).phase === 'hold', 'node', 'stageAt follows those times: stage 1 is typing at 4.5, and stage 0 is held until 4', { stage: during.stage, phase: during.phase })
  // Lines are cut after a comma or an opening bracket, never leaving a lone bracket.
  const cut = (text, cols) => lib.wrap(text, cols).map((r) => text.slice(r.at, r.at + r.to - r.from))
  const rows = cut('  circle(x, y, 80, "gold")', 18).concat(cut('background("navy")', 12))
  say(JSON.stringify(rows) === JSON.stringify(['  circle(x, y, 80, ', '"gold")', 'background(', '"navy")']), 'node', 'a line is cut after a comma or an opening bracket, keeping the argument whole', rows)

  const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)
  const files = (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()
  const users = []
  for (const f of files) if (sceneUses(await readFile(join(ROOT, 'examples', f), 'utf8')).codealong) users.push(f)
  say(JSON.stringify(users) === JSON.stringify(['code_along_circle.js']), 'node', `of the ${files.length} examples only code_along_circle.js would be sent the code-along`, users)
  const uses = (text) => sceneUses(text).codealong
  const yes = ['codeAlong({ stages: [] })', 'code_along(stages=1)', 'codeAlongStageAt(s, 1)', 'if (x) code_along_stage_at(a, 2)']
  const no = ['function codeAlong(t) { return t }\ncodeAlong(1)', '// codeAlong({})\ntext("call codeAlong", 1, 1)', 'ship.codeAlong()', 'wordSlam("Hi")']
  say(yes.every(uses) && !no.some(uses), 'node', 'a scene is given the code-along when it calls one, in either spelling, and not for a word of its own or in a comment', { missed: yes.filter((t) => !uses(t)), wrongly: no.filter(uses) })
  const work = await mkdtemp(join(tmpdir(), 'pictures-codealong-'))
  try {
    await mkdir(join(work, 'src'))
    await writeFile(join(work, 'src', 'plain.js'), 'function draw() { background("navy"); circle(100, 100, 30, "gold") }\n')
    await writeFile(join(work, 'src', 'along.js'), 'function draw() { background("navy"); codeAlong({ stages: ["a"] }) }\n')
    for (const name of ['plain', 'along']) execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(work, 'src', `${name}.js`), '-o', join(work, `out-${name}`)], { stdio: 'ignore' })
    const has = (name, folder, file) => existsSync(join(work, `out-${name}`, 'pictures', folder, file))
    say(has('along', 'codealong', 'codealong.js') && has('along', 'kinetic', 'kinetic.js') && !existsSync(join(work, 'out-plain', 'pictures', 'codealong')) && !existsSync(join(work, 'out-plain', 'pictures', 'kinetic')), 'node', 'pictures build puts codealong/ (and the kinetic/ it takes its look from) in the folder of a scene that uses it, and of no other', { codealong: has('along', 'codealong', 'codealong.js'), kinetic: has('along', 'kinetic', 'kinetic.js'), plain: existsSync(join(work, 'out-plain', 'pictures', 'codealong')) })
  } finally { await rm(work, { recursive: true, force: true }) }
}

// What a page does with a scene: the scene is run, and `window.grab(t)` draws it at t seconds and says what is on the canvas.
const PAGE = `
window.__random = 0
Math.random = () => { window.__random++; return 0.5 }
const near = (d, i, c, tol) => Math.abs(d[i] - c[0]) <= tol && Math.abs(d[i + 1] - c[1]) <= tol && Math.abs(d[i + 2] - c[2]) <= tol
window.grab = async (t, ink, safe) => {
  window.__seek(t)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const c = document.querySelector('#s canvas')
  const w = c.width, h = c.height
  const d = c.getContext('2d').getImageData(0, 0, w, h).data
  let lit = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, sum = 0, outside = 0, gold = 0, coloured = 0
  const left = safe.left * w, right = (1 - safe.side) * w, top = safe.top * h, bottom = (1 - safe.bottom) * h
  const COLOURS = [[244, 114, 182], [34, 211, 238], [52, 211, 153], [250, 204, 21]]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    sum = (Math.imul(sum, 31) + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) | 0
    if (near(d, i, [255, 215, 0], 8)) gold++
    if (COLOURS.some((k) => near(d, i, k, 6))) coloured++
    if (Math.abs(d[i] - ink[0]) + Math.abs(d[i + 1] - ink[1]) + Math.abs(d[i + 2] - ink[2]) < 30) continue
    lit++
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    if (x < left - 1 || x > right + 1 || y < top - 1 || y > bottom + 1) outside++
  }
  const small = document.createElement('canvas')
  small.width = Math.round(w / 4); small.height = Math.round(h / 4)
  small.getContext('2d').drawImage(c, 0, 0, small.width, small.height)
  return { lit, box: [x0, y0, x1, y1], sum, outside, gold, coloured, random: window.__random, info: window.__info ? JSON.parse(JSON.stringify(window.__info)) : null, png: small.toDataURL('image/png') }
}
`
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
    window.__info = null
    window.scene = runScene(document.getElementById('s'), { source: source + (seek ? '\nwindow.__seek = (t) => kineticTime(t, { hold: true })' : '') + '\nwindow.__ready = true\n', name: 'scene.js', onError: (m, line) => { window.error = { error: m, line } } })
    ;(0, eval)(helper)
  }, [source, PAGE, seek])
}
// A scene that draws one code-along with these options, and keeps what it returns.
const probe = (options) => `function draw() { background(houseStyle.palette.ink); window.__info = codeAlong(${options}) }`

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
  say(!asked.some((a) => /codealong/.test(a)), name, 'a scene that uses no code-along asks for nothing of it', [...asked])

  // Every name, in both spellings.
  await scene(page, `function draw() { background("navy") }\nwindow.found = [${NAMES.map((n) => `["${n}", typeof ${n}]`).join(', ')}]\nwindow.snake = [typeof code_along, typeof code_along_stage_at, typeof code_along_begin, typeof code_along_end]`)
  const names = await page.evaluate(() => ({ found: window.found, snake: window.snake }))
  say(names.found.every(([, t]) => t === 'function') && names.snake.every((t) => t === 'function'), name, 'a scene that uses one is given every name, in both spellings', names)

  // The helper as a scene calls it.
  await scene(page, 'function draw() { background("navy") }\nwindow.at = codeAlongStageAt(["a\\nb", "a\\nbc"], 1, { duration: 6 })')
  const helper = await page.evaluate(() => window.at)
  say(helper.stage === 0 && helper.typed <= 3 && typeof helper.text === 'string' && !('before' in helper), name, 'codeAlongStageAt(stages, t, options) answers a scene with the stage and the characters typed', helper)

  // Mistakes and what the options do, at the wide size.
  await resized(page, FORMATS['16x9'])
  const INK = [11, 16, 32]
  const F = FORMATS['16x9']
  const grab = (page, t, f) => page.evaluate(([t, ink, safe]) => window.grab(t, ink, safe), [t, INK, f.safe])
  {
    const stage = 'function draw() {\\n  background(\\"navy\\")\\n  circle(width / 2, 100, 60, \\"gold\\")\\n}'
    await scene(page, probe(`{ stages: ["${stage}"], duration: 4, run: true }`))
    const done = await grab(page, 3.9, F)
    say(done.gold > 2000 && done.info.stage === 0 && done.info.phase === 'hold' && !done.info.warnings.length, name, 'a finished stage draws what its code draws in the preview (a gold circle), with no warning', { gold: done.gold, info: done.info })
    const early = await grab(page, 0.5, F)
    say(early.gold === 0 && early.info.phase === 'type', name, 'before the stage is typed there is no preview of it yet', { gold: early.gold, phase: early.info.phase })
    await scene(page, probe(`{ stages: ["${stage}"], duration: 4, run: false }`))
    const alone = await grab(page, 3.9, F)
    say(alone.gold === 0 && alone.lit > 3000 && alone.outside === 0, name, 'run: false shows only the code (no preview), in the whole box', { gold: alone.gold, lit: alone.lit })
    await scene(page, probe('{ stages: [{ code: "function draw() { circle( }" }], duration: 3 }'))
    const bad = await grab(page, 2.9, F)
    say(bad.info.warnings.some((w) => /stage 1 would not run/.test(w)) && bad.gold === 0 && bad.outside === 0, name, 'a stage that does not run shows its message in the preview and in warnings', bad.info.warnings)
    await scene(page, probe('{ stages: [{ code: "def draw():\\n    circle(1, 2, 3)", language: "python" }], duration: 3 }'))
    const py = await grab(page, 2.9, F)
    say(py.info.warnings.some((w) => /stage 1 is Python and has no preview/.test(w)) && py.outside === 0, name, 'a Python stage with no preview says its output is pending, and warns', py.info.warnings)
    await scene(page, probe(`{ stages: [{ code: "def draw():\\n    circle(1, 2, 3)", language: "python" }], previews: [(ctx, w, h) => { ctx.fillStyle = '#ffd700'; ctx.fillRect(w / 4, h / 4, w / 2, h / 2) }], duration: 3 }`))
    const given = await grab(page, 2.9, F)
    say(given.gold > 5000 && !given.info.warnings.length, name, 'a stage can be given its preview (previews: [function]): a Python stage then shows it', { gold: given.gold, warnings: given.info.warnings })
    await scene(page, probe(`{ stages: ["x = 1\\n${'y'.repeat(90)}"], duration: 3 }`))
    const long = await grab(page, 2.9, F)
    say(long.info.warnings.some((w) => /over the budget of 60/.test(w)) && long.outside === 0, name, 'a line over the budget (60 columns, 34 in a tall frame) is wrapped and reported, and stays inside the safe area', long.info.warnings)
    await scene(page, probe('{ stages: ["a"], fontScale: 0.2, duration: 3 }'))
    const tiny = await grab(page, 2.9, F)
    say(tiny.info.size >= F.h * 0.03 - 0.01 && tiny.info.warnings.some((w) => /least that is readable/.test(w)), name, 'a font scale below the minimum is raised to 3 percent of the height, and reported', { size: tiny.info.size, warnings: tiny.info.warnings })
    const withCall = probe(`{ stages: ["function draw() {\\n  let x = 1\\n}"], duration: 3, callouts: [{ at: 1, line: 2, text: 'a note', duration: 2 }] }`)
    await scene(page, withCall)
    const a = await grab(page, 2, F)
    await scene(page, withCall.replace('callouts', 'nocallouts'))
    const b = await grab(page, 2, F)
    await scene(page, withCall)
    const c = await grab(page, 0.5, F), d = await grab(page, 2, F)
    say(a.sum !== b.sum && a.sum === d.sum && a.outside === 0 && c.sum !== a.sum, name, 'a callout draws a label at its line only while it is on, inside the safe area', { a: a.sum, b: b.sum, outside: a.outside })
    await scene(page, probe('{ stages: ["function draw() {\\n  background(\\"navy\\")\\n}", "function draw() {\\n  background(\\"navy\\")\\n  circle(width / 2, 100, 60, \\"gold\\")\\n}"], duration: 6, live: true }'))
    const live = await grab(page, 5.9, F)
    say(live.gold > 2000 && !live.info.warnings.length, name, 'live: true runs the typed text, and ends as the stage does', { gold: live.gold, warnings: live.info.warnings })
    // A stage that draws near its edge is not cut off: its box is set in from the pane's edges.
    await scene(page, probe('{ stages: [{ code: "function draw() {\\n  background(\\"navy\\")\\n  circle(40, 100, 60, \\"gold\\")\\n}" }], duration: 3 }'))
    const edge = await grab(page, 2.9, F)
    say(edge.gold > Math.PI * 3600 * 0.97 && edge.info.inner.w < edge.info.preview.w && edge.info.inner.w > edge.info.preview.w * 0.8, name, 'a stage that draws near the preview\'s edge (a circle at x = 40, 60 wide) is whole: the stage\'s box is set in from the pane', { gold: edge.gold, inner: edge.info.inner, preview: edge.info.preview })
    // say() in a preview: silent, and its mouth() is a size of the preview's own and moves only when asked.
    const faceStage = 'say(\\"Hello there, my friend\\")\\nfunction draw() {\\n  background(\\"white\\")\\n  mouth(width / 2, height / 2)\\n}'
    const spy = 'window.__spoke = 0; for (const k of ["speak"]) { try { window.speechSynthesis[k] = () => { window.__spoke++ } } catch (e) {} }\n'
    const dark = (p) => p.evaluate(() => { const c = document.querySelector('#s canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60 && d[i + 3] > 200) n++; return n })
    await scene(page, spy + probe(`{ stages: ["${faceStage}"], duration: 8 }`))
    const shut = await grab(page, 7.5, F)
    await scene(page, spy + probe(`{ stages: ["${faceStage}"], duration: 8, demoVoice: true }`))
    const talking = []
    for (const t of [3, 3.2, 3.4, 3.6, 3.8, 4, 4.2]) talking.push((await grab(page, t, F)).sum)
    const spoke = await page.evaluate(() => window.__spoke)
    say(!shut.info.warnings.length && shut.lit > 3000 && new Set(talking).size > 3 && spoke === 0, name, 'say() in a preview does not speak, mouth() draws a face-sized mouth that stays shut unless demoVoice is on, and with it moves with a made-up voice', { warnings: shut.info.warnings, distinct: new Set(talking).size, spoke })
    let wrong = ''
    try {
      await scene(page, probe('{ stages: ["a"], layout: "sideways" }'))
      await page.waitForTimeout(300)
      wrong = (await page.evaluate(() => window.error))?.error ?? ''
    } catch (e) { wrong = e.message }
    say(/no layout "sideways"/.test(wrong), name, 'a wrong layout says what to use', wrong)
    await scene(page, 'function draw() { background(houseStyle.palette.ink); window.__info = codeAlong({ stages: ["a"], start: 5 }); window.__none = window.__info }')
    const before = await page.evaluate(() => (window.__seek(1), window.__none))
    say(before === null || before === undefined, name, 'a beat that has not begun draws nothing and returns null', before)
  }

  // The example, a few frames each, in both shapes.
  const source = await readFile(join(ROOT, 'examples', 'code_along_circle.js'), 'utf8')
  const sets = {}
  for (const [shape, f] of Object.entries(FORMATS)) {
    await resized(page, f)
    await scene(page, source + '\nconst __draw = draw\ndraw = function () { __draw(); }')
    const frames = []
    for (const t of TIMES) frames.push({ t, ...(await grab(page, t, f)) })
    sets[shape] = frames
    const where = `code_along_circle.js at ${f.w}x${f.h}`
    const blank = frames.filter((fr) => fr.t >= 0.9 && fr.lit < 4000).map((fr) => fr.t)
    say(!blank.length, name, `${where}: every still once the typing has begun has code on screen`, blank)
    // Typed progressively: more coloured text each time during the first stage.
    const typing = frames.filter((fr) => fr.t <= 1.6).map((fr) => fr.coloured)
    say(typing.every((n, i) => i === 0 || n > typing[i - 1]), name, `${where}: the code is typed a little more at each still of the first stage`, typing)
    // The preview: nothing drawn yet while stage 1 is typed; the gold circle once stage 2 is; it is bigger as stage 3 runs.
    const gold = Object.fromEntries(frames.map((fr) => [fr.t, fr.gold]))
    say(gold[0.3] === 0 && gold[2.6] === 0 && gold[6.8] > 5000 && gold[10] > 1000 && gold[11.9] > gold[10] * 5, name, `${where}: the preview shows what each stage draws (no circle from stage 1, a circle from stage 2, one that grows from stage 3)`, gold)
    const spill = frames.filter((fr) => fr.outside > 0).map((fr) => `t=${fr.t}: ${fr.outside} px, box ${fr.box}`)
    say(!spill.length, name, `${where}: nothing is drawn outside the safe area (top ${f.safe.top * 100}%, bottom ${f.safe.bottom * 100}%, sides ${f.safe.side * 100}%)`, spill)
    const moving = new Set(frames.map((fr) => fr.sum)).size === frames.length
    say(moving, name, `${where}: every still is a different picture`, frames.map((fr) => fr.sum))
    const calls = Math.max(...frames.map((fr) => fr.random))
    await scene(page, source + '\nconst __draw = draw\ndraw = function () { __draw(); }')
    const again = []
    for (const t of TIMES) again.push({ t, ...(await grab(page, t, f)) })
    const differ = frames.filter((fr, i) => fr.sum !== again[i].sum).map((fr) => fr.t)
    say(calls === 0 && !differ.length, name, `${where}: Math.random is never called, and drawn twice it is the same pixels`, { calls, differ })
    // Seeking back gives the same picture as arriving there.
    const back = await grab(page, 6.8, f)
    say(back.sum === frames.find((fr) => fr.t === 6.8).sum, name, `${where}: going back to an earlier time gives the same pixels`, { back: back.sum })
    // Text size: the size the call reports is at least 3 percent of the height.
    await scene(page, probe(`{ stages: [${JSON.stringify(source.match(/code: `([^`]*)`/)[1])}], duration: 5 }`))
    const size = (await grab(page, 4.5, f)).info
    say(size.size >= f.h * 0.03 - 0.01, name, `${where}: the code text is at least 3 percent of the frame's height (${Math.round(size.size)} px of ${Math.round(f.h * 0.03)})`, size.size)
    say(size.layout === (f.w > f.h ? 'side' : 'stack') && f.w > 0, name, `${where}: the layout is ${f.w > f.h ? 'code beside the preview' : 'code above the preview'}`, size.layout)
  }
  say(!errors.length, name, 'no page error was raised', errors)

  // Contact sheets of the stills, from the first browser that is here.
  if (first) {
    first = false
    for (const [shape, f] of Object.entries(FORMATS)) {
      const cells = sets[shape]
      const tall = f.h > f.w
      const sheet = await browser.newPage({ viewport: { width: tall ? 1700 : 1500, height: 800 }, deviceScaleFactor: 1 })
      await sheet.setContent(`<body style="margin:0;background:#222;color:#ccc;font:13px system-ui"><div style="display:grid;grid-template-columns:repeat(${tall ? 5 : 3}, auto);gap:6px;padding:6px;width:max-content">${cells.map((c) => `<figure style="margin:0"><img src="${c.png}" style="display:block;outline:1px solid #555"><figcaption>code_along_circle t=${c.t}</figcaption></figure>`).join('')}</div>`)
      await sheet.waitForFunction(() => [...document.images].every((i) => i.complete))
      const file = join(SHEETS, `codealong-contact-${shape}.png`)
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
