/**
 * THE TESTS MAKE NO SOUND IN THE ROOM. `quietly(playwright.chromium, 'chromium', options)` starts a browser as
 * `launch` does, with Chromium's output muted. WebKit has no such switch, so in every page and frame of every
 * browser whatever is connected to the loudspeaker is connected instead to a gain of nothing that is connected to
 * it: the sound card still pulls the graph along, and every measurement is taken from the nodes before it, so
 * nothing that is measured changes. (It is synths.js's own way, from its scripts/test-browser.mjs.)
 */
const QUIET = `(() => {
  if (typeof AudioNode === 'undefined' || typeof AudioDestinationNode === 'undefined') return
  const connect = AudioNode.prototype.connect
  const silent = new WeakMap()
  AudioNode.prototype.connect = function (to, ...rest) {
    if (!(to instanceof AudioDestinationNode)) return connect.call(this, to, ...rest)
    let gain = silent.get(to)
    if (!gain) {
      gain = to.context.createGain()
      gain.gain.value = 0
      connect.call(gain, to)
      silent.set(to, gain)
    }
    connect.call(this, gain, ...rest)
    return to
  }
})()`

export async function quietly(type, name, options = {}) {
  const browser = await type.launch(name === 'chromium' ? { ...options, args: [...(options.args || []), '--mute-audio'] } : options)
  const newContext = browser.newContext.bind(browser)
  // Every context is given the gain of nothing before anything else of a test's own (a page made straight from the browser has a context of its own).
  browser.newContext = async (...args) => {
    const context = await newContext(...args)
    await context.addInitScript(QUIET)
    return context
  }
  browser.newPage = async (...args) => (await browser.newContext(...args)).newPage()
  return browser
}
