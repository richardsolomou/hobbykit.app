import { describe, expect, it } from 'vitest'
import { applyBase, readBaseHash } from './baseLink'
import { defaultWorkspace } from './workspace'

describe('base links', () => {
  it('reads a round base', () => {
    expect(readBaseHash('#base=28.5')).toEqual({ shape: 'round', width: 28.5, length: 28.5 })
  })

  it('reads an oval base', () => {
    expect(readBaseHash('#base=75x42')).toEqual({ shape: 'oval', width: 75, length: 42 })
  })

  it('rejects a size the generator cannot build', () => {
    expect(readBaseHash('#base=200')).toBeUndefined()
  })

  it('rejects a malformed link', () => {
    expect(readBaseHash('#base=32mm')).toBeUndefined()
  })

  it('opens the linked footprint', () => {
    const { base } = applyBase(defaultWorkspace(), { shape: 'oval', width: 75, length: 42 })
    expect([base.shape, base.width, base.length]).toEqual(['oval', 75, 42])
  })

  it('keeps the visitor’s magnets', () => {
    const workspace = defaultWorkspace()
    workspace.shared.magnets.diameter = 6
    expect(applyBase(workspace, { shape: 'round', width: 60, length: 60 }).base.magnets.diameter).toBe(6)
  })

  it('drops custom label text written for another size', () => {
    const workspace = defaultWorkspace()
    workspace.base.label.text = 'Sarge'
    expect(applyBase(workspace, { shape: 'round', width: 60, length: 60 }).base.label.text).toBeUndefined()
  })
})
