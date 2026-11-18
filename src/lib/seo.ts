import { marked } from 'marked'
import packageJson from '../../package.json' with { type: 'json' }
import { GUIDES_PATH, guidePath, PAGES, slug, type Page } from './pages.ts'

const ORIGIN = packageJson.homepage
const NAME = 'HobbyKit'
const DESCRIPTION = 'Generate exact, support-free miniature bases, holders, trays, paint racks, tokens, and counters as STL or 3MF.'

const url = (href: string) => `${ORIGIN}${href}`

/** Where `just social-cards` writes the page's 1200×630 preview, relative to `public`. */
export const socialCardPath = (page: Page) => `/og/${slug(page)}.png`

/** Where the page's Markdown is served; its source is the same name under `docs/generators`. */
export const markdownPath = (page: Page) => `/${slug(page)}.md`

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const tag = (name: string, attributes: Record<string, string>) =>
  `<${name} ${Object.entries(attributes)
    .map(([key, value]) => `${key}="${escape(value)}"`)
    .join(' ')} />`

/** Answered on the guides page, in its structured data, and in llms.txt, so all three say the same. */
const QUESTIONS: [question: string, answer: string][] = [
  [`Is ${NAME} free, and does it need an account?`, 'Every generator is free and needs no account. Settings are saved in the browser.'],
  [
    'Which file formats does it export?',
    'STL and 3MF. Multi-part downloads arrive as one ZIP of STLs or one 3MF with each part on its own build plate.',
  ],
  [
    'Which base sizes are supported?',
    "Presets cover common Games Workshop, The Old World, Kings of War, and historical sizes, and custom round, oval, pill, rectangle, and polygon footprints from 15 to 180mm work too. A base's exact size is embossed inside it, so a 28.5mm base reads 28.5.",
  ],
  [
    'Which magnets does it fit?',
    'Set the diameter and thickness of the round magnets you have. Magnet pockets sit flush with the face that meets a magnetised tray, and bases, holders, and spray trays share the same magnet settings.',
  ],
  [
    'Can I make several base sizes at once?',
    'Add sizes to the batch and download them together: one STL per size in a ZIP, or one 3MF with every copy laid out across build plates.',
  ],
  [
    'Do the parts need supports?',
    'No. Every part is modelled in the orientation it prints in, so every overhang stays printable without supports.',
  ],
  [
    'Is there a version on MakerWorld?',
    'Each generator has a MakerWorld listing whose Customize button runs an OpenSCAD port of it, with fewer options; its guide links the listing.',
  ],
  [
    'How do I share a design?',
    "Copy link puts the generator's settings after the # in the address, which browsers never send to a server.",
  ],
]

const GUIDES_TITLE = `${NAME} guides`
const GUIDES_DESCRIPTION = `How to use every ${NAME} generator, and answers to common questions about sizes, magnets, supports and file formats.`

const WEBSITE = { '@type': 'WebSite', '@id': url('/#website'), name: NAME, url: url('/'), description: DESCRIPTION, inLanguage: 'en' }

const webPage = (path: string, name: string, description: string, image: string) => ({
  '@type': 'WebPage',
  '@id': url(path),
  url: url(path),
  name,
  description,
  isPartOf: { '@id': WEBSITE['@id'] },
  primaryImageOfPage: url(image),
  inLanguage: 'en',
})

const breadcrumbs = (...trail: [name: string, path: string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [[NAME, '/'], ...trail].map(([name, path], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: url(path),
  })),
})

const faq = () => ({
  '@type': 'FAQPage',
  mainEntity: QUESTIONS.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
})

// `<` is escaped so no string in the graph can close the script element.
const structuredData = (graph: object[]) =>
  `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')}</script>`

interface Head {
  title: string
  description: string
  path: string
  image: string
  imageAlt: string
  type: 'website' | 'article'
  graph: object[]
  markdown?: string
}

