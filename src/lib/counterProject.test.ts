import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { counterTileLayout, defaultCounterConfig } from '../core/geometry/counter'
import { to3mfPlates, type MeshLike } from '../core/geometry/exporters'
import { DEFAULT_FILAMENTS } from '../core/geometry/filaments'
import { counterProject } from './counterProject'

function slab(width: number, length: number, z = 0): MeshLike {
  return {
    numProp: 3,
    vertProperties: new Float32Array([0, 0, z, width, 0, z, 0, length, z, width, length, z + 1]),
    triVerts: new Uint32Array([0, 1, 2, 1, 3, 2]),
  }
}

const layout = counterTileLayout(defaultCounterConfig())
const bodies = ['tens-wheel', 'left-side', 'units-wheel'].map((part) => ({ mesh: slab(30, 30), name: `counter-34mm-${part}` }))
const { parts, plates } = counterProject('counter-34mm', bodies, [], layout, () => ({ base: slab(10, 8), mark: slab(6, 4, 1) }))
const archive = unzipSync(to3mfPlates(parts, plates, DEFAULT_FILAMENTS))
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
    expect(tiles).toHaveLength(2 * 10)
  })

  it('puts every tile on the tile plate', () => {
    expect(tilePlate.match(/<model_instance>/g)).toHaveLength(2 * 10)
  })

  it('names each tile by its drum and digit', () => {
    expect(tiles.map(({ name }) => name)).toEqual(expect.arrayContaining(['counter-34mm-tile-tens-7', 'counter-34mm-tile-units-7']))
  })

  it('prints each tile base in filament 1 and its mark in filament 2', () => {
    expect(new Set(tiles.map(({ extruders }) => extruders.join(',')))).toEqual(new Set(['1,2']))
  })

  it('keeps the bodies in filament 1 alone', () => {
    expect(objects.filter(({ name }) => !name.includes('-tile-')).map(({ extruders }) => extruders)).toEqual([['1'], ['1'], ['1']])
  })

  it('prints each tile mark in filament 3 when the digits have their own', () => {
    const third = counterProject('counter-34mm', bodies, [], layout, () => ({ base: slab(10, 8), mark: slab(6, 4, 1) }), 3)
    const config = new TextDecoder().decode(
      unzipSync(to3mfPlates(third.parts, third.plates, DEFAULT_FILAMENTS))['Metadata/model_settings.config'],
    )

    expect(config).toMatch(/-tile-units-7-mark"\/>.*?<metadata key="extruder" value="3"\/>/)
  })

  it('puts the brackets on the tile plate, so the plate changes filament once', () => {
    const bracket = (side: string) => ({
      mesh: slab(5, 12),
      name: `counter-34mm-${side}-bracket`,
      secondFilament: { mesh: slab(5, 12, 1), name: `counter-34mm-${side}-bracket-marks` },
    })
    const project = counterProject('counter-34mm', bodies, [bracket('left'), bracket('right')], layout, () => ({
      base: slab(10, 8),
      mark: slab(6, 4, 1),
    }))

    expect(
      project.plates
        .at(-1)!
        .items.map(({ object }) => project.parts[object].name)
        .filter((name) => name.endsWith('-bracket')),
    ).toEqual(['counter-34mm-left-bracket', 'counter-34mm-right-bracket'])
  })

  it('names the printer Bambu Studio checks a project against', () => {
    expect(JSON.parse(text('Metadata/project_settings.config'))).toMatchObject({
      printer_model: 'Bambu Lab X2D',
      nozzle_diameter: ['0.4', '0.4'],
    })
  })
})
