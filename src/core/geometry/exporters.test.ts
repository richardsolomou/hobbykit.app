import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { DEFAULT_FILAMENTS } from './filaments'
import { needsBrim, packPlates, to3mf, to3mfPlates, type MeshLike } from './exporters'

const PLATE = 256

/** A flat stand-in with the given footprint, deliberately off the origin like a centred base. */
function slab(width: number, length: number): MeshLike {
  const x = -width / 2
  const y = -length / 2
  return {
    numProp: 3,
    vertProperties: new Float32Array([x, y, 0, x + width, y, 0, x, y + length, 0, x + width, y + length, 3]),
    triVerts: new Uint32Array([0, 1, 2, 1, 3, 2]),
  }
}

const overlaps = (a: { x: number; y: number; w: number; l: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.l && b.y < a.y + a.l

describe('packPlates', () => {
  const meshes = [slab(32, 32), slab(60, 35)]
  const sizes = [
    { w: 32, l: 32 },
    { w: 60, l: 35 },
  ]

  it('places every copy', () => {
    expect(packPlates(meshes, [10, 3]).flat()).toHaveLength(13)
  })

  it('keeps every copy on its build plate', () => {
    const items = packPlates(meshes, [40, 12]).flat()
    expect(items.every(({ object, x, y }) => x >= 0 && y >= 0 && x + sizes[object].w <= PLATE && y + sizes[object].l <= PLATE)).toBe(true)
  })

  it('never overlaps two copies on one plate', () => {
    const plates = packPlates(meshes, [40, 12]).map((items) => items.map(({ object, x, y }) => ({ x, y, ...sizes[object] })))
    expect(plates.every((boxes) => boxes.every((a, i) => boxes.every((b, j) => i === j || !overlaps(a, b))))).toBe(true)
  })

  it('fits a handful of bases on one plate', () => {
    expect(packPlates(meshes, [10, 3])).toHaveLength(1)
  })

  it('spills onto more plates when one is full', () => {
    expect(packPlates([slab(100, 100)], [5])).toHaveLength(2)
  })
})

describe('to3mfPlates', () => {
  const meshes = [
    { mesh: slab(32, 32), name: 'base-round-32mm' },
    { mesh: slab(40, 40), name: 'base-round-40mm' },
  ]
  const archive = unzipSync(
    to3mfPlates(
      meshes,
      [
        {
          name: 'plate-1',
          items: [
            { object: 0, x: 10, y: 10 },
            { object: 0, x: 50, y: 10 },
          ],
        },
        { name: 'plate-2', items: [{ object: 1, x: 10, y: 10 }] },
      ],
      DEFAULT_FILAMENTS,
    ),
  )
  const model = new TextDecoder().decode(archive['3D/3dmodel.model'])
  const settings = new TextDecoder().decode(archive['Metadata/model_settings.config'])

  it('stores each size once', () => {
    expect(model.match(/<object /g)).toHaveLength(2)
  })

  it('places a build item for every copy', () => {
    expect(model.match(/<item objectid="2"/g)).toHaveLength(2)
  })

  it('numbers the copies of an object as its instances', () => {
    expect(settings).toContain('<assemble_item object_id="2" instance_id="1"')
  })

  it('assigns each copy to its own plate', () => {
    const plates = settings.split('<plate>').slice(1)
    expect(plates.map((plate) => plate.match(/<model_instance>/g)?.length)).toEqual([2, 1])
  })

  it('moves each copy to its corner on its plate', () => {
    expect(model).toContain('transform="1 0 0 0 1 0 0 0 1 66 26 0"')
  })
})

describe('to3mfPlates with a second filament', () => {
  const meshes = [
    { mesh: slab(30, 30), name: 'counter-tens-drum' },
    { mesh: slab(10, 10), name: 'counter-inserts', secondFilament: { mesh: slab(4, 4), name: 'counter-inserts-marks' } },
  ]
  const archive = unzipSync(
    to3mfPlates(
      meshes,
      [
        { name: 'counter', items: [{ object: 0, x: 10, y: 10 }] },
        { name: 'counter-inserts', items: [{ object: 1, x: 10, y: 10 }] },
      ],
      DEFAULT_FILAMENTS,
    ),
  )
  const text = (path: string) => new TextDecoder().decode(archive[path])

  it('prints the second part of an object in the second filament', () => {
    expect(text('Metadata/model_settings.config')).toMatch(
      /<part id="6" subtype="normal_part"><metadata key="name" value="counter-inserts-marks"\/>.*?<metadata key="extruder" value="2"\/>/,
    )
  })

  it('prints the first part of that object in the first filament', () => {
    expect(text('Metadata/model_settings.config')).toMatch(
      /<part id="3" subtype="normal_part"><metadata key="name" value="counter-inserts"\/>.*?<metadata key="extruder" value="1"\/>/,
    )
  })

  it('stores both parts in the object file', () => {
    expect(text('3D/Objects/object_2.model').match(/<object id="(\d+)"/g)).toEqual(['<object id="3"', '<object id="6"'])
  })

  it('assembles the object from both parts', () => {
    expect(
      text('3D/3dmodel.model')
        .match(/<component [^>]*objectid="\d+"/g)
        ?.map((tag) => tag.match(/objectid="(\d+)"/)?.[1]),
    ).toEqual(['1', '3', '6'])
  })

  it('gives the second filament its own colour', () => {
    expect(JSON.parse(text('Metadata/project_settings.config')).filament_colour).toEqual([DEFAULT_FILAMENTS.body, DEFAULT_FILAMENTS.second])
  })

  it('names a Bambu printer, so Bambu Studio loads the project settings', () => {
    expect(JSON.parse(text('Metadata/project_settings.config')).printer_model).toBe('Bambu Lab X2D')
  })

  it('counts the extruders, so Bambu Studio accepts the project settings', () => {
    expect(JSON.parse(text('Metadata/project_settings.config')).nozzle_diameter).toEqual(['0.4', '0.4'])
  })

  it('declares one filament when nothing asks for the second', () => {
    const plain = unzipSync(to3mfPlates([meshes[0]], [{ name: 'tens-drum', items: [{ object: 0, x: 10, y: 10 }] }], DEFAULT_FILAMENTS))
    expect(JSON.parse(new TextDecoder().decode(plain['Metadata/project_settings.config'])).filament_settings_id).toHaveLength(1)
  })
})

describe('needsBrim', () => {
  /** A box standing on the plate: `side` square and `height` tall, closed underneath. */
  const box = (side: number, height: number): MeshLike => ({
    numProp: 3,
    vertProperties: new Float32Array([0, 0, 0, side, 0, 0, 0, side, 0, side, side, 0, 0, 0, height]),
    triVerts: new Uint32Array([0, 2, 1, 1, 2, 3, 0, 1, 4]),
  })

  it('adds one to a part tall for what touches the plate', () => {
    expect(needsBrim({ mesh: box(10, 5), name: 'dial' })).toBe(true)
  })

  it('leaves a part that sits broad on the plate alone', () => {
    expect(needsBrim({ mesh: box(10, 2), name: 'side' })).toBe(false)
  })

  it('writes the brim into the project', () => {
    const config = new TextDecoder().decode(
      unzipSync(to3mf([{ mesh: box(10, 5), name: 'dial' }], DEFAULT_FILAMENTS))['Metadata/model_settings.config'],
    )

    expect(config).toContain('<metadata key="brim_type" value="outer_only"/><metadata key="brim_width" value="6"/>')
  })
})

describe('project settings', () => {
  const project = (colours = DEFAULT_FILAMENTS) =>
    JSON.parse(
      new TextDecoder().decode(unzipSync(to3mf([{ mesh: slab(30, 30), name: 'part' }], colours))['Metadata/project_settings.config']),
    )

  it('names both of the X2D nozzles', () => {
    expect(project().nozzle_diameter).toEqual(['0.4', '0.4'])
  })

  it('writes the chosen body colour', () => {
    expect(project({ ...DEFAULT_FILAMENTS, body: '#C12E1F' }).filament_colour).toEqual(['#C12E1F'])
  })

  it('keeps parts out of reach of the second nozzle', () => {
    expect(packPlates([slab(30, 30)], [1])[0][0].x).toBeGreaterThanOrEqual(20.5 + 6)
  })
})
