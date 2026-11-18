import { holderLayout, holderPlan } from './holder'
import { footprint } from './outline'
import { paintingHandleDimensions, paintingTrayLayout } from './paintingTray'
import { paintRackLayout } from './paintRack'
import { exportSegmentsFor } from './quality'
import { stemMaximumDiameter } from './stem'
import { tokenFootprint } from './token'
import type { BuildConfig } from './types'

/** The part's size that sets its curve segments: a holder module its own, a rack piece the whole loadout's. */
function exportSize(config: BuildConfig): number {
  switch (config.kind) {
    case 'holder': {
      const { width, length } = config.module === undefined ? holderLayout(config) : holderPlan(config).modules[config.module].layout
      return Math.max(width, length)
    }
    case 'painting-tray': {
      const { width, length } = paintingTrayLayout(config)
      return Math.max(width, length)
    }
    case 'painting-handle': {
      const { width, length } = paintingHandleDimensions(config)
      return Math.max(width, length)
    }
    case 'paint-rack': {
      const { width, length } = paintRackLayout(config)
      return Math.max(width, length)
    }
    case 'stem':
      return stemMaximumDiameter(config)
    case 'token':
      return tokenFootprint(config).width
    case 'counter':
      return config.drumDiameter
    default: {
      const { width, length } = footprint(config)
      return Math.max(width, length)
    }
  }
}

/** The config with every curve within the export chord tolerance. */
export const forExport = <T extends BuildConfig>(config: T): T => ({ ...config, segments: exportSegmentsFor(exportSize(config)) })
