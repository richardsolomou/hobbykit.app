import { readFileSync } from 'node:fs'
import type { Mesh } from 'manifold-3d'
import { parse, type Font } from 'opentype.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadManifold } from './manifold'
import { polygonsWidth, textPolygons } from './text'
import type { CounterConfig, CounterPart, CounterTile } from './types'
import {
  buildCounter,
  defaultCounterConfig,
  MINIMUM_COUNTER_DRUM_DIAMETER,
  maximumCounterClick,
  MIN_COUNTER_CLICK,
  COUNTER_WIDEST_DIGIT,
  counterScale,
  counterDigitHeight,
  counterDrumWidth,
  COUNTER_ENGRAVING,
  COUNTER_POCKET,
  COUNTER_SOCKET,
  COUNTER_TILE_BASE,
  counterLayout,
  counterName,
  counterParts,
  counterTileLayout,
  COUNTER_BASE_DIAMETER,
} from './counter'

let wasm: Awaited<ReturnType<typeof loadManifold>>
let font: Font

beforeAll(async () => {
  wasm = await loadManifold()
  const bytes = readFileSync('src/assets/fonts/oswald-700.woff')
  font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
})

/** The base design with hubs on legs, which holds the tube the plainest way; larger sizes scale from it, and the default size and layout are covered on their own. */
const counter = (changes: Partial<CounterConfig> = {}): CounterConfig => ({
  ...defaultCounterConfig(),
  drumDiameter: COUNTER_BASE_DIAMETER,
  click: 0.7,
  layout: 'hubs',
  ...changes,
})
const build = (config: CounterConfig) => buildCounter(wasm, config, font)
const part = (config: CounterConfig, name: CounterPart) => build({ ...config, part: name })
const BODIES = ['left', 'right', 'tens', 'units'] as const

function solidOf(mesh: Mesh) {
  return new wasm.Manifold(mesh)
}

/** A bulb reaches a little past the bottom of its trough, which the assembly as modelled, with the arm unbent, overlaps. */
const NUB_OVERLAP = 2
const smallest = Math.ceil(MINIMUM_COUNTER_DRUM_DIAMETER * 10) / 10
const CONFIGS: [string, CounterConfig][] = [
  ['the base design', counter()],
  ['the default counter', defaultCounterConfig()],
  ['the smallest wheels', counter({ drumDiameter: smallest })],
  ['large wheels', counter({ drumDiameter: 40 })],
  ['the lightest click', counter({ click: MIN_COUNTER_CLICK })],
  ['the firmest click', counter({ click: maximumCounterClick(counter()) })],
  ['the loosest fit', counter({ clearance: 0.4 })],
  ['the full-size remake', counter({ drumDiameter: 39.6, click: 1.5 })],
  ['no inserts', counter({ digits: 'engraved' })],
  ['digits printed in the dial', counter({ digits: 'printed' })],
  ['digits printed in a third filament', counter({ digits: 'printed', digitFilament: 3 })],
  ['printed digits at full size', counter({ digits: 'printed', digitFilament: 3, drumDiameter: 39.6, click: 1.5 })],
  ['tiles in a third filament', counter({ digitFilament: 3 })],
  ['inserts with no clearance', counter({ insertClearance: 0 })],
  ['an exploded view', counter({ exploded: true })],
  ['no grip', counter({ grip: 0 })],
  ['a wide grip', counter({ grip: 10 })],
  ['hubs', counter({ layout: 'hubs' })],
  ['a frame and base', counter({ layout: 'centre' })],
  ['side knobs', counter({ layout: 'knobs' })],
  ['an enclosure', counter({ layout: 'enclosure' })],
  ['an enclosure at full size', counter({ layout: 'enclosure', drumDiameter: 39.6, click: 1.5 })],
  ['an exploded enclosure', counter({ layout: 'enclosure', exploded: true })],
  ['side knobs at full size', counter({ layout: 'knobs', drumDiameter: 39.6, click: 1.5 })],
  ['exploded side knobs', counter({ layout: 'knobs', exploded: true })],
  ['a frame and base at full size', counter({ layout: 'centre', drumDiameter: 39.6, click: 1.5 })],
  ['a frame and base with printed digits', counter({ layout: 'centre', digits: 'printed' })],
  ['an exploded frame and base', counter({ layout: 'centre', exploded: true })],
  ['exploded hubs', counter({ layout: 'hubs', exploded: true })],
  ['an exploded view of the smallest wheels', counter({ drumDiameter: smallest, exploded: true })],
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
 * Face pockets sit in the outer layer of a wheel's flats, and they bridge no more than a pocket's width.
 * A side piece's socket is printed open side down, and its ceiling is a ring only as wide as the tube's wall.
 */
function recessedIn(config: CounterConfig, name: CounterPart, mesh: Mesh) {
  if (name === 'left' || name === 'right') {
    const ceiling = counterScale(config) * COUNTER_SOCKET
    return (point: number[]) => Math.abs(point[2] - ceiling) < 1e-3
  }
  if (['inserts', 'axle', 'stand', 'frame', 'knob', 'bracket'].includes(name)) return () => false
  const { flat } = counterLayout(config)
  const depth = counterScale(config) * (config.digits === 'engraved' ? COUNTER_ENGRAVING : COUNTER_POCKET)
  const { min, max } = bounds(mesh)
  const [cx, cy] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2]
  return (point: number[]) => Math.hypot(point[0] - cx, point[1] - cy) >= (flat - depth) * 0.999
}

