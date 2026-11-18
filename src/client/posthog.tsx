import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'
import { posthog } from 'posthog-js'
import type { ReactNode } from 'react'
import { bundledPostHog } from '../contracts/posthog'

/**
 * Gives components `usePostHog()` and the feature flag hooks, and captures render errors from routes without their own
 * `errorComponent`. Renders its children alone when PostHog is off.
 */
export function PostHogIntegration({ children }: { children: ReactNode }) {
  if (!bundledPostHog) return children
  return (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary
        fallback={<main className="mx-auto max-w-2xl px-6 py-16">Something went wrong. Reload the page to try again.</main>}
      >
        {children}
      </PostHogErrorBoundary>
    </PostHogProvider>
  )
}
