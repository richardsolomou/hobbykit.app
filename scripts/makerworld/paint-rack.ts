import type { ManifoldToplevel } from 'manifold-3d'
import type { MeshLike } from '../../src/core/geometry/exporters'
import { buildPaintRack, defaultPaintRackConfig, paintRackLayout } from '../../src/core/geometry/paintRack'
import { exportSegmentsFor } from '../../src/core/geometry/quality'
import type { PaintRackConfig } from '../../src/core/geometry/types'
import type { Case } from './shared'

/** Matches PLATE_GAP in the script. */
const PLATE_GAP = 5

type Part = 'all' | 'module' | 'left-end' | 'right-end'

/** Each piece as the app exports it, centred on its footprint. */
function exported(wasm: ManifoldToplevel, config: PaintRackConfig): { kind: string; mesh: MeshLike }[] {
  const layout = paintRackLayout(config)
  const segments = exportSegmentsFor(Math.max(layout.width, layout.length))
  return layout.pieces.map((piece, index) => ({ kind: piece.kind, mesh: buildPaintRack(wasm, { ...config, piece: index, segments }).mesh }))
}

/** The pieces left to right, PLATE_GAP apart, as the script lays them out to print together. */
function row(meshes: MeshLike[]): MeshLike {
  const spans = meshes.map(({ numProp, vertProperties: v }) => {
    let [min, max] = [Infinity, -Infinity]
    for (let i = 0; i < v.length; i += numProp) [min, max] = [Math.min(min, v[i]), Math.max(max, v[i])]
    return { min, max }
  })
  const total = spans.reduce((sum, { min, max }) => sum + max - min, 0) + PLATE_GAP * (meshes.length - 1)
  const vertices: number[] = []
  const triangles: number[] = []
  let left = -total / 2
  meshes.forEach(({ numProp, vertProperties: v, triVerts }, index) => {
    const { min, max } = spans[index]
    const shift = left - min
    const offset = vertices.length / 3
    for (let i = 0; i < v.length; i += numProp) vertices.push(v[i] + shift, v[i + 1], v[i + 2])
    for (const t of triVerts) triangles.push(t + offset)
    left += max - min + PLATE_GAP
  })
  return { numProp: 3, vertProperties: new Float32Array(vertices), triVerts: new Uint32Array(triangles) }
}

const rack = (columns: number, rows: number, changes: Partial<PaintRackConfig> = {}): PaintRackConfig => ({
  ...defaultPaintRackConfig(),
  items: [{ id: 'module', kind: 'module', columns }],
  rows,
  ...changes,
})

const custom = (name: string, config: PaintRackConfig, part: Part, defines: Case['defines']): Case => ({
  name,
  build: (wasm) => {
    const pieces = exported(wasm, config)
    if (part === 'all') return row(pieces.map((p) => p.mesh))
    const piece = pieces.find((p) => p.kind === part)
    if (!piece) throw new Error(`${name} has no ${part}`)
    return piece.mesh
  },
  defines: { part, columns: config.items[0].columns, rows: config.rows, ...defines },
})

const both = { leftEnd: true, rightEnd: true }
const ends = { left_end: true, right_end: true }

export const cases: Case[] = [
  custom('default', rack(5, 4), 'all', {}),
  custom('1x1', rack(1, 1), 'all', {}),
  custom('2x2-left', rack(2, 2, { leftEnd: true }), 'all', { left_end: true }),
  custom('3x3-ends', rack(3, 3, both), 'all', ends),
  custom('8x5-ends', rack(8, 5, both), 'all', ends),
  custom('10x6-ends', rack(10, 6, both), 'all', ends),
  custom('5x4-module', rack(5, 4, both), 'module', ends),
  custom('5x4-left-end', rack(5, 4, both), 'left-end', ends),
  custom('5x4-right-end', rack(5, 4, both), 'right-end', ends),
  custom('5x5-right-only', rack(5, 5, { rightEnd: true }), 'right-end', { right_end: true }),
  custom('flat-decks', rack(4, 3, { pocketDepth: 0 }), 'all', { pocket_depth: 0 }),
  custom('deep-pocket', rack(3, 2, { pocketDepth: 12, pocketDiameter: 30 }), 'all', { pocket_depth: 12, pocket_diameter: 30 }),
  custom('big-cells', rack(3, 3, { pitch: 45, seatDiameter: 32, holeDiameter: 24, pocketDiameter: 40 }), 'all', {
    cell_size: 45,
    seat_diameter: 32,
    push_out_hole: 24,
    pocket_diameter: 40,
  }),
  custom('small-cells', rack(4, 3, { pitch: 28, seatDiameter: 20, holeDiameter: 14, pocketDiameter: 25 }), 'all', {
    cell_size: 28,
    seat_diameter: 20,
    push_out_hole: 14,
    pocket_diameter: 25,
  }),
  custom('thick-walls', rack(3, 3, { wall: 1.6, frontHeight: 20, pocketDiameter: 32 }), 'all', {
    wall_thickness: 1.6,
    front_deck_height: 20,
    pocket_diameter: 32,
  }),
  custom('low-floored', rack(3, 3, { frontHeight: 17, rise: 4, seatDepth: 14 }), 'all', { rise_per_row: 4, seat_depth: 14 }),
  custom('flat-rise', rack(3, 2, { rise: 0 }), 'all', { rise_per_row: 0 }),
  custom('tall', rack(2, 4, { frontHeight: 40, rise: 35, seatDepth: 25 }), 'all', {
    front_deck_height: 40,
    rise_per_row: 35,
    seat_depth: 25,
  }),
]
