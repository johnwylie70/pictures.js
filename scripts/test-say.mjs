#!/usr/bin/env node
/**
 * say(): a scene that talks (voice/say.js). That a line is timed from its measured duration when a voice host has it
 * and from an estimate (2.5 words a second, at least 0.8) when not, that every line asked for is recorded (in the
 * library's list and in the host's, with its text, voice, language and whether it was written out or made while
 * the scene runs), that the host's manifest entry is looked up and played on the scene's clock, that a scene
 * recorded a frame at a time puts the entry's WAV on the exact sample through the stepped sound, that a line with
 * no audio is reported and not silently dropped when recording, and that nothing is ever generated.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright node scripts/test-say.mjs
 *
 * NOTHING IS HEARD, AND NO MICROPHONE IS OPENED. The speech of the browser is replaced on every page by a fake that
 * writes down what it was asked to say (`FAKE_SPEECH`), the host is a fake whose entries are WAV files made here
 * (a short tone that begins on a full-scale sample, so the sample it lands on can be read), and the sound is the
 * quiet of test-sound.mjs. The first half needs no browser: the library is run in Node with the real stepped
 * player. The second runs scenes in Chromium, and WebKit when Playwright has it. It ends with code 1 if a case fails.
 *
 * THE TALKING MOUTH (speaking(), voiceLevel(), mouth()) is tested the same way: the level of the draft voice (made up
 * from the words) against a fake clock and a fake utterance whose events the test fires; the level of a generated voice
 * against a WAV made here whose loudness is known, through the real stepped sound; and the mouth's pixels in a browser.
 */
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { quietly } from './quiet.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { createSay, estimate, literalsIn, mouthProfile, mouthStyles, drawMouth, pickVoice, voicePresets, castVoice } = await import(pathToFileURL(join(ROOT, 'voice', 'say.js')).href)
const { createSound } = await import(pathToFileURL(join(ROOT, 'sound', 'synths.js')).href)
const { sceneUses } = await import(pathToFileURL(join(ROOT, 'pictures.js')).href)

let failed = 0
const say = (ok, where, what, got) => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${where}: ${what}${ok ? '' : `: ${JSON.stringify(got)}`}`)
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** A mono 16-bit WAV of `n` samples at 48000 Hz: cos(i / 20) at `amp`, so its first sample is full scale. */
function wav(n, amp = 0.5, rate = 48000) {
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp * 32767 * Math.cos(i / 20)), 44 + i * 2)
  return b
}
const LINE = { key: 'abcdef0123456789', file: 'voice/abcdef0123456789.wav', duration: 0.5, provider: 'fake', voice: 'calm', lang: 'en' }
const FILES = { '/voice/abcdef0123456789.wav': wav(24000) }

// --- the library alone, in Node -------------------------------------------------------------------------------

{
  say(estimate('Hello') === 0.8 && estimate('') === 0.8 && Math.abs(estimate('one two three four five') - 2) < 1e-9 && Math.abs(estimate('a b c d e f g h i j') - 4) < 1e-9 && estimate('  spaced   out  ') === 0.8, 'node', 'with nothing measured a line is 2.5 words a second and never under 0.8 seconds', [estimate('Hello'), estimate('one two three four five')])

  const code = `say("Hello")\nsay('It\\'s ok', { voice: "calm" })\nconst n = "x"\nsay(n)\nsay("Hi " + n)\nsay(\`plain\`)\nsay(\`with \${n}\`)\nsay(f"py")\nobj.say("method")\n`
  const lits = literalsIn(code)
  say(same(lits.map((l) => l.text), ['Hello', "It's ok", 'plain']) && same(lits.map((l) => l.line), [1, 2, 6]), 'node', 'the lines written out in the code are found, with their line numbers, and a line made while it runs is not one of them', lits)

  // Draft voice: a fake speechSynthesis.
  const spoken = []
  class Utterance { constructor(text) { this.text = text } }
  const speech = { speak: (u) => spoken.push(u), cancel() { spoken.cancelled = true }, getVoices: () => [{ name: 'Daniel', lang: 'en-GB', voiceURI: 'd' }, { name: 'Samantha', lang: 'en-US', voiceURI: 's', default: true }, { name: 'Amelie', lang: 'fr-CA', voiceURI: 'a' }] }
  const warnings = []
  const make = (o = {}) => createSay({ speech: () => speech, Utterance, warn: (w) => warnings.push(w), code: 'say("Hello")', ...o })

  const bare = make()
  const t1 = bare.say('Hello')
  const t2 = bare.say('Half of the width is the middle.', { voice: 'daniel', lang: 'en' })
  const t3 = bare.say('Bonjour', 'amelie')
  const fr = bare.say('Salut', { lang: 'fr' })
  bare.say('Hello')
  say(t1 === 0.8 && t2 === 2.8 && spoken[0].text === 'Hello' && spoken[0].lang === 'en' && spoken[0].voice.name === 'Samantha', 'node', 'with no host say("Hello") is spoken by the on-device voice (the default one for English), and gives back the estimate', [t1, spoken[0]])
  say(spoken[1].voice.name === 'Daniel' && spoken[2].voice.name === 'Amelie' && spoken[3].voice.name === 'Amelie' && spoken[3].lang === 'fr', 'node', 'a voice is found by its name (any case), a string second argument is a voice, and a language with no voice named takes one for that language', spoken.map((u) => u.voice?.name))
  say(spoken.length === 5 && !warnings.length, 'node', 'every call speaks (a repeat too), and nothing needs a network or a warning', [spoken.length, warnings])
  say(same(bare.asked.map((a) => [a.text, a.voice, a.lang, a.source, a.line]), [['Hello', undefined, 'en', 'literal', 1], ['Half of the width is the middle.', 'daniel', 'en', 'runtime', undefined], ['Bonjour', 'amelie', 'en', 'runtime', undefined], ['Salut', undefined, 'fr', 'runtime', undefined]].map((a) => a.map((x) => x ?? undefined))), 'node', 'the asked list has each distinct line once, with text, voice, language, whether it was written out, and its line', bare.asked)
  bare.close()
  say(spoken.cancelled === true, 'node', 'closing the scene stops what is still being spoken', spoken.cancelled)
  let threw = ''
  try { bare.say('') } catch (e) { threw = e.message }
  say(/needs the words to say/.test(threw), 'node', 'say("") says what is wrong', threw)

  // A host that has the line: lookup, note, no speech, the file played.
  const calls = []
  const host = { lookup: (r) => { calls.push(['lookup', r]); return r.text === 'Half of the width is the middle.' ? LINE : null }, note: (r) => calls.push(['note', r]), speakDraft: (r) => calls.push(['draft', r]) }
  const played = []
  const sound = { loadSample: (file) => ({ play: (...a) => played.push([file, ...a]) }), soundTime: () => 3.25 }
  spoken.length = 0
  const hosted = make({ host: () => host, sound: () => sound })
  const d1 = hosted.say('Half of the width is the middle.', { voice: 'calm' })
  const d2 = hosted.say('Another line of four words')
  hosted.say('Half of the width is the middle.', { voice: 'calm' })
  say(d1 === 0.5, 'node', 'a line the host has takes the entry\'s measured duration, not the estimate (which would be 2.8)', d1)
  say(played.length === 2 && played[0][0] === 'voice/abcdef0123456789.wav' && !spoken.length && hosted.plays[0].at === 3.25, 'node', 'the entry\'s file is played through the scene\'s sound at the sound clock (and loaded once, however often the line is said), and the draft voice is not used', [played, spoken.length, hosted.plays])
  say(d2 === 2.0 && calls.some(([k, r]) => k === 'draft' && r.text === 'Another line of four words') && !spoken.length, 'node', 'a line the host does not have is given to the host\'s speakDraft and gets the estimate', [d2, calls.filter(([k]) => k === 'draft').length])
  say(same(calls.filter(([k]) => k === 'lookup')[0], ['lookup', { text: 'Half of the width is the middle.', lang: 'en', voice: 'calm' }]), 'node', 'the host is looked up with { text, voice, lang }, lang "en" by default', calls[0])
  const notes = calls.filter(([k]) => k === 'note').map(([, r]) => r)
  say(notes.length === 2 && notes[0].source === 'runtime' && notes[0].voice === 'calm' && notes[1].text === 'Another line of four words', 'node', 'the host is told of each distinct line once, a line it has as well as one it has not, so "not yet generated" is the asked list minus its entries', notes)
  say(!('generate' in host) && !calls.some(([k]) => k === 'generate'), 'node', 'nothing is generated: the library has no call to make', calls.map(([k]) => k))

  // Recording with a line that has no audio: reported, in the asked list, not spoken.
  spoken.length = 0
  warnings.length = 0
  const rec = make({ host: () => ({ lookup: () => null, note() {} }), recorded: true })
  const r1 = rec.say('Hello')
  rec.say('Hello')
  say(r1 === 0.8 && !spoken.length && rec.unresolved.length === 1 && rec.asked.length === 1, 'node', 'recorded, a line with no audio is not spoken (it could not be recorded), is kept in the unresolved and asked lists, and is still timed', [r1, rec.unresolved, rec.asked])
  say(warnings.length === 1 && /cannot be recorded/.test(warnings[0]) && /"Hello"/.test(warnings[0]), 'node', 'and a warning names the line and says why (once, not once a frame)', warnings)

  // A host that throws does not stop the scene.
  warnings.length = 0
  const bad = make({ host: () => ({ lookup() { throw new Error('boom') }, note() { throw new Error('bang') } }) })
  say(bad.say('Hello') === 0.8 && warnings.length === 2, 'node', 'a host that fails is said once and the draft voice carries on', warnings)
}

