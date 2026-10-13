/**
 * scenes.js: the part of pictures.js that makes a file several scenes. pictures.js loads it only for a
 * file that uses one of its names; nothing here runs for any other.
 *
 * SCENES: a program in several parts, each starting empty, played one after another or switched by the
 * program. The words are Pymations' own wherever the thing is the same thing (see docs/scenes.md).
 *
 *   class Title extends Scene {           a scene is a group of the functions a file already has: setup, update,
 *     setup() { }  update(dt) { }         draw and the `on` functions, with its own variables on `this`. Every
 *     draw() { }                          Scene class in the file plays, in the order written, the first one first
 *     onMouseDown() { nextScene() }
 *   }
 *   scene("title", { draw, update })      the same without a class: plain functions, grouped under a name
 *   go("game"), go(Game), nextScene(),    the program says when a scene ends: go to one by its name or its class,
 *   restart()                             to the next one written, or begin this one again. `go("game", { transition:
 *                                         "wipe", transitionTime: 0.5 })` says how; `{ keep: true }` goes back to a
 *                                         scene as it was left (its `resume()` is called in place of `setup()`)
 *   length = 12, beats = 16, bars = 4     or a scene ends by itself: after so many seconds, or so many beats or bars
 *                                         of the sound library's tempo (half a second a beat with no sound)
 *   transition = "crossfade"              how a scene arrives: "cut" (the default), "crossfade", "fade" (through
 *                                         `transitionColor`), "wipe", "wipe_left", "wipe_up", "wipe_down",
 *                                         "slide_left", "slide_right", "slide_up", "slide_down", over `transitionTime` seconds
 *   sceneTime, sceneProgress, sceneName   seconds since this scene began; 0 to 1 through its length; its name
 *   section("name")                       a mark on the scrubber at this moment, beside the one each scene has
 *   config({ loop: false })               settings for every scene: loop, transition, transitionTime, transitionColor, beatsPerBar
 *
 * A file that uses none of this is one unnamed scene, compiled and run exactly as before there were any:
 * `usesScenes` asks the scene's text, as sound and the controls are asked for. The file's own top-level
 * functions (`update`, `draw`, `onKeyDown`…) go on being called, before the current scene's, and what the file
 * makes at its top level is shared by every scene. A scene's own on-screen controls go when it ends. Sound is the
 * program's, not a scene's: a song goes on playing across scenes until something stops it.
 *
 * HOW IT IS WIRED. `directScenes` makes the names; when the file's top level has run, `begin` is handed the
 * functions the file defined and gives back a table of the same shape that calls the file's function and then
 * the current scene's. The runtime's `hooks` is replaced by that table, so no call site knows about scenes.
 *
 * A TRANSITION never touches the scene's canvas. When a scene ends, its last picture is copied once, and
 * while the new scene draws on its own canvas as usual a second canvas laid over it is drawn each frame with
 * what is left of the old picture (`transitionLayer`). It is real pixels, stepped by the scene's own frame
 * time, so a recording has it. It costs one copy of the canvas when it starts and one or two drawImage calls a
 * frame while it lasts. The same layer is in Pyctures' page, where it is what keeps a transition smooth when
 * Python's frames arrive slowly.
 *
 * MORE TRANSITIONS (a dissolve, a ripple: an effects library's) are given by name in `options.transitions`:
 * `{ dissolve: { start({ from, to, container, seconds }), frame(progress), end() } }`. `from` is a canvas
 * holding the old scene's last picture (not on the page), `to` the scene's own canvas, which goes on being
 * drawn; `frame` is called once a frame with progress from 0 to 1, already eased.
 */
const camel = (name) => String(name).replace(/[-_]+([a-z0-9])/gi, (_, c) => c.toUpperCase())
const snake = (name) => camel(name).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const shown = (value) => (typeof value === 'string' ? JSON.stringify(value) : String(value))

