import { buildCounter, defaultCounterConfig } from '../../src/core/geometry/counter'
import { forExport } from '../../src/core/geometry/exportQuality'
import type { CounterConfig, CounterPart } from '../../src/core/geometry/types'
import { type Case, font } from './shared'

type Piece = 'axle' | 'left_plate' | 'right_plate' | `dial_${1 | 2 | 3 | 4}`

const PARTS: Record<string, { part: CounterPart; dial?: number }> = {
  axle: { part: 'axle' },
  left_plate: { part: 'left' },
  right_plate: { part: 'right' },
  dial_1: { part: 'dial', dial: 0 },
  dial_2: { part: 'dial', dial: 1 },
  dial_3: { part: 'dial', dial: 2 },
  dial_4: { part: 'dial', dial: 3 },
}

/** Each piece's body, and its second colour where it has one, each compared on its own as the script exports them. */
function custom(name: string, changes: Partial<CounterConfig>, defines: Case['defines'], pieces: Piece[], colours: Piece[] = []): Case[] {
  const config = { ...defaultCounterConfig(), ...changes }
  const build = (wasm: Parameters<Case['build']>[0], piece: Piece) => buildCounter(wasm, forExport({ ...config, ...PARTS[piece] }), font)
  return [
    ...pieces.map((piece) => ({
      name: `${name}-${piece}`,
      build: (wasm: Parameters<Case['build']>[0]) => build(wasm, piece).mesh,
      defines: { ...defines, part: piece, filament: 'body' },
    })),
    ...colours.map((piece) => ({
      name: `${name}-${piece}-colour`,
      build: (wasm: Parameters<Case['build']>[0]) => {
        const { inserts } = build(wasm, piece)
        if (!inserts) throw new Error(`${name} ${piece} has no second colour`)
        return inserts
      },
      defines: { ...defines, part: piece, filament: 'colour' },
    })),
  ]
}

const blank = defaultCounterConfig().left

export const cases: Case[] = [
  ...custom('default', {}, {}, ['axle', 'left_plate', 'right_plate', 'dial_1', 'dial_2'], ['left_plate', 'dial_1', 'dial_2']),
  ...custom(
    'one-of-16',
    { dials: 1, faces: 16, first: 1 },
    { dials: 1, numbers_per_dial: 16, first_number: 1 },
    ['axle', 'left_plate', 'dial_1'],
    ['dial_1'],
  ),
  ...custom('three', { dials: 3 }, { dials: 3 }, ['axle', 'dial_2'], ['dial_2']),
  ...custom(
    'three-raised',
    { dials: 3, digits: 'raised', relief: 0.7 },
    { dials: 3, digits: 'raised', digit_depth: 0.7 },
    ['dial_2'],
    ['dial_2'],
  ),
  ...custom(
    'four-of-six',
    { dials: 4, faces: 6, first: 1 },
    { dials: 4, numbers_per_dial: 6, first_number: 1 },
    ['axle', 'left_plate', 'dial_1', 'dial_4'],
    ['dial_4'],
  ),
  ...custom(
    'twenty-down',
    { faces: 20, first: 1, countDown: true },
    { numbers_per_dial: 20, first_number: 1, count_down: true },
    ['dial_1'],
    ['dial_1'],
  ),
  ...custom('raised', { digits: 'raised', relief: 0.7 }, { digits: 'raised', digit_depth: 0.7 }, ['dial_1'], ['dial_1']),
  ...custom('engraved', { digits: 'engraved' }, { digits: 'engraved' }, ['left_plate', 'dial_2']),
  ...custom('pointer', { mark: 'pointer' }, { top_row_mark: 'pointer' }, ['left_plate'], ['left_plate']),
  ...custom('no-mark', { mark: 'none' }, { top_row_mark: 'none' }, ['right_plate']),
  ...custom('large', { size: 50 }, { size: 50 }, ['axle', 'right_plate', 'dial_2'], ['dial_2']),
  ...custom('small', { size: 27 }, { size: 27 }, ['axle', 'left_plate', 'dial_1']),
  ...custom(
    'fits',
    { pressFit: 0.2, leadIn: 0.4, click: 0.2, dialClearance: 0.2 },
    { press_fit: 0.2, lead_in: 0.4, click: 0.2, dial_play: 0.2 },
    ['axle', 'left_plate', 'dial_1'],
  ),
  ...custom(
    'text',
    { left: { ...blank, text: 'Life' }, right: { ...blank, text: 'Poison counter' } },
    { left_text: 'Life', right_text: 'Poison counter' },
    ['left_plate', 'right_plate'],
    ['left_plate', 'right_plate'],
  ),
  ...custom(
    'engraved-text',
    { digits: 'engraved', right: { ...blank, text: 'Commander damage' } },
    { digits: 'engraved', right_text: 'Commander damage' },
    ['right_plate'],
  ),
]
