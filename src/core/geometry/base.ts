import type { ManifoldToplevel, Vec3 } from 'manifold-3d'
import { buildResult, withOwner, type BuildResult } from './build'
import type { Font } from 'opentype.js'
import { fitLabel, LABEL_MARGIN, labelAngles, LABEL_MAX_LENGTH, labelText, pointInContours, type LabelCircle } from './label'
import { baseOutline, defaultLabel } from './outline'
import { edgeOnPlate, MIN_PROFILE_WALL, profileInsetAt, profileSteps } from './profile'
import { curveTolerance } from './quality'
import { MIN_POCKET_ROOF, reliefBlock } from './relief'
import { isRelief, MIN_TEXTURE_FLOOR, textureCut } from './texture'
import { GLYPH_FILL, polygonsWidth, textPolygons, type Polygon } from './text'
import type { BaseConfig, MagnetLayout, ShapeKind } from './types'

/** How far each magnet pocket's mouth flares out, and how deep. */
export const POCKET_CHAMFER = 0.4

/** Room round raised letters on a solid base, recessed so the face stays flat. */
export const LABEL_PLAQUE = 0.8

/** Beyond this width-to-length ratio, magnets line up along the long axis instead of on a ring. */
const ELONGATED_RATIO = 1.35

interface MagnetPositionOptions {
  ellipticalRow?: boolean
  layout?: MagnetLayout
}

/** Whether magnets sit on a ring, rather than in a row down the long axis. */
export function magnetsRing(width: number, length: number): boolean {
  return Math.max(width, length) / Math.min(width, length) <= ELONGATED_RATIO
}

export function supportsFivePocketCross(shape: ShapeKind, width: number): boolean {
  return shape === 'round' && width >= 50
}

/**
 * Magnet centres. Round-ish footprints get a ring so the pull is even; long ones
 * get a row down the major axis, which is where the material actually is.
 */
export function magnetPositions(
  count: number,
  halfWidth: number,
  halfLength: number,
  clear: number,
  options: MagnetPositionOptions = {},
): LabelCircle[] {
  if (count <= 0) return []
  const short = Math.min(halfWidth, halfLength)
  const radius = Math.max(Math.min(short * 0.5, short - clear), 0)
  if (options.layout === 'five-cross') {
    return [
      { x: 0, y: 0, r: 0 },
      { x: 0, y: radius, r: radius },
      { x: -radius, y: 0, r: radius },
      { x: 0, y: -radius, r: radius },
      { x: radius, y: 0, r: radius },
    ]
  }
  if (count === 1) return [{ x: 0, y: 0, r: 0 }]

  const long = Math.max(halfWidth, halfLength)
  if (!magnetsRing(halfWidth, halfLength)) {
    const ellipseReach = long * Math.sqrt(Math.max(0, 1 - (clear / short) ** 2)) - clear
    const reach = Math.max(options.ellipticalRow ? ellipseReach : long - clear, 0)
    const alongX = halfWidth >= halfLength
    return Array.from({ length: count }, (_, i) => {
      const t = (2 * i) / (count - 1) - 1
      return { x: alongX ? t * reach : 0, y: alongX ? 0 : t * reach, r: 0 }
    })
  }

  return Array.from({ length: count }, (_, i) => {
    const a = Math.PI / 2 + (2 * Math.PI * i) / count
    return { x: radius * Math.cos(a), y: radius * Math.sin(a), r: radius }
  })
}

const TAU = 2 * Math.PI
/** Shortest angle between two bearings, ignoring which way round. */
function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

/**
 * Rib bearings, phased to run through as many bosses as the counts allow.
 *
 * A rib and a boss on the same bearing merge into one connected feature, which
 * is worth more than it looks: the boss gets a gusset at its root, where the
 * bending moment from a magnet being peeled off a tray is highest; the slicer
 * gets one connected perimeter network per layer instead of isolated islands;
 * and the clear floor collects into a few wide gaps rather than twice as many
 * narrow ones, which is what lets the size label stay large.
 *
 * Supporting the span *between* bosses would be the alternative, but a boss is a
 * 7mm inclusion in a plate tens of millimetres across — it barely supports the
 * membrane around it, so the phase makes almost no difference to floor
 * stiffness either way. That leaves the reasons above, and they all point one
 * direction.
 *
 * Counts that share no factor cannot all line up: three ribs against four
 * bosses can only ever hit one. Phases are drawn from the boss bearings
 * themselves so the alignment is exact rather than nearly, and the one that
 * lands closest to the rest wins. A single central magnet has no bearing at
 * all, and every rib meets it at the centre regardless.
 */