const TRANSITIONS = ['cut', 'crossfade', 'fade', 'wipe', 'wipe_left', 'wipe_up', 'wipe_down', 'slide_left', 'slide_right', 'slide_up', 'slide_down']
const SLIDES = { slide_left: [-1, 0], slide_right: [1, 0], slide_up: [0, -1], slide_down: [0, 1] }
/** A transition's name as it is kept: Pymations' "none" is a cut, its "slide" goes left, and `slideLeft` is `slide_left`. */
const transitionName = (name) => {
  const n = snake(String(name ?? 'cut')).toLowerCase()
  return n === 'none' ? 'cut' : n === 'slide' ? 'slide_left' : n === 'wipe_right' ? 'wipe' : n
}

/**
 * The layer a transition is shown on (see SCENES). `begin` copies the canvas as it is now (`from`, kept off
 * the page) and lays one more canvas over the scene's; `step(dt)` moves the transition on and `paint()`
 * draws it into that canvas, and the layer is taken away when the transition is over.
 *
 * IT IS DRAWN, NOT STYLED. The layer has no opacity, clip or transform of its own: what it shows is in its
 * pixels (the old picture at an alpha, the part of it a wipe has not reached, both pictures of a slide), so
 * a recorder that draws the canvases of the scene one over another gets exactly what the screen shows. And
 * the transition moves only by the `dt` it is stepped with, which is the scene's own frame time: a page
 * that is stepped a frame at a time steps the transition with it.
 *
 * `real` says the scene's canvas can be read when `paint` is called (always in 2D; in 3D only straight after
 * the scene has drawn). A slide then draws the new scene too, moved, and covers the canvas whole; where the
 * canvas cannot be read, a slide moves the scene's canvas itself with a style, which a recorder will not see.
 *
 * `running` is the transition now, or null: `{ name, seconds, progress, from, to, layer, draw(ctx),
 * hold(progress), release() }`. `draw(ctx)` paints the layer as it is now over the whole of another canvas's
 * context; `hold` stops the transition at a point (a test) and `release` lets it carry on from there.
 * `data` names the layer for the page: it is `<canvas data-${data}-transition="crossfade">`.
 */
