import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { postHogSourceMaps } from './scripts/posthogSourceMaps.ts'
import { PAGES } from './src/lib/pages.ts'
import { llmsTxt, markdownPath, notFoundHtml, pageHtml, pageMarkdown, robotsTxt, sitemapXml } from './src/lib/seo.ts'

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
    generateBundle() {
      const files = {
        ...Object.fromEntries(PAGES.slice(1).map((page) => [`${page.href.slice(1)}.html`, pageHtml(template, page)])),
        ...Object.fromEntries(
          PAGES.map((page) => [
            markdownPath(page).slice(1),
            pageMarkdown(page, readFileSync(`docs/generators${markdownPath(page)}`, 'utf8')),
          ]),
        ),
        '404.html': notFoundHtml(template),
        'robots.txt': robotsTxt(),
        'sitemap.xml': sitemapXml(),
        'llms.txt': llmsTxt(),
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
    ...(sourceMaps ? { worker: { plugins: () => [sourceMaps.worker()] } } : {}),
  }
})
