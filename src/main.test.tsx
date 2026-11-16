import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'

const { calls, init, render } = vi.hoisted(() => ({ calls: [] as string[], init: vi.fn(), render: vi.fn() }))
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render }) }))
vi.mock('./App', () => ({ App: () => 'application' }))
vi.mock('./lib/shareLink', () => ({ takeShareHash: () => calls.push('takeShareHash') }))
vi.mock('@posthog/react', () => ({
  PostHogProvider: ({ children }: { children: ReactNode }) => children,
  PostHogErrorBoundary: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('posthog-js', () => ({
  posthog: {
    init: (...args: unknown[]) => {
      calls.push('init')
      init(...args)
    },
  },
}))

afterEach(() => {
  calls.length = 0
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.resetModules()
})

async function start(token: string) {
  vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', token)
  vi.stubEnv('VITE_POSTHOG_HOST', token ? 'https://eu.i.posthog.com' : '')
  vi.stubGlobal('document', { getElementById: () => ({}) })
  vi.stubGlobal('window', { location: { hostname: 'hobbykit.app' } })
  await import('./main')
}

it('starts PostHog with the configured project', async () => {
  await start('phc_test')
  expect(init).toHaveBeenCalledWith('phc_test', expect.objectContaining({ api_host: 'https://eu.i.posthog.com' }))
})

it('takes the shared setup out of the URL before PostHog starts', async () => {
  await start('phc_test')
  expect(calls).toEqual(['takeShareHash', 'init'])
})

it('keeps the application usable without a telemetry token', async () => {
  await start('')
  expect(renderToStaticMarkup(render.mock.lastCall?.[0])).toBe('application')
})

it('leaves PostHog off without a telemetry token', async () => {
  await start('')
  expect(init).not.toHaveBeenCalled()
})
