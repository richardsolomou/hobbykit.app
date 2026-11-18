import { initPostHog } from './client/startPostHog'
import { guidePath, PAGES } from './lib/pages'

// A guide page runs no app, only this, so visits from search and clicks through to a generator are still counted.
initPostHog({ generator: PAGES.find((page) => guidePath(page) === window.location.pathname)?.value ?? null })