export function transitionLayer(container, canvas, more = {}, data = 'pictures') {
  let run = null
  const finish = () => {
    if (!run) return
    const was = run
    run = null
    try { was.own?.end?.() } catch (e) { console.error(e) }
    was.layer.remove()
    canvas.style.transform = ''
  }
  const paint = () => {
    if (!run || run.own) return
    const { name, from, layer, g, shown: p } = run, w = layer.width, h = layer.height
    g.globalAlpha = 1
    g.clearRect(0, 0, w, h)
    if (name === 'crossfade') {
      g.globalAlpha = 1 - p
      g.drawImage(from, 0, 0)
    } else if (name === 'fade') {
      // Through a colour: the old picture goes under it, then the new one comes out from under it.
      if (p < 0.5) g.drawImage(from, 0, 0)
      g.globalAlpha = p < 0.5 ? p * 2 : (1 - p) * 2
      g.fillStyle = run.colour
      g.fillRect(0, 0, w, h)
    } else if (SLIDES[name]) {
      const [x, y] = SLIDES[name], dx = Math.round(x * p * w), dy = Math.round(y * p * h)
      if (run.real) {
        try { g.drawImage(canvas, dx - x * w, dy - y * h, w, h) } catch (e) { /* a canvas with no size */ }
      } else canvas.style.transform = `translate(${-x * (1 - p) * 100}%, ${-y * (1 - p) * 100}%)`
      g.drawImage(from, dx, dy)
    } else {
      // A wipe: the part of the old picture the edge has not reached.
      const across = Math.round(p * w), down = Math.round(p * h)
      if (name === 'wipe') g.drawImage(from, across, 0, w - across, h, across, 0, w - across, h)
      else if (name === 'wipe_left') g.drawImage(from, 0, 0, w - across, h, 0, 0, w - across, h)
      else if (name === 'wipe_down') g.drawImage(from, 0, down, w, h - down, 0, down, w, h - down)
      else g.drawImage(from, 0, 0, w, h - down, 0, 0, w, h - down)
    }
    g.globalAlpha = 1
  }
  const show = (p) => {
    run.shown = p
    if (run.own) run.own.frame?.(p)
  }
  return {
    names: () => [...TRANSITIONS, ...Object.keys(more)],
    knows: (name) => TRANSITIONS.includes(name) || !!more[name],
    get running() { return run },
    begin(name, seconds, colour = 'black', real = true) {
      finish()
      const copy = () => {
        const c = document.createElement('canvas')
        c.width = canvas.width
        c.height = canvas.height
        return c
      }
      const from = copy(), layer = copy()
      try { from.getContext('2d').drawImage(canvas, 0, 0) } catch (e) { /* a canvas with no size yet: the picture is blank */ }
      layer.dataset[`${data}Transition`] = name
      layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none'
      const mine = run = { name, seconds, colour, real, from, to: canvas, layer, g: layer.getContext('2d'), progress: 0, shown: 0, held: false, at: 0, own: more[name] || null,
        draw(ctx) { ctx.drawImage(layer, 0, 0, ctx.canvas.width, ctx.canvas.height) },
        hold(p) { mine.held = true; mine.progress = p; if (run === mine) { show(p); paint() } },
        release() { mine.held = false; mine.at = mine.progress * seconds } }
      if (run.own) run.own.start?.({ from, to: canvas, container, seconds })
      else canvas.after(layer)
      show(0)
      paint()
    },
    step(dt) {
      if (!run || run.held) return
      run.at += dt
      const p = run.progress = Math.min(1, run.at / run.seconds)
      // Eased at both ends, as Pymations' are.
      show(p * p * (3 - 2 * p))
      if (p >= 1) finish()
    },
    paint,
    finish,
  }
}

/**
 * THE SCRUBBER, for a program whose scenes all have a length (a sequence): play and pause, a track with a
 * tick where each scene and section starts, and the time. It looks and behaves as Pymations' does: shown
 * while paused, and on a move of the pointer while playing. `stage` is what it shows and moves:
 * `{ time(), duration(), sections(), paused(), pause(on), seek(seconds) }`.
 */
