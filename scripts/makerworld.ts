/**
 * Keeps the scripts in makerworld/ in step with the app.
 *   pnpm exec tsx scripts/makerworld.ts                     regenerates every script's standard sizes and glyph metrics
 *   pnpm exec tsx scripts/makerworld.ts check [name[/case]]  renders each script's cases from scripts/makerworld/<name>.ts
 *                                                           with OpenSCAD and compares them against the app
 */
import { execFile } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { toStl } from '../src/core/geometry/exporters'
import { loadManifold } from '../src/core/geometry/manifold'
import { makerworldSource } from '../src/core/geometry/makerworld'
import { type Case, FONTS, font } from './makerworld/shared'

const DIR = 'makerworld'
const scripts = readdirSync(DIR)
  .filter((file) => file.endsWith('.scad'))
  .map((file) => file.slice(0, -'.scad'.length))

if (process.argv[2] !== 'check') {
  for (const name of scripts) {
    const path = join(DIR, `${name}.scad`)
    writeFileSync(path, makerworldSource(font, readFileSync(path, 'utf8')))
  }
  process.exit(0)
}

const filters = process.argv.slice(3)
for (const filter of filters) {
  if (!scripts.includes(filter.split('/')[0])) throw new Error(`No makerworld/${filter.split('/')[0]}.scad`)
}
const wanted = (script: string, name: string) =>
  filters.length === 0 || filters.some((f) => f === script || (f.startsWith(`${script}/`) && name.startsWith(f.slice(script.length + 1))))

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
  promisify(execFile)('openscad', ['--backend=manifold', '--export-format=binstl', ...args], {
    env: { ...process.env, OPENSCAD_FONT_PATH: resolve(FONTS) },
    maxBuffer: 64 * 1024 * 1024,
  })

const wasm = await loadManifold()
const dir = mkdtempSync(join(tmpdir(), 'hobbykit-makerworld-'))

async function run(script: string, { name, build, defines }: Case): Promise<boolean> {
  const id = `${script}-${name}`
  const app = join(dir, `${id}-app.stl`)
  const scad = join(dir, `${id}-scad.stl`)
  writeFileSync(app, toStl(build(wasm), id))
  const started = performance.now()
  await openscad(['-o', scad, ...Object.entries(defines).flatMap(([k, v]) => define(k, v)), join(DIR, `${script}.scad`)])
  const seconds = (performance.now() - started) / 1000
  const symmetric = await Promise.all(
    [
      `difference() { import(${JSON.stringify(app)}); import(${JSON.stringify(scad)}); }`,
      `difference() { import(${JSON.stringify(scad)}); import(${JSON.stringify(app)}); }`,
    ].map(async (source, i) => {
      const file = join(dir, `${id}-diff${i}.scad`)
      const out = join(dir, `${id}-diff${i}.stl`)
      writeFileSync(file, source)
      try {
        await openscad(['-o', out, file])
      } catch {
        return 0 // OpenSCAD refuses to export an empty difference.
      }
      return Math.abs(inspect(readFileSync(out)).volume)
    }),
  )
  const expected = inspect(readFileSync(app)).volume
  const actual = inspect(readFileSync(scad))
  const mismatch = (symmetric[0] + symmetric[1]) / expected
  const ok = mismatch < 0.002 && actual.openEdges === 0
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(32)} volume ${expected.toFixed(1)} vs ${actual.volume.toFixed(1)}mm³  mismatch ${(mismatch * 100).toFixed(3)}%  open edges ${actual.openEdges}  ${seconds.toFixed(1)}s`,
  )
  return ok
}

const queue: (() => Promise<boolean>)[] = []
for (const script of scripts.filter((s) => filters.length === 0 || filters.some((f) => f.split('/')[0] === s))) {
  const { cases } = (await import(`./makerworld/${script}.ts`)) as { cases: Case[] }
  for (const c of cases) if (wanted(script, c.name)) queue.push(() => run(script, c))
}
const total = queue.length
let failed = 0
await Promise.all(
  Array.from({ length: availableParallelism() }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      if (!(await next().catch((error: Error) => (console.log(`FAIL ${error.message.split('\n')[0]}`), false)))) failed++
    }
  }),
)
console.log(`${total - failed}/${total} cases match; files in ${dir}`)
process.exit(failed > 0 ? 1 : 0)
