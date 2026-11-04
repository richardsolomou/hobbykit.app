import { buildHolder, defaultHolderConfig, holderGroup, holderPlan } from '../../src/core/geometry/holder'
import { isElongated, trimNumber } from '../../src/core/geometry/outline'
import { footprintKey, SIZES_BY_SHAPE, type SizePreset, standardSize } from '../../src/core/geometry/presets'
import { exportSegmentsFor } from '../../src/core/geometry/quality'
import type { HolderConfig, HolderGroup } from '../../src/core/geometry/types'
import { type Case, font } from './shared'

type Group = Partial<Omit<HolderGroup, 'id' | 'quantity'>>

const sizeKey = (p: SizePreset) =>
  `${p.shape}-${isElongated(p.shape) ? `${trimNumber(p.width)}x${trimNumber(p.length ?? p.width)}` : trimNumber(p.width)}`
const sized = (p: SizePreset): Group => ({ shape: p.shape, width: p.width, length: p.length ?? p.width })

/** The first module the app exports, built at export quality, against the script with `defines`. */
function custom(name: string, quantity: number, group: Group, changes: Partial<HolderConfig>, defines: Case['defines']): Case {
  return {
    name,
    build: (wasm) => {
      const config = { ...defaultHolderConfig(), ...changes, groups: [holderGroup('models-1', quantity, group)] }
      const module = holderPlan(config).modules[0]
      if (!module) throw new Error(`${name}: nothing fits`)
      const segments = exportSegmentsFor(Math.max(module.layout.width, module.layout.length))
      return buildHolder(wasm, { ...config, module: 0, segments }, font).mesh
    },
    defines: { quantity, ...defines },
  }
}

const magnets = defaultHolderConfig().magnets

export const cases: Case[] = [
  custom('default', 5, { width: 32 }, {}, {}),
  ...Object.values(SIZES_BY_SHAPE)
    .flat()
    .map((p) => custom(sizeKey(p), 3, sized(p), {}, { standard_size: sizeKey(p) })),
  // Rows fail, so these come from the app's relaxation; the second holds more than the capacity estimate for its size.
  custom('relaxed-round-60', 7, sized(standardSize('round', '60')), {}, { standard_size: 'round-60' }),
  custom('relaxed-beyond-estimate-round-60', 10, sized(standardSize('round', '60')), {}, { standard_size: 'round-60' }),
  custom(
    'edge-0-hex-60',
    4,
    sized(standardSize('polygon', '60')),
    { edgeSpacing: 0 },
    { standard_size: 'polygon-60', from_holder_edge: 0 },
  ),
  custom('edge-0-round-32', 7, sized(standardSize('round', '32')), { edgeSpacing: 0 }, { standard_size: 'round-32', from_holder_edge: 0 }),
  custom(
    'relaxed-hex-25',
    7,
    sized(standardSize('polygon', '25')),
    { maxColumns: 4, maxRows: 4, spacing: 2, edgeSpacing: 1, slotClearance: 1 },
    {
      standard_size: 'polygon-25',
      maximum_columns: 4,
      maximum_rows: 4,
      between_miniatures: 2,
      from_holder_edge: 1,
      slot_clearance: 1,
    },
  ),
  custom('staggered-round-28.5', 9, sized(standardSize('round', '28.5')), {}, { standard_size: 'round-28.5' }),
  custom('full-round-25', 100, sized(standardSize('round', '25')), {}, { standard_size: 'round-25' }),
  custom(
    'relaxed-round-100-12x12',
    11,
    sized(standardSize('round', '100')),
    { maxColumns: 12, maxRows: 12 },
    {
      standard_size: 'round-100',
      maximum_columns: 12,
      maximum_rows: 12,
    },
  ),
  custom('rows-rect-25x50', 12, sized(standardSize('rect', '25×50')), {}, { standard_size: 'rect-25x50' }),
  custom(
    'rows-pill-60x35.5',
    7,
    sized(standardSize('pill', '60×35.5')),
    { spacing: 2, edgeSpacing: 1 },
    {
      standard_size: 'pill-60x35.5',
      between_miniatures: 2,
      from_holder_edge: 1,
    },
  ),
  custom(
    'limited-round-40',
    9,
    sized(standardSize('round', '40')),
    { maxColumns: 2, maxRows: 7, spacing: 1.5, edgeSpacing: 0.75, slotClearance: 0.3 },
    {
      standard_size: 'round-40',
      maximum_columns: 2,
      maximum_rows: 7,
      between_miniatures: 1.5,
      from_holder_edge: 0.75,
      slot_clearance: 0.3,
    },
  ),
  custom('oval-custom', 4, { shape: 'oval', width: 70, length: 45 }, {}, { standard_size: 'custom', shape: 'oval', width: 70, depth: 45 }),
  custom('round-custom', 6, { width: 37.5 }, {}, { standard_size: 'custom', width: 37.5 }),
  custom('no-labels', 5, { width: 32 }, { engraving: { enabled: false, placement: 'slots' } }, { labels: false }),
  custom('module-label', 5, { width: 32 }, { engraving: { enabled: true, placement: 'module' } }, { label_location: 'module' }),
  custom(
    'module-label-oval',
    4,
    sized(standardSize('oval', '60×35.5')),
    { engraving: { enabled: true, placement: 'module' } },
    {
      standard_size: 'oval-60x35.5',
      label_location: 'module',
    },
  ),
  custom(
    'module-label-full',
    24,
    sized(standardSize('round', '40')),
    { engraving: { enabled: true, placement: 'module' } },
    {
      standard_size: 'round-40',
      label_location: 'module',
    },
  ),
  custom('no-magnets', 5, { width: 32 }, { magnets: { ...magnets, enabled: false } }, { slot_magnets: false }),
  custom(
    'five-cross',
    3,
    sized(standardSize('round', '60')),
    { magnets: { ...magnets, layout: 'five-cross' } },
    {
      standard_size: 'round-60',
      pocket_layout: 'five-cross',
    },
  ),
  custom(
    'magnets-6x3',
    3,
    sized(standardSize('round', '60')),
    { magnets: { ...magnets, diameter: 6, thickness: 3 }, slotDepth: 3, height: 14 },
    {
      standard_size: 'round-60',
      magnet_diameter: 6,
      magnet_thickness: 3,
    },
  ),
  custom(
    'magnets-override',
    3,
    sized(standardSize('oval', '90×52.5')),
    { magnetCounts: { [footprintKey('oval', 90, 52.5)]: 4 } },
    {
      standard_size: 'oval-90x52.5',
      magnets_per_slot: '4',
    },
  ),
  custom(
    'magnet-fit',
    3,
    sized(standardSize('round', '50')),
    {
      magnets: { ...magnets, clearance: 0.4, depthClearance: 0.3 },
      baseWallThickness: 3,
      magnetBossWall: 1.5,
    },
    {
      standard_size: 'round-50',
      magnet_diameter_clearance: 0.4,
      magnet_depth_clearance: 0.3,
      base_wall_thickness: 3,
      wall_around_pocket: 1.5,
    },
  ),
  custom(
    'deep-slots',
    4,
    sized(standardSize('rect', '50×50')),
    { height: 21, slotDepth: 10 },
    {
      standard_size: 'rect-50x50',
      holder_height: 21,
      slot_depth: 10,
    },
  ),
]