export function ribAngles(count: number, magnets: LabelCircle[]): number[] {
  if (count <= 0) return []
  const spacing = TAU / count
  const spokes = (phase: number) => Array.from({ length: count }, (_, i) => phase + spacing * i)

  const bosses = magnets.filter((m) => Math.hypot(m.x, m.y) > 1e-6).map((m) => Math.atan2(m.y, m.x))
  if (bosses.length === 0) return spokes(Math.PI / 2)

  let best = bosses[0]
  let closest = Infinity
  for (const phase of bosses) {
    const arranged = spokes(phase)
    const missed = bosses.reduce((total, boss) => total + Math.min(...arranged.map((s) => angleBetween(s, boss))), 0)
    if (missed < closest) {
      closest = missed
      best = phase
    }
  }
  return spokes(best)
}

/** Approximates each rib spoke as overlapping discs, so label fitting only sees circles. */
function ribObstacles(angles: number[], length: number, thickness: number): LabelCircle[] {
  if (!Number.isFinite(length) || length <= 0) return []
  const step = Math.max(0.4, thickness / 2)
  return angles.flatMap((a) => {
    const discs: LabelCircle[] = []
    for (let r = 0; r <= length; r += step) discs.push({ x: r * Math.cos(a), y: r * Math.sin(a), r: thickness / 2 })
    return discs
  })
}

