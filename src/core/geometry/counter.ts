import type { CrossSection, Manifold, ManifoldToplevel, Mat4, Vec3 } from 'manifold-3d'
import type { Font } from 'opentype.js'
import type { BuildResult } from './base'
import { trimNumber } from './outline'
import { previewSegmentsFor } from './quality'
import { GLYPH_FILL, polygonsWidth, textPolygons, type Polygon } from './text'
import type { CounterConfig, CounterPart } from './types'

const PLA_DENSITY = 1.24e-3
const FACES = 10
const HALF_FACE = Math.PI / FACES
/** Height of each insert's tile under its raised digit; the 3MF changes filament above it. */
export const COUNTER_TILE_BASE = 1
/** How far a digit or arrow stands up from its tile, which leaves it flush with the face. */
const RELIEF = 0.6
/** Depth of the pocket each insert presses into. */
export const COUNTER_POCKET = COUNTER_TILE_BASE + RELIEF
/** Depth of the digits and arrows cut into the faces when there are no inserts. */
export const COUNTER_ENGRAVING = 1
/** Pockets and engravings start this far outside the face they cut, so no face is left coplanar. */
const OVERCUT = 0.05
/** Least material between neighbouring cuts, and around each pocket on a face. */
const WALL = 1
/** Radius of the flat top of each click bump. */
const BUMP_TIP = 0.3
const HUB_RADIUS = 2.5
/** How far the hub's barb stands proud of the shaft; it seats in a 45° countersink. */
const BARB = 0.5
/** Straight length of the barb's lead-in inside the countersink. */
const LEAD = 1.2
const BARB_TIP = HUB_RADIUS - 0.4
const SLOT_WIDTH = 1.2
const SLOT_LENGTH = LEAD + BARB + 6
/** How far the hub's root runs into the units drum, so the two are one body. */
const HUB_ROOT = 1
/** Space between a digit or arrow and the edge of its tile. */
const DIGIT_MARGIN = 1
const MIN_DIGIT_HEIGHT = 3
/** Thickness of the pointer between the drums, wide enough for an arrow at each drum. */
const POINTER = 6
/** Each arrow on the pointer's top: its length along the hub, its width across it, and its gap from the middle. */
const ARROW_LENGTH = 1.9
const ARROW_WIDTH = 6
const ARROW_GAP = 0.5
/** Space between inserts laid out on their plate. */
const INSERT_SPACING = 3
/** How far an exploded preview lifts each tile clear of its pocket. */
const EXPLODED_LIFT = 4
/** How far an exploded preview moves each drum along the hub, as a share of its width; three quarters keeps the barb clear of both the tens drum and the pointer, even at the narrowest drums. */
const EXPLODED_SPREAD = 0.75

type DetentFit = Pick<CounterConfig, 'clearance' | 'click'>
/** A bump clears the play either side of the pointer, then pushes the barb in by `click` as it rides over. */
const bumpHeight = (config: DetentFit) => 2 * config.clearance + config.click
/** Bumps and dimples are 45° cones, so this is also each dimple's depth. */
const bumpRadius = (config: DetentFit) => BUMP_TIP + bumpHeight(config)
/** The most the barb can give before it leaves its countersink. */
export const MAX_COUNTER_CLICK = BARB - 0.1
export const MIN_COUNTER_DRUM_WIDTH = 6

export function counterParts(config: Pick<CounterConfig, 'inserts'>): { part: CounterPart; name: string }[] {
  return [
    { part: 'tens', name: 'tens-drum' },
    { part: 'pointer', name: 'pointer' },
    { part: 'units', name: 'units-drum' },
    ...(config.inserts ? [{ part: 'inserts' as const, name: 'inserts' }] : []),
  ]
}

export function defaultCounterConfig(): CounterConfig {
  return {
    kind: 'counter',
    drumDiameter: 34,
    drumWidth: 12,
    inserts: true,
    insertClearance: 0.05,
    clearance: 0.2,
    click: 0.3,
    segments: previewSegmentsFor(34),
  }
}

/** The ten bumps on a drum sit this far from the hub, as far out as the face pockets allow. */
const bumpBearing = (flat: number, config: DetentFit) => flat - COUNTER_POCKET - WALL - bumpRadius(config)

