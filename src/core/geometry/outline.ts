import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { BaseConfig, ShapeKind } from './types'

/** Trims trailing zeros without rounding, so 28.5 stays 28.5 and 32.0 reads 32. */
export function trimNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}

/** Round and polygon are driven by width alone; the rest use both extents. */
export function isElongated(shape: ShapeKind): boolean {
  return shape === 'oval' || shape === 'pill' || shape === 'rect'
}

export type OutlineSpec = Pick<BaseConfig, 'shape' | 'width' | 'length' | 'cornerRadius' | 'sides' | 'segments'> &
  Partial<Pick<BaseConfig, 'rotation'>>

export function footprint(config: Pick<BaseConfig, 'shape' | 'width' | 'length'>): { width: number; length: number } {
  return { width: config.width, length: isElongated(config.shape) ? config.length : config.width }
}

/** A footprint as text: the width alone, or width and length for an elongated shape. */
export function sizeText({ shape, width, length = width }: { shape: ShapeKind; width: number; length?: number }, separator = 'x'): string {
  return isElongated(shape) ? `${trimNumber(width)}${separator}${trimNumber(length)}` : trimNumber(width)
}

/** What the size label says when the text field is left empty. */
export function defaultLabel(config: BaseConfig): string {
  return sizeText(config)
}

/** A filename stem that survives every filesystem. */
export function baseName(config: BaseConfig): string {
  return `base-${config.shape}-${sizeText(config)}mm`
}

/**
 * The footprint at full size, centred on the origin. Every shape here is convex,
 * which is what lets the body be lofted as a convex hull.
 */
export function baseOutline(wasm: ManifoldToplevel, config: OutlineSpec): CrossSection {
  const { CrossSection } = wasm
  const { width, length } = footprint(config)
  const segments = config.segments

  if (config.shape === 'round') return CrossSection.circle(width / 2, segments)

  if (config.shape === 'oval') {
    return CrossSection.circle(1, segments).scale([width / 2, length / 2])
  }

  if (config.shape === 'pill') {
    // A stadium: a straight middle capped by half circles at each end.
    const radius = Math.min(width, length) / 2
    const straight = Math.max(width - length, 0)
    if (straight <= 0) return CrossSection.circle(radius, segments)
    const cap = CrossSection.circle(radius, segments)
    const parts = [CrossSection.square([straight, length], true), cap.translate([straight / 2, 0]), cap.translate([-straight / 2, 0])]
    try {
      return CrossSection.union(parts)
    } finally {
      for (const part of [cap, ...parts]) part.delete()
    }
  }

  if (config.shape === 'polygon') {
    const polygon = CrossSection.circle(width / 2, Math.max(3, Math.round(config.sides)))
    if (!config.rotation) return polygon
    try {
      return polygon.rotate(config.rotation)
    } finally {
      polygon.delete()
    }
  }

  // Rect: grown from an inner rectangle so the finished size is exactly width x length.
  const radius = Math.max(0, Math.min(config.cornerRadius, Math.min(width, length) / 2 - 0.01))
  if (radius <= 0) return CrossSection.square([width, length], true)
  const inner = CrossSection.square([width - 2 * radius, length - 2 * radius], true)
  try {
    return inner.offset(radius, 'Round', 2, segments)
  } finally {
    inner.delete()
  }
}
