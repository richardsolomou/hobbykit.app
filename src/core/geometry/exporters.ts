import { zipSync } from 'fflate'
import type { FilamentColours } from './filaments'

/** The slice of a Manifold mesh the exporters need, so they also work on worker output. */
export interface MeshLike {
  numProp: number
  vertProperties: Float32Array
  triVerts: Uint32Array
}

/** Binary STL. Slicers all read it, so it stays the default despite losing topology. */
export function toStl(mesh: MeshLike, header = 'HobbyKit'): Uint8Array {
  const triangles = mesh.triVerts.length / 3
  const out = new DataView(new ArrayBuffer(84 + triangles * 50))
  new Uint8Array(out.buffer).set(new TextEncoder().encode(header.slice(0, 80)))
  out.setUint32(80, triangles, true)

  const { numProp, vertProperties: v, triVerts: t } = mesh
  for (let i = 0; i < triangles; i++) {
    const o = 84 + i * 50
    const [a, b, c] = [t[i * 3] * numProp, t[i * 3 + 1] * numProp, t[i * 3 + 2] * numProp]
    const ux = v[b] - v[a]
    const uy = v[b + 1] - v[a + 1]
    const uz = v[b + 2] - v[a + 2]
    const wx = v[c] - v[a]
    const wy = v[c + 1] - v[a + 1]
    const wz = v[c + 2] - v[a + 2]
    const nx = uy * wz - uz * wy
    const ny = uz * wx - ux * wz
    const nz = ux * wy - uy * wx
    const len = Math.hypot(nx, ny, nz) || 1
    out.setFloat32(o, nx / len, true)
    out.setFloat32(o + 4, ny / len, true)
    out.setFloat32(o + 8, nz / len, true)
    for (const [j, base] of [a, b, c].entries()) {
      out.setFloat32(o + 12 + j * 12, v[base], true)
      out.setFloat32(o + 16 + j * 12, v[base + 1], true)
      out.setFloat32(o + 20 + j * 12, v[base + 2], true)
    }
  }
  return new Uint8Array(out.buffer)
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`

/** One object for the slicer, printed in filament 1, with optional further parts printed in filaments 2 and 3. */
export interface ExportPart {
  mesh: MeshLike
  name: string
  /** The filament the whole of `mesh` prints in, for a part that is all one colour other than the body's. */
  filament?: 2 | 3
  secondFilament?: { mesh: MeshLike; name: string }
  thirdFilament?: { mesh: MeshLike; name: string }
  /** Bambu Studio settings for this object alone, by their project keys. */
  settings?: Record<string, string>
}

/** Each filament takes the nozzle it would in a typical project: the body on one, the colours on the other, so the two rarely need a swap. */
const NOZZLE_FOR_FILAMENT = ['1', '2', '2']

function projectSettings(filaments: number, { body, second, third }: FilamentColours): string {
  const filament = 'Bambu PLA Basic @BBL X2D 0.4 nozzle'
  return JSON.stringify({
    filament_settings_id: Array.from({ length: filaments }, () => filament),
    filament_colour: [body, second, third].slice(0, filaments),
    filament_map: NOZZLE_FOR_FILAMENT.slice(0, filaments),
    filament_map_mode: 'Auto For Flush',
    print_settings_id: '0.20mm Standard @BBL X2D',
    printer_settings_id: 'Bambu Lab X2D 0.4 nozzle',
    // Bambu Studio loads only the geometry of a project whose printer it cannot place or whose extruders it cannot count.
    printer_model: 'Bambu Lab X2D',
    nozzle_diameter: ['0.4', '0.4'],
  })
}
const PLATE_SIZE = 256
const PLATE_STRIDE = PLATE_SIZE * 1.2
const PLATE_MARGIN = 30

function meshXml(mesh: MeshLike): string {
  const { numProp, vertProperties: v, triVerts: t } = mesh
  const vertices: string[] = []
  for (let i = 0; i < v.length; i += numProp) {
    vertices.push(`<vertex x="${v[i]}" y="${v[i + 1]}" z="${v[i + 2]}"/>`)
  }
  const triangles: string[] = []
  for (let i = 0; i < t.length; i += 3) {
    triangles.push(`<triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>`)
  }
  return `<mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh>`
}

/** One copy of an object, its lower-left corner placed at `x`, `y` on its plate. */
export interface PlateItem {
  object: number
  x: number
  y: number
}

export interface Plate {
  name: string
  items: PlateItem[]
}

interface PlacedItem {
  object: number
  instance: number
  plate: number
  transform: string
}

export function footprintBounds({ numProp, vertProperties: vertices }: MeshLike) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < vertices.length; i += numProp) {
    minX = Math.min(minX, vertices[i])
    minY = Math.min(minY, vertices[i + 1])
    maxX = Math.max(maxX, vertices[i])
    maxY = Math.max(maxY, vertices[i + 1])
  }
  return { minX, minY, width: maxX - minX, length: maxY - minY }
}

function placeItems(meshes: { mesh: MeshLike }[], plates: Plate[]): PlacedItem[] {
  const bounds = meshes.map(({ mesh }) => footprintBounds(mesh))
  const instances = meshes.map(() => 0)
  const columns = Math.ceil(Math.sqrt(plates.length))
  return plates.flatMap(({ items }, plate) => {
    const offsetX = (plate % columns) * PLATE_STRIDE
    const offsetY = -Math.floor(plate / columns) * PLATE_STRIDE
    return items.map(({ object, x, y }) => ({
      object,
      instance: instances[object]++,
      plate,
      transform: `1 0 0 0 1 0 0 0 1 ${x - bounds[object].minX + offsetX} ${y - bounds[object].minY + offsetY} 0`,
    }))
  })
}

const PACK_MARGIN = 10
/** The X2D's second nozzle cannot reach the first 20.5mm of the plate, and a brim needs room inside that limit too. */
const PACK_LEFT = 28
const PACK_GAP = 5

/**
 * Shelf-packs every copy onto as many build plates as it takes, deepest parts
 * first, leaving a gap between neighbours so no two copies touch.
 */
export function packPlates(meshes: MeshLike[], copies: number[]): PlateItem[][] {
  const bounds = meshes.map(footprintBounds)
  const limit = PLATE_SIZE - PACK_MARGIN
  const order = meshes.map((_, index) => index).sort((a, b) => bounds[b].length - bounds[a].length || bounds[b].width - bounds[a].width)
  const plates: PlateItem[][] = [[]]
  let x = PACK_LEFT
  let y = PACK_MARGIN
  let shelf = 0
  for (const object of order) {
    const { width, length } = bounds[object]
    for (let copy = 0; copy < copies[object]; copy++) {
      if (x > PACK_LEFT && x + width > limit) {
        x = PACK_LEFT
        y += shelf + PACK_GAP
        shelf = 0
      }
      if (y > PACK_MARGIN && y + length > limit) {
        plates.push([])
        x = PACK_LEFT
        y = PACK_MARGIN
        shelf = 0
      }
      plates[plates.length - 1].push({ object, x, y })
      x += width + PACK_GAP
      shelf = Math.max(shelf, length)
    }
  }
  return plates.filter((items) => items.length > 0)
}

function modelXml(meshes: ExportPart[], plates: Plate[]): string {
  const objects = meshes.map(({ name }, index) => {
    const objectId = (index + 1) * 2
    const uuid = (index + 1).toString(16).padStart(8, '0')
    const components = volumeIds(meshes, index).map((partId, volume) => {
      const partUuid = `${(index + 1).toString(16).padStart(4, '0')}${volume.toString(16).padStart(4, '0')}`
      return `<component p:path="/3D/Objects/object_${index + 1}.model" objectid="${partId}" p:UUID="${partUuid}-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`
    })
    return `<object id="${objectId}" p:UUID="${uuid}-61cb-4c03-9d28-80fed5dfa1dc" type="model" name="${name}"><components>${components.join('')}</components></object>`
  })
  const items = placeItems(meshes, plates).map(({ object, transform }, index) => {
    const uuid = ((index + 1) * 2).toString(16).padStart(8, '0')
    return `<item objectid="${(object + 1) * 2}" p:UUID="${uuid}-b1ec-4553-aec9-835e5b724bb4" transform="${transform}" printable="1"/>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
<metadata name="Application">BambuStudio-02.07.01.62</metadata>
<metadata name="BambuStudio:3mfVersion">1</metadata>
<metadata name="Designer">HobbyKit</metadata>
<resources>${objects.join('')}</resources>
<build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">${items.join('')}</build>
</model>`
}

/** An object's parts: its own mesh, then any parts in other filaments. */
function volumesOf({ mesh, name, filament, secondFilament, thirdFilament }: ExportPart): {
  mesh: MeshLike
  name: string
  filament: number
}[] {
  return [
    { mesh, name, filament: filament ?? 1 },
    ...(secondFilament ? [{ ...secondFilament, filament: 2 }] : []),
    ...(thirdFilament ? [{ ...thirdFilament, filament: 3 }] : []),
  ]
}

/**
 * Ids of an object's parts in its object file: the first sits just under the object's own id, and the others take ids
 * past every object's, so none collide.
 */
function volumeIds(meshes: ExportPart[], index: number): number[] {
  const { secondFilament, thirdFilament } = meshes[index]
  return [
    index * 2 + 1,
    ...(secondFilament ? [meshes.length * 2 + index + 1] : []),
    ...(thirdFilament ? [meshes.length * 3 + index + 1] : []),
  ]
}

function objectModelXml(meshes: ExportPart[], index: number): string {
  const volumes = volumesOf(meshes[index])
  const objects = volumeIds(meshes, index).map((id, volume) => {
    const uuid = `${(index + 1).toString(16).padStart(4, '0')}${volume.toString(16).padStart(4, '0')}`
    return `<object id="${id}" p:UUID="${uuid}-81cb-4c03-9d28-80fed5dfa1dc" type="model">${meshXml(volumes[volume].mesh)}</object>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
<metadata name="BambuStudio:3mfVersion">1</metadata>
<resources>${objects.join('')}</resources>
<build/>
</model>`
}

function modelRelationshipsXml(count: number): string {
  const relationships = Array.from(
    { length: count },
    (_, index) =>
      `<Relationship Target="/3D/Objects/object_${index + 1}.model" Id="rel-${index + 1}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`
}

/**
 * How tall a part stands for the size of what touches the plate, which is what lets a nozzle knock it loose. On real
 * prints a counter's side pieces, at 0.26, held on their own; its dials, at 0.40, and its tube snapped off.
 */
const BRIM_SLENDERNESS = 0.33
const BRIM_WIDTH = 6

export function needsBrim(part: ExportPart): boolean {
  const meshes = volumesOf(part).map(({ mesh }) => mesh)
  let bottom = Infinity
  let top = -Infinity
  for (const { numProp, vertProperties } of meshes) {
    for (let i = 2; i < vertProperties.length; i += numProp) {
      bottom = Math.min(bottom, vertProperties[i])
      top = Math.max(top, vertProperties[i])
    }
  }
  let contact = 0
  for (const { numProp, vertProperties: v, triVerts: t } of meshes) {
    for (let i = 0; i < t.length; i += 3) {
      const [a, b, c] = [t[i] * numProp, t[i + 1] * numProp, t[i + 2] * numProp]
      if (Math.max(v[a + 2], v[b + 2], v[c + 2]) > bottom + 0.01) continue
      contact += Math.abs((v[b] - v[a]) * (v[c + 1] - v[a + 1]) - (v[c] - v[a]) * (v[b + 1] - v[a + 1])) / 2
    }
  }
  return (top - bottom) / Math.sqrt(contact) > BRIM_SLENDERNESS
}

const objectSettings = (part: ExportPart) =>
  Object.entries({
    ...(needsBrim(part) ? { brim_type: 'outer_only', brim_width: String(BRIM_WIDTH) } : {}),
    ...part.settings,
  })
    .map(([key, value]) => `<metadata key="${key}" value="${value}"/>`)
    .join('')

const filamentCount = (meshes: ExportPart[]) =>
  meshes.some(({ thirdFilament, filament }) => thirdFilament || filament === 3)
    ? 3
    : meshes.some(({ secondFilament, filament }) => secondFilament || filament === 2)
      ? 2
      : 1

function plateSettingsXml(meshes: ExportPart[], plates: Plate[]): string {
  const objects = meshes.map((part, index) => {
    const volumes = volumesOf(part)
    const parts = volumeIds(meshes, index).map((partId, volume) => {
      const { mesh, name, filament } = volumes[volume]
      return `<part id="${partId}" subtype="normal_part"><metadata key="name" value="${name}"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/><metadata key="extruder" value="${filament}"/><mesh_stat face_count="${mesh.triVerts.length / 3}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/></part>`
    })
    return `<object id="${(index + 1) * 2}"><metadata key="name" value="${part.name}"/><metadata key="extruder" value="1"/>${objectSettings(part)}${parts.join('')}</object>`
  })
  const placed = placeItems(meshes, plates)
  const instances = placed.map(
    ({ object, instance }, index) => `<model_instance>
<metadata key="object_id" value="${(object + 1) * 2}"/>
<metadata key="instance_id" value="${instance}"/>
<metadata key="identify_id" value="${index + 1}"/>
</model_instance>`,
  )
  const plateXml = plates.map(
    ({ name }, plate) => `<plate>
<metadata key="plater_id" value="${plate + 1}"/>
<metadata key="plater_name" value="${name}"/>
<metadata key="locked" value="false"/>
<metadata key="filament_map_mode" value="Auto For Flush"/>
<metadata key="filament_maps" value="${NOZZLE_FOR_FILAMENT.slice(0, filamentCount(meshes)).join(' ')}"/>
${instances.filter((_, index) => placed[index].plate === plate).join('\n')}
</plate>`,
  )
  const assembly = placed.map(
    ({ object, instance, transform }) =>
      `<assemble_item object_id="${(object + 1) * 2}" instance_id="${instance}" transform="${transform}" offset="0 0 0"/>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>
<config>
${objects.join('\n')}
${plateXml.join('\n')}
<assemble>${assembly.join('')}</assemble>
</config>`
}

/** A Bambu Studio project with each part on a build plate of its own. */
export function to3mf(meshes: ExportPart[], colours: FilamentColours): Uint8Array {
  return to3mfPlates(
    meshes,
    meshes.map(({ name }, object) => ({ name, items: [{ object, x: PLATE_MARGIN, y: PLATE_MARGIN }] })),
    colours,
  )
}

/** A Bambu Studio project for the two-nozzle X2D, with each plate holding its own copies of the objects. An object's further parts print in filaments 2 and 3. */
export function to3mfPlates(meshes: ExportPart[], plates: Plate[], colours: FilamentColours): Uint8Array {
  return package3mf(meshes, plates, colours)
}

function package3mf(meshes: ExportPart[], plates: Plate[], colours: FilamentColours): Uint8Array {
  const enc = new TextEncoder()
  const objectModels = Object.fromEntries(
    meshes.map((_part, index) => [`object_${index + 1}.model`, enc.encode(objectModelXml(meshes, index))]),
  )
  const files = {
    '[Content_Types].xml': enc.encode(CONTENT_TYPES),
    _rels: { '.rels': enc.encode(RELS) },
    '3D': {
      '3dmodel.model': enc.encode(modelXml(meshes, plates)),
      Objects: objectModels,
      _rels: { '3dmodel.model.rels': enc.encode(modelRelationshipsXml(meshes.length)) },
    },
    Metadata: {
      'model_settings.config': enc.encode(plateSettingsXml(meshes, plates)),
      'project_settings.config': enc.encode(projectSettings(filamentCount(meshes), colours)),
    },
  }
  return zipSync(files)
}
