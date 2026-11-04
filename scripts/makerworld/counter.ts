import { buildCounter, defaultCounterConfig } from '../../src/core/geometry/counter'
import { exportSegmentsFor } from '../../src/core/geometry/quality'
import type { CounterConfig, CounterPart } from '../../src/core/geometry/types'
import { type Case, font } from './shared'

const DRUM_PARTS: CounterPart[] = ['tens', 'pointer', 'units']
const TILE_PARTS = ['tile-bases', 'tile-marks']

/** One case per part, each built the way the app exports it; the tiles' bases and raised marks are separate pieces. */
function parts(name: string, changes: Partial<CounterConfig>, defines: Case['defines'], only?: string[]): Case[] {
  const config = { ...defaultCounterConfig(), ...changes }
  const one = (piece: string, part: CounterPart, marks = false): Case => ({
    name: `${name}-${piece}`,
    build: (wasm) => {
      const result = buildCounter(wasm, { ...config, part, segments: exportSegmentsFor(config.drumDiameter) }, font)
      return marks ? result.inserts! : result.mesh
    },
    defines: { ...defines, part: piece },
  })
  const all = [
    ...DRUM_PARTS.map((part) => one(part, part)),
    ...(config.inserts ? [one('tile-bases', 'inserts'), one('tile-marks', 'inserts', true)] : []),
  ]
  return only ? all.filter((c) => only.some((piece) => c.name === `${name}-${piece}`)) : all
}

export const cases: Case[] = [
  ...parts('default', {}, {}),
  ...parts('engraved', { inserts: false }, { colour_inserts: false }),
  ...parts('smallest', { drumDiameter: 32.4, drumWidth: 6 }, { drum_diameter: 32.4, drum_width: 6 }),
  ...parts('largest', { drumDiameter: 60, drumWidth: 24 }, { drum_diameter: 60, drum_width: 24 }),
  ...parts(
    'engraved-wide',
    { inserts: false, drumDiameter: 48, drumWidth: 20 },
    { colour_inserts: false, drum_diameter: 48, drum_width: 20 },
  ),
  ...parts('loose', { clearance: 0.6, click: 0.4 }, { fit_clearance: 0.6, click: 0.4 }, DRUM_PARTS),
  ...parts('tight', { clearance: 0.1, click: 0.1 }, { fit_clearance: 0.1, click: 0.1 }, DRUM_PARTS),
  ...parts('snug-tiles', { insertClearance: 0 }, { insert_clearance: 0 }, ['tile-bases']),
  ...parts('loose-tiles', { insertClearance: 0.2 }, { insert_clearance: 0.2 }, ['tile-bases']),
  ...parts('one-tile', { tile: 7 }, { tiles: '7' }, TILE_PARTS),
  ...parts('arrows-tile', { tile: 'arrows', insertClearance: 0.2 }, { tiles: 'arrows', insert_clearance: 0.2 }, TILE_PARTS),
  ...parts('magnets', { detent: 'magnets' }, { detent: 'magnets' }, DRUM_PARTS),
  ...parts(
    'magnets-smallest',
    { detent: 'magnets', drumDiameter: 32.4, drumWidth: 6 },
    { detent: 'magnets', drum_diameter: 32.4, drum_width: 6 },
    DRUM_PARTS,
  ),
  ...parts(
    'magnets-engraved',
    { detent: 'magnets', inserts: false, magnets: { diameter: 3, thickness: 1, clearance: 0, depthClearance: 0 } },
    { detent: 'magnets', colour_inserts: false, magnet_diameter: 3, magnet_thickness: 1, magnet_clearance: 0, magnet_depth_clearance: 0 },
  ),
  ...parts(
    'magnets-thick',
    { detent: 'magnets', drumDiameter: 40, drumWidth: 7.1, magnets: { diameter: 6, thickness: 6, clearance: 0.3, depthClearance: 0.1 } },
    {
      detent: 'magnets',
      drum_diameter: 40,
      drum_width: 7.1,
      magnet_diameter: 6,
      magnet_thickness: 6,
      magnet_clearance: 0.3,
      magnet_depth_clearance: 0.1,
    },
    [...DRUM_PARTS, ...TILE_PARTS],
  ),
]
