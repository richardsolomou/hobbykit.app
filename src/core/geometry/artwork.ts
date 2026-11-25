import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { Font } from 'opentype.js'
import type { Owner } from './build'
import { GLYPH_FILL, glyphOutlines, type Polygon } from './text'
import { traceSilhouette } from './trace'
import type { TokenImage } from './types'

/** Smallest cap height worth printing; below it the text is refused rather than shrunk. */
export const MIN_TEXT_HEIGHT = 1.5
/** Features narrower than a 0.4mm nozzle's line are opened away before they reach the slicer. */
const MIN_FEATURE = 0.4
const LINE_PITCH = 1.3
const MAX_LINES = 3
/** Where the face divides when it carries both an image and text, as a fraction of its half-height. */
const IMAGE_TEXT_SPLIT = -0.2
const IMAGE_TEXT_GAP = 1

/** Text and a traced image for one face. */
export interface Artwork {
  text: string
  /** Requested cap height, shrunk to fit the face. */
  textHeight: number
  image: TokenImage | null
  /** Luminance, from 0 to 1, below which pixels form the image silhouette. */
  threshold: number
  /** Use the light parts of the image instead of the dark ones. */
  invert: boolean
}

interface Rect {
  x0: number
  x1: number
  y0: number
  y1: number
}

/**
 * Half the face's width along the horizontal line at `y`, or -Infinity off the
 * face. Every face is convex and mirrored about the y axis, so a centred
 * rectangle fits exactly when the width at its top and bottom edges covers it.
 */
function faceHalfWidth(face: CrossSection): (y: number) => number {
  const edges = face.toPolygons().flatMap((contour) => contour.map((p, i) => [p, contour[(i + 1) % contour.length]] as const))
  return (y) => {
    let left = Infinity
    let right = -Infinity
    for (const [[x0, y0], [x1, y1]] of edges) {
      if ((y < y0 && y < y1) || (y > y0 && y > y1)) continue
      const xs = y0 === y1 ? [x0, x1] : [x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)]
      left = Math.min(left, ...xs)
      right = Math.max(right, ...xs)
    }
    return Math.min(right, -left)
  }
}

/**
 * Largest scale, up to `limit`, at which the rectangles fit inside the face and
 * the horizontal band, centred on the band. Shrinking a centred block never
 * pushes a corner outward, so the search is monotonic.
 */
function fitScale(rects: Rect[], halfWidth: (y: number) => number, bottom: number, top: number, limit: number): number {
  const low = Math.min(...rects.map((r) => r.y0))
  const high = Math.max(...rects.map((r) => r.y1))
  const middle = (low + high) / 2
  const centre = (bottom + top) / 2
  const fits = (scale: number) =>
    rects.every((r) =>
      [r.y0, r.y1].every((y) => {
        const placed = centre + (y - middle) * scale
        return placed >= bottom && placed <= top && Math.max(Math.abs(r.x0), Math.abs(r.x1)) * scale <= halfWidth(placed)
      }),
    )
  if (fits(limit)) return limit
  let a = 0
  let b = limit
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    if (fits(m)) a = m
    else b = m
  }
  return a
}

/** Every way of breaking the words into at most `maxLines` lines, fewest lines first. */
function wraps(words: string[], maxLines: number): string[][] {
  const results: string[][] = []
  const split = (rest: string[], lines: string[], remaining: number) => {
    if (remaining === 1) {
      results.push([...lines, rest.join(' ')])
      return
    }
    for (let i = 1; i < rest.length; i++) split(rest.slice(i), [...lines, rest.slice(0, i).join(' ')], remaining - 1)
  }
  for (let count = 1; count <= Math.min(maxLines, words.length); count++) split(words, [], count)
  return results
}

interface Placement {
  polygons: Polygon[]
  rects: Rect[]
}

