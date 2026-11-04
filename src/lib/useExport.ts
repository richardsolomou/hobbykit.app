import { useState } from 'react'
import { zipSync } from 'fflate'
import { packPlates, to3mf, to3mfPlates, toStl, type ExportPart } from '@/core/geometry/exporters'
import { holderModuleName, holderName, holderPlan } from '@/core/geometry/holder'
import { tokenHeight, tokenName } from '@/core/geometry/token'
import { baseName, footprint } from '@/core/geometry/outline'
import { paintingHandleConfig, paintingHandleDimensions, paintingHandleName, paintingTrayName } from '@/core/geometry/paintingTray'
import { paintRackLayout, paintRackName, paintRackPieceName } from '@/core/geometry/paintRack'
import { exportSegmentsFor } from '@/core/geometry/quality'
import { stemName, stemOverallHeight } from '@/core/geometry/stem'
import { counterLayout, counterName, counterParts } from '@/core/geometry/counter'
import type {
  BaseConfig,
  FlightStemConfig,
  HolderConfig,
  TokenConfig,
  PaintingTrayConfig,
  PaintRackConfig,
  PartConfig,
  CounterConfig,
  CounterTile,
} from '@/core/geometry/types'
import posthog from '@/lib/posthog'
import { batchFileName } from './batch'
import { buildMesh } from './buildMesh'
import { asMeshLike, download } from './download'

export type ExportFormat = 'stl' | '3mf' | 'batch-stl' | 'batch-3mf' | 'piece-stl'

interface BatchPart {
  config: BaseConfig
  quantity: number
}

interface ExportOptions {
  model: 'base' | 'holder' | 'painting' | 'rack' | 'stem' | 'token' | 'counter'
  base: BaseConfig
  holder: HolderConfig
  paintingTray: PaintingTrayConfig
  paintRack: PaintRackConfig
  stem: FlightStemConfig
  token: TokenConfig
  counter: CounterConfig
  width: number
  length: number
  batch: BatchPart[]
  batchName: string
}

