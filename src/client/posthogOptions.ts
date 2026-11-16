import type { PostHogConfig } from 'posthog-js'
import packageJson from '../../package.json' with { type: 'json' }
import { serviceName, type PostHogEnvironment } from '../contracts/posthog'

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
    // Password reset and invitation links carry their secret in `token`.
    custom_personal_data_properties: ['token'],
    session_recording: { maskAllInputs: true },
    // Only this origin's requests carry the person and session headers, so no third party learns them.
    tracing_headers: [hostname],
    logs: service,
    metrics: service,
  }
}
