import { readFileSync } from 'node:fs'
import type { Mesh } from 'manifold-3d'
import { parse, type Font } from 'opentype.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifold } from './manifold'
import type { CounterConfig, CounterPart } from './types'
import {
  buildCounter,
  defaultCounterConfig,
  minimumCounterDrumDiameter,
  MAX_COUNTER_CLICK,
  MIN_COUNTER_DRUM_WIDTH,
  COUNTER_ENGRAVING,
  COUNTER_POCKET,
  COUNTER_TILE_BASE,
  counterLayout,
  counterName,
  counterParts,
} from './counter'

let wasm: Awaited<ReturnType<typeof loadManifold>>
let font: Font

beforeAll(async () => {
  wasm = await loadManifold()
  const bytes = readFileSync('src/assets/fonts/oswald-700.woff')
  font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
})

const counter = (changes: Partial<CounterConfig> = {}): CounterConfig => ({ ...defaultCounterConfig(), ...changes })
const build = (config: CounterConfig) => buildCounter(wasm, config, font)
const part = (config: CounterConfig, name: CounterPart) => build({ ...config, part: name })
const BODIES = ['tens', 'pointer', 'units'] as const

function solidOf(mesh: Mesh) {
  return new wasm.Manifold(mesh)
}

const CONFIGS: [string, CounterConfig][] = [
  ['the default counter', counter()],
  ['the smallest drums', counter({ drumDiameter: Math.ceil(minimumCounterDrumDiameter(counter()) * 10) / 10 })],
  ['the narrowest drums', counter({ drumWidth: MIN_COUNTER_DRUM_WIDTH })],
  ['the lightest click', counter({ click: 0.1 })],
  ['the loosest fit and firmest click', counter({ clearance: 0.6, click: MAX_COUNTER_CLICK })],
  ['a loose fit', counter({ clearance: 0.4 })],
  ['no inserts', counter({ inserts: false })],
  ['inserts with no clearance', counter({ insertClearance: 0 })],
  ['an exploded view', counter({ exploded: true })],
  ['an exploded view of the narrowest drums', counter({ drumWidth: MIN_COUNTER_DRUM_WIDTH, exploded: true })],
]

function vertices(mesh: Mesh) {
  return Array.from({ length: mesh.vertProperties.length / mesh.numProp }, (_value, index) =>
    [0, 1, 2].map((axis) => mesh.vertProperties[index * mesh.numProp + axis]),
  )
}

function bounds(mesh: Mesh) {
  const points = vertices(mesh)
  return {
    min: [0, 1, 2].map((axis) => Math.min(...points.map((p) => p[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...points.map((p) => p[axis]))),
  }
}

function duplicatePositions(mesh: Mesh) {
  const keys = vertices(mesh).map((vertex) => vertex.join(','))
  return keys.length - new Set(keys).size
}

/**
 * Downward faces steeper than 45° from vertical, other than the face on the plate and the ceilings
 * of pockets, which bridge no more than a pocket's depth.
 */
function unsupportedFaces(mesh: Mesh, recessed: (point: number[]) => boolean) {
  const points = vertices(mesh)
  let count = 0
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    const [a, b, c] = [0, 1, 2].map((vertex) => points[mesh.triVerts[index + vertex]])
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const length = Math.hypot(...normal)
    if (length === 0) continue
    if (Math.max(a[2], b[2], c[2]) < 1e-6) continue
    if (normal[2] / length >= -Math.SQRT1_2 - 1e-3) continue
    if ([a, b, c].every(recessed)) continue
    count++
  }
  return count
}

/**
 * Face pockets sit in the outer layer of a drum's flats, and the arrows in the pointer's top, which prints facing -X.
 */
function recessedIn(config: CounterConfig, name: CounterPart, mesh: Mesh) {
  if (name === 'inserts') return () => false
  const { flat } = counterLayout(config)
  const depth = config.inserts ? COUNTER_POCKET : COUNTER_ENGRAVING
  const { min, max } = bounds(mesh)
  if (name === 'pointer') {
    return (point: number[]) => point[0] <= min[0] + depth + 1e-3
  }
  const [cx, cy] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2]
  return (point: number[]) => Math.hypot(point[0] - cx, point[1] - cy) >= (flat - depth) * 0.999
}

