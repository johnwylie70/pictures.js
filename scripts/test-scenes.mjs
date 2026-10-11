#!/usr/bin/env node
/**
 * Small scenes run in real browsers, each leaving what it found in `result`
 * for the test to compare. For the parts of the library that have no picture
 * to look at: what a sprite's picture function is given, saved values. Then
 * every example is run for a moment, and Space Rocks is played: with the keys,
 * and with the mouse and a finger (a tap shoots, a hold flies; play-space-rocks.mjs).
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-scenes.mjs
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { HOOK, playSpaceRocks } from './play-space-rocks.mjs'

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

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' }
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname
  // A scene that fills the page, for the games played by pointer.
  if (path === '/full.html') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;overflow:hidden"><div id="s" style="position:absolute;inset:0"></div>')
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

// A host's storage, as an app would supply it: the files are kept in `fake.files` and every call is noted in `fake.calls`.
// It is the page's, so it outlasts a scene and is gone when the page is loaded again. `only` leaves the other methods out.
const FAKE = (only) => `(() => {
  const fake = window.fake ??= { files: {}, calls: [] }
  const storage = {
    readText: async (path) => { fake.calls.push('readText ' + path); return typeof fake.files[path] === 'string' ? fake.files[path] : null },
    writeText: async (path, text) => { fake.calls.push('writeText ' + path); fake.files[path] = text },
    readBytes: async (path) => { fake.calls.push('readBytes ' + path); return fake.files[path] instanceof Uint8Array ? fake.files[path] : null },
    writeBytes: async (path, bytes) => { fake.calls.push('writeBytes ' + path); fake.files[path] = bytes },
  }
  const only = ${JSON.stringify(only || null)}
  if (only) for (const name of Object.keys(storage)) if (!only.includes(name)) delete storage[name]
  return { storage }
})()`
// A host that changes pictures, as an app would supply it (`options.pictures`): it names its methods in the Python
// spelling, answers with flat pictures of one colour, and notes every call in `artist.calls`.
const ARTIST = `(() => {
  const fake = window.artist = { calls: [] }
  const flat = (colour, w = 4, h = 4) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = colour; g.fillRect(0, 0, w, h); return c.toDataURL() }
  const who = (picture) => (typeof picture === 'string' ? picture : picture instanceof HTMLImageElement ? 'a picture' : 'something else')
  return { pictures: {
    methods: [{ name: 'remove_background' }, { name: 'resize', options: ['width', 'height'] }, { name: 'classify', options: ['max_labels'] },
      { name: 'find_faces', options: ['overlay'] }, { name: 'trace', options: ['colors'] }, { name: 'favicon_set' }, { name: 'sepia' }],
    run: async (picture, name, options) => {
      fake.calls.push([who(picture), name, options])
      if (name === 'remove_background') return { picture: flat('red'), ref: 'cut' }
      if (name === 'resize') return { picture: flat('lime', options.width || 4, options.height || 4), ref: 'small' }
      if (name === 'classify') return { data: { labels: [{ label: 'shoe', confidence: 0.9 }, { label: 'boot', confidence: 0.4 }].slice(0, options.max_labels ?? 9) } }
      if (name === 'find_faces') return options.overlay === false ? { data: { count: 1 } } : { data: { count: 1 }, overlay: flat('blue'), overlayRef: 'faces' }
      if (name === 'trace') return { vector: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#0000ff"/></svg>', shapes: 1, ref: 'vec' }
      if (name === 'favicon_set') return { files: ['favicon.ico', 'icon-192.png'], ref: 'icons' }
      throw new Error('sepia() needs an Apple device')
    },
    save: async (picture, path) => { fake.calls.push(['save', who(picture), path]); return 'kept/' + path },
    available: async () => ['remove_background', 'resize'],
  } }
})()`
// A picture to load: one dot.
const DOT = 'const img = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")\n'
// Run a scene with more options (JavaScript that gives them, read on the page); what it left in `result`, or its error.
const playWith = (page, source, options, name = 'scene.js', patience = 6000) => page.evaluate(async ({ source, name, options, patience }) => {
  const { runScene } = await import('/pictures.js')
  window.result = undefined
  window.scene?.stop()
  return new Promise((done) => {
    window.scene = runScene(document.getElementById('s'), { source, name, onError: (message, line) => done({ error: message, line }), ...(0, eval)(options) })
    const look = () => (window.result !== undefined ? done(window.result) : setTimeout(look, 20))
    look()
    setTimeout(() => done({ error: 'the scene left no result' }), patience)
  })
}, { source, name, options, patience })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

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

  // --- files the scene writes: with no host storage they are the browser's, beside the saved values
  await page.goto(`${at}/test.html`)
  await page.evaluate(() => localStorage.clear())
  got = await play(page, 'await saveText("notes.txt", "héllo\\nthere")\nawait saveJSON("level.json", { walls: [1, 2], name: "one" })\nsave("notes.txt", "a saved value")\nwindow.result = [await loadText("notes.txt"), await loadJSON("level.json"), load("notes.txt")]\n')
  say(same(got, ['héllo\nthere', { walls: [1, 2], name: 'one' }, 'a saved value']), name, 'saveText and saveJSON: loadText and loadJSON give back what was written, and a saved value of the same name is another thing', got)
  await page.goto(`${at}/test.html`)
  got = await play(page, 'window.result = [await loadText("notes.txt"), await loadJSON("level.json")]\n')
  say(same(got, ['héllo\nthere', { walls: [1, 2], name: 'one' }]), name, 'a written file is still there after the page is loaded again', got)
  got = await page.evaluate(() => Object.keys(localStorage).sort())
  say(same(got, ['pictures:/test.html#scene.js:file:level.json', 'pictures:/test.html#scene.js:file:notes.txt', 'pictures:/test.html#scene.js:notes.txt']), name, 'written files are kept under the scene\'s own names, marked as files', got)
  got = await play(page, 'const before = await loadText("package.json")\nawait saveText("package.json", "mine")\nwindow.result = [before.includes("pictures.js"), await loadText("package.json"), (await loadText("/package.json")), (await loadJSON("LICENSE").catch((e) => "not JSON"))]\n')
  say(same(got, [true, 'mine', 'mine', 'not JSON']), name, 'with nothing written, loadText reads the file beside the scene; once written, what was written', got)
  got = await play(page, 'await loadText("not there.txt")\n')
  say(/There is no file "not there.txt" beside the scene/.test(got?.error), name, 'a file neither written nor beside the scene: the same words as before', got)
  for (const [what, code, says] of [
    ['saveText with no name', 'await saveText()', /saveText\(\) needs the name of a file, as in saveText\("notes.txt", words\)/],
    ['saveText with a name that is all dots', 'await saveText("../..", "x")', /saveText\("..\/.."\) needs the name of a file/],
    ['saveText with nothing to write', 'await saveText("a.txt")', /saveText\("a.txt", …\) was given nothing to write/],
    ['saveJSON of a function', 'await saveJSON("a.json", () => 1)', /saveJSON\("a.json", …\) was given something it cannot keep.*numbers, text/],
  ]) {
    got = await play(page, `let a = 1\n${code}\nwindow.result = "no error"\n`)
    say(says.test(got?.error) && (got.line === 2 || (name === 'webkit' && got.line === 0)), name, `${what} says so${got?.line ? ', on its line' : ''}`, got)
  }

  // --- a host's storage: the scene's files go to it, by a clean path, and the browser's own storage is not used
  await page.goto(`${at}/test.html`)
  await page.evaluate(() => localStorage.clear())
  got = await playWith(page, 'await saveText("/../a/./b/../c.txt", "one")\nawait saveText("d\\\\e.txt", "two")\nawait saveJSON("//data//level.json", [1])\nwindow.result = [await loadText("a/b/c.txt"), await loadText("../../d/e.txt"), await loadJSON("data/level.json"), fake.calls, Object.keys(fake.files), Object.keys(localStorage)]\n', FAKE())
  say(same(got, ['one', 'two', [1], ['writeText a/b/c.txt', 'writeText d/e.txt', 'writeText data/level.json', 'readText a/b/c.txt', 'readText d/e.txt', 'readText data/level.json'], ['a/b/c.txt', 'd/e.txt', 'data/level.json'], []]), name,
    'a host\'s storage is given every file, by a path with no leading /, no . and no .. in it', got)
  got = await playWith(page, 'window.result = [(await loadText("package.json")).includes("pictures.js"), await loadText("https://example.invalid/x.txt").catch(() => "fetched"), fake.calls.slice(-1)]\n', FAKE())
  say(same(got, [true, 'fetched', ['readText package.json']]), name, 'a file the host does not have is read from beside the scene, and an address is not asked of the host at all', got)
  await page.goto(`${at}/test.html`)
  got = await playWith(page, 'await saveText("notes.txt", "kept by the browser")\nwindow.result = [await loadText("notes.txt"), fake.calls, localStorage.getItem("pictures:/test.html#scene.js:file:notes.txt")]\n', FAKE(['readBytes', 'writeBytes']))
  say(same(got, ['kept by the browser', [], 'kept by the browser']), name, 'what a host leaves out (here text) is kept by the browser', got)
  got = await playWith(page, 'await saveText("notes.txt", "x")\n', '({ storage: { writeText: async () => { throw new Error("the disk is full") } } })')
  say(/saveText\("notes.txt", …\): the file could not be written \(the disk is full\)/.test(got?.error), name, 'a host that cannot write: the scene is told, in the host\'s words', got)

  // --- picture methods: the host's (`options.pictures`), under both spellings; never the library's own
  await page.goto(`${at}/test.html`)
  got = await playWith(page, DOT + 'window.result = [typeof img.removeBackground, typeof img.remove_background, typeof img.findFaces, typeof img.find_faces, typeof img.run, typeof img.save, await img.available(), img instanceof HTMLImageElement]\n', ARTIST)
  say(same(got, ['function', 'function', 'function', 'function', 'function', 'function', ['removeBackground', 'resize'], true]), name,
    'a host\'s picture methods are on a loaded picture under both spellings, and available() gives the ones this device runs', got)
  got = await playWith(page, AT + DOT + `const before = img.src
const cut = await img.removeBackground()
const small = await cut.resize({ width: 8 })
background("black")
ctx.drawImage(small, 0, 0, 150, 200)
picture(cut, 225, 100, 60)
const ship = new Sprite(cut, 225, 30, 20)
ship.draw()
window.result = [at(75, 100), at(225, 100), at(225, 30), at(225, 170), small.width, cut !== img && small !== cut, img.src === before, artist.calls]
`, ARTIST)
  say(same(got, ['0,255,0', '255,0,0', '255,0,0', '0,0,0', 8, true, true, [['a picture', 'remove_background', {}], ['cut', 'resize', { width: 8 }]]]), name,
    'a method gives a NEW picture that draws (drawImage, picture, a Sprite), chains, and leaves the one it was called on alone', got)
  got = await playWith(page, DOT + `await img.remove_background()
const one = await img.classify({ maxLabels: 1 })
const two = await img.classify({ max_labels: 1 })
await img.run("find-faces", { overlay: false })
await (await img.run("removeBackground")).run("resize", { height: 2 })
window.result = [one, two, artist.calls]
`, ARTIST)
  say(same(got, [{ labels: [{ label: 'shoe', confidence: 0.9 }] }, { labels: [{ label: 'shoe', confidence: 0.9 }] },
    [['a picture', 'remove_background', {}], ['a picture', 'classify', { max_labels: 1 }], ['a picture', 'classify', { max_labels: 1 }], ['a picture', 'find_faces', { overlay: false }], ['a picture', 'remove_background', {}], ['cut', 'resize', { height: 2 }]]]), name,
    'the Python spellings work too (methods, options and run by name), and the host is always asked in its own spelling', got)
  got = await playWith(page, AT + DOT + `const faces = await img.findFaces()
const plain = await img.findFaces({ overlay: false })
const vec = await img.trace({ colors: 6 })
const icons = await img.faviconSet()
background("black")
ctx.drawImage(faces.overlay, 0, 0, 150, 200)
ctx.drawImage(vec, 150, 0, 150, 200)
window.result = [faces.found, at(75, 100), plain, vec.svg.slice(0, 4), vec.shapes, vec.width, at(225, 100), typeof vec.resize, icons.names,
  await vec.save("logo.svg"), await icons.save("icons"), await img.save("copy.png"), await faces.overlay.save("faces.png"), artist.calls.filter((c) => c[0] === "save")]
`, ARTIST)
  say(same(got, [{ count: 1 }, '0,0,255', { count: 1 }, '<svg', 1, 8, '0,0,255', 'undefined', ['favicon.ico', 'icon-192.png'], 'kept/logo.svg', 'kept/icons', 'kept/copy.png', 'kept/faces.png',
    [['save', 'vec', 'logo.svg'], ['save', 'icons', 'icons'], ['save', 'a picture', 'copy.png'], ['save', 'faces', 'faces.png']]]), name,
    'data arrives as data (with a picture of what was found), traced shapes are a picture with svg and shapes, a set of files has names, and each saves through the host', got)
  for (const [what, code, says] of [
    ['an option the method does not take', 'await img.resize({ wdith: 8 })', /resize\(\) has no option "wdith"\. It takes width, height/],
    ['options not in braces', 'await img.resize(800)', /resize\(800\) needs its options in braces, as in resize\(\{ width: … \}\)/],
    ['a method no picture has', 'await img.removeBackgroud()', /A picture has no removeBackgroud\(\)\. `await img\.available\(\)` lists what it can do/],
    ['a method the host refuses, in the host\'s words', 'await img.sepia()', /^sepia\(\) needs an Apple device$/],
    ['save with no name', 'await img.save()', /save\(\) needs the name of a file, as in save\("cutout.png"\)/],
  ]) {
    got = await playWith(page, DOT + `${code}\nwindow.result = "no error"\n`, ARTIST)
    say(says.test(got?.error) && (got.line === 2 || (name === 'webkit' && got.line === 0)), name, `picture methods: ${what} says so${got?.line ? ', on its line' : ''}`, got)
  }
  // With no host a picture is still a picture, and says where its methods work.
  got = await play(page, AT + DOT + `const said = []
for (const go of [() => img.removeBackground(), () => img.run("resize", { width: 8 }), () => img.save("a.png")]) await go().catch((e) => said.push(e.message))
const same = await Promise.resolve(img).then((it) => it === img)
await new Promise((done) => { img.complete ? done() : img.onload = done })
background("black")
ctx.drawImage(img, 0, 0, 300, 200)
window.result = [said, await img.available(), same, at(150, 100) !== "0,0,0"]
`)
  say(Array.isArray(got) && got[0].length === 3 && /^A picture has no removeBackground\(\) on this page: the methods that change a picture work inside Circuitry/.test(got[0][0]) && /no resize\(\) on this page/.test(got[0][1]) && /no save\(\) on this page/.test(got[0][2])
    && same(got.slice(1), [[], true, true]), name, 'with no host a picture still loads and draws, available() is empty, and a method says it works inside Circuitry', got)
  got = await play(page, DOT + 'let a = 1\nawait img.removeBackground()\nwindow.result = "no error"\n')
  say(/works? inside Circuitry/.test(got?.error) && (got.line === 3 || (name === 'webkit' && got.line === 0)), name, `with no host a picture method stops the scene with that sentence${got?.line ? ', on its line' : ''}`, got)

  // --- databases: SQLite here, on a file's bytes from the host
  const asked = []
  page.on('request', (request) => { if (/sqlite\//.test(request.url())) asked.push(request.url().split('/').pop()) })
  await page.goto(`${at}/test.html`)
  got = await playWith(page, 'await saveText("a.txt", "x")\nwindow.result = await loadText("a.txt")\n', FAKE())
  say(got === 'x' && asked.length === 0, name, 'a scene that opens no database does not load SQLite', { got, asked })
  const MAKE = 'const db = await openDatabase("scores")\nawait db.run("create table if not exists best (name text, points integer)")\n'
  got = await playWith(page, MAKE + `const one = await db.run("insert into best values (?, ?)", "Ann", 12)
const two = await db.run("insert into best values (?, ?)", ["Bob", 7])
await db.run("insert into best values (?, ?)", "Cy", undefined)
const many = await db.run("update best set points = points + 1 where points > ?", 5)
const rows = await db.query("select name, points from best where points > ? order by points desc", 7)
const all = await db.query("select name, points from best order by name", [])
const none = await db.run("delete from best where name = ?", "nobody")
const made = await db.run("create table if not exists other (x)")
await db.close()
const file = fake.files["scores.db"]
window.result = { one, two, many, rows, all, none, made, calls: fake.calls, starts: new TextDecoder().decode(file.slice(0, 15)), big: file.length > 4000 }
`, FAKE())
  say(same(got, { one: 1, two: 1, many: 2, rows: [{ name: 'Ann', points: 13 }, { name: 'Bob', points: 8 }], all: [{ name: 'Ann', points: 13 }, { name: 'Bob', points: 8 }, { name: 'Cy', points: null }],
    none: 0, made: 0, calls: ['writeText a.txt', 'readText a.txt', 'readBytes scores.db', 'writeBytes scores.db'], starts: 'SQLite format 3', big: true }), name,
    'a database through a host\'s storage: opened from scores.db, rows as plain objects, run gives the rows changed, and the many changes are one write of the file', got)
  say(asked.includes('sql-wasm.js') && asked.includes('sql-wasm.wasm'), name, 'SQLite is loaded from the sqlite folder beside the library the first time a database is opened', asked)
  got = await playWith(page, 'const db = await openDatabase("/../scores.db")\nconst again = await openDatabase("scores")\nwindow.result = [await db.query("select count(*) as n from best"), again === db, fake.calls.filter((c) => c.startsWith("readBytes")).length]\n', FAKE())
  say(same(got, [[{ n: 3 }], true, 2]), name, 'run again, the scene opens the file the run before wrote; opened twice at once, it is one database', got)
  // Not closed: the file is written a moment after the change, and when the scene is stopped.
  got = await playWith(page, 'fake.calls.length = 0\nconst db = await openDatabase("data/later.sqlite")\nawait db.run("create table t (a)")\nfor (let i = 0; i < 200; i++) await db.run("insert into t values (?)", i)\nconst at = fake.calls.length\nawait sleep(0.4)\nwindow.result = [at, fake.calls]\n', FAKE())
  say(same(got, [1, ['readBytes data/later.sqlite', 'writeBytes data/later.sqlite']]), name, 'a database left open is written a moment after a burst of changes, once; a name with an ending keeps it', got)
  got = await playWith(page, 'fake.calls.length = 0\nconst db = await openDatabase("stopped")\nawait db.run("create table t (a)")\nawait db.run("insert into t values (1)")\nconst before = fake.calls.slice()\nwindow.scene.stop()\nawait new Promise((done) => setTimeout(done, 10))\nwindow.result = [before, fake.calls.slice()]\n', FAKE())
  say(same(got, [['readBytes stopped.db'], ['readBytes stopped.db', 'writeBytes stopped.db']]), name, 'a scene that is stopped has its open database written at once', got)
  got = await playWith(page, 'const db = await openDatabase("stopped")\nwindow.result = await db.query("select a from t")\n', FAKE())
  say(same(got, [{ a: 1 }]), name, 'and what it wrote is all there', got)
  // A transaction is not cut short by the write, and what is never committed is not kept.
  got = await playWith(page, `fake.calls.length = 0
const db = await openDatabase("moves")
await db.run("pragma foreign_keys = on")
await db.run("create table t (a)")
await sleep(0.2)
await db.run("begin")
await db.run("insert into t values (1)")
await sleep(0.3)
const during = fake.calls.filter((c) => c.startsWith("writeBytes")).length
await db.run("insert into t values (2)")
await db.run("commit")
const inside = await db.query("select count(*) as n from t")
await sleep(0.3)
const after = fake.calls.filter((c) => c.startsWith("writeBytes")).length
const keys = await db.query("pragma foreign_keys")
await db.run("begin")
await db.run("insert into t values (3)")
await db.close()
const again = await openDatabase("moves")
window.result = [during, inside, after, await again.query("select a from t order by a"), keys]
`, FAKE())
  say(same(got, [1, [{ n: 2 }], 2, [{ a: 1 }, { a: 2 }], [{ foreign_keys: 1 }]]), name, 'a transaction left open over the write is whole when it is committed, and foreign keys stay on; one never committed is undone at close', got)
  for (const [what, code, says, lines] of [
    ['SQL that is wrong', 'await db.query("select nme from best")', /db\.query\("select nme from best"\): no such column: nme/, [3]],
    ['too few values', 'await db.run("insert into best values (?, ?)", "Ann")', /db\.run\("insert into best values \(\?, \?\)"\) has 2 \? marks and was given 1 value$/, [3]],
    ['a ? in a string is not a mark', 'await db.run("insert into best values (\'who?\', ?)", 1)\nthrow new Error("got past it")', /got past it/, [4]],
    ['a database used after close', 'await db.close()\nawait db.query("select 1")', /db\.query\(…\): the database "scores.db" is closed\. Open it again with openDatabase\("scores"\)/, [4]],
    ['no SQL', 'await db.run()', /db\.run\(\) needs SQL to run, as text/, [3]],
    ['a database with no name', 'await openDatabase()', /openDatabase\(\) needs the name of a file, as in openDatabase\("scores"\)/, [3]],
  ]) {
    got = await playWith(page, `${MAKE}${code}\nwindow.result = "no error"\n`, FAKE())
    say(says.test(got?.error) && (lines.includes(got.line) || (name === 'webkit' && got.line === 0)), name, `${what} says so, in SQLite's words where it has them${got?.line ? ', on its line' : ''}`, got)
  }
  got = await playWith(page, 'fake.files["broken.db"] = new TextEncoder().encode("these are not the bytes of a database, whatever the name says")\nawait openDatabase("broken")\n', FAKE())
  say(/openDatabase\("broken"\): the file "broken.db" is not a SQLite database/.test(got?.error), name, 'a file that is not a database says so when it is opened', got)

  // With no host storage a database is the browser's (IndexedDB), and is there after the page is loaded again.
  await page.goto(`${at}/test.html`)
  got = await playWith(page, MAKE + 'await db.run("delete from best")\nawait db.run("insert into best values (?, ?)", "Ann", 12)\nawait db.close()\nwindow.result = "closed"\n', '({})')
  await page.goto(`${at}/test.html`)
  const back = await playWith(page, 'const db = await openDatabase("scores")\nwindow.result = await db.query("select * from best")\n', '({})')
  const shelf = await page.evaluate(() => new Promise((done) => {
    const opening = indexedDB.open('pictures')
    opening.onsuccess = () => { const keys = opening.result.transaction('files').objectStore('files').getAllKeys(); keys.onsuccess = () => done(keys.result) }
    opening.onerror = () => done('no IndexedDB')
  }))
  say(got === 'closed' && same(back, [{ name: 'Ann', points: 12 }]) && same(shelf, ['pictures:/test.html#scene.js:file:scores.db']), name, 'with no host storage a database is kept by the browser under the scene\'s own name, and is there after the page is loaded again', { got, back, shelf })
  // SQLite from a folder the host names, and a folder with nothing in it.
  await page.goto(`${at}/test.html`)
  got = await playWith(page, 'await openDatabase("scores")\nwindow.result = "opened"\n', '({ sqlite: "/nowhere" })')
  const then = await playWith(page, 'const db = await openDatabase("scores")\nwindow.result = await db.query("select 1 as one")\n', '({ sqlite: "/sqlite" })')
  say(/openDatabase\("scores"\): SQLite could not be loaded \(there is no http.*\/nowhere\/sql-wasm\.js\)/.test(got?.error) && same(then, [{ one: 1 }]), name, 'SQLite that cannot be loaded says where it looked, and the next open tries again (here from the folder the host names)', { got, then })
  // A page that is refused storage (a private frame): files and a database still work while the page is open, through "Run again".
  await page.goto(`${at}/test.html`)
  got = await page.evaluate(async (lib) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.srcdoc = `<!doctype html><body><div id="s" style="width:300px;height:200px"></div><script type="module">
      import { runScene } from '${lib}'
      const out = { runs: [] }
      window.tell = (v) => { out.runs.push(v); if (out.runs.length === 1) setTimeout(() => scene.restart(), 100); else parent.postMessage(out, '*') }
      const scene = runScene(document.getElementById('s'), { name: 'scene.js', source: 'const was = await loadText("count.txt").catch(() => "0")\\nawait saveText("count.txt", was + "1")\\nconst db = await openDatabase("runs")\\nawait db.run("create table if not exists t (a)")\\nawait db.run("insert into t values (1)")\\ntell([await loadText("count.txt"), (await db.query("select count(*) as n from t"))[0].n])\\n', onError: (message) => parent.postMessage({ error: message }, '*') })
    </` + `script>`
    const heard = new Promise((done) => { addEventListener('message', (e) => done(e.data)); setTimeout(() => done({ error: 'nothing heard' }), 6000) })
    document.body.append(frame)
    return heard
  }, `${at}/pictures.js`)
  say(same(got.runs, [['01', 1], ['011', 2]]), name, 'with no storage a scene still writes files and a database, and keeps them while the page is open', got)

  // The Top Scores example is played with a short game: catch the star once, let the time run out,
  // load the page again, and the game is in the table.
  const table = (await readFile(join(ROOT, 'examples', 'top_scores.js'), 'utf8')).replaceAll('left = 10', 'left = 0.7')
  await page.goto(`${at}/test.html`)
  await playWith(page, table + '\nwindow.result = table.length\n', FAKE(), 'top_scores.js')
  await page.mouse.click(8 + 200, 8 + 160)   // the star starts at 200, 160; the page's margin is 8
  await page.waitForTimeout(1200)
  got = await playWith(page, table + '\nwindow.result = table.map((row) => row.points)\n', FAKE(), 'top_scores.js')
  say(same(got, [1]), name, 'Top Scores: a game played is in the table the next time', got)

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
  // Space Rocks is played by pointer: the mouse in a window, then a finger on a phone-size touch screen.
  const rocks = (await readFile(join(ROOT, 'examples', 'space_rocks.js'), 'utf8')) + HOOK
  for (const touch of [false, true]) {
    const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: name === 'chromium', deviceScaleFactor: 3 } : { viewport: { width: 1000, height: 700 } })
    const tab = await context.newPage()
    await tab.goto(`${at}/full.html`)
    const error = await tab.evaluate(async (source) => {
      const { runScene } = await import('/pictures.js')
      let error = null
      runScene(document.getElementById('s'), { source, name: 'space_rocks.js', onError: (message) => { error = message } })
      await new Promise((done) => setTimeout(done, 500))
      return error
    }, rocks)
    say(!error, name, `Space Rocks runs for ${touch ? 'a finger' : 'the mouse'}`, error)
    if (!error) await playSpaceRocks(tab, name, { touch, say: (ok, what, got) => say(ok, name, what, got) })
    await context.close()
  }
  await browser.close()
}
server.close()
process.exit(failed ? 1 : 0)