// --- the voice's level and the mouth, in Node -------------------------------------------------------------------------

/** A mono 16-bit WAV whose loudness is `amp(seconds)`: cos(i / 20) times it. */
function loud(seconds, amp, rate = 48000, wave = (i) => Math.cos(i / 20)) {
  const n = Math.round(seconds * rate)
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34)
  b.write('data', 36); b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(amp(i / rate) * 32767 * wave(i)), 44 + i * 2)
  return b
}
{
  const TEXT = 'Hello there, my friend. How are you today?'
  let t = 0
  const spoken = []
  class Utterance { constructor(text) { this.text = text } }
  const speech = { speak: (u) => spoken.push(u), cancel() {}, getVoices: () => [] }
  const make = (o = {}) => createSay({ speech: () => speech, Utterance, clock: () => t, warn() {}, code: '', ...o })
  /** Say TEXT at time 0 and read the level every sixtieth of a second for `seconds`: [[speaking, level], ...]. */
  const trace = (text, seconds, setup) => {
    spoken.length = 0
    const talk = make()
    t = 0
    const length = talk.say(text)
    setup?.(talk, spoken[0])
    const out = []
    for (let f = 0; f < seconds * 60; f++) { t = f / 60; const level = talk.voiceLevel(); out.push([talk.speaking(), level]) }
    return { talk, length, out }
  }

  const quiet = make()
  const idle = [0, 0.5, 3].map((at) => { t = at; return [quiet.speaking(), quiet.voiceLevel()] })
  say(same(idle, [[false, 0], [false, 0], [false, 0]]), 'node', 'before anything is said the voice is not speaking and its level is 0', idle)

  const a = trace(TEXT, 6)
  const levels = a.out.map((x) => x[1])
  const talkingFrames = a.out.filter((x) => x[0]).length
  say(a.out[0][0] === true && levels.slice(1, 12).some((v) => v > 0.1) && Math.max(...levels) > 0.4 && Math.max(...levels) <= 1, 'node', 'the draft voice: speaking() is true from say(), and the level rises as the line is said (a made-up mouth, 0 to 1)', [levels.slice(0, 12), Math.max(...levels)])
  say(Math.abs(talkingFrames / 60 - a.length) < 0.05 && a.out[a.length * 60 + 5][0] === false, 'node', 'and speaking() ends when the line\'s estimated time is over (the draft voice\'s only clock when the browser sends no events)', [talkingFrames, a.length])
  say(levels[levels.length - 1] === 0 && levels.slice(Math.ceil((a.length + 1.2) * 60)).every((v) => v === 0), 'node', 'the level ends at exactly 0 once the line is over', levels.slice(-3))
  let jump = 0
  for (let i = 1; i < levels.length; i++) jump = Math.max(jump, Math.abs(levels[i] - levels[i - 1]))
  say(jump < 0.35 && levels.some((v) => v > 0.05 && v < 0.95), 'node', 'the level is smoothed (quick to open, a little slower to close): no frame at 60 a second moves it by 0.35 or more, so the mouth does not flicker', jump)
  const b = trace(TEXT, 6)
  const other = trace('Goodbye for now, see you soon. Bye bye.', 6)
  say(same(a.out, b.out) && !same(a.out, other.out.slice(0, a.out.length)), 'node', 'two runs of the same line give the same level every frame (seeded from the text), and another line gives another', a.out.length)
  // Asking twice in the same instant gives the same number, so a draw that asks twice and a frame that asks once agree.
  t = 0.31
  const twice = [a.talk.voiceLevel(), a.talk.voiceLevel()]
  say(twice[0] === twice[1], 'node', 'the level at one moment is one number, however often it is asked', twice)

  // The browser's events: the speech starts late, a word is reached, the speech ends.
  const began = trace(TEXT, 8, (talk, u) => { u.onstart?.call(u) })
  say(began.out.every((x, i) => i / 60 < a.length + 0.9 || x[0]) && began.out[Math.round((a.length + 2) * 60)][0] === true, 'node', 'when the browser says the speech has started, speaking() goes on past the estimate until it says the speech ended', began.out.length)
  const ended = (() => {
    spoken.length = 0
    const talk = make(); t = 0; talk.say(TEXT)
    const u = spoken[0]; u.onstart(); t = 0.5; const during = talk.speaking()
    t = 1.5; u.onend(); const after = talk.speaking()
    return [during, after]
  })()
  say(same(ended, [true, false]), 'node', 'and it stops when the browser says the speech ended, before the estimate is over', ended)
  const reach = trace(TEXT, 3, (talk, u) => { u.onstart(); t = 0.1; u.onboundary({ name: 'word', charIndex: TEXT.indexOf('today') }) })
  const reachFrom = trace(TEXT, 3, (talk, u) => { u.onstart() })
  say(!same(reach.out, reachFrom.out), 'node', 'a word boundary from the browser moves the mouth on to that word', reach.out.length)
  const profile = mouthProfile(TEXT)
  say(profile.words.length === 8 && profile.words[7].char === TEXT.indexOf('today') && profile.syllables.length >= 12 && profile.syllables.every((x, i, all) => x.to > x.from && (!i || x.from >= all[i - 1].to)), 'node', 'the made-up mouth has an opening for each syllable, in order, and knows where each word starts', [profile.words.length, profile.syllables.length])

  // The shape: the vowels pick it, m b p close the lips first, and the gaps between words close the mouth.
  const vowels = mouthProfile('moo bee tah', 3)
  const [moo, bee, tah] = vowels.syllables
  say(moo.width < 0.3 && bee.width > 0.65 && tah.width > 0.2 && tah.width < 0.6 && tah.amp > bee.amp && moo.from > vowels.words[0].at && bee.from > vowels.words[1].at && tah.from === vowels.words[2].at, 'node', 'the draft voice\'s syllables take their shape from the vowel (oo round, ee spread, a tall), and m and b close the lips before the vowel opens', vowels.syllables)
  const shapes = (() => {
    spoken.length = 0
    const talk = make(); t = 0; talk.say(TEXT)
    const seen = new Set(), widths = []
    let closedInside = 0
    for (let f = 0; f < 3.2 * 60; f++) { t = f / 60; const sh = talk.voiceShape(); seen.add(sh.viseme); widths.push(sh.width); if (sh.viseme === 'closed' && f > 20 && f < 150) closedInside++ }
    return { seen: [...seen], spread: Math.max(...widths) - Math.min(...widths), closedInside }
  })()
  say(shapes.seen.length >= 4 && shapes.spread > 0.5 && shapes.closedInside > 10 && shapes.seen.includes('closed'), 'node', 'across a sentence the draft mouth goes through several shapes (width spread over half the range) and closes between the syllables and words', shapes)
  const r0 = make(), r1 = make()
  t = 0; r0.say(TEXT); r1.say(TEXT)
  const again = [0.1, 0.5, 1.2].map((at) => { t = at; return JSON.stringify(r0.voiceShape()) === JSON.stringify(r1.voiceShape()) })
  say(again.every(Boolean), 'node', 'two runs give the same shape at the same time (seeded)', again)

  // Recorded, a line with no audio is silent, so the mouth stays shut.
  const rec = make({ host: () => ({ lookup: () => null, note() {} }), recorded: true })
  t = 0; rec.say('Hello there')
  const shut = [0.1, 0.3, 0.6].map((at) => { t = at; return [rec.speaking(), rec.voiceLevel()] })
  say(same(shut, [[false, 0], [false, 0], [false, 0]]), 'node', 'a recorded scene\'s line with no audio is silent, so the mouth stays shut', shut)

  // A bad mouth says what is wrong.
  const noCtx = make({ ctx: () => null })
  const wrong = [() => noCtx.mouth(1, 2, { style: 'square' }), () => noCtx.mouth(1, 2, { size: 0 }), () => noCtx.mouth('x', 2), () => noCtx.mouth(1, 2, 5)].map((f) => { try { f(); return '' } catch (e) { return e.message } })
  say(/"oval", "smile", "robot"/.test(wrong[0]) && /above 0/.test(wrong[1]) && /middle of the mouth/.test(wrong[2]) && /braces/.test(wrong[3]), 'node', 'a mouth with a style that is not one, a size of 0, no middle or its settings not in braces says what is wrong', wrong)
  say(same(mouthStyles, ['oval', 'smile', 'robot']) && same(Object.keys(make().names), ['say', 'sayAt', 'say_at', 'voices', 'speaker', 'speaking', 'voiceLevel', 'voice_level', 'voiceShape', 'voice_shape', 'mouth']), 'node', 'the styles are oval, smile and robot, and a scene is given say, sayAt, voices, speaker, speaking, voiceLevel, voiceShape and mouth (both spellings)', Object.keys(make().names))
}


