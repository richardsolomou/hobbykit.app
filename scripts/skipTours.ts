import type { Page } from '@playwright/test'
import { PAGES } from '../src/lib/pages.ts'
import { TOUR_DONE, TOUR_KEY } from '../src/lib/tour.ts'

/** Marks every tour as run, so none opens over the part a script photographs. */
export const skipTours = (tab: Page) =>
  tab.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [TOUR_KEY, JSON.stringify({ reached: Object.fromEntries(PAGES.map((page) => [page.value, TOUR_DONE])) })],
  )
