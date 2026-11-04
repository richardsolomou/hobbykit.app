import wasmUrl from 'manifold-3d/manifold.wasm?url'
import { parse, type Font } from 'opentype.js'
import fontUrl from '@/assets/fonts/oswald-700.woff?url'
import { buildBase, type BuildResult } from '@/core/geometry/base'
import { buildHolder } from '@/core/geometry/holder'
import { loadManifold } from '@/core/geometry/manifold'
import { buildToken } from '@/core/geometry/token'
import { buildPaintingHandle, buildPaintingTray } from '@/core/geometry/paintingTray'
import { buildPaintRack } from '@/core/geometry/paintRack'
import { buildFlightStem } from '@/core/geometry/stem'
import { buildCounter } from '@/core/geometry/counter'
import type { MeshData, WorkerReply, WorkerRequest } from './protocol'

const ready = Promise.all([
  loadManifold(() => wasmUrl),
  fetch(fontUrl)
    .then((r) => r.arrayBuffer())
    .then(parse) as Promise<Font>,
])

/** Copies out of the mesh: its arrays may still view WASM memory, which must not be transferred. */
function toMeshData({ mesh, inserts }: Pick<BuildResult, 'mesh' | 'inserts'>): MeshData {
  return {
    positions: new Float32Array(mesh.vertProperties),
    indices: new Uint32Array(mesh.triVerts),
    ...(inserts ? { inserts: toMeshData({ mesh: inserts }) } : {}),
  }
}

const send = (reply: WorkerReply, transfer: ArrayBufferLike[]) => self.postMessage(reply, { transfer: transfer as Transferable[] })

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, config } = event.data
  try {
    const [wasm, font] = await ready
    const result =
      config.kind === 'holder'
        ? buildHolder(wasm, config, font)
        : config.kind === 'painting-handle'
          ? buildPaintingHandle(wasm, config)
          : config.kind === 'painting-tray'
            ? buildPaintingTray(wasm, config)
            : config.kind === 'paint-rack'
              ? buildPaintRack(wasm, config)
              : config.kind === 'stem'
                ? buildFlightStem(wasm, config)
                : config.kind === 'token'
                  ? buildToken(wasm, config, font)
                  : config.kind === 'counter'
                    ? buildCounter(wasm, config, font)
                    : buildBase(wasm, config, font)
    const mesh = toMeshData(result)
    const buffers = [mesh, mesh.inserts].flatMap((part) => (part ? [part.positions.buffer, part.indices.buffer] : []))
    send({ id, kind: 'mesh', mesh, grams: result.stats.grams }, buffers)
  } catch (error) {
    send({ id, kind: 'error', message: error instanceof Error ? error.message : String(error) }, [])
  }
}
