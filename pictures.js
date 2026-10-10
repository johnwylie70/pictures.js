/**
 * pictures.js: write a short .js file and it draws. The JavaScript
 * sibling of Pyctures, with the same program shape.
 *
 * A SCENE is a plain script. These names are ready in it, with no import:
 *
 *   ctx                     the 2D drawing surface (a 2D scene)
 *   circle, rect, line,     plain drawing, one call each: circle(x, y, radius, colour), rect(x, y, width, height, colour),
 *   text, background,       line(x1, y1, x2, y2, colour, thickness), text(words, x, y, colour, size, "centre"),
 *   triangle, ellipse,      background(colour), triangle(x1, y1, x2, y2, x3, y3, colour), ellipse(x, y, width, height, colour),
 *   polygon, star           polygon(x, y, radius, sides, colour), star(x, y, radius, points, colour). A colour that is left
 *                           out is the one ctx has; one that is given stays. Any shape takes { outline, thickness } last:
 *                           with a colour it is a border, in place of the colour it is the edge alone
 *   picture                 an emoji, a word or an image file in one call, centred: picture("🌙", x, y, size)
 *   random, pick            random(1, 6): a whole number from 1 to 6; random(): a fraction; pick(list): one of a list
 *   degrees                 an angle said in degrees, wherever an angle is wanted: `ship.angle = degrees(90)`
 *   canvas                  the canvas itself, for 3D and for event listeners
 *   THREE, addons           three.js and addons.OrbitControls (a 3D scene)
 *   width, height           the canvas size in screen points; they follow a resize
 *   pixelRatio              real pixels per screen point
 *   frame, flush, sleep     used with `await`: the next frame, or a pause in seconds
 *   vsync                   another name for frame: `await vsync()` waits for the screen's next refresh
 *   keys, mouse             what is held right now (a Set of key names, with keys.shift, keys.ctrl, keys.alt,
 *                           keys.meta and keys.codes; x, y, down, button, inside, dx, dy, wheel)
 *   pressed, released       the keys that went down, and came up, since the last frame (Sets of key names)
 *   touches                 every finger or mouse button down right now: id, x, y, startX, startY, dx, dy, type
 *   pinch                   two fingers, or a trackpad pinch: scale, change, x, y
 *   Sprite, loadImage       moving pictures, and an image from a file beside the scene. A sprite's picture is an
 *                           emoji, an image, or a function that draws it, `function drawShip(size) { … }` (one
 *                           written `(ctx, size)` is given both); Sprite.box and Sprite.circle are plain
 *                           shapes. It has x, y, vx, vy, angle, spin, size, shape ("circle" or "box"), visible, and
 *                           update(dt), draw(), touches(other), hit(list), contains(x, y), wrap(), bounce(),
 *                           offscreen(), push(amount), forward(distance), limit(speed), angleTo(), distanceTo()
 *   remove                  take a thing out of a list: `remove(rocks, rock)`. Loop over a copy while removing:
 *                           `for (const rock of [...rocks])`
 *   save, load              values that are still there next time: `save("best", score)` keeps one under a name, and
 *                           `load("best", 0)` gives it back (0 if nothing was saved). Numbers, text, true and false,
 *                           lists and objects. Kept by the browser, for this scene alone
 *   loadText, loadJSON      a file beside the scene, with `await`
 *   loadFont                a font file beside the scene, with `await`: `await loadFont("Orbitron", "fonts/Orbitron.woff2")`
 *   use                     another .js file beside the scene, with `await`: what it exports
 *   measure                 time a part of your frame: `measure("physics", () => { … })`, shown with the frame rate
 *
 * and these functions are called if the scene defines them:
 *
 *   setup()                 once, before the first frame (may be async)
 *   update(dt)              every frame, dt in seconds
 *   draw()                  every frame, after update
 *   onKeyDown(key, code), onKeyUp(key, code)
 *   onKeyRepeat(key, code)  each time a key that is held down repeats (typing: Backspace held)
 *   onMouseDown(x, y, button), onMouseMove(x, y), onMouseUp(x, y, button)
 *   onTouchStart(touch), onTouchMove(touch), onTouchEnd(touch, cancelled)
 *   onWheel(amount), onPinch(scale, change)
 *   onStop()                when the scene is stopped or run again: let go of what it made itself
 *
 * The scene's code calls the canvas directly: nothing is recorded or replayed,
 * so it runs at the browser's own speed. The Python spellings (`pixel_ratio`,
 * `load_image`, `on_key_down`, …) work too, so a Pyctures scene comes across
 * with little more than its syntax changed.
 *
 * On a page: `<div data-pictures-src="hello.js"></div>` and
 * `<script type="module" src="pictures.js"></script>`. From JavaScript:
 * `runScene(container, { source })` or `{ src }`.
 *
 * MIT licence.
 */

const BASE = new URL('./', import.meta.url)
const AsyncFunction = (async () => {}).constructor

/** The names a scene is given, in the order they are passed. */
const GIVEN = ['__loop', 'ctx', 'canvas', 'THREE', 'addons', 'frame', 'vsync', 'flush', 'sleep', 'keys', 'mouse', 'pressed', 'released',
  'touches', 'pinch', 'circle', 'rect', 'line', 'text', 'background', 'triangle', 'ellipse', 'polygon', 'star', 'picture', 'random', 'pick', 'degrees', 'Sprite', 'remove', 'loadImage', 'load_image', 'loadText', 'load_text', 'loadJSON', 'load_json', 'loadFont', 'load_font', 'save', 'load', 'use', 'measure']
/** The functions a scene may define, Python spelling beside the JavaScript one. */
const HOOKS = {
  setup: ['setup'], update: ['update'], draw: ['draw'],
  keyDown: ['onKeyDown', 'on_key_down'], keyUp: ['onKeyUp', 'on_key_up'], keyRepeat: ['onKeyRepeat', 'on_key_repeat'],
  mouseDown: ['onMouseDown', 'on_mouse_down'], mouseMove: ['onMouseMove', 'on_mouse_move'],
  mouseUp: ['onMouseUp', 'on_mouse_up'],
  touchStart: ['onTouchStart', 'on_touch_start'], touchMove: ['onTouchMove', 'on_touch_move'],
  touchEnd: ['onTouchEnd', 'on_touch_end'],
  wheel: ['onWheel', 'on_wheel'], pinch: ['onPinch', 'on_pinch'],
  stop: ['onStop', 'on_stop'],
}
/**
 * SAVED VALUES: `save("best", 120)` and `load("best", 0)`. A value is kept as JSON text in the
 * page's localStorage, one entry for each name, under `pictures:<the scene>:<name>`, so two
 * scenes on one site never read each other's and nothing else the page keeps is touched.
 * Where the page has no storage (a private window, a frame that is refused it) or the storage
 * is full, what is saved is kept here instead, for as long as the page is open.
 */
const KEPT = new Map()
const CAN_KEEP = 'It can keep numbers, text, true and false, lists and objects'

/** Lines the wrapper puts above the scene's first line, for error messages. */
const LINES_ABOVE = 4

const NO_SELECT = 'user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent'

/** How long a loop may hold the page before it is stopped, in milliseconds. */
const STUCK_MS = 4000

/**
 * STOPPING A STUCK LOOP, for a host that asks (`stopStuckLoops`: an editor's
 * preview, where a loop is often run half typed). A scene runs on the page's
 * own thread, so a loop that never waits would freeze the page, and the
 * editor round it, for good. Each `while`, `for` and `do` body with braces
 * gets a check at its top that stops a loop which has held the page for
 * STUCK_MS.
 *
 * Off by default: without it a scene's code runs exactly as written. With it
 * the cost is a counter step per pass, kept in a variable of the loop's own
 * function (the clock is read once in 8,192 passes): about a nanosecond a
 * pass, which shows only in a loop that does almost nothing else. The check
 * goes on the same line, so line numbers stay true. A loop without braces,
 * and code in a helper file, are left as they are.
 */
