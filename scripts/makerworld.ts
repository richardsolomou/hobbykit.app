/**
 * Keeps makerworld/base.scad in step with the app.
 *   pnpm exec tsx scripts/makerworld.ts         regenerates its standard sizes and glyph metrics
 *   pnpm exec tsx scripts/makerworld.ts check   renders it with OpenSCAD and compares each case against buildBase
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Font } from 'opentype.js'
import { buildBase } from '../src/core/geometry/base'
import { toStl } from '../src/core/geometry/exporters'
import { loadManifold } from '../src/core/geometry/manifold'
import { makerworldBaseSource } from '../src/core/geometry/makerworld'
import { isElongated } from '../src/core/geometry/outline'
import { presetFor, resized, SIZES_BY_SHAPE, standardSize } from '../src/core/geometry/presets'
import { exportSegmentsFor } from '../src/core/geometry/quality'
import type { BaseConfig } from '../src/core/geometry/types'

const SCAD = 'makerworld/base.scad'
const FONTS = 'src/assets/fonts'

// Node resolves opentype.js to its UMD build, which only exposes a CommonJS shape.
const { parse } = createRequire(import.meta.url)('opentype.js') as { parse: (b: ArrayBuffer) => Font }
const bytes = readFileSync(join(FONTS, 'oswald-700.woff'))
const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

if (process.argv[2] !== 'check') {
  writeFileSync(SCAD, makerworldBaseSource(font, readFileSync(SCAD, 'utf8')))
  process.exit(0)
}

interface Case {
  name: string
  config: BaseConfig
  defines: Record<string, string | number | boolean>
}

const key = (c: BaseConfig) => `${c.shape}-${isElongated(c.shape) ? `${c.width}x${c.length}` : c.width}`
const standard = Object.values(SIZES_BY_SHAPE)
  .flat()
  .map((preset): Case => {
    const config = presetFor(preset)
    return { name: key(config), config, defines: { standard_size: key(config) } }
  })

const round32 = presetFor(standardSize('round', '32'))
const round60 = presetFor(standardSize('round', '60'))
const round160 = presetFor(standardSize('round', '160'))
const rect = presetFor(standardSize('rect', '25×50'))
const custom = (name: string, config: BaseConfig, defines: Case['defines']): Case => ({ name, config, defines })
const cases: Case[] = [
  ...standard,
  custom('round-bevel', { ...round32, profile: 'bevel' }, { standard_size: 'round-32', bottom_edge: 'bevel' }),
  custom(
    'round-round-edge',
    { ...round32, profile: 'round', profileSize: 1.5 },
    { standard_size: 'round-32', bottom_edge: 'round', edge_size: 1.5 },
  ),
  custom('round-straight', { ...round32, profile: 'straight' }, { standard_size: 'round-32', bottom_edge: 'straight' }),
  custom(
    'round-custom-label',
    { ...round32, label: { ...round32.label, text: 'Squad Ç' } },
    { standard_size: 'round-32', label_text: 'Squad Ç' },
  ),
  custom(
    'round-160-long-label',
    { ...round160, label: { ...round160.label, text: 'Gargantuan Squiggoth' } },
    { standard_size: 'round-160', label_text: 'Gargantuan Squiggoth' },
  ),
  custom(
    'rect-cramped-label',
    { ...rect, label: { ...rect.label, text: 'Knight 12' } },
    { standard_size: 'rect-25x50', label_text: 'Knight 12' },
  ),
  custom('round-no-label', { ...round32, label: { ...round32.label, enabled: false } }, { standard_size: 'round-32', labels: false }),
  custom(
    'round-five-cross',
    { ...round60, magnets: { ...round60.magnets, layout: 'five-cross', count: 5 }, ribs: { ...round60.ribs, count: 4 } },
    { standard_size: 'round-60', pocket_layout: 'five-cross' },
  ),
  custom('round-6x3-magnets', resized({ ...round60, magnets: { ...round60.magnets, diameter: 6, thickness: 3 } }, 60, 60), {
    standard_size: 'round-60',
    magnet_diameter: 6,
    magnet_thickness: 3,
  }),
  custom(
    'round-no-magnets',
    { ...round32, magnets: { ...round32.magnets, count: 0 }, ribs: { ...round32.ribs, count: 3 } },
    { standard_size: 'round-32', magnets_per_base: '0' },
  ),
  custom('rect-sharp', { ...rect, cornerRadius: 0.5 }, { standard_size: 'rect-25x50', corner_radius: 0.5 }),
  custom(
    'octagon-custom',
    { ...resized(presetFor(standardSize('polygon', '40')), 44, 44), sides: 8 },
    {
      standard_size: 'custom',
      shape: 'polygon',
      width: 44,
      sides: 8,
    },
  ),
  custom('oval-custom', resized(presetFor(standardSize('oval', '75×42')), 70, 45), {
    standard_size: 'custom',
    shape: 'oval',
    width: 70,
    depth: 45,
  }),
]

/** Signed volume and the number of edges not shared by exactly two faces once vertices are welded by position. */
function inspect(stl: Buffer): { volume: number; openEdges: number } {
  const count = stl.readUInt32LE(80)
  const ids = new Map<string, number>()
  const edges = new Map<string, number>()
  let volume = 0
  for (let t = 0; t < count; t++) {
    const at = 84 + t * 50 + 12
    const v = [0, 1, 2].map((i) => [0, 1, 2].map((j) => stl.readFloatLE(at + i * 12 + j * 4)))
    const [a, b, c] = v
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    const id = v.map((p) => {
      const k = p.join()
      if (!ids.has(k)) ids.set(k, ids.size)
      return ids.get(k)!
    })
    for (let i = 0; i < 3; i++) {
      const edge = [id[i], id[(i + 1) % 3]].sort((x, y) => x - y).join()
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  return { volume, openEdges: [...edges.values()].filter((n) => n !== 2).length }
}

const define = (name: string, value: string | number | boolean) => [
  '-D',
  `${name}=${typeof value === 'string' ? JSON.stringify(value) : value}`,
]
const openscad = (args: string[]) =>
  execFileSync('openscad', ['--backend=manifold', '--export-format=binstl', ...args], {
    env: { ...process.env, OPENSCAD_FONT_PATH: resolve(FONTS) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

const wasm = await loadManifold()
const dir = mkdtempSync(join(tmpdir(), 'hobbykit-makerworld-'))
let failed = 0
for (const { name, config, defines } of cases) {
  const exact = { ...config, segments: exportSegmentsFor(Math.max(config.width, config.length)) }
  const app = join(dir, `${name}-app.stl`)
  const scad = join(dir, `${name}-scad.stl`)
  writeFileSync(app, toStl(buildBase(wasm, exact, font).mesh, name))
  const started = performance.now()
  openscad(['-o', scad, ...Object.entries(defines).flatMap(([k, v]) => define(k, v)), SCAD])
  const seconds = (performance.now() - started) / 1000
  const symmetric = [
    `difference() { import(${JSON.stringify(app)}); import(${JSON.stringify(scad)}); }`,
    `difference() { import(${JSON.stringify(scad)}); import(${JSON.stringify(app)}); }`,
  ].map((source, i) => {
    const file = join(dir, `${name}-diff${i}.scad`)
    const out = join(dir, `${name}-diff${i}.stl`)
    writeFileSync(file, source)
    try {
      openscad(['-o', out, file])
    } catch {
      return 0 // OpenSCAD refuses to export an empty difference.
    }
    return Math.abs(inspect(readFileSync(out)).volume)
  })
  const expected = inspect(readFileSync(app)).volume
  const actual = inspect(readFileSync(scad))
  const mismatch = (symmetric[0] + symmetric[1]) / expected
  const ok = mismatch < 0.002 && actual.openEdges === 0
  if (!ok) failed++
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(20)} volume ${expected.toFixed(1)} vs ${actual.volume.toFixed(1)}mm³  mismatch ${(mismatch * 100).toFixed(3)}%  open edges ${actual.openEdges}  ${seconds.toFixed(1)}s`,
  )
}
console.log(`${cases.length - failed}/${cases.length} cases match; files in ${dir}`)
process.exit(failed > 0 ? 1 : 0)
