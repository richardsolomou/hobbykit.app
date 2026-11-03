import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d'
import type { BaseConfig, TexturePattern, TextureSpec } from './types'

/** Material kept between a joint's apex and the well above it. */
export const MIN_TEXTURE_FLOOR = 0.4
/** The cut starts this far below the plate face, so it leaves no skin on it. */
const OVERCUT = 0.5
/**
 * Half the flat left along each joint's apex. Neighbouring stones would otherwise
 * meet along a shared edge, which welds into a non-manifold edge.
 */
const APEX = 0.01
/** Offsets each variation's hash far past the channels any pattern uses. */
const SEED_STRIDE = 97
export const MAX_SEED = 9999

/** Highest relief offered; the base's own height already gives the pockets their roof. */
export const MAX_RELIEF = 4

export type JointPattern = Extract<
  TexturePattern,
  'flagstone' | 'cobblestone' | 'hex' | 'tile' | 'plank' | 'plate' | 'herringbone' | 'diamond'
>
export type ReliefPattern = Extract<TexturePattern, 'rock' | 'earth' | 'rubble' | 'sand' | 'cracked' | 'snow' | 'roots'>

const JOINTS: readonly JointPattern[] = ['flagstone', 'cobblestone', 'hex', 'tile', 'plank', 'plate', 'herringbone', 'diamond']
const RELIEFS: readonly ReliefPattern[] = ['rock', 'earth', 'rubble', 'sand', 'cracked', 'snow', 'roots']

/** Every pattern a saved base may name. */
export const TEXTURE_PATTERNS: readonly TexturePattern[] = ['none', ...JOINTS, ...RELIEFS]

/** Patterns that rise from the model face, so the base prints face up instead of face down. */
export const isRelief = (pattern: TexturePattern): pattern is ReliefPattern => (RELIEFS as readonly string[]).includes(pattern)

/** Regular patterns lay out the same whatever the variation and irregularity. */
export const isRegular = (pattern: TexturePattern) => pattern === 'none' || pattern === 'herringbone' || pattern === 'diamond'

/** Values that read as the pattern on a 32mm base; a plank as wide as a flagstone reads as a plate. */
export const DEFAULT_TEXTURE: Record<TexturePattern, Omit<TextureSpec, 'pattern' | 'seed'>> = {
  none: { scale: 10, depth: 0.5, irregularity: 50 },
  flagstone: { scale: 10, depth: 0.5, irregularity: 50 },
  cobblestone: { scale: 5, depth: 0.5, irregularity: 50 },
  hex: { scale: 6, depth: 0.5, irregularity: 0 },
  tile: { scale: 8, depth: 0.5, irregularity: 0 },
  plank: { scale: 5, depth: 0.5, irregularity: 50 },
  plate: { scale: 8, depth: 0.5, irregularity: 0 },
  herringbone: { scale: 4, depth: 0.5, irregularity: 0 },
  diamond: { scale: 4, depth: 0.5, irregularity: 0 },
  rock: { scale: 8, depth: 2.5, irregularity: 50 },
  earth: { scale: 8, depth: 2, irregularity: 50 },
  rubble: { scale: 5, depth: 2.5, irregularity: 50 },
  sand: { scale: 5, depth: 1, irregularity: 50 },
  cracked: { scale: 7, depth: 1.2, irregularity: 50 },
  snow: { scale: 8, depth: 2, irregularity: 50 },
  roots: { scale: 10, depth: 2, irregularity: 50 },
}

/** Switches pattern, carrying any value the user set and taking the new defaults for the rest. */
export function withPattern(texture: TextureSpec, pattern: TexturePattern): TextureSpec {
  const before = DEFAULT_TEXTURE[texture.pattern]
  const after = DEFAULT_TEXTURE[pattern]
  const carried = (key: keyof typeof after) => (texture[key] === before[key] ? after[key] : texture[key])
  return { pattern, seed: texture.seed, scale: carried('scale'), depth: carried('depth'), irregularity: carried('irregularity') }
}

/** Joints must stop short of the recess; relief rises from a solid body and has no such limit. */
export const maxTextureDepth = (config: Pick<BaseConfig, 'floorThickness' | 'texture'>) =>
  isRelief(config.texture.pattern) ? MAX_RELIEF : Math.max(0, config.floorThickness - MIN_TEXTURE_FLOOR)

