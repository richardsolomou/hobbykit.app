import type { CrossSection, Manifold, ManifoldToplevel, Vec2, Vec3 } from 'manifold-3d'
import type { BaseConfig, TexturePattern, TextureSpec } from './types'

/** Material kept between a joint's apex and the well above it. */
export const MIN_TEXTURE_FLOOR = 0.4
/** Plain band left round the face, outside the joint that runs round it. */
export const TEXTURE_BORDER = 1
/** How far each flagstone's centre may wander from its grid cell, as a fraction of the cell. */
const JITTER = 0.4
/** Planks run between these multiples of their width. */
const PLANK_LENGTHS = [3, 6]
/** The cut starts this far below the plate face, so it leaves no skin on it. */
const OVERCUT = 0.5
/**
 * Half the flat left along each joint's apex. Neighbouring stones would otherwise
 * meet along a shared edge, which welds into a non-manifold edge.
 */
const APEX = 0.01

/** Highest relief offered; the base's own height already gives the pockets their roof. */
export const MAX_RELIEF = 4

/** Every pattern a saved base may name. */
export const TEXTURE_PATTERNS: readonly TexturePattern[] = ['none', 'flagstone', 'tile', 'plank', 'plate', 'rock', 'earth', 'rubble']

export type ReliefPattern = Extract<TexturePattern, 'rock' | 'earth' | 'rubble'>

/** Patterns that rise from the model face, so the base prints face up instead of face down. */
export const isRelief = (pattern: TexturePattern): pattern is ReliefPattern =>
  pattern === 'rock' || pattern === 'earth' || pattern === 'rubble'

/** Sizes that read as the pattern on a 32mm base; a plank as wide as a flagstone reads as a plate. */
export const DEFAULT_TEXTURE: Record<TexturePattern, Omit<TextureSpec, 'pattern'>> = {
  none: { scale: 10, depth: 0.5 },
  flagstone: { scale: 10, depth: 0.5 },
  tile: { scale: 8, depth: 0.5 },
  plank: { scale: 5, depth: 0.5 },
  plate: { scale: 8, depth: 0.5 },
  rock: { scale: 8, depth: 1.5 },
  earth: { scale: 8, depth: 1.5 },
  rubble: { scale: 4, depth: 1.5 },
}

/** Switches pattern, carrying any value the user set and taking the new defaults for the rest. */
export function withPattern(texture: TextureSpec, pattern: TexturePattern): TextureSpec {
  const before = DEFAULT_TEXTURE[texture.pattern]
  const after = DEFAULT_TEXTURE[pattern]
  return {
    pattern,
    scale: texture.scale === before.scale ? after.scale : texture.scale,
    depth: texture.depth === before.depth ? after.depth : texture.depth,
  }
}

/** Joints must stop short of the recess; relief rises from a solid body and has no such limit. */
export const maxTextureDepth = (config: Pick<BaseConfig, 'floorThickness' | 'texture'>) =>
  isRelief(config.texture.pattern) ? MAX_RELIEF : Math.max(0, config.floorThickness - MIN_TEXTURE_FLOOR)

