import type { Manifold, Mesh } from 'manifold-3d'
import type { BaseStats } from './types'

export interface BuildResult {
  mesh: Mesh
  /** Pieces printed separately in another filament and shown in place, which the preview colours apart. */
  inserts?: Mesh
  /** Pieces in a third filament, shown in place in its own colour. */
  third?: Mesh
  stats: BaseStats
}

export type Owner = <T extends { delete: () => void }>(value: T) => T

const PLA_DENSITY = 1.24e-3 // g/mm³

/** Runs a build that hands every Manifold object to `own`, and frees them all once it returns or throws, because WASM memory is not garbage collected. */
export function withOwner<T>(build: (own: Owner) => T): T {
  const trash: { delete: () => void }[] = []
  try {
    return build((value) => {
      trash.push(value)
      return value
    })
  } finally {
    for (const value of trash) value.delete()
  }
}

/** Meshes the parts and weighs them together as solid PLA. */
export function buildResult(solid: Manifold, inserts?: Manifold, third?: Manifold): BuildResult {
  const parts = [solid, inserts, third].filter((part) => part !== undefined)
  const volume = parts.reduce((total, part) => total + part.volume(), 0)
  const triangles = parts.reduce((total, part) => total + part.numTri(), 0)
  return {
    mesh: solid.getMesh(),
    ...(inserts ? { inserts: inserts.getMesh() } : {}),
    ...(third ? { third: third.getMesh() } : {}),
    stats: { triangles, volume, grams: volume * PLA_DENSITY },
  }
}