// --- voices and characters (voices(), speaker(), the queue, a mouth for each) ------------------------------------------

{
  let t = 0
  const spoken = []
  class Utterance { constructor(text) { this.text = text; this.pitch = 1; this.rate = 1 } }
  const DEVICE = [
    { name: 'Amelie', lang: 'fr-CA', voiceURI: 'a' },
    { name: 'Samantha', lang: 'en-US', voiceURI: 's', default: true },
    { name: 'Daniel', lang: 'en-GB', voiceURI: 'd' },
    { name: 'Zarvox', lang: 'en-US', voiceURI: 'z' },
  ]
  const listeners = []
  const speech = (list) => ({ speak: (u) => spoken.push(u), cancel() {}, getVoices: () => list, addEventListener: (n, f) => listeners.push([n, f]), removeEventListener(n, f) { const i = listeners.findIndex((x) => x[1] === f); if (i >= 0) listeners.splice(i, 1) } })
  const make = (o = {}) => createSay({ speech: () => speech(DEVICE), Utterance, clock: () => t, warn() {}, code: '', ...o })

  // voices()
  const talk = make()
  const list = talk.voices()
  say(list.length === 4 && list.slice(0, 3).every((v) => v.lang.startsWith('en')) && list[3].name === 'Amelie' && list.every((v) => v.name && v.lang && v.source === 'device') && list.find((v) => v.name === 'Samantha').default === true, 'voices', 'voices() lists the device\'s voices with a name and a language, English first', list)
  say(same(make({ speech: () => speech([]) }).voices(), []) && same(make({ speech: () => null }).voices(), []), 'voices', 'a device with no voices yet (or none at all) gives an empty list, not an error', null)
  const late = []
  const stop = talk.onVoices((l) => late.push(l.length))
  listeners.filter(([n]) => n === 'voiceschanged').forEach(([, f]) => f())
  stop()
  say(same(late, [4]) && !listeners.length, 'voices', 'a device that loads its voices late says so (voiceschanged), and the listener goes away when asked', [late, listeners.length])
  const hosted = make({ host: () => ({ voices: () => ['Narrator', { id: 'v9', name: 'Pip', lang: 'en', provider: 'fake' }, { id: 'f1', lang: 'fr' }], lookup: () => null, note() {} }) })
  const hv = hosted.voices()
  say(same(hv.map((v) => v.name), ['Narrator', 'Pip', 'Samantha', 'Daniel', 'Zarvox', 'f1', 'Amelie']) && hv[0].source === 'host' && hv[1].id === 'v9' && hv[1].provider === 'fake' && hv[2].source === 'device', 'voices', 'a host that has voices() adds its voices (a name, or { id, name, lang, provider })', hv.map((v) => v.name))

  // presets
  const names = Object.keys(voicePresets)
  say(same(names, ['robot', 'high', 'deep', 'squeaky', 'slow', 'fast']), 'presets', 'the preset words are robot, high, deep, squeaky, slow and fast', names)
  const pick = (w, voices = DEVICE) => pickVoice(w, 'en', voices)
  say(pick('robot').voice.name === 'Zarvox' && pick('deep').voice.name === 'Daniel' && pick('high').voice.name === 'Samantha' && pick('squeaky').voice.name === 'Samantha', 'presets', 'a preset looks for an installed voice that suits it (robot Zarvox, deep Daniel, high and squeaky Samantha)', ['robot', 'deep', 'high', 'squeaky'].map((w) => pick(w).voice?.name))
  say(pick('deep').pitch < 1 && pick('high').pitch > 1 && pick('squeaky').pitch > pick('high').pitch && pick('slow').rate < 1 && pick('fast').rate > 1 && pick('robot').pitch < 1, 'presets', 'and sets a pitch and a rate: deep is lower, high and squeaky higher, slow and fast change the rate', names.map((w) => [w, pick(w).pitch, pick(w).rate]))
  const bare = [{ name: 'Only', lang: 'en-US', voiceURI: 'o', default: true }]
  say(names.every((w) => pick(w, bare).voice === undefined && pick(w, bare).pitch > 0) && names.every((w) => pick(w, []).pitch > 0), 'presets', 'every preset works on any device: with no voice that suits it the device\'s own is used, still with the preset\'s pitch and rate', names.map((w) => pick(w, bare)))
  say(pick('daniel').voice.name === 'Daniel' && pick('DANIEL').pitch === 1 && pick('dan').voice.name === 'Daniel' && pick('s').voice?.name !== 'Amelie' && pickVoice('amelie', 'fr', DEVICE).voice.name === 'Amelie' && pick('nobody').voice === undefined, 'presets', 'an exact voice name (any case) is a voice with the normal pitch and rate, part of a name finds it for the language, and a name nobody has is left out', null)

  // speaker(): the utterance settings
  spoken.length = 0
  const deep = talk.speaker({ voice: 'deep', name: 'Dan' })
  const pip = talk.speaker({ voice: 'squeaky', pitch: 0.9, rate: 1.1 })
  const exact = talk.speaker({ voice: 'Amelie', pitch: 1.5, rate: 0.8, lang: 'fr' })
  const plain = talk.speaker()
  deep.say('one'); pip.say('two'); exact.say('trois'); plain.say('four')
  const u = spoken
  say(u[0].voice.name === 'Daniel' && u[0].pitch === voicePresets.deep.pitch && u[0].rate === voicePresets.deep.rate && u[0].lang === 'en', 'speaker', 'a preset speaker\'s utterance has the matching voice, and the preset\'s pitch and rate', u[0])
  say(u[1].voice.name === 'Samantha' && Math.abs(u[1].pitch - 2 * 0.9 * 0.8) < 1e-9 || u[1].pitch === Math.min(2, voicePresets.squeaky.pitch * 0.9), 'speaker', 'the speaker\'s own pitch and rate multiply the preset\'s (pitch is held to the browser\'s 0 to 2)', [u[1].pitch, u[1].rate])
  say(u[2].voice.name === 'Amelie' && u[2].pitch === 1.5 && u[2].rate === 0.8 && u[2].lang === 'fr', 'speaker', 'an exact voice name, pitch, rate and language are set on the utterance as given', u[2])
  say(u[3].voice.name === 'Samantha' && u[3].pitch === 1 && u[3].rate === 1, 'speaker', 'a speaker with nothing set speaks in the language\'s default voice at the normal pitch and rate', u[3])
  const bad = [() => talk.speaker({ pitch: 3 }), () => talk.speaker({ rate: 0 }), () => talk.speaker({ voice: 4 }), () => talk.speaker({ colour: 'red' }), () => talk.speaker(7)].map((f) => { try { f(); return '' } catch (e) { return e.message } })
  say(bad.every(Boolean) && /pitch is a number from 0 to 2/.test(bad[0]) && /rate/.test(bad[1]) && /name such as/.test(bad[2]) && /not a setting/.test(bad[3]) && /braces/.test(bad[4]), 'speaker', 'a speaker with a pitch out of range, a voice that is not a name or a setting that is not one says what is wrong', bad)
  let foreign = ''
  try { talk.say('x', { speaker: {} }) } catch (e) { foreign = e.message }
  say(/made with speaker\(\)/.test(foreign), 'speaker', 'a speaker that was not made by speaker() says what is wrong', foreign)

  // the queue: two speakers take turns
  spoken.length = 0
  const q = make()
  const alice = q.speaker({ voice: 'high', name: 'Alice' }), bob = q.speaker({ voice: 'deep', name: 'Bob' })
  t = 10
  const a1 = alice.sayAt('Hello there')                       // 0.8 s
  const b1 = bob.sayAt('Hi Alice, how are you today my friend')  // 8 words, 3.2 s
  const a2 = alice.sayAt('Fine')
  say(a1.start === 0 && a1.end === 0.8 && Math.abs(b1.start - 0.8) < 1e-9 && Math.abs(b1.end - 4) < 1e-9 && Math.abs(a2.start - 4) < 1e-9 && Math.abs(a2.duration - 0.8) < 1e-9, 'queue', 'sayAt gives { start, duration, end } from now: the second line starts when the first ends, the third when the second does', [a1, b1, a2])
  say(same(spoken.map((x) => x.text), ['Hello there', 'Hi Alice, how are you today my friend', 'Fine']) && spoken[0].voice.name === 'Samantha' && spoken[1].voice.name === 'Daniel', 'queue', 'the lines are given to the speech in order (the speech queues them), each in its own speaker\'s voice', spoken.map((x) => [x.text, x.voice?.name]))
  // fresh, so the smoothing is not shared with the reads above
  const run = make(), ra = run.speaker({ name: 'A' }), rb = run.speaker({ name: 'B' })
  t = 10; ra.say('Hello there'); rb.say('Hi Alice, how are you today my friend')
  const ta = [], tb = [], tany = []
  for (let f = 0; f < 5 * 60; f++) { t = 10 + f / 60; ta.push([ra.speaking(), ra.level()]); tb.push([rb.speaking(), rb.level()]); tany.push(run.voiceLevel()) }
  const firstA = ta.findIndex((x) => x[0]), lastA = ta.map((x) => x[0]).lastIndexOf(true), firstB = tb.findIndex((x) => x[0])
  say(firstA === 0 && Math.abs(lastA - 47) <= 1 && Math.abs(firstB - 48) <= 1 && !ta.some((x, i) => x[0] && tb[i][0]), 'queue', 'a speaker is speaking only during its own line, and two speakers are never speaking at once', [firstA, lastA, firstB])
  const maxA = Math.max(...ta.slice(0, 48).map((x) => x[1])), maxBduringA = Math.max(...tb.slice(0, 40).map((x) => x[1])), maxB = Math.max(...tb.slice(48).map((x) => x[1])), maxAduringB = Math.max(...ta.slice(60).map((x) => x[1]))
  say(maxA > 0.4 && maxBduringA === 0 && maxB > 0.4 && maxAduringB === 0, 'queue', 'level(): only the talking speaker\'s mouth opens (A while A talks, B while B talks, the other stays 0)', [maxA, maxBduringA, maxB, maxAduringB])
  t = 10.3
  const sh = [ra.shape(), rb.shape()]
  say(sh[0].viseme !== undefined && sh[0].height === ra.level() && sh[1].height === 0 && sh[1].viseme === 'closed' && 'width' in sh[0], 'queue', 'shape() is the speaker\'s own { width, height, viseme }', sh)
  say(Math.max(...tany.slice(0, 40)) > 0.4 && Math.max(...tany.slice(60, 170)) > 0.4, 'queue', 'voiceLevel() with no speaker means any speaker: it opens for both', [Math.max(...tany.slice(0, 40)), Math.max(...tany.slice(60, 170))])
  t = 10.3
  say(run.voiceLevel(ra) === ra.level() && run.voiceLevel(rb) === 0 && run.voiceShape(rb).viseme === 'closed' && run.speaking(ra) === true && run.speaking(rb) === false, 'queue', 'voiceLevel(speaker), voiceShape(speaker) and speaking(speaker) take the speaker as an argument too', null)

  // the queue is real time: the browser says when the speech began and ended
  spoken.length = 0
  const live = make(), la = live.speaker({ name: 'A' }), lb = live.speaker({ name: 'B' })
  t = 0; la.say('Hello there'); const second = lb.sayAt('Hi')
  const [ua, ub] = spoken
  t = 0.1; ua.onstart(); t = 0.4; ua.onend()    // A finished early
  const third = la.sayAt('Again')
  say(Math.abs(second.start - 0.8) < 1e-9 && Math.abs(third.start - 1.2) < 1e-9, 'queue', 'a line waits for the line queued before it (B for A\'s estimate, A\'s next for B\'s)', [second, third])
  const solo2 = make(), s2 = solo2.speaker()
  t = 0; s2.say('Hello there')
  const u2 = spoken[spoken.length - 1]
  t = 0.1; u2.onstart(); t = 0.4; u2.onend()
  const early = s2.sayAt('Again')
  say(early.start === 0, 'queue', 'when the browser says the last line ended the queue is free from then, not from the estimate', early)
  t = 0.4; ub.onstart()
  say(lb.speaking() === true && la.speaking() === false, 'queue', 'the next speaker is speaking from when the browser says its speech began', [la.speaking(), lb.speaking()])

  // plain say() is as it was
  spoken.length = 0
  const solo = make(), sp1 = solo.speaker({ voice: 'deep' })
  t = 0; sp1.say('A line of four words')   // 1.6 s
  const p1 = solo.sayAt('Plain')
  const dur = solo.say('Plain too')
  say(p1.start === 0 && p1.end === 0.8 && dur === 0.8 && spoken[1].pitch === 1 && spoken[1].rate === 1 && spoken[1].voice.name === 'Samantha', 'plain', 'say() with no speaker is not queued, starts at once, gives back the duration and sets no pitch or rate', [p1, dur, spoken[1]])
  say(solo.voiceLevel() >= 0 && typeof solo.speaking() === 'boolean', 'plain', 'voiceLevel() and speaking() with no argument still mean the last or any speaker', null)

  // a host's line: the queue puts its audio at the line's turn, and the request carries pitch and rate
  const asked = [], played = []
  const host = { lookup: (r) => { asked.push(r); return r.text === 'Sure' ? { key: 'k', file: 'voice/k.wav', duration: 2, provider: 'fake', voice: 'calm', lang: 'en' } : null }, note: (r) => asked.push(['note', r.text, r.speaker]), speakDraft: () => {} }
  const sound = { loadSample: () => ({ play: (...a) => played.push(a) }), soundTime: () => 5 }
  const h = make({ host: () => host, sound: () => sound })
  const h1 = h.speaker({ voice: 'deep', pitch: 0.5, name: 'Dan' }), h2 = h.speaker({ voice: 'calm' })
  t = 0; h2.say('Sure'); const hs = h1.sayAt('Sure')
  const looked = asked.filter((x) => !Array.isArray(x))
  say(looked[0].voice === 'calm' && !('pitch' in looked[0]) && looked[1].voice === 'deep' && looked[1].pitch === 0.5 && !('rate' in looked[1]), 'host', 'the host is looked up with the speaker\'s voice, and with pitch and rate when they are not the normal ones', looked)
  say(played.length === 2 && played[0][1].after === undefined && Math.abs(played[1][1].after - 2) < 1e-9 && Math.abs(hs.start - 2) < 1e-9 && h.plays[1].at === 7, 'host', 'a generated line waits its turn: the second plays 2 seconds on (the first one\'s duration), at the sound clock plus that', [played, hs, h.plays])
  say(asked.some((x) => x[0] === 'note' && x[2] === 'Dan'), 'host', 'the host is told which named speaker said a line', asked.filter(Array.isArray))
  t = 0.5
  say(h2.speaking() === true && h1.speaking() === false, 'host', 'a generated line\'s speaker is speaking during its own time only', [h2.speaking(), h1.speaking()])
  t = 2.5
  say(h2.speaking() === false && h1.speaking() === true, 'host', 'and the next speaker from when the first one\'s file ends', [h2.speaking(), h1.speaking()])

  // mouth(): only the speaker's own opens
  const calls = []
  const ctx = { save() {}, restore() {}, beginPath() {}, ellipse(...a) { calls.push(a) }, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, rect() {} }
  const m = make({ ctx: () => ctx, size: () => [320, 180] })
  const ma = m.speaker({ name: 'A' }), mb = m.speaker({ name: 'B' })
  t = 0; ma.say('Hello there'); mb.say('And me too')
  const opened = { a: 0, b: 0 }
  for (let f = 0; f < 40; f++) { t = f / 60; opened.a = Math.max(opened.a, m.mouth(50, 50, { speaker: ma })); opened.b = Math.max(opened.b, m.mouth(150, 50, { speaker: mb })) }
  say(opened.a > 0.3 && opened.b === 0, 'mouth', 'mouth(x, y, { speaker }) opens only while that speaker\'s line plays', opened)
  let mouthBad = ''
  try { m.mouth(1, 2, { speaker: { not: 'one' } }) } catch (e) { mouthBad = e.message }
  say(/made with speaker\(\)/.test(mouthBad), 'mouth', 'a mouth for something that is not a speaker says what is wrong', mouthBad)
}


