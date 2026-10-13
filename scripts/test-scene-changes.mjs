#!/usr/bin/env node
/**
 * A file with several scenes, run in real browsers: the order they play in, that each starts empty, go,
 * nextScene and restart, lengths in seconds and in beats (against a sound clock the test holds), which scene
 * hears a key, what is shared, the pixels of each transition at its start, half way and end (measured on a
 * screenshot: a transition is the browser's own mixing of two layers), the scrubber and what a host is told,
 * and that a file with no scenes is run as it always was.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-scene-changes.mjs
 *
 * Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { pixels } from './png.mjs'
import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.json': 'application/json' }
const asked = []
const server = createServer(async (request, reply) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname)
  if (path === '/test.html') {
    reply.writeHead(200, { 'content-type': 'text/html' })
    return reply.end('<!doctype html><body style="margin:0;background:#fff"><div id="s" style="width:300px;height:200px"></div>')
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
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${browser}: ${what}${ok ? '' : `\n       got ${JSON.stringify(got)}`}`)
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const near = (a, b, by = 6) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= by)

// Run a scene; `options` is JavaScript text for runScene's options. What the scene leaves in `result` when `until` says so, or its error.
async function play(page, source, { options = '({})', until = 'window.result !== undefined', wait = 4000 } = {}) {
  await page.evaluate(async ([source, options]) => {
    const { runScene } = await import('/pictures.js')
    window.scene?.stop()
    document.getElementById('s').replaceChildren()
    window.result = undefined
    window.error = window.told = null
    window.scenesTold = []
    window.scene = runScene(document.getElementById('s'), { source, name: 'scene.js', keyboard: true,
      onError: (message, line) => { window.error = { error: message, line } },
      onSections: (sections, duration) => { window.told = { sections, duration } },
      onScene: (name) => window.scenesTold.push(name), ...new Function(`return ${options}`)() })
  }, [source, options])
  await page.waitForFunction(`window.error || (${until})`, null, { timeout: wait }).catch(() => {})
  return page.evaluate(() => window.error || window.result)
}
const key = (page, name) => page.evaluate((name) => {
  for (const type of ['keydown', 'keyup']) window.scene.canvas.dispatchEvent(new KeyboardEvent(type, { key: name, code: name, bubbles: true }))
}, name)
const frames = (page, n = 3) => page.evaluate((n) => new Promise((done) => { const next = () => (n-- ? requestAnimationFrame(next) : done()); next() }), n)

// Three scenes that say what happens to them, each a third of a second long.
const THREE = `const log = []
window.result = undefined
class One extends Scene {
  length = 0.25
  setup() { log.push("One setup") }
  onStop() { log.push("One stop") }
}
class Two extends Scene {
  static length = 0.25
  setup() { log.push("Two setup") }
}
scene("three", { length: 0.25, setup() { log.push("three setup"); if (log.filter((l) => l === "three setup").length === 2 || LAST) window.result = log } })
`
// Two plain pictures to change between: red with a white stripe at 240 to 260, then blue.
const PAIR = (how) => `class Red extends Scene {
  draw() { background("rgb(255,0,0)"); rect(240, 0, 20, 200, "rgb(255,255,255)") }
  onKeyDown() { go("Blue", ${how}) }
}
class Blue extends Scene {
  draw() { background("rgb(0,0,255)") }
}
`

for (const [name, type] of [['chromium', playwright.chromium], ['webkit', playwright.webkit]]) {
  let browser
  try { browser = await quietly(type, name) } catch (e) { console.log(`skip ${name}: ${String(e.message).split('\n')[0]}`); continue }
  const page = await browser.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1 })
  await page.goto(`${at}/test.html`)
  let got

  // --- order
  asked.length = 0
  got = await play(page, 'const LAST = false\n' + THREE)
  say(same(asked, ['pictures.js', 'scenes/scenes.js']), name, 'a file with scenes fetches the scenes part, scenes/scenes.js', asked)
  say(same(got, ['One setup', 'One stop', 'Two setup', 'three setup', 'One setup', 'One stop', 'Two setup', 'three setup']), name,
    'every scene plays in the order written, classes and scene() alike, each for its length, and the last is followed by the first', got)
  got = await play(page, 'const LAST = true\nconfig({ loop: false })\n' + THREE)
  await page.waitForTimeout(500)
  const stays = await page.evaluate(() => [window.result.length, window.scene.scenes.name, window.scenesTold])
  say(same(stays, [4, 'three', ['One', 'Two', 'three']]), name, 'with config({ loop: false }) the last scene stays, and a host is told each scene as it begins', stays)

  // --- each starts empty
  got = await play(page, `const shared = dial("shared", 0, 1)
const seen = []
let visits = 0
class A extends Scene {
  n = 0
  setup() {
    seen.push(["A", this.n, ctx.fillStyle, ctx.getImageData(10, 10, 1, 1).data[3], shared.panel.items.length])
    this.mine = dial("mine", 0, 1)
    this.n = 5
    if (++visits === 2) window.result = seen
  }
  draw() { background("red"); ctx.fillStyle = "lime" }
  update() { if (sceneTime > 0.15) nextScene() }
}
class B extends Scene {
  setup() { seen.push(["B", ctx.fillStyle, ctx.getImageData(10, 10, 1, 1).data[3], shared.panel.items.length]) }
  update() { if (sceneTime > 0.15) nextScene() }
}
`)
  say(same(got, [['A', 0, '#000000', 0, 1], ['B', '#000000', 0, 1], ['A', 0, '#000000', 0, 1]]), name,
    'each scene starts empty: its own variables as written, a clear canvas with the drawing settings as they start, and only the controls the file made at its top level', got)

  // --- go, nextScene, restart, keep
  got = await play(page, `const log = []
let score = 0
class Menu extends Scene {
  picks = 0
  setup() { log.push("Menu setup " + this.picks) }
  resume() { log.push("Menu resume " + this.picks) }
  onKeyDown(key) { this.picks++; score += 10; if (key === "g") go(Game); else if (key === "n") nextScene(); else if (key === "r") restart(); else if (key === "x") go("nowhere") }
}
class Game extends Scene {
  setup() { log.push("Game setup " + score) }
  onKeyDown(key) { if (key === "k") go("menu", { keep: true }); else if (key === "m") go("Menu"); else window.result = log }
}
function onKeyDown(key) { log.push("file " + key) }
`, { until: 'window.scene.scenes?.name === "Menu"' })
  for (const [press, then] of [['g', 'Game'], ['k', 'Menu'], ['n', 'Game'], ['m', 'Menu'], ['r', 'Menu'], ['g', 'Game'], ['!', 'Game']]) {
    await key(page, press)
    await page.waitForFunction((then) => window.scene.scenes?.name === then, then, { timeout: 2000 }).catch(() => {})
    await frames(page)
  }
  got = await page.evaluate(() => window.error || window.result)
  say(same(got, ['Menu setup 0', 'file g', 'Game setup 10', 'file k', 'Menu resume 1', 'file n', 'Game setup 20', 'file m', 'Menu setup 0', 'file r', 'Menu setup 0', 'file g', 'Game setup 40', 'file !']), name,
    'go(Class), go("name"), nextScene() and restart() change the scene; { keep: true } comes back to a scene as it was left and calls resume(); only the current scene hears a key, after the file\'s own function; what the file made at its top level is shared', got)
  await key(page, 'm')
  await page.waitForFunction(() => window.scene.scenes?.name === 'Menu').catch(() => {})
  await frames(page)
  await key(page, 'x')
  await page.waitForFunction(() => window.error, null, { timeout: 2000 }).catch(() => {})
  got = await page.evaluate(() => window.error)
  say(/^In the scene Menu: go\("nowhere"\): there is no scene called "nowhere"\. The scenes are: Menu, Game$/.test(got?.error) && (got.line === 7 || (name === 'webkit' && got.line === 0)), name,
    `a mistake in a scene names the scene${got?.line ? ' and its line' : ''}, and going to a scene that is not there lists the ones that are`, got)

  // --- lengths: seconds, and beats against the sound library's clock (held by the test)
  got = await play(page, `const t0 = performance.now(), log = []
class A extends Scene { length = 0.4; update() { this.p = sceneProgress; this.t = sceneTime } onStop() { log.push(["A", Math.round((performance.now() - t0) / 100), this.p > 0.8 && this.p <= 1, this.t > 0.3]) } }
class B extends Scene { setup() { log.push(["B", sceneTime < 0.12, sceneProgress]); window.result = log } }
`)
  say(same(got, [['A', 4, true, true], ['B', true, 0]]), name, 'a scene with a length ends after it; sceneTime and sceneProgress run through it, and a scene with no length has no progress', got)
  got = await play(page, `setTempo(120)
const log = []
window.log = log
class A extends Scene { beats = 4; setup() { log.push("A") } update() { window.seen = [sceneTime, sceneProgress] } }
class B extends Scene { bars = 2; setup() { log.push("B") } }
class C extends Scene { setup() { log.push("C") } }
`, { options: '(window.clock = 100, { sound: { clock: () => window.clock } })', until: 'window.log?.length === 1' })
  const beatSteps = []
  for (const to of [101.9, 102.05, 105.9, 106.1]) {
    await page.evaluate((to) => { window.clock = to }, to)
    await frames(page, 4)
    beatSteps.push(await page.evaluate(() => [window.log.join(''), Math.round(window.seen[0] * 100) / 100, Math.round(window.seen[1] * 1000) / 1000]))
  }
  say(same(beatSteps.map((s) => s[0]), ['A', 'AB', 'AB', 'ABC']) && same(beatSteps[0].slice(1), [1.9, 0.95]) && same(await page.evaluate(() => [window.told.duration, window.told.sections.map((s) => s.t)]), [0, [0, 2, 6]]), name,
    'beats = 4 and bars = 2 end a scene on the beat of the sound library\'s clock at its tempo, whatever the frames do', beatSteps)

  // --- transitions, measured on the screen at their start, half way and end
  const shot = async () => pixels(await page.screenshot({ clip: { x: 0, y: 0, width: 300, height: 200 } }))
  const RED = [255, 0, 0], BLUE = [0, 0, 255], WHITE = [255, 255, 255]
  const change = async (how) => {
    await play(page, PAIR(how), { until: 'window.scene.scenes?.name === "Red"' })
    await frames(page)
    await key(page, 'a')
    await page.waitForFunction(() => window.scene.scenes?.name === 'Blue' && window.scene.transition)
    const seen = {}
    for (const p of [0, 0.25, 0.5, 1]) {
      await page.evaluate((p) => window.scene.transition.hold(p), p)
      await frames(page, 2)
      seen[p] = await shot()
    }
    return seen
  }
  let seen = await change('{ transition: "crossfade", transitionTime: 30 }')
  got = [seen[0].at(100, 100), seen[0.5].at(100, 100), seen[0.5].at(250, 100), seen[1].at(100, 100), seen[1].at(250, 100)]
  say(near(got[0], RED, 1) && near(got[1], [128, 0, 128], 3) && near(got[2], [128, 128, 255], 3) && near(got[3], BLUE, 1) && near(got[4], BLUE, 1), name,
    'a crossfade is the old scene at its start, the average of the two half way, and the new scene at its end', got)
  seen = await change('{ transition: "wipe", transitionTime: 30 }')
  got = [seen[0].at(5, 100), seen[0.5].at(148, 100), seen[0.5].at(152, 100), seen[0.5].at(250, 100), seen[0.25].at(73, 100), seen[0.25].at(77, 100), seen[1].at(295, 100)]
  say(same(got, [RED, BLUE, RED, WHITE, BLUE, RED, BLUE]), name, 'a wipe\'s edge crosses from the left: at a quarter of the way across at 0.25 and in the middle at 0.5, the new scene behind it and the old still ahead', got)
  seen = await change('{ transition: "wipe_down", transitionTime: 30 }')
  got = [seen[0.5].at(100, 98), seen[0.5].at(100, 102), seen[1].at(100, 198)]
  say(same(got, [BLUE, RED, BLUE]), name, 'wipe_down\'s edge comes down from the top', got)
  seen = await change('{ transition: "slide_left", transitionTime: 30 }')
  got = [seen[0].at(250, 100), seen[0.5].at(100, 100), seen[0.5].at(50, 100), seen[0.5].at(148, 100), seen[0.5].at(152, 100), seen[1].at(5, 100)]
  say(same(got, [WHITE, WHITE, RED, RED, BLUE, BLUE]), name, 'slide_left moves the old scene out to the left with the new one following it in: half way, each has half the picture', got)
  seen = await change('{ transition: "slide_down", transitionTime: 30 }')
  got = [seen[0.5].at(100, 98), seen[0.5].at(100, 102), seen[0.5].at(250, 150)]
  say(same(got, [BLUE, RED, WHITE]), name, 'slide_down moves the old scene out at the bottom, the new one coming in from the top', got)
  seen = await change('{ transition: "fade", transitionTime: 30, transitionColor: "rgb(0,255,0)" }')
  got = [seen[0].at(100, 100), seen[0.25].at(100, 100), seen[0.5].at(100, 100), seen[1].at(100, 100)]
  say(near(got[0], RED, 1) && near(got[1], [128, 128, 0], 3) && near(got[2], [0, 255, 0], 1) && near(got[3], BLUE, 1), name, 'a fade goes through its colour: the old scene half under it at 0.25, the colour alone half way, the new scene at the end', got)
  // A RECORDING has the transition: it is in the layer's own pixels, not a style, so drawing the scene's canvases one
  // over another (what a recorder does) gives what the screen shows; and it moves by the scene's frame time alone.
  const recorded = () => page.evaluate(() => {
    const out = document.createElement('canvas')
    out.width = 300; out.height = 200
    const g = out.getContext('2d')
    const styled = []
    for (const c of document.querySelectorAll('#s canvas')) {
      g.drawImage(c, 0, 0, 300, 200)
      styled.push([c.style.opacity, c.style.clipPath, c.style.transform].join(''))
    }
    const at = (x, y) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3)
    return { styled: styled.join(''), a: at(100, 100), b: at(250, 100), c: at(50, 100), d: at(152, 100) }
  })
  got = []
  for (const kind of ['crossfade', 'wipe', 'slide_left', 'fade']) {
    await play(page, PAIR(`{ transition: "${kind}", transitionTime: 30 }`), { until: 'window.scene.scenes?.name === "Red"' })
    await frames(page)
    await key(page, 'a')
    await page.waitForFunction(() => window.scene.scenes?.name === 'Blue' && window.scene.transition)
    await page.evaluate(() => window.scene.transition.hold(0.5))
    await frames(page, 2)
    got.push(await recorded())
  }
  say(got.every((r) => r.styled === '') && near(got[0].a, [128, 0, 128], 3) && near(got[0].b, [128, 128, 255], 3) && same([got[1].a, got[1].d, got[1].b], [BLUE, RED, WHITE]) &&
    same([got[2].a, got[2].c, got[2].d], [WHITE, RED, BLUE]) && near(got[3].a, [0, 0, 0], 1), name,
    'a recording has the transition: with no style on any canvas, the scene\'s canvases drawn one over another are the crossfade, the wipe, the slide and the fade as the screen shows them', got)
  // Stepped a frame at a time (a recorder's clock), a transition moves by exactly the time it is stepped.
  await play(page, PAIR('{ transition: "crossfade", transitionTime: 1 }'), { until: 'window.scene.scenes?.name === "Red"' })
  got = await page.evaluate(async () => {
    // The page's frames, taken over: each is given the time the test says.
    const queue = []
    let now = performance.now()
    window.requestAnimationFrame = (fn) => queue.push(fn)
    await new Promise((done) => setTimeout(done, 100))
    const step = (ms) => { now += ms; for (const fn of queue.splice(0)) fn(now) }
    step(20)
    for (const type of ['keydown', 'keyup']) window.scene.canvas.dispatchEvent(new KeyboardEvent(type, { key: 'a', code: 'a', bubbles: true }))
    step(20)
    const seen = []
    for (let i = 0; i < 4; i++) { step(50); seen.push(Math.round(window.scene.transition.progress * 1000) / 1000) }
    await new Promise((done) => setTimeout(done, 300))
    seen.push(Math.round(window.scene.transition.progress * 1000) / 1000)
    return seen
  })
  await page.goto(`${at}/test.html`)
  say(same(got, [0.05, 0.1, 0.15, 0.2, 0.2]), name, 'stepped a frame at a time, a transition moves by the frames\' own time and stands still between them', got)
  // A 3D file: the picture a WebGL canvas showed is gone once shown, so the old scene is drawn once more to be kept.
  await play(page, `const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setSize(width, height, false)
const camera = new THREE.PerspectiveCamera()
class Red extends Scene {
  setup() { this.world = new THREE.Scene(); this.world.background = new THREE.Color("rgb(255,0,0)") }
  draw() { renderer.render(this.world, camera) }
  onKeyDown() { go("Blue", { transition: "crossfade", transitionTime: 30 }) }
}
class Blue extends Scene {
  setup() { this.world = new THREE.Scene(); this.world.background = new THREE.Color("rgb(0,0,255)") }
  draw() { renderer.render(this.world, camera) }
}
`, { until: 'window.scene.scenes?.name === "Red"', wait: 8000 })
  await frames(page)
  await key(page, 'a')
  await page.waitForFunction(() => window.error || (window.scene.scenes?.name === 'Blue' && window.scene.transition), null, { timeout: 3000 }).catch(() => {})
  got = [await page.evaluate(() => window.error)]
  if (!got[0]) {
    for (const p of [0, 0.5, 1]) {
      await page.evaluate((p) => window.scene.transition.hold(p), p)
      await frames(page, 2)
      got.push((await shot()).at(100, 100))
    }
  }
  say(!got[0] && near(got[1], RED, 2) && near(got[2], [128, 0, 128], 4) && near(got[3], BLUE, 2), name, 'a 3D file\'s scenes change with the same transitions: the old picture is kept and mixed with the new one', got)
  // Left to run, a transition is over in its time and leaves nothing behind; the scene's canvas was never drawn on by it.
  await play(page, PAIR('{ transition: "crossfade", transitionTime: 0.3 }'), { until: 'window.scene.scenes?.name === "Red"' })
  await frames(page)
  await key(page, 'a')
  await page.waitForFunction(() => window.scene.transition)
  const during = await page.evaluate(() => ({ layers: document.querySelectorAll('[data-pictures-transition]').length, name: window.scene.transition.name,
    canvas: [...window.scene.canvas.getContext('2d').getImageData(100, 100, 1, 1).data].slice(0, 3) }))
  await page.waitForFunction(() => !window.scene.transition, null, { timeout: 3000 }).catch(() => {})
  const afterwards = await page.evaluate(() => ({ layers: document.querySelectorAll('[data-pictures-transition]').length, transform: window.scene.canvas.style.transform }))
  say(same(during, { layers: 1, name: 'crossfade', canvas: BLUE }) && same(afterwards, { layers: 0, transform: '' }), name,
    'a transition is one layer over the scene while it lasts, gone when its time is up; the new scene draws on its own canvas throughout', { during, afterwards })
  // A scene's own transition, config's for every scene, and Pymations' other words.
  got = await play(page, `config({ transition: "wipe", transition_time: 20 })
const seen = []
class A extends Scene { length = 0.1 }
class B extends Scene { transition = "none"; length = 0.1; setup() { seen.push(window.scene.transition?.name ?? "cut") } }
class C extends Scene { transition = "slide"; transitionTime = 0.05; length = 0.2; setup() { seen.push(window.scene.transition.name + " " + window.scene.transition.seconds) } }
class D extends Scene { setup() { seen.push(window.scene.transition.name + " " + window.scene.transition.seconds); window.result = seen } }
`)
  say(same(got, ['cut', 'slide_left 0.05', 'wipe 20']), name, 'a scene\'s own transition is how it arrives ("none" is a cut, "slide" goes left), and config\'s is for every scene that says nothing; the first scene arrives with none', got)
  got = await play(page, PAIR('{ transition: "swirl" }'), { until: 'window.scene.scenes?.name === "Red"' })
  await key(page, 'a')
  await page.waitForFunction(() => window.error, null, { timeout: 2000 }).catch(() => {})
  got = await page.evaluate(() => window.error)
  say(/There is no transition "swirl"\. The transitions are: cut, crossfade, fade, wipe, /.test(got?.error), name, 'a transition that does not exist lists the ones that do', got)
  // A host's own transition (an effects library's) is handed the two pictures and the progress.
  await play(page, PAIR('{ transition: "dissolve", transitionTime: 30 }'), { until: 'window.scene.scenes?.name === "Red"',
    options: `(window.heard = [], { transitions: { dissolve: {
      start({ from, to, seconds }) { window.heard.push(["start", [...from.getContext("2d").getImageData(100, 100, 1, 1).data].slice(0, 3).join(), to === window.scene.canvas, from.isConnected, seconds]) },
      frame(p) { window.at = p }, end() { window.heard.push(["end"]) } } } })` })
  await frames(page)
  await key(page, 'a')
  await page.waitForFunction(() => window.scene.transition)
  await page.evaluate(() => window.scene.transition.hold(0.5))
  got = await page.evaluate(() => { const at = window.at; window.scene.stop(); return [window.heard, at] })
  say(same(got, [[['start', '255,0,0', true, false, 30], ['end']], 0.5]), name, 'a transition a host adds by name is given the old scene\'s last picture, the scene\'s canvas and the progress each frame, and is told when it is over', got)

  // --- the scrubber and what a host is told
  got = await play(page, `const log = []
window.log = log
class Intro extends Scene { length = 2; setup() { log.push("Intro " + sceneTime.toFixed(1)) } draw() { background("red") } }
class Main extends Scene { length = 6; setup() { log.push("Main " + sceneTime.toFixed(1)); section("Chorus") } draw() { background("blue") } }
class Outro extends Scene { length = 2; setup() { log.push("Outro " + sceneTime.toFixed(1)) } draw() { background("green") } }
function onSeek(t) { log.push("seek " + t.toFixed(1)) }
`, { until: 'window.log?.length === 1' })
  const bar = await page.evaluate(() => ({ told: window.told, ticks: [...document.querySelectorAll('.pictures-ticks i')].map((i) => [i.title, i.style.left]), time: document.querySelector('.pictures-time').textContent }))
  say(same(bar.told, { sections: [{ name: 'Intro', t: 0, length: 2, scene: true }, { name: 'Main', t: 2, length: 6, scene: true }, { name: 'Outro', t: 8, length: 2, scene: true }], duration: 10 }) &&
    same(bar.ticks, [['Main', '20%'], ['Outro', '80%']]) && bar.time === '0:00 / 0:10', name,
    'a sequence of timed scenes reports each as a section with its start, and has a scrubber with a tick where each begins after the first, as Pymations\' has', bar)
  const track = await page.evaluate(() => { const b = document.querySelector('.pictures-track').getBoundingClientRect(); return [b.left, b.top + b.height / 2, b.width] })
  await page.mouse.move(track[0] + track[2] * 0.5, track[1])
  await page.mouse.down()
  await page.mouse.up()
  await frames(page, 4)
  got = await page.evaluate(() => [window.log, window.scene.scenes.name, Math.round(window.scene.scenes.time), window.told.sections.map((s) => s.name), [...window.scene.canvas.getContext('2d').getImageData(10, 10, 1, 1).data].slice(0, 3)])
  say(same(got, [['Intro 0.0', 'Main 3.0', 'seek 5.0'], 'Main', 5, ['Intro', 'Main', 'Chorus', 'Outro'], BLUE]), name,
    'a press on the scrubber goes to that time: the scene there is set up with sceneTime already on, the file\'s onSeek is told, and section() adds a mark', got)
  await page.evaluate(() => { window.scene.scenes.pause(true); window.was = window.scene.scenes.time })
  await page.waitForTimeout(250)
  got = await page.evaluate(() => { const still = window.scene.scenes.time === window.was; window.scene.scenes.seek(9); return [still, window.scene.scenes.name, document.querySelector('.pictures-play').getAttribute('aria-label')] })
  await frames(page, 2)
  say(same(got, [true, 'Outro', 'Play']) && same(await page.evaluate(() => [...window.scene.canvas.getContext('2d').getImageData(10, 10, 1, 1).data].slice(0, 3)), [0, 128, 0]), name, 'paused, time stands still, and the picture still follows a seek', got)
  got = await play(page, 'class A extends Scene { length = 1; setup() { window.result = !!document.querySelector(".pictures-bar") } }\nclass B extends Scene { length = 1 }\n', { options: '({ controls: false })' })
  const untimed = await play(page, 'class A extends Scene { length = 1; setup() { window.result = !!document.querySelector(".pictures-bar") } }\nclass B extends Scene { }\n')
  say(got === false && untimed === false, name, 'no scrubber with controls: false, nor for a program whose length is not known (a scene the program ends itself)', { got, untimed })

  // config() alone, at the top of a file that has no scene yet, is not a mistake.
  got = await play(page, 'config({ transition: "crossfade" })\nfunction draw() { background("black"); window.result = [window.scene.scenes, typeof Scene] }\n')
  say(same(got, [null, 'function']), name, 'config() alone at the top of a file with no scene yet runs: the file is one scene, as before', got)

  // --- a file with no scenes
  await page.goto(`${at}/test.html`)
  asked.length = 0
  got = await play(page, `let n = 0
const scene = { go: 1 }
function restart() { n = 0 }
function update(dt) { n++ }
function draw() { background("black"); if (n === 5) { restart(); window.result = [typeof sceneTime, window.scene.scenes, window.scene.transition, document.getElementById("s").dataset.picturesScene ?? null] } }
`)
  say(same(got, ['undefined', null, null, null]) && same(asked, ['pictures.js']), name,
    'a file with no scenes is one scene as before: no scene names in it, no director, nothing more fetched, and its own scene and restart are its own', { got, asked })
  await browser.close()
}
server.close()
process.exit(failed ? 1 : 0)
