import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AdvancedProvider } from './lib/advanced'
import { initPostHog, PostHogIntegration } from './client/posthog'
import { takeShareHash } from './lib/shareLink'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')

// Taken before analytics starts, so a shared setup never reaches a captured URL.
const sharedSetup = takeShareHash()
initPostHog()

createRoot(root).render(
  <PostHogIntegration>
    <AdvancedProvider>
      <App sharedSetup={sharedSetup} />
    </AdvancedProvider>
  </PostHogIntegration>,
)
