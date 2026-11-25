/**
 * Screenshots every generator's default model into `public/og` as its 1200×630 link preview, and the README's
 * screenshots and the repository's GitHub social preview into `docs/images`. Run against a fresh build with
 * `just social-cards` whenever the app's look changes; the social preview is uploaded by hand in the repository settings.
 */
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type Browser } from '@playwright/test'
import { preview } from 'vite'
import { PAGES } from '../src/lib/pages.ts'
import { skipTours } from './skipTours.ts'
import { socialCardPath } from '../src/lib/seo.ts'

const README = [
  { href: '/', path: 'docs/images/readme-bases.png' },
  { href: '/paint-racks', path: 'docs/images/readme-paint-racks.png' },
]

/** Narrower than the README's, so the model sits inside the part of the frame the card shows. */
const FRAMED = join(mkdtempSync(join(tmpdir(), 'hobbykit-')), 'app.png')

const server = await preview({ preview: { port: 0, host: '127.0.0.1' } })
const origin = server.resolvedUrls!.local[0].replace(/\/$/, '')
const browser = await chromium.launch()

async function capture(target: Browser, href: string, path: string, viewport: { width: number; height: number }, scale = 1) {
  const tab = await target.newPage({ viewport, deviceScaleFactor: scale })
  await skipTours(tab)
  await tab.goto(`${origin}${href}`)
  await tab.locator('[data-triangles]').waitFor()
  // The shadow map and the first damped camera frames settle after the mesh lands.
  await tab.waitForTimeout(1500)
  await tab.screenshot({ path })
  await tab.close()
}

const dataUri = (path: string, type: string) => `data:${type};base64,${readFileSync(path).toString('base64')}`
const font = (name: string) => dataUri(`node_modules/@fontsource/${name}`, 'font/woff2')

/** Laid out like the app's header: the wordmark's second half in the measuring red, and the app framed beside it. */
async function githubPreview(target: Browser) {
  const tab = await target.newPage({ viewport: { width: 1280, height: 640 } })
  await tab.setContent(`<!doctype html>
<style>
  @font-face { font-family: Barlow; font-weight: 500; src: url(${font('barlow-semi-condensed/files/barlow-semi-condensed-latin-500-normal.woff2')}) }
  @font-face { font-family: Barlow; font-weight: 600; src: url(${font('barlow-semi-condensed/files/barlow-semi-condensed-latin-600-normal.woff2')}) }
  @font-face { font-family: Azeret; font-weight: 500; src: url(${font('azeret-mono/files/azeret-mono-latin-500-normal.woff2')}) }
  body { margin: 0; width: 1280px; height: 640px; overflow: hidden; position: relative; font-family: Barlow;
    background: oklch(0.17 0.006 270); color: oklch(0.94 0.006 270);
    background-image: linear-gradient(oklch(0.24 0.008 270) 1px, transparent 1px), linear-gradient(90deg, oklch(0.24 0.008 270) 1px, transparent 1px);
    background-size: 48px 48px }
  .copy { position: absolute; left: 72px; top: 50%; transform: translateY(-50%); width: 500px }
  .mark { display: flex; align-items: center; gap: 20px; font-weight: 500; font-size: 40px; letter-spacing: 0.18em }
  .mark img { width: 64px; height: 64px }
  .mark span { color: oklch(0.64 0.2 25) }
  h1 { margin: 40px 0 28px; font-weight: 600; font-size: 84px; line-height: 0.95; text-transform: uppercase }
  p { margin: 0; font-size: 27px; line-height: 1.35; color: oklch(0.7 0.01 270) }
  .frame { position: absolute; left: 600px; top: 72px; width: 780px; border: 1px solid oklch(0.32 0.01 270);
    border-radius: 18px; padding: 10px; background: oklch(0.13 0.006 270) }
  .frame img { display: block; width: 100%; border-radius: 10px }
</style>
<div class="copy">
  <div class="mark"><img src="${dataUri('public/favicon.svg', 'image/svg+xml')}" alt=""><div>HOBBY<span>KIT</span></div></div>
  <h1>Size it.<br>Print it.</h1>
  <p>Free, open source generator for printable bases, trays, holders and paint racks, sized exactly how you need them.</p>
</div>
<div class="frame"><img src="${dataUri(FRAMED, 'image/png')}" alt=""></div>`)
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: 'docs/images/github-social-preview.png' })
  await tab.close()
}

try {
  for (const page of PAGES) await capture(browser, page.href, `public${socialCardPath(page)}`, { width: 1200, height: 630 })
  for (const shot of README) await capture(browser, shot.href, shot.path, { width: 1440, height: 900 }, 2)
  await capture(browser, '/', FRAMED, { width: 1100, height: 760 }, 2)
  await githubPreview(browser)
} finally {
  await browser.close()
  await server.close()
}