const head = ({ title, description, path, image, imageAlt, type, graph, markdown }: Head) =>
  [
    `<title>${escape(`${title} — ${NAME}`)}</title>`,
    tag('meta', { name: 'description', content: description }),
    tag('link', { rel: 'canonical', href: url(path) }),
    ...(markdown ? [tag('link', { rel: 'alternate', type: 'text/markdown', href: url(markdown) })] : []),
    tag('meta', { property: 'og:title', content: title }),
    tag('meta', { property: 'og:description', content: description }),
    tag('meta', { property: 'og:url', content: url(path) }),
    tag('meta', { property: 'og:type', content: type }),
    tag('meta', { property: 'og:site_name', content: NAME }),
    tag('meta', { property: 'og:image', content: url(image) }),
    tag('meta', { property: 'og:image:type', content: 'image/png' }),
    tag('meta', { property: 'og:image:width', content: '1200' }),
    tag('meta', { property: 'og:image:height', content: '630' }),
    tag('meta', { property: 'og:image:alt', content: imageAlt }),
    tag('meta', { name: 'twitter:card', content: 'summary_large_image' }),
    structuredData(graph),
  ].join('\n    ')

/** The generator list every page links to, so a crawler reaching any page finds the rest. */
const linkList = (links: [href: string, label: string][]) =>
  `<ul class="flex flex-col gap-1">${links.map(([href, label]) => `<li><a class="underline" href="${href}">${escape(label)}</a></li>`).join('')}</ul>`

const generatorList = () => linkList(PAGES.map((entry) => [entry.href, entry.title]))

const summary = (heading: string, body: string) =>
  `<main data-summary class="mx-auto flex max-w-prose flex-col gap-4 p-8"><h1 class="text-2xl">${escape(heading)}</h1>${body}<nav aria-label="Generators">${generatorList()}</nav><p class="text-muted-foreground">Free and open source. Models are built in your browser and nothing is uploaded.</p></main>`

/**
 * A page of the built app with its own head and a readable summary inside `#root`, linking its guide.
 * React replaces the summary when it mounts. A browser hides it until then, so it does not flash before the app; readers that run no
 * JavaScript, crawlers included, still read it.
 */
export function pageHtml(template: string, page: Page) {
  const graph = [
    WEBSITE,
    webPage(page.href, page.title, page.description, socialCardPath(page)),
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
    ...(page.href === '/' ? [] : [breadcrumbs([page.title, page.href])]),
  ]
  const tags = head({
    title: page.title,
    description: page.description,
    path: page.href,
    image: socialCardPath(page),
    imageAlt: `${page.title} in ${NAME}, showing its default model`,
    type: 'website',
    graph,
    markdown: markdownPath(page),
  })
  return template
    .replace('</head>', `  ${tags}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root">${summary(page.title, `<p class="text-muted-foreground">${escape(page.description)}</p><p><a class="underline" href="${guidePath(page)}">Read the guide</a></p>`)}</div>`,
    )
}

/** Served with a 404 status for any address that is not a page; the app still boots on it and opens the base generator. */
export const notFoundHtml = (template: string) =>
  template
    .replace('</head>', `  <title>Page not found — ${NAME}</title>\n    ${tag('meta', { name: 'robots', content: 'noindex' })}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root">${summary('Page not found', `<p class="text-muted-foreground">${escape(DESCRIPTION)}</p>`)}</div>`,
    )

/** The built app's page without the app: its stylesheet stays, its script and the rules hiding the summary go. */
const withoutApp = (template: string) =>
  template
    .replaceAll(/\s*<script type="module"[^>]*><\/script>/g, '')
    .replaceAll(/\s*<link rel="modulepreload"[^>]*>/g, '')
    .replace(/\s*<!-- The prerendered summary[\s\S]*?<\/noscript\s*>/, '')

const document = (template: string, tags: string, body: string) =>
  withoutApp(template)
    .replace('</head>', `  ${tags}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<header class="border-b border-border"><nav aria-label="Site" class="mx-auto flex max-w-prose items-center justify-between gap-4 px-5 py-3"><a href="/" class="text-sm font-medium tracking-[0.18em] uppercase">Hobby<span class="text-measure">Kit</span></a><a href="${GUIDES_PATH}" class="note hover:text-foreground">Guides</a></nav></header><main class="mx-auto flex max-w-prose flex-col gap-4 px-5 py-8 leading-relaxed [&_a]:underline [&_code]:font-sans [&_code]:font-medium [&_code]:text-measure [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-medium [&_h3]:mt-2 [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-5">${body}</main>`,
    )

const openButton = (page: Page) =>
  `<p><a href="${page.href}" class="inline-flex! items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground no-underline!">Open the ${escape(page.label.toLowerCase())} generator</a></p>`

