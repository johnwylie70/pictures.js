#!/usr/bin/env node
/**
 * Brings the sibling libraries into this package, and keeps the names a scene is given in step with them:
 *
 *   sound/       synths.js, its MIDI (synths-midi.js), its audio worklet's file, the engine (synths_core.wasm) and its LICENSE, from ../synths.js
 *   dials/       dials.js (the on-screen controls) and its LICENSE, from ../dials.js
 *   notation/    notation.js (sheet music), its LICENSE and the licence of the music symbols' outlines (LICENSE-GLYPHS), from ../notation.js
 *   pictures.js  the lists between the SOUND_NAMES, DIAL_NAMES and NOTATION_NAMES marks: every function the vendored copy gives
 *                a scene, read out of the copy itself, so a function a sibling gains is a scene's the next time this runs
 *
 *   node scripts/sync-siblings.mjs            copy both, as they were last committed there, and write the lists
 *   node scripts/sync-siblings.mjs --working  copy the files as they are on disk, committed or not
 *   node scripts/sync-siblings.mjs --keep     do not copy; write the lists from the copies already here
 *   node scripts/sync-siblings.mjs --check    change nothing; end with code 1 if anything is out of step
 *
 * The copies are committed, so the package works with neither sibling beside it. Nothing in them is changed here.
 * A name a sibling gives that pictures.js already uses for something else (`text`, `load`) is left out and said.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')
const keep = check || process.argv.includes('--keep')

// What is copied: [the sibling's folder, the folder here, its files].
const COPIES = [
  ['synths.js', 'sound', ['synths.js', 'synths-midi.js', 'synths-worklet.js', 'synths_core.wasm', 'LICENSE']],
  ['dials.js', 'dials', ['dials.js', 'LICENSE']],
  ['notation.js', 'notation', ['notation.js', 'LICENSE', 'LICENSE-GLYPHS']],
]
// What createSound() has that is the host's to call, not a scene's.
const HOSTS_OWN = new Set(['flush', 'close', 'player', 'pause', 'resume', 'settled', 'useMidiHooks', 'receiveSoundEvents'])
// What the sound module exports that a scene is given as well as createSound()'s functions.
const SOUND_EXTRA = ['noteNumber']
// What the dials module exports that is not a control.
const NOT_CONTROLS = new Set(['dials', 'version', 'default'])

let out = 0
const working = process.argv.includes('--working')
// A sibling's file: as it was last committed (a file half way through a change is not copied), or as it is on disk.
const theirs = async (from, file, committed) => (committed ? execFileSync('git', ['-C', from, 'show', `HEAD:${file}`], { maxBuffer: 1 << 28 }) : readFile(join(from, file)))
for (const [sibling, folder, files] of COPIES) {
  const from = resolve(ROOT, '..', sibling)
  if (!existsSync(from)) {
    if (keep) continue
    console.error(`There is no ${from} to copy from. With --keep the lists are written from the copies already here.`)
    process.exit(1)
  }
  let commit = ''
  try { commit = execFileSync('git', ['-C', from, 'log', '-1', '--format=%h'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { /* not a git folder: its files as they are */ }
  const committed = !!commit && !working
  for (const file of files) {
    const bytes = await theirs(from, file, committed)
    const here = join(ROOT, folder, file)
    if (existsSync(here) && (await readFile(here)).equals(bytes)) continue
    out++
    if (check) { console.log(`${folder}/${file} is not the one in ../${sibling}`); continue }
    if (keep) continue
    await mkdir(join(ROOT, folder), { recursive: true })
    await writeFile(here, bytes)
    console.log(`${folder}/${file} copied from ../${sibling}${committed ? ` (${commit})` : ' (as it is on disk)'}`)
  }
}

// The names, read from the copies here.
const text = await readFile(join(ROOT, 'pictures.js'), 'utf8')
const camel = (name) => !/_/.test(name)
const sound = await import(pathToFileURL(join(ROOT, 'sound', 'synths.js')).href)
const made = sound.createSound({ sound: { send() {} } })
const soundNames = [...Object.keys(made).filter((n) => typeof made[n] === 'function' && camel(n) && !HOSTS_OWN.has(n)), ...SOUND_EXTRA.filter((n) => typeof sound[n] === 'function')]
const controls = await import(pathToFileURL(join(ROOT, 'dials', 'dials.js')).href)
const controlNames = Object.keys(controls).filter((n) => typeof controls[n] === 'function' && camel(n) && !NOT_CONTROLS.has(n))

// The names pictures.js gives already: GIVEN's, and the functions a scene may define.
const given = new Set(JSON.parse(text.match(/\nconst GIVEN = (\[[^\]]*\])/)[1].replace(/'/g, '"')))
for (const m of text.match(/\nconst HOOKS = \{[\s\S]*?\n\}/)[0].matchAll(/'(\w+)'/g)) given.add(m[1])
const free = (names, what) => names.filter((n) => {
  const taken = given.has(n) || ['width', 'height', 'pixelRatio'].includes(n)
  if (taken) console.log(`${what}'s "${n}" is left out: a scene already has a ${n} of pictures.js's own`)
  return !taken
})
const clash = soundNames.filter((n) => controlNames.includes(n))
if (clash.length) console.log(`Both siblings have ${clash.join(', ')}: a scene is given the sound one`)
// Sheet music says itself which of its functions are a scene's (its `sceneNames`): the rest are for a program that wants the written music.
const sheets = await import(pathToFileURL(join(ROOT, 'notation', 'notation.js')).href)
const sheetTaken = sheets.sceneNames.filter((n) => soundNames.includes(n) || controlNames.includes(n))
for (const n of sheetTaken) console.log(`sheet music's "${n}" is left out: the ${soundNames.includes(n) ? 'sound' : 'controls'} have a ${n}`)
const sheetNames = sheets.sceneNames.filter((n) => typeof sheets[n] === 'function' && !sheetTaken.includes(n))

const list = (name, names) => `/* ${name}:BEGIN */\nconst ${name} = ${JSON.stringify(names).replace(/"/g, "'").replace(/,/g, ', ')}\n/* ${name}:END */`
let next = text
for (const [name, names] of [['SOUND_NAMES', free(soundNames, 'sound')], ['DIAL_NAMES', free(controlNames.filter((n) => !clash.includes(n)), 'dials')], ['NOTATION_NAMES', free(sheetNames, 'sheet music')]]) {
  const marks = new RegExp(`/\\* ${name}:BEGIN \\*/[\\s\\S]*?/\\* ${name}:END \\*/`)
  if (!marks.test(next)) { console.error(`pictures.js has no ${name} marks to write between`); process.exit(1) }
  next = next.replace(marks, () => list(name, names))
}
if (next !== text) {
  out++
  if (check) console.log('pictures.js: the names a scene is given are not the ones the copies have')
  else { await writeFile(join(ROOT, 'pictures.js'), next); console.log('pictures.js: the names a scene is given were written') }
}

const size = async (folder, files) => (await Promise.all(files.map((f) => stat(join(ROOT, folder, f))))).reduce((sum, s) => sum + s.size, 0)
for (const [, folder, files] of COPIES) console.log(`${folder}/ is ${Math.round(await size(folder, files) / 1024)} kB (${folder === 'sound' ? `synths.js ${sound.version}` : folder === 'notation' ? `notation.js ${sheets.version}` : `dials.js ${controls.version}`})`)
if (check && out) { console.log(`${out} out of step: run node scripts/sync-siblings.mjs`); process.exit(1) }
console.log(check ? 'In step.' : 'Done.')
