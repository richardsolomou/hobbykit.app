/**
 * Renders listing images for the MakerWorld scripts into `makerworld/images`: per generator, 4:3 and 3:4
 * covers, a 4:3 grid of other configurations, and the clean 4:3 render. Every configuration shown is one its
 * script can make, since MakerWorld counts a render that the download cannot produce as misleading.
 * Run against a fresh build with `just makerworld-images [name...]`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium, type Browser } from '@playwright/test'
import { preview } from 'vite'
import { holderGroup } from '../src/core/geometry/holder.ts'
import { presetFor, standardSize } from '../src/core/geometry/presets.ts'
import type { ShapeKind } from '../src/core/geometry/types.ts'
import { PAGES } from '../src/lib/pages.ts'
import { shareLink } from '../src/lib/shareLink.ts'
import { defaultWorkspace, synchronizeWorkspace, type GeneratorSettings, type WorkspaceState } from '../src/lib/workspace.ts'

const OUT = 'makerworld/images'

interface View {
  caption: string
  edit?: (w: WorkspaceState) => WorkspaceState
  explode?: boolean
  /** Camera distance against the app's own framing, so above 1 pulls back. */
  zoom?: number
}

interface Listing {
  /** File stem, matching `makerworld/<name>.scad`. */
  name: string
  part: GeneratorSettings
  title: string
  /** Title-block rows, label then value, the way the app's title block reads. */
  facts: [string, string][]
  hero: View
  variants: View[]
  /** Applied to every view that sets none. */
  zoom?: number
}

const base = (shape: ShapeKind, label: string) => (w: WorkspaceState) => ({
  ...w,
  base: { ...presetFor(standardSize(shape, label)), label: w.base.label },
})
const holder = (quantity: number, shape: ShapeKind, label: string) => (w: WorkspaceState) => {
  const { width, length = width } = standardSize(shape, label)
  return { ...w, holder: { ...w.holder, groups: [holderGroup('models-1', quantity, { shape, width, length })] } }
}
const handle = (patch: Partial<WorkspaceState['paintingTray']['handle']>) => (w: WorkspaceState) => ({
  ...w,
  paintingTray: { ...w.paintingTray, handle: { ...w.paintingTray.handle, ...patch } },
})
const rack = (columns: number, rows: number, leftEnd: boolean, rightEnd: boolean) => (w: WorkspaceState) => ({
  ...w,
  paintRack: { ...w.paintRack, items: [{ id: 'paint-rack-1', kind: 'module' as const, columns }], rows, leftEnd, rightEnd },
})
const patch =
  <K extends GeneratorSettings>(generator: K, changes: Partial<WorkspaceState[K]>) =>
  (w: WorkspaceState) => ({ ...w, [generator]: { ...w[generator], ...changes } })