/** A generator's guide from `docs/generators` as a page of its own, which people and crawlers read alike. */
export function guidePageHtml(template: string, page: Page, guide: string) {
  const title = `${page.title} guide`
  const tags = head({
    title,
    description: page.description,
    path: guidePath(page),
    image: socialCardPath(page),
    imageAlt: `${page.title} in ${NAME}, showing its default model`,
    type: 'article',
    graph: [
      WEBSITE,
      webPage(guidePath(page), title, page.description, socialCardPath(page)),
      breadcrumbs(['Guides', GUIDES_PATH], [title, guidePath(page)]),
    ],
    markdown: markdownPath(page),
  })
  const others = PAGES.filter((entry) => entry !== page).map((entry): [string, string] => [guidePath(entry), `${entry.title} guide`])
  return document(
    template,
    tags,
    `<p class="note">Guide</p><h1 class="text-3xl font-medium">${escape(page.title)}</h1>${openButton(page)}${marked.parse(guide.replace(/^# .*\n/, ''), { async: false })}${openButton(page)}<h2>More guides</h2><nav aria-label="Guides">${linkList(others)}</nav>`,
  )
}

/** Every guide, and the common questions with their FAQ structured data. */
export function guidesHtml(template: string) {
  const tags = head({
    title: GUIDES_TITLE,
    description: GUIDES_DESCRIPTION,
    path: GUIDES_PATH,
    image: socialCardPath(PAGES[0]),
    imageAlt: `${PAGES[0].title} in ${NAME}, showing its default model`,
    type: 'website',
    graph: [
      WEBSITE,
      webPage(GUIDES_PATH, GUIDES_TITLE, GUIDES_DESCRIPTION, socialCardPath(PAGES[0])),
      breadcrumbs(['Guides', GUIDES_PATH]),
      faq(),
    ],
  })
  const guides = PAGES.map(
    (page) =>
      `<li><a href="${guidePath(page)}">${escape(page.title)}</a><p class="text-muted-foreground">${escape(page.description)}</p></li>`,
  ).join('')
  return document(
    template,
    tags,
    `<h1 class="text-3xl font-medium">${escape(GUIDES_TITLE)}</h1><p class="text-muted-foreground">${escape(GUIDES_DESCRIPTION)}</p><ul class="flex flex-col gap-3">${guides}</ul><h2>Common questions</h2>${QUESTIONS.map(([question, answer]) => `<h3>${escape(question)}</h3><p>${escape(answer)}</p>`).join('')}`,
  )
}

/** A generator's guide from `docs/generators`, with links to the generator and its MakerWorld listing under its heading. */
export const pageMarkdown = (page: Page, source: string) =>
  source.replace(
    /^# .*\n/,
    (heading) =>
      `${heading}\nOpen the generator at ${url(page.href)}. A smaller version runs in MakerWorld's customizer at ${page.makerworld}.\n`,
  )

export const robotsTxt = () => `User-agent: *\nAllow: /\n\nSitemap: ${url('/sitemap.xml')}\n`

export const sitemapXml = () =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...PAGES.map((page) => page.href), GUIDES_PATH, ...PAGES.map(guidePath)].map((path) => `  <url><loc>${url(path)}</loc></url>`).join('\n')}\n</urlset>\n`

/** The site described for language models, following https://llmstxt.org. */
export const llmsTxt = () => `# ${NAME}

> ${DESCRIPTION}

${NAME} is a free, open-source web app for tabletop wargaming and miniature painting hobbyists who 3D print. Pick a standard footprint or enter an exact one, choose the magnets you have, and download a model ready for the slicer. Every part is modelled in the orientation it prints in, so none needs supports. Everything runs in the browser: there is no account, no backend, and nothing is uploaded.

## Generators

${PAGES.map((page) => `- [${page.title}](${url(markdownPath(page))}): ${page.description}`).join('\n')}

Every guide in one file: [llms-full.txt](${url('/llms-full.txt')}).

## Common questions

${QUESTIONS.map(([question, answer]) => `- ${question} ${answer}`).join('\n')}

## Source

- [GitHub repository](${packageJson.repository.url.replace(/\.git$/, '')}): AGPL-3.0 licensed source and issue tracker.
`

/** Every generator's guide in one file, for a language model that reads one address rather than following links. */
export const llmsFullTxt = (guides: Map<Page, string>) =>
  `# ${NAME}\n\n> ${DESCRIPTION}\n\n${PAGES.map((page) => pageMarkdown(page, guides.get(page)!).replaceAll(/^#/gm, '##')).join('\n')}`
