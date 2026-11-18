import { buildCounter, defaultCounterConfig } from '../../src/core/geometry/counter'
import { forExport } from '../../src/core/geometry/exportQuality'
import type { CounterConfig, CounterPart } from '../../src/core/geometry/types'
import { type Case, font } from './shared'

const WHEEL_PARTS: CounterPart[] = ['tens', 'left', 'right', 'axle', 'units']
const TILE_PARTS = ['tile-bases', 'tile-marks']

/** One case per part, each built the way the app exports it; the tiles' bases and raised marks are separate pieces. */
function parts(name: string, changes: Partial<CounterConfig>, defines: Case['defines'], only?: string[]): Case[] {
  const chosen = { ...defaultCounterConfig(), ...changes }
  // Printed digits come back in the third filament, so each compares against its own part of the script.
  const config = { ...chosen, digitFilament: chosen.digits === 'printed' ? (3 as const) : (2 as const) }
  const one = (piece: string, part: CounterPart, source: 'mesh' | 'inserts' | 'third' = 'mesh'): Case => ({
    name: `${name}-${piece}`,
    build: (wasm) => {
      const result = buildCounter(wasm, forExport({ ...config, part }), font)
      return result[source]!
    },
    defines: { ...defines, part: piece },
  })
  const all = [
    ...WHEEL_PARTS.map((part) => one(part, part)),
    one('left-bracket', 'left', 'inserts'),
    one('right-bracket', 'right', 'inserts'),
    ...(config.digits === 'printed' ? [one('tens-digits', 'tens', 'third'), one('units-digits', 'units', 'third')] : []),
    ...(config.digits === 'tiles' ? [one('tile-bases', 'inserts'), one('tile-marks', 'inserts', 'inserts')] : []),
  ]
  return only ? all.filter((c) => only.some((piece) => c.name === `${name}-${piece}`)) : all
}

export const cases: Case[] = [
  ...parts('default', {}, {}),
  ...parts('engraved', { digits: 'engraved' }, { digit_style: 'engraved' }),
  ...parts('largest', { drumDiameter: 40 }, { drum_diameter: 40 }),
  ...parts(
    'engraved-wide',
    { digits: 'engraved', drumDiameter: 32, click: 1.2 },
    { digit_style: 'engraved', drum_diameter: 32, click: 1.2 },
  ),
  ...parts('loose', { clearance: 0.4 }, { fit_clearance: 0.4 }, WHEEL_PARTS),
  ...parts('tight', { clearance: 0.1, click: 0.15 }, { fit_clearance: 0.1, click: 0.15 }, WHEEL_PARTS),
  ...parts('printed-large', { digits: 'printed', drumDiameter: 32, click: 1.2 }, { digit_style: 'printed', drum_diameter: 32, click: 1.2 }),
  ...parts('firm', { drumDiameter: 30, click: 0.4 }, { drum_diameter: 30, click: 0.4 }, WHEEL_PARTS),
  ...parts('printed', { digits: 'printed' }, { digit_style: 'printed' }),
  ...parts('smallest', { drumDiameter: 18, click: 0.7 }, { drum_diameter: 18, click: 0.7 }),
  ...parts('no-grip', { grip: 0 }, { grip: 0 }, WHEEL_PARTS),
  ...parts('wide-grip', { grip: 12, drumDiameter: 24, click: 0.9 }, { grip: 12, drum_diameter: 24, click: 0.9 }, WHEEL_PARTS),
  ...parts('snug-tiles', { digits: 'tiles', insertClearance: 0 }, { digit_style: 'tiles', insert_clearance: 0 }, ['tile-bases']),
  ...parts('loose-tiles', { digits: 'tiles', insertClearance: 0.2 }, { digit_style: 'tiles', insert_clearance: 0.2 }, ['tile-bases']),
  ...parts('one-tile', { digits: 'tiles', tile: 7 }, { digit_style: 'tiles', tiles: '7' }, TILE_PARTS),
]
