import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { ManifoldToplevel } from 'manifold-3d'
import type { Font } from 'opentype.js'
import type { MeshLike } from '../../src/core/geometry/exporters'

export const FONTS = 'src/assets/fonts'

// Node resolves opentype.js to its UMD build, which only exposes a CommonJS shape.
const { parse } = createRequire(import.meta.url)('opentype.js') as { parse: (b: ArrayBuffer) => Font }
const bytes = readFileSync(join(FONTS, 'oswald-700.woff'))
export const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

/** One render of a MakerWorld script, compared against the app's mesh built at export quality. */
export interface Case {
  name: string
  build: (wasm: ManifoldToplevel) => MeshLike
  defines: Record<string, string | number | boolean>
}
