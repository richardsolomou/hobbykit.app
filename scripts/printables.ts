/** Writes the Printables STL packs. Usage: just printables */
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildBase } from '../src/core/geometry/base'
import { buildCounter, counterName, counterParts, defaultCounterConfig } from '../src/core/geometry/counter'
import { toStl, type MeshLike } from '../src/core/geometry/exporters'
import { buildHolder, defaultHolderConfig, holderGroup, holderModuleName, holderPlan } from '../src/core/geometry/holder'
import { loadManifold } from '../src/core/geometry/manifold'
import { baseName } from '../src/core/geometry/outline'
import {
  buildPaintingHandle,
  buildPaintingTray,
  defaultPaintingTrayConfig,
  paintingHandleConfig,
  paintingTrayName,
} from '../src/core/geometry/paintingTray'
import { buildPaintRack, defaultPaintRackConfig, paintRackLayout, paintRackPieceName } from '../src/core/geometry/paintRack'
import { presetFor, standardSize } from '../src/core/geometry/presets'
import { forExport } from '../src/core/geometry/exportQuality'
import { buildFlightStem, defaultFlightStemConfig, stemName } from '../src/core/geometry/stem'
import { buildToken, defaultTokenConfig, tokenName } from '../src/core/geometry/token'
import type { ShapeKind } from '../src/core/geometry/types'
import { font } from './makerworld/shared'

const ROOT = 'printables/files'
const wasm = await loadManifold()

function write(listing: string, name: string, mesh: MeshLike) {
  const file = join(ROOT, listing, `${name}.stl`)
  writeFileSync(file, toStl(mesh, name))
  console.log(file)
}

for (const listing of ['base', 'holder', 'paint-rack', 'spray-tray', 'stem', 'token', 'counter']) {
  rmSync(join(ROOT, listing), { recursive: true, force: true })
  mkdirSync(join(ROOT, listing), { recursive: true })
  copyFileSync(`makerworld/${listing}.scad`, join(ROOT, listing, `${listing}.scad`))
}

const BASES: [ShapeKind, string][] = [
  ['round', '25'],
  ['round', '28.5'],
  ['round', '32'],
  ['round', '40'],
  ['round', '50'],
  ['round', '60'],
  ['oval', '60×35.5'],
  ['oval', '75×42'],
  ['oval', '90×52.5'],
  ['rect', '25×25'],
  ['rect', '25×50'],
  ['rect', '50×100'],
]
for (const [shape, label] of BASES) {
  const config = presetFor(standardSize(shape, label))
  write('base', baseName(config), buildBase(wasm, forExport(config), font).mesh)
}

const HOLDERS: [string, number][] = [
  ['25', 12],
  ['28.5', 11],
  ['32', 5],
  ['32', 10],
  ['40', 1],
  ['40', 5],
  ['40', 10],
  ['50', 5],
]
for (const [label, quantity] of HOLDERS) {
  const config = { ...defaultHolderConfig(), groups: [holderGroup('models-1', quantity, { width: standardSize('round', label).width })] }
  const { modules } = holderPlan(config)
  if (modules.length !== 1) throw new Error(`holder ${label}×${quantity} splits into ${modules.length} modules`)
  write('holder', holderModuleName(modules[0]), buildHolder(wasm, forExport({ ...config, module: 0 }), font).mesh)
}

const rack = { ...defaultPaintRackConfig(), leftEnd: true, rightEnd: true }
const rackLayout = paintRackLayout(rack)
rackLayout.pieces.forEach((piece, index) => {
  write('paint-rack', paintRackPieceName(piece), buildPaintRack(wasm, forExport({ ...rack, piece: index })).mesh)
})

const tray = defaultPaintingTrayConfig()
write(
  'spray-tray',
  paintingTrayName(tray).replace(/^painting-/, 'spray-'),
  buildPaintingTray(wasm, forExport({ ...tray, assembly: false })).mesh,
)
for (const shape of ['round', 'oval', 'flared', 'pistol'] as const) {
  const handle = paintingHandleConfig({ ...tray, handle: { ...tray.handle, shape } })
  write('spray-tray', `spray-tray-handle-${shape}`, buildPaintingHandle(wasm, forExport(handle)).mesh)
}

for (const config of [
  ...[15, 20, 30, 35].map((bodyHeight) => ({ ...defaultFlightStemConfig(), bodyHeight })),
  { ...defaultFlightStemConfig(), bodyHeight: 20, connection: 'ball' as const },
]) {
  write('stem', stemName(config), buildFlightStem(wasm, forExport(config)).mesh)
}

// Raised text never touches the body, so every 40mm token shares the blank body and only the text differs.
const blank = { ...defaultTokenConfig(), text: '', emboss: 0 }
write('token', tokenName(blank), buildToken(wasm, forExport(blank), font).mesh)
for (const text of ['Objective', 'Battle shocked']) {
  const config = { ...defaultTokenConfig(), text }
  const { inserts } = buildToken(wasm, forExport(config), font)
  if (!inserts) throw new Error(`${text}: expected raised text`)
  write('token', `${tokenName(config)}-text`, inserts)
}

const counter = defaultCounterConfig()
for (const { part, name } of counterParts(counter)) {
  const { mesh, inserts } = buildCounter(wasm, forExport({ ...counter, part }), font)
  write('counter', `${counterName(counter)}-${name}`, mesh)
  if (inserts) write('counter', `${counterName(counter)}-${name}-marks`, inserts)
}
