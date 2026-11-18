import type { ManifoldToplevel } from 'manifold-3d'
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { parse, type Font } from 'opentype.js'
import fontUrl from '@/assets/fonts/oswald-700.woff?url'
import { buildBase } from '@/core/geometry/base'
import type { BuildResult } from '@/core/geometry/build'
import { buildHolder } from '@/core/geometry/holder'
import { loadManifold } from '@/core/geometry/manifold'
import { buildToken } from '@/core/geometry/token'
import { buildPaintingHandle, buildPaintingTray } from '@/core/geometry/paintingTray'
import { buildPaintRack } from '@/core/geometry/paintRack'
import { buildFlightStem } from '@/core/geometry/stem'
import { buildCounter } from '@/core/geometry/counter'
import type { BuildConfig } from '@/core/geometry/types'
import type { MeshData, WorkerReply, WorkerRequest } from './protocol'

const ready = Promise.all([
  loadManifold(() => wasmUrl),
  fetch(fontUrl)
    .then((r) => r.arrayBuffer())
    .then(parse),
])

/** Copies out of the mesh: its arrays may still view WASM memory, which must not be transferred. */
function toMeshData({ mesh, inserts, third }: Pick<BuildResult, 'mesh' | 'inserts' | 'third'>): MeshData {
  return {
    positions: new Float32Array(mesh.vertProperties),
    indices: new Uint32Array(mesh.triVerts),
    ...(inserts ? { inserts: toMeshData({ mesh: inserts }) } : {}),
    ...(third ? { third: toMeshData({ mesh: third }) } : {}),
  }
}

function build(wasm: ManifoldToplevel, font: Font, config: BuildConfig): BuildResult {
  switch (config.kind) {
    case 'holder':
      return buildHolder(wasm, config, font)
    case 'painting-handle':
      return buildPaintingHandle(wasm, config)
    case 'painting-tray':
      return buildPaintingTray(wasm, config)
    case 'paint-rack':
      return buildPaintRack(wasm, config)
    case 'stem':
      return buildFlightStem(wasm, config)
    case 'token':
      return buildToken(wasm, config, font)
    case 'counter':
      return buildCounter(wasm, config, font)
    default:
      return buildBase(wasm, config, font)
  }
}

const send = (reply: WorkerReply, transfer: ArrayBufferLike[]) => self.postMessage(reply, { transfer: transfer as Transferable[] })

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, config } = event.data
  try {
    const [wasm, font] = await ready
    const result = build(wasm, font, config)
    const mesh = toMeshData(result)
    const buffers = [mesh, mesh.inserts, mesh.third].flatMap((part) => (part ? [part.positions.buffer, part.indices.buffer] : []))
    send({ id, kind: 'mesh', mesh, grams: result.stats.grams }, buffers)
  } catch (error) {
    send({ id, kind: 'error', message: error instanceof Error ? error.message : String(error) }, [])
  }
}