/** Text lines at the requested cap height, baselines stacked downward from y = 0. */
function textBlock(font: Font, lines: string[], capHeight: number): Placement {
  const capUnits = font.charToGlyph('H').getBoundingBox().y2
  const fontSize = (capHeight * font.unitsPerEm) / capUnits
  const polygons: Polygon[] = []
  const rects: Rect[] = []
  lines.forEach((line, index) => {
    const outlines = glyphOutlines(font, line, fontSize)
    if (outlines.length === 0) return
    const xs = outlines.flatMap((p) => p.map(([x]) => x))
    const ys = outlines.flatMap((p) => p.map(([, y]) => y))
    const shift = -(Math.min(...xs) + Math.max(...xs)) / 2
    const baseline = -index * capHeight * LINE_PITCH
    polygons.push(...outlines.map((p) => p.map(([x, y]): [number, number] => [x + shift, y + baseline])))
    const half = (Math.max(...xs) - Math.min(...xs)) / 2
    rects.push({ x0: -half, x1: half, y0: Math.min(...ys) + baseline, y1: Math.max(...ys) + baseline })
  })
  return { polygons, rects }
}

/** Places polygons so their block is centred on the band at the given scale. */
function place(block: Placement, scale: number, bottom: number, top: number): Polygon[] {
  const middle = (Math.min(...block.rects.map((r) => r.y0)) + Math.max(...block.rects.map((r) => r.y1))) / 2
  const centre = (bottom + top) / 2
  return block.polygons.map((p) => p.map(([x, y]): [number, number] => [x * scale, centre + (y - middle) * scale]))
}

function decodeLuminance(image: TokenImage): Uint8Array {
  const binary = atob(image.luminance)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * The artwork fitted to a face that is convex and mirrored about the y axis: the image above and the text below
 * when there are both. Nothing when there is neither, or no font for the text.
 */
export function faceArtwork(wasm: ManifoldToplevel, own: Owner, face: CrossSection, art: Artwork, font?: Font): CrossSection | undefined {
  const { CrossSection } = wasm
  const halfWidth = faceHalfWidth(face)
  const { min: faceMin, max: faceMax } = face.bounds()
  const halfHeight = faceMax[1]

  const words = art.text.trim().split(/\s+/).filter(Boolean)
  const hasText = Boolean(font) && words.length > 0
  const split = halfHeight * IMAGE_TEXT_SPLIT
  const imageBand: [number, number] = hasText ? [split + IMAGE_TEXT_GAP / 2, halfHeight] : [-halfHeight, halfHeight]
  const textBand: [number, number] = art.image ? [-halfHeight, split - IMAGE_TEXT_GAP / 2] : [-halfHeight, halfHeight]
  const artwork: CrossSection[] = []

  if (art.image) {
    const { width, height } = art.image
    const loops = traceSilhouette(decodeLuminance(art.image), width, height, art.threshold, art.invert)
    const traced = loops.length > 0 ? own(CrossSection.ofPolygons(loops, 'EvenOdd')) : undefined
    if (!traced || traced.isEmpty()) throw new Error('Image has no silhouette — adjust the threshold or invert it')
    const { min, max } = traced.bounds()
    const centred = own(traced.translate([-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2]))
    const half = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2]
    const rect = { x0: -half[0], x1: half[0], y0: -half[1], y1: half[1] }
    const span = Math.max(faceMax[0] - faceMin[0], faceMax[1] - faceMin[1])
    const scale = fitScale([rect], halfWidth, ...imageBand, span / Math.max(width, height))
    const placed = own(own(centred.scale(scale)).translate([0, (imageBand[0] + imageBand[1]) / 2]))
    const opened = own(own(placed.offset(-MIN_FEATURE / 2, 'Round', 2, 16)).offset(MIN_FEATURE / 2, 'Round', 2, 16))
    if (opened.isEmpty()) throw new Error('Image detail is finer than a printer can lay down — enlarge the part or simplify the image')
    artwork.push(opened)
  }

  if (hasText && font) {
    const candidates = wraps(words, art.image ? 2 : MAX_LINES).map((lines) => {
      const block = textBlock(font, lines, art.textHeight)
      return { block, scale: fitScale(block.rects, halfWidth, ...textBand, 1) }
    })
    // The largest text wins, and among equals the fewest lines, which come first.
    const best = candidates.reduce((a, b) => (b.scale > a.scale + 1e-9 ? b : a))
    if (best.scale * art.textHeight < MIN_TEXT_HEIGHT) {
      throw new Error('Text is too long to read at this size — shorten it or enlarge the part')
    }
    artwork.push(own(CrossSection.ofPolygons(place(best.block, best.scale, ...textBand), GLYPH_FILL)))
  }

  if (artwork.length === 0) return undefined
  // Offsetting can leave coincident points, which extrude into a pinched edge once a slicer welds vertices.
  return own(own(CrossSection.union(artwork)).simplify(1e-3))
}
