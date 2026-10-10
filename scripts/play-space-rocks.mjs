/**
 * Space Rocks played with a pointer, in a real browser: a tap turns the ship
 * and shoots without moving it, a hold flies it towards the pointer. Used by
 * test-scenes.mjs, with the mouse and with a finger.
 *
 * The game's own numbers are read through two lines added to its end (HOOK):
 * `rocksState()` gives the ship and the shots so far, `rocksCalm()` makes the
 * ship safe for good, so no rock ends a check half way, and `rocksStop()`
 * brings the ship to rest between checks.
 */

export const HOOK = `
let shots = 0
const shootOnce = shoot
shoot = () => { shots += 1; shootOnce() }
window.rocksState = () => ({ x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, angle: ship.angle, shots, lives })
window.rocksCalm = () => { safe = 1e9 }
window.rocksStop = () => { ship.vx = 0; ship.vy = 0 }
`

const wait = (page, ms) => page.waitForTimeout(ms)
const state = (page) => page.evaluate(() => window.rocksState())
// How far apart two angles are, the short way round.
const apart = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
const speed = (s) => Math.hypot(s.vx, s.vy)

/**
 * The ways to press. Each gives down(x, y), move(x, y) and up(), in page points.
 * A finger in Chromium is a real touch, sent the way a touch screen sends it. WebKit under
 * Playwright has only a whole tap for a real touch, so there a tap is real and a hold is a
 * pointer event of type "touch" given to the canvas.
 */
export async function pointers(page, engine, touch) {
  if (!touch) {
    return { real: true, down: async (x, y) => { await page.mouse.move(x, y); await page.mouse.down() }, move: (x, y) => page.mouse.move(x, y, { steps: 4 }), up: () => page.mouse.up(), tap: null }
  }
  if (engine === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
    return { real: true, down: (x, y) => send('touchStart', [{ id: 1, x, y }]), move: (x, y) => send('touchMove', [{ id: 1, x, y }]), up: () => send('touchEnd', []), tap: null }
  }
  const made = (type, x, y) => page.evaluate(([type, x, y]) => {
    const init = { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }
    document.querySelector('canvas').dispatchEvent(new PointerEvent(type, init))
  }, [type, x, y])
  let last = [0, 0]
  return {
    real: false,
    down: (x, y) => { last = [x, y]; return made('pointerdown', x, y) },
    move: (x, y) => { last = [x, y]; return made('pointermove', x, y) },
    up: () => made('pointerup', ...last),
    tap: (x, y) => page.touchscreen.tap(x, y),
  }
}

/**
 * Plays the scene already running on `page`. `say(ok, what, got)` is told each finding.
 * `moment` is how long a press must last before the engine starts, in seconds.
 */
export async function playSpaceRocks(page, engine, { touch = false, say, moment = 0.18 }) {
  const how = touch ? 'a finger' : 'the mouse'
  const p = await pointers(page, engine, touch)
  const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  await page.evaluate(() => window.rocksCalm())
  await wait(page, 100)
  const s0 = await state(page)
  // page points for a place in the scene
  const at = (x, y) => [box.x + x, box.y + y]

  // --- a tap: down and up within 80 ms, to the right of the ship and below it
  const A = [s0.x + 90, s0.y + 50]
  if (p.tap) await p.tap(...at(...A))
  else { await p.down(...at(...A)); await wait(page, 80); await p.up() }
  await wait(page, 80)
  const s1 = await state(page)
  await wait(page, 500)
  const s2 = await state(page)
  say(s1.shots === s0.shots + 1 && s2.shots === s1.shots, `Space Rocks, ${how}: a tap fires one shot`, { before: s0.shots, after: s2.shots })
  say(apart(s1.angle, Math.atan2(50, 90)) < 0.02, `Space Rocks, ${how}: a tap turns the ship to face it`, { angle: s1.angle, want: Math.atan2(50, 90) })
  say(speed(s2) === 0 && s2.x === s0.x && s2.y === s0.y, `Space Rocks, ${how}: a tap leaves the ship still`, s2)

  // --- a press let go just before the moment: still no engine
  // --- taps as long as a finger's on glass: each shoots, none starts the engine
  for (const ms of [60, 100, 130]) {
    await p.down(...at(...A)); await wait(page, ms); await p.up()
    await wait(page, 150)
  }
  const s3 = await state(page)
  say(speed(s3) === 0 && s3.shots === s2.shots + 3, `Space Rocks, ${how}: taps of 60, 100 and 130 ms each shoot and none moves the ship (the engine waits ${moment} s)`, s3)

  // --- the engine comes soon after: a press of a quarter of a second has already pushed the ship
  await p.down(...at(...A)); await wait(page, 250); await p.up()
  await wait(page, 100)
  const soon = await state(page)
  say(speed(soon) > 5 && speed(soon) < 60, `Space Rocks, ${how}: a press of 0.25 s has started the engine`, soon)
  await page.evaluate(() => window.rocksStop())
  await wait(page, 100)
  Object.assign(s3, await state(page))

  // --- a hold: one second, up and to the left
  const B = [s3.x - 150, s3.y - 200]
  await p.down(...at(...B))
  await wait(page, 1000)
  const s4 = await state(page)
  const toB = Math.atan2(B[1] - s3.y, B[0] - s3.x)
  const along = (s4.x - s3.x) * Math.cos(toB) + (s4.y - s3.y) * Math.sin(toB)
  say(s4.shots === s3.shots + 1, `Space Rocks, ${how}: a hold fires one shot, at its start`, { before: s3.shots, after: s4.shots })
  say(along > 30 && speed(s4) > 100 && apart(Math.atan2(s4.vy, s4.vx), toB) < 0.1, `Space Rocks, ${how}: a hold of 1 s flies the ship towards the pointer`, { along, speed: speed(s4), heading: Math.atan2(s4.vy, s4.vx), toB })

  // --- the pointer moves while it is held: the ship turns to follow
  const C = [s3.x + 100, s3.y + 250]
  await p.move(...at(...C))
  await wait(page, 150)
  const s5 = await state(page)
  say(apart(s5.angle, Math.atan2(C[1] - s5.y, C[0] - s5.x)) < 0.15 && apart(s5.angle, s4.angle) > 1 && s5.shots === s4.shots, `Space Rocks, ${how}: the ship turns to follow a held pointer that moves, without shooting`, { angle: s5.angle, was: s4.angle, want: Math.atan2(C[1] - s5.y, C[0] - s5.x) })

  // --- let go: the engine stops, the ship drifts on
  await p.up()
  await wait(page, 100)
  const s6 = await state(page)
  await wait(page, 300)
  const s7 = await state(page)
  say(s7.vx === s6.vx && s7.vy === s6.vy && speed(s7) > 0 && s7.lives === 3, `Space Rocks, ${how}: letting go stops the engine and the ship drifts on`, { s6, s7 })
}
