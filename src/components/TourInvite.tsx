import { Signpost, X } from 'lucide-react'
import type { Page } from '@/lib/pages'
import { declineTours, useTour, useToured, useTourInvited } from '@/lib/tour'

/** Offers the tour once the part is on screen, quietly, rather than starting it over a model nobody has looked at yet. */
export function TourInvite({ page }: { page: Page }) {
  const invited = useTourInvited(page.value)
  const toured = useToured()
  const startTour = useTour()
  if (!invited) return null
  return (
    <aside aria-label="Tour" className="flex items-center border border-border bg-card/90 text-xs text-muted-foreground backdrop-blur-sm">
      <button
        type="button"
        onClick={() => startTour('first')}
        className="flex items-center gap-1.5 py-1.5 ps-2.5 pe-1 transition-colors hover:text-foreground"
      >
        <Signpost className="size-3.5" />
        {!toured && 'New here? '}
        <span className="text-foreground underline underline-offset-2">
          {toured ? `Quick tour of the ${page.label.toLowerCase()}?` : 'Take a quick tour'}
        </span>
      </button>
      <button
        type="button"
        onClick={declineTours}
        aria-label="Not now"
        title="Not now"
        className="flex items-center self-stretch px-2 transition-colors hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </aside>
  )
}
