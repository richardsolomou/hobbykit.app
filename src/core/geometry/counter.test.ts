import type { Mesh } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { bounds, discImage, duplicateVertices, font, openEdges, vertices } from './geometry.test.utils'
import { loadManifold } from './manifold'
import type { CounterConfig, CounterPart, CounterPlateFace } from './types'
import {
  buildCounter,
  COUNTER_RANGES,
  counterLayout,
  counterName,
  counterParts,
  counterRange,
  defaultCounterConfig,
  MAX_COUNTER_SIZE,
  maximumCounterRelief,
  MIN_COUNTER_SIZE,
} from './counter'

let wasm: Awaited<ReturnType<typeof loadManifold>>

beforeAll(async () => {
  wasm = await loadManifold()
})

const counter = (changes: Partial<CounterConfig> = {}): CounterConfig => ({ ...defaultCounterConfig(), ...changes })
const build = (config: CounterConfig) => buildCounter(wasm, config, font)
const part = (name: CounterPart, changes: Partial<CounterConfig> = {}, dial?: number) => build(counter({ ...changes, part: name, dial }))
const face = (changes: Partial<CounterPlateFace>): CounterPlateFace => ({ ...defaultCounterConfig().left, ...changes })
const lowest = (key: keyof typeof COUNTER_RANGES) => COUNTER_RANGES[key][0]
const highest = (key: keyof typeof COUNTER_RANGES) => COUNTER_RANGES[key][1]
const CONFIGS: [string, Partial<CounterConfig>][] = [
  ['the default', {}],
  ['the smallest', { size: MIN_COUNTER_SIZE }],
  ['the largest', { size: MAX_COUNTER_SIZE }],
  ['engraved digits', { digits: 'engraved' }],
  ['raised digits', { digits: 'raised', relief: 0.7 }],
  ['raised digits at the smallest size', { digits: 'raised', size: MIN_COUNTER_SIZE, relief: 0.55 }],
  ['the deepest inlay', { relief: highest('relief'), inlay: highest('inlay') }],
  ['the deepest lead-in', { leadIn: highest('leadIn'), pressFit: 0.1 }],
  ['the deepest lead-in at the smallest size', { leadIn: highest('leadIn'), size: MIN_COUNTER_SIZE }],
  ['the loosest fits', { pressFit: highest('pressFit'), dialClearance: highest('dialClearance'), click: lowest('click') }],
  ['the tightest fits at the smallest size', { size: MIN_COUNTER_SIZE, dialClearance: lowest('dialClearance'), click: highest('click') }],
  ['one dial from 1 to 16', { dials: 1, faces: 16, first: 1 }],
  ['three dials', { dials: 3 }],
  ['four dials of six', { dials: 4, faces: 6, first: 1 }],
  ['twenty numbers counting down', { faces: 20, first: 1, countDown: true }],
  ['seven raised numbers', { dials: 1, faces: 7, digits: 'raised', relief: 0.7 }],
  ['plate artwork and pointers', { left: face({ text: 'Life' }), right: face({ text: 'Poison', image: discImage() }), mark: 'pointer' }],
  ['engraved plate artwork', { digits: 'engraved', left: face({ text: 'Life' }) }],
  ['third-colour plates without marks', { plateFilament: 3, mark: 'none' }],
]

/** Reference volumes of the default parts, colour included. */
const REFERENCE_VOLUMES: [CounterPart, number][] = [
  ['axle', 4342.77],
  ['left', 3576.23],
  ['dial', 5429.12],
]

function withSolids<T>(meshes: Mesh[], measure: (...solids: InstanceType<typeof wasm.Manifold>[]) => T): T {
  const solids = meshes.map((mesh) => new wasm.Manifold(mesh))
  try {
    return measure(...solids)
  } finally {
    for (const solid of solids) solid.delete()
  }
}
const volumeOf = (mesh: Mesh | undefined) => (mesh ? withSolids([mesh], (solid) => solid.volume()) : 0)
const bodiesIn = (mesh: Mesh) =>
  withSolids([mesh], (solid) => {
    const bodies = solid.decompose()
    for (const body of bodies) body.delete()
    return bodies.length
  })
const overlap = (a: Mesh, b: Mesh) =>
  withSolids([a, b], (first, second) => {
    const shared = first.intersect(second)
    const volume = shared.volume()
    shared.delete()
    return volume
  })

