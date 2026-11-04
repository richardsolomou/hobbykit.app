import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { counterTileLayout, defaultCounterConfig } from '../core/geometry/counter'
import { to3mfPlates, type MeshLike } from '../core/geometry/exporters'
import { counterProject } from './counterProject'

function slab(width: number, length: number, z = 0): MeshLike {
  return {
    numProp: 3,
    vertProperties: new Float32Array([0, 0, z, width, 0, z, 0, length, z, width, length, z + 1]),
    triVerts: new Uint32Array([0, 1, 2, 1, 3, 2]),
  }
}

const layout = counterTileLayout(defaultCounterConfig())
const bodies = ['tens-drum', 'pointer', 'units-drum'].map((part) => ({ mesh: slab(30, 30), name: `counter-34mm-${part}` }))
const { parts, plates } = counterProject('counter-34mm', bodies, layout, () => ({ base: slab(10, 8), mark: slab(6, 4, 1) }))
const archive = unzipSync(to3mfPlates(parts, plates))
const text = (path: string) => new TextDecoder().decode(archive[path])
const settings = text('Metadata/model_settings.config')
const objects = [...settings.matchAll(/<object id="\d+"><metadata key="name" value="([^"]+)"\/>(.*?)<\/object>/g)].map(
  ([, name, body]) => ({
    name,
    extruders: [...body.matchAll(/<part [^>]*>.*?<metadata key="extruder" value="(\d)"\/>/g)].map(([, e]) => e),
  }),
)
const tiles = objects.filter(({ name }) => name.includes('-tile-'))
const tilePlate = settings.split('<plate>').at(-1)!

describe('counterProject', () => {
  it('makes every tile an object of its own', () => {
    expect(tiles).toHaveLength(2 * 10 + 1)
  })

  it('puts every tile on the tile plate', () => {
    expect(tilePlate.match(/<model_instance>/g)).toHaveLength(2 * 10 + 1)
  })

  it('names each tile by its drum and digit', () => {
    expect(tiles.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['counter-34mm-tile-tens-7', 'counter-34mm-tile-units-7', 'counter-34mm-tile-arrows']),
    )
  })

  it('prints each tile base in filament 1 and its mark in filament 2', () => {
    expect(new Set(tiles.map(({ extruders }) => extruders.join(',')))).toEqual(new Set(['1,2']))
  })

  it('keeps the bodies in filament 1 alone', () => {
    expect(objects.filter(({ name }) => !name.includes('-tile-')).map(({ extruders }) => extruders)).toEqual([['1'], ['1'], ['1']])
  })

  it('names the printer Bambu Studio checks a project against', () => {
    expect(JSON.parse(text('Metadata/project_settings.config'))).toMatchObject({ printer_model: 'Bambu Lab P2S', nozzle_diameter: ['0.4'] })
  })
})
