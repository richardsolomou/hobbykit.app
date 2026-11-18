import { SlidersHorizontal } from 'lucide-react'
import { useId } from 'react'
import { Switch } from '@/components/ui/switch'
import { useAdvanced } from '@/lib/advanced'

/** Shows every setting, or only the main ones and whatever has been changed. Sits in the panel's first heading, beside its readout. */
export function AdvancedToggle() {
  const { shown, setShown } = useAdvanced()
  const id = useId()
  return (
    <span data-tour="advanced" className="flex shrink-0 items-center gap-1.5" title="Advanced settings">
      <label htmlFor={id} className="cursor-pointer text-muted-foreground">
        <SlidersHorizontal className="size-3.5" />
        <span className="sr-only">Advanced settings</span>
      </label>
      <Switch id={id} size="sm" checked={shown} onCheckedChange={setShown} />
    </span>
  )
}
