/**
 * The pixels of a PNG file, for a test that measures a screenshot: `pixels(bytes)` gives
 * `{ width, height, at(x, y) }`, where `at` is `[r, g, b]`. Eight bits a channel, with or without
 * alpha, not interlaced: what a browser's screenshot is. Nothing to install.
 */
import { inflateSync } from 'node:zlib'

export function pixels(bytes) {
  const data = Buffer.from(bytes)
  let at = 8, width = 0, height = 0, channels = 0
  const packed = []
  while (at < data.length) {
    const length = data.readUInt32BE(at), type = data.toString('latin1', at + 4, at + 8), body = data.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      channels = { 2: 3, 6: 4 }[body[9]]
      if (body[8] !== 8 || !channels || body[12]) throw new Error('png.mjs reads 8-bit RGB and RGBA pictures that are not interlaced')
    } else if (type === 'IDAT') packed.push(body)
    at += 12 + length
  }
  const raw = inflateSync(Buffer.concat(packed)), row = width * channels, out = Buffer.alloc(row * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (row + 1)], from = y * (row + 1) + 1, to = y * row
    for (let i = 0; i < row; i++) {
      const left = i >= channels ? out[to + i - channels] : 0, up = y ? out[to + i - row] : 0, corner = y && i >= channels ? out[to + i - row - channels] : 0
      let add = 0
      if (filter === 1) add = left
      else if (filter === 2) add = up
      else if (filter === 3) add = (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - corner, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - corner)
        add = a <= b && a <= c ? left : b <= c ? up : corner
      }
      out[to + i] = (raw[from + i] + add) & 255
    }
  }
  return { width, height, at: (x, y) => [...out.subarray((y * width + x) * channels, (y * width + x) * channels + 3)] }
}
