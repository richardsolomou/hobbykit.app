import { readFile } from 'node:fs/promises'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { unzipSync } from 'fflate'
import { skipTours } from '../scripts/skipTours'

/** The drawing's title block carries the filename, the spec and the status. */
const footer = (page: Page) => page.locator('footer')
/** The viewport publishes the triangle count of the mesh it has actually drawn. */
const drawn = (page: Page) => page.locator('main [data-triangles]')
/** Footprint and height are read off the dimension leaders drawn on the part. */
const across = (page: Page) => page.locator('#label-across')
const tall = (page: Page) => page.locator('#label-height')
const sizeLabel = (page: Page) => page.getByLabel('Label text')

/** Options read "<size> <what it is for>", so anchor on the figure. */
const sizeOption = (page: Page, label: string) =>
  page
    .getByRole('radiogroup', { name: 'Standard base size' })
    .getByRole('radio', { name: new RegExp(`^${label.replaceAll('.', '\\.')}\\s`) })

async function pickSize(page: Page, label: string) {
  await sizeOption(page, label).click()
}

/** The option picked in a picture grid. */
function picked(page: Page, label: string, option: string) {
  return page.getByRole('radiogroup', { name: label }).getByRole('radio', { name: option, exact: true })
}

/** Picks an option from a picture grid or a dropdown, whichever the control is. */
async function pickChoice(page: Page, label: string, option: string) {
  const pictures = page.getByRole('radiogroup', { name: label })
  if ((await pictures.count()) > 0) {
    await pictures.getByRole('radio', { name: option, exact: true }).click()
    return
  }
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

/** Types a dimension and commits it with Enter. */
async function setDimension(page: Page, label: string | RegExp, value: string, { exact = false } = {}) {
  const input = page.getByLabel(label, { exact })
  await input.fill(value)
  await input.press('Enter')
}

/** Geometry is built in a worker, so the drawing settles a moment after a click. */
async function settled(page: Page) {
  await expect(footer(page)).toContainText(/ready/i, { timeout: 15_000 })
  await expect.poll(() => triangles(page), { timeout: 15_000 }).toBeGreaterThan(0)
}

async function triangles(page: Page): Promise<number> {
  return Number((await drawn(page).getAttribute('data-triangles')) ?? 0)
}

/**
 * Waits for a rebuild to land. Polling the triangle count beats waiting for
 * "ready", which is still true from the build before the one being triggered.
 */
async function rebuilt(page: Page, previous: number) {
  await expect.poll(() => triangles(page), { timeout: 15_000 }).not.toBe(previous)
  await settled(page)
}

/** Opens another generator and waits for its own part to replace the previous one. */
async function visit(page: Page, name: string) {
  const before = await triangles(page)
  await page.getByRole('link', { name }).click()
  await rebuilt(page, before)
}

/** The current test's page errors; each worker runs its tests one at a time. */
let errors: string[] = []

test.beforeEach(async ({ page }) => {
  errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  // Specs reach every setting and start past every tour; the ones that test hiding and touring undo that themselves.
  await page.addInitScript(() => {
    if (window.localStorage.getItem('hobbykit.advanced') === null) window.localStorage.setItem('hobbykit.advanced', 'true')
  })
  await skipTours(page)
  await page.goto('/')
  await settled(page)
})

// Records the page's runtime errors on each test's report without failing it.
test.afterEach(() => {
  test.info().annotations.push({ type: 'console', description: errors.join('\n') })
})

test('builds the default base on load', { tag: '@ci' }, async ({ page }) => {
  const panel = page.getByRole('complementary', { name: 'Base settings' }).locator('xpath=ancestor::*[@data-slot="scroll-area"]')
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(344.25)
  await expect(page.getByRole('heading', { name: 'HobbyKit — Magnetised miniature base generator' })).toBeVisible()
  await expect(across(page)).toHaveText('Ø32')
  await expect(tall(page)).toHaveText('4')
  await expect(footer(page)).toContainText('base-round-32mm')
  expect(await triangles(page)).toBeGreaterThan(0)
})

test('keeps the 3D canvas out of the observed viewer layout', { tag: '@ci' }, async ({ page }) => {
  const resizeErrors: string[] = []
  page.on('pageerror', (error) => {
    if (error.message.includes('ResizeObserver')) resizeErrors.push(error.message)
  })
  const canvas = page.locator('main canvas')
  await expect(canvas).toHaveCSS('position', 'absolute')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(canvas).toHaveCSS('position', 'absolute')
  await expect.poll(() => triangles(page)).toBeGreaterThan(0)
  expect(resizeErrors).toEqual([])
})

test('keeps a separate camera view for each generator', async ({ page }) => {
  const canvas = page.locator('main canvas')
  const cameraView = () => drawn(page).getAttribute('data-camera-view')
  const cameraDifference = async (expected: string | null) => {
    const actual = await cameraView()
    if (!expected || !actual) return Infinity
    const expectedValues = expected.split(',').map(Number)
    return Math.max(...actual.split(',').map((value, index) => Math.abs(Number(value) - expectedValues[index])))
  }
  const orbit = async (dx: number, dy: number) => {
    const bounds = await canvas.boundingBox()
    if (!bounds) throw new Error('3D canvas has no bounds')
    const x = bounds.x + bounds.width / 2
    const y = bounds.y + bounds.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 10 })
    await page.mouse.up()
  }
  await expect(drawn(page)).toHaveAttribute('data-camera-view', /,/)
  const baseDefault = await cameraView()
  await visit(page, 'Holders')
  const holderDefault = await cameraView()
  await visit(page, 'Bases')

  // Leaving while a drag is still coasting must not carry its momentum into the
  // next generator, so each switch here follows its drag immediately.
  await orbit(120, 80)
  await visit(page, 'Holders')
  await expect.poll(() => cameraDifference(holderDefault)).toBeLessThan(0.02)
  await orbit(-90, -60)
  await visit(page, 'Bases')
  const baseView = await cameraView()
  expect(await cameraDifference(baseDefault)).toBeGreaterThan(1)

  await visit(page, 'Holders')
  const holderView = await cameraView()
  expect(await cameraDifference(holderDefault)).toBeGreaterThan(1)
  await visit(page, 'Bases')
  await expect.poll(() => cameraDifference(baseView)).toBeLessThan(0.02)
  await visit(page, 'Holders')
  await expect.poll(() => cameraDifference(holderView)).toBeLessThan(0.02)
})

test('links to the source repository', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/richardsolomou/hobbykit.app')
})

test("links to the current generator's MakerWorld listing", async ({ page }) => {
  await visit(page, 'Holders')
  await expect(page.getByRole('link', { name: 'MakerWorld' })).toHaveAttribute(
    'href',
    'https://makerworld.com/en/models/3545623-gridfinity-miniature-holder',
  )
})

test('starts every dimension on a value its own input accepts', async ({ page }) => {
  const invalid = () =>
    page
      .locator('input[type=number]')
      .evaluateAll((inputs) =>
        inputs.filter((input) => !(input as HTMLInputElement).checkValidity()).map((input) => input.getAttribute('aria-label')),
      )
  for (const name of ['Holders', 'Spray tray', 'Paint racks', 'Stems', 'Tokens', 'Counters', 'Bases']) {
    await visit(page, name)
    expect(await invalid(), name).toEqual([])
  }
})

test('keeps a half millimetre size exact', { tag: '@ci' }, async ({ page }) => {
  await pickSize(page, '28.5')
  await settled(page)
  await expect(across(page)).toHaveText('Ø28.5')
  // Rounding to 29 anywhere would defeat the whole point of the size label.
  await expect(sizeLabel(page)).toHaveAttribute('placeholder', '28.5')
})

test('estimates solid filament weight for every generator', { tag: '@ci' }, async ({ page }) => {
  const filament = footer(page).getByText(/ g solid PLA$/)
  await expect(filament).toHaveText('≈1.6 g solid PLA')

  const before = await triangles(page)
  await pickSize(page, '60')
  await rebuilt(page, before)
  await expect.poll(async () => Number((await filament.textContent())?.match(/[\d.]+/)?.[0])).toBeGreaterThan(1.6)

  for (const generator of ['Holders', 'Spray tray', 'Paint racks', 'Stems', 'Tokens', 'Counters']) {
    await visit(page, generator)
    await expect(filament).toHaveText(/^[≈<][\d.]+ g solid PLA$/)
  }
})

test('uses an end pair for a medium oval base', async ({ page }) => {
  await pickChoice(page, 'Shape', 'Oval')
  await pickSize(page, '90×52.5')
  await expect(footer(page)).toContainText('2 × 5.2 mm hole')
})

test('marks and resets a changed value to its default', { tag: '@ci' }, async ({ page }) => {
  const wall = page.getByLabel('Wall thickness in mm')
  await wall.fill('3')
  await wall.blur()
  const reset = page.getByRole('button', { name: 'Reset Wall thickness to 2.0 mm' })
  await expect(reset).toBeVisible()
  await expect(page.getByText('Wall thickness', { exact: true })).toHaveClass(/text-modified/)
  await reset.click()
  await expect(wall).toHaveValue('2.0')
  await expect(reset).not.toBeVisible()
})

