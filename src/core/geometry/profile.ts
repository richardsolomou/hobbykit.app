import type { BaseConfig, EdgeProfile } from './types'
import { EXPORT_CURVE_TOLERANCE, segmentsForTolerance } from './quality'
import { isRelief } from './texture'

/** Minimum radial wall left where the well floor meets the profiled outer edge. */
export const MIN_PROFILE_WALL = 0.4

/** One horizontal slice of the body: the outline pulled in by `inset` at height `z`. */
export interface ProfileStep {
  inset: number
  z: number
}

/**
 * Slices describing the outer wall from the bottom face up to the top face. The
 * edge treatment always sits at the bottom, so the full nominal size lands on the
 * top face where the miniature goes.
 *
 * Insets shrink monotonically with height, which keeps the lofted body convex.
 *
 * `onPlate` is for an edge that prints against the build plate. A quarter-round there starts nearly flat, so the first
 * layers would overhang far past 45°; its lower half becomes a 45° chamfer tangent to the rest of the curve instead.
 */
export function profileSteps(height: number, profile: EdgeProfile, size: number, tolerance: number, onPlate = false): ProfileStep[] {
  const s = Math.max(0, Math.min(size, height - 0.1))
  if (profile === 'straight' || s <= 0) {
    return [
      { inset: 0, z: 0 },
      { inset: 0, z: height },
    ]
  }

  if (profile === 'taper') {
    return [
      { inset: s, z: 0 },
      { inset: 0, z: height },
    ]
  }

  if (profile === 'bevel') {
    return [
      { inset: s, z: 0 },
      { inset: 0, z: s },
      { inset: 0, z: height },
    ]
  }

  // Quarter-round from the bottom face up to the full-size wall.
  const steps = Math.max(3, Math.ceil(segmentsForTolerance(2 * s, tolerance) / 4))
  const arc: ProfileStep[] = []
  if (onPlate) {
    const half = Math.max(2, Math.ceil(steps / 2))
    arc.push({ inset: 2 * s * (1 - Math.SQRT1_2), z: 0 })
    for (let i = 0; i <= half; i++) {
      const a = (Math.PI / 4) * (1 + i / half)
      arc.push({ inset: s - s * Math.sin(a), z: s - s * Math.cos(a) })
    }
  } else {
    for (let i = 0; i <= steps; i++) {
      const a = (Math.PI / 2) * (i / steps)
      arc.push({ inset: s - s * Math.sin(a), z: s - s * Math.cos(a) })
    }
  }
  return [...arc, { inset: 0, z: height }]
}

/** Outer-edge inset at one height, interpolated across the same slices used by the loft. */
export function profileInsetAt(height: number, profile: EdgeProfile, size: number, z: number, tolerance: number, onPlate = false): number {
  const steps = profileSteps(height, profile, size, tolerance, onPlate)
  if (z <= steps[0].z) return steps[0].inset

  for (let i = 1; i < steps.length; i++) {
    const before = steps[i - 1]
    const after = steps[i]
    if (z > after.z) continue
    const progress = (z - before.z) / (after.z - before.z)
    return before.inset + (after.inset - before.inset) * progress
  }
  return steps.at(-1)?.inset ?? 0
}

/** A base's edge prints against the plate unless a relief turns it face up. */
export const edgeOnPlate = (config: Pick<BaseConfig, 'texture'>) => !isRelief(config.texture.pattern)

/** Largest edge treatment that still leaves material beside the well floor. */
export function maxProfileSize(config: BaseConfig, limit = 3): number {
  const effectiveLimit = Math.min(limit, Math.max(0, config.height - 0.1))
  if (config.profile === 'straight' || config.solid) return effectiveLimit

  const fits = (size: number) =>
    config.wallThickness -
      profileInsetAt(config.height, config.profile, size, config.floorThickness, EXPORT_CURVE_TOLERANCE, edgeOnPlate(config)) >=
    MIN_PROFILE_WALL
  if (fits(effectiveLimit)) return effectiveLimit

  let low = 0
  let high = effectiveLimit
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2
    if (fits(middle)) low = middle
    else high = middle
  }
  return low
}
