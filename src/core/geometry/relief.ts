import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d'
import { isRelief, seeded, type Hash, type ReliefPattern } from './texture'
import { EXPORT_CURVE_TOLERANCE } from './quality'
import type { BaseConfig } from './types'

/** Material kept above a magnet pocket's ceiling, the thinnest part of a solid base. */
export const MIN_POCKET_ROOF = 0.8
/** Grid spacing of an exported relief, fine enough that a slope across the grid reads as a slope rather than steps. */
const EXPORT_RESOLUTION = 0.25
/**
 * The relief's heights are blurred by a Gaussian this wide in mm, so no slope is
 * steeper than the grid can follow and no noise is finer than a few nozzle
 * lines. Sampling cliffs and fine noise unblurred left saw teeth along every wall.
 */
const SOFTEN = 0.5
/** Previews coarsen with size to a 0.8mm grid by 100mm, which keeps a large base near half a second. */
const previewResolution = (size: number) => Math.min(0.8, Math.max(EXPORT_RESOLUTION, size / 120))
const resolution = (config: BaseConfig, tolerance: number) =>
  tolerance > 1.5 * EXPORT_CURVE_TOLERANCE ? previewResolution(Math.max(config.width, config.length)) : EXPORT_RESOLUTION
/**
 * The relief stands this far inside the lip and above the model face, so its
 * walls and surface never meet the body's top edge.
 */
const EDGE = 0.02
const LIFT = 0.01

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const smoothstep = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