test('hides advanced settings until they are changed', async ({ page }) => {
  const advanced = page.getByRole('switch', { name: 'Advanced settings' })
  const wall = page.getByLabel('Wall thickness in mm')
  await wall.fill('3')
  await wall.blur()
  await advanced.click()
  await expect(page.getByLabel('Top thickness in mm')).toHaveCount(0)
  await expect(wall).toHaveValue('3.0')

  await page.getByRole('button', { name: 'Reset Wall thickness to 2.0 mm' }).click()
  await expect(wall).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Advanced settings' })).not.toBeChecked()
})

test('makes a relief base solid unless told otherwise', async ({ page }) => {
  const solid = page.getByRole('switch', { name: 'Solid', exact: true })
  await pickChoice(page, 'Pattern', 'Flagstone')
  await expect(solid).not.toBeChecked()
  await pickChoice(page, 'Pattern', 'Rock')
  await expect(solid).toBeChecked()
  await expect(page.getByLabel('Top thickness in mm')).toHaveCount(0)

  const before = await triangles(page)
  await solid.click()
  await rebuilt(page, before)
  await expect(page.getByLabel('Top thickness in mm')).toBeVisible()
  await pickChoice(page, 'Pattern', 'Snow')
  await expect(solid).not.toBeChecked()
})

test('lets size-driven values follow the size without looking changed', async ({ page }) => {
  const labelSize = page.getByLabel('Label size in mm')
  await pickSize(page, '28.5')
  await expect(labelSize).toHaveValue('5.7')
  await expect(page.getByRole('button', { name: /^Reset Label size/ })).toHaveCount(0)

  await labelSize.fill('4')
  await labelSize.blur()
  await pickSize(page, '60')
  await expect(labelSize).toHaveValue('4.0')
  await page.getByRole('button', { name: 'Reset Label size to 8.0 mm' }).click()
  await expect(labelSize).toHaveValue('8.0')
  await pickSize(page, '28.5')
  await expect(labelSize).toHaveValue('5.7')
})

test('keeps style choices when a standard size is picked', async ({ page }) => {
  await pickChoice(page, 'Bottom edge', 'Bevel')
  await pickSize(page, '60')
  await expect(picked(page, 'Bottom edge', 'Bevel')).toBeChecked()
})

test('resets construction values to the current footprint defaults', async ({ page }) => {
  await pickSize(page, '80')
  const thickness = page.getByLabel('Top thickness in mm')
  await expect(thickness).toHaveValue('1.5')
  await thickness.fill('1.2')
  await thickness.blur()
  await page.getByRole('button', { name: 'Reset Top thickness to 1.5 mm' }).click()
  await expect(thickness).toHaveValue('1.5')
})

test('marks and resets changed toggles and choices', async ({ page }) => {
  const labelToggle = page.getByRole('switch', { name: 'Labels', exact: true })
  await labelToggle.click()
  const resetLabel = page.getByRole('button', { name: 'Reset Labels to on' })
  await expect(resetLabel).toBeVisible()
  await resetLabel.click()
  await expect(labelToggle).toBeChecked()

  await pickChoice(page, 'Shape', 'Oval')
  const resetShape = page.getByRole('button', { name: 'Reset Shape to Round' })
  await expect(resetShape).toBeVisible()
  await resetShape.click()
  await expect(page.getByRole('radiogroup', { name: 'Shape' }).getByRole('radio', { name: 'Round' })).toBeChecked()
})

test('keeps shape and size independent while sharing matching magnet settings in the session', async ({ page }) => {
  await pickChoice(page, 'Shape', 'Oval')
  await pickSize(page, '90×52.5')
  await setDimension(page, 'Magnet diameter in mm', '6')

  await page.getByRole('link', { name: 'Holders' }).click()
  await expect(page.getByRole('combobox', { name: 'Standard base size 1' })).toContainText('32')
  await pickChoice(page, 'Shape 1', 'Oval')
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: /^90×52\.5\s/ }).click()
  await expect(page.getByRole('combobox', { name: 'Standard base size 1' })).toContainText('90×52.5')
  await expect(page.getByLabel('Magnet diameter in mm')).toHaveValue('6.0')
  await expect(footer(page)).toContainText('10 × 6.2 mm hole')

  await setDimension(page, 'Magnet diameter in mm', '7')
  await expect(footer(page)).toContainText('10 × 7.2 mm hole')
  const ninetyByFiftyTwo = await triangles(page)
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: /^75×42\s/ }).click()
  await rebuilt(page, ninetyByFiftyTwo)

  await page.getByRole('link', { name: 'Bases' }).click()
  await expect(across(page)).toHaveText('90 × 52.5')
  await expect(page.getByLabel('Magnet diameter in mm')).toHaveValue('7.0')
})

test('shares the selected pocket pattern between bases and holders', async ({ page }) => {
  const layout = page.getByRole('radiogroup', { name: 'Pocket layout' })
  await expect(layout).toHaveCount(0)
  await pickSize(page, '60')
  await expect(layout.getByRole('radio', { name: 'Five-pocket cross' })).toHaveCount(1)
  await expect(footer(page)).toContainText('3 × 5.2 mm hole')
  await expect(picked(page, 'Magnets per base', 'Auto · 3')).toBeChecked()
  await expect(picked(page, 'Number of supports', 'Auto · 3')).toBeChecked()
  await expect(picked(page, 'Pocket layout', 'Balanced')).toBeChecked()
  await pickChoice(page, 'Magnets per base', '4')
  await expect(footer(page)).toContainText('4 × 5.2 mm hole')

  await page.getByRole('link', { name: 'Holders' }).click()
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: /^60\s/ }).click()
  await expect(picked(page, 'Pocket layout', 'Balanced')).toBeChecked()
  await expect(footer(page)).toContainText('20 × 5.2 mm hole')
  await pickChoice(page, 'Pocket layout', 'Five-pocket cross')
  await expect(footer(page)).toContainText('25 × 5.2 mm hole')

  await page.getByRole('link', { name: 'Bases' }).click()
  await expect(footer(page)).toContainText('5 × 5.2 mm hole')
  await expect(page.getByRole('radiogroup', { name: 'Magnets per base' })).toHaveCount(0)
})

test('remembers workspace settings on reload', async ({ page }) => {
  await setDimension(page, 'Diameter in mm', '37', { exact: true })
  const height = page.getByLabel('Base height in mm')
  await height.fill('5')
  await height.press('Enter')
  await setDimension(page, 'Magnet diameter in mm', '7')
  await page.getByRole('switch', { name: 'Labels', exact: true }).click()
  await page.reload()
  await settled(page)
  await expect(page.getByLabel('Diameter in mm', { exact: true })).toHaveValue('37.0')
  await expect(page.getByLabel('Base height in mm')).toHaveValue('5.0')
  await expect(page.getByLabel('Magnet diameter in mm')).toHaveValue('7.0')
  await expect(page.getByRole('switch', { name: 'Labels', exact: true })).not.toBeChecked()
})

async function copyLink(page: Page) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.getByRole('status')).toContainText('Link copied')
  return page.evaluate(() => navigator.clipboard.readText())
}

async function openLink(browser: Browser, url: string) {
  const page = await (await browser.newContext()).newPage()
  await page.goto(url)
  await settled(page)
  return page
}

test('opens a copied link with the same setup in a fresh browser', { tag: '@ci' }, async ({ page, browser }) => {
  await setDimension(page, 'Diameter in mm', '37', { exact: true })
  await setDimension(page, 'Magnet diameter in mm', '7')

  const recipient = await openLink(browser, await copyLink(page))
  await expect(across(recipient)).toHaveText('Ø37')
  await expect(recipient.getByLabel('Magnet diameter in mm')).toHaveValue('7.0')
})

test('clears an opened link so a reload uses the saved workspace', async ({ page, browser }) => {
  const height = page.getByLabel('Base height in mm')
  await height.fill('5')
  await height.press('Enter')

  const recipient = await openLink(browser, await copyLink(page))
  await expect(recipient).toHaveURL(/\/$/)
  await setDimension(recipient, 'Base height in mm', '6')
  await recipient.reload()
  await settled(recipient)
  await expect(recipient.getByLabel('Base height in mm')).toHaveValue('6.0')
})

test('opens a link on the generator it was copied from', async ({ page, browser }) => {
  await visit(page, 'Stems')
  await pickChoice(page, 'Stem height', '20 mm')
  await expect(tall(page)).toHaveText('24')

  const recipient = await openLink(browser, await copyLink(page))
  await expect(recipient.getByRole('link', { name: 'Stems' })).toHaveAttribute('aria-current', 'page')
  await expect(tall(recipient)).toHaveText('24')
})

