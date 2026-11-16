import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'
import { posthog, type PostHogConfig } from 'posthog-js'
import type { ReactNode } from 'react'
import packageJson from '../../package.json' with { type: 'json' }
import { bundledPostHog, serviceName, type PostHogEnvironment } from '../contracts/posthog'

/** Browser SDK options; `defaults` pins the SDK's behavior to a dated snapshot, so raise it only after reading what changed. */
export function postHogOptions(environment: PostHogEnvironment, hostname: string, mode = import.meta.env.MODE): Partial<PostHogConfig> {
  const service = { serviceName, serviceVersion: packageJson.version, environment: mode }
  return {
    // A static site has no server route to proxy through, so the browser sends straight to PostHog.
    api_host: environment.host,
    ui_host: environment.uiHost,
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    capture_exceptions: true,
    capture_performance: true,
    mask_personal_data_properties: true,
    custom_personal_data_properties: ['token'],
    session_recording: { maskAllInputs: true },
    // Only this origin's requests carry the person and session headers, so no third party learns them.
    tracing_headers: [hostname],
    logs: service,
    metrics: service,
  }
}

/** Starts PostHog when the build has a project; call it before rendering, once anything that must not reach a captured URL is gone. */
export function initPostHog() {
  if (bundledPostHog && !posthog.__loaded)
    posthog.init(bundledPostHog.projectToken, postHogOptions(bundledPostHog, window.location.hostname))
}

/** Gives components `usePostHog()` and captures render errors. Renders its children alone when PostHog is off. */
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