/** For a text: a function giving the end of a string, template or comment starting at `at`, or `at` when none starts there. */
function skipper(source) {
  const n = source.length
  const skip = (at) => {
    const c = source[at], d = source[at + 1]
    if (c === '/' && d === '/') { const e = source.indexOf('\n', at); return e < 0 ? n : e }
    if (c === '/' && d === '*') { const e = source.indexOf('*/', at + 2); return e < 0 ? n : e + 2 }
    if (c === '"' || c === "'") {
      let j = at + 1
      while (j < n && source[j] !== c && source[j] !== '\n') j += source[j] === '\\' ? 2 : 1
      return Math.min(n, j + 1)
    }
    if (c === '`') {
      let j = at + 1
      while (j < n && source[j] !== '`') {
        if (source[j] === '\\') { j += 2; continue }
        if (source[j] === '$' && source[j + 1] === '{') {
          let depth = 1
          j += 2
          while (j < n && depth) {
            const e = skip(j)
            if (e !== j) { j = e; continue }
            if (source[j] === '{') depth++
            else if (source[j] === '}') depth--
            j++
          }
          continue
        }
        j++
      }
      return Math.min(n, j + 1)
    }
    return at
  }
  return skip
}

export function guardLoops(source) {
  let out = ''
  let i = 0
  const n = source.length
  const skip = skipper(source)
  const word = /[A-Za-z0-9_$]/
  while (i < n) {
    const e = skip(i)
    if (e !== i) { out += source.slice(i, e); i = e; continue }
    const m = /^(?:while|for(?:\s+await)?|do)(?![A-Za-z0-9_$])/.exec(source.slice(i, i + 12))
    const before = source[i - 1]
    if (!m || (before && (word.test(before) || before === '.'))) { out += source[i++]; continue }
    let j = i + m[0].length
    while (j < n && /\s/.test(source[j])) j++
    if (m[0] !== 'do') {
      if (source[j] !== '(') { out += source.slice(i, j); i = j; continue }
      let depth = 0
      for (; j < n; j++) {
        const s2 = skip(j)
        if (s2 !== j) { j = s2 - 1; continue }
        if (source[j] === '(') depth++
        else if (source[j] === ')' && !--depth) { j++; break }
      }
      while (j < n && /\s/.test(source[j])) j++
    }
    if (source[j] !== '{') { out += source.slice(i, j); i = j; continue }
    out += source.slice(i, j + 1) + 'var __n;if(!((__n=-~__n)&8191))__loop();'
    i = j + 1
  }
  return out
}

/**
 * The scene as a function. `width`, `height` and the pixel ratio are real
 * variables of an outer function, which the runtime sets on a resize; the
 * scene's own code sits one function inside, so it may declare any name
 * again. It hands back the hooks it defined.
 */
function compile(source, name, guarded) {
  const found = Object.entries(HOOKS).map(([hook, names]) =>
    `${hook}: ${names.map((n) => `typeof ${n} === 'function' ? ${n} : `).join('')}undefined`).join(', ')
  const body = `let width = 0, height = 0, pixelRatio = 1, pixel_ratio = 1; __size((w, h, r) => { width = w; height = h; pixelRatio = pixel_ratio = r })
return (async () => {
${guarded ? guardLoops(source) : source}
;return { ${found} }
})()
//# sourceURL=${name}`
  return new AsyncFunction(...GIVEN, '__size', body)
}

/** The scene's code without its comments and strings, for the tests on what it uses. */
const codeOf = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""')
  .replace(/\/\/.*$/gm, '')

/** A scene that asks the canvas for a context itself (WebGL of its own) is given no 2D one: a canvas has one kind. */
const ownsContext = (source) => /\bcanvas\s*\.\s*getContext\s*\(/.test(codeOf(source))

/**
 * Does the scene take the pointer (mouse, onMouse…, touches, onTouch…, pinch,
 * the wheel, its own listeners, orbit controls)? If not, a finger on it
 * scrolls the page: on a phone the scene may be the only thing on screen to
 * drag. `code` is the scene without comments and strings: `touches` and
 * `pinch` are ordinary words, and `sprite.touches(other)` is not the pointer.
 */
const usesPointer = (source, code) => /\bmouse\b|\bon_?[Mm]ouse|\baddEventListener\b|\bOrbitControls\b|\bon(?:pointer|touch|mouse|click)/.test(source) ||
  /(?:^|[^.\w$])touches\b|\bon_?[Tt]ouch/.test(code) || usesWheel(code) || usesPinch(code)

/** A scene that names the wheel (onWheel, mouse.wheel) keeps it; under any other scene the wheel scrolls the page. */
const usesWheel = (code) => /\bon_?[Ww]heel\b|\bmouse\s*\.\s*wheel\b/.test(code)

/** A scene that names the pinch (pinch, onPinch) keeps a two-finger pinch and the trackpad's (ctrl + wheel). */
const usesPinch = (code) => /(?:^|[^.\w$])pinch\b|\bon_?[Pp]inch\b/.test(code)

/** A finger or a mouse button that is down. The Python spellings read too. */
class Finger {
  constructor(id, x, y, type) {
    this.id = id
    this.x = this.startX = x
    this.y = this.startY = y
    this.dx = this.dy = 0
    this.type = type
  }
  get start_x() { return this.startX }
  get start_y() { return this.startY }
}
const BUTTONS = ['left', 'middle', 'right']

/**
 * HIT-TESTING: numbers in, yes or no out. Nothing here knows what a sprite is,
 * so a game engine can call these as they are, or put its own in their place.
 * A circle is its centre and radius. A box is its centre, width and height;
 * `turn` is the angle it is turned by, in radians (two boxes are tested upright).
 * Shapes that only just meet at an edge do not touch; a point on an edge is inside.
 */
export function circlesTouch(ax, ay, ar, bx, by, br) {
  const r = ar + br
  return (ax - bx) ** 2 + (ay - by) ** 2 < r * r
}
export function boxesTouch(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh
}
export function circleTouchesBox(cx, cy, cr, bx, by, bw, bh, turn = 0) {
  let dx = cx - bx, dy = cy - by
  if (turn) {
    // Seen from the box: turn the circle's centre back by the box's angle.
    const c = Math.cos(turn), s = Math.sin(turn), x = dx * c + dy * s
    dy = dy * c - dx * s
    dx = x
  }
  // How far the centre is outside the box, across and down (0 when it is level with it).
  dx = Math.max(Math.abs(dx) - bw / 2, 0)
  dy = Math.max(Math.abs(dy) - bh / 2, 0)
  return dx * dx + dy * dy < cr * cr
}
export function pointInCircle(px, py, cx, cy, cr) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= cr * cr
}
export function pointInBox(px, py, bx, by, bw, bh, turn = 0) {
  let dx = px - bx, dy = py - by
  if (turn) {
    const c = Math.cos(turn), s = Math.sin(turn), x = dx * c + dy * s
    dy = dy * c - dx * s
    dx = x
  }
  return Math.abs(dx) * 2 <= bw && Math.abs(dy) * 2 <= bh
}
/**
 * Two sprites, by their shapes. Anything with x, y and size will do for a circle (its radius
 * is `fit` of its size, 0.4 unless it says); a box also has width, height and angle.
 */