/** A fixed hash, so the same footprint always gets the same pattern. */
export function noise(i: number, j: number, k: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** The hash for one variation: every seed draws an unrelated pattern. */
export type Hash = (i: number, j: number, k: number) => number
export const seeded =
  (seed: number): Hash =>
  (i, j, k) =>
    noise(i, j, k + SEED_STRIDE * seed)

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
 * Voronoi cells of a lattice of stone centres. `site` may move each centre by
 * under half a cell, which keeps every Voronoi neighbour within two indices.
 */
function voronoi(site: (i: number, j: number) => Vec2, columns: number, rows: number, reach: number): Vec2[][] {
  const cells: Vec2[][] = []
  for (let i = -columns; i <= columns; i++) {
    for (let j = -rows; j <= rows; j++) {
      const own = site(i, j)
      let cell: Vec2[] = [
        [own[0] - reach, own[1] - reach],
        [own[0] + reach, own[1] - reach],
        [own[0] + reach, own[1] + reach],
        [own[0] - reach, own[1] + reach],
      ]
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

/** A square grid of stone centres, each moved up to `jitter` cells either way. */
function squareSites(scale: number, jitter: number, hash: Hash) {
  return (i: number, j: number): Vec2 => [(i + jitter * (2 * hash(i, j, 0) - 1)) * scale, (j + jitter * (2 * hash(i, j, 1) - 1)) * scale]
}

/** A convex polygon with every corner rounded to `radius`, or nothing when it is too small to round. */
function rounded(cell: Vec2[], radius: number): Vec2[] | undefined {
  let inset = cell
  for (let k = 0; k < cell.length && inset.length > 2; k++) {
    const [p, q] = [cell[k], cell[(k + 1) % cell.length]]
    const length = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (length < 1e-9) continue
    const inward: Vec2 = [-(q[1] - p[1]) / length, (q[0] - p[0]) / length]
    inset = clip(inset, [p[0] + radius * inward[0], p[1] + radius * inward[1]], [-inward[0], -inward[1]])
  }
  if (inset.length < 3) return undefined
  const normal = (k: number) => {
    const [p, q] = [inset[k], inset[(k + 1) % inset.length]]
    return Math.atan2(-(q[0] - p[0]), q[1] - p[1])
  }
  const outline: Vec2[] = []
  for (let k = 0; k < inset.length; k++) {
    const from = normal((k + inset.length - 1) % inset.length)
    let to = normal(k)
    while (to < from) to += 2 * Math.PI
    const steps = Math.max(1, Math.ceil((to - from) / (Math.PI / 4)))
    for (let t = 0; t <= steps; t++) {
      const a = from + ((to - from) * t) / steps
      outline.push([inset[k][0] + radius * Math.cos(a), inset[k][1] + radius * Math.sin(a)])
    }
  }
  return outline
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

/**
 * Bricks twice as long as `scale` in a herringbone covering a circle of `reach`.
 * Each staircase of a flat brick and an upright one repeats along (1, 1), and the
 * staircases repeat along (2, -2); the result is turned 45° so the zigzag runs along X.
 */
function herringbone(scale: number, reach: number): Vec2[][] {
  const span = Math.ceil(reach / scale) + 4
  const box = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]
  const cells: Vec2[][] = []
  for (let n = -span; n <= span; n++) {
    for (let k = -2 * span; k <= 2 * span; k++) {
      const [x, y] = [k + 2 * n, k - 2 * n]
      if (Math.abs(x) > 2 * span || Math.abs(y) > 2 * span) continue
      cells.push(box(x, y, x + 2, y + 1), box(x + 2, y - 1, x + 3, y + 1))
    }
  }
  const turn = Math.SQRT1_2 * scale
  return cells.map((cell) => cell.map(([u, v]): Vec2 => [(u - v) * turn, (u + v) * turn]))
}

/** Rhombi twice as long as they are wide, so their joints cross like the grooves of tread plate. */
function diamonds(scale: number, halfLong: number, halfShort: number): Vec2[][] {
  const [long, wide] = [2 * scale, scale]
  const columns = Math.ceil(halfLong / long) + 1
  const rows = Math.ceil((2 * halfShort) / wide) + 2
  const cells: Vec2[][] = []
  for (let j = -rows; j <= rows; j++) {
    for (let i = -columns; i <= columns; i++) {
      const [cx, cy] = [(i + (Math.abs(j) % 2) / 2) * long, (j * wide) / 2]
      cells.push([
        [cx, cy - wide / 2],
        [cx + long / 2, cy],
        [cx, cy + wide / 2],
        [cx - long / 2, cy],
      ])
    }
  }
  return cells
}

/** Every convex, anticlockwise cell of a pattern covering a rectangle centred on the origin. */
export function textureCells(
  texture: Omit<TextureSpec, 'depth'> & { pattern: JointPattern },
  halfWidth: number,
  halfLength: number,
): Vec2[][] {
  const { pattern, scale } = texture
  const irregularity = texture.irregularity / 100
  const hash = seeded(texture.seed)
  const columns = Math.ceil(halfWidth / scale) + 2
  const rows = Math.ceil(halfLength / scale) + 2

  if (pattern === 'flagstone') return voronoi(squareSites(scale, 0.1 + 0.35 * irregularity, hash), columns, rows, 3 * scale)
  if (pattern === 'cobblestone') {
    const cells = voronoi(squareSites(scale, 0.05 + 0.3 * irregularity, hash), columns, rows, 3 * scale)
    return cells.flatMap((cell) => {
      const cobble = rounded(cell, 0.18 * scale)
      return cobble ? [cobble] : []
    })
  }
  if (pattern === 'hex') {
    const pitch = (scale * Math.sqrt(3)) / 2
    const jitter = 0.25 * irregularity * scale
    const site = (i: number, j: number): Vec2 => [
      (i + (Math.abs(j) % 2) / 2) * scale + jitter * (2 * hash(i, j, 0) - 1),
      j * pitch + jitter * (2 * hash(i, j, 1) - 1),
    ]
    return voronoi(site, columns, Math.ceil(halfLength / pitch) + 2, 3 * scale)
  }
  if (pattern === 'herringbone') return herringbone(scale, Math.hypot(halfWidth, halfLength))

  // Rows run along the longer axis; a quarter turn keeps every cell anticlockwise.
  const along = halfWidth >= halfLength
  const [halfLong, halfShort] = along ? [halfWidth, halfLength] : [halfLength, halfWidth]
  const offset = (row: number) => irregularity * (hash(row, 0, 4) - 0.5)
  const cells =
    pattern === 'diamond'
      ? diamonds(scale, halfLong, halfShort)
      : pattern === 'tile'
        ? courses(
            scale,
            halfLong,
            halfShort,
            (row) => alignedJoint(halfLong, scale, offset(row)),
            () => scale,
          )
        : pattern === 'plate'
          ? courses(
              scale,
              halfLong,
              halfShort,
              (row) => alignedJoint(halfLong, 2 * scale, (Math.abs(row) % 2) / 2 + offset(row)),
              () => 2 * scale,
            )
          : courses(
              scale,
              halfLong,
              halfShort,
              (row) => -halfLong - 6 * scale * hash(row, 0, 2),
              (row, piece) => scale * (3 + 6 * irregularity * hash(row, piece, 3)),
            )
  return along ? cells : cells.map((cell) => cell.map(([u, v]): Vec2 => [-v, u]))
}

/**
 * The texture cut into the plate face, or nothing when the base is plain. Every
 * stone's sides stand at 45°, so the V joints between them have ceilings that
 * print without support even though they face the build plate. Joints run out
 * through the edge, so the pattern reaches the lip.
 */
export function textureCut(
  wasm: ManifoldToplevel,
  config: BaseConfig,
  outline: CrossSection,
  own: <T extends { delete: () => void }>(o: T) => T,
): Manifold | undefined {
  const { Manifold } = wasm
  const { pattern, depth } = config.texture
  if (pattern === 'none' || isRelief(pattern) || depth <= 0) return undefined
  if (depth > maxTextureDepth(config) + 1e-6) throw new Error('Texture cuts too close to the recess — make it shallower or thicken the top')

  // The slab reaches past the wall, so no face of it meets the body except its top.
  const top = depth - APEX
  const footprint = own(outline.offset(1, 'Miter', 2, config.segments))
  const { min, max } = footprint.bounds()
  const slab = own(own(footprint.extrude(top + 2 * OVERCUT)).translate([0, 0, -2 * OVERCUT]))

  // Each stone is cut from a box by one plane per edge, so an edge that vanishes
  // partway down still leaves its neighbours at exactly 45°.
  const stones: Manifold[] = []
  for (const cell of textureCells({ ...config.texture, pattern }, Math.max(-min[0], max[0]), Math.max(-min[1], max[1]))) {
    const xs = cell.map(([x]) => x)
    const ys = cell.map(([, y]) => y)
    const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    if (x0 > max[0] || x1 < min[0] || y0 > max[1] || y1 < min[1]) continue
    let stone = own(own(Manifold.cube([x1 - x0, y1 - y0, top + OVERCUT])).translate([x0, y0, -OVERCUT]))
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
  return own(slab.subtract(own(Manifold.compose(stones))))
}
