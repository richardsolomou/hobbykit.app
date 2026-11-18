import { useState } from 'react'
import { zipSync } from 'fflate'
import { packPlates, to3mf, to3mfPlates, toStl, type ExportPart, type MeshLike } from '@/core/geometry/exporters'
import { holderModuleName, holderPlan } from '@/core/geometry/holder'
import { tokenHeight } from '@/core/geometry/token'
import { baseName } from '@/core/geometry/outline'
import { paintingHandleConfig, paintingHandleName, paintingTrayName } from '@/core/geometry/paintingTray'
import { paintRackLayout, paintRackPieceName } from '@/core/geometry/paintRack'
import { forExport } from '@/core/geometry/exportQuality'
import { stemOverallHeight } from '@/core/geometry/stem'
import { counterLayout, counterParts, counterTileLayout } from '@/core/geometry/counter'
import type { BaseConfig, CounterConfig, PaintingTrayConfig, PartConfig } from '@/core/geometry/types'
import type { FilamentColours } from '@/core/geometry/filaments'
import { posthog } from 'posthog-js'
import { designProperties } from './analytics'
import { batchFileName } from './batch'
import { buildMesh } from './buildMesh'
import { counterProject } from './counterProject'
import { asMeshLike, download } from './download'

export type ExportFormat = 'stl' | '3mf' | 'batch-stl' | 'batch-3mf' | 'piece-stl'

interface BatchPart {
  config: BaseConfig
  quantity: number
}

interface ExportOptions {
  model: 'base' | 'holder' | 'painting' | 'rack' | 'stem' | 'token' | 'counter'
  config: PartConfig
  name: string
  filaments: FilamentColours
  width: number
  length: number
  batch: BatchPart[]
  batchName: string
}

function downloadZip(zipName: string, files: { mesh: MeshLike; name: string }[]) {
  download(`${zipName}.zip`, zipSync(Object.fromEntries(files.map((file) => [`${file.name}.stl`, toStl(file.mesh, file.name)]))))
}

