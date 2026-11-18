import { describe, expect, it } from 'vitest'
import { forExport } from './exportQuality'
import { defaultHolderConfig, holderGroup, holderPlan } from './holder'
import { defaultPaintRackConfig, paintRackLayout } from './paintRack'
import { exportSegmentsFor } from './quality'
import { defaultTokenConfig } from './token'

describe('forExport', () => {
  // Two sizes split into two modules, the second smaller than the whole holder.
  const holder = {
    ...defaultHolderConfig(),
    groups: [holderGroup('models-1', 5, { width: 32 }), holderGroup('models-2', 2, { width: 60 })],
  }

  it('sizes a holder module from its own layout', () => {
    const { width, length } = holderPlan(holder).modules[1].layout
    expect(forExport({ ...holder, module: 1 }).segments).toBe(exportSegmentsFor(Math.max(width, length)))
  })

  it('sizes a rack piece from the whole loadout', () => {
    const rack = { ...defaultPaintRackConfig(), leftEnd: true, rightEnd: true }
    const { width, length } = paintRackLayout(rack)
    expect(forExport({ ...rack, piece: 0 }).segments).toBe(exportSegmentsFor(Math.max(width, length)))
  })

  it('sizes a hex token across its corners', () => {
    const token = { ...defaultTokenConfig(), shape: 'hex' as const, size: 40 }
    expect(forExport(token).segments).toBe(exportSegmentsFor((40 * 2) / Math.sqrt(3)))
  })
})
