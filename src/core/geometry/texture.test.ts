import type { Mesh } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildBase } from './base'
import { loadManifold } from './manifold'
import { OVAL_SIZES, POLYGON_SIZES, presetFor, RECT_SIZES, resized, ROUND_SIZES, type SizePreset } from './presets'
import { exportSegmentsFor } from './quality'
import { DEFAULT_TEXTURE, maxTextureDepth, TEXTURE_BORDER, textureCells, withPattern } from './texture'
import type { BaseConfig, TexturePattern } from './types'

let wasm: Awaited<ReturnType<typeof loadManifold>>

beforeAll(async () => {
  wasm = await loadManifold()
})

const ROUND_32 = ROUND_SIZES[2]
const SIZES = [ROUND_SIZES[0], ROUND_32, ROUND_SIZES[9], OVAL_SIZES[0], RECT_SIZES[3], POLYGON_SIZES[1]]

const PATTERNS = ['flagstone', 'tile', 'plank', 'plate'] as const
const CASES = PATTERNS.flatMap((pattern) => SIZES.map((size) => ({ pattern, size, label: `${pattern} ${size.label}` })))

function textured(size: SizePreset, exported = false, pattern: TexturePattern = 'flagstone'): BaseConfig {
  const config = presetFor(size)
  return {
    ...config,
    texture: { pattern, scale: DEFAULT_TEXTURE[pattern].scale, depth: 0.5 },
    segments: exported ? exportSegmentsFor(Math.max(config.width, config.length)) : config.segments,
  }
}

const build = (config: BaseConfig) => buildBase(wasm, config)

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

/**
 * Every downward face flatter than 45° above the build plate, as a flat at its
 * height or a slope. Float32 vertices tip a 45° face a little either way, and
 * slivers far under a square millimetre by a fraction of a degree, so those are
 * left out.
 */
function overhangs(mesh: Mesh): Set<string> {
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
    if (area > 1e-3 && nz < -Math.SQRT1_2 - 1e-3 && z > 1e-6) found.add(nz < -0.999 ? `flat at ${z.toFixed(2)}` : 'slope')
  }
  return found
}

/** Farthest reach of any vertex cut into the plate face. */
function jointReach(mesh: Mesh, depth: number) {
  const { numProp, vertProperties: v } = mesh
  let reach = 0
  for (let i = 0; i < v.length; i += numProp) {
    if (v[i + 2] > 1e-6 && v[i + 2] < depth + 1e-6) reach = Math.max(reach, Math.hypot(v[i], v[i + 1]))
  }
  return reach
}

describe('flagstone texture', () => {
  it.for(PATTERNS)('cuts %s joints into the plate face', (pattern) => {
    const config = textured(ROUND_32, false, pattern)
    const plain = build({ ...config, texture: { ...config.texture, pattern: 'none' } })
    expect(build(config).stats.volume).toBeLessThan(plain.stats.volume)
  })

  it('leaves a base with no pattern untouched', () => {
    const config = presetFor(ROUND_32)
    const deep = { ...config, texture: { ...config.texture, depth: 0.6 } }
    expect(build(deep).stats.volume).toBe(build(config).stats.volume)
  })

  it.for(CASES)('roofs every joint of a $label base at 45° except its narrow apex', ({ pattern, size }) => {
    expect([...overhangs(build(textured(size, true, pattern)).mesh)]).toEqual(['flat at 0.49'])
  })

  it('stops the joints short of the edge profile', () => {
    const config = textured(ROUND_32)
    const plateRadius = config.width / 2 - config.profileSize
    expect(jointReach(build(config).mesh, config.texture.depth)).toBeLessThanOrEqual(plateRadius - TEXTURE_BORDER + 1e-3)
  })

  it.for(CASES)('welds cleanly on a $label base', ({ pattern, size }) => {
    expect(duplicateVertices(build(textured(size, true, pattern)).mesh)).toBe(0)
  })

  it('runs planks along the longer axis of the face', () => {
    const across = textureCells('plank', 5, 10, 30).filter((cell) => {
      const xs = cell.map(([x]) => x)
      const ys = cell.map(([, y]) => y)
      return Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys)
    })
    expect(across).toEqual([])
  })

  it('rejects joints that cut too close to the recess', () => {
    const config = textured(ROUND_32)
    expect(() => build({ ...config, texture: { ...config.texture, depth: maxTextureDepth(config) + 0.1 } })).toThrow(
      /too close to the recess/,
    )
  })

  it('makes the joints shallower when a resize thins the top', () => {
    const large = presetFor(ROUND_SIZES[6])
    const config = { ...large, texture: { pattern: 'flagstone' as const, scale: 10, depth: 1 } }
    expect(resized(config, 32, 32).texture.depth).toBeCloseTo(maxTextureDepth({ floorThickness: 1, texture: config.texture }))
  })

  it("takes the new pattern's size when the size was left at its default", () => {
    const flagstone = { pattern: 'flagstone' as const, scale: DEFAULT_TEXTURE.flagstone.scale, depth: 0.5 }
    expect(withPattern(flagstone, 'plank').scale).toBe(DEFAULT_TEXTURE.plank.scale)
  })

  it('keeps a size the user set when the pattern changes', () => {
    expect(withPattern({ pattern: 'flagstone', scale: 12, depth: 0.5 }, 'plank').scale).toBe(12)
  })
})