export function useExport({ model, config, name, filaments, width, length, batch, batchName }: ExportOptions) {
  const [exporting, setExporting] = useState<ExportFormat>()
  const [error, setError] = useState<string>()
  const holder = config.kind === 'holder' ? config : undefined
  const paintRack = config.kind === 'paint-rack' ? config : undefined

  const run = async (
    format: ExportFormat,
    operation: () => Promise<void>,
    event = `${model}_exported`,
    properties: Record<string, string | number | boolean> = {
      ...designProperties(config),
      width,
      length,
      height:
        config.kind === 'stem'
          ? stemOverallHeight(config)
          : config.kind === 'token'
            ? tokenHeight(config)
            : config.kind === 'paint-rack'
              ? paintRackLayout(config).height
              : config.kind === 'counter'
                ? counterLayout(config).height
                : config.height,
    },
  ) => {
    setExporting(format)
    setError(undefined)
    const started = performance.now()
    try {
      await operation()
      posthog.capture(event, { format, ...properties, duration_ms: Math.round(performance.now() - started) })
    } catch (failure) {
      posthog.captureException(failure, { export_format: format, model })
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setExporting(undefined)
    }
  }

  const build = () => buildMesh(forExport(config))
  const plan = holder && holderPlan(holder)
  const buildModules = () => Promise.all(plan!.modules.map((module, index) => buildMesh(forExport({ ...holder!, module: index }))))
  const buildPaintingParts = async (paintingTray: PaintingTrayConfig) => {
    const handleConfig = paintingHandleConfig(paintingTray)
    const [trayMesh, handleMesh] = await Promise.all([
      buildMesh(forExport({ ...paintingTray, assembly: false })),
      buildMesh(forExport(handleConfig)),
    ])
    return [
      { mesh: asMeshLike(trayMesh), name: paintingTrayName(paintingTray) },
      { mesh: asMeshLike(handleMesh), name: paintingHandleName(paintingTray) },
    ]
  }

  const buildCounterParts = (counter: CounterConfig, parts = counterParts(counter)) =>
    Promise.all(
      parts.map(async ({ part, name: partName, filament }): Promise<ExportPart> => {
        const mesh = await buildMesh(forExport({ ...counter, part }))
        return {
          mesh: asMeshLike(mesh),
          name: `${name}-${partName}`,
          ...(filament ? { filament } : {}),
          ...(mesh.inserts ? { secondFilament: { mesh: asMeshLike(mesh.inserts), name: `${name}-${partName}-marks` } } : {}),
          ...(mesh.third ? { thirdFilament: { mesh: asMeshLike(mesh.third), name: `${name}-${partName}-digits` } } : {}),
        }
      }),
    )

  const rackPieces = paintRack ? paintRackLayout(paintRack).pieces : []
  // Numbered left to right, which also keeps two modules of the same size from sharing a filename.
  const buildRackPiece = async (index: number) => ({
    mesh: asMeshLike(await buildMesh(forExport({ ...paintRack!, piece: index }))),
    name: `${index + 1}-${paintRackPieceName(rackPieces[index])}`,
  })
  const buildRackPieces = () => Promise.all(rackPieces.map((_piece, index) => buildRackPiece(index)))
  /** One piece on its own, for adding to a rack that is already printed. */
  const exportRackPiece = (index: number) =>
    run('piece-stl', async () => {
      const part = await buildRackPiece(index)
      download(`${part.name}.stl`, toStl(part.mesh, part.name))
    })

  const exportStl = () =>
    run('stl', async () => {
      if (rackPieces.length > 1) {
        downloadZip(name, await buildRackPieces())
        return
      }
      if (config.kind === 'counter') {
        const parts = await buildCounterParts(config)
        downloadZip(
          name,
          parts.flatMap(({ mesh, name: partName, secondFilament, thirdFilament }) => [
            { mesh, name: partName },
            ...(secondFilament ? [secondFilament] : []),
            ...(thirdFilament ? [thirdFilament] : []),
          ]),
        )
        return
      }
      if (config.kind === 'painting-tray') {
        downloadZip(name, await buildPaintingParts(config))
        return
      }
      if (plan && plan.modules.length > 1) {
        const meshes = await buildModules()
        downloadZip(
          name,
          meshes.map((mesh, index) => ({ mesh: asMeshLike(mesh), name: `module-${index + 1}-${holderModuleName(plan.modules[index])}` })),
        )
        return
      }
      const mesh = await build()
      if (mesh.inserts) {
        downloadZip(name, [
          { mesh: asMeshLike(mesh), name },
          { mesh: asMeshLike(mesh.inserts), name: `${name}-artwork` },
        ])
        return
      }
      const filename = `${name}.stl`
      download(filename, toStl(asMeshLike(mesh), filename))
    })

  const export3mf = () =>
    run('3mf', async () => {
      if (rackPieces.length > 1) {
        download(`${name}.3mf`, to3mf(await buildRackPieces(), filaments))
        return
      }
      if (config.kind === 'painting-tray') {
        download(`${name}.3mf`, to3mf(await buildPaintingParts(config), filaments))
        return
      }
      if (config.kind === 'counter') {
        const pieces = counterParts(config).filter(({ part }) => part !== 'inserts')
        const built = await buildCounterParts(config, pieces)
        const bodies = built.filter((_part, index) => pieces[index].part !== 'bracket')
        const brackets = built.filter((_part, index) => pieces[index].part === 'bracket')
        const layout = config.digits === 'tiles' ? counterTileLayout(config) : []
        const unique = [...new Set(layout.map(({ tile }) => tile))]
        const meshes = new Map(
          await Promise.all(
            unique.map(async (tile) => {
              const mesh = await buildMesh(forExport({ ...config, part: 'inserts' as const, tile }))
              return [tile, { base: asMeshLike(mesh), mark: asMeshLike((mesh.inserts ?? mesh.third)!) }] as const
            }),
          ),
        )
        const { parts, plates } = counterProject(name, bodies, brackets, layout, (tile) => meshes.get(tile)!, config.digitFilament)
        download(`${name}.3mf`, to3mfPlates(parts, plates, filaments))
        return
      }
      if (plan && plan.modules.length > 1) {
        const meshes = await buildModules()
        const modules = meshes.map((mesh, index) => ({
          mesh: asMeshLike(mesh),
          name: `module-${index + 1}-${holderModuleName(plan.modules[index])}`,
        }))
        download(`${name.replace(/^holder-/, `holders-${modules.length}-`)}.3mf`, to3mf(modules, filaments))
        return
      }
      const mesh = await build()
      if (mesh.inserts) {
        const part = { mesh: asMeshLike(mesh), name, secondFilament: { mesh: asMeshLike(mesh.inserts), name: `${name}-artwork` } }
        download(`${name}.3mf`, to3mf([part], filaments))
        return
      }
      download(`${name}.3mf`, to3mf([{ mesh: asMeshLike(mesh), name }], filaments))
    })

  const batchProperties = { sizes: batch.length, bases: batch.reduce((total, part) => total + part.quantity, 0) }
  const buildBatch = () =>
    Promise.all(
      batch.map(async ({ config: part, quantity }) => {
        const mesh = await buildMesh(forExport(part))
        return { mesh: asMeshLike(mesh), config: part, quantity }
      }),
    )

  const exportBatchStl = () =>
    run(
      'batch-stl',
      async () => {
        const parts = await buildBatch()
        downloadZip(
          batchName,
          parts.map(({ mesh, config: part, quantity }) => ({ mesh, name: batchFileName(part, quantity) })),
        )
      },
      'base_batch_exported',
      batchProperties,
    )

  const exportBatch3mf = () =>
    run(
      'batch-3mf',
      async () => {
        const parts = await buildBatch()
        const plates = packPlates(
          parts.map(({ mesh }) => mesh),
          parts.map(({ quantity }) => quantity),
        )
        const meshes = parts.map(({ mesh, config: part }) => ({ mesh, name: baseName(part) }))
        download(
          `${batchName}.3mf`,
          to3mfPlates(
            meshes,
            plates.map((items, index) => ({ name: plates.length === 1 ? batchName : `${batchName}-plate-${index + 1}`, items })),
            filaments,
          ),
        )
      },
      'base_batch_exported',
      batchProperties,
    )

  return { exporting, error, exportStl, export3mf, exportBatchStl, exportBatch3mf, exportRackPiece }
}
