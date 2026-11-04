/**
 * Writes a sample STL per preset size so the geometry can be inspected outside the
 * browser. Usage: pnpm samples [outDir] [round|oval|painting|rack|counter]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Font } from 'opentype.js'
import { buildBase } from '../src/core/geometry/base'
import { toStl } from '../src/core/geometry/exporters'
import { loadManifold } from '../src/core/geometry/manifold'
import { baseName } from '../src/core/geometry/outline'
import {
  buildPaintingHandle,
  buildPaintingTray,
  defaultPaintingTrayConfig,
  paintingHandleConfig,
  paintingHandleName,
  paintingTrayName,
} from '../src/core/geometry/paintingTray'
import { buildPaintRack, defaultPaintRackConfig, paintRackName } from '../src/core/geometry/paintRack'
import { OVAL_SIZES, presetFor, ROUND_SIZES } from '../src/core/geometry/presets'
import { exportSegmentsFor } from '../src/core/geometry/quality'
import { buildCounter, counterName, counterParts, defaultCounterConfig } from '../src/core/geometry/counter'

const FONT_PATH = 'src/assets/fonts/oswald-700.woff'

// Node resolves opentype.js to its UMD build, which only exposes a CommonJS shape.
const { parse } = createRequire(import.meta.url)('opentype.js') as { parse: (b: ArrayBuffer) => Font }

const [outDir = 'samples', family = 'round'] = process.argv.slice(2)
const sizes = family === 'oval' ? OVAL_SIZES : ROUND_SIZES

const wasm = await loadManifold()
mkdirSync(outDir, { recursive: true })

if (family === 'painting') {
  const config = defaultPaintingTrayConfig()
  const parts = [
    { ...buildPaintingTray(wasm, { ...config, assembly: false }), name: paintingTrayName(config) },
    { ...buildPaintingHandle(wasm, paintingHandleConfig(config)), name: paintingHandleName(config) },
  ]
  for (const { mesh, stats, name } of parts) {
    const filename = `${name}.stl`
    writeFileSync(join(outDir, filename), toStl(mesh, filename))
    console.log(`${filename}  ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
  }
  process.exit(0)
}

if (family === 'rack') {
  const config = defaultPaintRackConfig()
  const { mesh, stats } = buildPaintRack(wasm, config)
  const filename = `${paintRackName(config)}.stl`
  writeFileSync(join(outDir, filename), toStl(mesh, filename))
  console.log(`${filename}  ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
  process.exit(0)
}

const bytes = readFileSync(FONT_PATH)
const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

if (family === 'counter') {
  const config = defaultCounterConfig()
  for (const { part, name } of counterParts(config)) {
    const { mesh, stats } = buildCounter(wasm, { ...config, part, segments: exportSegmentsFor(config.drumDiameter) }, font)
    const filename = `${counterName(config)}-${name}.stl`
    writeFileSync(join(outDir, filename), toStl(mesh, filename))
    console.log(`${filename}  ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
  }
  process.exit(0)
}

for (const size of sizes) {
  const config = presetFor(size)
  const { mesh, stats } = buildBase(wasm, config, font)
  const name = `${baseName(config)}.stl`
  writeFileSync(join(outDir, name), toStl(mesh, name))
  console.log(`${name.padEnd(28)} ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
}
