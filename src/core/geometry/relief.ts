import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d'
import { isRelief, noise, type ReliefPattern } from './texture'
import { EXPORT_CURVE_TOLERANCE } from './quality'
import type { BaseConfig } from './types'

/** Material kept above a magnet pocket's ceiling, the thinnest part of a solid base. */
export const MIN_POCKET_ROOF = 0.8
/** Edge length of an exported relief mesh; a nozzle line is the finest detail that prints. */
const EXPORT_RESOLUTION = 0.4
/** Previews mesh the relief coarser, which keeps a large base under a few hundred milliseconds. */
const PREVIEW_RESOLUTION = 0.8
/** The relief rises from the plain rim over this distance. */
const FADE = 2
/**
 * The relief starts this far above the body's top face, so the two never share
 * a face or an edge where the relief fades out at the rim.
 */
const LIFT = 0.01

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

function valueNoise(x: number, y: number, seed: number): number {
  const [i, j] = [Math.floor(x), Math.floor(y)]
  const [u, v] = [smoothstep(x - i), smoothstep(y - j)]
  const a = noise(i, j, seed)
  const b = noise(i + 1, j, seed)
  const c = noise(i, j + 1, seed)
  const d = noise(i + 1, j + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Fractal value noise in [0, 1], stretched so it uses most of that range. */
function fbm(x: number, y: number, octaves: number, seed: number): number {
  let total = 0
  let weight = 0
  for (let o = 0, amplitude = 1, frequency = 1; o < octaves; o++, amplitude /= 2, frequency *= 2) {
    total += amplitude * valueNoise(x * frequency, y * frequency, seed + o)
    weight += amplitude
  }
  return smoothstep((total / weight - 0.5) * 2.2 + 0.5)
}

/** A jittered grid of feature centres, one per `scale`-sized cell. */
const site = (i: number, j: number, seed: number): Vec2 => [i + 0.8 * (noise(i, j, seed) - 0.5), j + 0.8 * (noise(i, j, seed + 1) - 0.5)]

/** Rolling ground with grain in it. */
const earth = (x: number, y: number) => fbm(x, y, 5, 10)

/** Tilted slabs split by crevices, each slab one Voronoi cell. */
function rock(x: number, y: number): number {
  const [ci, cj] = [Math.round(x), Math.round(y)]
  let first = Infinity
  let second = Infinity
  let slab = 0
  for (let i = ci - 2; i <= ci + 2; i++) {
    for (let j = cj - 2; j <= cj + 2; j++) {
      const [sx, sy] = site(i, j, 20)
      const d = Math.hypot(x - sx, y - sy)
      if (d < first) {
        second = first
        first = d
        const tilt = [noise(i, j, 22) - 0.5, noise(i, j, 23) - 0.5]
        slab = 0.3 + 0.5 * noise(i, j, 24) + 0.9 * ((x - sx) * tilt[0] + (y - sy) * tilt[1])
      } else if (d < second) second = d
    }
  }
  const crevice = smoothstep((second - first) / 0.12)
  return smoothstep(slab + 0.15 * (fbm(3 * x, 3 * y, 3, 30) - 0.5)) * (0.25 + 0.75 * crevice)
}

/** Rounded stones of mixed sizes piled on a low bed. */
function rubble(x: number, y: number): number {
  const [ci, cj] = [Math.round(x), Math.round(y)]
  let height = 0.25 * fbm(x / 2, y / 2, 3, 40)
  for (let i = ci - 2; i <= ci + 2; i++) {
    for (let j = cj - 2; j <= cj + 2; j++) {
      const [sx, sy] = site(i, j, 50)
      const radius = 0.35 + 0.35 * noise(i, j, 52)
      const d = Math.hypot(x - sx, y - sy) / radius
      if (d < 1) height = Math.max(height, (0.45 + 0.55 * noise(i, j, 53)) * Math.sqrt(1 - d * d))
    }
  }
  return height
}

const SURFACES: Record<ReliefPattern, (x: number, y: number) => number> = { earth, rock, rubble }

/** Distance from a point inside a convex anticlockwise outline to its nearest edge. */
function insetDistance(outline: Vec2[], x: number, y: number): number {
  let nearest = Infinity
  for (let k = 0; k < outline.length; k++) {
    const [px, py] = outline[k]
    const [qx, qy] = outline[(k + 1) % outline.length]
    const length = Math.hypot(qx - px, qy - py)
    if (length > 1e-9) nearest = Math.min(nearest, ((qx - px) * (y - py) - (qy - py) * (x - px)) / length)
  }
  return nearest
}

/**
 * The relief raised over the model face, which is the top of the part as it
 * prints. A heightfield has no overhang anywhere, so any surface prints without
 * support. Its underside sits inside the body so the two join as one solid.
 */
export function reliefBlock(
  wasm: ManifoldToplevel,
  config: BaseConfig,
  face: CrossSection,
  border: number,
  tolerance: number,
  own: <T extends { delete: () => void }>(o: T) => T,
): Manifold | undefined {
  const { pattern, scale, depth } = config.texture
  if (!isRelief(pattern) || depth <= 0) return undefined
  const field = own(face.offset(-border, 'Miter', 2, config.segments))
  if (field.isEmpty()) return undefined
  const outline = field.toPolygons()[0]
  const surface = SURFACES[pattern]
  const resolution = tolerance > 1.5 * EXPORT_CURVE_TOLERANCE ? PREVIEW_RESOLUTION : EXPORT_RESOLUTION

  const slab = own(own(own(field.extrude(1)).translate([0, 0, config.height - 1])).refineToLength(resolution))
  return own(
    slab.warpBatch((verts, count) => {
      for (let v = 0; v < count; v++) {
        if (verts[3 * v + 2] < config.height - 1e-6) continue
        const [x, y] = [verts[3 * v], verts[3 * v + 1]]
        const rise = smoothstep(insetDistance(outline, x, y) / FADE)
        verts[3 * v + 2] = config.height + LIFT + depth * rise * surface(x / scale, y / scale)
      }
    }),
  )
}
