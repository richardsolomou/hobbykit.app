import type { Mesh } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { duplicateVertices, overhangs } from './geometry.test.utils'
import { buildBase } from './base'
import { loadManifold } from './manifold'
import { fitToSize, presetFor, resized, standardSize, type SizePreset } from './presets'
import { exportSegmentsFor } from './quality'
import { DEFAULT_TEXTURE, isRegular, maxTextureDepth, nailHoles, solidWithPattern, textureCells, withPattern } from './texture'
import type { BaseConfig, TexturePattern } from './types'

let wasm: Awaited<ReturnType<typeof loadManifold>>

beforeAll(async () => {
  wasm = await loadManifold()
})

const ROUND_32 = standardSize('round', '32')
const SIZES = [
  standardSize('round', '25'),
  ROUND_32,
  standardSize('round', '120'),
  standardSize('oval', '60×35.5'),
  standardSize('rect', '25×50'),
  standardSize('polygon', '32'),
]

const PATTERNS = ['flagstone', 'cobblestone', 'hex', 'tile', 'plank', 'plate', 'brick', 'herringbone', 'diamond'] as const
const IRREGULAR = PATTERNS.filter((pattern) => !isRegular(pattern))
const CASES = PATTERNS.flatMap((pattern) => SIZES.map((size) => ({ pattern, size, label: `${pattern} ${size.label}` })))

function textured(size: SizePreset, exported = false, pattern: TexturePattern = 'flagstone'): BaseConfig {
  const config = presetFor(size)
  return {
    ...config,
    texture: { pattern, seed: 1, ...DEFAULT_TEXTURE[pattern], depth: 0.5 },
    segments: exported ? exportSegmentsFor(Math.max(config.width, config.length)) : config.segments,
  }
}

const build = (config: BaseConfig) => buildBase(wasm, config)

/** Farthest reach of any vertex cut into the plate face. */
function jointReach(mesh: Mesh, depth: number) {
  const { numProp, vertProperties: v } = mesh
  let reach = 0
  for (let i = 0; i < v.length; i += numProp) {
    if (v[i + 2] > 1e-6 && v[i + 2] < depth + 1e-6) reach = Math.max(reach, Math.hypot(v[i], v[i + 1]))
  }
  return reach
}