/**
 * Large enough for a readable digit, and an arrow, on each tile, and for ten dimples to ring the hub
 * inside the pointer's pocket without touching each other.
 */
export function minimumCounterDrumDiameter(config: DetentFit): number {
  const radius = bumpRadius(config)
  const bearing = Math.max(HUB_RADIUS + config.clearance + WALL + radius, (2 * radius + WALL) / (2 * Math.sin(HALF_FACE)))
  return Math.max(
    (Math.max(MIN_DIGIT_HEIGHT, ARROW_WIDTH) + 2 * (DIGIT_MARGIN + WALL)) / Math.sin(HALF_FACE),
    (2 * (bearing + radius + WALL + COUNTER_POCKET)) / Math.cos(HALF_FACE),
  )
}

/** The assembly's extents, which grow to take in an exploded view's spread drums and lifted tiles. */
export function counterLayout(config: Pick<CounterConfig, 'drumDiameter' | 'drumWidth' | 'clearance' | 'exploded'>) {
  const corner = config.drumDiameter / 2
  const flat = corner * Math.cos(HALF_FACE)
  const spread = config.exploded ? EXPLODED_SPREAD * config.drumWidth : 0
  const lift = config.exploded ? EXPLODED_LIFT : 0
  return {
    corner,
    flat,
    spread,
    lift,
    pointer: POINTER,
    width: 2 * (config.drumWidth + config.clearance + spread) + POINTER,
    length: 2 * (corner + lift),
    height: 2 * (flat + lift),
    minZ: -lift,
  }
}

export function counterName(config: CounterConfig): string {
  return `counter-${trimNumber(config.drumDiameter)}mm`
}

const mat4 = (x: Vec3, y: Vec3, z: Vec3, t: Vec3 = [0, 0, 0]): Mat4 => [...x, 0, ...y, 0, ...z, 0, ...t, 1] as Mat4
/** Turns a solid built along Z to lie along X: (a, b, h) becomes (h, b, -a). */
const ALONG_X = mat4([0, 0, -1], [0, 1, 0], [1, 0, 0])
/** A point in the YZ plane as the 2D coordinate that lands there once extruded and turned along X. */
const yz = (y: number, z: number): [number, number] => [-z, y]
/** A positive angle rolls the top of a drum towards the front, which is -Y. */
const rollX = (degrees: number): Mat4 => {
  const a = (degrees * Math.PI) / 180
  return mat4([1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)])
}

/**
 * Two ten-sided drums, tens on the left and units on the right, each resting on one flat with its
 * count on the opposite flat on top. A hub grows from the units drum and snaps through a pointer and
 * the tens drum, which both turn on it. The pointer's wide flat base keeps it upright while the drums
 * roll, so the arrows on its top always mark the count. Ten bumps on each drum's inner face drop into
 * ten dimples in the pointer's face; turning a drum lifts them out against the hub's barb, so every
 * count clicks into place and stays there.
 *
 * The assembly is modelled the way it is used, hub along X, front towards -Y. Each part then prints
 * on its outer face: the tens drum over its countersink, the pointer on either side, and the units
 * drum with its hub standing up. Each face carries a pocket for an insert: a tile the size of the
 * pocket with the digit raised on it, printed face up so the filament changes once, above the tile.
 */