// --- casting: qualified ids, like, fallback, a host that resolves --------------------------------------------------------

{
  const V = [
    { name: 'Amelie', lang: 'fr-CA', voiceURI: 'a' },
    { name: 'Samantha', lang: 'en-US', voiceURI: 's' },
    { name: 'Daniel', lang: 'en-GB', voiceURI: 'd', default: true },
    { name: 'Karen', lang: 'en-AU', voiceURI: 'k' },
  ]
  const sp = (o) => ({ lang: 'en', fallback: [], ...o })
  const cast = (o) => castVoice(sp(o), V)
  const names = (o) => { const c = cast(o); return [c.voice?.name, c.exact] }
  say(same(names({ voice: 'system:Samantha' }), ['Samantha', true]) && same(names({ voice: 'Samantha' }), ['Samantha', true]) && same(names({ voice: 'system:samantha' }), ['Samantha', true]), 'casting', 'system:Samantha and a bare Samantha are the same device voice, whatever the case', null)
  say(same(names({ voice: 'kokoro:af_heart' }), ['Daniel', true]) === false && cast({ voice: 'kokoro:af_heart' }).exact === false && cast({ voice: 'kokoro:af_heart' }).voice?.name === 'Daniel', 'casting', 'a voice of a provider the device does not have is not exact, and the default voice stands in', cast({ voice: 'kokoro:af_heart' }))
  say(same(names({ voice: 'kokoro:af_heart', fallback: ['hq:nova', 'system:Karen', 'system:Samantha'] }), ['Karen', false]), 'casting', 'fallback is tried in order (a provider that is not here is skipped) and the stand-in is not exact', names({ voice: 'kokoro:af_heart', fallback: ['hq:nova', 'system:Karen'] }))
  say(cast({ voice: 'kokoro:x', fallback: ['preset:deep'] }).pitch === voicePresets.deep.pitch && cast({ voice: 'kokoro:x', fallback: ['high'] }).voice.name === 'Samantha' && cast({ voice: 'draft:' }).voice.name === 'Daniel', 'casting', 'a preset (with or without "preset:") always resolves, and draft: is the default voice', null)
  say(cast({ like: { gender: 'female' } }).voice.name !== 'Daniel' && ['Samantha', 'Karen'].includes(cast({ like: { gender: 'female' } }).voice.name) && cast({ like: { gender: 'male' } }).voice.name === 'Daniel', 'casting', 'like: gender picks a female or a male voice for the language, with no voice named', [cast({ like: { gender: 'female' } }).voice.name, cast({ like: { gender: 'male' } }).voice.name])
  say(cast({ like: { gender: 'female' }, lang: 'fr' }).voice.name === 'Amelie' && cast({ voice: 'Amelie' }).voice.name === 'Amelie', 'casting', 'the language comes first: a French speaker is cast on the French voice', cast({ like: { gender: 'female' }, lang: 'fr' }).voice?.name)
  say(cast({ like: { age: 'child' } }).pitch > 1 && cast({ like: { pitch: 1.4, rate: 0.9 } }).pitch === 1.4 && cast({ like: { rate: 0.9 } }).rate === 0.9 && cast({}).exact === true, 'casting', 'like: age and pitch and rate shape the voice (a child is higher), and a speaker that names no voice has nothing to miss', null)
  say(castVoice(sp({ voice: 'draft:' }), []).voice === undefined, 'casting', 'a device with no voices still casts (no voice, the device picks)', null)

  // The speaker's own settings, and the utterance a described speaker gets
  let t = 0
  const spoken = []
  class Utterance { constructor(text) { this.text = text; this.pitch = 1; this.rate = 1 } }
  const synth = { speak: (u) => spoken.push(u), cancel() {}, getVoices: () => V }
  const mk = (o = {}) => createSay({ speech: () => synth, Utterance, clock: () => t, warn() {}, code: '', ...o })
  const talk = mk()
  const kid = talk.speaker({ voice: 'kokoro:af_heart', like: { gender: 'female', age: 'child' }, fallback: ['system:Karen'], name: 'Kid' })
  kid.say('Hello')
  say(spoken[0].voice.name === 'Karen' && spoken[0].pitch > 1, 'casting', 'the draft voice casts a speaker along its fallback and its like (Karen, higher for a child)', [spoken[0].voice?.name, spoken[0].pitch])
  const asked = talk.asked[0]
  say(asked.resolved === 'Karen' && asked.exact === false && asked.voice === 'kokoro:af_heart' && asked.speaker === 'Kid', 'casting', 'the asked entry has the resolved voice and exact', asked)
  const own = talk.speaker({ voice: 'system:Samantha', name: 'Own' })
  own.say('Hi')
  say(talk.asked[1].resolved === 'Samantha' && talk.asked[1].exact === true, 'casting', 'and exact: true when the speaker\'s own voice is found', talk.asked[1])
  const bad = [() => talk.speaker({ like: 3 }), () => talk.speaker({ like: { mood: 'x' } }), () => talk.speaker({ like: { pitch: -1 } }), () => talk.speaker({ fallback: 'high' })].map((f) => { try { f(); return '' } catch (e) { return e.message } })
  say(bad.every(Boolean) && /describes a voice/.test(bad[0]) && /gender, age, pitch and rate/.test(bad[1]) && /above 0/.test(bad[2]) && /list of voices/.test(bad[3]), 'casting', 'a like or fallback that is wrong says what is wrong', bad)

  // A host that casts
  const seen = [], looked = []
  const host = { resolveVoice: (spec) => { seen.push(spec); return { voice: 'kokoro:af_sky', exact: false, note: 'af_heart is not in this set' } }, lookup: (r) => { looked.push(r); return null }, note() {} }
  const h = mk({ host: () => host })
  const hs = h.speaker({ voice: 'kokoro:af_heart', like: { gender: 'female' }, fallback: ['system:Karen'], name: 'Al' })
  hs.say('Hello there')
  say(seen[0].voice === 'kokoro:af_heart' && seen[0].like.gender === 'female' && same(seen[0].fallback, ['system:Karen']) && seen[0].name === 'Al' && seen[0].lang === 'en', 'casting', 'resolveVoice is given the speaker\'s spec', seen[0])
  say(looked[0].voice === 'kokoro:af_sky' && h.asked[0].resolved === 'kokoro:af_sky' && h.asked[0].exact === false && h.asked[0].castNote === 'af_heart is not in this set', 'casting', 'lookup gets the resolved voice, and note gets resolved, exact and the host\'s note', [looked[0], h.asked[0]])
  const plainHost = mk({ host: () => ({ lookup: () => null, note() {} }) }).speaker({ voice: 'deep' })
  say(typeof plainHost.say === 'function', 'casting', 'a host with no resolveVoice is fine', null)
  const boom = mk({ host: () => ({ resolveVoice() { throw new Error('boom') }, lookup: () => null, note() {} }), warn: () => {} }).speaker({ voice: 'deep' })
  say(boom.say('x') === 0.8, 'casting', 'a resolveVoice that fails falls back to the device\'s casting', null)
}

