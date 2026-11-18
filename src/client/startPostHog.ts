import { posthog, type Properties } from 'posthog-js'
import { bundledPostHog } from '../contracts/posthog'
import { postHogOptions } from './posthogOptions'

/**
 * Starts PostHog when the build has a project; call it before rendering, once anything that must not reach a captured URL
 * is gone. `properties` are registered in `loaded`, which runs before the first pageview, so that pageview carries them too.
 */
export function initPostHog(properties: Properties = {}) {
  if (bundledPostHog && !posthog.__loaded) {
    posthog.init(bundledPostHog.projectToken, {
      ...postHogOptions(bundledPostHog, window.location.hostname),
      loaded: (client) => client.register(properties),
    })
  }
}