const BAR_STYLE = `.pictures-bar{position:absolute;left:8px;right:8px;bottom:8px;z-index:2;display:flex;align-items:center;gap:10px;padding:4px 10px 4px 4px;border-radius:8px;background:rgba(11,11,15,.8);color:#e5e7eb;font:12px ui-monospace,Menlo,Consolas,monospace;transition:opacity .2s}
.pictures-bar.hide{opacity:0;pointer-events:none}
.pictures-bar button{width:26px;height:26px;padding:0;border:0;border-radius:6px;background:none;color:inherit;font:14px/1 system-ui,sans-serif;cursor:pointer}
.pictures-bar button:hover{background:rgba(255,255,255,.14)}
.pictures-track{position:relative;flex:1;height:18px;cursor:pointer;touch-action:none}
.pictures-track::before{content:"";position:absolute;left:0;right:0;top:8px;height:2px;border-radius:1px;background:rgba(255,255,255,.25)}
.pictures-fill{position:absolute;left:0;top:8px;height:2px;border-radius:1px;background:#e5e7eb}
.pictures-ticks i{position:absolute;top:4px;width:2px;height:10px;margin-left:-1px;border-radius:1px;background:rgba(255,255,255,.65)}
.pictures-knob{position:absolute;top:4px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#fff}`
const minutes = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
export function timelineBar(container, stage) {
  if (!document.getElementById('pictures-bar-style')) {
    const style = document.createElement('style')
    style.id = 'pictures-bar-style'
    style.textContent = BAR_STYLE
    document.head.append(style)
  }
  const bar = document.createElement('div')
  bar.className = 'pictures-bar hide'
  bar.innerHTML = '<button type="button" class="pictures-play" aria-label="Pause"></button><div class="pictures-track" role="slider" aria-label="Time" tabindex="-1">' +
    '<div class="pictures-fill"></div><div class="pictures-ticks"></div><div class="pictures-knob"></div></div><span class="pictures-time"></span>'
  container.append(bar)
  const [play, track, fill, ticks, knob, time] = ['play', 'track', 'fill', 'ticks', 'knob', 'time'].map((part) => bar.querySelector(`.pictures-${part}`))
  let over = false, dragging = false, wasPaused = false, hiding = 0, drawn = '', icon = ''
  const show = () => {
    bar.classList.remove('hide')
    clearTimeout(hiding)
    const hide = () => {
      if (stage.paused() || over || dragging) { hiding = setTimeout(hide, 800); return }
      bar.classList.add('hide')
    }
    hiding = setTimeout(hide, 2500)
  }
  const update = () => {
    const long = stage.duration(), t = stage.time(), part = long > 0 ? Math.min(1, t / long) : 0
    fill.style.width = knob.style.left = `${part * 100}%`
    time.textContent = `${minutes(t)} / ${minutes(long)}`
    const now = stage.paused() ? '▶' : '❚❚'
    if (now !== icon) { icon = play.textContent = now; play.setAttribute('aria-label', stage.paused() ? 'Play' : 'Pause') }
    const sections = stage.sections(), key = long + '|' + sections.map((s) => `${s.name}@${s.t}`).join(',')
    if (key === drawn) return
    drawn = key
    ticks.textContent = ''
    for (const s of sections) {
      if (!(long > 0) || !(s.t > 0) || s.t >= long) continue
      const tick = document.createElement('i')
      tick.style.left = `${s.t / long * 100}%`
      tick.title = s.name
      ticks.append(tick)
    }
  }
  const seekTo = (x) => {
    const box = track.getBoundingClientRect()
    stage.seek(box.width ? (x - box.left) / box.width * stage.duration() : 0)
    update()
  }
  // The scrubber's own presses are not the program's.
  const own = (e) => e.stopPropagation()
  bar.addEventListener('pointerdown', own)
  bar.addEventListener('pointerup', own)
  bar.addEventListener('pointerenter', () => { over = true })
  bar.addEventListener('pointerleave', () => { over = false })
  play.addEventListener('click', (e) => { e.stopPropagation(); stage.pause(!stage.paused()); update(); show() })
  track.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    dragging = true
    wasPaused = stage.paused()
    stage.pause(true)
    try { track.setPointerCapture(e.pointerId) } catch (e2) { /* a pointer that has already gone */ }
    seekTo(e.clientX)
  })
  track.addEventListener('pointermove', (e) => { if (dragging) seekTo(e.clientX) })
  const end = (e) => {
    if (!dragging) return
    e.stopPropagation()
    dragging = false
    stage.pause(wasPaused)
    update()
    show()
  }
  track.addEventListener('pointerup', end)
  track.addEventListener('pointercancel', end)
  const stir = () => show()
  container.addEventListener('pointermove', stir)
  container.addEventListener('pointerdown', stir)
  update()
  return {
    update,
    remove() {
      clearTimeout(hiding)
      container.removeEventListener('pointermove', stir)
      container.removeEventListener('pointerdown', stir)
      bar.remove()
    },
  }
}

/**
 * The director of a file's scenes (see SCENES). `env` is what it needs of the run it belongs to:
 *   written      where the scenes are written (`scenesWritten`)
 *   layer        the run's transitionLayer
 *   flat         true where the canvas keeps its picture (2D); a 3D picture is drawn once more to be kept
 *   sound()      the sound functions, or null
 *   controls()   the on-screen controls there are now; controls(those) takes away every one made since
 *   empty()      wipe the canvas and put its drawing settings back as they start
 *   bar          false for no scrubber
 *   report(sections, duration), told(name, index)   what the host and the page are told
 *   fail(error)  a mistake made outside a frame (a press on the scrubber)
 */