const LISTINGS: Listing[] = [
  {
    name: 'base',
    part: 'base',
    title: 'Magnetised miniature bases',
    facts: [
      ['Sizes', '40+ standard'],
      ['Magnets', 'Flush'],
      ['Supports', 'None'],
    ],
    hero: { caption: 'Round 32', zoom: 0.7 },
    variants: [
      { caption: 'Oval 75×42', edit: base('oval', '75×42') },
      { caption: 'Rectangle 25×50', edit: base('rect', '25×50') },
      { caption: 'Hex 40', edit: base('polygon', '40') },
      { caption: 'Round 60', edit: base('round', '60') },
    ],
  },
  {
    name: 'holder',
    part: 'holder',
    title: 'Gridfinity miniature holder',
    facts: [
      ['Fits', 'Gridfinity'],
      ['Slots', 'Any base'],
      ['Magnets', 'Optional'],
    ],
    hero: { caption: '5 × round 32' },
    variants: [
      { caption: '10 × round 25', edit: holder(10, 'round', '25') },
      { caption: '4 × oval 60×35.5', edit: holder(4, 'oval', '60×35.5') },
      { caption: '3 × rectangle 25×50', edit: holder(3, 'rect', '25×50') },
      { caption: '2 × round 60', edit: holder(2, 'round', '60') },
    ],
  },
  {
    name: 'spray-tray',
    part: 'paintingTray',
    zoom: 1.6,
    title: 'Magnetic spray painting tray',
    facts: [
      ['Grips', '4 shapes'],
      ['Pockets', 'Magnet grid'],
      ['Supports', 'None'],
    ],
    hero: { caption: 'Tray and grip', explode: true },
    variants: [
      { caption: 'Oval barrel grip', edit: handle({ shape: 'oval' }), explode: true },
      { caption: 'Flared grip, ribbed', edit: handle({ shape: 'flared', ribs: true }), explode: true },
      { caption: 'Pistol grip, 15° lean', edit: handle({ shape: 'pistol', angle: 15 }), explode: true },
      {
        caption: '3 × 3 tray, rounded end',
        edit: (w) => handle({ roundedEnd: true })(patch('paintingTray', { columns: 3, rows: 3 })(w)),
        explode: true,
      },
    ],
  },
  {
    name: 'paint-rack',
    part: 'paintRack',
    zoom: 1.15,
    title: 'Modular paint rack',
    facts: [
      ['Holds', 'Pots and droppers'],
      ['Modules', 'Side by side'],
      ['Supports', 'Off'],
    ],
    hero: { caption: '5 × 4 module' },
    variants: [
      { caption: '5 × 4 with both ends', edit: rack(5, 4, true, true) },
      { caption: '3 × 3 with left end', edit: rack(3, 3, true, false) },
      { caption: '8 × 2', edit: rack(8, 2, false, false) },
      { caption: '4 × 5 with right end', edit: rack(4, 5, false, true) },
    ],
  },
  {
    name: 'stem',
    part: 'stem',
    title: 'Flying stems',
    facts: [
      ['Height', 'Any'],
      ['Top', 'Peg or ball'],
      ['Supports', 'None'],
    ],
    hero: { caption: '15mm peg' },
    variants: [
      { caption: '20mm peg', edit: patch('stem', { bodyHeight: 20 }) },
      { caption: '35mm peg', edit: patch('stem', { bodyHeight: 35 }) },
      { caption: '20mm ball joint', edit: patch('stem', { bodyHeight: 20, connection: 'ball' }) },
      { caption: '30mm, 6mm ball', edit: patch('stem', { bodyHeight: 30, connection: 'ball', ballDiameter: 6 }) },
    ],
  },
  {
    name: 'token',
    part: 'token',
    zoom: 1.3,
    title: 'Tabletop gaming tokens',
    facts: [
      ['Shapes', 'Round, square, hex'],
      ['Text', 'Raised or engraved'],
      ['Colours', 'One or two'],
    ],
    hero: { caption: 'Round, raised' },
    variants: [
      { caption: 'Hex, raised', edit: patch('token', { shape: 'hex', text: '3' }) },
      { caption: 'Square, raised', edit: patch('token', { shape: 'square', text: 'Loot' }) },
      { caption: 'Round, engraved', edit: patch('token', { text: 'Hold the line', emboss: -0.8 }) },
      { caption: 'Hex, two lines', edit: patch('token', { shape: 'hex', size: 50, text: 'Supply drop' }) },
    ],
  },
  {
    name: 'counter',
    part: 'counter',
    zoom: 1.7,
    title: 'Dial counters',
    facts: [
      ['Counts', '00 to 99'],
      ['Detent', 'Printed clicks'],
      ['Hardware', 'None'],
    ],
    hero: { caption: 'Assembled' },
    variants: [
      { caption: 'Parts', explode: true },
      { caption: 'Engraved digits', edit: patch('counter', { inserts: false }) },
      { caption: '48 × 20 drums', edit: patch('counter', { drumDiameter: 48, drumWidth: 20 }) },
      { caption: '60 × 24 drums, parts', edit: patch('counter', { drumDiameter: 60, drumWidth: 24 }), explode: true },
    ],
  },
]

const server = await preview({ preview: { port: 0, host: '127.0.0.1' } })
const origin = server.resolvedUrls!.local[0].replace(/\/$/, '')

/**
 * The part and its leaders on a transparent background, `width`×`height` CSS pixels at `scale`, so the
 * composition supplies the sheet and can scale the part without breaking the ruling.
 */