describe('joint textures', () => {
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
    expect(overhangs(build(textured(size, true, pattern)).mesh)).toEqual(['flat at 0.49'])
  })

  it('runs the joints out through the edge', () => {
    const config = textured(ROUND_32)
    const plateRadius = config.width / 2 - config.profileSize
    expect(jointReach(build(config).mesh, config.texture.depth)).toBeGreaterThan(plateRadius)
  })

  it.for(CASES)('welds cleanly on a $label base', ({ pattern, size }) => {
    expect(duplicateVertices(build(textured(size, true, pattern)).mesh)).toBe(0)
  })

  it('runs planks along the longer axis of the face', () => {
    const across = textureCells({ pattern: 'plank', scale: 5, seed: 1, irregularity: 50 }, 10, 30).filter((cell) => {
      const xs = cell.map(([x]) => x)
      const ys = cell.map(([, y]) => y)
      return Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys)
    })
    expect(across).toEqual([])
  })

  it('lays bricks twice as long as their course when tidy', () => {
    const cells = textureCells({ pattern: 'brick', seed: 1, scale: 3, irregularity: 0 }, 20, 20)
    const lengths = new Set(cells.map(([a, b]) => (b[0] - a[0]).toFixed(6)))
    expect([...lengths]).toEqual(['6.000000'])
  })

  it('varies brick lengths with irregularity', () => {
    const cells = textureCells({ pattern: 'brick', seed: 1, scale: 3, irregularity: 100 }, 20, 20)
    expect(new Set(cells.map(([a, b]) => (b[0] - a[0]).toFixed(6))).size).toBeGreaterThan(1)
  })

  it('staggers each course of bricks by half a brick', () => {
    const cells = textureCells({ pattern: 'brick', seed: 1, scale: 3, irregularity: 0 }, 20, 20)
    const firstJoint = (v: number) => Math.min(...cells.filter(([a]) => Math.abs(a[1] - v) < 1e-9).map(([a]) => a[0]))
    expect(Math.abs(firstJoint(-1.5) - firstJoint(1.5)) % 6).toBeCloseTo(3, 6)
  })

  it('nails each plank near its four corners', () => {
    const plank = [
      [0, 0],
      [20, 0],
      [20, 5],
      [0, 5],
    ] as [number, number][]
    expect(nailHoles([plank], 0.5)).toHaveLength(4)
  })

  it('leaves the nails out of a plank too narrow to keep them clear of its joints', () => {
    const plank = [
      [0, 0],
      [20, 0],
      [20, 3],
      [0, 3],
    ] as [number, number][]
    expect(nailHoles([plank], 0.5)).toEqual([])
  })

  it('drills nail holes into a plank base, each narrowing to a point', () => {
    const config = textured(ROUND_32, false, 'plank')
    const planks = textureCells({ ...config.texture, pattern: 'plank' }, 17, 17)
    const [x, y] = nailHoles(planks, config.texture.depth).find(([nx, ny]) => Math.hypot(nx, ny) < 10)!
    const { numProp, vertProperties: v } = build(config).mesh
    const apex = Array.from({ length: v.length / numProp }, (_, i) => i * numProp).some(
      (i) => Math.hypot(v[i] - x, v[i + 1] - y) < 1e-3 && Math.abs(v[i + 2] - 0.4) < 1e-3,
    )
    expect(apex).toBe(true)
  })

  it('rejects joints that cut too close to the recess', () => {
    const config = textured(ROUND_32)
    expect(() => build({ ...config, texture: { ...config.texture, depth: maxTextureDepth(config) + 0.1 } })).toThrow(
      /too close to the recess/,
    )
  })

  it('makes the joints shallower when a resize thins the top', () => {
    const large = presetFor(standardSize('round', '80'))
    const config = { ...large, texture: { ...textured(ROUND_32).texture, depth: 1 } }
    expect(resized(config, 32, 32).texture.depth).toBeCloseTo(maxTextureDepth({ ...resized(config, 32, 32), floorThickness: 1 }))
  })

  it('rejects joints on a solid base that cut too close to the magnet pockets', () => {
    const config = { ...textured(ROUND_32), solid: true }
    expect(() => build({ ...config, texture: { ...config.texture, depth: maxTextureDepth(config) + 0.1 } })).toThrow(
      /too close to the magnet pockets/,
    )
  })

  it('cuts joints on a solid base deeper than the floor of a hollow one allows', () => {
    const config = { ...textured(ROUND_32), solid: true }
    expect(maxTextureDepth(config)).toBeGreaterThan(config.floorThickness)
  })

  it('makes the joints on a solid base shallower when thicker magnets deepen the pockets', () => {
    const config = { ...textured(ROUND_32), solid: true, texture: { ...textured(ROUND_32).texture, depth: 1.4 } }
    const thicker = { ...config, magnets: { ...config.magnets, thickness: 3 } }
    expect(fitToSize(thicker).texture.depth).toBeCloseTo(maxTextureDepth(thicker))
  })

  it.for(CASES)('roofs every joint of a solid $label base at 45° except its narrow apex', ({ pattern, size }) => {
    expect(overhangs(build({ ...textured(size, true, pattern), solid: true }).mesh)).toEqual(['flat at 0.49'])
  })

  it.for(IRREGULAR)('lays %s out differently for another variation', (pattern) => {
    const config = textured(ROUND_32, false, pattern)
    const other = { ...config, texture: { ...config.texture, seed: 2, irregularity: 100 } }
    expect(build(other).stats.volume).not.toBeCloseTo(
      build({ ...config, texture: { ...config.texture, irregularity: 100 } }).stats.volume,
      3,
    )
  })

  it('lays a perfect honeycomb with no irregularity', () => {
    const area = (cell: [number, number][]) =>
      cell.reduce((total, [x, y], k) => total + x * cell[(k + 1) % cell.length][1] - cell[(k + 1) % cell.length][0] * y, 0) / 2
    const inner = textureCells({ pattern: 'hex', scale: 6, seed: 1, irregularity: 0 }, 20, 20).filter((cell) =>
      cell.every(([x, y]) => Math.hypot(x, y) < 12),
    )
    expect(new Set(inner.map((cell) => area(cell).toFixed(6)))).toEqual(new Set([((Math.sqrt(3) / 2) * 36).toFixed(6)]))
  })

  it("takes the new pattern's size when the size was left at its default", () => {
    const flagstone = textured(ROUND_32).texture
    expect(withPattern(flagstone, 'plank').scale).toBe(DEFAULT_TEXTURE.plank.scale)
  })

  it('keeps a size the user set when the pattern changes', () => {
    expect(withPattern({ ...textured(ROUND_32).texture, scale: 12 }, 'plank').scale).toBe(12)
  })

  it('makes a base solid when a relief is picked', () => {
    expect(solidWithPattern(false, 'flagstone', 'rock')).toBe(true)
  })

  it('makes a relief base hollow again when it goes back to joints', () => {
    expect(solidWithPattern(true, 'rock', 'flagstone')).toBe(false)
  })

  it('leaves a base hollow when a joint pattern is picked', () => {
    expect(solidWithPattern(false, 'none', 'flagstone')).toBe(false)
  })

  it('keeps a relief base hollow when the user chose that', () => {
    expect(solidWithPattern(false, 'rock', 'snow')).toBe(false)
  })

  it('keeps a plain base solid when the user chose that', () => {
    expect(solidWithPattern(true, 'none', 'flagstone')).toBe(true)
  })
})
