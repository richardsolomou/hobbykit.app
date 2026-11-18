import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AdvancedProvider, storedAdvanced } from './lib/advanced'
import { PostHogIntegration } from './client/posthog'
import { initPostHog } from './client/startPostHog'
import { generatorForPath } from './lib/pages'
import { takeShareHash } from './lib/shareLink'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

// Taken before analytics starts, so a shared setup never reaches a captured URL.
const sharedLink = takeShareHash()
initPostHog({ generator: generatorForPath(window.location.pathname), advanced_settings_shown: storedAdvanced() })

createRoot(root).render(
  <PostHogIntegration>
    <AdvancedProvider>
      <App sharedLink={sharedLink} />
    </AdvancedProvider>
  </PostHogIntegration>,
)