/** The level of a generated voice, line by line through the real stepped sound: [[speaking, level], ...] a frame at a time. */
async function generated(wavFile, seconds, { frames = 150, at = 6, shape = false } = {}) {
  let vt = 0
  const files = { 'voice/known.wav': wavFile }
  const sound = createSound({ stepped: { fps: 60 }, share: false, clock: () => vt, read: async (p) => files[p] })
  sound.makeSynth()
  await null
  const host = { lookup: () => ({ key: 'known', file: 'voice/known.wav', duration: seconds, provider: 'fake', voice: 'calm', lang: 'en' }), note() {} }
  const talk = createSay({ host: () => host, sound: () => sound, recorded: true, clock: () => vt, warn() {}, code: '' })
  const out = []
  for (let f = 0; f < frames; f++) {
    vt = f / 60
    await sound.player.stepped.advance(vt)
    if (f === at) talk.say('A line of speech')
    out.push(shape ? [talk.speaking(), talk.voiceLevel(), talk.voiceShape().width] : [talk.speaking(), talk.voiceLevel()])
  }
  sound.close()
  return out
}
{
  // One second of a tone that is quiet for the first half and twice as loud for the second.
  const known = loud(1, (s) => (s < 0.5 ? 0.1 : 0.2))
  const first = await generated(known, 1)
  const again = await generated(known, 1)
  const lv = first.map((x) => x[1])
  const near = (frame) => lv[Math.round(6 + frame * 60)]
  say(same(first, again), 'node-stepped', 'a generated voice gives the same speaking and level on every frame in two runs (the real amplitude of its audio at the frame\'s time)', first.length)
  say(lv.slice(0, 7).every((v) => v === 0) && first[7][0] === true && first[6 + 29][0] === true && first[6 + 60 + 2][0] === false, 'node-stepped', 'it is silent before say(), speaking from the frame it is said in, and not after the file\'s duration', first.slice(5, 9))
  const quietHalf = near(0.4), loudHalf = near(0.9)
  say(quietHalf > 0.15 && quietHalf < 0.5 && Math.abs(loudHalf / quietHalf - 2) < 0.15, 'node-stepped', 'its level follows the audio\'s amplitude: the half that is twice as loud has twice the level', [quietHalf, loudHalf])
  say(lv[lv.length - 1] === 0 && lv.slice(6 + 60 + 30).every((v) => v === 0), 'node-stepped', 'and ends at exactly 0 after the audio does', lv.slice(-3))
  // A low tone and a high one at the same loudness: the wave crosses zero rarely or often, so round or spread.
  const tones = loud(1, () => 0.2, 48000, (i) => (i < 24000 ? Math.cos(i / 20) : Math.cos(i / 4)))
  const tone = await generated(tones, 1, { shape: true })
  const low = tone[6 + 20][2], high = tone[6 + 50][2]
  say(low < 0.3 && high > 0.7 && tone[6 + 50][1] > 0.1, 'node-stepped', 'a recording\'s shape follows its sound: a low tone (the wave crosses zero rarely) is round and a high one is spread, at the same loudness', [low, high])
  const hush = await generated(loud(1, () => 0), 1)
  say(hush[6 + 30][0] === true && hush.every((x) => x[1] === 0), 'node-stepped', 'a silent recording is speaking but its level stays 0 (a recording\'s level is its audio, never made up)', hush.slice(36, 38))
}

