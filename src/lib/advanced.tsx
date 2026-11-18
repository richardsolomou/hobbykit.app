import { posthog } from 'posthog-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const ADVANCED_KEY = 'hobbykit.advanced'

interface Advanced {
  /** Whether settings marked advanced show while they are at their defaults. */
  shown: boolean
  setShown: (shown: boolean) => void
}

const AdvancedContext = createContext<Advanced>({ shown: true, setShown: () => undefined })

/** Whether advanced settings show in this browser, read before the app renders so the first pageview can say so. */
export function storedAdvanced(): boolean {
  try {
    return window.localStorage.getItem(ADVANCED_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Whether advanced settings show, remembered per browser rather than saved with a design, since it is how someone
 * likes the panel and not part of what they make.
 */
export function AdvancedProvider({ children }: { children: ReactNode }) {
  const [shown, setShownState] = useState(storedAdvanced)
  // Every event says whether advanced settings were showing, so their use can be split from everyone else's.
  useEffect(() => posthog.register({ advanced_settings_shown: shown }), [shown])
  const value = useMemo(
    () => ({
      shown,
      setShown: (next: boolean) => {
        setShownState(next)
        posthog.capture('advanced_settings_toggled', { shown: next })
        try {
          window.localStorage.setItem(ADVANCED_KEY, String(next))
        } catch {
          // Storage can be unavailable in privacy-restricted browser contexts.
        }
      },
    }),
    [shown],
  )
  return <AdvancedContext value={value}>{children}</AdvancedContext>
}

export const useAdvanced = () => useContext(AdvancedContext)

/**
 * An advanced setting hides while it is at its default and advanced settings are off. Once changed it always shows,
 * so nothing that shapes the model is ever out of sight.
 */
export function useHidden(advanced: boolean | undefined, modified: boolean): boolean {
  const { shown } = useAdvanced()
  return Boolean(advanced) && !shown && !modified
}