export function buildBase(wasm: ManifoldToplevel, config: BaseConfig, font?: Font): BuildResult {
  const { CrossSection, Manifold } = wasm
  return withOwner((own) => {
    /*
     * Relief rises from the model face, which would overhang if it lay on the plate,
     * so a relief base turns over: model face up, with pockets and any well opening
     * onto the plate and their ceilings bridging. Every other base keeps the model
     * face on the plate, with the well opening upwards.
     */
    const faceUp = isRelief(config.texture.pattern)
    const hollow = !config.solid
    const wellDepth = config.height - config.floorThickness
    /** Where the well and everything standing in it start: on the plate when face up, on the floor otherwise. */
    const wellStart = faceUp ? 0 : config.floorThickness
    const textureDepth = config.texture.pattern === 'none' || faceUp ? 0 : config.texture.depth
    const pocketDepth = Math.min(config.magnets.thickness + config.magnets.depthClearance, hollow ? wellDepth : config.height)
    if (!hollow && config.magnets.count > 0 && config.height - pocketDepth < MIN_POCKET_ROOF - 1e-6) {
      throw new Error('Magnet pockets leave too little behind them — raise the base or use thinner magnets')
    }
    if (hollow && wellDepth < 0.2) throw new Error('No room left for a well — thin the floor')
    const tolerance = curveTolerance(Math.max(config.width, config.length), config.segments)
    const wallAtFloor =
      config.wallThickness -
      profileInsetAt(config.height, config.profile, config.profileSize, config.floorThickness, tolerance, edgeOnPlate(config))
    if (hollow && wallAtFloor < MIN_PROFILE_WALL - 1e-6) {
      throw new Error('Edge profile leaves too little wall at the well floor — reduce the edge size')
    }

    const outline = own(baseOutline(wasm, config))

    // Loft the body as the convex hull of the outline offset at each profile height.
    // Every supported footprint is convex, so the hull is exactly the intended solid.
    const points: Vec3[] = []
    for (const step of profileSteps(config.height, config.profile, config.profileSize, tolerance, !faceUp)) {
      const ring = step.inset > 0 ? own(outline.offset(-step.inset, 'Miter', 2, config.segments)) : outline
      for (const contour of ring.toPolygons()) {
        for (const [x, y] of contour) points.push([x, y, faceUp ? config.height - step.z : step.z])
      }
    }
    let solid = own(Manifold.hull(points))

    if (faceUp) {
      const modelInset = profileInsetAt(config.height, config.profile, config.profileSize, 0, tolerance)
      const modelFace = modelInset > 0 ? own(outline.offset(-modelInset, 'Miter', 2, config.segments)) : outline
      const relief = reliefBlock(wasm, config, modelFace, tolerance, own)
      if (relief) solid = own(solid.add(relief))
    }
    const texture = textureCut(wasm, config, outline, own)
    if (texture) solid = own(solid.subtract(texture))

    // A footprint narrower than twice the wall offsets away to nothing. Its bounds
    // come back infinite, which would send everything downstream to NaN.
    const wellOutline = own(outline.offset(-config.wallThickness, 'Miter', 2, config.segments))
    if (wellOutline.isEmpty()) throw new Error('Walls leave no room inside — thin the wall')

    const wellBounds = wellOutline.bounds()
    const halfWidth = (wellBounds.max[0] - wellBounds.min[0]) / 2
    const halfLength = (wellBounds.max[1] - wellBounds.min[1]) / 2
    const wellReach = Math.hypot(halfWidth, halfLength)

    if (hollow) {
      // Cut past the open face so no zero-thickness skin is left behind.
      const plug = own(wellOutline.extrude(wellDepth + 1))
      solid = own(solid.subtract(own(plug.translate([0, 0, faceUp ? -1 : config.floorThickness]))))
    }

    const pocketRadius = (config.magnets.diameter + config.magnets.clearance) / 2
    const bossRadius = pocketRadius + config.magnets.bossWall
    const fiveCross =
      config.magnets.layout === 'five-cross' && (config.magnets.patternVersion === 1 || supportsFivePocketCross(config.shape, config.width))
    const magnets = magnetPositions(config.magnets.count, halfWidth, halfLength, bossRadius + LABEL_MARGIN, {
      ellipticalRow: config.shape === 'oval',
      layout: fiveCross ? 'five-cross' : 'balanced',
    })

    /*
     * The boss carries the pocket the full depth of the well, and the pocket is cut
     * only as deep as the magnet plus its depth clearance, measured from the face
     * that meets the tray. The magnet can finish flush with that face while leaving
     * room for adhesive behind it.
     */
    if (hollow && magnets.length > 0) {
      const bossDisc = own(CrossSection.circle(bossRadius, config.segments))
      const bossColumn = own(bossDisc.extrude(wellDepth))
      for (const m of magnets) {
        solid = own(solid.add(own(bossColumn.translate([m.x, m.y, wellStart]))))
      }
    }

    // Single spokes from the centre outwards, phased to run through the bosses.
    // Intersecting the well stops them at the wall. Face up they would hang from
    // the ceiling, so they stand on the plate the full depth and shorten its bridges.
    const spokeAngles = hollow ? ribAngles(config.ribs.count, magnets) : []
    const ribHeight = faceUp ? wellDepth : Math.min(config.ribs.height, wellDepth)
    if (spokeAngles.length > 0 && ribHeight > 0) {
      const reach = wellReach + config.wallThickness
      const bar = own(CrossSection.square([reach, config.ribs.thickness], true))
      const spoke = own(bar.translate([reach / 2, 0]))
      let spokes = own(spoke.rotate((spokeAngles[0] * 180) / Math.PI))
      for (const a of spokeAngles.slice(1)) spokes = own(spokes.add(own(spoke.rotate((a * 180) / Math.PI))))
      // Ribs run a little way into the wall. Stopping them exactly on the well
      // boundary would leave the two surfaces tangent, which welds into a pinched
      // vertex in any tool that merges by position.
      const overlap = Math.min(0.4, config.wallThickness / 2)
      const ribLimit = own(wellOutline.offset(overlap, 'Miter', 2, config.segments))
      const trimmed = own(spokes.intersect(ribLimit))
      const column = own(trimmed.extrude(ribHeight))
      solid = own(solid.add(own(column.translate([0, 0, wellStart]))))
    }

    if (config.label.enabled && font) {
      const custom = config.label.text?.trim()
      if (custom && labelText(custom) !== custom) {
        throw new Error(`Label text must be at most ${LABEL_MAX_LENGTH} characters the font can draw`)
      }
      const text = custom || defaultLabel(config)
      const polys = textPolygons(font, text, config.label.height)
      // A hollow relief base engraves its well ceiling whatever the style, as raised letters would hang from it.
      const engraved = config.label.style === 'engraved' || (faceUp && hollow)
      // Raised letters on a solid base stand in a recess this far round them, so the face stays flat.
      const plaque = !hollow && !engraved ? LABEL_PLAQUE : 0
      if (polys.length > 0) {
        if (hollow && !faceUp && engraved && config.floorThickness - config.label.emboss - textureDepth < MIN_TEXTURE_FLOOR - 1e-6) {
          throw new Error('Engraved label cuts too far into the top — make it thinner or thicken the top')
        }
        const room = own(wellOutline.offset(-LABEL_MARGIN, 'Miter', 2, config.segments))
        const contours = room.toPolygons()
        const obstacles = [
          ...magnets.map((m) => ({ x: m.x, y: m.y, r: bossRadius })),
          ...ribObstacles(spokeAngles, wellReach, config.ribs.thickness),
        ]
        const width = polygonsWidth(polys)
        const fit = fitLabel(
          width + 2 * plaque,
          config.label.height + 2 * plaque,
          wellReach,
          (x, y) => pointInContours(contours, x, y),
          obstacles,
          labelAngles(spokeAngles, magnets),
        )
        if (fit) {
          const scaled: Polygon[] = polys.map((p) => p.map(([x, y]): [number, number] => [x * fit.scale, y * fit.scale]))
          let mark = own(own(CrossSection.ofPolygons(scaled, GLYPH_FILL)).translate([fit.x, fit.y]))
          if (plaque > 0) {
            const corner = plaque * fit.scale
            const inner = own(CrossSection.square([width * fit.scale, config.label.height * fit.scale], true))
            const recess = own(own(inner.offset(corner, 'Round', 2, config.segments)).translate([fit.x, fit.y]))
            mark = own(recess.subtract(mark))
          }
          if (faceUp) {
            // Cut into the face on the plate, or the well ceiling, mirrored so it reads from below.
            const depth = hollow ? Math.min(config.label.emboss, config.floorThickness - MIN_TEXTURE_FLOOR) : config.label.emboss
            const cut = own(own(mark.mirror([1, 0])).extrude(depth + 1))
            if (depth > 0) solid = own(solid.subtract(own(cut.translate([0, 0, (hollow ? wellDepth : 0) - 1]))))
          } else if (!hollow) {
            // Cut into the face that meets the tray, the top as it prints.
            const cut = own(mark.extrude(config.label.emboss + 1))
            solid = own(solid.subtract(own(cut.translate([0, 0, config.height - config.label.emboss]))))
          } else if (engraved) {
            // Clear of every rib and boss, so the cut can run on up through the well.
            const cut = own(mark.extrude(config.label.emboss + 1))
            solid = own(solid.subtract(own(cut.translate([0, 0, config.floorThickness - config.label.emboss]))))
          } else {
            const raised = own(mark.extrude(Math.min(config.label.emboss, wellDepth)))
            solid = own(solid.add(own(raised.translate([0, 0, config.floorThickness]))))
          }
        } else if (custom) {
          throw new Error('Label text does not fit this base — shorten it or reduce the label size')
        }
      }
    }

    // Pockets open on the face that meets the tray: the top of a base as it prints,
    // or the plate face of one printed face up.
    // Each mouth flares at 45° so a magnet finds its pocket when pressed in, and squashed first layers cannot pinch it.
    if (magnets.length > 0) {
      const chamfer = Math.min(POCKET_CHAMFER, pocketDepth / 2, hollow ? config.magnets.bossWall / 2 : POCKET_CHAMFER)
      const mouth = pocketRadius + chamfer + 1
      let drill = own(
        Manifold.revolve(
          [
            [
              [0, -pocketDepth],
              [pocketRadius, -pocketDepth],
              [pocketRadius, -chamfer],
              [mouth, 1],
              [0, 1],
            ],
          ],
          config.segments,
        ),
      )
      // Built opening upwards at z = 0; a base printed face up opens its pockets downwards instead.
      if (faceUp) drill = own(drill.mirror([0, 0, 1]))
      const z = faceUp ? 0 : config.height
      for (const m of magnets) {
        solid = own(solid.subtract(own(drill.translate([m.x, m.y, z]))))
      }
    }

    return buildResult(solid)
  })
}
