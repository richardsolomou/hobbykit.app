import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d'
import { isRelief, seeded, type Hash, type ReliefPattern } from './texture'
import { EXPORT_CURVE_TOLERANCE } from './quality'
import type { BaseConfig } from './types'

/** Material kept above a magnet pocket's ceiling, the thinnest part of a solid base. */
export const MIN_POCKET_ROOF = 0.8
/** Edge length of an exported relief mesh; a nozzle line is the finest detail that prints. */
const EXPORT_RESOLUTION = 0.4
/**
 * Previews mesh small bases as finely as an export and coarsen only past about
 * 50mm, which keeps a 100mm base near half a second.
 */
const previewResolution = (size: number) => Math.min(0.8, Math.max(EXPORT_RESOLUTION, size / 120))
const resolution = (config: BaseConfig, tolerance: number) =>
  tolerance > 1.5 * EXPORT_CURVE_TOLERANCE ? previewResolution(Math.max(config.width, config.length)) : EXPORT_RESOLUTION
/**
 * The relief stands this far inside the lip and above the model face, so its
 * walls and surface never meet the body's top edge.
 */
const EDGE = 0.02
const LIFT = 0.01

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

function valueNoise(x: number, y: number, hash: Hash, channel: number): number {
  const [i, j] = [Math.floor(x), Math.floor(y)]
  const [u, v] = [smoothstep(x - i), smoothstep(y - j)]
  const a = hash(i, j, channel)
  const b = hash(i + 1, j, channel)
  const c = hash(i, j + 1, channel)
  const d = hash(i + 1, j + 1, channel)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/**
 * Fractal value noise in [0, 1], stretched so it uses most of that range. The
 * stretch is linear: easing it saturated whole regions at 0 or 1, which printed
 * as flat plateaus cut off a layer or two down.
 */
function fbm(x: number, y: number, octaves: number, hash: Hash, channel: number, persistence = 0.5): number {
  let total = 0
  let weight = 0
  for (let o = 0, amplitude = 1, frequency = 1; o < octaves; o++, amplitude *= persistence, frequency *= 2) {
    total += amplitude * valueNoise(x * frequency, y * frequency, hash, channel + o)
    weight += amplitude
  }
  return clamp01((total / weight - 0.5) * 1.8 + 0.5)
}

/** A jittered grid of feature centres, one per unit cell. */
const site = (i: number, j: number, hash: Hash, channel: number): Vec2 => [
  i + 0.8 * (hash(i, j, channel) - 0.5),
  j + 0.8 * (hash(i, j, channel + 1) - 0.5),
]

/** The nearest and second-nearest feature centres, which is all a Voronoi surface needs. */
function nearest(x: number, y: number, hash: Hash, channel: number) {
  const [ci, cj] = [Math.round(x), Math.round(y)]
  let first = { d: Infinity, i: 0, j: 0, x: 0, y: 0 }
  let second = Infinity
  for (let i = ci - 2; i <= ci + 2; i++) {
    for (let j = cj - 2; j <= cj + 2; j++) {
      const [sx, sy] = site(i, j, hash, channel)
      const d = Math.hypot(x - sx, y - sy)
      if (d < first.d) {
        second = first.d
        first = { d, i, j, x: sx, y: sy }
      } else if (d < second) second = d
    }
  }
  return { ...first, gap: second - first.d }
}

/** A relief's height in [0, 1] at a point measured in features, for one variation and an irregularity in [0, 1]. */
type Surface = (x: number, y: number, hash: Hash, irregularity: number) => number

/** Rolling ground; irregularity keeps more of the fine grain. */
const earth: Surface = (x, y, hash, irregularity) =>
  0.8 * fbm(x, y, 4, hash, 10, 0.3 + 0.3 * irregularity) + (0.1 + 0.2 * irregularity) * fbm(6 * x, 6 * y, 3, hash, 15)

/** Tilted slabs split by crevices, each slab one Voronoi cell; irregularity tilts them further. */
const rock: Surface = (x, y, hash, irregularity) => {
  const cell = nearest(x, y, hash, 20)
  const tilt = [hash(cell.i, cell.j, 22) - 0.5, hash(cell.i, cell.j, 23) - 0.5]
  const slab = 0.3 + 0.5 * hash(cell.i, cell.j, 24) + (0.4 + irregularity) * ((x - cell.x) * tilt[0] + (y - cell.y) * tilt[1])
  const grain = (0.1 + 0.25 * irregularity) * (fbm(3 * x, 3 * y, 5, hash, 30, 0.6) - 0.5)
  return clamp01(slab + grain) * (0.25 + 0.75 * smoothstep(cell.gap / 0.12))
}

/** Stones of mixed sizes on a gravel bed, each with a rough face; irregularity spreads their sizes and heights. */
const rubble: Surface = (x, y, hash, irregularity) => {
  const pile = (frequency: number, channel: number, scale: number) => {
    const [px, py] = [x * frequency, y * frequency]
    const [ci, cj] = [Math.round(px), Math.round(py)]
    let height = 0
    for (let i = ci - 2; i <= ci + 2; i++) {
      for (let j = cj - 2; j <= cj + 2; j++) {
        const [sx, sy] = site(i, j, hash, channel)
        const radius = 0.5 - 0.3 * irregularity + 0.6 * irregularity * hash(i, j, channel + 2)
        const d = Math.hypot(px - sx, py - sy) / radius
        const top = 1 - 0.9 * irregularity + 0.9 * irregularity * hash(i, j, channel + 3)
        if (d < 1) height = Math.max(height, scale * top * Math.sqrt(1 - d * d))
      }
    }
    return height
  }
  const gravel = 0.15 + 0.15 * fbm(5 * x, 5 * y, 3, hash, 40)
  const stones = Math.max(pile(1, 50, 1), pile(2.5, 56, 0.45))
  return Math.max(gravel, stones * (0.85 + 0.15 * fbm(4 * x, 4 * y, 3, hash, 60)))
}

/** Wind ripples one feature apart, gentle on the windward side and steep on the lee; irregularity bends them. */
const sand: Surface = (x, y, hash, irregularity) => {
  const wind = 2 * Math.PI * hash(0, 0, 60)
  const bend = (0.1 + 0.8 * irregularity) * (fbm(x / 4, y / 4, 2, hash, 61) - 0.5)
  const t = x * Math.cos(wind) + y * Math.sin(wind) + bend
  const phase = t - Math.floor(t)
  const ripple = phase < 0.7 ? phase / 0.7 : (1 - phase) / 0.3
  return 0.85 * smoothstep(ripple) + 0.15 * fbm(x / 4, y / 4, 2, hash, 64)
}

/** Dried mud: flat plates split by narrow cracks; irregularity lifts and drops the plates. */
const cracked: Surface = (x, y, hash, irregularity) => {
  const cell = nearest(x, y, hash, 66)
  const plate = 0.8 + 0.4 * irregularity * (hash(cell.i, cell.j, 68) - 0.5)
  return plate * (1 - 0.15 * cell.d ** 2) * smoothstep(cell.gap / 0.12)
}

/** Soft drifts over smooth ground; irregularity raises more of them. */
const snow: Surface = (x, y, hash, irregularity) => {
  const [ci, cj] = [Math.round(x), Math.round(y)]
  let drifts = 0
  for (let i = ci - 2; i <= ci + 2; i++) {
    for (let j = cj - 2; j <= cj + 2; j++) {
      const [sx, sy] = site(i, j, hash, 70)
      const height = hash(i, j, 72) < 0.3 + 0.7 * irregularity ? 0.5 * hash(i, j, 73) + 0.3 : 0
      drifts += height * Math.exp(-((Math.hypot(x - sx, y - sy) / 0.5) ** 2))
    }
  }
  return Math.min(1, 0.35 * fbm(x, y, 3, hash, 74, 0.4) + drifts)
}

/** Raised winding roots over low ground, traced along noise contours; irregularity makes them wander. */
const roots: Surface = (x, y, hash, irregularity) => {
  const ground = 0.3 * fbm(x, y, 4, hash, 80)
  const wander = (0.3 + irregularity) * (fbm(x / 2, y / 2, 2, hash, 82) - 0.5)
  const root = (channel: number) => {
    const contour = Math.abs(valueNoise(1.5 * x + wander, 1.5 * y - wander, hash, channel) - 0.5) / 0.08
    return contour < 1 ? Math.sqrt(1 - contour * contour) : 0
  }
  return Math.max(ground, 0.85 * Math.max(root(85), root(86)))
}

const SURFACES: Record<ReliefPattern, Surface> = { earth, rock, rubble, sand, cracked, snow, roots }

/**
 * The relief raised over the model face, which is the top of the part as it
 * prints. A heightfield has no overhang anywhere, so any surface prints without
 * support. It covers the model face out to the lip, less `EDGE`, and its
 * underside sits inside the body so the two join as one solid.
 */
export function reliefBlock(
  wasm: ManifoldToplevel,
  config: BaseConfig,
  face: CrossSection,
  tolerance: number,
  own: <T extends { delete: () => void }>(o: T) => T,
): Manifold | undefined {
  const { pattern, scale, depth } = config.texture
  if (!isRelief(pattern) || depth <= 0) return undefined
  const surface = SURFACES[pattern]
  const hash = seeded(config.texture.seed)
  const irregularity = config.texture.irregularity / 100
  const footprint = own(face.offset(-EDGE, 'Miter', 2, config.segments))
  const slab = own(own(own(footprint.extrude(1)).translate([0, 0, config.height - 1])).refineToLength(resolution(config, tolerance)))
  return own(
    slab.warpBatch((verts, count) => {
      for (let v = 0; v < count; v++) {
        if (verts[3 * v + 2] < config.height - 1e-6) continue
        const [x, y] = [verts[3 * v], verts[3 * v + 1]]
        verts[3 * v + 2] = config.height + LIFT + depth * surface(x / scale, y / scale, hash, irregularity)
      }
    }),
  )
}
