import { readFileSync } from 'node:fs'
import type { Mesh } from 'manifold-3d'
import { parse, type Font } from 'opentype.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildBase } from './base'
import { loadManifold } from './manifold'
import { OVAL_SIZES, POLYGON_SIZES, presetFor, RECT_SIZES, ROUND_SIZES, type SizePreset } from './presets'
import { exportSegmentsFor } from './quality'
import { DEFAULT_TEXTURE } from './texture'
import type { BaseConfig } from './types'

let wasm: Awaited<ReturnType<typeof loadManifold>>
let font: Font

beforeAll(async () => {
  wasm = await loadManifold()
  const bytes = readFileSync('src/assets/fonts/oswald-700.woff')
  font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
})

const ROUND_32 = ROUND_SIZES[2]
const PATTERNS = ['rock', 'earth', 'rubble', 'sand', 'cracked', 'snow', 'roots'] as const
const SIZES = [ROUND_32, OVAL_SIZES[0], RECT_SIZES[3], POLYGON_SIZES[1]]
const CASES = PATTERNS.flatMap((pattern) => SIZES.map((size) => ({ pattern, size, label: `${pattern} ${size.label}` })))

function relief(size: SizePreset, pattern: (typeof PATTERNS)[number] = 'rock', exported = false): BaseConfig {
  const config = presetFor(size)
  return {
    ...config,
    texture: { pattern, seed: 1, ...DEFAULT_TEXTURE[pattern] },
    segments: exported ? exportSegmentsFor(Math.max(config.width, config.length)) : config.segments,
  }
}

const build = (config: BaseConfig) => buildBase(wasm, config, font)
const pocketDepth = (config: BaseConfig) => config.magnets.thickness + config.magnets.depthClearance

function topZ(mesh: Mesh) {
  let top = -Infinity
  for (let i = 2; i < mesh.vertProperties.length; i += mesh.numProp) top = Math.max(top, mesh.vertProperties[i])
  return top
}

/** Highest vertex inside a magnet pocket and below the model face: the pocket's ceiling. */
function pocketCeiling(mesh: Mesh, config: BaseConfig) {
  const radius = (config.magnets.diameter + config.magnets.clearance) / 2
  let ceiling = -Infinity
  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
    const [x, y, z] = [mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]]
    if (Math.hypot(x, y) < radius + 1e-3 && z < config.height) ceiling = Math.max(ceiling, z)
  }
  return ceiling
}

/** Downward faces above the plate flatter than 45°, by height, or `slope` for any that are not flat. */
function overhangs(mesh: Mesh): string[] {
  const { numProp, vertProperties: v, triVerts } = mesh
  const found = new Set<string>()
  for (let t = 0; t < triVerts.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => triVerts[t + k] * numProp)
    const u = [0, 1, 2].map((axis) => v[b + axis] - v[a + axis])
    const w = [0, 1, 2].map((axis) => v[c + axis] - v[a + axis])
    const normal = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const area = Math.hypot(...normal) / 2
    const nz = normal[2] / (2 * area)
    const z = Math.max(v[a + 2], v[b + 2], v[c + 2])
    if (area > 1e-3 && nz < -Math.SQRT1_2 - 3e-3 && z > 1e-6) found.add(nz < -0.999 ? `flat at ${z.toFixed(2)}` : 'slope')
  }
  return [...found].sort()
}

/** The steepest face of the relief above the body, in degrees, ignoring its vertical walls and float32 slivers. */
function steepest(mesh: Mesh, config: BaseConfig) {
  const { numProp, vertProperties: v, triVerts } = mesh
  let flattest = 1
  for (let t = 0; t < triVerts.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => triVerts[t + k] * numProp)
    if (Math.min(v[a + 2], v[b + 2], v[c + 2]) < config.height) continue
    const u = [0, 1, 2].map((axis) => v[b + axis] - v[a + axis])
    const w = [0, 1, 2].map((axis) => v[c + axis] - v[a + axis])
    const normal = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const area = Math.hypot(...normal) / 2
    const nz = normal[2] / (2 * area)
    if (area > 1e-3 && nz > 0.02) flattest = Math.min(flattest, nz)
  }
  return (Math.acos(flattest) * 180) / Math.PI
}

