import { resized } from '../core/geometry/presets'
import type { ShapeKind } from '../core/geometry/types'
import { synchronizeWorkspace, type WorkspaceState } from './workspace'

export const BASE_HASH_PREFIX = '#base='

export interface LinkedBase {
  shape: ShapeKind
  width: number
  length: number
}

const SIZE = /^(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?$/
const buildable = (size: number) => size >= 15 && size <= 180

/** Reads the public link other sites use to open a base, `#base=32` for a round or `#base=75x42` for an oval. */
export function readBaseHash(hash: string): LinkedBase | undefined {
  if (!hash.startsWith(BASE_HASH_PREFIX)) return undefined
  const match = SIZE.exec(hash.slice(BASE_HASH_PREFIX.length))
  if (!match) return undefined
  const width = Number(match[1])
  const length = match[2] === undefined ? width : Number(match[2])
  if (!buildable(width) || !buildable(length)) return undefined
  return { shape: match[2] === undefined ? 'round' : 'oval', width, length }
}

/** Opens the linked footprint the way typing its size would, so every other setting stays the visitor's own. */
export function applyBase(workspace: WorkspaceState, { shape, width, length }: LinkedBase): WorkspaceState {
  const next = resized({ ...workspace.base, shape }, width, length)
  return synchronizeWorkspace({ ...workspace, base: { ...next, label: { ...next.label, text: undefined } } })
}