export function directScenes(env) {
  const settings = { loop: true, transition: 'cut', transitionTime: 0.5, transitionColor: 'black', beatsPerBar: 4 }
  class Scene {}
  const light = []
  let defs = [], file = {}, now = null, pending = null, clock = 0, paused = false, marks = [], duration = 0, bar = null
  let setScene = () => {}
  const of = (thing, name) => (thing == null ? undefined : thing[name] ?? thing[snake(name)])
  const beatSeconds = () => env.sound()?.beats(1) ?? 0.5
  const beatNow = () => env.sound()?.beat() ?? clock * 2
  const tagged = (e, name) => {
    if (e && typeof e === 'object' && !e.picturesScene) { try { e.picturesScene = name } catch (e2) { /* a frozen error */ } }
    return e
  }
  // One of a scene's own functions, with the scene as `this`; a mistake in it carries the scene's name.
  const run = (fn, on, args) => {
    if (!fn) return undefined
    try {
      const result = fn.apply(on.self, args)
      return result && typeof result.catch === 'function' ? result.catch((e) => { throw tagged(e, on.def.name) }) : result
    } catch (e) { throw tagged(e, on.def.name) }
  }
  const find = (target, said) => {
    const i = typeof target === 'number' ? target : defs.findIndex((d) => d.cls === target || d.name === target ||
      (typeof target === 'string' && d.name.toLowerCase() === target.toLowerCase()) || (now && target === now.self && d === now.def))
    if (!defs[i]) throw new Error(`${said}: there is no scene ${typeof target === 'string' ? `called "${target}"` : 'like that'}. The scenes are: ${defs.map((d) => d.name).join(', ')}`)
    return i
  }
  // The scene after this one: the first again after the last, or null when the program does not loop.
  const after = () => (now.i + 1 < defs.length ? now.i + 1 : settings.loop ? 0 : null)
  const ask = (said, target, how) => {
    if (how != null && typeof how !== 'object') throw new Error(`${said} needs its options in braces, as in go("game", { transition: "crossfade" })`)
    if (defs.length && target !== undefined) find(target, said)
    pending = { target, said, how: how || {} }
  }

  // What a scene says of itself: on the class (`static length = 12`), or as a field of it (`length = 12`).
  const define = (name, cls, fns) => {
    const def = { name, cls, fns, spare: null, last: null, start: null, seconds: null }
    // A class is made once here to read its fields; that one is the scene the first time it plays.
    if (cls) { try { def.spare = new cls() } catch (e) { throw tagged(e, name) } }
    // (A class's own `length` is how many things its constructor takes, which is none.)
    const read = (key) => of(cls ? def.spare : fns, key) ?? ((cls && of(cls, key)) || undefined)
    const bars = read('bars')
    Object.assign(def, { length: read('length'), beats: read('beats') ?? (bars != null ? bars * settings.beatsPerBar : undefined),
      transition: read('transition'), transitionTime: read('transitionTime'), transitionColor: read('transitionColor') ?? read('transitionColour') })
    return def
  }
  const actsOf = (self) => {
    const acts = {}
    for (const [hook, spelt] of Object.entries(env.hooks)) for (const n of spelt) if (typeof self[n] === 'function') { acts[hook] = self[n]; break }
    if (typeof self.resume === 'function') acts.resume = self.resume
    return acts
  }
  const longOf = (def) => def.length ?? (def.beats != null ? def.beats * beatSeconds() : null)
  // Where each scene starts, for as far as the lengths are known; the whole length when they all are.
  const timeline = () => {
    let t = 0
    for (const def of defs) {
      def.start = t
      def.seconds = longOf(def)
      t = t == null || def.seconds == null ? null : t + def.seconds
    }
    duration = t ?? 0
  }
  const time = () => (now ? (now.def.start ?? 0) + Math.min(now.t, now.def.seconds ?? Infinity) : 0)
  const sections = () => [...defs.filter((d) => d.start != null).map((d) => ({ name: d.name, t: d.start, length: d.seconds, scene: true })), ...marks].sort((a, b) => a.t - b.t)
  const report = () => env.report(sections(), duration)

  const tell = (t) => {
    now.t = t
    const long = now.def.seconds
    setScene(t, long ? Math.min(1, t / long) : 0, now.def.name)
    bar?.update()
  }
  const leave = () => {
    if (!now) return
    const was = now
    try { if (was.ready) run(was.acts.stop, was, []) } finally { env.controls(was.made) }
  }
  const enter = (i, how = {}, offset = 0) => {
    const def = defs[i]
    const name = transitionName(of(how, 'transition') ?? def.transition ?? settings.transition)
    const seconds = Number(of(how, 'transitionTime') ?? def.transitionTime ?? settings.transitionTime)
    if (name !== 'cut' && !env.layer.knows(name)) throw new Error(`There is no transition "${name}". The transitions are: ${env.layer.names().join(', ')}`)
    // The first scene of all arrives with no transition: there is nothing to come from.
    if (now && name !== 'cut' && seconds > 0) {
      if (!env.flat && now.ready) run(now.acts.draw, now, [])
      env.layer.begin(name, seconds, of(how, 'transitionColor') ?? of(how, 'transitionColour') ?? def.transitionColor ?? settings.transitionColor)
    } else env.layer.finish()
    leave()
    const kept = !!of(how, 'keep') && def.last
    const self = kept || (def.cls ? def.spare || new def.cls() : Object.create(def.fns))
    def.spare = null
    def.last = self
    const mine = now = { def, self, i, acts: actsOf(self), ready: false, t: 0, over: false, made: env.controls(),
      began: clock - offset, beganBeat: def.length == null && def.beats != null ? beatNow() - offset / beatSeconds() : null }
    env.empty()
    env.told(def.name, i)
    tell(offset)
    const starting = run(kept ? mine.acts.resume : mine.acts.setup, mine, [])
    if (starting && typeof starting.then === 'function') starting.then(() => { mine.ready = true }, (e) => { if (now === mine) env.fail(e) })
    else mine.ready = true
  }
  // One frame of the director: the transition moves on, a change that was asked for happens, and a scene whose time is up ends.
  const step = (dt) => {
    clock += dt
    env.layer.step(dt)
    if (pending) {
      const { target, said, how } = pending
      pending = null
      const i = target === undefined ? (said === 'restart()' ? now.i : after()) : find(target, said)
      if (i != null) enter(i, how)
    }
    if (!now.ready) return
    const t = now.beganBeat != null ? (beatNow() - now.beganBeat) * beatSeconds() : clock - now.began
    const long = longOf(now.def)
    if (long != null && t >= long && !now.over) {
      const next = after()
      // What ran over belongs to the next scene, so a sequence keeps time however the frames fall.
      if (next != null) return enter(next, {}, Math.min(t - long, 0.1))
      now.over = true
    }
    tell(t)
  }
  const both = (hook, args) => {
    const a = file[hook] ? file[hook](...args) : undefined
    const b = now?.ready ? run(now.acts[hook], now, args) : undefined
    return a && typeof a.catch === 'function' ? (b && typeof b.catch === 'function' ? Promise.all([a, b]) : a) : b
  }
  const seek = (seconds) => {
    if (!(duration > 0)) return
    const t = Math.max(0, Math.min(duration - 0.001, Number(seconds) || 0))
    let i = 0
    while (i + 1 < defs.length && defs[i + 1].start <= t) i++
    pending = null
    enter(i, { transition: 'cut' }, t - defs[i].start)
    if (file.seek) file.seek(t)
    // Paused, the picture still follows the knob.
    if (paused && now.ready) { both('update', [0]); both('draw', []) }
  }
  const pause = (on) => {
    if (paused === !!on) return
    paused = !!on
    paused ? env.sound()?.pause() : env.sound()?.resume()
  }
  const safely = (act) => (...args) => { try { return act(...args) } catch (e) { env.fail(e) } }

  return {
    /** The names a scene's code is given. */
    names: {
      Scene,
      scene(name, fns) {
        if (typeof name !== 'string' || !name || !fns || typeof fns !== 'object') throw new Error('scene() needs a name and the scene\'s functions in braces, as in scene("title", { draw, update })')
        if (defs.length) throw new Error(`scene("${name}", …) was called after the program began. Name every scene at the top level of the file`)
        if (light.some((d) => d.name === name)) throw new Error(`There are two scenes called "${name}"`)
        light.push({ name, fns })
      },
      go: (target, how) => {
        if (target === undefined) throw new Error('go() needs the scene to go to: its name or its class, as in go("game")')
        ask(`go(${typeof target === 'string' ? shown(target) : target?.name ?? '…'})`, target, how)
      },
      nextScene: (how) => ask('nextScene()', undefined, how),
      next_scene: (how) => ask('nextScene()', undefined, how),
      restart: (how) => ask('restart()', undefined, how),
      section(name) {
        const said = String(name)
        // Said again (every frame, or the next time round), a mark stays where it was first put.
        if (marks.some((m) => m.name === said)) return
        marks.push({ name: said, t: time() })
        if (defs.length) report()
      },
      config(given) {
        if (!given || typeof given !== 'object') throw new Error('config() needs its settings in braces, as in config({ loop: false })')
        for (const [key, value] of Object.entries(given)) {
          const setting = camel(key).replace('Colour', 'Color')
          if (!(setting in settings)) throw new Error(`config() has no setting "${key}". It has: ${Object.keys(settings).join(', ')}`)
          settings[setting] = value
        }
      },
      __scene: (set) => { setScene = set },
    },
    /** The file's top level has run: `found` is what it defined. The table to call in its place, or null for a file with no scenes. */
    begin(found) {
      file = found
      const classes = (found.__scenes || []).filter((c) => typeof c === 'function' && c.prototype instanceof Scene)
      const order = []
      let k = 0
      for (const slot of env.written) {
        const cls = slot && classes.find((c) => c.name === slot)
        if (cls && !order.some((d) => d.cls === cls)) order.push(define(cls.name, cls))
        else if (!slot && light[k]) order.push(define(light[k].name, null, light[k++].fns))
      }
      for (const left of light.slice(k)) order.push(define(left.name, null, left.fns))
      if (!order.length) return null
      defs = order
      timeline()
      report()
      if (duration > 0 && env.bar !== false) bar = timelineBar(env.container, { time, duration: () => duration, sections, paused: () => paused, pause, seek: safely(seek) })
      // A go() at the top level says which scene is first; a nextScene() there is carried out from the first.
      const first = pending?.target !== undefined ? pending : null
      if (first) pending = null
      enter(first ? find(first.target, first.said) : 0)
      const staged = {
        update: (dt) => { if (paused) return undefined; step(dt); return both('update', [dt]) },
        // The transition is painted when the new scene has drawn: a 3D canvas can be read only then.
        draw: () => { try { return both('draw', []) } finally { env.layer.paint() } },
        stop: () => { try { leave() } finally { bar?.remove() } return file.stop?.() },
      }
      for (const hook of Object.keys(env.hooks)) staged[hook] ??= hook === 'setup' ? undefined : (...args) => (paused ? undefined : both(hook, args))
      return staged
    },
    get name() { return now?.def.name ?? null },
    get time() { return time() },
    get duration() { return duration },
    get sections() { return sections() },
    get paused() { return paused },
    seek: safely(seek),
    pause,
    go: safely((target, how) => { ask('go()', target, how) }),
  }
}

