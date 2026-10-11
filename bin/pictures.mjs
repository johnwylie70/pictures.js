#!/usr/bin/env node
/**
 * pictures run hello.js          open the scene in your browser; it runs again when you save
 * pictures build hello.js -o site/   a folder of plain files that runs on any static host
 *
 * Node's own modules only: nothing to install.
 */
import { createServer } from 'node:http'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import { basename, dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOME = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' }

/**
 * The page round a scene: the scene fills it and has the keyboard.
 *
 * Circuitry Studio's File -> Export as Web Page writes this same page as one file with everything
 * inside it, from a copy of this head and box (circuitry `src/lib/pictures/web-export/build-web-page.ts`,
 * `pageHead` and `SCENE_BOX`). Change one and change the other: a test there builds a scene with
 * this command and fails when they differ.
 */
function page(scene, runtime, reload) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${scene}</title>
<style>html, body { margin: 0; height: 100%; background: #000; } #scene { width: 100%; height: 100%; }</style>
</head>
<body>
<div id="scene" data-pictures-src="${scene}" data-pictures-fullpage></div>
<script type="module" src="${runtime}"></script>${reload ? `
<script>new EventSource('/__reload').onmessage = () => location.reload()</script>` : ''}
</body>
</html>
`
}

function usage() {
  console.log('pictures run <scene.js> [--port 8000] [--no-browser]\npictures build <scene.js> -o <folder>')
  process.exit(1)
}

const [command, file, ...rest] = process.argv.slice(2)
if (!file || !/\.m?js$/.test(file)) usage()
const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined }
const folder = dirname(resolve(file))
const scene = basename(file)

if (command === 'run') {
  const port = Number(flag('--port')) || 8000
  const listeners = new Set()
  const send = async (res, path) => {
    try {
      const body = await readFile(path)
      res.writeHead(200, { 'content-type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' })
      res.end(body)
    } catch {
      res.writeHead(404).end('Not found')
    }
  }
  createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (path === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end(page(scene, '/__pictures/pictures.js', true))
    if (path === '/__reload') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' })
      listeners.add(res)
      req.on('close', () => listeners.delete(res))
      return
    }
    // The runtime from this package; everything else from the scene's folder, and nowhere above it.
    const [root, inside] = path.startsWith('/__pictures/') ? [HOME, path.slice(12)] : [folder, path.slice(1)]
    const target = normalize(join(root, inside))
    if (!target.startsWith(root)) return res.writeHead(403).end()
    send(res, target)
  // This computer only: the scene's folder is not offered to the network.
  }).listen(port, 'localhost', () => {
    const address = `http://localhost:${port}/`
    console.log(`${scene} is running at ${address}  (Ctrl+C to stop)`)
    if (!rest.includes('--no-browser')) {
      const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      spawn(opener, [address], { shell: process.platform === 'win32', stdio: 'ignore' }).on('error', () => {})
    }
  })
  let pending
  watch(folder, { recursive: true }, () => {
    clearTimeout(pending)
    pending = setTimeout(() => { for (const res of listeners) res.write('data: changed\n\n') }, 80)
  })
} else if (command === 'build') {
  const out = flag('-o')
  if (!out) usage()
  await mkdir(out, { recursive: true })
  // The scene's folder goes whole, so pictures and files it loads go with it.
  await cp(folder, out, { recursive: true, filter: (src) => !resolve(src).startsWith(resolve(out)) && !/node_modules|\/\.git/.test(src) })
  await mkdir(join(out, 'pictures'), { recursive: true })
  await cp(join(HOME, 'pictures.js'), join(out, 'pictures', 'pictures.js'))
  const code = await readFile(resolve(file), 'utf8')
  if (/\b(THREE|addons)\s*\./.test(code)) await cp(join(HOME, 'three'), join(out, 'pictures', 'three'), { recursive: true })
  // SQLite goes with a scene that opens a database.
  if (/\bopen(Database|_database)\s*\(/.test(code)) await cp(join(HOME, 'sqlite'), join(out, 'pictures', 'sqlite'), { recursive: true })
  await writeFile(join(out, 'index.html'), page(scene, 'pictures/pictures.js', false))
  console.log(`Built ${out} (open index.html from a web server, or put the folder on any static host)`)
} else {
  usage()
}