function spritesTouch(a, b) {
  if (a.isBox) {
    if (b.isBox) return boxesTouch(a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height)
    return circleTouchesBox(b.x, b.y, b.size * (b.fit ?? 0.4), a.x, a.y, a.width, a.height, a.angle)
  }
  if (b.isBox) return circleTouchesBox(a.x, a.y, a.size * (a.fit ?? 0.4), b.x, b.y, b.width, b.height, b.angle)
  return circlesTouch(a.x, a.y, a.size * (a.fit ?? 0.4), b.x, b.y, b.size * (b.fit ?? 0.4))
}
/**
 * A SPRITE'S PICTURE FUNCTION is given `(ctx, size)`, as it always was. One kind is given the size
 * alone: a function with exactly one parameter, and that parameter is called `size`
 * (`function drawShip(size) { … }`). Counting parameters would not do: a function written
 * `(ctx)`, under any name, has one too and must go on getting ctx. Going by the name `size`,
 * no picture function that worked before is called any differently.
 */
const takesSize = (fn) => fn.length === 1 &&
  /^(?:async\s+)?(?:(?:function\b\s*\*?\s*[\w$]*|[\w$]+)\s*)?\(\s*size\s*\)|^(?:async\s+)?size\s*=>/.test(Function.prototype.toString.call(fn))

/** Is this one of the edges asked for? With none named, every edge is. */
const edgeWanted = (edge, a, b, c, d) => a === undefined || a === edge || b === edge || c === edge || d === edge

/** A 3D scene names THREE in its code (not in a comment or a string); only then is three.js loaded, and no 2D context is made. */
const uses3D = (source) => /\b(?:THREE|addons)\s*\./.test(codeOf(source))

let three = null
function loadThree() {
  three ??= Promise.all([
    import(new URL('three/three.module.min.js', BASE).href),
    import(new URL('three/OrbitControls.js', BASE).href),
  ]).then(([THREE, controls]) => ({ THREE, addons: { OrbitControls: controls.OrbitControls } }))
  return three
}

/**
 * THE LINE OF A MISTAKE MADE WHILE THE SCENE RUNS. Most engines name the scene
 * in the error's stack (the `sourceURL` line the wrapper ends with). Safari's
 * engine, which every browser on an iPad or iPhone uses, leaves code made from
 * text without a name there, but puts the line on the error itself: with no
 * address on the error and none on the stack's first entry, it was thrown by
 * the scene's own code. An error the library throws for the scene (a file that
 * is not there) has the library's address, so there the line is not known.
 */
