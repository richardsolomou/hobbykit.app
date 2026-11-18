import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { guidePath, PAGES } from './pages'
import {
  guidePageHtml,
  guidesHtml,
  llmsFullTxt,
  llmsTxt,
  markdownPath,
  notFoundHtml,
  pageHtml,
  pageMarkdown,
  robotsTxt,
  sitemapXml,
  socialCardPath,
} from './seo'

const TEMPLATE = '<html><head></head><body><div id="root"></div></body></html>'
const holders = PAGES.find((page) => page.href === '/holders')!
const GUIDE = '# Heading\n\nSlots sized to **their bases**.\n\n## Magnets\n\nPockets.\n'

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

  it('describes the page itself in its structured data', () => {
    expect(structuredData(pageHtml(TEMPLATE, holders))['@graph']).toContainEqual(
      expect.objectContaining({ '@type': 'WebPage', url: 'https://hobbykit.app/holders', name: holders.title }),
    )
  })

  it('links the generator to its guide', () => {
    expect(pageHtml(TEMPLATE, holders)).toContain('href="/guides/holders"')
  })

  it('gives the home page no breadcrumbs', () => {
    expect(structuredData(pageHtml(TEMPLATE, PAGES[0]))['@graph'].map((node) => node['@type'])).not.toContain('BreadcrumbList')
  })
})

describe('guidePageHtml', () => {
  const APP = '<html><head><script type="module" crossorigin src="/assets/app.js"></script></head><body><div id="root"></div></body></html>'

  it('titles the guide after its generator', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).toContain('<title>Gridfinity miniature holder generator guide — HobbyKit</title>')
  })

  it('points the canonical link at the guide', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).toContain('<link rel="canonical" href="https://hobbykit.app/guides/holders" />')
  })

  it('renders the guide as visible content', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).toContain('<h2>Magnets</h2>')
  })

  it('leaves out the guide heading, which the page gives as its own', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).not.toContain('Heading')
  })

  it('does not start the app over the guide', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).not.toContain('<script type="module"')
  })

  it('links the guide to its generator', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).toContain('href="/holders"')
  })

  it('places the guide under the guides page in its breadcrumbs', () => {
    expect(guidePageHtml(APP, holders, GUIDE)).toContain('"item":"https://hobbykit.app/guides"')
  })
})

describe('guidesHtml', () => {
  it('links every guide', () => {
    expect(PAGES.filter((page) => !guidesHtml(TEMPLATE).includes(`href="${guidePath(page)}"`))).toEqual([])
  })

  it('answers common questions', () => {
    expect(guidesHtml(TEMPLATE)).toContain('<h2>Common questions</h2>')
  })

  it('marks the questions up as an FAQ', () => {
    expect(structuredData(guidesHtml(TEMPLATE))['@graph'].map((node) => node['@type'])).toContain('FAQPage')
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

  it('lists every generator page, every guide and the guides page in the sitemap', () => {
    expect(sitemapXml().match(/<loc>/g)).toHaveLength(PAGES.length * 2 + 1)
  })

  it('links llms-full.txt from llms.txt', () => {
    expect(llmsTxt()).toContain('(https://hobbykit.app/llms-full.txt)')
  })

  it('puts every generator guide in llms-full.txt', () => {
    const full = llmsFullTxt(new Map(PAGES.map((page) => [page, `# ${page.title}\n`])))
    expect(PAGES.filter((page) => !full.includes(`## ${page.title}\n`))).toEqual([])
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
      "Open the generator at https://hobbykit.app/holders. A smaller version runs in MakerWorld's customizer at https://makerworld.com/en/models/3545623-gridfinity-miniature-holder.",
    ])
  })

  it('has a preview image for every page', () => {
    expect(PAGES.filter((page) => !existsSync(`public${socialCardPath(page)}`)).map((page) => page.title)).toEqual([])
  })
})