// --- the real stepped player, in Node ---------------------------------------------------------------------------

{
  let vt = 0
  const files = { 'voice/abcdef0123456789.wav': FILES['/voice/abcdef0123456789.wav'] }
  const sound = createSound({ stepped: { fps: 60 }, share: false, clock: () => vt, read: async (p) => files[p] })
  sound.makeSynth()
  await null
  const stepped = sound.player.stepped
  const warnings = []
  const noted = []
  const host = { lookup: (r) => (r.text === 'Hello there' ? LINE : null), note: (r) => noted.push(r) }
  const talk = createSay({ host: () => host, sound: () => sound, recorded: true, warn: (w) => warnings.push(w), code: 'say("Hello there")' })
  for (const [frame, at] of [[0, 0], [37, 37]]) {
    vt = at / 60
    await stepped.advance(vt)
    if (frame === 37) {
      const dur = talk.say('Hello there')
      say(dur === 0.5, 'node-stepped', 'the line gives back its entry\'s duration', dur)
      talk.say('Nobody made this one')
    }
  }
  vt = 2
  await stepped.advance(2)
  const out = stepped.take()
  const want = Math.round(37 * 48000 / 60)
  let first = -1, last = -1, peak = 0
  for (let i = 0; i < out.length; i++) { const a = Math.abs(out.left[i]); if (a > 1e-4) { if (first < 0) first = i; last = i } if (a > peak) peak = a }
  say(first === want, 'node-stepped', `a line said in frame 37 (sample ${want}) begins on exactly that sample`, [first, want])
  const ends = want + 24000
  say(last >= ends - 2 && last < ends + 1500 && peak > 0.1, 'node-stepped', `and plays its whole file (${24000} samples, one 0.5 second tone, ending near sample ${ends}, loud enough to be a voice)`, [last, ends, peak])
  say(warnings.length === 1 && /Nobody made this one/.test(warnings[0]) && talk.unresolved.length === 1 && noted.length === 2, 'node-stepped', 'the line with no audio is reported, kept as unresolved and told to the host, and puts nothing in the recording', [warnings, noted.length])
  sound.close()
}

// --- scenes in real browsers ---------------------------------------------------------------------------------------

const from = process.env.PLAYWRIGHT || 'playwright'
const playwright = await import(from.startsWith('/') ? pathToFileURL(join(from, 'index.mjs')).href : from)

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' }
const PAGE = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><div id="s" style="width:320px;height:180px"></div>'
const requested = []
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  requested.push(path)
  try {
    if (path === '/test.html') return res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE)
    if (FILES[path]) return res.writeHead(200, { 'content-type': 'audio/wav', 'cache-control': 'no-store' }).end(FILES[path])
    const body = await readFile(join(ROOT, path))
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body)
  } catch (e) { res.writeHead(404).end('not found') }
})
await new Promise((done) => server.listen(0, done))
const at = `http://localhost:${server.address().port}`

// The browser's speech is replaced before anything runs: it writes down what it was asked for and makes no sound.
const FAKE_SPEECH = `(() => {
  window.__spoken = []
  window.__spokenAll = []
  class U { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.pitch = 1; this.rate = 1 } }
  window.SpeechSynthesisUtterance = U
  const fake = { speak: (u) => { window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name }); window.__spokenAll.push({ text: u.text, pitch: u.pitch, rate: u.rate }) }, cancel() { window.__spoken.cancelled = (window.__spoken.cancelled || 0) + 1 }, getVoices: () => [{ name: 'Fake', lang: 'en-US', voiceURI: 'f', default: true }] }
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fake })
})()`

const KID = 'window.got = say("Hello")\nfunction draw() { background("navy") }\n'
const TALKING = `let n = 0
window.durations = []
function draw() {
  background("navy")
  if (n === 5) window.durations.push(say("Half of the width is the middle.", { voice: "calm" }), say("Hello"), say("Typed " + n))
  n++
}
`
const STEPPED = `let n = 0
window.durations = []
function draw() {
  background("black")
  if (n === 37) window.durations.push(say("Hello there"), say("Nobody made this one"))
  n++
}
`

/** In the page: a host with one line (made by window.__makeHost), and the scene run for a few frames (live) or stepped. */
const HOST = `window.__makeHost = () => {
  window.noted = []
  window.lookups = []
  return {
    lookup: (r) => { window.lookups.push(r.text); return r.text === 'Half of the width is the middle.' || r.text === 'Hello there' ? { key: 'abcdef0123456789', file: 'voice/abcdef0123456789.wav', duration: 0.5, provider: 'fake', voice: 'calm', lang: 'en' } : null },
    note: (r) => window.noted.push(r),
    speakDraft: (r) => window.__spoken.push({ text: r.text, by: 'host' }),
  }
}`
/** The two_faces example: a click, and what was said, in what voice, and what the faces drew. */
const faces = async ({ source }) => {
  const errors = []
  const { runScene } = await import('/pictures.js')
  const scene = runScene(document.getElementById('s'), { source, name: 'two_faces.js', onError: (m) => errors.push(m) })
  await scene.ready
  const canvas = document.querySelector('#s canvas')
  const box = canvas.getBoundingClientRect()
  canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + 50, clientY: box.top + 50, bubbles: true, pointerId: 1, button: 0, buttons: 1 }))
  await new Promise((done) => setTimeout(done, 400))
  const out = { errors, spoken: window.__spokenAll.slice() }
  scene.stop()
  return out
}
const live = async ({ source, how }) => {
  const errors = []
  const { runScene } = await import('/pictures.js')
  const h = window.__makeHost()
  if (how === 'global') window.pictureHost = { voice: h }
  const scene = runScene(document.getElementById('s'), { source, name: 'talk.js', ...(how === 'option' ? { voice: h } : {}), onError: (m) => errors.push(m) })
  await scene.ready
  await new Promise((done) => setTimeout(done, 400))
  const out = { errors, got: window.got, durations: window.durations, spoken: window.__spoken.slice(), noted: window.noted, lookups: window.lookups, kind: scene.sound && scene.sound.kind, sound: !!scene.sound }
  scene.stop()
  out.cancelled = window.__spoken.cancelled || 0
  return out
}
/** Live for `ms`: the scene writes what it sees of the voice into window.trace and the mouth's pixels into window.pix. */
const liveFor = async ({ source, ms }) => {
  const errors = []
  const { runScene } = await import('/pictures.js')
  const scene = runScene(document.getElementById('s'), { source, name: 'face.js', onError: (m) => errors.push(m) })
  await scene.ready
  await new Promise((done) => setTimeout(done, ms))
  const out = { errors, trace: window.trace, pix: window.pix, spoken: window.__spoken.slice() }
  scene.stop()
  return out
}
/** Stepped: a clock the test moves, the way test-stepped.mjs does; the samples of every frame are joined. */
const record = async ({ source, fps, frames, how }) => {
  let clock = 0, waiting = []
  window.requestAnimationFrame = (fn) => { waiting.push(fn); return waiting.length }
  window.cancelAnimationFrame = () => {}
  performance.now = () => clock
  const { runScene } = await import('/pictures.js')
  const errors = [], warned = []
  const warn = console.warn
  console.warn = (...a) => { warned.push(a.join(' ')) }
  const h = window.__makeHost()
  const scene = runScene(document.getElementById('s'), { source, name: 'stepped.js', stepped: { fps }, voice: h, onError: (m) => errors.push(m) })
  await scene.ready
  const player = scene.sound
  const parts = []
  for (let f = 0; f < frames; f++) {
    clock = f * 1000 / fps
    await player.stepped.advance(clock / 1000)
    parts.push(player.stepped.take())
    for (const fn of waiting.splice(0)) fn(clock)
    await new Promise((done) => setTimeout(done, 0))
  }
  await player.stepped.advance(frames / fps)
  parts.push(player.stepped.take())
  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const left = new Float32Array(total)
  let pos = 0
  for (const p of parts) { left.set(p.left, pos); pos += p.length }
  let first = -1, last = -1, peak = 0
  for (let i = 0; i < total; i++) { const a = Math.abs(left[i]); if (a > 1e-4) { if (first < 0) first = i; last = i } if (a > peak) peak = a }
  console.warn = warn
  const out = { kind: player.kind, first, last, peak, total, durations: window.durations, levels: window.levels, pix: window.pix, warned, noted: window.noted, spoken: window.__spoken.slice(), errors }
  scene.stop()
  return out
}