/** A fixed hash, so the same footprint always gets the same pattern. */
export function noise(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Clips a convex polygon to the side of the line through `[mx, my]` that `[nx, ny]` points away from. */
function clip(cell: Vec2[], [mx, my]: Vec2, [nx, ny]: Vec2): Vec2[] {
  const side = ([x, y]: Vec2) => (x - mx) * nx + (y - my) * ny
  const clipped: Vec2[] = []
  for (let k = 0; k < cell.length; k++) {
    const p = cell[k]
    const q = cell[(k + 1) % cell.length]
    const sp = side(p)
    const sq = side(q)
    if (sp <= 0) clipped.push(p)
    if (sp <= 0 !== sq <= 0) {
      const t = sp / (sp - sq)
      clipped.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return clipped
}

/**
 * Irregular flagstones covering a rectangle centred on the origin: the Voronoi
 * cells of a jittered grid of stone centres.
 */
function flagstones(scale: number, halfWidth: number, halfLength: number): Vec2[][] {
  const columns = Math.ceil(halfWidth / scale) + 1
  const rows = Math.ceil(halfLength / scale) + 1
  const site = (i: number, j: number): Vec2 => [
    (i + JITTER * (2 * noise(i, j, 0) - 1)) * scale,
    (j + JITTER * (2 * noise(i, j, 1) - 1)) * scale,
  ]

  const cells: Vec2[][] = []
  for (let i = -columns; i <= columns; i++) {
    for (let j = -rows; j <= rows; j++) {
      const own = site(i, j)
      const reach = 3 * scale
      let cell: Vec2[] = [
        [own[0] - reach, own[1] - reach],
        [own[0] + reach, own[1] - reach],
        [own[0] + reach, own[1] + reach],
        [own[0] - reach, own[1] + reach],
      ]
      // With the jitter under half a cell, every Voronoi neighbour lies within two cells.
      for (let di = -2; di <= 2; di++) {
        for (let dj = -2; dj <= 2; dj++) {
          if (di === 0 && dj === 0) continue
          const other = site(i + di, j + dj)
          cell = clip(cell, [(own[0] + other[0]) / 2, (own[1] + other[1]) / 2], [other[0] - own[0], other[1] - own[1]])
        }
      }
      cells.push(cell)
    }
  }
  return cells
}

/**
 * Rows of rectangles one `scale` deep, centred on the origin and running along X.
 * Each row starts at a joint at or before `-halfLong` and lays pieces until it
 * passes `halfLong`.
 */
function courses(
  scale: number,
  halfLong: number,
  halfShort: number,
  firstJoint: (row: number) => number,
  pieceLength: (row: number, piece: number) => number,
): Vec2[][] {
  const rows = Math.ceil(halfShort / scale + 0.5)
  const cells: Vec2[][] = []
  for (let j = -rows; j <= rows; j++) {
    const [v0, v1] = [(j - 0.5) * scale, (j + 0.5) * scale]
    for (let u = firstJoint(j), k = 0; u < halfLong; k++) {
      const next = u + pieceLength(j, k)
      cells.push([
        [u, v0],
        [next, v0],
        [next, v1],
        [u, v1],
      ])
      u = next
    }
  }
  return cells
}

/** The first joint of a row of `length` pieces centred on the origin, shifted by `shift` pieces. */
const alignedJoint = (halfLong: number, length: number, shift: number) => (shift - 0.5 - Math.ceil(halfLong / length + 0.5)) * length

/** Every convex, anticlockwise cell of a pattern covering a rectangle centred on the origin. */
export function textureCells(
  pattern: 'flagstone' | 'tile' | 'plank' | 'plate',
  scale: number,
  halfWidth: number,
  halfLength: number,
): Vec2[][] {
  if (pattern === 'flagstone') return flagstones(scale, halfWidth, halfLength)

  // Planks and plates run along the longer axis; a quarter turn keeps every cell anticlockwise.
  const along = halfWidth >= halfLength
  const [halfLong, halfShort] = along ? [halfWidth, halfLength] : [halfLength, halfWidth]
  const cells =
    pattern === 'tile'
      ? courses(
          scale,
          halfLong,
          halfShort,
          () => alignedJoint(halfLong, scale, 0),
          () => scale,
        )
      : pattern === 'plate'
        ? courses(
            scale,
            halfLong,
            halfShort,
            (row) => alignedJoint(halfLong, 2 * scale, (Math.abs(row) % 2) / 2),
            () => 2 * scale,
          )
        : courses(
            scale,
            halfLong,
            halfShort,
            (row) => -halfLong - PLANK_LENGTHS[1] * scale * noise(row, 0, 2),
            (row, piece) => scale * (PLANK_LENGTHS[0] + (PLANK_LENGTHS[1] - PLANK_LENGTHS[0]) * noise(row, piece, 3)),
          )
  return along ? cells : cells.map((cell) => cell.map(([u, v]): Vec2 => [-v, u]))
}

/**
 * The texture cut into the plate face, or nothing when the base is plain. Every
 * stone's sides stand at 45°, so the V joints between them have ceilings that
 * print without support even though they face the build plate.
 */
export function textureCut(
  wasm: ManifoldToplevel,
  config: BaseConfig,
  face: CrossSection,
  own: <T extends { delete: () => void }>(o: T) => T,
): Manifold | undefined {
  const { Manifold } = wasm
  const { pattern, scale, depth } = config.texture
  if (pattern === 'none' || isRelief(pattern) || depth <= 0) return undefined
  if (depth > maxTextureDepth(config) + 1e-6) throw new Error('Texture cuts too close to the recess — make it shallower or thicken the top')

  // The stones fill this outline, and the joint round it closes off every edge stone.
  const field = own(face.offset(-(TEXTURE_BORDER + depth), 'Miter', 2, config.segments))
  if (field.isEmpty()) return undefined
  const outline = field.toPolygons()[0]
  const { min, max } = field.bounds()
  const halfWidth = Math.max(-min[0], max[0])
  const halfLength = Math.max(-min[1], max[1])

  // Each stone is cut from a box by one plane per edge, so an edge that vanishes
  // partway down still leaves its neighbours at exactly 45°.
  const top = depth - APEX
  const stones: Manifold[] = []
  for (const layout of textureCells(pattern, scale, halfWidth, halfLength)) {
    let cell = layout
    for (let k = 0; k < outline.length && cell.length > 2; k++) {
      const [p, q] = [outline[k], outline[(k + 1) % outline.length]]
      cell = clip(cell, p, [q[1] - p[1], p[0] - q[0]])
    }
    if (cell.length < 3) continue
    const xs = cell.map(([x]) => x)
    const ys = cell.map(([, y]) => y)
    const [x0, y0] = [Math.min(...xs), Math.min(...ys)]
    let stone = own(own(Manifold.cube([Math.max(...xs) - x0, Math.max(...ys) - y0, top + OVERCUT])).translate([x0, y0, -OVERCUT]))
    for (let k = 0; k < cell.length; k++) {
      const [px, py] = cell[k]
      const [qx, qy] = cell[(k + 1) % cell.length]
      const length = Math.hypot(qx - px, qy - py)
      if (length < 1e-9) continue
      // Inward normal of an anticlockwise edge; the face leans out by one unit per unit of height.
      const [mx, my] = [-(qy - py) / length, (qx - px) / length]
      stone = own(stone.trimByPlane([mx, my, 1], (depth + mx * px + my * py) / Math.SQRT2))
    }
    if (!stone.isEmpty()) stones.push(stone)
  }
  if (stones.length === 0) return undefined

  // The slab leans in at 45° too, so the joint round the stones is a full V.
  const ring = (grow: number, z: number): Vec3[] =>
    own(field.offset(grow, 'Miter'))
      .toPolygons()
      .flatMap((contour) => contour.map(([x, y]): Vec3 => [x, y, z]))
  const slab = own(Manifold.hull([...ring(depth + 2 * OVERCUT, -2 * OVERCUT), ...ring(APEX, top)]))
  return own(slab.subtract(own(Manifold.compose(stones))))
}
