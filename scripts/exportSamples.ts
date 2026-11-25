/**
 * Writes a sample STL per preset size so the geometry can be inspected outside the
 * browser. Usage: pnpm samples [outDir] [round|oval|painting|rack|counter]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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
import { forExport } from '../src/core/geometry/exportQuality'
import { buildCounter, counterName, counterParts, defaultCounterConfig } from '../src/core/geometry/counter'
import { font } from './makerworld/shared'

const [outDir = 'samples', family = 'round'] = process.argv.slice(2)
const sizes = family === 'oval' ? OVAL_SIZES : ROUND_SIZES

const wasm = await loadManifold()
mkdirSync(outDir, { recursive: true })

if (family === 'painting') {
  const config = defaultPaintingTrayConfig()
  const handle = paintingHandleConfig(config)
  const parts = [
    {
      ...buildPaintingTray(wasm, forExport({ ...config, assembly: false })),
      name: paintingTrayName(config),
    },
    {
      ...buildPaintingHandle(wasm, forExport(handle)),
      name: paintingHandleName(config),
    },
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
  const { mesh, stats } = buildPaintRack(wasm, forExport(config))
  const filename = `${paintRackName(config)}.stl`
  writeFileSync(join(outDir, filename), toStl(mesh, filename))
  console.log(`${filename}  ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
  process.exit(0)
}

if (family === 'counter') {
  const config = defaultCounterConfig()
  for (const { part, name, dial } of counterParts(config)) {
    const { mesh, inserts, stats } = buildCounter(wasm, forExport({ ...config, part, dial }), font)
    const filename = `${counterName(config)}-${name}.stl`
    writeFileSync(join(outDir, filename), toStl(mesh, filename))
    if (inserts) writeFileSync(join(outDir, `${counterName(config)}-${name}-colour.stl`), toStl(inserts, filename))
    console.log(`${filename}  ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
  }
  process.exit(0)
}

for (const size of sizes) {
  const config = presetFor(size)
  const { mesh, stats } = buildBase(wasm, forExport(config), font)
  const name = `${baseName(config)}.stl`
  writeFileSync(join(outDir, name), toStl(mesh, name))
  console.log(`${name.padEnd(28)} ${stats.triangles} tris  ${stats.volume.toFixed(0)}mm3  ${stats.grams.toFixed(2)}g`)
}
