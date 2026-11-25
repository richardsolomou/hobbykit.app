/**
 * Writes the dial counter's digit outlines from the bundled Barlow Semi Condensed Black.
 *   pnpm exec tsx scripts/counterDigits.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Font } from 'opentype.js'
import { textPolygons } from '../src/core/geometry/text'

const FONT = 'node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-900-normal.woff'
/** A digit's height across a face, which a number is shrunk from to fit. */
const HEIGHT = 9.4

// Node resolves opentype.js to its UMD build, which only exposes a CommonJS shape.
const { parse } = createRequire(import.meta.url)('opentype.js') as { parse: (bytes: ArrayBuffer) => Font }
const bytes = readFileSync(FONT)
const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

// Each digit lies on its side on its face: its top towards -u, reading along +v.
const digits = Array.from({ length: 10 }, (_digit, digit) =>
  textPolygons(font, String(digit), HEIGHT).map((ring) => ring.map(([x, y]) => `[${Number((-y).toFixed(3))}, ${Number(x.toFixed(3))}]`)),
)
writeFileSync(
  'src/core/geometry/counterDigits.ts',
  `/* oxlint-disable approx-constant -- coordinates that happen to match constants */
/** Each digit's outline in Barlow Semi Condensed Black, written by scripts/counterDigits.ts: rings in millimetres, across the face then along the axle from the middle of the digits, read from outside with the digit lying on its side. */
export const COUNTER_DIGITS: readonly (readonly (readonly [number, number])[])[][] = [
${digits.map((rings) => `  [${rings.map((ring) => `[${ring.join(', ')}]`).join(', ')}],`).join('\n')}
]
`,
)