/** A face with a mouth: each frame it writes whether it is speaking, the voice's level, and how much of the mouth's box is dark. */
const FACE = (when, extra = '') => `let n = 0
window.trace = []
window.pix = []
window.levels = []
function draw() {
  background("white")
  ${when}
  const level = voiceLevel()
  mouth(100, 60, { size: 80, color: "black"${extra} })
  const c = document.querySelector("canvas"), k = c.getContext("2d"), r = c.width / width
  const d = k.getImageData(40 * r, 20 * r, 120 * r, 80 * r).data
  let dark = 0
  for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++
  window.trace.push([speaking(), level])
  window.levels.push(level)
  window.pix.push(dark)
  n++
}
`
const TALKS = FACE('if (n === 3) say("Hello there my friend")')
const TALKS_STEPPED = FACE('if (n === 37) say("Hello there")')

for (const name of ['chromium', 'webkit']) {
  let browser
  try { browser = await quietly(playwright[name], name) } catch { console.log(`${name}: not installed, skipped`); continue }
  const context = await browser.newContext({ viewport: { width: 400, height: 300 } })
  await context.addInitScript(FAKE_SPEECH)
  await context.addInitScript(HOST)
  const open = async () => { const page = await context.newPage(); await page.goto(`${at}/test.html`); return page }

  // The first toy: nothing set up.
  requested.length = 0
  let page = await open()
  let r = await page.evaluate(live, { source: KID, how: 'none' })
  say(!r.errors.length && r.got === 0.8 && same(r.spoken, [{ text: 'Hello', lang: 'en', voice: 'Fake' }]), name, 'say("Hello") with nothing set up speaks in the on-device voice and gives back 0.8', r)
  say(!r.sound && !requested.some((p) => p.startsWith('/sound/')) && !requested.some((p) => p.endsWith('.wav')), name, 'and loads no sound library, fetches no file and asks for no network voice', requested.filter((p) => p !== '/test.html'))
  say(r.cancelled === 1, name, 'stopping the scene stops the speech', r.cancelled)
  await page.close()

  // The docs' own programs run: the first says Hello, the waiting one starts with it and has no mistake.
  const blocks = [...(await readFile(join(ROOT, 'docs', 'say.md'), 'utf8')).matchAll(/```js\n(.*?)```/gs)].map((m) => m[1]).filter((code) => !code.includes('lookup('))
  page = await open()
  r = await page.evaluate(live, { source: blocks[0], how: 'none' })
  say(!r.errors.length && r.spoken[0]?.text === 'Hello', name, 'the first program in docs/say.md says Hello', r)
  await page.close()
  const waits = blocks.find((code) => code.includes('sleep(say('))
  page = await open()
  r = await page.evaluate(live, { source: waits, how: 'none' })
  say(!r.errors.length && r.spoken.length >= 1 && r.spoken[0].text === 'Hello', name, 'and so does the one that waits for each line (it speaks the first line and has no mistake)', r)
  await page.close()

  // The talking face, with nothing set up: the draft voice's made-up mouth.
  page = await open()
  r = await page.evaluate(liveFor, { source: TALKS, ms: 2600 })
  {
    const frames = r.trace.length, said = r.trace.map((x) => x[0]), lv = r.trace.map((x) => x[1])
    const top = Math.max(...lv), at = lv.indexOf(top)
    say(!r.errors.length && same(r.spoken.map((x) => x.text), ['Hello there my friend']) && frames > 60, name, 'a scene with a face and one say() has no mistake, speaks, and draws a mouth every frame', [r.errors, r.spoken, frames])
    say(said.slice(0, 3).every((x) => !x) && lv.slice(0, 3).every((x) => x === 0) && said.some(Boolean) && top > 0.3 && !said[frames - 1] && lv[frames - 1] === 0, name, 'speaking() and voiceLevel() are false and 0 before say(), rise while the line is said, and are false and 0 again when it is over', [top, said[frames - 1], lv[frames - 1]])
    const quietPix = r.pix[0], openPix = r.pix[at]
    say(quietPix > 0 && openPix > quietPix * 2, name, 'the mouth is a line while quiet (some dark pixels) and opens wide with the voice (more than twice as many)', [quietPix, openPix])
    say(r.pix[frames - 1] === quietPix, name, 'and closes again to the same line', [r.pix[frames - 1], quietPix])
  }
  await page.close()

  // The mouth by itself: each style differs between level 0 and loud, the default size follows the smaller side, a bad style is said.
  page = await open()
  const m = await page.evaluate(async () => {
    const { drawMouth, mouthStyles } = await import('/voice/say.js')
    const make = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'); k.fillStyle = 'white'; k.fillRect(0, 0, w, h); return [c, k] }
    const ink = (k, w, h) => { const d = k.getImageData(0, 0, w, h).data; let dark = 0, x0 = w, x1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4] < 128) { dark++; x0 = Math.min(x0, x); x1 = Math.max(x1, x) } return { dark, wide: x1 - x0 + 1 } }
    const out = { styles: {} }
    for (const style of mouthStyles) {
      const rows = []
      for (const level of [0, 0.5, 1]) { const [, k] = make(200, 120); drawMouth(k, 100, 40, { size: 100, style, level, color: 'black' }); rows.push(ink(k, 200, 120).dark) }
      const [, red] = make(200, 120); drawMouth(red, 100, 40, { size: 100, style, level: 1, color: 'rgb(255,0,0)' })
      const px = red.getImageData(0, 0, 200, 120).data
      let redSeen = false
      for (let i = 0; i < px.length; i += 4) if (px[i] > 200 && px[i + 1] < 60) redSeen = true
      out.styles[style] = { rows, redSeen }
    }
    const [, tall] = make(360, 640); drawMouth(tall, 180, 300, { level: 0, area: [360, 640] })
    const [, wideScreen] = make(1280, 720); drawMouth(wideScreen, 640, 300, { level: 0, area: [1280, 720] })
    out.tall = ink(tall, 360, 640).wide
    out.wideScreen = ink(wideScreen, 1280, 720).wide
    const [, bad] = make(50, 50)
    try { drawMouth(bad, 10, 10, { style: 'round' }) } catch (e) { out.bad = e.message }
    // The canvas's own settings come back.
    const [, set] = make(50, 50); set.fillStyle = '#123456'; set.lineWidth = 7
    drawMouth(set, 25, 25, { level: 1, style: 'smile' })
    out.kept = [set.fillStyle, set.lineWidth]
    const [, round] = make(200, 120); drawMouth(round, 100, 40, { size: 100, level: 0.6, width: 0 })
    const [, spread] = make(200, 120); drawMouth(spread, 100, 40, { size: 100, level: 0.6, width: 1 })
    out.shape = [ink(round, 200, 120), ink(spread, 200, 120)]
    return out
  })
  for (const style of mouthStyles) {
    const { rows, redSeen } = m.styles[style]
    say(rows[0] > 0 && rows[1] > rows[0] && rows[2] > rows[1] && redSeen, name, `the ${style} mouth draws a closed line at level 0, more at 0.5 and more again at 1, in the colour it was given`, m.styles[style])
  }
  say(m.tall > 0 && Math.abs(m.wideScreen / m.tall - 720 / 360) < 0.15, name, 'with no size a mouth is a share of the smaller side of the scene: twice as wide on a 720 high video as on a 360 wide phone', [m.tall, m.wideScreen])
  say(m.shape[0].wide < m.shape[1].wide - 15, name, 'the oval mouth uses the shape: a round one (width 0) is narrower than a spread one (width 1) at the same level', m.shape)
  say(/"oval", "smile", "robot"/.test(m.bad) && same(m.kept, ['#123456', 7]), name, 'a style that is not one is said, and the canvas\'s own colour and line width are put back', [m.bad, m.kept])
  await page.close()

  // The same face, recorded a frame at a time with a generated voice: the level is the audio\'s, the same in two recordings.
  const runs = []
  for (const again of [0, 1]) {
    page = await open()
    runs.push(await page.evaluate(record, { source: TALKS_STEPPED, fps: 60, frames: 120 }))
    await page.close()
  }
  {
    const [one, two] = runs
    const lv = one.levels, top = Math.max(...lv), at = lv.indexOf(top)
    // (test_say.py in Pyctures pins the same numbers for the same line said in a Python scene: the two spellings give the same level.)
    say(same(one.levels.slice(36, 46).map((v) => +v.toFixed(4)), [0, 0, 0.6708, 0.8916, 0.9643, 0.9883, 0.9961, 0.9987, 0.9996, 0.9999]), name, 'the level of frames 36 to 45, the line said in frame 37, is the pinned list that Pyctures\' test gets for the same line in Python', one.levels.slice(36, 46))
    say(!one.errors.length && same(one.levels, two.levels) && same(one.pix, two.pix), name, 'recorded with a generated voice, two recordings give the same level and the same mouth in every frame', one.errors)
    say(lv.slice(0, 38).every((v) => v === 0) && top > 0.5 && at >= 38 && at < 37 + 36 && lv[lv.length - 1] === 0, name, 'it is 0 until the frame the line is said in (37), rises with the audio of the WAV (a loud tone), and is 0 again after it ends', [top, at, lv[lv.length - 1]])
    say(one.pix[0] > 0 && one.pix[at] > one.pix[0] * 2 && one.pix[119] === one.pix[0], name, 'and the mouth drawn in that frame is open the same way', [one.pix[0], one.pix[at], one.pix[119]])
  }

  // Every program in the docs runs (the ones that need a host are in the sections above).
  for (const code of blocks.filter((c) => !c.includes('runScene('))) {
    page = await open()
    r = await page.evaluate(live, { source: code, how: 'none' })
    say(!r.errors.length, name, `docs/say.md: ${JSON.stringify(code.split('\n').find((l) => l.trim() && !l.startsWith('//')))} runs`, r.errors)
    await page.close()
  }

  // A host, given to runScene.
  requested.length = 0
  page = await open()
  r = await page.evaluate(live, { source: TALKING, how: 'option' })
  say(!r.errors.length && same(r.durations, [0.5, 0.8, 0.8]), name, 'with a host, a line it has is timed from the entry (0.5) and the others by the estimate (0.8)', r.durations)
  say(same(r.noted.map((a) => [a.text, a.voice ?? null, a.lang, a.source]), [['Half of the width is the middle.', 'calm', 'en', 'literal'], ['Hello', null, 'en', 'literal'], ['Typed 5', null, 'en', 'runtime']]), name, 'the host is told of all three, and which were written out and which made while it runs', r.noted)
  say(same(r.spoken, [{ text: 'Hello', by: 'host' }, { text: 'Typed 5', by: 'host' }]) && requested.some((p) => p.startsWith('/sound/')) && (name !== 'webkit' || requested.some((p) => p === '/voice/abcdef0123456789.wav')), name, 'the host speaks the draft lines in its own way, and the line it has goes to the sound library (WebKit: and is fetched as the audio file; headless Chromium never starts its sound)', [r.spoken, requested.filter((p) => p !== '/test.html' && !p.startsWith('/sound/'))])
  await page.close()

  // The page-wide hook.
  page = await open()
  r = await page.evaluate(live, { source: TALKING, how: 'global' })
  say(same(r.durations, [0.5, 0.8, 0.8]) && r.noted.length === 3, name, 'window.pictureHost.voice is used when runScene is given no host', r)
  await page.close()

  // The two_faces example: seven lines, said in turn, the low face's and the high face's.
  page = await open()
  r = await page.evaluate(faces, { source: await readFile(join(ROOT, 'examples', 'two_faces.js'), 'utf8') })
  say(!r.errors.length && r.spoken.length === 7 && r.spoken[0].text.startsWith('Hello Pip') && r.spoken[6].text.startsWith('Great!'), name, 'examples/two_faces.js: a click gives the seven lines, in order, with no error', r)
  say(r.spoken.every((u, i) => (i % 2 === 0 ? u.pitch < 1 : u.pitch > 1)), name, 'the first face (every other line) speaks low and the second high', r.spoken.map((u) => u.pitch))
  await page.close()

  // Recorded a frame at a time: the entry's file on the exact sample.
  page = await open()
  r = await page.evaluate(record, { source: STEPPED, fps: 60, frames: 90 })
  const want = Math.round(37 * 48000 / 60)
  say(r.kind === 'stepped' && !r.errors.length && same(r.durations, [0.5, 1.6]), name, 'a stepped scene is timed from the entry and the estimate in the same way', r)
  say(r.first === want && r.last >= want + 24000 - 2 && r.last < want + 24000 + 1500 && r.peak > 0.1, name, `the entry's WAV begins on exactly sample ${want} (frame 37 at 60 frames a second) through the stepped sound, and plays its whole 24000 samples`, [r.first, r.last, r.peak])
  say(r.warned.length === 1 && /Nobody made this one/.test(r.warned[0]) && /cannot be recorded/.test(r.warned[0]) && !r.spoken.length, name, 'the line with no audio gets one clear warning, and no speech (the draft voice cannot be recorded)', [r.warned, r.spoken])
  say(same(r.noted.map((a) => a.text), ['Hello there', 'Nobody made this one']), name, 'and both lines are in the host\'s asked list', r.noted)
  await page.close()

  await browser.close()
}

