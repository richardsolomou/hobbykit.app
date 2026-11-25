import type { CrossSection, Manifold, ManifoldToplevel, Vec3 } from 'manifold-3d'
import type { Font } from 'opentype.js'
import { buildResult, withOwner, type BuildResult } from './build'
import { baseOutline, trimNumber } from './outline'
import { profileSteps } from './profile'
import { curveTolerance, previewSegmentsFor } from './quality'
import { faceArtwork } from './artwork'
import type { TokenConfig } from './types'

/** Clear top face left between the artwork and the start of the edge treatment. */
const TOKEN_FACE_MARGIN = 1.5
const HEX_CORNERS_PER_FLAT = 1 / Math.cos(Math.PI / 6)

export function defaultTokenConfig(): TokenConfig {
  return {
    kind: 'token',
    shape: 'round',
    size: 40,
    cornerRadius: 3,
    thickness: 3,
    profile: 'bevel',
    profileSize: 0.6,
    text: 'Objective',
    textHeight: 20,
    image: null,
    threshold: 0.5,
    invert: false,
    emboss: 1,
    segments: previewSegmentsFor(40),
  }
}

const hasArtwork = (config: TokenConfig) => Boolean(config.text.trim() || config.image)

export const tokenHeight = (config: TokenConfig): number => config.thickness + (hasArtwork(config) ? Math.max(0, config.emboss) : 0)

/** How far the flat top face the artwork may occupy sits inside the outline. */
export const tokenFaceInset = (config: TokenConfig): number => (config.profile === 'straight' ? 0 : config.profileSize) + TOKEN_FACE_MARGIN

/** Largest edge treatment that fits the thickness and still leaves a face for the artwork. */
export const maxTokenEdgeSize = ({ size, thickness }: Pick<TokenConfig, 'size' | 'thickness'>): number =>
  Math.max(0, Math.min(3, thickness - 0.1, size / 2 - TOKEN_FACE_MARGIN - 2.5))

/** Overall extents; a hex is wider across its corners than the size it is measured by. */
export function tokenFootprint({ shape, size }: Pick<TokenConfig, 'shape' | 'size'>): { width: number; length: number } {
  return { width: shape === 'hex' ? size * HEX_CORNERS_PER_FLAT : size, length: size }
}

function tokenOutline(wasm: ManifoldToplevel, config: TokenConfig): CrossSection {
  const { width, length } = tokenFootprint(config)
  const shape = config.shape === 'hex' ? 'polygon' : config.shape === 'square' ? 'rect' : 'round'
  return baseOutline(wasm, { shape, width, length, cornerRadius: config.cornerRadius, sides: 6, segments: config.segments })
}

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function tokenName(config: TokenConfig): string {
  const label = slug(config.text) || slug(config.image?.name.replace(/\.[^.]*$/, '') ?? '')
  return `token-${config.shape}-${trimNumber(config.size)}mm${label ? `-${label}` : ''}`
}

/**
 * Printed the way it is used: the table face on the build plate and the artwork
 * raised above or engraved into the top, so nothing overhangs. The edge treatment
 * sits on the top edge, where it is seen, rather than at the plate as on a base.
 */
export function buildToken(wasm: ManifoldToplevel, config: TokenConfig, font?: Font): BuildResult {
  const { Manifold } = wasm
  return withOwner((own) => {
    if (config.thickness < 1) throw new Error('Token must be at least 1 mm thick')
    if (config.thickness + Math.min(0, config.emboss) < 1 - 1e-6) {
      throw new Error('Engraving must leave at least 1 mm of material beneath the artwork')
    }
    const outline = own(tokenOutline(wasm, config))
    const face = own(outline.offset(-tokenFaceInset(config), 'Miter', 2, config.segments))
    if (face.isEmpty()) throw new Error('Edge treatment leaves no flat face — reduce the edge size')
    const tolerance = curveTolerance(tokenFootprint(config).width, config.segments)
    const points: Vec3[] = []
    for (const step of profileSteps(config.thickness, config.profile, config.profileSize, tolerance)) {
      const ring: CrossSection = step.inset > 0 ? own(outline.offset(-step.inset, 'Miter', 2, config.segments)) : outline
      for (const contour of ring.toPolygons()) {
        for (const [x, y] of contour) points.push([x, y, config.thickness - step.z])
      }
    }
    let solid = own(Manifold.hull(points))
    const art = faceArtwork(wasm, own, face, config, font)

    let inserts: Manifold | undefined
    if (art && config.emboss !== 0) {
      const feature = own(own(art.extrude(Math.abs(config.emboss))).translate([0, 0, config.thickness + Math.min(0, config.emboss)]))
      // Raised artwork starts exactly on the top face, so as a second part it shares no layer with the body.
      if (config.emboss > 0) inserts = feature
      else solid = own(solid.subtract(feature))
    }

    return buildResult(solid, inserts)
  })
}
