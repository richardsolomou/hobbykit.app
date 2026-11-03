import {
  buildMovementTray,
  defaultMovementTrayConfig,
  movementTrayFootprint,
  movementTrayLayout,
} from '../../src/core/geometry/movementTray'
import { footprintKey } from '../../src/core/geometry/presets'
import { exportSegmentsFor } from '../../src/core/geometry/quality'
import type { MovementTrayConfig, MovementTrayShape } from '../../src/core/geometry/types'
import type { Case } from './shared'

const tray = (
  shape: MovementTrayShape,
  width: number,
  length: number,
  overrides: Partial<MovementTrayConfig> = {},
): MovementTrayConfig => ({
  ...defaultMovementTrayConfig(),
  ...movementTrayFootprint(shape, width, length),
  ...overrides,
})
const magnets = (config: MovementTrayConfig, changes: Partial<MovementTrayConfig['magnets']>): MovementTrayConfig => ({
  ...config,
  magnets: { ...config.magnets, ...changes },
})
const custom = (name: string, config: MovementTrayConfig, defines: Case['defines']): Case => ({
  name,
  build: (wasm) => {
    const layout = movementTrayLayout(config)
    return buildMovementTray(wasm, { ...config, segments: exportSegmentsFor(Math.max(layout.width, layout.length)) }).mesh
  },
  defines,
})

const rect = tray('rect', 25, 25)
const round32 = tray('round', 32, 32)
const round60 = tray('round', 60, 60)

export const cases: Case[] = [
  custom('defaults', rect, {}),
  custom('rect-20x20-10x10', tray('rect', 20, 20, { columns: 10, ranks: 10 }), { standard_size: 'rect-20x20', columns: 10, ranks: 10 }),
  custom('rect-25x50-5x2', tray('rect', 25, 50, { ranks: 2 }), { standard_size: 'rect-25x50', ranks: 2 }),
  custom('rect-50x100-2x1', tray('rect', 50, 100, { columns: 2, ranks: 1 }), { standard_size: 'rect-50x100', columns: 2, ranks: 1 }),
  custom('rect-100x150-1x1', tray('rect', 100, 150, { columns: 1, ranks: 1 }), {
    standard_size: 'rect-100x150',
    columns: 1,
    ranks: 1,
  }),
  custom('round-25-5x4', tray('round', 25, 25), { standard_size: 'round-25' }),
  custom('round-32-3x2', { ...round32, columns: 3, ranks: 2 }, { standard_size: 'round-32', columns: 3, ranks: 2 }),
  custom('round-60-2x2', { ...round60, columns: 2, ranks: 2 }, { standard_size: 'round-60', columns: 2, ranks: 2 }),
  custom('round-160-10x10', tray('round', 160, 160, { columns: 10, ranks: 10 }), {
    standard_size: 'round-160',
    columns: 10,
    ranks: 10,
  }),
  custom('round-10-1x1', tray('round', 10, 10, { columns: 1, ranks: 1, rim: 1.2 }), {
    standard_size: 'custom',
    shape: 'round',
    width: 10,
    columns: 1,
    ranks: 1,
    rim_width: 1.2,
  }),
  custom('rect-custom', tray('rect', 22.5, 37, { columns: 3, ranks: 3 }), {
    standard_size: 'custom',
    shape: 'rect',
    width: 22.5,
    depth: 37,
    columns: 3,
    ranks: 3,
  }),
  custom('rect-sharp-tight', { ...rect, cornerRadius: 0.5, slotClearance: 0 }, { corner_radius: 0.5, slot_clearance: 0 }),
  custom('rect-round-corners', { ...rect, cornerRadius: 6, rim: 1.2 }, { corner_radius: 6, rim_width: 1.2 }),
  custom(
    'rect-deep-wide',
    { ...rect, slotDepth: 6, slotClearance: 2, floorThickness: 5.5, rim: 10 },
    {
      slot_depth: 6,
      slot_clearance: 2,
      floor_thickness: 5.5,
      rim_width: 10,
    },
  ),
  custom('round-no-magnets', magnets({ ...round32, floorThickness: 0.6 }, { enabled: false }), {
    standard_size: 'round-32',
    slot_magnets: false,
    floor_thickness: 0.6,
  }),
  custom('round-60-five-cross', magnets(round60, { layout: 'five-cross' }), { standard_size: 'round-60', pocket_layout: 'five-cross' }),
  custom('round-32-five-cross-ignored', magnets(round32, { layout: 'five-cross' }), {
    standard_size: 'round-32',
    pocket_layout: 'five-cross',
  }),
  custom(
    'round-60-6x3-magnets',
    magnets({ ...round60, floorThickness: 4 }, { diameter: 6, thickness: 3, clearance: 0.4, depthClearance: 0.3 }),
    {
      standard_size: 'round-60',
      magnet_diameter: 6,
      magnet_thickness: 3,
      magnet_diameter_clearance: 0.4,
      magnet_depth_clearance: 0.3,
      floor_thickness: 4,
    },
  ),
  custom('round-60-small-magnets', magnets(round60, { diameter: 3, thickness: 1 }), {
    standard_size: 'round-60',
    magnet_diameter: 3,
    magnet_thickness: 1,
  }),
  custom(
    'rect-50x100-override',
    { ...tray('rect', 50, 100, { columns: 2, ranks: 1 }), magnetCounts: { [footprintKey('rect', 50, 100)]: 6 } },
    {
      standard_size: 'rect-50x100',
      columns: 2,
      ranks: 1,
      magnets_per_base: '6',
    },
  ),
  custom(
    'round-40-override-1',
    { ...tray('round', 40, 40), magnetCounts: { [footprintKey('round', 40, 40)]: 1 } },
    {
      standard_size: 'round-40',
      magnets_per_base: '1',
    },
  ),
  custom(
    'round-50-walls',
    { ...tray('round', 50, 50, { columns: 2, ranks: 2 }), baseWallThickness: 4, magnetBossWall: 2 },
    {
      standard_size: 'round-50',
      columns: 2,
      ranks: 2,
      base_wall_thickness: 4,
      base_wall_around_pocket: 2,
    },
  ),
]
