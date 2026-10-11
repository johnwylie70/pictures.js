#!/usr/bin/env node
/**
 * Does a mistake in a scene name its line, and say something true? Both for a
 * mistake in how the scene is WRITTEN and for one that happens while it RUNS.
 * Run in real browsers, because the line comes from the browser itself and
 * each engine says it its own way.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-errors.mjs
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

// what: the scene, and the line its error must name (a range where engines differ on which line notices the
// mistake; null for no error at all). `says` must be in the message and `never` must not.
const CASES = [
  // --- mistakes in how the scene is written
  { what: 'a bracket never closed', source: 'let x = 1\nfunction draw() {\n  circle(100, 100, 40, "gold"\n}\n', line: [3, 4] },
  { what: 'a stray sign', source: '// a comment\nconst a = 1\nconst b = 2\n\nconst c = = 3\n', line: [5, 5] },
  { what: 'a mistake on the first line', source: 'let 9lives = 3\nbackground("navy")\n', line: [1, 1] },
  { what: 'a good scene', source: 'background("navy")\ncircle(50, 50, 20, "gold")\n', line: null },
  // Something never closed: the message is about the scene, not the `)` of the wrapper round it.
  { what: 'a brace never closed', source: 'function draw() {\n  background("navy")\n', line: [1, 1], says: /A \{ is opened here and never closed: its \} is missing/, never: /Unexpected/ },
  { what: 'a brace never closed, with whole functions after it', source: 'let n = 0\nfunction update(dt) {\n  if (n > 3) {\n    n = 0\n}\n\nfunction draw() {\n  background("navy")\n}\n', line: [2, 2], says: /A \{ is opened here and never closed/, never: /Unexpected/ },
  { what: 'a square bracket never closed', source: 'let a = 1\nconst list = [1, 2, 3\n', line: [2, 2], says: /A \[ is opened here and never closed: its \] is missing/, never: /Unexpected token '[;)}]'/ },
  { what: 'a round bracket never closed on the last line', source: 'background("navy")\ncircle(50, 50, 20, "gold"\n', line: [2, 2], never: /Unexpected token '[;)}]'/ },
  { what: 'brackets in strings and comments are not counted', source: 'const a = "{ ( ["\n// { ( [\nfunction draw() {\n  text(`${a} {`, 10, 10)\n', line: [3, 3], says: /A \{ is opened here/ },
  { what: 'a stray closing bracket keeps the engine\'s own words', source: 'let a = 1\ncircle(50, 50, 20))\n', line: [2, 3], says: /\)/, never: /never closed/ },
  { what: 'a comment never closed keeps the engine\'s own words', source: 'let a = 1\n/* no end\nlet b = 2\n', line: [1, 4], never: /never closed|Unexpected token '\)'/ },
  // --- mistakes that happen while it runs
  { what: 'running: at the top', source: 'let a = 1\nlet b = 2\nnotThere(3)\n', line: [3, 3], says: /notThere/ },
  { what: 'running: inside draw', source: 'let a = 1\nfunction draw() {\n  background("navy")\n  notThere(3)\n}\n', line: [4, 4], says: /notThere/ },
  { what: 'running: inside update, a wrong name on a thing', source: 'const ball = { x: 1 }\nfunction update(dt) {\n\n\n  ball.move(dt)\n}\n', line: [5, 5], says: /move/ },
  { what: 'running: in an async function after await frame()', source: 'let a = 1\nasync function go() {\n  await frame()\n  await frame()\n  notThere(3)\n}\nawait go()\n', line: [5, 5], says: /notThere/ },
  { what: 'running: at the top after await frame()', source: 'let a = 1\nawait frame()\n\nnotThere(3)\n', line: [4, 4], says: /notThere/ },
  { what: 'running: in a key handler', source: 'function onKeyDown(key) {\n  notThere(key)\n}\nfunction draw() {\n  background("navy")\n}\n', line: [2, 2], says: /notThere/, key: 'a' },
  { what: 'running: with the stuck-loop guard on', source: 'let a = 1\nfor (let i = 0; i < 3; i++) {\n  a++\n}\nnotThere(3)\n', line: [5, 5], says: /notThere/, guard: true },
  // In a helper file the message names the file and its line. The scene's own line (where it called the helper)
  // is known only where the engine names the scene in the stack; Safari's does not, and says no line (0).
  { what: 'running: inside a helper file loaded with use()', source: 'const h = await use("helper.js")\nlet a = 1\nfunction draw() {\n  background("navy")\n  h.boom()\n}\n', line: { chromium: [5, 5], webkit: [0, 0] }, says: /nothing.*\(in helper\.js, line 3\)/ },
  { what: 'running: a helper that calls back into the scene is not blamed', source: 'const h = await use("helper.js")\nfunction mine() {\n  notThere(1)\n}\nh.twice(mine)\n', line: [3, 3], says: /notThere/, never: /helper/ },
]
const HELPER = 'export function boom() {\n  // a comment\n  return nothing.here\n}\nexport function twice(fn) {\n  fn()\n  fn()\n}\n'

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' }
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname
  if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body><div id="s" style="width:300px;height:200px"></div>')
  if (path === '/helper.js') return res.writeHead(200, { 'content-type': 'text/javascript' }).end(HELPER)
  let body
  try { body = await readFile(join(ROOT, decodeURIComponent(path))) } catch { return res.writeHead(404).end() }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body)
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

let failed = 0
for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await playwright[name].launch() } catch { console.log(`${name}: not installed, skipped`); continue }
  const page = await browser.newPage()
  for (const { what, source, line, says, never, key, guard } of CASES) {
    await page.goto(`${at}/test.html`)
    const got = await page.evaluate(async ({ source, key, guard }) => {
      const { runScene } = await import('/pictures.js')
      return new Promise((done) => {
        const scene = runScene(document.getElementById('s'), { source, name: 'scene.js', stopStuckLoops: guard, keyboard: true, onError: (message, line) => done({ message, line }) })
        if (key) setTimeout(() => scene.canvas.dispatchEvent(new KeyboardEvent('keydown', { key, code: 'KeyA' })), 300)
        setTimeout(() => done(null), 3000)
      })
    }, { source, key, guard: !!guard })
    const want = line && !Array.isArray(line) ? line[name] : line
    const ok = want === null ? got === null : got !== null && got.line >= want[0] && got.line <= want[1] &&
      (!says || says.test(got.message)) && (!never || !never.test(got.message))
    if (!ok) failed++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${what}: ${got ? `line ${got.line} (${got.message})` : 'no error'}`)
  }
  await browser.close()
}
server.close()
process.exit(failed ? 1 : 0)
