import {
  buildPaintingHandle,
  buildPaintingTray,
  defaultPaintingTrayConfig,
  paintingHandleConfig,
  paintingHandleDimensions,
  paintingTrayLayout,
} from '../../src/core/geometry/paintingTray'
import { exportSegmentsFor } from '../../src/core/geometry/quality'
import type { PaintingHandleSettings, PaintingTrayConfig } from '../../src/core/geometry/types'
import type { Case } from './shared'

const DEFAULTS = defaultPaintingTrayConfig()

/** Builds each part the way the app's export does. */
const tray = (name: string, changes: Partial<PaintingTrayConfig>, defines: Case['defines']): Case => ({
  name: `tray-${name}`,
  build: (wasm) => {
    const config = { ...DEFAULTS, ...changes }
    const { width, length } = paintingTrayLayout(config)
    return buildPaintingTray(wasm, { ...config, assembly: false, segments: exportSegmentsFor(Math.max(width, length)) }).mesh
  },
  defines: { part: 'tray', ...defines },
})

const handle = (name: string, changes: Partial<PaintingHandleSettings>, defines: Case['defines']): Case => ({
  name: `handle-${name}`,
  build: (wasm) => {
    const config = paintingHandleConfig({ ...DEFAULTS, handle: { ...DEFAULTS.handle, ...changes } })
    const { width, length } = paintingHandleDimensions(config)
    return buildPaintingHandle(wasm, { ...config, segments: exportSegmentsFor(Math.max(width, length)) }).mesh
  },
  defines: { part: 'handle', ...defines },
})

const SHAPES = ['round', 'oval', 'flared', 'pistol'] as const

export const cases: Case[] = [
  tray('default', {}, {}),
  tray('1x1', { columns: 1, rows: 1 }, { columns: 1, rows: 1 }),
  tray('1x5', { columns: 1, rows: 5 }, { columns: 1, rows: 5 }),
  tray('6x3-tight', { columns: 6, rows: 3, spacing: 9, edgeMargin: 3.5 }, { columns: 6, rows: 3, centre_spacing: 9, edge_margin: 3.5 }),
  tray(
    '12x12-wide',
    { columns: 12, rows: 12, spacing: 80, edgeMargin: 40 },
    { columns: 12, rows: 12, centre_spacing: 80, edge_margin: 40 },
  ),
  tray('thick', { height: 6.5 }, { tray_thickness: 6.5 }),
  tray(
    '8x3-magnets',
    { magnets: { ...DEFAULTS.magnets, diameter: 8, thickness: 3, clearance: 0.4, depthClearance: 0.5 }, height: 4.5 },
    { magnet_diameter: 8, magnet_thickness: 3, magnet_diameter_clearance: 0.4, magnet_depth_clearance: 0.5, tray_thickness: 4.5 },
  ),
  tray('ribbed-wide-grip', { handle: { ...DEFAULTS.handle, width: 40, ribs: true } }, { grip_width: 40, grip_ribs: true }),
  ...SHAPES.map((shape) => handle(shape, { shape }, { grip_shape: shape })),
  ...SHAPES.map((shape) =>
    handle(
      `${shape}-lean-rounded-ribbed`,
      { shape, angle: 30, roundedEnd: true, ribs: true },
      {
        grip_shape: shape,
        lean_angle: 30,
        rounded_end: true,
        grip_ribs: true,
      },
    ),
  ),
  handle('round-rounded', { roundedEnd: true }, { rounded_end: true }),
  handle('round-ribbed', { ribs: true }, { grip_ribs: true }),
  handle('round-lean-12', { angle: 12 }, { lean_angle: 12 }),
  handle('oval-short-narrow', { shape: 'oval', length: 60, width: 20 }, { grip_shape: 'oval', grip_length: 60, grip_width: 20 }),
  handle(
    'pistol-long-wide-ribbed',
    { shape: 'pistol', length: 120, width: 40, ribs: true },
    {
      grip_shape: 'pistol',
      grip_length: 120,
      grip_width: 40,
      grip_ribs: true,
    },
  ),
  handle('flared-narrow-lean', { shape: 'flared', width: 20, angle: 20 }, { grip_shape: 'flared', grip_width: 20, lean_angle: 20 }),
]
