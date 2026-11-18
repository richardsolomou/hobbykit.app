import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { postHogSourceMaps } from './scripts/posthogSourceMaps.ts'
import { guidePath, PAGES } from './src/lib/pages.ts'
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
} from './src/lib/seo.ts'

const guide = (page: (typeof PAGES)[number]) => readFileSync(`docs/generators${markdownPath(page)}`, 'utf8')

/** Prerenders every generator page's head and summary, and writes the files crawlers read. */
function seo(): Plugin {
  let template = ''
  return {
    name: 'hobbykit:seo',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, { originalUrl }) {
        template = html
        const path = new URL(originalUrl ?? '/', 'http://localhost').pathname
        return pageHtml(html, PAGES.find((page) => page.href === path) ?? PAGES[0])
      },
    },
    generateBundle(_options, bundle) {
      const guides = new Map(PAGES.map((page) => [page, guide(page)]))
      const guideEntry = Object.values(bundle).find((chunk) => chunk.type === 'chunk' && chunk.isEntry && chunk.name === 'guide')!
      /** Guide pages carry no app; they load the guide entry so PostHog still counts them. */
      const withAnalytics = (html: string) =>
        html.replace('</head>', `  <script type="module" crossorigin src="/${guideEntry.fileName}"></script>\n  </head>`)
      const files = {
        ...Object.fromEntries(PAGES.slice(1).map((page) => [`${page.href.slice(1)}.html`, pageHtml(template, page)])),
        ...Object.fromEntries(
          PAGES.map((page) => [`${guidePath(page).slice(1)}.html`, withAnalytics(guidePageHtml(template, page, guides.get(page)!))]),
        ),
        'guides.html': withAnalytics(guidesHtml(template)),
        ...Object.fromEntries(PAGES.map((page) => [markdownPath(page).slice(1), pageMarkdown(page, guides.get(page)!)])),
        '404.html': notFoundHtml(template),
        'robots.txt': robotsTxt(),
        'sitemap.xml': sitemapXml(),
        'llms.txt': llmsTxt(),
        'llms-full.txt': llmsFullTxt(guides),
      }
      for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source })
    },
  }
}

export default defineConfig(({ mode }) => {
  const sourceMaps = postHogSourceMaps({ ...loadEnv(mode, process.cwd(), ''), ...process.env })
  return {
    assetsInclude: ['**/*.woff'],
    resolve: { tsconfigPaths: true },
    plugins: [viteReact(), tailwindcss(), sourceMaps?.client, seo()],
    build: { rolldownOptions: { input: { index: 'index.html', guide: 'src/guide.ts' } } },
    ...(sourceMaps ? { worker: { plugins: () => [sourceMaps.worker()] } } : {}),
  }
})