async function capture(browser: Browser, listing: Listing, view: View, width: number, height: number, scale: number, hide = '') {
  const page = PAGES.find((p) => p.part === listing.part)!
  const workspace = synchronizeWorkspace((view.edit ?? ((w) => w))(defaultWorkspace()))
  // Below the docked breakpoint the panel becomes a closed drawer, so the viewport takes the whole width.
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  try {
    await tab.goto(`${origin}${shareLink(page.href, workspace, listing.part).url}`)
    await tab.locator('[data-triangles]').waitFor()
    if (view.explode) await tab.getByRole('button', { name: 'Explode' }).click()
    await tab.addStyleTag({
      content: `header, main > footer, main > button, main span.size-5${hide} { display: none !important }
        html, body, body *:not(canvas) { background: transparent !important }`,
    })
    // The shadow map and the first damped camera frames settle after the mesh lands.
    await tab.waitForTimeout(1500)
    return await tab.locator('main').screenshot({ omitBackground: true })
  } finally {
    await tab.close()
  }
}

/** A captured part placed over a region of the sheet, scaled down by its zoom about the region's centre. */
async function part(
  browser: Browser,
  listing: Listing,
  view: View,
  box: { left: number; top: number; width: number; height: number },
  hide = '',
) {
  const zoom = view.zoom ?? listing.zoom ?? 1
  const bytes = await capture(browser, listing, view, box.width, box.height, SCALE / Math.min(zoom, 1), hide)
  return `<img src="${png(bytes)}" style="position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;transform:scale(${1 / zoom})">`
}

const font = (file: string) => `data:font/woff2;base64,${readFileSync(`node_modules/@fontsource/${file}`).toString('base64')}`
const png = (bytes: Buffer) => `data:image/png;base64,${bytes.toString('base64')}`
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')

/** The app's sheet: graphite paper ruled every 24px and 120px, with the same tokens as `src/styles.css`. */
const STYLE = `
@font-face { font-family: Barlow; font-weight: 500; src: url(${font('barlow-semi-condensed/files/barlow-semi-condensed-latin-500-normal.woff2')}) }
@font-face { font-family: Barlow; font-weight: 600; src: url(${font('barlow-semi-condensed/files/barlow-semi-condensed-latin-600-normal.woff2')}) }
@font-face { font-family: Azeret; font-weight: 500; src: url(${font('azeret-mono/files/azeret-mono-latin-500-normal.woff2')}) }
:root {
  --card: oklch(0.205 0.007 270); --foreground: oklch(0.94 0.006 270); --muted: oklch(0.7 0.01 270);
  --measure: oklch(0.7 0.18 25); --border: oklch(0.32 0.01 270);
  --grid-minor: oklch(0.235 0.007 270); --grid-major: oklch(0.285 0.01 270);
}
* { box-sizing: border-box; margin: 0 }
body { position: relative; overflow: hidden; font-family: Barlow, sans-serif; color: var(--foreground); -webkit-font-smoothing: antialiased;
  background-color: var(--card); background-image:
    repeating-linear-gradient(0deg, transparent 0 119px, var(--grid-major) 119px 120px),
    repeating-linear-gradient(90deg, transparent 0 119px, var(--grid-major) 119px 120px),
    repeating-linear-gradient(0deg, transparent 0 23px, var(--grid-minor) 23px 24px),
    repeating-linear-gradient(90deg, transparent 0 23px, var(--grid-minor) 23px 24px) }
.mark { position: absolute; width: 20px; height: 20px; border-color: color-mix(in oklch, var(--measure) 45%, transparent); border-style: solid; border-width: 0 }
.tl { top: 20px; left: 20px; border-top-width: 1px; border-left-width: 1px } .tr { top: 20px; right: 20px; border-top-width: 1px; border-right-width: 1px }
.bl { bottom: 20px; left: 20px; border-bottom-width: 1px; border-left-width: 1px } .br { bottom: 20px; right: 20px; border-bottom-width: 1px; border-right-width: 1px }
.wordmark { font-weight: 600; font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase }
.wordmark span { color: var(--measure) }
h1 { font-weight: 600; font-size: 46px; line-height: 0.98; letter-spacing: -0.005em }
.note { font-weight: 500; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted) }
.readout { font-family: Azeret, monospace; font-weight: 500; font-size: 11px }
.block { position: absolute; width: 228px; border: 2px solid color-mix(in oklch, var(--measure) 50%, transparent); background: color-mix(in oklch, var(--card) 90%, transparent) }
.block header { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; border-bottom: 2px solid color-mix(in oklch, var(--measure) 50%, transparent) }
.block header .readout { color: var(--measure) }
.block dl { display: grid; grid-template-columns: auto 1fr }
.block dt, .block dd { padding: 6px 10px; border-top: 1px solid var(--border) }
.block dt { border-right: 1px solid var(--border) }
.block dd { text-align: right }
.block dt:first-of-type, .block dd:first-of-type { border-top: 0 }
.block.row dl { grid-auto-flow: column; grid-template-rows: auto auto; grid-template-columns: repeat(3, 1fr) }
.block.row dt, .block.row dd { border-top: 0; text-align: left }
.block.row dt { border-right: 0; padding-bottom: 0 }
.block.row dd { padding-top: 4px }
.block.row dt:not(:first-of-type), .block.row dd:not(:first-of-type) { border-left: 1px solid var(--border) }
.cell { position: absolute; overflow: hidden; border: 0 solid var(--border) }
.cell .readout { position: absolute; left: 14px; bottom: 12px; color: var(--measure); font-size: 13px }
`