test('opens the retired adapters address on bases with a saved workspace intact', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'mini-bases.workspace'
    const { workspace } = JSON.parse(window.localStorage.getItem(key)!)
    workspace.base.height = 5
    workspace.adapter = { kind: 'adapter', target: { shape: 'round', width: 32, length: 32 } }
    window.localStorage.setItem(key, JSON.stringify({ version: 11, workspace }))
  })
  await page.goto('/adapters')
  await settled(page)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Bases' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel('Base height in mm')).toHaveValue('5.0')
  const generators = page.getByRole('navigation', { name: 'Generators' }).getByRole('link')
  expect(await generators.evaluateAll((links) => links.map((link) => link.getAttribute('aria-label')))).toEqual([
    'Bases',
    'Holders',
    'Spray tray',
    'Paint racks',
    'Stems',
    'Tokens',
    'Counters',
  ])
})

test('opens the retired movement trays address on bases with a saved workspace intact', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'mini-bases.workspace'
    const { workspace } = JSON.parse(window.localStorage.getItem(key)!)
    workspace.base.height = 5
    workspace.movementTray = { kind: 'movement-tray', shape: 'rect', width: 25, length: 25, columns: 5, ranks: 4 }
    window.localStorage.setItem(key, JSON.stringify({ version: 15, workspace }))
  })
  await page.goto('/movement-trays')
  await settled(page)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Bases' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel('Base height in mm')).toHaveValue('5.0')
})

test('ignores a garbled link and keeps the saved workspace', async ({ page }) => {
  await setDimension(page, 'Base height in mm', '5')
  await page.goto('/holders#setup=not-a-real-link')
  await settled(page)
  await expect(page).toHaveURL(/\/holders$/)
  await page.getByRole('link', { name: 'Bases' }).click()
  await expect(page.getByLabel('Base height in mm')).toHaveValue('5.0')
})

