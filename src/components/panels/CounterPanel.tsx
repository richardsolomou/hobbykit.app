import { Choice, Dimension, Section, ToggleSetting } from '@/components/controls'
import { FieldDescription } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CounterConfig, CounterDetent } from '@/core/geometry/types'
import { defaultCounterConfig, MAX_COUNTER_CLICK, minimumCounterDrumDiameter, minimumCounterDrumWidth } from '@/core/geometry/counter'
import { trimNumber } from '@/core/geometry/outline'
import { tenthAbove } from '@/lib/workspace'
import { BASE_DEFAULTS, PanelFooter, type ResetAction, type SharedMagnetChanges } from './shared'

const COUNTER_DEFAULTS = defaultCounterConfig()
const DETENTS: { value: CounterDetent; label: string }[] = [
  { value: 'printed', label: 'Printed' },
  { value: 'magnets', label: 'Magnets' },
]

interface Props {
  resets: ResetAction[]
  counter: CounterConfig
  setCounter: (counter: CounterConfig) => void
  maxSharedMagnetThickness: number
  maxSharedDepthClearance: number
  setSharedMagnets: (changes: SharedMagnetChanges) => void
}

export function CounterPanel({ counter, setCounter, resets, maxSharedMagnetThickness, maxSharedDepthClearance, setSharedMagnets }: Props) {
  const patch = (changes: Partial<CounterConfig>) => setCounter({ ...counter, ...changes })
  return (
    <ScrollArea className="h-full w-81 max-w-[85vw] shrink-0 border-border bg-card md:border-r">
      <aside aria-label="Dial counter settings" className="pb-4 [counter-reset:schedule]">
        <Section title="Drums" aside={<span className="readout text-xs text-muted-foreground">00–99</span>}>
          <Dimension
            label="Drum diameter"
            value={counter.drumDiameter}
            min={tenthAbove(minimumCounterDrumDiameter(counter))}
            max={60}
            step={0.1}
            defaultValue={COUNTER_DEFAULTS.drumDiameter}
            onChange={(drumDiameter) => patch({ drumDiameter })}
          />
          <Dimension
            label="Drum width"
            value={counter.drumWidth}
            min={tenthAbove(minimumCounterDrumWidth(counter))}
            max={24}
            step={0.1}
            defaultValue={COUNTER_DEFAULTS.drumWidth}
            onChange={(drumWidth) => patch({ drumWidth })}
          />
          <Dimension
            label="Fit clearance"
            value={counter.clearance}
            min={0.1}
            max={0.6}
            step={0.05}
            defaultValue={COUNTER_DEFAULTS.clearance}
            onChange={(clearance) => patch({ clearance })}
          />
          <Choice
            label="Detent"
            value={counter.detent}
            defaultValue={COUNTER_DEFAULTS.detent}
            options={DETENTS}
            onChange={(detent) => patch({ detent })}
          />
          {counter.detent === 'printed' && (
            <Dimension
              label="Click"
              value={counter.click}
              min={0.1}
              max={MAX_COUNTER_CLICK}
              step={0.05}
              defaultValue={COUNTER_DEFAULTS.click}
              onChange={(click) => patch({ click })}
            />
          )}
          <FieldDescription>
            {counter.detent === 'printed'
              ? 'Roll a drum onto its next flat to count. Raise the click if the drums turn too easily.'
              : "Roll a drum onto its next flat to count. Magnets in the drums snap to the pointer's at every count."}
          </FieldDescription>
        </Section>

        {counter.detent === 'magnets' && (
          <Section
            title="Magnets"
            aside={
              <span className="readout text-xs text-muted-foreground">
                22 × {trimNumber(counter.magnets.diameter + counter.magnets.clearance)} mm hole
              </span>
            }
          >
            <Dimension
              label="Magnet diameter"
              value={counter.magnets.diameter}
              min={2}
              max={8}
              step={0.5}
              defaultValue={BASE_DEFAULTS.magnets.diameter}
              onChange={(diameter) => setSharedMagnets({ diameter })}
            />
            <Dimension
              label="Magnet thickness"
              value={counter.magnets.thickness}
              min={0.5}
              max={maxSharedMagnetThickness}
              step={0.1}
              defaultValue={BASE_DEFAULTS.magnets.thickness}
              onChange={(thickness) => setSharedMagnets({ thickness })}
            />
            <Dimension
              label="Magnet diameter clearance"
              value={counter.magnets.clearance}
              min={0}
              max={0.6}
              step={0.05}
              defaultValue={BASE_DEFAULTS.magnets.clearance}
              onChange={(clearance) => setSharedMagnets({ clearance })}
            />
            <Dimension
              label="Magnet depth clearance"
              value={counter.magnets.depthClearance}
              min={0}
              max={maxSharedDepthClearance}
              step={0.05}
              defaultValue={BASE_DEFAULTS.magnets.depthClearance}
              onChange={(depthClearance) => setSharedMagnets({ depthClearance })}
            />
            <FieldDescription>
              Ten in each drum's inner face and one in each face of the pointer. Check each drum's magnets attract the pointer's before
              gluing them in.
            </FieldDescription>
          </Section>
        )}

        <Section title="Inserts">
          <ToggleSetting
            label="Press-in tiles"
            checked={counter.inserts}
            defaultChecked={COUNTER_DEFAULTS.inserts}
            onChange={(inserts) => patch({ inserts })}
          />
          {counter.inserts && (
            <Dimension
              label="Insert clearance"
              value={counter.insertClearance}
              min={0}
              max={0.2}
              step={0.01}
              defaultValue={COUNTER_DEFAULTS.insertClearance}
              onChange={(insertClearance) => patch({ insertClearance })}
            />
          )}
          <FieldDescription>
            {counter.inserts ? 'Press each tile into its pocket. Raise the clearance if they will not go in.' : 'Engraved, ready to paint.'}
          </FieldDescription>
        </Section>

        <PanelFooter resets={resets} />
      </aside>
    </ScrollArea>
  )
}
