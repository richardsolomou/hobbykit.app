import packageJson from '../../package.json' with { type: 'json' }
import { PAGES, type Page } from './pages.ts'

const ORIGIN = packageJson.homepage
const NAME = 'HobbyKit'
const DESCRIPTION = 'Generate exact, support-free miniature bases, holders, trays, paint racks, tokens, and counters as STL or 3MF.'

const url = (href: string) => `${ORIGIN}${href}`

/** The page's name in its file paths; the base generator lives at `/` but its files need a name. */
const slug = (page: Page) => (page.href === '/' ? 'bases' : page.href.slice(1))

/** Where `just social-cards` writes the page's 1200×630 preview, relative to `public`. */
export const socialCardPath = (page: Page) => `/og/${slug(page)}.png`

/** Where the page's Markdown is served; its source is the same name under `docs/generators`. */
export const markdownPath = (page: Page) => `/${slug(page)}.md`

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const tag = (name: string, attributes: Record<string, string>) =>
  `<${name} ${Object.entries(attributes)
    .map(([key, value]) => `${key}="${escape(value)}"`)
    .join(' ')} />`

function structuredData(page: Page) {
  const graph: object[] = [
    { '@type': 'WebSite', name: NAME, url: url('/'), description: DESCRIPTION },
    {
      '@type': 'WebApplication',
      name: NAME,
      url: url('/'),
      description: DESCRIPTION,
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript and WebAssembly',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://www.gnu.org/licenses/agpl-3.0.html',
      featureList: PAGES.map((entry) => entry.title),
    },
  ]
  if (page.href !== '/')
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: NAME, item: url('/') },
        { '@type': 'ListItem', position: 2, name: page.title, item: url(page.href) },
      ],
    })
  // `<` is escaped so no string in the graph can close the script element.
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')}</script>`
}

/** The generator list every page links to, so a crawler reaching any page finds the rest. */
const generatorList = () =>
  `<ul class="flex flex-col gap-1">${PAGES.map((entry) => `<li><a class="underline" href="${entry.href}">${escape(entry.title)}</a></li>`).join('')}</ul>`

const content = (heading: string, description: string) =>
  `<main data-summary class="mx-auto flex max-w-prose flex-col gap-4 p-8"><h1 class="text-2xl">${escape(heading)}</h1><p class="text-muted-foreground">${escape(description)}</p><nav aria-label="Generators">${generatorList()}</nav><p class="text-muted-foreground">Free and open source. Models are built in your browser and nothing is uploaded.</p></main>`

/**
 * A page of the built app with its own head and a readable summary inside `#root`.
 * React replaces the summary when it mounts. A browser hides it until then, so it does not flash before the app; readers that run no
 * JavaScript, crawlers included, still read it.
 */
export function pageHtml(template: string, page: Page) {
  const title = `${page.title} — ${NAME}`
  const head = [
    `<title>${escape(title)}</title>`,
    tag('meta', { name: 'description', content: page.description }),
    tag('link', { rel: 'canonical', href: url(page.href) }),
    tag('link', { rel: 'alternate', type: 'text/markdown', href: url(markdownPath(page)) }),
    tag('meta', { property: 'og:title', content: page.title }),
    tag('meta', { property: 'og:description', content: page.description }),
    tag('meta', { property: 'og:url', content: url(page.href) }),
    tag('meta', { property: 'og:type', content: 'website' }),
    tag('meta', { property: 'og:site_name', content: NAME }),
    tag('meta', { property: 'og:image', content: url(socialCardPath(page)) }),
    tag('meta', { property: 'og:image:type', content: 'image/png' }),
    tag('meta', { property: 'og:image:width', content: '1200' }),
    tag('meta', { property: 'og:image:height', content: '630' }),
    tag('meta', { property: 'og:image:alt', content: `${page.title} in ${NAME}, showing its default model` }),
    tag('meta', { name: 'twitter:card', content: 'summary_large_image' }),
    structuredData(page),
  ].join('\n    ')
  return template
    .replace('</head>', `  ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${content(page.title, page.description)}</div>`)
}

/** Served with a 404 status for any address that is not a page; the app still boots on it and opens the base generator. */
export const notFoundHtml = (template: string) =>
  template
    .replace('</head>', `  <title>Page not found — ${NAME}</title>\n    ${tag('meta', { name: 'robots', content: 'noindex' })}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${content('Page not found', DESCRIPTION)}</div>`)

/** A generator's guide from `docs/generators`, with a link back to the generator under its heading. */
export const pageMarkdown = (page: Page, source: string) =>
  source.replace(/^# .*\n/, (heading) => `${heading}\nOpen the generator at ${url(page.href)}.\n`)

export const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n`

export const sitemapXml = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map((page) => `  <url><loc>${url(page.href)}</loc></url>`).join('\n')}\n</urlset>\n`

/** The site described for language models, following https://llmstxt.org. */
export const llmsTxt = () => `# ${NAME}

> ${DESCRIPTION}

${NAME} is a free, open-source web app for tabletop wargaming and miniature painting hobbyists who 3D print. Pick a standard footprint or enter an exact one, choose the magnets you have, and download a model ready for the slicer. Every part is modelled in the orientation it prints in, so none needs supports. Everything runs in the browser: there is no account, no backend, and nothing is uploaded.

## Generators

${PAGES.map((page) => `- [${page.title}](${url(markdownPath(page))}): ${page.description}`).join('\n')}

## Common questions

- Is ${NAME} free, and does it need an account? Every generator is free and needs no account. Settings are saved in the browser.
- Which file formats does it export? STL and 3MF. Multi-part downloads arrive as one ZIP of STLs or one 3MF with each part on its own build plate.
- Which base sizes are supported? Presets cover common Games Workshop, The Old World, Kings of War, and historical sizes, and custom round, oval, pill, rectangle, and polygon footprints from 15 to 180mm work too. A base's exact size is embossed inside it, so a 28.5mm base reads 28.5.
- Which magnets does it fit? Set the diameter and thickness of the round magnets you have. Magnet pockets sit flush with the face that meets a magnetised tray, and bases, holders, and spray trays share the same magnet settings.
- Can I make several base sizes at once? Add sizes to the batch and download them together: one STL per size in a ZIP, or one 3MF with every copy laid out across build plates.
- How do I share a design? Copy link puts the generator's settings after the \`#\` in the address, which browsers never send to a server.

## Source

- [GitHub repository](${packageJson.repository.url.replace(/\.git$/, '')}): AGPL-3.0 licensed source and issue tracker.
`