describe('buildCounter', () => {
  describe.each(CONFIGS)('%s', (_name, config) => {
    const parts = counterParts(config).map(({ part: name }) => name)

    it('assembles parts that never touch', () => {
      const total = parts.reduce((sum, name) => sum + part(config, name).stats.volume, 0)

      expect(build(config).stats.volume).toBeCloseTo(total, 3)
    })

    it.each(BODIES)('prints the %s as one solid body', (name) => {
      const solid = new wasm.Manifold(part(config, name).mesh)
      const bodies = solid.decompose()

      expect(bodies.length).toBe(1)
      for (const body of bodies) body.delete()
      solid.delete()
    })

    it.each(parts)('stands the %s on the plate', (name) => {
      expect(bounds(part(config, name).mesh).min[2]).toBeCloseTo(0, 6)
    })

    it.each(parts)('prints the %s without supports', (name) => {
      const { mesh } = part(config, name)

      expect(unsupportedFaces(mesh, recessedIn(config, name, mesh))).toBe(0)
    })

    it.each(parts)('leaves no two vertices of the %s at one position', (name) => {
      expect(duplicatePositions(part(config, name).mesh)).toBe(0)
    })

    it('leaves no two vertices of the assembled inserts at one position', () => {
      const { inserts } = build(config)

      expect(inserts ? duplicatePositions(inserts) : 0).toBe(0)
    })

    it('keeps the inserts out of the drums they sit in', () => {
      const { mesh, inserts } = build(config)
      if (!inserts) return
      const [body, fill] = [solidOf(mesh), solidOf(inserts)]
      const overlap = body.intersect(fill)

      // Each tile rests on its pocket floor, which rounding can leave a sliver under.
      expect(overlap.volume()).toBeCloseTo(0, 3)
      for (const value of [body, fill, overlap]) value.delete()
    })
  })

  it('grows the hub just far enough to reach through the pointer and the tens drum', () => {
    const config = counter()

    expect(bounds(part(config, 'units').mesh).max[2]).toBeCloseTo(counterLayout(config).width, 4)
  })

  it('rests the assembly on its bottom flats', () => {
    expect(bounds(build(counter()).mesh).min[2]).toBeCloseTo(0, 6)
  })

  it('reports the assembled size', () => {
    const config = counter()
    const { min, max } = bounds(build(config).mesh)
    const { width, length, height } = counterLayout(config)

    expect([max[0] - min[0], max[1] - min[1], max[2] - min[2]].map((value) => value.toFixed(3))).toEqual(
      [width, length, height].map((value) => value.toFixed(3)),
    )
  })

  it('shrinks each insert by its clearance', () => {
    const inserts = (insertClearance: number) => part(counter({ insertClearance }), 'inserts').stats.volume

    expect(inserts(0.1)).toBeLessThan(inserts(0))
  })

  it('makes every tile exactly as thick as its pocket is deep', () => {
    const { inserts } = part(counter(), 'inserts')

    expect(inserts && bounds(inserts).max[2]).toBeCloseTo(COUNTER_POCKET, 6)
  })

  it('raises the marks from the top of the tile bases, so no layer prints both filaments', () => {
    const { inserts } = part(counter(), 'inserts')

    expect(inserts && bounds(inserts).min[2]).toBeCloseTo(COUNTER_TILE_BASE, 6)
  })

  it('ends the tile bases where the marks start', () => {
    expect(bounds(part(counter(), 'inserts').mesh).max[2]).toBeCloseTo(COUNTER_TILE_BASE, 6)
  })

  it('prints a tile for every face and one for the arrows', () => {
    const solid = solidOf(part(counter(), 'inserts').mesh)
    const pieces = solid.decompose()

    expect(pieces.length).toBe(20 + 1)
    for (const piece of pieces) piece.delete()
    solid.delete()
  })

  it('shows the inserts in place', () => {
    expect(build(counter()).inserts).toBeDefined()
  })

  it('leaves the recesses open without inserts', () => {
    expect(build(counter({ inserts: false })).inserts).toBeUndefined()
  })

  it('exports no inserts part without inserts', () => {
    expect(counterParts({ inserts: false }).map(({ part: name }) => name)).not.toContain('inserts')
  })

  it('refuses drums too small for their digits and hub', () => {
    const config = counter()

    expect(() => build({ ...config, drumDiameter: minimumCounterDrumDiameter(config) - 0.5 })).toThrow(/too small/)
  })

  it('refuses drums too narrow for the hub', () => {
    expect(() => build(counter({ drumWidth: MIN_COUNTER_DRUM_WIDTH - 0.5 }))).toThrow(/too narrow/)
  })

  it('refuses a click the barb cannot give', () => {
    expect(() => build(counter({ click: MAX_COUNTER_CLICK + 0.05 }))).toThrow(/barb lets go/)
  })

  it('refuses no click', () => {
    expect(() => build(counter({ click: 0 }))).toThrow(/barb lets go/)
  })

  /** A bump clears the play either side of the pointer, then rides `click` further, on a 45° cone with a 0.3mm tip. */
  const bumpHeight = (config: CounterConfig) => 2 * config.clearance + config.click
  const bump = (config: CounterConfig) => {
    const height = bumpHeight(config)
    const [base, tip] = [0.3 + height, 0.3]
    return (Math.PI * height * (base * base + base * tip + tip * tip)) / 3
  }
  const dimple = (config: CounterConfig) => (Math.PI * (0.3 + bumpHeight(config)) ** 3) / 3
  const [light, firm] = [counter({ click: 0.1 }), counter({ click: MAX_COUNTER_CLICK })]

  it.each(['tens', 'units'] as const)('raises ten bumps on the %s drum', (name) => {
    expect(part(firm, name).stats.volume - part(light, name).stats.volume).toBeCloseTo(10 * (bump(firm) - bump(light)), 1)
  })

  it('sinks ten dimples in each face of the pointer', () => {
    expect(part(light, 'pointer').stats.volume - part(firm, 'pointer').stats.volume).toBeCloseTo(20 * (dimple(firm) - dimple(light)), 1)
  })

  it('fits the default drums above their minimum size', () => {
    const config = counter()

    expect(minimumCounterDrumDiameter(config)).toBeLessThanOrEqual(config.drumDiameter)
  })

  it('pulls every part and tile apart when exploded', () => {
    const solid = new wasm.Manifold(build(counter({ exploded: true })).mesh)
    const bodies = solid.decompose()

    expect(bodies.length).toBe(BODIES.length + 21)
    for (const body of bodies) body.delete()
    solid.delete()
  })

  it('keeps every part whole when exploded', () => {
    expect(build(counter({ exploded: true })).stats.volume).toBeCloseTo(build(counter()).stats.volume, 3)
  })

  it('spreads the drums along the hub when exploded', () => {
    const across = (config: CounterConfig) => bounds(build(config).mesh).max[0] - bounds(build(config).mesh).min[0]

    expect(across(counter({ exploded: true }))).toBeGreaterThan(across(counter()) + 10)
  })

  it('names the file after the drum size', () => {
    expect(counterName(counter({ drumDiameter: 32.5 }))).toBe('counter-32.5mm')
  })
})