export function useExport({
  model,
  base,
  holder,
  paintingTray,
  paintRack,
  stem,
  token,
  counter,
  width,
  length,
  batch,
  batchName,
}: ExportOptions) {
  const [exporting, setExporting] = useState<ExportFormat>()
  const [error, setError] = useState<string>()
  const config: PartConfig =
    model === 'base'
      ? base
      : model === 'holder'
        ? holder
        : model === 'painting'
          ? paintingTray
          : model === 'rack'
            ? paintRack
            : model === 'stem'
              ? stem
              : model === 'token'
                ? token
                : counter
  const name =
    model === 'base'
      ? baseName(base)
      : model === 'holder'
        ? holderName(holder)
        : model === 'painting'
          ? paintingTrayName(paintingTray)
          : model === 'rack'
            ? paintRackName(paintRack)
            : model === 'stem'
              ? stemName(stem)
              : model === 'token'
                ? tokenName(token)
                : counterName(counter)

  const run = async (
    format: ExportFormat,
    operation: () => Promise<void>,
    event = `${model}_exported`,
    properties: Record<string, number> = {
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
    try {
      await operation()
      posthog.capture(event, { format, ...properties })
    } catch (failure) {
      posthog.captureException(failure, { export_format: format, model })
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setExporting(undefined)
    }
  }

  const build = () => buildMesh({ ...config, segments: exportSegmentsFor(Math.max(width, length)) })
  const plan = model === 'holder' ? holderPlan(holder) : undefined
  const buildModules = () =>
    Promise.all(
      plan!.modules.map((module, index) =>
        buildMesh({ ...holder, module: index, segments: exportSegmentsFor(Math.max(module.layout.width, module.layout.length)) }),
      ),
    )
  const buildPaintingParts = async () => {
    const handleConfig = paintingHandleConfig(paintingTray)
    const handleSize = paintingHandleDimensions(handleConfig)
    const [trayMesh, handleMesh] = await Promise.all([
      buildMesh({ ...paintingTray, assembly: false, segments: exportSegmentsFor(Math.max(width, length)) }),
      buildMesh({ ...handleConfig, segments: exportSegmentsFor(Math.max(handleSize.width, handleSize.length)) }),
    ])
    return [
      { mesh: asMeshLike(trayMesh), name: paintingTrayName(paintingTray) },
      { mesh: asMeshLike(handleMesh), name: paintingHandleName(paintingTray) },
    ]
  }

  const buildCounterParts = () =>
    Promise.all(
      counterParts(counter).map(async ({ part, name: partName }): Promise<ExportPart> => {
        const mesh = await buildMesh({ ...counter, part, segments: exportSegmentsFor(counter.drumDiameter) })
        return {
          mesh: asMeshLike(mesh),
          name: `${name}-${partName}`,
          ...(mesh.inserts ? { secondFilament: { mesh: asMeshLike(mesh.inserts), name: `${name}-${partName}-marks` } } : {}),
        }
      }),
    )

  /** One tile on its own, for reprinting one that failed: its base and raised mark, as in the full download. */
  const exportCounterTile = (tile: CounterTile) =>
    run('piece-stl', async () => {
      const mesh = await buildMesh({ ...counter, part: 'inserts' as const, tile, segments: exportSegmentsFor(counter.drumDiameter) })
      const tileName = `${name}-tile-${tile}`
      const files = [
        { mesh: asMeshLike(mesh), name: tileName },
        { mesh: asMeshLike(mesh.inserts!), name: `${tileName}-marks` },
      ]
      download(`${tileName}.zip`, zipSync(Object.fromEntries(files.map((file) => [`${file.name}.stl`, toStl(file.mesh, file.name)]))))
    })

  const rackPieces = model === 'rack' ? paintRackLayout(paintRack).pieces : []
  // Numbered left to right, which also keeps two modules of the same size from sharing a filename.
  const buildRackPiece = async (index: number) => ({
    mesh: asMeshLike(await buildMesh({ ...paintRack, piece: index, segments: exportSegmentsFor(Math.max(width, length)) })),
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
        const parts = await buildRackPieces()
        download(`${name}.zip`, zipSync(Object.fromEntries(parts.map((part) => [`${part.name}.stl`, toStl(part.mesh, part.name)]))))
        return
      }
      if (model === 'counter') {
        const parts = await buildCounterParts()
        const files = parts.flatMap(({ mesh, name: partName, secondFilament }) => [
          { mesh, name: partName },
          ...(secondFilament ? [secondFilament] : []),
        ])
        download(`${name}.zip`, zipSync(Object.fromEntries(files.map((file) => [`${file.name}.stl`, toStl(file.mesh, file.name)]))))
        return
      }
      if (model === 'painting') {
        const parts = await buildPaintingParts()
        const files = Object.fromEntries(parts.map((part) => [`${part.name}.stl`, toStl(part.mesh, part.name)]))
        download(`${name}.zip`, zipSync(files))
        return
      }
      if (plan && plan.modules.length > 1) {
        const meshes = await buildModules()
        const files = Object.fromEntries(
          meshes.map((mesh, index) => {
            const moduleName = `module-${index + 1}-${holderModuleName(plan.modules[index])}.stl`
            return [moduleName, toStl(asMeshLike(mesh), moduleName)]
          }),
        )
        download(`${name}.zip`, zipSync(files))
        return
      }
      const mesh = await build()
      if (mesh.inserts) {
        const files = [
          { mesh, name },
          { mesh: mesh.inserts, name: `${name}-artwork` },
        ]
        download(
          `${name}.zip`,
          zipSync(Object.fromEntries(files.map((file) => [`${file.name}.stl`, toStl(asMeshLike(file.mesh), file.name)]))),
        )
        return
      }
      const filename = `${name}.stl`
      download(filename, toStl(asMeshLike(mesh), filename))
    })

  const export3mf = () =>
    run('3mf', async () => {
      if (rackPieces.length > 1) {
        download(`${name}.3mf`, to3mf(await buildRackPieces(), true))
        return
      }
      if (model === 'painting') {
        download(`${name}.3mf`, to3mf(await buildPaintingParts(), true))
        return
      }
      if (model === 'counter') {
        const parts = await buildCounterParts()
        // The inserts come last and take a plate of their own, the only one that changes filament.
        const inserts = parts.findIndex(({ secondFilament }) => secondFilament)
        const bodies = inserts < 0 ? parts : parts.slice(0, inserts)
        const plates = packPlates(
          bodies.map(({ mesh }) => mesh),
          bodies.map(() => 1),
        ).map((items, index, all) => ({ name: all.length === 1 ? name : `${name}-plate-${index + 1}`, items }))
        if (inserts >= 0) plates.push({ name: `${name}-inserts`, items: [{ object: inserts, x: 30, y: 30 }] })
        download(`${name}.3mf`, to3mfPlates(parts, plates))
        return
      }
      if (plan && plan.modules.length > 1) {
        const meshes = await buildModules()
        const modules = meshes.map((mesh, index) => ({
          mesh: asMeshLike(mesh),
          name: `module-${index + 1}-${holderModuleName(plan.modules[index])}`,
        }))
        download(`${name.replace(/^holder-/, `holders-${modules.length}-`)}.3mf`, to3mf(modules, true))
        return
      }
      const mesh = await build()
      if (mesh.inserts) {
        const part = { mesh: asMeshLike(mesh), name, secondFilament: { mesh: asMeshLike(mesh.inserts), name: `${name}-artwork` } }
        download(`${name}.3mf`, to3mf([part], true))
        return
      }
      download(`${name}.3mf`, to3mf([{ mesh: asMeshLike(mesh), name }]))
    })

  const batchProperties = { sizes: batch.length, bases: batch.reduce((total, part) => total + part.quantity, 0) }
  const buildBatch = () =>
    Promise.all(
      batch.map(async ({ config: part, quantity }) => {
        const size = footprint(part)
        const mesh = await buildMesh({ ...part, segments: exportSegmentsFor(Math.max(size.width, size.length)) })
        return { mesh: asMeshLike(mesh), config: part, quantity }
      }),
    )

  const exportBatchStl = () =>
    run(
      'batch-stl',
      async () => {
        const parts = await buildBatch()
        const files = Object.fromEntries(
          parts.map(({ mesh, config: part, quantity }) => {
            const filename = `${batchFileName(part, quantity)}.stl`
            return [filename, toStl(mesh, filename)]
          }),
        )
        download(`${batchName}.zip`, zipSync(files))
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
          ),
        )
      },
      'base_batch_exported',
      batchProperties,
    )

  return { exporting, error, exportStl, export3mf, exportBatchStl, exportBatch3mf, exportRackPiece, exportCounterTile }
}