/** What a surface is sampled with: the variation and the irregularity in [0, 1]. */
interface Context {
  hash: Hash
  irregularity: number
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

/**
 * Fractal value noise in [0, 1] from `frequency` up, stretched so it uses most
 * of that range. The stretch is linear: easing it saturated whole regions at 0
 * or 1, which printed as flat plateaus cut off a layer or two down.
 */
function fbm(x: number, y: number, frequency: number, octaves: number, ctx: Context, channel: number, persistence = 0.5) {
  let total = 0
  let weight = 0
  for (let o = 0, amplitude = 1, f = frequency; o < octaves; o++, amplitude *= persistence, f *= 2) {
    total += amplitude * valueNoise(x * f, y * f, ctx.hash, channel + o)
    weight += amplitude
  }
  return clamp01((total / weight - 0.5) * 1.8 + 0.5)
}

/** A round cap over `t` in [0, 1] from its centre. */
const dome = (t: number) => (t >= 1 ? 0 : Math.sqrt(1 - t * t))

/** A jittered grid of feature centres, one per unit cell. */
const site = (i: number, j: number, hash: Hash, channel: number): Vec2 => [
  i + 0.8 * (hash(i, j, channel) - 0.5),
  j + 0.8 * (hash(i, j, channel + 1) - 0.5),
]

/** The nearest feature centre and how much farther the second-nearest is, which is all a Voronoi surface needs. */
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

/** How far a point stands out of a Voronoi seam, from 0 on it to 1 once the nearest two sites differ by `width`. */
const seam = (gap: number, width: number) => smoothstep(gap / width)

/** A relief's height in [0, 1] at a point measured in features. */
type Surface = (x: number, y: number, ctx: Context) => number

/** Rolling ground; irregularity keeps more of the fine grain. */
const earth: Surface = (x, y, ctx) =>
  0.8 * fbm(x, y, 1, 4, ctx, 10, 0.3 + 0.3 * ctx.irregularity) + (0.1 + 0.2 * ctx.irregularity) * fbm(x, y, 6, 3, ctx, 15)

/** Tilted slabs split by crevices, each slab one Voronoi cell; irregularity tilts them further. */
const rock: Surface = (x, y, ctx) => {
  const { hash, irregularity } = ctx
  const cell = nearest(x, y, hash, 20)
  const tilt = [hash(cell.i, cell.j, 22) - 0.5, hash(cell.i, cell.j, 23) - 0.5]
  const slab = 0.3 + 0.5 * hash(cell.i, cell.j, 24) + (0.4 + irregularity) * ((x - cell.x) * tilt[0] + (y - cell.y) * tilt[1])
  const grain = (0.1 + 0.25 * irregularity) * (fbm(x, y, 3, 5, ctx, 30, 0.6) - 0.5)
  const floor = 0.1 + 0.1 * fbm(x, y, 2, 2, ctx, 35)
  return floor + (clamp01(slab + grain) - floor) * seam(cell.gap, 0.15)
}

/** Stones of mixed sizes on a gravel bed, each with a rough face; irregularity spreads their sizes and heights. */
const rubble: Surface = (x, y, ctx) => {
  const { hash, irregularity } = ctx
  const pile = (frequency: number, channel: number, scale: number) => {
    const [px, py] = [x * frequency, y * frequency]
    const [ci, cj] = [Math.round(px), Math.round(py)]
    let height = 0
    for (let i = ci - 2; i <= ci + 2; i++) {
      for (let j = cj - 2; j <= cj + 2; j++) {
        const [sx, sy] = site(i, j, hash, channel)
        const radius = 0.5 - 0.3 * irregularity + 0.6 * irregularity * hash(i, j, channel + 2)
        const top = 1 - 0.9 * irregularity + 0.9 * irregularity * hash(i, j, channel + 3)
        height = Math.max(height, scale * top * dome(Math.hypot(px - sx, py - sy) / radius))
      }
    }
    return height
  }
  const gravel = 0.15 + 0.15 * fbm(x, y, 5, 3, ctx, 40)
  const stones = Math.max(pile(1, 50, 1), pile(2.5, 56, 0.45))
  return Math.max(gravel, stones * (0.85 + 0.15 * fbm(x, y, 4, 3, ctx, 60)))
}

/** Wind ripples one feature apart, gentle on the windward side and steep on the lee; irregularity bends them. */
const sand: Surface = (x, y, ctx) => {
  const wind = 2 * Math.PI * ctx.hash(0, 0, 60)
  const bend = (0.1 + 0.8 * ctx.irregularity) * (fbm(x, y, 0.25, 2, ctx, 61) - 0.5)
  const t = x * Math.cos(wind) + y * Math.sin(wind) + bend
  const phase = t - Math.floor(t)
  const ripple = phase < 0.7 ? phase / 0.7 : (1 - phase) / 0.3
  return 0.85 * smoothstep(ripple) + 0.15 * fbm(x, y, 0.25, 2, ctx, 64)
}

/** Dried mud: flat plates split by cracks; irregularity lifts and drops the plates. */
const cracked: Surface = (x, y, ctx) => {
  const cell = nearest(x, y, ctx.hash, 66)
  const plate = 0.8 + 0.4 * ctx.irregularity * (ctx.hash(cell.i, cell.j, 68) - 0.5)
  return plate * (1 - 0.15 * cell.d ** 2) * seam(cell.gap, 0.12)
}

/** Soft drifts over smooth ground; irregularity raises more of them. */
const snow: Surface = (x, y, ctx) => {
  const { hash, irregularity } = ctx
  const [ci, cj] = [Math.round(x), Math.round(y)]
  let drifts = 0
  for (let i = ci - 2; i <= ci + 2; i++) {
    for (let j = cj - 2; j <= cj + 2; j++) {
      const [sx, sy] = site(i, j, hash, 70)
      const height = hash(i, j, 72) < 0.3 + 0.7 * irregularity ? 0.5 * hash(i, j, 73) + 0.3 : 0
      drifts += height * Math.exp(-((Math.hypot(x - sx, y - sy) / 0.5) ** 2))
    }
  }
  return Math.min(1, 0.35 * fbm(x, y, 1, 3, ctx, 74, 0.4) + drifts)
}

/**
 * Raised winding roots over low ground, traced along noise contours. The
 * distance to a contour is its offset over the noise's gradient, so every root
 * keeps one width however steep the noise is; irregularity makes them wander.
 */
const roots: Surface = (x, y, ctx) => {
  const { hash } = ctx
  const ground = 0.3 * fbm(x, y, 1, 4, ctx, 80)
  const wander = (0.3 + ctx.irregularity) * (fbm(x, y, 0.5, 2, ctx, 82) - 0.5)
  const [u, v] = [1.5 * x + wander, 1.5 * y - wander]
  const root = (channel: number) => {
    const n = valueNoise(u, v, hash, channel)
    const step = 1e-3
    const gradient = Math.hypot(valueNoise(u + step, v, hash, channel) - n, valueNoise(u, v + step, hash, channel) - n) / step
    const distance = Math.abs(n - 0.5) / Math.max(gradient, 0.2) / 1.5
    return dome(distance / 0.1)
  }
  return Math.max(ground, 0.85 * Math.max(root(85), root(86)))
}

const SURFACES: Record<ReliefPattern, Surface> = { earth, rock, rubble, sand, cracked, snow, roots }

/** Blurs a row-major grid in place by a Gaussian `sigma` cells wide, holding the grid's edge values beyond it. */
function blur(grid: Float32Array, columns: number, rows: number, sigma: number) {
  const reach = Math.ceil(3 * sigma)
  if (reach < 1) return
  const kernel = Array.from({ length: 2 * reach + 1 }, (_, k) => Math.exp(-(((k - reach) / sigma) ** 2) / 2))
  const sum = kernel.reduce((a, b) => a + b)
  const pass = (count: number, length: number, at: (line: number, k: number) => number) => {
    const line = new Float32Array(length)
    for (let l = 0; l < count; l++) {
      for (let k = 0; k < length; k++) line[k] = grid[at(l, k)]
      for (let k = 0; k < length; k++) {
        let total = 0
        for (let o = -reach; o <= reach; o++) total += kernel[o + reach] * line[Math.min(length - 1, Math.max(0, k + o))]
        grid[at(l, k)] = total / sum
      }
    }
  }
  pass(rows, columns, (row, k) => row * columns + k)
  pass(columns, rows, (column, k) => k * columns + column)
}

/**
 * A closed block with a regular grid of `heights` on top, `columns` by `rows`
 * points `step` apart from `origin`, and flat underneath at `bottom`. Each grid
 * square is split along the diagonal whose ends are closer in height, so a ridge
 * across the grid stays a ridge instead of a row of teeth.
 */
function heightfield(
  wasm: ManifoldToplevel,
  [x0, y0]: Vec2,
  columns: number,
  rows: number,
  step: number,
  bottom: number,
  heights: Float32Array,
) {
  const count = columns * rows
  const verts = new Float32Array(2 * count * 3)
  const top = (i: number, j: number) => j * columns + i
  for (let k = 0; k < count; k++) {
    const [x, y] = [x0 + (k % columns) * step, y0 + Math.floor(k / columns) * step]
    verts.set([x, y, heights[k]], 3 * k)
    verts.set([x, y, bottom], 3 * (count + k))
  }
  const tris: number[] = []
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < columns; i++) {
      const [a, b, c, d] = [top(i, j), top(i + 1, j), top(i + 1, j + 1), top(i, j + 1)]
      if (Math.abs(heights[a] - heights[c]) <= Math.abs(heights[b] - heights[d])) tris.push(a, b, c, a, c, d)
      else tris.push(a, b, d, b, c, d)
      tris.push(a + count, c + count, b + count, a + count, d + count, c + count)
    }
  }
  const [nx, ny] = [columns - 1, rows - 1]
  const ring: Vec2[] = []
  for (let i = 0; i < nx; i++) ring.push([i, 0])
  for (let j = 0; j < ny; j++) ring.push([nx, j])
  for (let i = nx; i > 0; i--) ring.push([i, ny])
  for (let j = ny; j > 0; j--) ring.push([0, j])
  ring.forEach(([i, j], k) => {
    const [p, q] = [top(i, j), top(...ring[(k + 1) % ring.length])]
    tris.push(p + count, q + count, q, p + count, q, p)
  })
  return wasm.Manifold.ofMesh(new wasm.Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) }))
}

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
  const ctx: Context = { hash: seeded(config.texture.seed), irregularity: config.texture.irregularity / 100 }
  const footprint = own(face.offset(-EDGE, 'Miter', 2, config.segments))
  const step = resolution(config, tolerance)
  const margin = Math.ceil((3 * SOFTEN) / step) * step + step
  const { min, max } = footprint.bounds()
  // Off by a fraction of a cell, so no grid line falls on a straight edge of the footprint, whose sizes are round numbers.
  const origin: Vec2 = [min[0] - margin - 0.37 * step, min[1] - margin - 0.37 * step]
  const columns = Math.ceil((max[0] - min[0] + 2 * margin) / step) + 1
  const rows = Math.ceil((max[1] - min[1] + 2 * margin) / step) + 1
  const heights = new Float32Array(columns * rows)
  for (let k = 0; k < heights.length; k++) {
    const [x, y] = [origin[0] + (k % columns) * step, origin[1] + Math.floor(k / columns) * step]
    heights[k] = surface(x / scale, y / scale, ctx)
  }
  blur(heights, columns, rows, SOFTEN / step)
  for (let k = 0; k < heights.length; k++) heights[k] = config.height + LIFT + depth * heights[k]
  const field = own(heightfield(wasm, origin, columns, rows, step, config.height - 1, heights))
  const prism = own(own(footprint.extrude(depth + 4)).translate([0, 0, config.height - 2]))
  return own(field.intersect(prism))
}
