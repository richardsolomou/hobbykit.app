import { exportSegmentsFor } from '../../src/core/geometry/quality'
import { buildFlightStem, defaultFlightStemConfig, stemMaximumDiameter } from '../../src/core/geometry/stem'
import type { FlightStemConfig } from '../../src/core/geometry/types'
import type { Case } from './shared'

const custom = (name: string, changes: Partial<FlightStemConfig>, defines: Case['defines']): Case => {
  const config = { ...defaultFlightStemConfig(), ...changes }
  return {
    name,
    build: (wasm) => buildFlightStem(wasm, { ...config, segments: exportSegmentsFor(stemMaximumDiameter(config)) }).mesh,
    defines,
  }
}

export const cases: Case[] = [
  custom('default', {}, {}),
  ...[20, 30, 35].map((h) => custom(`height-${h}`, { bodyHeight: h }, { stem_height: h })),
  custom(
    'short-thin',
    { bodyHeight: 2, bodyDiameter: 1, modelPegDiameter: 1 },
    { stem_height: 2, body_diameter: 1, model_peg_diameter: 1 },
  ),
  custom('wide', { bodyDiameter: 8 }, { body_diameter: 8 }),
  custom('peg-small', { modelPegDiameter: 1, modelPegLength: 1 }, { model_peg_diameter: 1, model_peg_length: 1 }),
  custom(
    'peg-large',
    { bodyDiameter: 6, modelPegDiameter: 4, modelPegLength: 8 },
    { body_diameter: 6, model_peg_diameter: 4, model_peg_length: 8 },
  ),
  custom('ball-default', { connection: 'ball' }, { connection: 'ball' }),
  custom('ball-small', { connection: 'ball', ballDiameter: 2 }, { connection: 'ball', ball_diameter: 2 }),
  custom('ball-large', { connection: 'ball', bodyHeight: 35, ballDiameter: 8 }, { connection: 'ball', stem_height: 35, ball_diameter: 8 }),
  custom(
    'ball-wider-than-body',
    { connection: 'ball', bodyDiameter: 2.5, ballDiameter: 5 },
    { connection: 'ball', body_diameter: 2.5, ball_diameter: 5 },
  ),
]