function duplicateVertices(mesh: Mesh) {
  const seen = new Set<string>()
  let duplicates = 0
  for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
    const key = `${mesh.vertProperties[i]},${mesh.vertProperties[i + 1]},${mesh.vertProperties[i + 2]}`
    if (seen.has(key)) duplicates++
    seen.add(key)
  }
  return duplicates
}

describe('relief textures', () => {
  it.for(PATTERNS)('raises %s above the model face', (pattern) => {
    const config = relief(ROUND_32, pattern)
    expect(topZ(build(config).mesh)).toBeGreaterThan(config.height + config.texture.depth / 2)
  })

  it.for(PATTERNS)('keeps %s within its relief height', (pattern) => {
    const config = relief(ROUND_32, pattern)
    expect(topZ(build(config).mesh)).toBeLessThanOrEqual(config.height + config.texture.depth + 0.02)
  })

  it('stands on its full-size underside, with the edge profile at the model face', () => {
    const { mesh } = build(relief(ROUND_32))
    let reach = 0
    for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
      if (Math.abs(mesh.vertProperties[i + 2]) < 1e-6)
        reach = Math.max(reach, Math.hypot(mesh.vertProperties[i], mesh.vertProperties[i + 1]))
    }
    expect(reach).toBeCloseTo(16, 2)
  })

  it('runs the relief out to the lip', () => {
    const config = relief(ROUND_32)
    const { mesh } = build(config)
    let reach = 0
    for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
      if (mesh.vertProperties[i + 2] > config.height + 0.05)
        reach = Math.max(reach, Math.hypot(mesh.vertProperties[i], mesh.vertProperties[i + 1]))
    }
    expect(reach).toBeGreaterThan(config.width / 2 - config.profileSize - 0.05)
  })

  it('opens the magnet pocket onto the plate face, so the magnet sits flush with the tray', () => {
    const config = relief(ROUND_32)
    expect(pocketCeiling(build(config).mesh, config)).toBeCloseTo(pocketDepth(config), 4)
  })

  it.for(CASES)('leaves only the pocket and label ceilings overhanging on a $label base', ({ pattern, size }) => {
    const config = relief(size, pattern, true)
    const ceilings = [config.label.emboss, pocketDepth(config)].map((z) => `flat at ${z.toFixed(2)}`)
    expect(overhangs(build(config).mesh)).toEqual(ceilings.sort())
  })

  it.for(CASES)('welds cleanly on a $label base', ({ pattern, size }) => {
    expect(duplicateVertices(build(relief(size, pattern, true)).mesh)).toBe(0)
  })

  it.for(PATTERNS)('softens %s into slopes the mesh can follow at its smallest, roughest setting', (pattern) => {
    const config = relief(ROUND_32, pattern, true)
    const roughest = { ...config, texture: { ...config.texture, scale: 3, irregularity: 100 } }
    expect(steepest(build(roughest).mesh, roughest)).toBeLessThan(65)
  })

  it('engraves the size label into the plate face on a cramped base', () => {
    const config = relief(RECT_SIZES[0])
    const plain = build({ ...config, label: { ...config.label, enabled: false } })
    expect(build(config).stats.volume).toBeLessThan(plain.stats.volume)
  })

  it('rises higher than a thin top would allow a joint to cut', () => {
    const config = relief(ROUND_32)
    expect(() => build({ ...config, floorThickness: 0.4, texture: { ...config.texture, depth: 3 } })).not.toThrow()
  })

  it.for(PATTERNS)('raises %s differently for another variation', (pattern) => {
    const config = relief(ROUND_32, pattern)
    const other = { ...config, texture: { ...config.texture, seed: 2 } }
    expect(build(other).stats.volume).not.toBeCloseTo(build(config).stats.volume, 3)
  })

  it.for(PATTERNS)('roughens %s with irregularity', (pattern) => {
    const config = relief(ROUND_32, pattern)
    const rough = { ...config, texture: { ...config.texture, irregularity: 100 } }
    expect(build(rough).stats.volume).not.toBeCloseTo(build(config).stats.volume, 3)
  })

  it('rejects magnet pockets that leave too little base above them', () => {
    const config = relief(ROUND_32)
    expect(() => build({ ...config, height: 2.5 })).toThrow(/too little above them/)
  })
})