describe('buildCounter', () => {
  describe.each(CONFIGS)('%s', (_name, config) => {
    const parts = counterParts(config).map(({ part: name }) => name)

    it('assembles parts that touch only where a nub grips the axle', () => {
      const total = parts.reduce((sum, name) => sum + part(config, name).stats.volume, 0)

      // The nubs run the dial's whole length, grip included.
      const length = counterLayout(config).dialLength / counterDrumWidth(config)
      expect(total - build(config).stats.volume).toBeLessThan(NUB_OVERLAP * length * counterScale(config) ** 3)
    })

    it.each(parts.filter((name) => name !== 'inserts'))('prints the %s as one solid body', (name) => {
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
      expect(overlap.volume()).toBeLessThan(0.1 * counterScale(config) ** 3)
      for (const value of [body, fill, overlap]) value.delete()
    })
  })

  it('stands the assembly on the foot', () => {
    expect(bounds(build(counter()).mesh).min[2]).toBeCloseTo(0, 6)
  })

  it('reports the assembled size', () => {
    const config = counter()
    const { mesh, inserts } = build(config)
    const points = [...vertices(mesh), ...vertices(inserts!)]
    const [min, max] = [Math.min, Math.max].map((pick) => [0, 1, 2].map((axis) => pick(...points.map((p) => p[axis]))))
    const { width, length, height } = counterLayout(config)

    expect([max[0] - min[0], max[1] - min[1], max[2] - min[2]].map((value) => value.toFixed(3))).toEqual(
      [width, length, height].map((value) => value.toFixed(3)),
    )
  })

  it('holds the default caddy to about 48 by 46 by 44mm', () => {
    const { width, length, height } = counterLayout(defaultCounterConfig())

    expect([width, length, height].map(Math.round)).toEqual([48, 46, 44])
  })

  /** How many separate outlines a printed part has in the layer at a height. */
  const outlines = (config: CounterConfig, name: CounterPart, height: number) => {
    const solid = solidOf(part(config, name).mesh)
    const section = solid.slice(height)
    const pieces = section.decompose()
    const count = pieces.length
    for (const piece of pieces) piece.delete()
    section.delete()
    solid.delete()
    return count
  }
  const contours = (config: CounterConfig, name: CounterPart, height: number) => {
    const solid = solidOf(part(config, name).mesh)
    const section = solid.slice(height)
    const polygons = section.toPolygons()
    section.delete()
    solid.delete()
    return polygons
  }

  it('leaves each wheel in one piece, with its arms still joined at their roots', () => {
    expect(outlines(counter(), 'units', 1)).toBe(1)
  })

  it('frees a spring arm on each side of the wheel', () => {
    const config = counter()
    const holes = contours(config, 'units', 1).length

    // The outer edge, and one cavity holding both arms' crescents and the bore.
    expect(holes).toBeGreaterThanOrEqual(2)
  })

  it('stands a bulb into each trough between the lobes', () => {
    const volume = (click: number) => part(counter({ click }), 'units').stats.volume

    // A deeper trough moves each bulb further in, so more of it stands clear of the arm.
    expect(volume(0.6)).toBeGreaterThan(volume(0.15))
  })

  it('cuts ten troughs into the tube to the click depth', () => {
    const config = counter()
    const reach = (contour: [number, number][]) => Math.max(...contour.map(([x]) => x)) - Math.min(...contour.map(([x]) => x))
    const [outline] = contours(config, 'left', 10).sort((a, b) => reach(b as [number, number][]) - reach(a as [number, number][]))
    const centre = [outline.reduce((sum, [x]) => sum + x, 0) / outline.length, outline.reduce((sum, [, y]) => sum + y, 0) / outline.length]
    const radii = outline.map(([x, y]) => Math.hypot(x - centre[0], y - centre[1]))

    expect(Math.max(...radii) - Math.min(...radii)).toBeCloseTo(config.click, 1)
  })

  it('frames each number with raised bands at both ends of an open dial', () => {
    const areaAt = (height: number) => {
      const solid = solidOf(part(counter(), 'units').mesh)
      const section = solid.slice(height)
      const area = section.area()
      section.delete()
      solid.delete()
      return area
    }

    expect(areaAt(0.25)).toBeGreaterThan(areaAt(counterDrumWidth(counter()) / 2))
  })

  it('leaves a boss standing inside the socket of the right hub to fill the tube', () => {
    expect(outlines(counter(), 'right', 0.1)).toBe(2)
  })

  it('leaves the tube hollow', () => {
    expect(contours(counter(), 'left', 10).length).toBe(2)
  })

  it('makes the tube part of the left hub, standing up from it as it prints', () => {
    expect(counterParts(counter()).map(({ part: name }) => name)).not.toContain('axle')
  })

  it('stops the tube inside the socket of the right hub', () => {
    const config = counter()
    const { max } = bounds(part(config, 'left').mesh)
    const { width } = counterLayout(config)

    // Laid on its outer face, the left hub and its tube reach no further than the far face of the right hub.
    expect(max[2]).toBeLessThan(width)
  })

  it('inlays a bracket flush with the top of each side piece to mark the top row', () => {
    const config = counter()
    const { rise, flat } = counterLayout(config)

    expect(bounds(build({ ...config, digits: 'engraved' }).inserts!).max[2]).toBeCloseTo(rise + flat, 5)
  })

  it.each(['left', 'right'] as const)('prints the %s side in one filament, with no bracket of its own', (name) => {
    expect(part(counter(), name).inserts).toBeUndefined()
  })

  it('makes a bracket for each side as a part of its own', () => {
    expect(counterParts(counter()).filter(({ part: name }) => name === 'bracket')).toEqual([
      { part: 'bracket', name: 'left-bracket' },
      { part: 'bracket', name: 'right-bracket' },
    ])
  })

  it('changes a bracket to the second filament at the height a tile changes to its mark', () => {
    const { inserts } = part(counter(), 'bracket')

    expect(bounds(inserts!).min[2]).toBeCloseTo(COUNTER_TILE_BASE, 6)
  })

  it('prints the bracket as one body', () => {
    const solid = solidOf(part(counter(), 'bracket').mesh)
    const pieces = solid.decompose()

    expect(pieces.length).toBe(1)
    for (const piece of pieces) piece.delete()
    solid.delete()
  })

  it('leaves room round the bracket in its slot', () => {
    const { mesh, inserts } = build(counter({ digits: 'engraved' }))
    const [body, brackets] = [solidOf(mesh), solidOf(inserts!)]
    const overlap = body.intersect(brackets)

    expect(overlap.volume()).toBeLessThan(1e-6)
    for (const value of [body, brackets, overlap]) value.delete()
  })

  it.each([
    ['tiles', 'tens'],
    ['tiles', 'units'],
    ['engraved', 'tens'],
    ['engraved', 'units'],
  ] as const)('prints the %s %s dial in one filament, ribs and all', (digits, name) => {
    const { inserts, third } = part(counter({ digits }), name)

    expect([inserts, third]).toEqual([undefined, undefined])
  })

  it('makes the digits press-in tiles in the second filament by default', () => {
    expect([defaultCounterConfig().digits, defaultCounterConfig().digitFilament]).toEqual(['tiles', 2])
  })

  it('makes no tiles when the digits are printed in the dial', () => {
    expect(counterParts(counter({ digits: 'printed' })).map(({ part: name }) => name)).not.toContain('inserts')
  })

  it('prints dial digits in the second filament by default', () => {
    const { inserts, third } = part(counter({ digits: 'printed' }), 'units')

    expect([inserts === undefined, third]).toEqual([false, undefined])
  })

  it('moves dial digits to the third filament', () => {
    const { inserts, third } = part(counter({ digits: 'printed', digitFilament: 3 }), 'units')

    expect([inserts, third === undefined]).toEqual([undefined, false])
  })

  it('moves tile marks to the third filament', () => {
    const tiles = part(counter({ digitFilament: 3 }), 'inserts')

    expect([tiles.inserts, tiles.third === undefined]).toEqual([undefined, false])
  })

  it('cuts printed digits a pocket deep, filled exactly by the digit', () => {
    const config = counter({ digits: 'printed', digitFilament: 3 })
    const { mesh, third } = part(config, 'units')
    const [body, digits] = [solidOf(mesh), solidOf(third!)]
    const overlap = body.intersect(digits)

    expect(overlap.volume()).toBeLessThan(0.01)
    for (const value of [body, digits, overlap]) value.delete()
  })

  it('caps the click at what the arms can flex', () => {
    expect(maximumCounterClick(counter())).toBeCloseTo(0.71, 6)
  })

  it('leaves solid barrel on all four sides of each pocket to grip its tile', () => {
    const config = counter()
    const { flat } = counterLayout(config)
    const body = solidOf(part(config, 'units').mesh)
    // Across the pockets the barrel's corners still reach the surface; with no walls, it would stop at the pocket floor.
    const section = body.slice(counterDrumWidth(config) - 2)
    const contourPoints = section.toPolygons()
    const reach = Math.max(...contourPoints.flat().map(([x, y]) => Math.hypot(x, y)))
    section.delete()
    body.delete()

    expect(reach).toBeGreaterThan(flat)
  })

  it('sizes the barrel for the widest digit in the font', () => {
    const widest = Math.max(...Array.from({ length: 10 }, (_digit, digit) => polygonsWidth(textPolygons(font, String(digit), 1))))

    expect(widest).toBeLessThanOrEqual(COUNTER_WIDEST_DIGIT)
  })

  it('runs the lines above and below each digit to the edges of its tile', () => {
    const { mesh, inserts } = build({ ...counter(), part: 'inserts', tile: 1 })
    const across = ({ min, max }: ReturnType<typeof bounds>) => [max[0] - min[0], max[1] - min[1]].map((value) => value.toFixed(3))

    expect(across(bounds(inserts!))).toEqual(across(bounds(mesh)))
  })

  describe('scaling up', () => {
    const large = counter({ drumDiameter: 36 })
    const span = (config: CounterConfig, axis: number) => {
      const { mesh, inserts } = build(config)
      const points = [...vertices(mesh), ...vertices(inserts!)].map((p) => p[axis])
      return Math.max(...points) - Math.min(...points)
    }

    it('leaves the design at its base size', () => {
      expect(counterScale(counter())).toBe(1)
    })

    it('scales nothing below the base size', () => {
      expect(counterScale(counter({ drumDiameter: 16 }))).toBe(1)
    })

    it('doubles the digits at twice the base size', () => {
      expect(counterDigitHeight(large)).toBeCloseTo(2 * counterDigitHeight(counter()), 6)
    })

    it('keeps each tile the same real gap inside its pocket', () => {
      // The grip is a real length, so it is left out of a comparison that doubles everything else.
      const tiles = counterTileLayout({ ...large, grip: 0 })
      const base = counterTileLayout({ ...large, grip: 0, drumDiameter: 18 })

      expect(tiles[1].x - tiles[0].x).toBeCloseTo(2 * (base[1].x - base[0].x) + 2 * 0.05, 6)
    })

    it('builds the size its layout reports', () => {
      expect(span(large, 0)).toBeCloseTo(counterLayout(large).width, 3)
    })

    it('still allows the same click, as a real distance', () => {
      expect(() => build(counter({ drumDiameter: 36, click: 0.4 }))).not.toThrow()
    })
  })

  it('makes the default digits over 7mm tall', () => {
    expect(counterDigitHeight(defaultCounterConfig())).toBeGreaterThan(7)
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

  it('prints a tile for every face', () => {
    const solid = solidOf(part(counter(), 'inserts').mesh)
    const pieces = solid.decompose()

    expect(pieces.length).toBe(20)
    for (const piece of pieces) piece.delete()
    solid.delete()
  })

  it('prints a single tile on its own', () => {
    const solid = solidOf(build({ ...counter(), part: 'inserts', tile: 3 }).mesh)
    const pieces = solid.decompose()

    expect(pieces.length).toBe(1)
    for (const piece of pieces) piece.delete()
    solid.delete()
  })

  it('builds the tiles of its layout one at a time exactly as the full set does', () => {
    const config = counter()
    const tile = (choice: CounterTile) => build({ ...config, part: 'inserts', tile: choice }).stats.volume
    const total = counterTileLayout(config).reduce((sum, { tile: choice }) => sum + tile(choice), 0)

    expect(total).toBeCloseTo(part(config, 'inserts').stats.volume, 6)
  })

  it('shows the inserts in place', () => {
    expect(build(counter()).inserts).toBeDefined()
  })

  it('exports no inserts part without inserts', () => {
    expect(counterParts({ digits: 'engraved', layout: 'hubs' }).map(({ part: name }) => name)).not.toContain('inserts')
  })

  it('refuses wheels too small for their digits', () => {
    const config = counter()

    expect(() => build({ ...config, drumDiameter: MINIMUM_COUNTER_DRUM_DIAMETER - 0.5 })).toThrow(/too small/)
  })

  it('refuses a click the arms cannot give', () => {
    expect(() => build(counter({ drumDiameter: 40, click: maximumCounterClick(counter({ drumDiameter: 40 })) + 0.05 }))).toThrow(
      /click must be/,
    )
  })

  it('refuses no click', () => {
    expect(() => build(counter({ click: 0 }))).toThrow(/click must be/)
  })

  it('fits the default wheels above their minimum size', () => {
    expect(MINIMUM_COUNTER_DRUM_DIAMETER).toBeLessThanOrEqual(counter().drumDiameter)
  })

  it('pulls every part and tile apart when exploded', () => {
    const solid = new wasm.Manifold(build(counter({ exploded: true })).mesh)
    const bodies = solid.decompose()

    expect(bodies.length).toBe(BODIES.length + 20)
    for (const body of bodies) body.delete()
    solid.delete()
  })

  it('keeps every part whole when exploded', () => {
    expect(Math.abs(build(counter({ exploded: true })).stats.volume - build(counter()).stats.volume)).toBeLessThan(NUB_OVERLAP)
  })

  it('spreads the wheels along the axle when exploded', () => {
    const across = (config: CounterConfig) => bounds(build(config).mesh).max[0] - bounds(build(config).mesh).min[0]

    expect(across(counter({ exploded: true }))).toBeGreaterThan(across(counter()) + 10)
  })

  it.each([
    ['assembled', counter()],
    ['exploded', counter({ exploded: true })],
  ])('frames the %s counter around all its parts, tiles included', (_name, config) => {
    const { mesh, inserts } = build(config)
    const points = [...vertices(mesh), ...vertices(inserts!)]
    const { width, length, height, minZ } = counterLayout(config)
    const outside = points.filter(
      ([x, y, z]) => Math.abs(x) > width / 2 + 1e-6 || Math.abs(y) > length / 2 + 1e-6 || z < minZ - 1e-6 || z > minZ + height + 1e-6,
    )

    expect(outside).toEqual([])
  })

  it('names the file after the wheel size', () => {
    expect(counterName(counter({ drumDiameter: 32.5 }))).toBe('counter-32.5mm')
  })
})