const marks = ['tl', 'tr', 'bl', 'br'].map((corner) => `<i class="mark ${corner}"></i>`).join('')
const titleBlock = (listing: Listing, style: string, row = false) => `
  <section class="block${row ? ' row' : ''}" style="${style}">
    <header><span class="readout">${escape(listing.hero.caption)}</span><span class="note" style="color:var(--foreground)">Customize</span></header>
    <dl>${listing.facts.map(([label, value]) => `<dt class="note">${escape(label)}</dt><dd class="readout">${escape(value)}</dd>`).join('')}</dl>
  </section>`
const heading = (listing: Listing) =>
  `<p class="wordmark">Hobby<span>Kit</span></p><h1 style="margin-top:14px">${escape(listing.title)}</h1>`

/** Lays HTML over the sheet at `width`×`height` CSS pixels and returns it at `scale`. */
async function compose(browser: Browser, html: string, width: number, height: number, scale: number) {
  const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  try {
    await tab.setContent(`<!doctype html><style>${STYLE}</style><body style="width:${width}px;height:${height}px">${html}</body>`)
    await tab.evaluate(() => document.fonts.ready)
    return await tab.screenshot()
  } finally {
    await tab.close()
  }
}

const SCALE = 1920 / 720

const browser = await chromium.launch()
try {
  mkdirSync(OUT, { recursive: true })
  const only = process.argv.slice(2)
  for (const listing of LISTINGS.filter((l) => only.length === 0 || only.includes(l.name))) {
    const write = (kind: string, bytes: Buffer) => writeFileSync(`${OUT}/${listing.name}-${kind}.png`, bytes)
    write(
      'render',
      await compose(
        browser,
        `${await part(browser, listing, listing.hero, { left: 0, top: 0, width: 720, height: 540 })}${marks}`,
        720,
        540,
        SCALE,
      ),
    )

    write(
      'cover-4x3',
      await compose(
        browser,
        `${await part(browser, listing, listing.hero, { left: 240, top: 0, width: 480, height: 540 })}
         <div style="position:absolute;left:44px;top:48px;width:210px">${heading(listing)}</div>
         ${titleBlock(listing, 'left:28px;bottom:40px;width:236px')}${marks}`,
        720,
        540,
        SCALE,
      ),
    )

    write(
      'cover-3x4',
      await compose(
        browser,
        `${await part(browser, listing, listing.hero, { left: 0, top: 240, width: 540, height: 360 })}
         <div style="position:absolute;left:44px;top:56px;width:440px">${heading(listing)}</div>
         ${titleBlock(listing, 'left:36px;right:36px;bottom:40px;width:auto', true)}${marks}`,
        540,
        720,
        SCALE,
      ),
    )

    const cells: string[] = []
    for (const view of listing.variants.slice(0, 4)) {
      cells.push(
        await part(browser, listing, view, { left: 0, top: 0, width: 360, height: 270 }, ', #dim-height, #ext-height, #label-height'),
      )
    }
    write(
      'options',
      await compose(
        browser,
        cells
          .map(
            (cell, i) =>
              `<div class="cell" style="left:${(i % 2) * 360}px;top:${Math.floor(i / 2) * 270}px;width:360px;height:270px;border-left-width:${i % 2}px;border-top-width:${Math.min(1, Math.floor(i / 2))}px">
                 ${cell}<span class="readout">${escape(listing.variants[i].caption)}</span></div>`,
          )
          .join(''),
        720,
        540,
        SCALE,
      ),
    )
  }
} finally {
  await browser.close()
  await server.close()
}
