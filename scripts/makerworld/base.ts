import { buildBase } from '../../src/core/geometry/base'
import { isElongated } from '../../src/core/geometry/outline'
import { presetFor, resized, SIZES_BY_SHAPE, standardSize } from '../../src/core/geometry/presets'
import { exportSegmentsFor } from '../../src/core/geometry/quality'
import type { BaseConfig } from '../../src/core/geometry/types'
import { type Case, font } from './shared'

const key = (c: BaseConfig) => `${c.shape}-${isElongated(c.shape) ? `${c.width}x${c.length}` : c.width}`
const custom = (name: string, config: BaseConfig, defines: Case['defines']): Case => ({
  name,
  build: (wasm) => buildBase(wasm, { ...config, segments: exportSegmentsFor(Math.max(config.width, config.length)) }, font).mesh,
  defines,
})

const round32 = presetFor(standardSize('round', '32'))
const round60 = presetFor(standardSize('round', '60'))
const round160 = presetFor(standardSize('round', '160'))
const rect = presetFor(standardSize('rect', '25×50'))

export const cases: Case[] = [
  ...Object.values(SIZES_BY_SHAPE)
    .flat()
    .map((preset) => {
      const config = presetFor(preset)
      return custom(key(config), config, { standard_size: key(config) })
    }),
  custom('round-bevel', { ...round32, profile: 'bevel' }, { standard_size: 'round-32', bottom_edge: 'bevel' }),
  custom(
    'round-round-edge',
    { ...round32, profile: 'round', profileSize: 1.5 },
    { standard_size: 'round-32', bottom_edge: 'round', edge_size: 1.5 },
  ),
  custom('round-straight', { ...round32, profile: 'straight' }, { standard_size: 'round-32', bottom_edge: 'straight' }),
  custom(
    'round-custom-label',
    { ...round32, label: { ...round32.label, text: 'Squad Ç' } },
    { standard_size: 'round-32', label_text: 'Squad Ç' },
  ),
  custom(
    'round-160-long-label',
    { ...round160, label: { ...round160.label, text: 'Gargantuan Squiggoth' } },
    { standard_size: 'round-160', label_text: 'Gargantuan Squiggoth' },
  ),
  custom(
    'rect-cramped-label',
    { ...rect, label: { ...rect.label, text: 'Knight 12' } },
    { standard_size: 'rect-25x50', label_text: 'Knight 12' },
  ),
  custom('round-no-label', { ...round32, label: { ...round32.label, enabled: false } }, { standard_size: 'round-32', labels: false }),
  custom(
    'round-five-cross',
    { ...round60, magnets: { ...round60.magnets, layout: 'five-cross', count: 5 }, ribs: { ...round60.ribs, count: 4 } },
    { standard_size: 'round-60', pocket_layout: 'five-cross' },
  ),
  custom('round-6x3-magnets', resized({ ...round60, magnets: { ...round60.magnets, diameter: 6, thickness: 3 } }, 60, 60), {
    standard_size: 'round-60',
    magnet_diameter: 6,
    magnet_thickness: 3,
  }),
  custom(
    'round-no-magnets',
    { ...round32, magnets: { ...round32.magnets, count: 0 }, ribs: { ...round32.ribs, count: 3 } },
    { standard_size: 'round-32', magnets_per_base: '0' },
  ),
  custom('rect-sharp', { ...rect, cornerRadius: 0.5 }, { standard_size: 'rect-25x50', corner_radius: 0.5 }),
  custom(
    'octagon-custom',
    { ...resized(presetFor(standardSize('polygon', '40')), 44, 44), sides: 8 },
    { standard_size: 'custom', shape: 'polygon', width: 44, sides: 8 },
  ),
  custom('oval-custom', resized(presetFor(standardSize('oval', '75×42')), 70, 45), {
    standard_size: 'custom',
    shape: 'oval',
    width: 70,
    depth: 45,
  }),
]
