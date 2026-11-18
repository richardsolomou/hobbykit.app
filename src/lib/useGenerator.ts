import { useCallback, useEffect, useRef, useState } from 'react'
import type { PartConfig } from '@/core/geometry/types'
import type { MeshData, WorkerReply, WorkerRequest } from '@/worker/protocol'

/**
 * Owns the geometry worker. Previews supersede one another: dragging a dimension
 * only ever renders the newest config, and every reply is a finished preview, so
 * nothing here reports a pending state.
 */
export function useGenerator(config: PartConfig) {
  const worker = useRef<Worker>(null)
  const nextId = useRef(0)
  const building = useRef(false)
  const queued = useRef<PartConfig>(undefined)
  const sent = useRef<PartConfig>(undefined)

  const [preview, setPreview] = useState<MeshData>()
  /** The config the preview was built from, which lags the one on screen until its build lands. */
  const [built, setBuilt] = useState<PartConfig>()
  const [grams, setGrams] = useState<number>()
  const [error, setError] = useState<string>()

  /** Sends one config and remembers it is the one whose reply matters. */
  const send = useCallback((next: PartConfig) => {
    const id = ++nextId.current
    sent.current = next
    building.current = true
    worker.current?.postMessage({ id, config: next } satisfies WorkerRequest)
  }, [])

  /** Called on every reply: start the newest config that arrived while busy. */
  const drain = useCallback(() => {
    building.current = false
    const next = queued.current
    queued.current = undefined
    if (next) send(next)
  }, [send])

  useEffect(() => {
    const instance = new Worker(new URL('../worker/geometry.worker.ts', import.meta.url), { type: 'module' })
    worker.current = instance
    instance.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data
      if (reply.id !== nextId.current) return // a newer config is already in flight
      if (reply.kind === 'error') {
        setError(reply.message)
      } else {
        setPreview(reply.mesh)
        setBuilt(sent.current)
        setGrams(reply.grams)
        setError(undefined)
      }
      drain()
    }
    return () => instance.terminate()
  }, [drain])

  // No debounce: a build starts the moment the worker is free, and while it is busy only the newest config is held.
  useEffect(() => {
    if (building.current) queued.current = config
    else send(config)
  }, [config, send])

  return { preview, built, grams, error }
}