// --- what a scene is given, and what a build carries ------------------------------------------------------------

say(sceneUses('say("Hello")').voice === true && sceneUses('say("Hello")').sound === false && sceneUses('say("Hello")').dials === false, 'node', 'a scene that calls say() is given voice/say.js and nothing else', sceneUses('say("Hello")'))
const own = ['function say(w) {}\nsay("x")', 'const say = (w) => w\nsay("x")', 'const words = "say(x)"\n// say("Hello")'].map((t) => sceneUses(t).voice)
say(same(own, [false, false, false]), 'node', 'a scene that makes a say of its own keeps it, and the word in a comment or a string is not a call', own)
{
  const work = await mkdtemp(join(tmpdir(), 'pictures-say-'))
  try {
    await mkdir(join(work, 'src'))
    await writeFile(join(work, 'src', 'talk.js'), 'say("Hello")\n')
    await writeFile(join(work, 'src', 'plain.js'), 'background("navy")\n')
    for (const f of ['talk', 'plain']) execFileSync(process.execPath, [join(ROOT, 'bin', 'pictures.mjs'), 'build', join(work, 'src', `${f}.js`), '-o', join(work, f)], { stdio: 'pipe' })
    const got = [existsSync(join(work, 'talk/pictures/voice/say.js')), existsSync(join(work, 'talk/pictures/sound')), existsSync(join(work, 'plain/pictures/voice'))]
    say(same(got, [true, false, false]), 'node', 'pictures build copies voice/ for a scene that calls say() (and no sound library), and not for one that does not', got)
  } catch (e) {
    say(false, 'node', 'pictures build runs', String(e.stderr || e.message))
  } finally { await rm(work, { recursive: true, force: true }) }
}

server.close()
process.exit(failed ? 1 : 0)
