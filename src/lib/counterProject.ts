import { packPlates, type ExportPart, type MeshLike, type Plate } from '../core/geometry/exporters'
import type { CounterTilePlacement } from '../core/geometry/counter'
import type { CounterTile } from '../core/geometry/types'

const TILE_MARGIN = 30

export function counterTileName(name: string, { tile, drum }: Pick<CounterTilePlacement, 'tile' | 'drum'>): string {
  return `${name}-tile-${drum ? `${drum}-` : ''}${tile}`
}

/**
 * The bodies packed onto plates of their own, then every tile as an object of its own on one plate, so any can be
 * deleted before slicing. Each tile is its base and its raised mark, the only parts in the second filament.
 */
export function counterProject(
  name: string,
  bodies: ExportPart[],
  layout: CounterTilePlacement[],
  tileMesh: (tile: CounterTile) => { base: MeshLike; mark: MeshLike },
): { parts: ExportPart[]; plates: Plate[] } {
  const tiles = layout.map((placement): ExportPart => {
    const tileName = counterTileName(name, placement)
    const { base, mark } = tileMesh(placement.tile)
    return { mesh: base, name: tileName, secondFilament: { mesh: mark, name: `${tileName}-mark` } }
  })
  const plates: Plate[] = packPlates(
    bodies.map(({ mesh }) => mesh),
    bodies.map(() => 1),
  ).map((items, index, all) => ({ name: all.length === 1 ? name : `${name}-plate-${index + 1}`, items }))
  if (tiles.length > 0) {
    plates.push({
      name: `${name}-inserts`,
      items: layout.map(({ x, y }, index) => ({ object: bodies.length + index, x: TILE_MARGIN + x, y: TILE_MARGIN + y })),
    })
  }
  return { parts: [...bodies, ...tiles], plates }
}
