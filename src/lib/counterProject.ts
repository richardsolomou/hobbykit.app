import { footprintBounds, packPlates, type ExportPart, type MeshLike, type Plate } from '../core/geometry/exporters'
import type { CounterTilePlacement } from '../core/geometry/counter'
import type { CounterTile } from '../core/geometry/types'

const TILE_MARGIN = 30
/** Space between the tiles and the brackets beside them, and between brackets. */
const BRACKET_SPACING = 5

/**
 * The bodies packed onto plates of their own, then every tile as an object of its own on one plate, so any can be
 * deleted before slicing. Each tile is its base and its raised mark, which takes the digits' filament. The brackets
 * share the tile plate: each changes filament at the height a tile's mark starts, so the plate changes filament once.
 */
export function counterProject(
  name: string,
  bodies: ExportPart[],
  brackets: ExportPart[],
  layout: CounterTilePlacement[],
  tileMesh: (tile: CounterTile) => { base: MeshLike; mark: MeshLike },
  digitFilament: 2 | 3 = 2,
): { parts: ExportPart[]; plates: Plate[] } {
  const tiles = layout.map((placement): ExportPart => {
    const tileName = `${name}-tile-${placement.drum}-${placement.tile}`
    const { base, mark } = tileMesh(placement.tile)
    const raised = { mesh: mark, name: `${tileName}-mark` }
    return { mesh: base, name: tileName, ...(digitFilament === 3 ? { thirdFilament: raised } : { secondFilament: raised }) }
  })
  const plates: Plate[] = packPlates(
    bodies.map(({ mesh }) => mesh),
    bodies.map(() => 1),
  ).map((items, index, all) => ({ name: all.length === 1 ? name : `${name}-plate-${index + 1}`, items }))
  const tileTop = tiles.length > 0 ? Math.max(...layout.map(({ y }) => y)) + footprintBounds(tiles[0].mesh).length + BRACKET_SPACING : 0
  let across = TILE_MARGIN
  const bracketItems = brackets.map(({ mesh }, index) => {
    const item = { object: bodies.length + tiles.length + index, x: across, y: TILE_MARGIN + tileTop }
    across += footprintBounds(mesh).width + BRACKET_SPACING
    return item
  })
  if (tiles.length + brackets.length > 0) {
    plates.push({
      name: `${name}-${tiles.length > 0 ? 'inserts' : 'brackets'}`,
      items: [
        ...layout.map(({ x, y }, index) => ({ object: bodies.length + index, x: TILE_MARGIN + x, y: TILE_MARGIN + y })),
        ...bracketItems,
      ],
    })
  }
  return { parts: [...bodies, ...tiles, ...brackets], plates }
}
