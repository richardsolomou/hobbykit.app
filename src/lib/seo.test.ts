import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PAGES } from './pages'
import { llmsTxt, markdownPath, notFoundHtml, pageHtml, pageMarkdown, robotsTxt, sitemapXml, socialCardPath } from './seo'

const TEMPLATE = '<html><head></head><body><div id="root"></div></body></html>'
const holders = PAGES.find((page) => page.href === '/holders')!

const structuredData = (html: string) =>
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]) as { '@graph': { '@type': string }[] }

describe('pageHtml', () => {
  it('titles the page after its generator', () => {
    expect(pageHtml(TEMPLATE, holders)).toContain('<title>Gridfinity miniature holder generator — HobbyKit</title>')
  })

  it('points the canonical link at the page itself', () => {
    expect(pageHtml(TEMPLATE, holders)).toContain('<link rel="canonical" href="https://hobbykit.app/holders" />')
  })

  it('describes the page in its meta description', () => {
    expect(pageHtml(TEMPLATE, holders)).toContain(`<meta name="description" content="${holders.description}" />`)
  })

  it('links the page to its Markdown version', () => {
    expect(pageHtml(TEMPLATE, holders)).toContain('<link rel="alternate" type="text/markdown" href="https://hobbykit.app/holders.md" />')
  })

  it('shows the page its own preview image', () => {
    expect(pageHtml(TEMPLATE, holders)).toContain('<meta property="og:image" content="https://hobbykit.app/og/holders.png" />')
  })

  it('puts a readable heading inside the root for readers that run no JavaScript', () => {
    expect(pageHtml(TEMPLATE, holders)).toMatch(/<div id="root"><main[^>]*><h1[^>]*>Gridfinity miniature holder generator<\/h1>/)
  })

  it('marks the summary so a browser running the app hides it until React replaces it', () => {
    expect(pageHtml(TEMPLATE, holders)).toMatch(/<div id="root"><main data-summary /)
  })

  it('links every generator from every page', () => {
    const html = pageHtml(TEMPLATE, holders)
    expect(PAGES.filter((page) => !html.includes(`href="${page.href}"`))).toEqual([])
  })

  it('describes the app as free structured data', () => {
    expect(structuredData(pageHtml(TEMPLATE, holders))['@graph']).toContainEqual(
      expect.objectContaining({ '@type': 'WebApplication', isAccessibleForFree: true }),
    )
  })

  it('places a generator page under the site in its breadcrumbs', () => {
    expect(structuredData(pageHtml(TEMPLATE, holders))['@graph'].map((node) => node['@type'])).toContain('BreadcrumbList')
  })

  it('gives the home page no breadcrumbs', () => {
    expect(structuredData(pageHtml(TEMPLATE, PAGES[0]))['@graph'].map((node) => node['@type'])).not.toContain('BreadcrumbList')
  })
})

describe('notFoundHtml', () => {
  it('keeps the page out of search results', () => {
    expect(notFoundHtml(TEMPLATE)).toContain('<meta name="robots" content="noindex" />')
  })
})

describe('crawler files', () => {
  it('points robots.txt at the sitemap', () => {
    expect(robotsTxt()).toContain('Sitemap: https://hobbykit.app/sitemap.xml')
  })

  it('lists every generator page in the sitemap', () => {
    expect(sitemapXml().match(/<loc>/g)).toHaveLength(PAGES.length)
  })

  it('links every generator guide from llms.txt', () => {
    expect(PAGES.filter((page) => !llmsTxt().includes(`(https://hobbykit.app${markdownPath(page)})`))).toEqual([])
  })
})

describe('generator guides', () => {
  const guide = (page: (typeof PAGES)[number]) => readFileSync(`docs/generators${markdownPath(page)}`, 'utf8')

  it('titles every guide after its page', () => {
    expect(PAGES.filter((page) => !guide(page).startsWith(`# ${page.title}\n`)).map((page) => page.title)).toEqual([])
  })

  it('links the guide back to its generator under the heading', () => {
    expect(pageMarkdown(holders, guide(holders)).split('\n').slice(0, 3)).toEqual([
      '# Gridfinity miniature holder generator',
      '',
      'Open the generator at https://hobbykit.app/holders.',
    ])
  })

  it('has a preview image for every page', () => {
    expect(PAGES.filter((page) => !existsSync(`public${socialCardPath(page)}`)).map((page) => page.title)).toEqual([])
  })
})
