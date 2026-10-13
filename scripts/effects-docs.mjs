#!/usr/bin/env node
/**
 * docs/effects-reference.md: every effect and look, written from the table inside the copy of the effects
 * library here (visualfx/visualfx.js), so the page cannot say anything the library does not do.
 *
 *   node scripts/effects-docs.mjs            write the page, and bring the pictures (docs/images/effects/) from
 *                                            ../visualfx.js/docs/images/effects when that folder is beside this one
 *   node scripts/effects-docs.mjs --check    change nothing; code 1 if the page is not what the table gives, or a
 *                                            picture is missing
 *
 * Run it after scripts/sync-siblings.mjs has brought a newer visualfx.js. The pictures are made in the effects'
 * own repository, by its scripts/docs.mjs, from the effects themselves.
 */
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')
const { effects } = await import(pathToFileURL(join(ROOT, 'visualfx', 'visualfx.js')).href)
const table = effects.definitions()
const snake = (name) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const value = (v) => (v === null ? 'null' : JSON.stringify(v))
const names = (group) => Object.keys(table.effects).filter((n) => table.effects[n].group === group)

function rows(def) {
  return Object.entries(def.settings).map(([name, s]) => {
    const range = s.kind === 'choice' ? s.choices.map((c) => `\`"${c}"\``).join(', ')
      : s.kind === 'colour' ? 'any colour' : s.kind === 'palette' ? 'a palette\'s name, or a list of colours' : s.kind === 'bool' ? 'true or false'
        : s.place ? 'a place in the scene' : `${s.min} to ${s.max}${s.unit === 'degrees' ? ' degrees' : s.unit === 's' ? ' seconds' : ''}${s.kind === 'int' ? ', a whole number' : ''}`
    return `| \`${name}\`${snake(name) !== name ? ` (\`${snake(name)}\`)` : ''} | ${s.place ? 'the middle' : `\`${value(s.default)}\``} | ${range} |`
  })
}
const out = ['# Every effect', '',
  '<!-- Written by scripts/effects-docs.mjs from the table in visualfx/visualfx.js. Do not edit it by hand. -->', '',
  `This is the list. [Effects](effects.md) is how to use them. There are ${Object.keys(table.effects).length} effects and ${table.looks.length} looks.`, '',
  'The value in the brackets is the one a plain number (or name) sets; every other setting goes in by name, `glow(0.8, { radius: 40 })`, and can be changed at any time, `shine.radius = 60`. Every effect also has `amount`, from 0 to 1. Lengths are in the scene\'s points and angles in degrees; a place (`x`, `y`) is the middle unless you say. The name in brackets after a name is its Python spelling, which works too.', '',
  `The palettes: ${table.palettes.map((p) => `\`${p}\``).join(', ')}, or your own list of colours.`, '', '## Contents', '']
for (const group of table.groups) if (names(group).length) out.push(`- **${group}**: ${names(group).map((n) => `[${n}](#${n.toLowerCase()})`).join(', ')}`)
out.push(`- **Looks**: ${table.looks.map((l) => `[${l}](#look-${l})`).join(', ')}`, '')
for (const group of table.groups) {
  if (!names(group).length) continue
  out.push(`## ${group}`, '')
  if (/Backdrops/.test(group)) out.push('A backdrop is a picture the graphics card makes by itself. It is behind whatever you draw, and shows wherever the canvas is clear: wipe the picture each frame with `background()` (no colour) rather than painting over it.', '')
  if (/music/.test(group)) out.push('These follow the scene\'s sound. With no sound they are still and dark.', '')
  for (const name of names(group)) {
    const def = table.effects[name]
    const alias = Object.entries(table.aliases).filter(([, to]) => to === name).map(([from]) => `\`${from}\``)
    out.push(`### ${name}`, '', `<img src="images/effects/${name}.jpg" width="320" height="200" alt="${name}">`, '', def.about, '',
      '```js', `${name}(${def.order.map((n) => value(def.settings[n].default)).join(', ')})`, '```', '')
    if (snake(name) !== name || alias.length) out.push(`Also written ${[...(snake(name) !== name ? [`\`${snake(name)}\``] : []), ...alias].join(' and ')}.`, '')
    if (def.cost === 'heavy') out.push('**Heavy.** It looks at dozens of places for every pixel: use it alone, or with `effectsQuality(0.5)`.', '')
    else if (def.cost === 'some') out.push('It looks at a dozen or more places for every pixel, so it costs a little more than most.', '')
    if (def.feedback) out.push('It keeps its own last frame, so it wants a scene that moves.', '')
    out.push('| Setting | Starts at | Can be |', '|---|---|---|', ...rows(def), '')
  }
}
out.push('## Looks', '', 'A look is several effects at once: `look("dream")`. It gives its parts back by name (`look("vhs").glitch.strength = 1`), and has `amount`, `off()`, `on()` and `remove()` for the lot.', '')
for (const name of table.looks) {
  const parts = table.recipes[name].map(([effect, settings]) => `\`${effect}(${Object.keys(settings).length ? JSON.stringify(settings).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }') : ''})\``)
  out.push(`### look: ${name}`, '', `<a id="look-${name}"></a>`, '', `<img src="images/effects/look-${name}.jpg" width="320" height="200" alt="look ${name}">`, '', table.lookAbout[name] || '', '',
    `\`look("${name}")\` is ${parts.join(', then ')}.`, '')
}
const md = out.join('\n')
const wanted = [...Object.keys(table.effects), ...table.looks.map((l) => `look-${l}`)].map((n) => `${n}.jpg`)
const page = join(ROOT, 'docs', 'effects-reference.md'), pictures = join(ROOT, 'docs', 'images', 'effects')
if (check) {
  const problems = []
  if (!existsSync(page) || (await readFile(page, 'utf8')) !== md) problems.push('docs/effects-reference.md is not what the table in visualfx/visualfx.js gives: run node scripts/effects-docs.mjs')
  for (const f of wanted) if (!existsSync(join(pictures, f))) problems.push(`docs/images/effects/${f} is missing`)
  for (const p of problems) console.log(p)
  process.exit(problems.length ? 1 : 0)
}
await writeFile(page, md)
const theirs = process.env.VISUALFX_PICTURES || resolve(ROOT, '..', 'visualfx.js', 'docs', 'images', 'effects')
await mkdir(pictures, { recursive: true })
let copied = 0
for (const f of [...wanted, '../effects.jpg']) {
  const from = join(theirs, f), to = f.startsWith('..') ? join(ROOT, 'docs', 'images', 'effects.jpg') : join(pictures, f)
  if (!existsSync(from)) continue
  if (existsSync(to) && (await readFile(to)).equals(await readFile(from))) continue
  await copyFile(from, to)
  copied++
}
console.log(`docs/effects-reference.md written; ${copied} pictures brought from ${theirs}`)
