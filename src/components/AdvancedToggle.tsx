import { SlidersHorizontal } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { useAdvanced } from '@/lib/advanced'

/** Shows every setting, or only the main ones and whatever has been changed. */
export function AdvancedToggle({ className = '' }: { className?: string }) {
  const { shown, setShown } = useAdvanced()
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={shown}
      onPressedChange={setShown}
      aria-label="Advanced settings"
      title={shown ? 'Showing every setting' : 'Fine-tuning hides until you change it'}
      className={`bg-card/90 backdrop-blur-sm aria-pressed:border-measure/50 aria-pressed:text-measure ${className}`}
    >
      <SlidersHorizontal />
      Advanced
    </Toggle>
  )
}
