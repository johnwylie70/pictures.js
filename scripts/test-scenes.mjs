#!/usr/bin/env node
/**
 * Small scenes run in real browsers, each leaving what it found in `result`
 * for the test to compare. For the parts of the library that have no picture
 * to look at: what a sprite's picture function is given, saved values. Then
 * every example is run for a moment, and Space Rocks is played.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-scenes.mjs
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

// The colour of the point x, y of the scene (300 by 200), as "r,g,b".
const AT = 'const at = (x, y) => [...ctx.getImageData(x * pixelRatio, y * pixelRatio, 1, 1).data].slice(0, 3).join(",")\n'

// what: a scene that sets window.result, and what it must be.
const CASES = [
  // --- a sprite's picture function
  { what: 'a picture function of the size alone draws round the sprite with the easy functions',
    source: AT + 'function drawBall(size) {\n  circle(0, 0, size / 2, "red")\n}\nbackground("black")\nnew Sprite(drawBall, 150, 100, 40).draw()\nwindow.result = [at(150, 100), at(150, 130), at(20, 20)]\n',
    want: ['255,0,0', '0,0,0', '0,0,0'] },
  { what: 'a picture function of (ctx, size) is given both, as always',
    source: AT + 'function drawBox(ctx, size) {\n  ctx.fillStyle = "lime"\n  ctx.fillRect(-size / 2, -size / 2, size, size)\n}\nbackground("black")\nnew Sprite(drawBox, 150, 100, 40).draw()\nwindow.result = [at(150, 100), at(150, 130)]\n',
    want: ['0,255,0', '0,0,0'] },
  { what: 'only one parameter called size is given the size alone, however the function is written',
    source: `const got = []
const tell = (name, a, b) => got.push(name + ":" + (a === ctx ? "ctx" : a) + "," + (b === ctx ? "ctx" : b))
function plain(size) { tell("plain", size, arguments[1]) }
const arrow = (size) => tell("arrow", size)
const bare = size => tell("bare", size)
const named = function (size) { tell("named", size, arguments[1]) }
const thing = { method(size) { tell("method", size, arguments[1]) } }
function usual(ctx, size) { tell("usual", ctx, size) }
function oneOtherName(c) { tell("oneOtherName", c, arguments[1]) }
function calledCtx(ctx) { tell("calledCtx", ctx, arguments[1]) }
function none() { tell("none", arguments[0], arguments[1]) }
function sizeFirstOfTwo(size, more) { tell("sizeFirstOfTwo", size, more) }
function sizeWithDefault(size = 5) { tell("sizeWithDefault", size, arguments[1]) }
function resized(pixels) { tell("resized", pixels, arguments[1]) }
for (const f of [plain, arrow, bare, named, thing.method, usual, oneOtherName, calledCtx, none, sizeFirstOfTwo, sizeWithDefault, resized]) new Sprite(f, 0, 0, 30).draw()
// A sprite whose picture is changed is asked again.
const s = new Sprite(plain, 0, 0, 12)
s.draw()
s.picture = usual
s.draw()
s.picture = plain
s.draw()
window.result = got
`,
    want: ['plain:30,undefined', 'arrow:30,undefined', 'bare:30,undefined', 'named:30,undefined', 'method:30,undefined', 'usual:ctx,30',
      'oneOtherName:ctx,30', 'calledCtx:ctx,30', 'none:ctx,30', 'sizeFirstOfTwo:ctx,30', 'sizeWithDefault:ctx,30', 'resized:ctx,30',
      'plain:12,undefined', 'usual:ctx,12', 'plain:12,undefined'] },
]

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body><div id="s" style="width:300px;height:200px"></div>')
  let body
  try { body = await readFile(join(ROOT, decodeURIComponent(path))) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'access-control-allow-origin': '*' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// Run a scene on the page as it is now; what it left in `result`, or its error.
const play = (page, source, name = 'scene.js') => page.evaluate(async ({ source, name }) => {
  const { runScene } = await import('/pictures.js')
  window.result = undefined
  return new Promise((done) => {
    runScene(document.getElementById('s'), { source, name, onError: (message, line) => done({ error: message, line }) })
    const look = () => (window.result !== undefined ? done(window.result) : setTimeout(look, 20))
    look()
    setTimeout(() => done({ error: 'the scene left no result' }), 2500)
  })
}, { source, name })

let failed = 0
const say = (ok, engine, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${engine}: ${what}${ok ? '' : `: ${JSON.stringify(got)}`}`)
}
for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await playwright[name].launch() } catch { console.log(`${name}: not installed, skipped`); continue }
  const page = await browser.newPage()
  for (const { what, source, want } of CASES) {
    await page.goto(`${at}/test.html`)
    const got = await play(page, source)
    say(JSON.stringify(got) === JSON.stringify(want), name, what, got)
  }
  // --- saved values
  // Every kind of value comes back as it went in, in the same run and after the page is loaded again.
  const THINGS = '{ n: 120, half: 0.5, words: "héllo \\"you\\"", yes: true, no: false, list: [1, "two", [3]], thing: { x: 1, inside: { y: [2] } }, nothing: null }'
  await page.goto(`${at}/test.html`)
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('best', 'the page\'s own') })
  const want = await page.evaluate(`(${THINGS})`)
  let got = await play(page, `const things = ${THINGS}\nfor (const name in things) save(name, things[name])\nsave("best", 7)\nconst back = {}\nfor (const name in things) back[name] = load(name)\nwindow.result = { back, best: load("best"), missing: load("never saved", "the fallback"), bare: load("never saved") === undefined }\n`)
  say(JSON.stringify(got) === JSON.stringify({ back: want, best: 7, missing: 'the fallback', bare: true }), name, 'saved values come back in the same run, and a name never saved gives the fallback', got)
  await page.goto(`${at}/test.html`)
  got = await play(page, `const back = {}\nfor (const name of ${JSON.stringify(Object.keys(want))}) back[name] = load(name, "gone")\nwindow.result = { back, best: load("best", 0) }\n`)
  say(JSON.stringify(got) === JSON.stringify({ back: want, best: 7 }), name, 'saved values are still there after the page is loaded again', got)
  // Kept under the scene's own names: the page's own entry is as it was, and every entry the scene made is marked as its own.
  got = await page.evaluate(() => ({ own: localStorage.getItem('best'), others: Object.keys(localStorage).filter((k) => k !== 'best' && !k.startsWith('pictures:/test.html#scene.js:')) }))
  say(got.own === "the page's own" && got.others.length === 0, name, 'the page\'s own storage is not touched', got)
  got = await play(page, 'window.result = { best: load("best", "none of mine") }\n', 'another.js')
  say(got.best === 'none of mine', name, 'another scene on the same site does not see them', got)
  got = await play(page, 'const list = load("list")\nlist.push("changed")\nwindow.result = load("list")\n')
  say(JSON.stringify(got) === JSON.stringify([1, 'two', [3]]), name, 'changing a loaded list does not change what is saved', got)
  got = await play(page, 'save("best", 9)\nsave("best", load("best") + 1)\nwindow.result = load("best")\n')
  say(got === 10, name, 'a value saved again replaces the old one', got)
  for (const [what, value] of [['a function', '() => 1'], ['nothing', 'undefined'], ['a thing that holds itself', '(() => { const a = {}; a.a = a; return a })()']]) {
    await page.goto(`${at}/test.html`)
    got = await play(page, `let a = 1\nsave("x", ${value})\nwindow.result = "no error"\n`)
    say(/cannot keep.*numbers, text, true and false, lists and objects/.test(got?.error) && (got.line === 2 || (name === 'webkit' && got.line === 0)), name, `saving ${what} says what can be kept${got?.line ? ', on its line' : ' (no line: Safari\'s engine does not say who called the library)'}`, got)
  }
  // A page that is refused storage (a private frame): no error, and the value lasts while the page is open, through "Run again".
  await page.goto(`${at}/test.html`)
  got = await page.evaluate(async (lib) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.srcdoc = `<!doctype html><body><div id="s" style="width:300px;height:200px"></div><script type="module">
      import { runScene } from '${lib}'
      let refused = false
      try { localStorage.getItem('x') } catch (e) { refused = true }
      const out = { refused, runs: [] }
      window.tell = (v) => { out.runs.push(v); if (out.runs.length === 1) setTimeout(() => scene.restart()); else parent.postMessage(out, '*') }
      const scene = runScene(document.getElementById('s'), { name: 'scene.js', source: 'const was = load("count", 0)\\nsave("count", was + 1)\\ntell([was, load("count")])\\n', onError: (message) => parent.postMessage({ error: message }, '*') })
    </` + `script>`
    const heard = new Promise((done) => { addEventListener('message', (e) => done(e.data)); setTimeout(() => done({ error: 'nothing heard' }), 4000) })
    document.body.append(frame)
    return heard
  }, `${at}/pictures.js`)
  say(got.refused === true && JSON.stringify(got.runs) === '[[0,1],[1,2]]', name, 'with no storage a scene still runs, and keeps its values while the page is open', got)

  // The High Score example is played with a short game: catch the star once, let the time run out,
  // load the page again, and the best score is the one from before.
  const game = (await readFile(join(ROOT, 'examples', 'high_score.js'), 'utf8')).replaceAll('left = 10', 'left = 0.7') + '\nwindow.result = best\n'
  await page.goto(`${at}/test.html`)
  await page.evaluate(() => localStorage.clear())
  const first = await play(page, game, 'high_score.js')
  await page.mouse.click(8 + 200, 8 + 160)   // the star starts at 200, 160; the page's margin is 8
  await page.waitForTimeout(1200)
  const kept = await page.evaluate(() => localStorage.getItem('pictures:/test.html#high_score.js:best'))
  await page.goto(`${at}/test.html`)
  const second = await play(page, game, 'high_score.js')
  say(first === 0 && kept === '1' && second === 1, name, 'High Score: the best score is still there after the page is loaded again', { first, kept, second })

  // Every example runs for a second and a half with no error.
  for (const file of (await readdir(join(ROOT, 'examples'))).filter((f) => f.endsWith('.js')).sort()) {
    await page.goto(`${at}/test.html`)
    const got = await page.evaluate(async (src) => {
      const { runScene } = await import('/pictures.js')
      return new Promise((done) => {
        const box = document.getElementById('s')
        runScene(box, { src, onError: (message, line) => done({ error: message, line }) })
        setTimeout(() => done({ status: box.dataset.picturesStatus }), 1500)
      })
    }, `examples/${file}`)
    say(!got.error && (got.status === 'running' || got.status === 'finished'), name, `examples/${file} runs`, got)
  }
  // Space Rocks is played: the ship and rocks are drawn by picture functions, and the keys turn and fire.
  await page.goto(`${at}/test.html`)
  const played = await page.evaluate(async () => {
    const { runScene } = await import('/pictures.js')
    const box = document.getElementById('s')
    let error = null
    const scene = runScene(box, { src: 'examples/space_rocks.js', keyboard: true, onError: (message) => { error = message } })
    const wait = (ms) => new Promise((done) => setTimeout(done, ms))
    await wait(600)
    // Lit pixels in the middle (the ship) and over the whole picture (ship, rocks, score).
    const lit = (x, y, w, h) => {
      const c = scene.canvas, r = c.width / box.clientWidth
      const data = c.getContext('2d').getImageData(x * r, y * r, w * r, h * r).data
      let n = 0
      for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 300) n++
      return n
    }
    const ship = lit(130, 80, 40, 40), all = lit(0, 0, 300, 200)
    const key = (type, key, code) => scene.canvas.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }))
    key('keydown', 'ArrowRight', 'ArrowRight'); key('keydown', ' ', 'Space')
    await wait(400)
    key('keyup', ' ', 'Space'); key('keyup', 'ArrowRight', 'ArrowRight')
    await wait(100)
    return { error, ship, rocks: all - ship, status: box.dataset.picturesStatus }
  })
  say(!played.error && played.status === 'running' && played.ship > 20 && played.rocks > 100, name, 'Space Rocks is played: ship and rocks are drawn, keys taken', played)
  await browser.close()
}
server.close()
process.exit(failed ? 1 : 0)