function lineOf(error, name, lines) {
  const stack = String(error?.stack || '')
  const at = stack.match(new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`))
  let line = at ? Number(at[1]) - LINES_ABOVE : 0
  if (!at && typeof error?.line === 'number' && !error.sourceURL && /^[^@\n]*@?$/.test(stack.split('\n')[0])) line = error.line - LINES_ABOVE
  return line > 0 && line <= lines ? line : 0
}

/**
 * A `{`, `(` or `[` that is never closed: which one, and its line. Brackets
 * are matched in pairs, outside strings and comments. Null when all are
 * closed, or when they do not pair up (then the count cannot be trusted).
 */
export function neverClosed(source) {
  const skip = skipper(source)
  const open = []
  const pair = { ')': '(', ']': '[', '}': '{' }
  let line = 1
  for (let i = 0; i < source.length; i++) {
    const e = skip(i)
    if (e !== i) {
      for (let j = i; j < e; j++) if (source[j] === '\n') line++
      i = e - 1
      continue
    }
    const c = source[i]
    if (c === '\n') line++
    else if (c === '(' || c === '[' || c === '{') open.push({ bracket: c, line })
    else if (pair[c]) {
      const last = open.pop()
      if (!last || last.bracket !== pair[c]) return null
    }
  }
  return open.length ? open[open.length - 1] : null
}
const CLOSER = { '(': ')', '[': ']', '{': '}' }

/**
 * THE LINE OF A MISTAKE IN HOW THE SCENE IS WRITTEN. A scene is compiled with
 * `new Function`, and for that an engine gives the mistake but not where it is
 * (V8 gives nothing; the others give a line of their own wrapper at best). So
 * the same text is handed to the page as a script that is only read, never
 * run: the page's own error for it names the line. 0 when the page will not
 * say (a policy that refuses the script, or a mistake only the real wrapper has).
 * `past` is true when the engine read to the end of the scene before it
 * noticed: something was left open.
 */
function syntaxLine(source) {
  return new Promise((resolve) => {
    let url = ''
    const script = document.createElement('script')
    let told = false
    const done = (line) => {
      if (told) return
      told = true
      removeEventListener('error', heard, true)
      script.remove()
      if (url) URL.revokeObjectURL(url)
      // An engine may name the line after the last when the mistake is something never closed.
      const lines = source.split('\n').length
      resolve({ line: line > 1 ? Math.min(line - 1, lines) : 0, past: line - 1 > lines })
    }
    // Ours alone: the page is not told of this error a second time.
    const heard = (e) => {
      if (e.filename !== url) return
      e.preventDefault()
      e.stopImmediatePropagation()
      done(e.lineno || 0)
    }
    try {
      // One line above the scene's first, and never called: reading it is all that happens.
      url = URL.createObjectURL(new Blob([`(async function () {\n${source}\n})`], { type: 'text/javascript' }))
      addEventListener('error', heard, true)
      script.onload = script.onerror = () => done(0)
      script.src = url
      document.head.append(script)
      setTimeout(() => done(0), 2000)
    } catch (e) { done(0) }
  })
}

/**
 * Run a scene in `container`.
 *
 * @param {HTMLElement} container  The canvas fills it and follows its size.
 * @param {{ source?: string, src?: string, name?: string, base?: string, savedAs?: string,
 *           keyboard?: boolean, files?: Record<string, string>, fps?: boolean, stopStuckLoops?: boolean, crossOrigin?: string,
 *           onError?: (message: string, line: number) => void,
 *           onStatus?: (status: 'starting'|'running'|'finished'|'error') => void }} options
 *   `source` is the scene's code, or `src` its address. `base` is where files
 *   it loads by a relative path are (the scene's own folder by default).
 *   `files` maps a path as the scene writes it to an address to load instead, for a host with no folder to serve.
 *   `savedAs` names the scene for the values it saves with save() (its address by default, or its name on a page with none).
 *   `stopStuckLoops` stops a loop that holds the page for 4 seconds (see `guardLoops`); off unless asked for.
 *   `fps` shows the frame rate in a corner of the scene, with any measure() timings under it (also `showFps(on)` on what is returned).
 *   `keyboard` gives the scene the keyboard from the start (a scene that is the whole page).
 *   `crossOrigin` ('anonymous') is set on the images `loadImage` makes from the scene's own files, for a host
 *   whose page is on another origin than those files: the canvas can then still be read back, and WebGL may use the picture.
 * @returns {{ stop(): void, restart(source?: string): void, showFps(on: boolean): void, canvas: HTMLCanvasElement }}
 */
export function runScene(container, options = {}) {
  let run = 0
  let source = options.source
  const name = options.name || (options.src ? options.src.split('/').pop() : 'scene.js')
  const base = new URL(options.base || options.src || './', document.baseURI)
  // `files` wins: a host that has read the scene's files itself (an editor's preview) names them here.
  const files = options.files || null
  const at = (path) => (files && files[path]) || new URL(path, base).href
  // What this scene's saved values are kept under: its own address, so each scene on a site has its own.
  // A page with no address of its own (an editor's preview) has storage for one scene only: its name will do.
  const savedAs = 'pictures:' + (options.savedAs ?? (!/^(?:https?|file):$/.test(location.protocol) ? name
    : options.src ? new URL(options.src, document.baseURI).pathname : `${location.pathname}#${name}`)) + ':'

  if (getComputedStyle(container).position === 'static') container.style.position = 'relative'
  if (!container.clientHeight) container.style.aspectRatio = '16 / 9'
  let canvas = null
  let notice = null
  let stopRun = () => {}
  // The frame rate, top left, when asked for: frames counted over half a second, and under it
  // any parts of the frame the scene times itself with measure(). When a run ends its last
  // reading stays, dimmed; the next run starts a fresh one.
  let wantFps = !!options.fps
  let meter = null
  let sections = {}
  const fitMeter = () => {
    if (wantFps && !meter && canvas) {
      meter = document.createElement('div')
      meter.style.cssText = 'position:absolute;top:8px;left:8px;z-index:3;padding:4px 8px;border-radius:4px;background:rgba(0,0,0,.7);color:#fff;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none;white-space:pre;font-variant-numeric:tabular-nums'
      container.append(meter)
    } else if (!wantFps && meter) {
      meter.remove()
      meter = null
    }
  }

  const status = (s) => {
    container.dataset.picturesStatus = s
    options.onStatus?.(s)
    container.dispatchEvent(new CustomEvent('pictures-status', { detail: s }))
  }

  // A mistake in a helper file (one loaded with `use`) says which file and which of its lines.
  const helpers = new Map() // address -> the path the scene wrote
  const inHelper = (error) => {
    let from = error?.sourceURL, line = error?.line
    // The stack's first entry is where it was thrown (V8 writes "at name (address:line:column)").
    const first = String(error?.stack || '').split('\n').find((entry) => /^\s+at /.test(entry))
    const top = first && first.match(/\(?((?:https?|blob|file):[^\s()]+?):(\d+):\d+\)?$/)
    if (top) { from = top[1]; line = Number(top[2]) }
    const path = from && helpers.get(from)
    return path ? ` (in ${path}, line ${line})` : ''
  }

  const fail = (error, at = 0, said = '') => {
    stopRun()
    const line = at || lineOf(error, name, String(source ?? '').split('\n').length)
    const message = said || String(error?.message ?? error) + inHelper(error)
    console.error(error)
    status('error')
    options.onError?.(message, line)
    notice = document.createElement('div')
    // The message can be selected and copied, though the scene round it cannot.
    notice.style.cssText = 'position:absolute;inset:auto 0 0 0;z-index:4;padding:10px 12px;background:rgba(120,0,0,.92);color:#fff;font:13px/1.4 ui-monospace,monospace;white-space:pre-wrap;user-select:text;-webkit-user-select:text'
    const text = line ? `Line ${line}: ${message}` : message
    const words = document.createElement('span')
    words.textContent = `${text}  `
    const button = (label, act) => {
      const b = document.createElement('button')
      b.textContent = label
      b.style.cssText = 'margin-left:8px;font:inherit;user-select:none;-webkit-user-select:none'
      b.onclick = () => act(b)
      return b
    }
    const copy = async (b) => {
      const said = `${name}: ${text}`
      try {
        await navigator.clipboard.writeText(said)
      } catch (e) {
        // A frame without the clipboard permission: the old way still copies on a press.
        const box = document.createElement('textarea')
        box.value = said
        box.style.cssText = 'position:fixed;opacity:0'
        document.body.append(box)
        box.select()
        try { document.execCommand('copy') } catch (e2) { /* nothing more to try */ }
        box.remove()
      }
      b.textContent = 'Copied'
      setTimeout(() => { b.textContent = 'Copy' }, 1500)
    }
    notice.append(words, button('Run again', () => start()), button('Copy', copy))
    container.append(notice)
  }

  async function start() {
    stopRun()
    const mine = ++run
    const live = () => mine === run
    status('starting')
    notice?.remove()
    // A new canvas each run: a canvas keeps the kind of context it first gave.
    canvas?.remove()
    canvas = document.createElement('canvas')
    // A drag on a scene draws or steers; it never selects the page (the blue wash), calls up a menu or flashes a tap.
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;' + NO_SELECT
    container.style.cssText += ';' + NO_SELECT
    canvas.tabIndex = 0
    container.prepend(canvas)
    meter?.remove()
    meter = null

    const cleanup = []
    let raf = 0
    // What was in the box before the scene: anything it adds beside its canvas (an overlay) goes when it stops.
    const before = new Set(container.childNodes)
    fitMeter()
    let stopping = () => {}
    stopRun = () => {
      stopRun = () => {}
      cancelAnimationFrame(raf)
      try { stopping() } catch (e) { console.error(e) }
      for (const undo of cleanup.splice(0)) undo()
      for (const node of [...container.childNodes]) if (!before.has(node) && node !== canvas && node !== notice && node !== meter) node.remove()
      if (meter) meter.style.opacity = '0.45' // the last reading, plainly not live
    }

    try {
      if (source == null) {
        // The scene's own address is relative to the page; what it loads is relative to it.
        const reply = await fetch(new URL(options.src, document.baseURI))
        if (!reply.ok) throw new Error(`There is no file ${options.src}`)
        source = await reply.text()
      }
      const is3D = uses3D(source)
      const code = codeOf(source)
      const takesPointer = usesPointer(source, code)
      const takesWheel = usesWheel(code), takesPinch = usesPinch(code)
      canvas.style.touchAction = takesPointer ? 'none' : 'pan-y'
      const { THREE, addons } = is3D ? await loadThree() : {}
      if (!live()) return
      // three.js loaders take the same table (one scene to a page when it is used).
      if (THREE && files) THREE.DefaultLoadingManager.setURLModifier((url) => files[url] || url)
      const ctx = is3D || ownsContext(source) ? undefined : canvas.getContext('2d')

      // (Declared here because a resize may draw: the frame loop below sets them.)
      let looping = false
      let hooks = {}
      const call = (fn, ...args) => {
        if (!fn || !live()) return
        try {
          const result = fn(...args)
          if (result && typeof result.catch === 'function') result.catch((e) => { if (live()) fail(e) })
        } catch (e) { fail(e) }
      }

      // --- size: screen points for the scene, real pixels for the canvas
      let setSize = () => {}
      let width = 0, height = 0, ratio = 1
      const resize = () => {
        let resized = false
        ratio = window.devicePixelRatio || 1
        width = container.clientWidth
        height = container.clientHeight
        const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio))
        // A 3D scene sizes the canvas itself (renderer.setSize).
        if (ctx && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w
          canvas.height = h
          ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
          resized = true
        }
        setSize(width, height, ratio)
        // Sizing a canvas clears it, and this runs after the frame's draw and before the paint:
        // draw again now, or every step of a dragged divider shows one blank frame.
        if (resized && looping) call(hooks.draw)
      }
      const sizes = new ResizeObserver(resize)
      sizes.observe(container)
      cleanup.push(() => sizes.disconnect())

      // --- frames
      let waiting = []
      const frame = () => new Promise((resolve) => waiting.push(resolve))
      const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000))

      // --- input
      const keys = Object.assign(new Set(), { shift: false, ctrl: false, alt: false, meta: false, codes: new Set() })
      const pressed = new Set(), released = new Set()
      const mouse = { x: 0, y: 0, down: false, button: null, inside: false, dx: 0, dy: 0, wheel: 0 }
      const touches = []
      const pinch = { scale: 1, change: 1, x: 0, y: 0 }
      const listen = (target, type, fn, how) => {
        target.addEventListener(type, fn, how)
        cleanup.push(() => target.removeEventListener(type, fn, how))
      }
      // WHAT HAPPENED SINCE THE LAST FRAME (dx, dy, wheel, pinch.change, pressed, released) is
      // gathered here as events arrive and handed over at the top of the next frame (`latch`),
      // so it reads the same all through that frame: in update, in draw and in the code after
      // an `await frame()`. A frame with nothing to hand over costs one test of `stirred`.
      const since = { x: 0, y: 0, wheel: 0, pinch: 1, down: [], up: [] }
      let stirred = 0 // 2: something to hand over; 1: last frame's to clear
      const fingers = new Map() // pointerId -> { touch, dx, dy }
      let first = null // the pointer `mouse` follows while it is down
      let placed = false // the mouse has been somewhere: its first position is not a movement
      let pinchBase = 1
      let pinchedAt = 0 // the trackpad's last pinch step: it has no end of its own
      const latch = () => {
        stirred--
        mouse.dx = since.x; mouse.dy = since.y; mouse.wheel = since.wheel; pinch.change = since.pinch
        since.x = since.y = since.wheel = 0; since.pinch = 1
        if (pressed.size) pressed.clear()
        if (released.size) released.clear()
        for (const key of since.down) pressed.add(key)
        for (const key of since.up) released.add(key)
        since.down.length = since.up.length = 0
        for (const f of fingers.values()) { f.touch.dx = f.dx; f.touch.dy = f.dy; f.dx = f.dy = 0 }
        if (pinchedAt) {
          if (performance.now() - pinchedAt > 250) { pinchedAt = 0; if (fingers.size < 2) pinch.scale = 1 }
          else if (!stirred) stirred = 1
        }
      }
      // An event's place in the scene's points.
      let px = 0, py = 0
      const point = (e) => {
        const box = canvas.getBoundingClientRect()
        px = (e.clientX - box.left) * (width / (box.width || 1))
        py = (e.clientY - box.top) * (height / (box.height || 1))
      }
      // Put the mouse there. `moved`: it travelled (a finger going down somewhere new did not).
      const place = (moved) => {
        if (moved && placed) { since.x += px - mouse.x; since.y += py - mouse.y; stirred = 2 }
        placed = true
        mouse.x = px; mouse.y = py
        mouse.inside = px >= 0 && py >= 0 && px <= width && py <= height
      }
      const modifiers = (e) => { keys.shift = e.shiftKey; keys.ctrl = e.ctrlKey; keys.alt = e.altKey; keys.meta = e.metaKey }
      // By physical key: Shift let go first turns the keyup's name from "A" to
      // "a", and the name that went down is the one that must come out.
      const held = new Map()
      listen(canvas, 'keydown', (e) => {
        if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault()
        modifiers(e)
        // A key held down repeats on the keyboard: it went down once, and each repeat is told apart.
        if (e.repeat && held.has(e.code)) { call(hooks.keyRepeat, e.key, e.code); return }
        held.set(e.code, e.key)
        keys.add(e.key)
        keys.codes.add(e.code)
        since.down.push(e.key)
        stirred = 2
        call(hooks.keyDown, e.key, e.code)
      })
      listen(canvas, 'keyup', (e) => {
        modifiers(e)
        const key = held.get(e.code) ?? e.key
        held.delete(e.code)
        keys.codes.delete(e.code)
        // Two keys with one name (the two Shifts): the name stays while either is held.
        let other = false
        for (const name of held.values()) if (name === key) other = true
        if (!other) keys.delete(key)
        since.up.push(key)
        stirred = 2
        call(hooks.keyUp, key, e.code)
      })
      listen(canvas, 'blur', () => {
        keys.clear(); keys.codes.clear(); held.clear()
        keys.shift = keys.ctrl = keys.alt = keys.meta = false
      })

      // TWO FINGERS AS ONE NUMBER. `pinch.scale` is 1 when the second finger lands and follows
      // the distance between the first two; a trackpad's pinch (the browser sends it as
      // ctrl + wheel, Safari as gesture events) feeds the same. Only for a scene that names it.
      const spread = () => Math.max(1, Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y))
      const squeeze = (change, x, y) => {
        pinch.scale *= change
        pinch.x = x; pinch.y = y
        since.pinch *= change
        stirred = 2
        call(hooks.pinch, pinch.scale, change)
      }
      // The fingers changed: two or more carry the pinch on from where it is, fewer end it.
      const regrip = () => {
        if (touches.length >= 2) pinchBase = spread() / pinch.scale
        else if (!pinchedAt) pinch.scale = 1
      }

      const lift = (e, cancelled) => {
        const f = fingers.get(e.pointerId)
        if (!f) return
        const touch = f.touch
        point(e)
        touch.x = px; touch.y = py
        fingers.delete(e.pointerId)
        touches.splice(touches.indexOf(touch), 1)
        if (takesPinch) regrip()
        if (e.pointerId === first) {
          const button = mouse.button
          first = null
          place(true)
          mouse.down = false
          mouse.button = null
          call(hooks.mouseUp, px, py, button)
        }
        call(hooks.touchEnd, touch, cancelled)
      }
      listen(canvas, 'pointerdown', (e) => {
        if (takesPointer) {
          // A scene that takes the pointer keeps the whole gesture: no text selection, no image
          // drag, and a drag that leaves the scene is still the scene's.
          e.preventDefault()
          try { canvas.setPointerCapture(e.pointerId) } catch (e2) { /* a pointer that has already gone */ }
        }
        canvas.focus({ preventScroll: true })
        modifiers(e)
        // A pointer whose lift was never heard (the window was left mid-press) is lifted first.
        if (fingers.has(e.pointerId)) lift(e, true)
        point(e)
        const touch = new Finger(e.pointerId, px, py, e.pointerType || 'mouse')
        fingers.set(e.pointerId, { touch, dx: 0, dy: 0 })
        touches.push(touch)
        if (touches.length === 2) { pinch.scale = 1; pinchedAt = 0 } // a pinch starts here, at 1
        if (takesPinch) regrip()
        if (first === null) {
          first = e.pointerId
          place(e.pointerType === 'mouse')
          mouse.down = true
          mouse.button = BUTTONS[e.button] || 'left'
          call(hooks.mouseDown, px, py, mouse.button)
        }
        call(hooks.touchStart, touch)
      })
      listen(canvas, 'selectstart', (e) => e.preventDefault())
      listen(canvas, 'contextmenu', (e) => { if (takesPointer) e.preventDefault() })
      listen(canvas, 'pointermove', (e) => {
        point(e)
        const f = fingers.get(e.pointerId)
        if (f) {
          const touch = f.touch
          f.dx += px - touch.x; f.dy += py - touch.y
          touch.x = px; touch.y = py
          stirred = 2
        }
        // `mouse` follows the first pointer down, or whichever is moving while none is.
        if (f ? e.pointerId === first : first === null) { place(true); call(hooks.mouseMove, px, py) }
        if (f) {
          if (takesPinch && touches.length >= 2 && (f.touch === touches[0] || f.touch === touches[1])) {
            const scale = spread() / pinchBase
            squeeze(scale / pinch.scale, (touches[0].x + touches[1].x) / 2, (touches[0].y + touches[1].y) / 2)
          }
          call(hooks.touchMove, f.touch)
        }
      })
      listen(canvas, 'pointerleave', () => { mouse.inside = false })
      listen(window, 'pointerup', (e) => lift(e, false))
      listen(window, 'pointercancel', (e) => lift(e, true))
      if (takesWheel || takesPinch) {
        listen(canvas, 'wheel', (e) => {
          if (e.ctrlKey && takesPinch) {
            e.preventDefault()
            if (fingers.size >= 2) return
            point(e)
            pinchedAt = performance.now()
            squeeze(Math.exp(-Math.max(-50, Math.min(50, e.deltaY)) * 0.01), px, py)
          } else if (takesWheel) {
            e.preventDefault()
            // In points: a wheel that counts in lines or pages is turned into them.
            const amount = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1)
            if (!amount) return
            since.wheel += amount
            stirred = 2
            call(hooks.wheel, amount)
          }
        }, { passive: false })
      }
      if (takesPinch) {
        // Safari on a Mac sends a trackpad pinch as gesture events, with the scale since it began.
        let gesture = 1
        listen(canvas, 'gesturestart', (e) => { e.preventDefault(); gesture = 1 })
        listen(canvas, 'gesturechange', (e) => {
          e.preventDefault()
          if (fingers.size >= 2 || !(e.scale > 0)) return
          point(e)
          pinchedAt = performance.now()
          squeeze(e.scale / gesture, px, py)
          gesture = e.scale
        })
      }
      // Without scrolling: taking the keyboard must not move the page (or the app) the scene sits in.
      if (options.keyboard) canvas.focus({ preventScroll: true })

      // --- pictures and files
      // `crossOrigin` is for the scene's own files; a picture from another site loads as it would on any page.
      const loadImage = (src) => {
        const img = new Image()
        if (options.crossOrigin && !/^[a-z][a-z0-9+.-]*:/i.test(src)) img.crossOrigin = options.crossOrigin
        img.src = at(src)
        return img
      }
      const read = async (path) => {
        const reply = await fetch(at(path))
        if (!reply.ok) throw new Error(`There is no file "${path}" beside the scene`)
        return reply
      }
      const loadText = async (path) => (await read(path)).text()
      const loadJSON = async (path) => (await read(path)).json()
      // A font from the scene's folder, ready for ctx.font by its family name. A font that
      // will not load is not an error: the text draws in the fallback the scene names.
      const loadFont = async (family, path, descriptors) => {
        if (typeof FontFace !== 'function') return false
        try {
          const face = await new FontFace(family, `url(${JSON.stringify(at(path))})`, descriptors).load()
          document.fonts.add(face)
          return true
        } catch (e) {
          console.warn(`The font "${path}" could not be loaded`)
          return false
        }
      }
      // --- saved values (see KEPT). Nothing here can stop a scene except a value that cannot be kept.
      const save = (key, value) => {
        let kept
        try { kept = JSON.stringify(value) } catch (e) { /* a thing that holds itself */ }
        if (kept === undefined) throw new Error(`save("${key}", …) was given something it cannot keep. ${CAN_KEEP}`)
        KEPT.set(savedAs + key, kept)
        try {
          localStorage.setItem(savedAs + key, kept)
        } catch (e) {
          // No storage, or it is full: the scene carries on, and the value lasts while the page is open.
          if (!KEPT.warned) console.warn(`save("${key}", …): the browser would not keep it (${e?.message ?? e}), so it will be forgotten when the page is closed`)
          KEPT.warned = true
        }
      }
      const load = (key, otherwise) => {
        let kept = KEPT.get(savedAs + key)
        if (kept === undefined) {
          try { kept = localStorage.getItem(savedAs + key) } catch (e) { /* no storage */ }
        }
        if (kept == null) return otherwise
        // A fresh copy each time: changing a list that was loaded does not change what is saved.
        try { return JSON.parse(kept) } catch (e) { return otherwise }
      }
      // A helper file: an ordinary module (it writes `export`), so a long scene can keep its parts apart.
      const use = (path) => {
        helpers.set(at(path), path)
        return import(/* @vite-ignore */ at(path)).catch((e) => {
          throw new Error(`"${path}" could not be used: ${e?.message ?? e}`)
        })
      }
      const pictures = new Map()
      // Emoji or text is drawn once into a small canvas and stamped from then on.
      const stamp = (text, size) => {
        const key = `${size}|${text}`
        let pic = pictures.get(key)
        if (!pic) {
          const px = Math.max(1, Math.round(size * 1.3 * ratio))
          pic = document.createElement('canvas')
          pic.width = pic.height = px
          const g = pic.getContext('2d')
          g.font = `${Math.floor(size * ratio)}px system-ui, sans-serif`
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillText(text, px / 2, px / 2 + size * ratio * 0.06)
          pictures.set(key, pic)
        }
        return pic
      }
      // --- plain drawing: one call each, for a first scene. Each is the ctx calls it stands for and
      // nothing more, so it costs what they cost. A colour (or thickness, size, alignment) that is
      // given is set on ctx and so stays for what is drawn next; one left out is whatever ctx has.
      //
      // EVERY SHAPE takes one last thing, the same on all of them: `{ outline: "white", thickness: 3 }`
      // (Python: outline="white", thickness=3). With a colour as well it is a filled shape with a
      // border; in place of the colour it is the edge alone. Nothing is made for a call without it.
      const no2D = (name) => () => {
        throw new Error(`${name}() draws on the 2D canvas, and this scene has none (it is 3D, or it took the canvas's context itself). Draw with THREE here`)
      }
      // Fill and outline the path just made. `colour` may be the options themselves (the edge alone).
      const paint = (colour, how) => {
        if (how === undefined) {
          if (colour == null || colour.constructor !== Object) {
            if (colour != null) ctx.fillStyle = colour
            ctx.fill()
            return
          }
          how = colour
          colour = null
        }
        const edge = how.outline != null || how.thickness != null
        if (colour != null) ctx.fillStyle = colour
        if (colour != null || !edge) ctx.fill()
        if (edge) {
          if (how.outline != null && how.outline !== true) ctx.strokeStyle = how.outline
          if (how.thickness != null) ctx.lineWidth = how.thickness
          ctx.stroke()
        }
      }
      /** A filled circle, centred on x, y. */
      const circle = !ctx ? no2D('circle') : (x, y, radius, colour, how) => {
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        paint(colour, how)
      }
      /** An oval, centred on x, y, `width` across and `height` down. */
      const ellipse = !ctx ? no2D('ellipse') : (x, y, w, h, colour, how) => {
        ctx.beginPath()
        ctx.ellipse(x, y, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2)
        paint(colour, how)
      }
      /** A filled box. x, y is its top left corner. `{ round: 12 }` rounds its corners. */
      const rect = !ctx ? no2D('rect') : (x, y, w, h, colour, how) => {
        if (how === undefined && (colour == null || colour.constructor !== Object)) {
          if (colour != null) ctx.fillStyle = colour
          ctx.fillRect(x, y, w, h)
          return
        }
        const round = (how || colour).round
        ctx.beginPath()
        if (round) ctx.roundRect(x, y, w, h, round)
        else ctx.rect(x, y, w, h)
        paint(colour, how)
      }
      /** Three corners. */
      const triangle = !ctx ? no2D('triangle') : (x1, y1, x2, y2, x3, y3, colour, how) => {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineTo(x3, y3)
        ctx.closePath()
        paint(colour, how)
      }
      // A ring of corners round x, y, the first straight up. Every other one is at `inner` (a star).
      const corners = (x, y, radius, n, inner) => {
        ctx.beginPath()
        const step = Math.PI * 2 / n
        for (let i = 0; i < n; i++) {
          const r = inner && i % 2 ? inner : radius, a = i * step - Math.PI / 2
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
        }
        ctx.closePath()
      }
      /** A shape with `sides` equal sides, centred on x, y, one corner straight up. */
      const polygon = !ctx ? no2D('polygon') : (x, y, radius, sides, colour, how) => {
        corners(x, y, radius, Math.max(3, Math.round(sides)), 0)
        paint(colour, how)
      }
      /** A star with that many points, one straight up. Its inner corners are 0.4 of the radius out (`{ inner: 0.6 }` changes that). */
      const star = !ctx ? no2D('star') : (x, y, radius, points, colour, how) => {
        const opts = how !== undefined ? how : (colour != null && colour.constructor === Object ? colour : undefined)
        corners(x, y, radius, Math.max(2, Math.round(points)) * 2, radius * (opts && opts.inner != null ? opts.inner : 0.4))
        paint(colour, how)
      }
      /** A straight line from x1, y1 to x2, y2. */
      const line = !ctx ? no2D('line') : (x1, y1, x2, y2, colour, thickness) => {
        if (colour != null) ctx.strokeStyle = colour
        if (thickness != null) ctx.lineWidth = thickness
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      /** Words. x, y is their left end, on the line the letters sit on; with "centre", x, y is their middle. */
      let fontSize = 0, fontOf = ''
      const text = !ctx ? no2D('text') : (words, x, y, colour, size, align) => {
        if (colour != null) ctx.fillStyle = colour
        if (size != null) {
          if (size !== fontSize) { fontSize = size; fontOf = `${size}px system-ui, sans-serif` }
          ctx.font = fontOf
        }
        if (align != null) {
          const middle = align === 'centre' || align === 'center'
          ctx.textAlign = middle ? 'center' : align
          ctx.textBaseline = middle ? 'middle' : 'alphabetic'
        }
        ctx.fillText(words, x, y)
      }
      /** Paint the whole picture one colour (or, with no colour, wipe it clear). It leaves ctx's own colour alone. */
      const background = !ctx ? no2D('background') : (colour) => {
        if (colour == null) return ctx.clearRect(0, 0, width, height)
        const was = ctx.fillStyle
        ctx.fillStyle = colour
        ctx.fillRect(0, 0, width, height)
        ctx.fillStyle = was
      }
      /**
       * An emoji or a word, or a picture from a file, centred on x, y and `size` high: `picture("🌙", 300, 80, 60)`,
       * `picture("cat.png", 100, 100, 80)`, or an image from loadImage. A file is loaded the first time it is
       * asked for and draws nothing until it has arrived.
       */
      const IMAGE_FILE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$|^data:image\/|^blob:/i
      const pictureFiles = new Map()
      const picture = !ctx ? no2D('picture') : (what, x, y, size = 48) => {
        if (typeof what === 'string') {
          let img = pictureFiles.get(what)
          if (img === undefined) { img = IMAGE_FILE.test(what) ? loadImage(what) : null; pictureFiles.set(what, img) }
          if (img === null) {
            const box = size * 1.3
            ctx.drawImage(stamp(what, size), x - box / 2, y - box / 2, box, box)
            return
          }
          what = img
        }
        if (what.complete === false || !what.naturalWidth) return
        const w = size * what.naturalWidth / what.naturalHeight
        ctx.drawImage(what, x - w / 2, y - size / 2, w, size)
      }

      // --- chance
      /**
       * A number picked by chance. random(1, 6) is a whole number from 1 to 6, either end included; random(6) is
       * from 0 to 6. If an end has a fraction (random(0, 0.5)) so may the answer. random() is a fraction from 0 up to 1.
       */
      const random = (a, b) => {
        if (a === undefined) return Math.random()
        if (b === undefined) { b = a; a = 0 }
        if (Number.isInteger(a) && Number.isInteger(b)) return a + Math.floor(Math.random() * (b - a + 1))
        return a + Math.random() * (b - a)
      }
      /** One thing from a list, picked by chance. */
      const pick = (list) => list[Math.floor(Math.random() * list.length)]

      // An angle said in degrees: every angle here (ctx.rotate, ctx.arc, a sprite's angle and spin) is in radians.
      const degrees = (n) => n * (Math.PI / 180)

      // Take a thing out of a list (nothing happens if it is not there).
      const remove = (list, item) => {
        const i = list.indexOf(item)
        if (i < 0) return false
        list.splice(i, 1)
        return true
      }
      class Sprite {
        constructor(pic, x = 0, y = 0, size = 48) {
          if (size && typeof size === 'object') size = size.size ?? 48
          // `hitSize`: the size while it is a plain round sprite, else NaN (see touches).
          // `fit`: the hit circle's radius as a part of the size. 0.4, because an emoji has space round it.
          Object.assign(this, { picture: pic, x, y, vx: 0, vy: 0, hitSize: size, angle: 0, spin: 0, sized: size, visible: true,
            isBox: false, fit: 0.4, colour: 'white', boxWidth: undefined, boxHeight: undefined, drawn: undefined, sizeOnly: false })
        }
        /** A plain coloured box, `width` across and `height` down. It is hit-tested as a box. */
        static box(x, y, width, height = width, colour = 'white') {
          const s = new Sprite(null, x, y, Math.max(width, height))
          s.shape = 'box'
          s.boxWidth = width
          s.boxHeight = height
          s.colour = colour
          return s
        }
        /** A plain coloured circle, `size` across. Its hit circle is the circle you see. */
        static circle(x, y, size, colour = 'white') {
          const s = new Sprite(null, x, y, size)
          s.radius = size / 2
          s.colour = colour
          return s
        }
        // A sprite is as wide and as tall as its size until it is told otherwise.
        get size() { return this.sized }
        set size(size) { this.sized = size; this._plain() }
        // "circle" or "box": the shape it is hit-tested as.
        get shape() { return this.isBox ? 'box' : 'circle' }
        set shape(name) { this.isBox = name === 'box'; this._plain() }
        _plain() { this.hitSize = this.isBox || this.fit !== 0.4 ? NaN : this.sized }
        get width() { return this.boxWidth ?? this.size }
        set width(w) { this.boxWidth = w }
        get height() { return this.boxHeight ?? this.size }
        set height(h) { this.boxHeight = h }
        get radius() { return this.size * this.fit }
        set radius(r) { this.fit = this.size ? r / this.size : 0; this._plain() }
        get color() { return this.colour }
        set color(c) { this.colour = c }

        update(dt) {
          this.x += this.vx * dt
          this.y += this.vy * dt
          if (this.spin) this.angle += this.spin * dt
        }
        draw() {
          if (!this.visible || !ctx) return
          const s = this.size, pic = this.picture
          ctx.save()
          ctx.translate(this.x, this.y)
          if (this.angle) ctx.rotate(this.angle)
          if (typeof pic === 'string') {
            const box = s * 1.3
            ctx.drawImage(stamp(pic, s), -box / 2, -box / 2, box, box)
          } else if (typeof pic === 'function') {
            // A picture you draw yourself: 0, 0 is the sprite's middle, and it faces right.
            // It is given (ctx, size), or the size alone if that is all it asks for (see takesSize).
            if (pic !== this.drawn) { this.drawn = pic; this.sizeOnly = takesSize(pic) }
            if (this.sizeOnly) pic(s)
            else pic(ctx, s)
          } else if (!pic) {
            // No picture: its own shape, in its colour.
            ctx.fillStyle = this.colour
            if (this.isBox) ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
            else { ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill() }
          } else if (pic.complete !== false && pic.naturalWidth !== 0) {
            const w = this.width, h = this.height
            ctx.drawImage(pic, -w / 2, -h / 2, w, h)
          }
          ctx.restore()
        }

        // --- touching. Whether a sprite can be seen makes no difference: a hidden one still touches.
        touches(other) {
          // Two plain round sprites are tested right here, as cheaply as by hand. For a box, or a
          // circle with a radius of its own, `hitSize` is not a number, so neither is r.
          const r = (this.hitSize + other.hitSize) * 0.4
          if (r === r) return (this.x - other.x) ** 2 + (this.y - other.y) ** 2 < r * r
          return spritesTouch(this, other)
        }
        /** The first sprite in the list that this one touches, or null. */
        hit(list) {
          for (let i = 0; i < list.length; i++) {
            const other = list[i]
            if (other !== this && this.touches(other)) return other
          }
          return null
        }
        /** Is this point on the sprite? `contains(x, y)`, or anything with an x and y: `contains(mouse)`. */
        contains(x, y) {
          if (typeof x === 'object') { y = x.y; x = x.x }
          if (this.isBox) return pointInBox(x, y, this.x, this.y, this.width, this.height, this.angle)
          return pointInCircle(x, y, this.x, this.y, this.size * this.fit)
        }

        // --- the edges of the picture
        /** Gone off one edge? Come back on the opposite one. */
        wrap() {
          const w = this.width / 2, h = this.height / 2
          if (this.x < -w) this.x = width + w
          else if (this.x > width + w) this.x = -w
          if (this.y < -h) this.y = height + h
          else if (this.y > height + h) this.y = -h
        }
        /** Bounce off the edges: all four, or the ones named, `bounce("top", "bottom")`. Gives the edge it bounced off, or null. */
        bounce(a, b, c, d) {
          const box = this.isBox
          const w = box ? this.width / 2 : this.size * this.fit, h = box ? this.height / 2 : w
          let edge = null
          if (this.x < w && edgeWanted('left', a, b, c, d)) { this.x = w; this.vx = Math.abs(this.vx); edge = 'left' }
          else if (this.x > width - w && edgeWanted('right', a, b, c, d)) { this.x = width - w; this.vx = -Math.abs(this.vx); edge = 'right' }
          if (this.y < h && edgeWanted('top', a, b, c, d)) { this.y = h; this.vy = Math.abs(this.vy); edge = 'top' }
          else if (this.y > height - h && edgeWanted('bottom', a, b, c, d)) { this.y = height - h; this.vy = -Math.abs(this.vy); edge = 'bottom' }
          return edge
        }
        /** Is all of it outside the picture? */
        offscreen() {
          const w = this.width / 2, h = this.height / 2
          return this.x < -w || this.x > width + w || this.y < -h || this.y > height + h
        }

        // --- moving the way it faces (angle 0 is to the right, and it grows clockwise)
        /** Speed up the way it faces. */
        push(amount) {
          this.vx += Math.cos(this.angle) * amount
          this.vy += Math.sin(this.angle) * amount
        }
        /** Step the way it faces, without changing its speed. */
        forward(distance) {
          this.x += Math.cos(this.angle) * distance
          this.y += Math.sin(this.angle) * distance
        }
        /** Never faster than this. */
        limit(speed) {
          const now = Math.hypot(this.vx, this.vy)
          if (now > speed) { this.vx *= speed / now; this.vy *= speed / now }
        }
        /** The angle from here to another sprite, to anything with an x and y, or to `angleTo(x, y)`. */
        angleTo(other, y) {
          return typeof other === 'number' ? Math.atan2(y - this.y, other - this.x) : Math.atan2(other.y - this.y, other.x - this.x)
        }
        /** How far it is to another sprite, to anything with an x and y, or to `distanceTo(x, y)`. */
        distanceTo(other, y) {
          return typeof other === 'number' ? Math.hypot(other - this.x, y - this.y) : Math.hypot(other.x - this.x, other.y - this.y)
        }
        // The Python spellings.
        angle_to(other, y) { return this.angleTo(other, y) }
        distance_to(other, y) { return this.distanceTo(other, y) }
      }

      // --- the frame loop runs from the start, so a top-level `await frame()` loop moves
      // A scene out of view waits: a page with many scenes only runs the ones looked at.
      let inView = true
      if (typeof IntersectionObserver === 'function') {
        const views = new IntersectionObserver((entries) => { inView = entries[entries.length - 1].isIntersecting })
        views.observe(container)
        cleanup.push(() => views.disconnect())
      }
      let last = 0
      let counted = 0
      let countedSince = 0
      // The screen's refresh is not something a page is told. It is taken from the frames themselves:
      // the gap that at least a tenth of the frames in some half second kept to. One stray short gap
      // (two frames delivered close together after a hitch) must not count, or every frame after it
      // would look like several missed.
      // The rate is held steady: it follows a real change at once, and ignores a wobble of a frame or two.
      let shownFps = 0
      const tick = (now) => {
        if (!live()) return
        raf = requestAnimationFrame(tick)
        if (!inView) { last = 0; return }
        if (meter) {
          counted++
          if (now - countedSince >= 500) {
            if (countedSince) {
              const rate = counted * 1000 / (now - countedSince)
              if (Math.abs(rate - shownFps) > 2.5) shownFps = Math.round(rate)
              // The rate alone, unless the scene times parts of its frame with measure().
              const lines = [`${shownFps} fps`]
              for (const name of Object.keys(sections)) lines.push(`${name} ${(sections[name] / counted).toFixed(2)} ms`)
              meter.textContent = lines.join('\n')
            }
            counted = 0
            countedSince = now
            sections = {}
          }
        }
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
        last = now
        if (stirred) latch()
        if (looping) {
          call(hooks.update, dt)
          call(hooks.draw)
        }
        const due = waiting
        waiting = []
        for (const resolve of due) resolve(dt)
      }
      raf = requestAnimationFrame(tick)

      // The stuck-loop stop (`guardLoops`): the beat is a timer, so it only falls behind while the page is held.
      let beat = performance.now()
      const beats = setInterval(() => { beat = performance.now() }, 250)
      cleanup.push(() => clearInterval(beats))
      const __loop = () => {
        if (performance.now() - beat < STUCK_MS) return
        beat = performance.now()
        throw new Error(`A loop ran for ${STUCK_MS / 1000} seconds without waiting, so it was stopped. Put \`await frame()\` inside it, or draw in draw()`)
      }

      // Time a part of the frame: free when the meter is off.
      const measure = (label, fn) => {
        if (!meter) return fn()
        const t0 = performance.now()
        try { return fn() } finally { sections[label] = (sections[label] || 0) + performance.now() - t0 }
      }

      let scene
      try {
        scene = compile(source, name, !!options.stopStuckLoops)
      } catch (error) {
        // It would not compile: find the line before saying so.
        const where = error instanceof SyntaxError ? await syntaxLine(source) : { line: 0, past: false }
        // The engine read past the scene's last line into the wrapper round it, so what it complains
        // of (a `)` the scene never wrote) is not the mistake: something in the scene is never closed.
        const left = where.past || (!where.line && /^Unexpected (?:token '[;)}]'|end|keyword 'return')/.test(error.message)) ? neverClosed(source) : null
        if (live()) {
          if (left) fail(error, left.line, `A ${left.bracket} is opened here and never closed: its ${CLOSER[left.bracket]} is missing`)
          else fail(error, where.line)
        }
        return
      }
      const given = { measure, __loop, ctx, canvas, THREE, addons, frame, vsync: frame, flush: frame, sleep, keys, mouse, pressed, released, touches, pinch, circle, rect, line, text, background, triangle, ellipse, polygon, star, picture, random, pick, degrees, Sprite, remove,
        loadImage, load_image: loadImage, loadText, load_text: loadText, loadJSON, load_json: loadJSON, loadFont, load_font: loadFont, save, load, use }
      const begun = scene(...GIVEN.map((n) => given[n]), (set) => { setSize = set; resize() })
      status('running')
      hooks = await begun
      if (!live()) return
      stopping = () => hooks.stop?.()
      if (hooks.setup) await hooks.setup()
      if (!live()) return
      if (hooks.draw || hooks.update) looping = true
      // Frames keep coming after the top level ends: a listener the scene added may still await one.
      else if (!Object.values(hooks).some(Boolean)) status('finished')
    } catch (error) {
      if (live()) fail(error)
    }
  }

  start()
  return {
    get canvas() { return canvas },
    stop() { run++; stopRun() },
    showFps(on) { wantFps = !!on; fitMeter() },
    restart(next) { if (next != null) source = next; start() },
  }
}

// Every <div data-pictures-src> on the page, once it is ready.
function runAll() {
  for (const el of document.querySelectorAll('[data-pictures-src]')) {
    if (el.dataset.picturesStatus) continue
    runScene(el, { src: el.dataset.picturesSrc, keyboard: el.hasAttribute('data-pictures-fullpage') })
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runAll)
  else runAll()
}