test('copies a token link without an image too large to share', async ({ page, browser }) => {
  await visit(page, 'Tokens')
  const noise = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!
    const pixels = context.createImageData(256, 256)
    // Light noise stays above the trace threshold, so only the dark square is raised.
    for (let i = 0; i < pixels.data.length; i += 1) {
      const x = (i / 4) % 256
      const y = Math.floor(i / 4 / 256)
      const square = x >= 64 && x < 192 && y >= 64 && y < 192
      pixels.data[i] = i % 4 === 3 ? 255 : square ? 0 : 160 + Math.floor(Math.random() * 96)
    }
    context.putImageData(pixels, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const textOnly = await triangles(page)
  await page.getByLabel('Token image').setInputFiles({ name: 'noise.png', mimeType: 'image/png', buffer: Buffer.from(noise, 'base64') })
  await rebuilt(page, textOnly)

  const url = await copyLink(page)
  await expect(page.getByRole('status')).toContainText('without the image')
  const recipient = await openLink(browser, url)
  await expect(footer(recipient)).not.toContainText('noise.png')
})

test('carries a small token image in its link', async ({ page, browser }) => {
  await visit(page, 'Tokens')
  const textOnly = await triangles(page)
  await page.getByLabel('Token image').setInputFiles({ name: 'shield.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SHIELD_SVG) })
  await rebuilt(page, textOnly)

  const recipient = await openLink(browser, await copyLink(page))
  await expect(footer(recipient)).toContainText('shield.svg')
})

test('resets one generator to its defaults after confirmation', async ({ page }) => {
  const height = page.getByLabel('Base height in mm')
  const defaultHeight = await height.inputValue()
  await setDimension(page, 'Base height in mm', '5')
  await setDimension(page, 'Magnet diameter in mm', '7')
  await sizeLabel(page).fill('SQUAD 3')
  await page.getByRole('button', { name: 'Add 32 to batch' }).click()
  await visit(page, 'Stems')
  await setDimension(page, 'Body diameter in mm', '6')
  await visit(page, 'Bases')

  await page.getByRole('button', { name: 'Reset base', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
  await expect(height).toHaveValue('5.0')

  await page.getByRole('button', { name: 'Reset base', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(height).toHaveValue(defaultHeight)
  await expect(sizeLabel(page)).toHaveValue('')
  await expect(page.getByLabel(/^Quantity of Round 32 in/)).toHaveCount(0)
  await expect(page.getByLabel('Magnet diameter in mm')).toHaveValue('7.0')
  await visit(page, 'Stems')
  await expect(page.getByLabel('Body diameter in mm')).toHaveValue('6.0')
})

test('resets shared settings without touching generator settings', async ({ page }) => {
  const magnet = page.getByLabel('Magnet diameter in mm')
  const defaultMagnet = await magnet.inputValue()
  await setDimension(page, 'Base height in mm', '5')
  await setDimension(page, 'Magnet diameter in mm', '7')
  await visit(page, 'Holders')

  await page.getByRole('button', { name: 'Reset shared settings' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(magnet).toHaveValue(defaultMagnet)
  await visit(page, 'Bases')
  await expect(magnet).toHaveValue(defaultMagnet)
  await expect(page.getByLabel('Base height in mm')).toHaveValue('5.0')
})

test('shares the size label preference between bases and holders', async ({ page }) => {
  await page.getByRole('switch', { name: 'Labels', exact: true }).click()
  await page.getByRole('link', { name: 'Holders' }).click()
  await expect(page.getByRole('switch', { name: 'Labels', exact: true })).not.toBeChecked()
  const withoutLabels = await triangles(page)

  await page.getByRole('switch', { name: 'Labels', exact: true }).click()
  await rebuilt(page, withoutLabels)
  await page.getByRole('link', { name: 'Bases' }).click()
  await expect(page.getByRole('switch', { name: 'Labels', exact: true })).toBeChecked()
})

test('builds a matching printable flying stem', async ({ page }) => {
  await visit(page, 'Stems')

  await expect(across(page)).toHaveText('Ø4.8')
  await expect(tall(page)).toHaveText('19')
  await expect(footer(page)).toContainText('flying-stem-15mm')
  await expect(footer(page)).toContainText('Ø1.8 × 4 mm')
  await pickChoice(page, 'Stem height', '20 mm')
  await expect(tall(page)).toHaveText('24')
  await expect(footer(page)).toContainText('flying-stem-20mm')

  const pegTriangles = await triangles(page)
  await pickChoice(page, 'Connection', 'Ball joint')
  await rebuilt(page, pegTriangles)
  await expect(page.getByLabel('Ball diameter in mm')).toHaveValue('4.0')
  await expect(tall(page)).toHaveText('23.95')
  await expect(footer(page)).toContainText('flying-stem-20mm-ball')
  await expect(footer(page)).toContainText('Ball joint')
  await expect(footer(page)).toContainText('Ø4 mm')
})

test('builds a dial counter and downloads each part with its tiles', async ({ page }) => {
  await visit(page, 'Counters')

  await expect(tall(page)).toHaveText('43.56')
  await expect(footer(page)).toContainText('counter-39.6mm')

  // Resizing scales every face without adding triangles, so the footer's name shows the rebuild.
  await setDimension(page, 'Wheel diameter in mm', '24')
  await expect(footer(page)).toContainText('counter-24mm')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const saved = await pending
  expect(saved.suggestedFilename()).toBe('counter-24mm.zip')
  const path = await saved.path()
  if (!path) throw new Error('download has no local path')
  expect(Object.keys(unzipSync(await readFile(path))).sort()).toEqual([
    'counter-24mm-inserts-marks.stl',
    'counter-24mm-inserts.stl',
    'counter-24mm-left-case.stl',
    'counter-24mm-left-knob.stl',
    'counter-24mm-right-case.stl',
    'counter-24mm-right-knob.stl',
    'counter-24mm-tens-wheel.stl',
    'counter-24mm-units-wheel.stl',
  ])
})

test('downloads a dial counter in a frame on a base', async ({ page }) => {
  await visit(page, 'Counters')
  await pickChoice(page, 'Layout', 'Frame and base')
  await pickChoice(page, 'Digits', 'Engraved for paint')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  expect(Object.keys(unzipSync(await readFile(path))).sort()).toEqual([
    'counter-39.6mm-base.stl',
    'counter-39.6mm-frame.stl',
    'counter-39.6mm-tens-wheel.stl',
    'counter-39.6mm-tube.stl',
    'counter-39.6mm-units-wheel.stl',
  ])
})

test('prints the dial counter tiles on their own plate, changing filament once', async ({ page }) => {
  await visit(page, 'Counters')
  await expect(tall(page)).toHaveText('43.56')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  const archive = unzipSync(await readFile(path))
  const text = (file: string) => new TextDecoder().decode(archive[file])
  expect(JSON.parse(text('Metadata/project_settings.config')).filament_colour).toHaveLength(2)
  expect(text('Metadata/model_settings.config')).toContain('value="counter-39.6mm-tile-units-7"')
  expect(text('Metadata/model_settings.config')).toMatch(
    /value="counter-39.6mm-tile-units-7-mark"\/>.*?<metadata key="extruder" value="2"\/>/,
  )
})

test('prints the dial counter brackets with the tiles, changing filament at the same height', async ({ page }) => {
  await visit(page, 'Counters')
  await pickChoice(page, 'Layout', 'Hubs and knobs')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  const settings = new TextDecoder().decode(unzipSync(await readFile(path))['Metadata/model_settings.config'])
  expect(settings).toMatch(/value="counter-39.6mm-left-bracket-marks"\/>.*?<metadata key="extruder" value="2"\/>/)
  const bracket = settings.match(/<object id="(\d+)"><metadata key="name" value="counter-39.6mm-right-bracket"\/>/)![1]
  expect(settings.split('<plate>').at(-1)).toContain(`key="object_id" value="${bracket}"`)
  expect(settings).not.toContain('-hub-marks')
})

test('prints the dial counter digits into the dials in a third filament', async ({ page }) => {
  await visit(page, 'Counters')
  await expect(page.getByRole('radiogroup', { name: 'Digits' }).getByRole('radio', { name: 'Press-in tiles' })).toBeChecked()
  await expect(page.getByRole('button', { name: /^Third colour/ })).toHaveCount(0)
  await pickChoice(page, 'Digits', 'Printed in the dial')
  await pickChoice(page, 'Digit filament', 'Third colour')
  await expect(page.getByRole('button', { name: /^Third colour/ })).toBeVisible()
  await expect(page.getByLabel('Insert clearance in mm')).toHaveCount(0)

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  const archive = unzipSync(await readFile(path))
  const text = (file: string) => new TextDecoder().decode(archive[file])
  expect(JSON.parse(text('Metadata/project_settings.config')).filament_colour).toHaveLength(3)
  expect(text('Metadata/model_settings.config')).toMatch(
    /value="counter-39.6mm-units-wheel-digits"\/>.*?<metadata key="extruder" value="3"\/>/,
  )
  expect(text('Metadata/model_settings.config')).not.toContain('-tile-')
})

test('saves one set of colours and writes them into every 3MF', async ({ page }) => {
  await visit(page, 'Tokens')
  await page.getByRole('button', { name: /^Body colour/ }).click()
  await page.getByRole('button', { name: 'Bambu Green', exact: true }).click()
  await page.keyboard.press('Escape')
  await visit(page, 'Counters')
  await expect(page.getByRole('button', { name: 'Body colour: Bambu Green' })).toBeVisible()

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  const project = JSON.parse(new TextDecoder().decode(unzipSync(await readFile(path))['Metadata/project_settings.config']))
  expect([project.printer_model, project.filament_colour[0]]).toEqual(['Bambu Lab X2D', '#00AE42'])
})

test('keeps every dropdown label clear of its check mark', async ({ page }) => {
  await visit(page, 'Holders')
  await page.getByRole('combobox', { name: 'Shape 1' }).click()

  const overruns = await page
    .getByRole('option')
    .evaluateAll((options) =>
      options
        .filter((option) => option.firstElementChild!.scrollWidth > option.firstElementChild!.clientWidth)
        .map((option) => option.textContent),
    )
  expect(overruns).toEqual([])
})

test('engraves the dial counter without inserts', async ({ page }) => {
  await visit(page, 'Counters')
  const inserted = await triangles(page)

  await pickChoice(page, 'Digits', 'Engraved for paint')
  await rebuilt(page, inserted)
  await expect(page.getByLabel('Insert clearance in mm')).toHaveCount(0)
  expect(await triangles(page)).toBeLessThan(inserted)
})

test('scales the whole dial counter from the size choice', async ({ page }) => {
  await visit(page, 'Counters')

  await pickChoice(page, 'Size', 'Small')
  await expect(footer(page)).toContainText('counter-24mm')
  await expect(footer(page)).toContainText('4.6 mm tall')
  await expect(page.getByLabel('Wheel diameter in mm')).toHaveValue('24.0')
})

test('caps the dial counter click at what its wheels can lift', async ({ page }) => {
  await visit(page, 'Counters')

  await expect(page.getByLabel('Click in mm')).toHaveAttribute('max', '1.55')
  await setDimension(page, 'Wheel diameter in mm', '18')
  await expect(page.getByLabel('Click in mm')).toHaveAttribute('max', '0.7')
  await setDimension(page, 'Wheel diameter in mm', '30')
  await expect(page.getByLabel('Click in mm')).toHaveAttribute('max', '1.15')
})

const SHIELD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">
  <path d="M50 4 L94 20 L90 70 Q80 104 50 116 Q20 104 10 70 L6 20 Z" fill="#000"/>
</svg>`

test('builds a token from text and an uploaded image', async ({ page }) => {
  await visit(page, 'Tokens')

  await expect(across(page)).toHaveText('Ø40')
  await expect(tall(page)).toHaveText('4')
  await expect(footer(page)).toContainText('token-round-40mm-objective')

  const numbered = await triangles(page)
  await page.getByLabel('Token text').fill('Oath of Moment')
  await rebuilt(page, numbered)
  await expect(footer(page)).toContainText('token-round-40mm-oath-of-moment')

  const textOnly = await triangles(page)
  await page.getByLabel('Token image').setInputFiles({ name: 'shield.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SHIELD_SVG) })
  await rebuilt(page, textOnly)
  await expect(footer(page)).toContainText('shield.svg')

  const withImage = await triangles(page)
  await page.getByLabel('Token text').fill('')
  await rebuilt(page, withImage)
  await expect(footer(page)).toContainText('token-round-40mm-shield')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  expect((await download).suggestedFilename()).toBe('token-round-40mm-shield.zip')
})

test('prints raised token artwork in a second colour, changing filament once', async ({ page }) => {
  await visit(page, 'Tokens')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  const archive = unzipSync(await readFile(path))
  const text = (file: string) => new TextDecoder().decode(archive[file])
  expect(JSON.parse(text('Metadata/project_settings.config')).filament_colour).toHaveLength(2)
  expect(text('Metadata/model_settings.config')).toMatch(
    /value="token-round-40mm-objective-artwork"\/>.*?<metadata key="extruder" value="2"\/>/,
  )
})

test('reshapes a token into a hex measured across its flats', async ({ page }) => {
  await visit(page, 'Tokens')

  const round = await triangles(page)
  await pickChoice(page, 'Shape', 'Hex')
  await rebuilt(page, round)
  await expect(across(page)).toHaveText('46.19 × 40')
  await expect(footer(page)).toContainText('token-hex-40mm-objective')

  // Resizing keeps the hex's topology, so the triangle count cannot signal the rebuild.
  const acrossFlats = page.getByLabel('Across flats in mm')
  await acrossFlats.fill('25.4')
  await acrossFlats.press('Enter')
  await expect(across(page)).toHaveText('29.33 × 25.4', { timeout: 15_000 })
  await expect(footer(page)).toContainText('token-hex-25.4mm-objective')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  expect((await download).suggestedFilename()).toBe('token-hex-25.4mm-objective.zip')
})

test('engraves token artwork for stacking and saves its relief', async ({ page }) => {
  await visit(page, 'Tokens')
  await page.getByLabel('Token image').setInputFiles({ name: 'shield.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SHIELD_SVG) })
  const relief = page.getByLabel('Relief height in mm')
  await relief.fill('-1')
  await relief.blur()
  await expect(tall(page)).toHaveText('3')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const bytes = await readFile(await (await download).path())
  const heights: number[] = []
  for (let i = 0; i < bytes.readUInt32LE(80); i++) {
    for (let vertex = 0; vertex < 3; vertex++) heights.push(bytes.readFloatLE(84 + i * 50 + 20 + vertex * 12))
  }
  expect(Math.max(...heights)).toBe(3)
  expect(heights).toContain(2)

  await page.reload()
  await settled(page)
  await expect(relief).toHaveValue('-1.0')
  await expect(tall(page)).toHaveText('3')

  await page.getByLabel('Thickness in mm').fill('1.5')
  await page.getByLabel('Thickness in mm').blur()
  await expect(relief).toHaveValue('-0.5')
  await expect(tall(page)).toHaveText('1.5')

  await relief.fill('0')
  await relief.blur()
  await expect(tall(page)).toHaveText('1.5')
  await expect(page.getByRole('button', { name: 'Download STL' })).toBeEnabled()
})

test('keeps a long image name from widening the token panel', async ({ page }) => {
  await visit(page, 'Tokens')

  const named = await triangles(page)
  const name = `${'a-very-long-image-file-name-'.repeat(4)}shield.svg`
  await page.getByLabel('Token image').setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(SHIELD_SVG) })
  await rebuilt(page, named)

  const remove = page.getByRole('button', { name: 'Remove' })
  await remove.scrollIntoViewIfNeeded()
  await expect(remove).toBeInViewport({ ratio: 1 })
})

test('edits engraved token relief in the phone drawer', async ({ page }) => {
  await visit(page, 'Tokens')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Token settings' }).click()
  const relief = page.getByLabel('Relief height in mm')
  await relief.fill('-0.5')
  await relief.blur()
  await expect(tall(page)).toHaveText('3')
  await relief.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await expect(relief).toBeInViewport({ ratio: 1 })
  await expect(page.locator('[data-slot="sheet-content"]')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: test.info().outputPath('engraved-token-phone.png') })
})

test('builds a low-profile spray tray with an interleaved magnet grid', async ({ page }) => {
  await visit(page, 'Spray tray')

  await expect(page).toHaveURL(/\/spray-tray$/)
  await expect(page.getByRole('complementary', { name: 'Spray tray settings' })).toBeVisible()
  await expect.poll(async () => Number((await drawn(page).getAttribute('data-camera-view'))?.split(',')[5])).toBeCloseTo(-49.9, 1)
  await expect(tall(page)).toHaveText('102.9')
  await expect(footer(page)).toContainText('painting-tray-4x4-174x174mm')
  await expect(footer(page)).toContainText('4×4 + 3×3 · 50 mm pitch')
  await expect(footer(page)).toContainText('25 × 5.2 mm hole')
  await expect(footer(page)).toContainText('Round · Straight · 28 × 100 mm')
  await expect(page.getByText('Slots', { exact: true })).toHaveCount(0)

  const roundTriangles = await triangles(page)
  await pickChoice(page, 'Grip shape', 'Oval barrel')
  await rebuilt(page, roundTriangles)
  await setDimension(page, 'Grip length in mm', '110')
  await expect(tall(page)).toHaveText('112.9')
  await expect(footer(page)).toContainText('Oval barrel · Straight · 28 × 110 mm')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const saved = await pending
  expect(saved.suggestedFilename()).toBe('painting-tray-4x4-174x174mm.zip')
  const path = await saved.path()
  if (!path) throw new Error('download has no local path')
  expect(Object.keys(unzipSync(await readFile(path))).sort()).toEqual([
    'painting-tray-4x4-174x174mm-handle-oval-28x110mm-0deg.stl',
    'painting-tray-4x4-174x174mm.stl',
  ])

  const gridTriangles = await triangles(page)
  await setDimension(page, 'Columns in ', '5', { exact: true })
  await rebuilt(page, gridTriangles)
  await expect(footer(page)).toContainText('5×4 + 4×3 · 50 mm pitch')
  await expect(footer(page)).toContainText('32 × 5.2 mm hole')
})

test('builds a stepped paint rack', async ({ page }) => {
  await visit(page, 'Paint racks')

  await expect(page).toHaveURL(/\/paint-racks$/)
  await expect(page.getByRole('complementary', { name: 'Paint rack settings' })).toBeVisible()
  await expect(across(page)).toHaveText('193.35 × 132.33')
  await expect(tall(page)).toHaveText('100')
  await expect(footer(page)).toContainText('paint-rack-5x4')
  await expect(footer(page)).toContainText('20 in 35 mm cells')

  const five = await triangles(page)
  await setDimension(page, 'Columns of piece 1 in cols', '3', { exact: true })
  await rebuilt(page, five)
  await expect(across(page)).toHaveText('123.35 × 132.33')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  expect((await pending).suggestedFilename()).toBe('paint-rack-3x4.stl')
})

test('grows a paint rack round a corner and downloads one piece or all of them', async ({ page }) => {
  await visit(page, 'Paint racks')

  for (const name of ['Add a corner to the right', 'Add a module to the right', 'Add an end to the left', 'Add an end to the right']) {
    const before = await triangles(page)
    await page.getByRole('button', { name }).click()
    await rebuilt(page, before)
  }
  await expect(page.getByRole('button', { name: 'Add a module to the right' })).toBeDisabled()
  await expect(footer(page)).toContainText('end · 5×4 · corner · 5×4 · end')

  const piece = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download piece 3' }).click()
  expect((await piece).suggestedFilename()).toBe('3-paint-rack-corner-4-rows.stl')

  const all = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const saved = await all
  const path = await saved.path()
  if (!path) throw new Error('download has no local path')
  expect(Object.keys(unzipSync(await readFile(path)))).toEqual([
    '1-paint-rack-left-end-4-rows.stl',
    '2-paint-rack-5x4.stl',
    '3-paint-rack-corner-4-rows.stl',
    '4-paint-rack-5x4.stl',
    '5-paint-rack-right-end-4-rows.stl',
  ])
})

test('aligns toggle and dimension reset columns', async ({ page }) => {
  await page.getByRole('link', { name: 'Holders' }).click()
  await page.getByLabel('Between miniatures in mm').fill('1.5')
  await page.getByRole('switch', { name: 'Split into modules' }).click()
  const dimensionReset = await page.getByRole('button', { name: /Reset Between miniatures/ }).boundingBox()
  const toggleReset = await page.getByRole('button', { name: /Reset Split into modules/ }).boundingBox()
  const dimension = await page.getByLabel('Between miniatures in mm').boundingBox()
  const toggle = await page.getByRole('switch', { name: 'Split into modules' }).boundingBox()
  expect(toggleReset?.x).toBe(dimensionReset?.x)
  expect(toggle?.x).toBe(dimension?.x)
})

test('defaults holder-edge spacing to half the miniature spacing until customized', async ({ page }) => {
  await page.getByRole('link', { name: 'Holders' }).click()
  const between = page.getByLabel('Between miniatures in mm')
  const edge = page.getByLabel('From holder edge in mm')
  await expect(edge).toHaveValue('0.25')

  await between.fill('2')
  await expect(edge).toHaveValue('1.00')
  await edge.fill('2')
  await between.fill('3')
  await expect(edge).toHaveValue('2.00')
  await page.getByRole('button', { name: /Reset From holder edge/ }).click()
  await expect(edge).toHaveValue('1.50')
  await between.fill('4')
  await expect(edge).toHaveValue('2.00')
})

test('keeps a long dimension label on one line when its reset appears', async ({ page }) => {
  const label = page.getByText('Magnet diameter clearance', { exact: true })
  const before = await label.boundingBox()
  await page.getByLabel('Magnet diameter clearance in mm').fill('0.25')
  await expect(page.getByRole('button', { name: /Reset Magnet diameter clearance/ })).toBeVisible()
  const after = await label.boundingBox()

  expect(after?.height).toBe(before?.height)
})

test('names the download after the shape and size', async ({ page }) => {
  await pickSize(page, '28.5')
  await settled(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  expect((await download).suggestedFilename()).toBe('base-round-28.5mm.stl')
})

test('exports a 3MF as well', async ({ page }) => {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  expect((await download).suggestedFilename()).toBe('base-round-32mm.3mf')
})

test('exports a batch of base sizes together', async ({ page }) => {
  // Four high-quality export builds, where every other spec needs at most one.
  test.slow()
  await page.getByRole('button', { name: 'Add 32 to batch' }).click()
  await setDimension(page, /^Quantity of Round 32 in/, '10')
  const before = await triangles(page)
  await pickSize(page, '40')
  await rebuilt(page, before)
  for (let added = 0; added < 3; added++) await page.getByRole('button', { name: 'Add 40 to batch' }).click()
  await expect(page.getByLabel(/^Quantity of Round 40 in/)).toHaveValue('3')
  await expect(across(page)).toHaveText('Ø40')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Batch STLs' }).click()
  const saved = await pending
  expect(saved.suggestedFilename()).toBe('base-batch-13.zip')
  const path = await saved.path()
  if (!path) throw new Error('download has no local path')
  const stls = unzipSync(await readFile(path))
  expect(Object.keys(stls).sort()).toEqual(['base-round-32mm-x10.stl', 'base-round-40mm-x3.stl'])

  const pending3mf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Batch 3MF' }).click()
  const saved3mf = await pending3mf
  expect(saved3mf.suggestedFilename()).toBe('base-batch-13.3mf')
  const path3mf = await saved3mf.path()
  if (!path3mf) throw new Error('download has no local path')
  const archive = unzipSync(await readFile(path3mf))
  const model = new TextDecoder().decode(archive['3D/3dmodel.model'])
  const settings = new TextDecoder().decode(archive['Metadata/model_settings.config'])
  expect({
    objects: model.match(/<object /g)?.length,
    copies: model.match(/<item objectid=/g)?.length,
    plates: settings.match(/<plate>/g)?.length,
  }).toEqual({ objects: 2, copies: 13, plates: 1 })

  await page.reload()
  await settled(page)
  await expect(page.getByLabel(/^Quantity of Round 32 in/)).toHaveValue('10')
  await page.getByRole('button', { name: 'Remove Round 32 from batch' }).click()
  await expect(page.getByLabel(/^Quantity of Round 32 in/)).toHaveCount(0)
  await expect(page.getByLabel(/^Quantity of Round 40 in/)).toHaveValue('3')
})

test('exports finer circular geometry than the preview', { tag: '@ci' }, async ({ page }) => {
  const previewTriangles = await triangles(page)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const path = await (await pending).path()
  if (!path) throw new Error('download has no local path')
  const stl = await readFile(path)
  expect(stl.readUInt32LE(80)).toBeGreaterThan(previewTriangles)
})

test('builds and exports an automatically sized Gridfinity holder', async ({ page }) => {
  await visit(page, 'Holders')
  await expect(page).toHaveURL(/\/holders$/)
  await expect(across(page)).toHaveText('41.5 × 167.5')
  await expect(tall(page)).toHaveText('14')
  await expect(footer(page)).toContainText('holder-1x4-5x-round-32mm')
  await expect(footer(page)).toContainText('5 × 5.2 mm hole')

  const previewTriangles = await triangles(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STL' }).click()
  const saved = await download
  expect(saved.suggestedFilename()).toBe('holder-1x4-5x-round-32mm.stl')
  const path = await saved.path()
  if (!path) throw new Error('download has no local path')
  expect((await readFile(path)).readUInt32LE(80)).toBeGreaterThan(previewTriangles)
})

test('frames every slot in a tall holder', async ({ page }) => {
  await visit(page, 'Holders')
  await setDimension(page, /^Quantity 1 in/, '4')
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: /^50\s/ }).click()
  await expect(page.getByText('4/4 fitted')).toBeVisible()
  await expect(across(page)).toHaveText('83.5 × 209.5')
  await expect(across(page)).toBeInViewport()
})

test('serves the crawler files rather than the app', { tag: '@ci' }, async ({ request }) => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/holders.md']) {
    const response = await request.get(path)
    expect(response.headers()['content-type'], path).not.toContain('text/html')
  }
})

test('loads the Gridfinity holder directly from its route', { tag: '@ci' }, async ({ page }) => {
  await page.goto('/holders')
  await settled(page)
  await expect(page).toHaveTitle('Gridfinity miniature holder generator — HobbyKit')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('HobbyKit — Gridfinity miniature holder generator')
  await expect(page.getByRole('link', { name: 'Holders' })).toHaveAttribute('aria-current', 'page')
  await expect(footer(page)).toContainText('holder-1x4-5x-round-32mm')
})

test('updates integer holder inputs immediately without losing focus', async ({ page }) => {
  await visit(page, 'Holders')
  await expect(page.getByLabel(/^Maximum columns in/)).toHaveValue('7')
  await expect(page.getByLabel(/^Maximum rows in/)).toHaveValue('5')
  const quantity = page.getByLabel(/^Quantity 1 in/)
  const before = await triangles(page)
  await quantity.fill('4')
  await rebuilt(page, before)
  await expect(quantity).toBeFocused()
  await expect(quantity).toHaveValue('4')
})

test('caps oversized holder quantities before rendering', async ({ page }) => {
  await visit(page, 'Holders')
  const quantity = page.getByLabel(/^Quantity 1 in/)
  const before = await triangles(page)
  await quantity.fill('100')
  await rebuilt(page, before)
  await expect(quantity).toBeFocused()
  await expect(quantity).toHaveValue('100')
  await expect(page.getByText(/\d+\/100 fitted/)).toBeVisible()
  await expect(page.getByText(/Only \d+ of 100 fit/)).toBeVisible()
})

test('reports spare holder room for one and several more models', async ({ page }) => {
  await visit(page, 'Holders')
  const quantity = page.getByLabel(/^Quantity 1 in/)
  for (const [models, room] of [
    ['4', 'Room for 1 more'],
    ['13', 'Room for 2 more'],
  ]) {
    const before = await triangles(page)
    await quantity.fill(models)
    await rebuilt(page, before)
    await expect(page.getByText(room)).toBeVisible()
  }
})

test('switches between subtractive holder engraving locations', async ({ page }) => {
  await visit(page, 'Holders')
  await expect(page.getByRole('switch', { name: 'Labels', exact: true })).toBeChecked()
  await expect(picked(page, 'Label location', 'In slots')).toBeChecked()
  const before = await triangles(page)
  await pickChoice(page, 'Label location', 'On module')
  await rebuilt(page, before)
  await expect(picked(page, 'Label location', 'On module')).toBeChecked()
  const moduleTriangles = await triangles(page)
  await pickChoice(page, 'Label location', 'In slots')
  await rebuilt(page, moduleTriangles)
  await expect(picked(page, 'Label location', 'In slots')).toBeChecked()
})

test('keeps slot features above the Gridfinity foot', async ({ page }) => {
  await visit(page, 'Holders')
  const depth = page.getByRole('spinbutton', { name: 'Slot depth in mm' })
  const magnets = page.getByRole('switch', { name: 'Slot magnets' })
  await expect(page.getByRole('radiogroup', { name: 'Pocket layout' })).toHaveCount(0)
  await expect(depth).toHaveAttribute('max', '6.5')
  const withoutMagnets = await triangles(page)
  await magnets.click()
  await rebuilt(page, withoutMagnets)
  await expect(depth).toHaveAttribute('max', '8')
  await expect(page.getByRole('radiogroup', { name: 'Pocket layout' })).toHaveCount(0)
  await expect(page.getByLabel('Magnet diameter in mm')).toHaveCount(0)
  await depth.fill('8')
  await depth.press('Enter')
  const before = await triangles(page)
  await magnets.click()
  await rebuilt(page, before)
  await expect(depth).toHaveValue('6.5')
})

test('offers only holder heights that fit the selected slot features', async ({ page }) => {
  await visit(page, 'Holders')
  const height = page.getByRole('spinbutton', { name: 'Holder height in mm' })
  await expect(height).toHaveAttribute('min', '14')

  await page.getByRole('switch', { name: 'Slot magnets' }).click()
  const depth = page.getByRole('spinbutton', { name: 'Slot depth in mm' })
  await depth.fill('1')
  await depth.press('Enter')
  await expect(height).toHaveAttribute('min', '7')

  await height.fill('7')
  await height.press('Enter')
  await settled(page)
  await expect(height).toHaveValue('7')
})

test('moves to a second column when the row constraint requires it', async ({ page }) => {
  await visit(page, 'Holders')
  const before = await triangles(page)
  await setDimension(page, /^Maximum rows in/, '3')
  await rebuilt(page, before)
  await expect(across(page)).toHaveText('83.5 × 83.5')
  await expect(footer(page)).toContainText('1 in 2 × 2')
})

test('fits what it can and reports box overflow', async ({ page }) => {
  await visit(page, 'Holders')
  await setDimension(page, /^Maximum columns in/, '1')
  const before = await triangles(page)
  await setDimension(page, /^Maximum rows in/, '1')
  await rebuilt(page, before)
  await expect(page.getByText('Only 1 of 5 fit')).toBeVisible()
  await expect(footer(page)).toContainText('4×Ø32')
})

test('uses clear wording when no holder miniatures fit', async ({ page }) => {
  await visit(page, 'Holders')
  await setDimension(page, /^Maximum columns in/, '1')
  const constrained = await triangles(page)
  await setDimension(page, /^Maximum rows in/, '1')
  await rebuilt(page, constrained)
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: '90 Redemptor and Brutalis Dreadnoughts' }).click()
  await expect(page.getByRole('combobox', { name: 'Standard base size 1' })).toContainText('90')
  await expect(page.getByText('None of 5 fit')).toBeVisible()
  await expect(page.getByText(/Only 0 of/)).not.toBeVisible()
})

test('adds another miniature size to the holder', async ({ page }) => {
  await visit(page, 'Holders')
  await expect(page.getByRole('switch', { name: 'Split into modules' })).toBeChecked()
  const before = await triangles(page)
  await page.getByRole('button', { name: 'Add size' }).click()
  await rebuilt(page, before)
  await expect(page.getByLabel(/^Quantity 2 in/)).toHaveValue('1')
  await expect(page.getByRole('combobox', { name: 'Standard base size 2' })).toContainText('40')
  await expect(footer(page)).toContainText('5×Ø32 · 1×Ø40')

  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download STLs' }).click()
  const saved = await pending
  expect(saved.suggestedFilename()).toBe('holder-2x4-5x-round-32mm-1x-round-40mm.zip')
  const path = await saved.path()
  if (!path) throw new Error('download has no local path')
  expect(Object.keys(unzipSync(await readFile(path))).sort()).toEqual([
    'module-1-holder-1x4-5x-round-32mm.stl',
    'module-2-holder-1x1-1x-round-40mm.stl',
  ])

  const pending3mf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 3MF' }).click()
  const saved3mf = await pending3mf
  expect(saved3mf.suggestedFilename()).toBe('holders-2-2x4-5x-round-32mm-1x-round-40mm.3mf')
  const path3mf = await saved3mf.path()
  if (!path3mf) throw new Error('download has no local path')
  const archive = unzipSync(await readFile(path3mf))
  const model = new TextDecoder().decode(archive['3D/3dmodel.model'])
  const settings = new TextDecoder().decode(archive['Metadata/model_settings.config'])
  const project = new TextDecoder().decode(archive['Metadata/project_settings.config'])
  expect(model.match(/<object /g)).toHaveLength(2)
  expect(model.match(/<item objectid="\d+"[^>]+ transform=/g)).toHaveLength(2)
  expect(model).toContain('<metadata name="Application">BambuStudio-02.07.01.62</metadata>')
  expect(model).toContain('<metadata name="BambuStudio:3mfVersion">1</metadata>')
  expect(settings.match(/<plate>/g)).toHaveLength(2)
  expect(settings).toContain('<metadata key="plater_name" value="module-1-holder-1x4-5x-round-32mm"/>')
  expect(settings).toContain('<metadata key="object_id" value="2"/>')
  expect(settings).toContain('<metadata key="plater_name" value="module-2-holder-1x1-1x-round-40mm"/>')
  expect(settings).toContain('<metadata key="object_id" value="4"/>')
  expect(archive['3D/Objects/object_1.model']).toBeDefined()
  expect(archive['3D/Objects/object_2.model']).toBeDefined()
  expect(JSON.parse(project)).toEqual({
    filament_settings_id: ['Bambu PLA Basic @BBL X2D 0.4 nozzle'],
    filament_colour: ['#D1D3D5'],
    filament_map: ['1'],
    filament_map_mode: 'Auto For Flush',
    print_settings_id: '0.20mm Standard @BBL X2D',
    printer_settings_id: 'Bambu Lab X2D 0.4 nozzle',
    printer_model: 'Bambu Lab X2D',
    nozzle_diameter: ['0.4', '0.4'],
  })
})

test('changes holder slots to non-round base shapes', async ({ page }) => {
  await visit(page, 'Holders')
  const before = await triangles(page)
  await pickChoice(page, 'Shape 1', 'Oval')
  await rebuilt(page, before)
  const oval = await triangles(page)
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: /75×42\b.*Chaos Bikers/ }).click()
  await rebuilt(page, oval)
  await expect(page.getByRole('combobox', { name: 'Standard base size 1' })).toContainText('75×42')
  await expect(footer(page)).toContainText('5×oval 75×42')
  await expect(footer(page)).toContainText('holder-4x4-5x-oval-75x42mm')
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: 'Custom exact dimensions' }).click()
  await expect(page.getByRole('combobox', { name: 'Standard base size 1' })).toContainText('Custom')
  await expect(page.getByText('Width', { exact: true })).toBeVisible()
  await expect(page.getByText('Depth', { exact: true })).toBeVisible()
  await expect(page.getByLabel(/^Base width 1 in/)).toHaveValue('75.0')
  await expect(page.getByLabel(/^Base depth 1 in/)).toHaveValue('42.0')
})

test('uses canonical magnet patterns in holder slots', async ({ page }) => {
  await visit(page, 'Holders')
  const before = await triangles(page)
  await page.getByRole('combobox', { name: 'Standard base size 1' }).click()
  await page.getByRole('option', { name: '80 Avatar of Khaine, Ghazghkull, Slann' }).click()
  await rebuilt(page, before)
  await expect(footer(page)).toContainText('20 × 5.2 mm hole')
})

const SHAPES = [
  { name: 'Oval', footprint: '60 × 35.5', mark: '60x35.5', chip: '170×109' },
  { name: 'Pill', footprint: '60 × 35.5', mark: '60x35.5', chip: '105×70' },
  { name: 'Rectangle', footprint: '25 × 50', mark: '25x50', chip: '50×100' },
  { name: 'Hex', footprint: 'Ø32', mark: '32', chip: '60' },
]

for (const entry of SHAPES) {
  test(`starts a ${entry.name.toLowerCase()} base on a standard size`, async ({ page }) => {
    await pickChoice(page, 'Shape', entry.name)
    await settled(page)
    await expect(page.getByRole('radiogroup', { name: 'Shape' }).getByRole('radio', { name: entry.name, exact: true })).toBeChecked()
    // The size list swaps to that family's range.
    await expect(sizeOption(page, entry.chip)).toBeVisible()
    await expect(across(page)).toHaveText(entry.footprint)
    await expect(sizeLabel(page)).toHaveAttribute('placeholder', entry.mark)
  })
}

test('marks even a cramped rank base', async ({ page }) => {
  await pickChoice(page, 'Shape', 'Rectangle')
  await settled(page)
  await pickSize(page, '20×20')
  await settled(page)
  await expect(sizeLabel(page)).toHaveAttribute('placeholder', '20x20')

  // A 20mm well is mostly boss and ribs. The label used to be dropped silently
  // when it would not fit, so compare the triangle count against an unmarked base.
  const withMark = await triangles(page)
  await page.getByRole('switch', { name: 'Labels', exact: true }).click()
  await rebuilt(page, withMark)
  expect(withMark).toBeGreaterThan(await triangles(page))
})

test('embosses custom label text and keeps it across sizes', async ({ page }) => {
  const before = await triangles(page)
  await sizeLabel(page).fill('SQUAD 3')
  await rebuilt(page, before)
  await expect(footer(page)).toContainText('“SQUAD 3”')
  // The filename names the printed size, never the label.
  await expect(footer(page)).toContainText('base-round-32mm')

  await pickSize(page, '40')
  await expect(across(page)).toHaveText('Ø40')
  await expect(sizeLabel(page)).toHaveValue('SQUAD 3')
})

test('reports custom label text that does not fit', async ({ page }) => {
  await pickSize(page, '25')
  await settled(page)
  await sizeLabel(page).fill('W'.repeat(20))
  await expect(page.getByRole('alert')).toContainText('Label text does not fit')
  await expect(footer(page)).toContainText(/blocked/i)

  await sizeLabel(page).fill('')
  await expect(footer(page)).toContainText(/ready/i)
})

test('accepts only label characters the font can draw', async ({ page }) => {
  await sizeLabel(page).fill(`Ω squad ☠ ${'x'.repeat(30)}`)
  await expect(sizeLabel(page)).toHaveValue(` squad  ${'x'.repeat(12)}`)
})

test('still builds with the wall and floor wound to their limits', async ({ page }) => {
  // The dimension fields clamp to their limits, so no combination can reach an
  // unbuildable base. The geometry does throw outside those bounds, so this guards
  // the clamping rather than the geometry.
  const before = await triangles(page)
  for (const control of ['Wall thickness in mm', 'Top thickness in mm']) {
    // Well past the maximum: the field clamps, which is the behaviour being guarded.
    await page.getByLabel(control).fill('99')
    await page.getByLabel(control).blur()
  }
  await rebuilt(page, before)
  await expect(footer(page)).not.toContainText(/blocked/i)
})

test('caps the edge profile when the recess floor is thinned', async ({ page }) => {
  // Neither change alters the triangle count, so there is no rebuild to wait for.
  await setDimension(page, 'Top thickness in mm', '0.4')
  await expect(page.getByLabel('Top thickness in mm')).toHaveValue('0.4')
  await settled(page)

  await page.getByLabel('Edge size in mm').fill('3')
  await page.getByLabel('Edge size in mm').blur()
  await settled(page)
  await expect(page.getByLabel('Edge size in mm')).toHaveValue('1.7')
})

test('takes an exact typed dimension', async ({ page }) => {
  // The whole point of a typed field over a slider: 28.5 is reachable.
  const field = page.getByLabel('Diameter in mm', { exact: true })
  await field.fill('')
  await field.pressSequentially('28.5')
  await settled(page)
  await expect(across(page)).toHaveText('Ø28.5')
  await expect(field).toBeFocused()
  await expect(field).toHaveValue('28.5')
})

test('clamps a dimension typed past its limit', async ({ page }) => {
  await page.getByLabel('Diameter in mm', { exact: true }).fill('999')
  await page.getByLabel('Diameter in mm', { exact: true }).blur()
  await settled(page)
  await expect(page.getByLabel('Diameter in mm', { exact: true })).toHaveValue('180.0')
})

test('scrubs a dimension from the empty reset space after its label', async ({ page }) => {
  const field = page.getByLabel('Diameter in mm', { exact: true })
  const before = await triangles(page)
  const label = page.getByText('Diameter', { exact: true })
  const box = await label.boundingBox()
  if (!box) throw new Error('no label to drag')
  await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 75, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  await rebuilt(page, before)
  expect(Number(await field.inputValue())).toBeGreaterThan(32)
})

test('toggles a setting from the empty reset space after its label', async ({ page }) => {
  const toggle = page.getByRole('switch', { name: 'Labels', exact: true })
  const label = page.getByText('Labels', { exact: true })
  // Clicks by position, so the label has to be on screen first.
  await label.scrollIntoViewIfNeeded()
  const box = await label.boundingBox()
  if (!box) throw new Error('no label to click')
  await page.mouse.click(box.x + box.width - 5, box.y + box.height / 2)
  await expect(toggle).not.toBeChecked()
})

test('keeps every generator clear of the name on a tablet', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 })
  const nav = page.getByRole('navigation', { name: 'Generators' })
  const name = (await page.locator('header h1').boundingBox())!
  expect((await nav.boundingBox())!.y).toBeGreaterThanOrEqual(name.y + name.height)
  for (const link of await nav.getByRole('link').all()) {
    await expect(link).toBeInViewport({ ratio: 1 })
  }
})

test('never scrolls the page itself, only the panel', async ({ page }) => {
  for (const link of await page.getByRole('navigation', { name: 'Generators' }).getByRole('link').all()) {
    await link.click()
    await settled(page)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(await page.evaluate(() => window.innerHeight))
  }
})

test('fits a phone screen with every generator in reach', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
  for (const link of await page.getByRole('navigation', { name: 'Generators' }).getByRole('link').all()) {
    await expect(link).toBeInViewport({ ratio: 1 })
  }
  await expect(page.getByRole('button', { name: 'Download 3MF' })).toBeInViewport({ ratio: 1 })

  // A page with three colours keeps the header the height of one with a single colour.
  const header = async () => (await page.locator('header').boundingBox())?.height
  const single = await header()
  await visit(page, 'Counters')
  await page.getByRole('button', { name: 'Dial counter settings' }).click()
  await pickChoice(page, 'Digit filament', 'Third colour')
  await page.keyboard.press('Escape')
  expect(await header()).toBe(single)
})

test('moves the controls into a drawer on a phone', { tag: '@ci' }, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  // The docked panel is not rendered at all below `md`, so nothing is duplicated.
  await expect(page.getByLabel('Diameter in mm', { exact: true })).toBeHidden()

  await page.getByRole('button', { name: 'Base settings' }).click()
  await expect.poll(async () => (await page.locator('[data-slot="sheet-content"]').boundingBox())?.width).toBe(331.5)
  const before = await triangles(page)
  await setDimension(page, 'Diameter in mm', '60', { exact: true })
  await rebuilt(page, before)
  await expect(across(page)).toHaveText('Ø60')
})

test('keeps the crawler summary out of sight until the app replaces it', async ({ page }) => {
  await page.route('**/*.js', (route) => route.abort())
  await page.goto('/holders')

  await expect(page.getByRole('heading', { name: 'Gridfinity miniature holder generator' })).toBeHidden()
})

test('shows the crawler summary to a browser without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/holders')

  await expect(page.getByRole('heading', { name: 'Gridfinity miniature holder generator' })).toBeVisible()
  await context.close()
})

/** A browser that has never seen a tour, with the invite on this generator taken up. */
async function touring(browser: Browser, path: string, viewport = { width: 1280, height: 720 }) {
  const fresh = await browser.newPage({ viewport })
  await fresh.goto(path)
  await fresh.getByRole('button', { name: /quick tour/i }).click()
  return fresh
}

const tourTitle = (page: Page) => page.locator('.driver-popover-title')

test('invites a tour rather than starting one over the part', async ({ browser }) => {
  const fresh = await browser.newPage()
  await fresh.goto('/paint-racks')
  await expect(fresh.getByRole('button', { name: /quick tour/i })).toBeVisible()

  await expect(fresh.locator('.driver-popover')).toHaveCount(0)
  await fresh.close()
})

test('starts the tour from its invite', async ({ browser }) => {
  const fresh = await touring(browser, '/paint-racks')

  await expect(tourTitle(fresh)).toHaveText('Pieces')
  await fresh.close()
})

test('stops inviting tours for the rest of the visit after Not now', async ({ browser }) => {
  const fresh = await browser.newPage()
  await fresh.goto('/paint-racks')
  await fresh.getByRole('button', { name: 'Not now' }).click()
  await fresh.getByRole('link', { name: 'Tokens' }).click()
  await fresh.locator('[data-triangles]').waitFor()

  await expect(fresh.getByRole('button', { name: /quick tour/i })).toHaveCount(0)
  await fresh.close()
})

test('invites a tour again on the next visit after Not now', async ({ browser }) => {
  const fresh = await browser.newPage()
  await fresh.goto('/paint-racks')
  await fresh.getByRole('button', { name: 'Not now' }).click()
  await fresh.reload()

  await expect(fresh.getByRole('button', { name: /quick tour/i })).toBeVisible()
  await fresh.close()
})

test('starts a phone tour at the settings button', async ({ browser }) => {
  const fresh = await touring(browser, '/', { width: 390, height: 844 })

  await expect(tourTitle(fresh)).toHaveText('Settings')
  await fresh.close()
})

test('resumes a tour at the step it was closed on', async ({ browser }) => {
  const fresh = await touring(browser, '/paint-racks')
  await fresh.locator('.driver-popover-next-btn').click()
  await expect(tourTitle(fresh)).toHaveText('Cells')
  await fresh.keyboard.press('Escape')
  await fresh.getByRole('button', { name: 'Tour', exact: true }).click()

  await expect(tourTitle(fresh)).toHaveText('Cells')
  await fresh.close()
})

/** Clicks through the open tour and returns every step title it showed. */
async function finishTour(page: Page) {
  const titles: string[] = []
  const next = page.locator('.driver-popover-next-btn')
  await next.waitFor()
  while (await next.count()) {
    const title = (await tourTitle(page).textContent()) ?? ''
    titles.push(title)
    await next.click()
    // A step on the other side of the drawer waits for it to slide before the popover moves on.
    await expect.poll(async () => ((await tourTitle(page).count()) ? await tourTitle(page).textContent() : undefined)).not.toBe(title)
  }
  return titles
}

test('stops inviting once a tour has been started, even if closed early', async ({ browser }) => {
  const fresh = await touring(browser, '/paint-racks')
  await fresh.keyboard.press('Escape')

  await expect(fresh.getByRole('complementary', { name: 'Tour' })).toHaveCount(0)
  await fresh.close()
})

test('invites a returning visitor by the generator, not as a newcomer', async ({ browser }) => {
  const fresh = await touring(browser, '/paint-racks')
  await fresh.keyboard.press('Escape')
  await fresh.goto('/stems')

  await expect(fresh.getByRole('button', { name: 'Quick tour of the stems?' })).toBeVisible()
  await fresh.close()
})

test('walks a phone through the settings inside the drawer', async ({ browser }) => {
  const fresh = await touring(browser, '/', { width: 390, height: 844 })
  await fresh.locator('.driver-popover-next-btn').click()

  await expect(tourTitle(fresh)).toHaveText('Shape & Size')
  await fresh.close()
})

test('closes the drawer again once a phone tour leaves the settings', async ({ browser }) => {
  const fresh = await touring(browser, '/', { width: 390, height: 844 })
  const titles = await finishTour(fresh)

  expect(titles.slice(-3)).toEqual(['Preview', 'Colours', 'Download'])
  await fresh.close()
})

test('leaves advanced-only sections out of the tour', async ({ browser }) => {
  const fresh = await touring(browser, '/')

  expect(await finishTour(fresh)).not.toContain('Magnet Fit')
  await fresh.close()
})

test('starts a finished tour over', async ({ browser }) => {
  const fresh = await touring(browser, '/paint-racks')
  await finishTour(fresh)
  await fresh.getByRole('button', { name: 'Tour', exact: true }).click()

  await expect(tourTitle(fresh)).toHaveText('Pieces')
  await fresh.close()
})

test('shows the steps every page shares in one tour only', async ({ browser }) => {
  const fresh = await touring(browser, '/paint-racks')
  await finishTour(fresh)
  await fresh.goto('/stems')
  await fresh.getByRole('button', { name: /quick tour/i }).click()

  expect(await finishTour(fresh)).not.toContain('Preview')
  await fresh.close()
})

test('replays a finished tour from the panel footer', async ({ page }) => {
  await visit(page, 'Paint racks')
  await page.getByRole('button', { name: 'Tour', exact: true }).click()

  await expect(page.locator('.driver-popover-title')).toHaveText('Pieces')
})

test('closes the drawer before a phone tour starts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Base settings' }).click()
  await page.getByRole('button', { name: 'Tour', exact: true }).click()

  await expect(page.locator('.driver-popover-title')).toHaveText('Settings')
})

test('returns from a guide to its generator', async ({ page }) => {
  await page.goto('/guides/paint-racks')
  await page.getByRole('link', { name: 'Open the paint racks generator' }).first().click()

  await expect(page).toHaveURL(/\/paint-racks$/)
})

test.describe('explodes the parts that print apart', () => {
  for (const name of ['Spray tray', 'Counters']) {
    test(`on the ${name} page`, async ({ page }) => {
      await visit(page, name)
      const explode = page.getByRole('button', { name: 'Explode' })
      const cameraView = () => drawn(page).getAttribute('data-camera-view')
      const assembled = await cameraView()

      await explode.click()
      await expect(explode).toHaveAttribute('aria-pressed', 'true')
      await expect(across(page)).toBeHidden()
      await expect.poll(cameraView).not.toBe(assembled)

      await explode.click()
      await expect(across(page)).toBeVisible()
      await expect.poll(cameraView).toBe(assembled)
    })
  }

  test('offers no explode for a single part', async ({ page }) => {
    await visit(page, 'Tokens')

    await expect(page.getByRole('button', { name: 'Explode' })).toHaveCount(0)
  })
})