/**
 * Downward faces steeper than 45°, other than on the plate, the ceilings over a dial's digits, whose inlay fills them
 * as it prints or which bridge no more than a digit's stroke, out past `digits` from the axis, and the ceilings of a
 * plate's engraved artwork, no higher than `recess` above the plate.
 */
function unsupported(mesh: Mesh, { digits, recess }: { digits?: number; recess?: number }) {
  const points = vertices(mesh)
  let count = 0
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    const [a, b, c] = [0, 1, 2].map((corner) => points[mesh.triVerts[index + corner]])
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const length = Math.hypot(...normal)
    if (length < 1e-9 || Math.max(a[2], b[2], c[2]) < 1e-6) continue
    if (normal[2] / length >= -Math.SQRT1_2 - 1e-3) continue
    if (digits !== undefined && [a, b, c].every(([x, y]) => Math.hypot(x, y) > digits)) continue
    if (recess !== undefined && [a, b, c].every(([, , z]) => z <= recess + 1e-6)) continue
    count++
  }
  return count
}

describe('buildCounter', () => {
  it('makes an axle, two plates and a dial for each count', () => {
    expect(counterParts(counter()).map(({ name }) => name)).toEqual(['axle', 'left-plate', 'right-plate', 'dial-1', 'dial-2'])
  })

  describe.each(CONFIGS)('with %s', (_config, changes) => {
    const config = counter(changes)
    const scale = config.size / 34.95
    /** A face's narrowest apothem, which more faces push out, less everything cut below it. */
    const digitFloor =
      scale * (16.6 + 1.06 * (config.faces - 10)) - (config.digits === 'inlaid' ? config.relief + config.inlay : config.relief) - 0.1
    const parts = counterParts(config)

    describe.each(parts.map(({ part: name, dial, name: label }) => [label, name, dial] as const))('the %s', (_label, name, dial) => {
      const built = () => part(name, changes, dial)

      it('prints as one solid body', () => {
        expect(bodiesIn(built().mesh)).toBe(1)
      })

      it('stands on the plate', () => {
        expect(bounds(built().mesh).min[2]).toBeCloseTo(0, 6)
      })

      it('prints without supports', () => {
        expect(unsupported(built().mesh, name === 'dial' ? { digits: digitFloor } : name === 'axle' ? {} : { recess: 0.6 })).toBe(0)
      })

      it('leaves no two vertices at one position', () => {
        expect(duplicateVertices(built().mesh)).toBe(0)
      })

      it('exports watertight once welded', () => {
        expect(openEdges(built().mesh)).toBe(0)
      })

      it('keeps its second colour out of its body', () => {
        const { mesh, inserts } = built()

        expect(inserts ? overlap(mesh, inserts) : 0).toBeLessThan(1e-3)
      })
    })

    it('assembles parts that touch only where the bulbs press on the axle', () => {
      const total = parts.reduce((sum, { part: name, dial }) => sum + volumeOf(part(name, changes, dial).mesh), 0)
      const { mesh, third } = build(config)

      expect(total - volumeOf(mesh) - volumeOf(third)).toBeLessThan(2.5 * config.dials * scale ** 3)
    })

    it.each([
      ['assembled', false],
      ['exploded', true],
    ])('frames the %s counter around all its parts', (_name, exploded) => {
      const { mesh, inserts, third } = build({ ...config, exploded })
      const { width, length, height, minZ } = counterLayout({ ...config, exploded })
      const outside = [mesh, inserts, third]
        .flatMap((solid) => (solid ? vertices(solid) : []))
        .filter(
          // Float32 vertices land within 1e-5 of a 40mm figure.
          ([x, y, z]) => Math.abs(x) > width / 2 + 1e-4 || Math.abs(y) > length / 2 + 1e-4 || z < minZ - 1e-4 || z > minZ + height + 1e-4,
        )

      expect(outside).toEqual([])
    })

    it('separates every part when exploded', () => {
      const { mesh, third } = build({ ...config, exploded: true })

      expect(bodiesIn(mesh) + (third ? bodiesIn(third) : 0)).toBe(parts.length)
    })
  })

  it.each(REFERENCE_VOLUMES)('builds the %s within 1%% of its reference volume', (name, volume) => {
    const { mesh, inserts } = part(name)
    expect(Math.abs(volumeOf(mesh) + volumeOf(inserts) - volume) / volume).toBeLessThan(0.01)
  })

  it('prints the top-row mark and the digits in the second colour', () => {
    expect(
      counterParts(counter())
        .filter(({ part: name, dial }) => part(name, {}, dial).inserts)
        .map(({ name }) => name),
    ).toEqual(['left-plate', 'right-plate', 'dial-1', 'dial-2'])
  })

  it('mirrors the right dial from the left', () => {
    expect(volumeOf(part('dial', {}, 1).mesh)).toBeCloseTo(volumeOf(part('dial', {}, 0).mesh), 1)
  })

  it.each([
    ['axle', 23.6],
    ['left', 4],
  ] as const)('keeps the height of the %s', (name, height) => {
    const { min, max } = bounds(part(name).mesh)

    expect(max[2] - min[2]).toBeCloseTo(height, 3)
  })

  it.each([
    ['a lone dial', { dials: 1 }, 0],
    ['the middle dial of three', { dials: 3 }, 1],
    ['an inner middle dial of four', { dials: 4 }, 2],
  ] as const)('makes %s straight, as wide as the outer dials meet', (_name, changes, dial) => {
    const { min, max } = bounds(part('dial', changes, dial).mesh)

    expect(max[0] - min[0]).toBeCloseTo((34.95 * 16.64349) / 17.47501, 3)
  })

  it.each([34.95, 28, 50])('makes each dial %smm across its flats at its widest', (size) => {
    const { min, max } = bounds(part('dial', { size }).mesh)

    expect(max[0] - min[0]).toBeCloseTo(size, 3)
  })

  it.each([
    [{}, 'counter-34.95mm'],
    [{ size: 42 }, 'counter-42mm'],
    [{ dials: 1, faces: 16, first: 1 }, 'counter-1-16-34.95mm'],
    [{ dials: 3 }, 'counter-000-999-34.95mm'],
    [{ dials: 2, faces: 6, first: 1 }, 'counter-2x1-6-34.95mm'],
  ] as const)('names %o %s', (changes, name) => {
    expect(counterName(counter(changes))).toBe(name)
  })

  it.each([
    [{}, '00–99'],
    [{ dials: 1, faces: 16, first: 1 }, '1–16'],
    [{ dials: 4, faces: 6, first: 1 }, '4×1–6'],
  ] as const)('reads %o as %s', (changes, range) => {
    expect(counterRange(counter(changes))).toBe(range)
  })

  it('opens each socket by the press fit', () => {
    expect(volumeOf(part('left', { pressFit: 0.2 }).mesh)).toBeLessThan(volumeOf(part('left').mesh))
  })

  it("opens each dial's bore by the play", () => {
    expect(volumeOf(part('dial', { dialClearance: 0.25 }).mesh)).toBeLessThan(volumeOf(part('dial').mesh))
  })

  /** How close to the axis the dial reaches halfway up, which is the tip of its bulb. */
  const bulbReach = (changes: Partial<CounterConfig>) =>
    withSolids([part('dial', changes, 1).mesh], (solid) => {
      const { min, max } = solid.boundingBox()
      const section = solid.slice((min[2] + max[2]) / 2)
      const [cx, cy] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2]
      const reach = Math.min(
        ...section
          .toPolygons()
          .flat()
          .map(([x, y]) => Math.hypot(x - cx, y - cy)),
      )
      section.delete()
      return reach
    })

  it('moves the bulb in by the click, as a real distance at any size', () => {
    expect(bulbReach({ size: 50 }) - bulbReach({ size: 50, click: 0.2 })).toBeCloseTo(0.2, 2)
  })

  it.each(['axle', 'left'] as const)('chamfers the %s by the lead-in', (name) => {
    expect(volumeOf(part(name, { leadIn: 0.4 }).mesh)).toBeLessThan(volumeOf(part(name).mesh))
  })

  it('keeps the axle its full length with a lead-in', () => {
    const { min, max } = bounds(part('axle', { leadIn: 0.4 }).mesh)

    expect(max[2] - min[2]).toBeCloseTo(23.6, 3)
  })

  it("keeps the axle's first layer from spreading", () => {
    expect(counterParts(counter()).find(({ part: name }) => name === 'axle')?.settings).toEqual({ elefant_foot_compensation: '0.3' })
  })

  it('prints engraved digits and the marks in one filament', () => {
    expect(counterParts(counter()).filter(({ part: name, dial }) => part(name, { digits: 'engraved' }, dial).inserts)).toEqual([])
  })

  it('stops raised digits short of the marks on the plates', () => {
    expect([
      maximumCounterRelief(counter({ digits: 'raised' })),
      maximumCounterRelief(counter({ digits: 'raised', size: MIN_COUNTER_SIZE })),
    ]).toEqual([0.7, 0.55])
  })

  it('raises the digits in the second filament without cutting the dial', () => {
    const { mesh, inserts } = part('dial', { digits: 'raised' })

    expect([volumeOf(mesh) > volumeOf(part('dial', { digits: 'engraved' }).mesh), inserts !== undefined]).toEqual([true, true])
  })

  it('carries every number on its own face', () => {
    // 1 to 9 are one digit each and 10 to 16 two.
    expect(bodiesIn(part('dial', { dials: 1, faces: 16, first: 1 }).inserts!)).toBe(9 + 2 * 7)
  })

  it('puts the same numbers the other way round when counting down', () => {
    const up = part('dial', { faces: 12, first: 1 }).inserts!
    const down = part('dial', { faces: 12, first: 1, countDown: true }).inserts!

    expect([volumeOf(down), overlap(up, down) < volumeOf(up) - 1]).toEqual([expect.closeTo(volumeOf(up), 1), true])
  })

  it('makes a dial bigger for more numbers', () => {
    const across = (faces: number) => {
      const { min, max } = bounds(part('dial', { faces, first: 1 }).mesh)
      return max[1] - min[1]
    }

    expect(across(16)).toBeGreaterThan(across(10))
  })

  it('leaves the rib off a middle dial, which has no plate to run against', () => {
    expect(volumeOf(part('dial', { dials: 3 }, 1).mesh)).toBeLessThan(volumeOf(part('dial', { dials: 3 }, 0).mesh))
  })

  it('marks the top row with a pointer in less second colour than the bar', () => {
    expect(volumeOf(part('left', { mark: 'pointer' }).inserts)).toBeLessThan(volumeOf(part('left').inserts))
  })

  it('leaves the plates in one colour with no mark and no artwork', () => {
    expect(part('left', { mark: 'none' }).inserts).toBeUndefined()
  })

  it('inlays text in the left plate alone', () => {
    const changes = { left: face({ text: 'Life' }) }

    expect([volumeOf(part('left', changes).inserts) > volumeOf(part('left').inserts), volumeOf(part('right', changes).inserts)]).toEqual([
      true,
      volumeOf(part('right').inserts),
    ])
  })

  it('inlays an image in a plate', () => {
    expect(volumeOf(part('right', { right: face({ image: discImage() }) }).inserts)).toBeGreaterThan(volumeOf(part('right').inserts))
  })

  it("keeps a plate's artwork flush with its outer face", () => {
    const { inserts } = part('left', { left: face({ text: 'Life' }), mark: 'none' })

    expect([bounds(inserts!).min[2], bounds(inserts!).max[2]]).toEqual([expect.closeTo(0, 6), expect.closeTo(0.6, 6)])
  })

  it('prints the plates in the third filament when asked', () => {
    const plates = counterParts(counter({ plateFilament: 3 })).filter(({ part: name }) => name === 'left' || name === 'right')

    expect([plates.map(({ filament }) => filament), build(counter({ plateFilament: 3 })).third !== undefined]).toEqual([[3, 3], true])
  })

  it('stands the assembly on the plates’ feet', () => {
    expect(bounds(build(counter()).mesh).min[2]).toBeCloseTo(0, 6)
  })

  it('reports the assembled width and height exactly', () => {
    const { mesh, inserts } = build(counter())
    const points = [...vertices(mesh), ...vertices(inserts!)]
    const span = (axis: number) => Math.max(...points.map((p) => p[axis])) - Math.min(...points.map((p) => p[axis]))
    const { width, height } = counterLayout(counter())

    expect([span(0), span(2)].map((value) => value.toFixed(3))).toEqual([width, height].map((value) => value.toFixed(3)))
  })
})