export function buildCounter(wasm: ManifoldToplevel, config: CounterConfig, font: Font): BuildResult {
  const { CrossSection, Manifold } = wasm
  const trash: { delete: () => void }[] = []
  const own = <T extends { delete: () => void }>(value: T): T => {
    trash.push(value)
    return value
  }

  try {
    if (config.clearance <= 0) throw new Error('The drums need clearance to turn')
    if (config.drumDiameter < minimumCounterDrumDiameter(config) - 1e-6) {
      throw new Error('Drums are too small for their digits — enlarge them')
    }
    if (config.drumWidth < MIN_COUNTER_DRUM_WIDTH - 1e-6) throw new Error('Drums are too narrow for the hub — widen them')
    if (config.click <= 0 || config.click > MAX_COUNTER_CLICK + 1e-6) {
      throw new Error(`The click must be more than 0 and at most ${MAX_COUNTER_CLICK}mm, or the barb lets go`)
    }
    if (config.insertClearance < 0) throw new Error('Inserts need a clearance of zero or more')

    const { segments, drumWidth: width } = config
    const { corner, flat, pointer: thickness, spread, lift } = counterLayout(config)
    const gap = config.clearance
    /** From the middle to the inner face of each drum. */
    const inner = thickness / 2 + gap
    const bore = HUB_RADIUS + config.clearance
    const sink = bore + BARB
    const alongX = (solid: Manifold) => own(solid.transform(ALONG_X))
    const revolve = (profile: Polygon) => own(own(CrossSection.ofPolygons([profile], 'NonZero')).revolve(segments))
    const rectangle = (x: number, y: number) => own(CrossSection.square([2 * x, 2 * y], true))

    // A drum from x = 0 to its width, which the units drum keeps with its inner face at x = 0.
    const decagon = Array.from({ length: FACES }, (_corner, i) => {
      const angle = Math.PI / 2 + HALF_FACE + (2 * Math.PI * i) / FACES
      return yz(corner * Math.cos(angle), corner * Math.sin(angle))
    })
    const drumBody = alongX(own(own(CrossSection.ofPolygons([decagon], 'NonZero')).extrude(width)))
    const boreHole = (length: number) => alongX(own(own(Manifold.cylinder(length + 2, bore, bore, segments)).translate([0, 0, -1])))

    // Ten 45° cones from x = -OVERCUT towards +X, under the hub and rolled to every flat's bearing.
    const radius = bumpRadius(config)
    const detents = (height: number, tip: number) => {
      const cone = alongX(
        own(own(Manifold.cylinder(height + OVERCUT, radius + OVERCUT, tip, segments)).translate([bumpBearing(flat, config), 0, -OVERCUT])),
      )
      return own(Manifold.union(Array.from({ length: FACES }, (_detent, k) => own(cone.transform(rollX((360 * k) / FACES))))))
    }
    /** Each stands from just inside its drum's face, so the two fuse without sharing a face. */
    const bumps = detents(bumpHeight(config), BUMP_TIP)
    /** The bumps' cone run on to its apex, so a seated bump stays `clearance` off it all round. */
    const dimples = detents(radius, 0)

    // The tens drum's outer face is at x = 0 as built, where the hub's barb seats in a countersink.
    const countersink = alongX(
      revolve([
        [0, -OVERCUT],
        [sink, -OVERCUT],
        [sink, LEAD],
        // The cone runs on inside the bore, so its rim never lands on the bore wall.
        [bore - BARB, LEAD + 2 * BARB],
        [0, LEAD + 2 * BARB],
      ]),
    )
    const tensBody = own(
      own(
        own(Manifold.union([drumBody, own(bumps.translate([width, 0, 0]))])).subtract(own(Manifold.union([boreHole(width), countersink]))),
      ).translate([-inner - width, 0, 0]),
    )

    // The pointer follows the drums' outline above the hub and stands on a base as long as theirs.
    const pointerOutline = [
      ...Array.from({ length: FACES / 2 + 1 }, (_corner, i) => {
        const angle = (2 * Math.PI * i) / FACES
        return yz(corner * Math.cos(angle), corner * Math.sin(angle))
      }),
      yz(-corner, -flat),
      yz(corner, -flat),
    ]
    const pointerDimples = own(
      Manifold.union([
        own(dimples.translate([-thickness / 2, 0, 0])),
        own(own(dimples.mirror([1, 0, 0])).translate([thickness / 2, 0, 0])),
      ]),
    )
    const pointerBody = own(
      own(
        alongX(own(own(CrossSection.ofPolygons([pointerOutline], 'NonZero')).extrude(thickness))).translate([-thickness / 2, 0, 0]),
      ).subtract(own(Manifold.union([own(boreHole(thickness).translate([-thickness / 2, 0, 0])), pointerDimples]))),
    )
    // An arrow each way along the pointer's top flat, at the digit on top of each drum.
    const arrows = own(
      CrossSection.ofPolygons(
        [1, -1].map((aim) => [
          [aim * ARROW_GAP, -ARROW_WIDTH / 2],
          [aim * (ARROW_GAP + ARROW_LENGTH), 0],
          [aim * ARROW_GAP, ARROW_WIDTH / 2],
        ]),
        'NonZero',
      ),
    )

    // Hub along Z from its root inside the units drum to the barb at the tens drum's outer face.
    const hubLength = width + 2 * inner + HUB_ROOT
    const hubProfile = revolve([
      [0, 0],
      [HUB_RADIUS, 0],
      [HUB_RADIUS, hubLength - LEAD - BARB],
      [HUB_RADIUS + BARB, hubLength - LEAD],
      [BARB_TIP, hubLength],
      [0, hubLength],
    ])
    const slot = own(
      own(Manifold.cube([SLOT_WIDTH, 2 * (HUB_RADIUS + BARB) + 2, SLOT_LENGTH + 1], true)).translate([
        0,
        0,
        hubLength - SLOT_LENGTH / 2 + 0.5,
      ]),
    )
    const hub = own(own(alongX(own(hubProfile.subtract(slot))).mirror([1, 0, 0])).translate([inner + HUB_ROOT, 0, 0]))
    const unitsBumps = own(bumps.mirror([1, 0, 0]))
    const unitsBody = own(Manifold.union([own(own(Manifold.union([drumBody, unitsBumps])).translate([inner, 0, 0])), hub]))

    const digitPolygons = Array.from({ length: FACES }, (_digit, digit) => textPolygons(font, String(digit), 1))
    const faceSide = 2 * corner * Math.sin(HALF_FACE)
    /** Half the size of each face's pocket, along the hub and across the face. */
    const pocketX = width / 2 - WALL
    const pocketY = faceSide / 2 - WALL
    const digitHeight = Math.min(
      2 * (pocketY - DIGIT_MARGIN),
      (2 * (pocketX - DIGIT_MARGIN)) / Math.max(...digitPolygons.map(polygonsWidth)),
    )
    if (2 * (pocketY - DIGIT_MARGIN) < ARROW_WIDTH) throw new Error('Arrows would not fit the pointer — enlarge the drums')
    if (digitHeight < MIN_DIGIT_HEIGHT) throw new Error('Digits would be too small to read — enlarge the drums')
    const digitSections = digitPolygons.map((polygons) =>
      own(
        CrossSection.ofPolygons(
          polygons.map((p) => p.map(([u, v]): [number, number] => [u * digitHeight, v * digitHeight])),
          GLYPH_FILL,
        ),
      ),
    )
    /** The pointer's pocket runs right through it, so its tile is held between the drums. */
    const pointerPocketX = thickness / 2 + OVERCUT

    /** What one face carries, built from the face plane down, before it is rolled and moved onto its face. */
    const pocket = (x: number) => own(rectangle(x, pocketY).extrude(COUNTER_POCKET + OVERCUT))
    const engraving = (section: CrossSection) => own(section.extrude(COUNTER_ENGRAVING + OVERCUT))
    const shrunk = (section: CrossSection) =>
      config.insertClearance > 0 ? own(own(section.offset(-config.insertClearance, 'Miter', 2)).simplify(1e-3)) : section
    /** Raised from just inside the tile, so the two fuse without sharing a face. */
    /** A tile prints as two parts, its base in the body's filament and its raised mark in the second, which no layer shares. */
    const tileBase = (x: number) => own(shrunk(rectangle(x, pocketY)).extrude(COUNTER_TILE_BASE))
    const tileMark = (mark: CrossSection) => own(own(mark.extrude(RELIEF)).translate([0, 0, COUNTER_TILE_BASE]))
    const below = (solid: Manifold, depth: number) => own(solid.translate([0, 0, -depth]))
    const cut = (x: number, mark: CrossSection) =>
      config.inserts ? below(pocket(x), COUNTER_POCKET) : below(engraving(mark), COUNTER_ENGRAVING)

    /** Digit `k` on the flat rolled `36k°` from the top, so rolling a drum on by one flat counts one. */
    const digits = (centre: number, solid: (mark: CrossSection) => Manifold, rise = 0) =>
      own(
        Manifold.union(
          digitSections.map((section, digit) =>
            own(own(solid(section).translate([centre, 0, flat + rise])).transform(rollX((360 * digit) / FACES))),
          ),
        ),
      )
    const unitsCentre = inner + width / 2
    const tens = own(tensBody.subtract(digits(-unitsCentre, (mark) => cut(pocketX, mark))))
    const units = own(unitsBody.subtract(digits(unitsCentre, (mark) => cut(pocketX, mark))))
    const pointer = own(pointerBody.subtract(own(cut(pointerPocketX, arrows).translate([0, 0, flat]))))
    const pointerTileX = thickness / 2

    const bodies = { tens, pointer, units }
    /** Each part on its outer face; the assembly keeps the frame it is used in. */
    const printed: Record<keyof typeof bodies, Mat4> = {
      tens: mat4([0, 0, 1], [0, 1, 0], [-1, 0, 0]),
      pointer: mat4([0, 0, 1], [0, 1, 0], [-1, 0, 0]),
      units: mat4([0, 0, -1], [0, 1, 0], [1, 0, 0]),
    }
    /** Every tile lies face up, a row of 0–9 for each drum and then the arrows, so pieces are easy to find. */
    const insertPlate = () => {
      const rows = [digitSections, digitSections].map((row) => row.map((mark) => ({ base: tileBase(pocketX), mark: tileMark(mark) })))
      rows.push([{ base: tileBase(pointerTileX), mark: tileMark(arrows) }])
      let y = 0
      const placed = rows.flatMap((row) => {
        let x = 0
        let depth = 0
        const moved = row.map(({ base, mark }) => {
          const { min, max } = base.boundingBox()
          const shift: Vec3 = [x - min[0], y - max[1], 0]
          x += max[0] - min[0] + INSERT_SPACING
          depth = Math.max(depth, max[1] - min[1])
          return { base: own(base.translate(shift)), mark: own(mark.translate(shift)) }
        })
        y -= depth + INSERT_SPACING
        return moved
      })
      const bases = own(Manifold.union(placed.map(({ base }) => base)))
      const { min, max } = bases.boundingBox()
      const centre: Vec3 = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, 0]
      return { bases: own(bases.translate(centre)), marks: own(own(Manifold.union(placed.map(({ mark }) => mark))).translate(centre)) }
    }
    const onPlate = (solid: Manifold) => {
      const { min, max } = solid.boundingBox()
      return own(solid.translate([-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]]))
    }

    const part = config.part
    let solid: Manifold
    let inserts: Manifold | undefined
    if (part === 'inserts') ({ bases: solid, marks: inserts } = insertPlate())
    else if (part) solid = onPlate(own(bodies[part].transform(printed[part])))
    else {
      const onFaces = (drum: (mark: CrossSection) => Manifold, pointerMark: Manifold) => [
        digits(-unitsCentre - spread, drum, lift),
        own(pointerMark.translate([0, 0, flat + lift])),
        digits(unitsCentre + spread, drum, lift),
      ]
      const inPocket = (tilePart: Manifold) => below(tilePart, COUNTER_POCKET)
      const bases = config.inserts ? onFaces(() => inPocket(tileBase(pocketX)), inPocket(tileBase(pointerTileX))) : []
      const drums = [own(tens.translate([-spread, 0, 0])), pointer, own(units.translate([spread, 0, 0]))]
      solid = own(own(Manifold.union([...drums, ...bases])).translate([0, 0, flat]))
      inserts = config.inserts
        ? own(own(Manifold.union(onFaces((mark) => inPocket(tileMark(mark)), inPocket(tileMark(arrows))))).translate([0, 0, flat]))
        : undefined
    }

    const volume = solid.volume() + (inserts?.volume() ?? 0)
    const triangles = solid.numTri() + (inserts?.numTri() ?? 0)
    return {
      mesh: solid.getMesh(),
      ...(inserts ? { inserts: inserts.getMesh() } : {}),
      stats: { triangles, volume, grams: volume * PLA_DENSITY, solid: volume > 0 && triangles > 0 },
    }
  } finally {
    for (const value of trash) value.delete()
  }
}
