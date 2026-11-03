import { Dimension, Section, ToggleSetting } from '@/components/controls'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CounterConfig } from '@/core/geometry/types'
import { defaultCounterConfig, MAX_COUNTER_CLICK, MIN_COUNTER_DRUM_WIDTH, minimumCounterDrumDiameter } from '@/core/geometry/counter'
import { tenthAbove } from '@/lib/workspace'
import { PanelFooter, type ResetAction } from './shared'

const COUNTER_DEFAULTS = defaultCounterConfig()

interface Props {
  resets: ResetAction[]
  counter: CounterConfig
  setCounter: (counter: CounterConfig) => void
}

export function CounterPanel({ counter, setCounter, resets }: Props) {
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
            min={MIN_COUNTER_DRUM_WIDTH}
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
          <Dimension
            label="Click"
            value={counter.click}
            min={0.1}
            max={MAX_COUNTER_CLICK}
            step={0.05}
            defaultValue={COUNTER_DEFAULTS.click}
            onChange={(click) => patch({ click })}
          />
          <FieldDescription>
            Tens on the left, units on the right. Each drum rests on a flat with the count on top, marked by the pointer's arrows; roll it
            onto the next flat to count. Bumps on each drum's inner face drop into dimples in the pointer, so every count clicks and holds;
            raise the click if the drums turn too easily, lower it if they will not turn. Push the units drum's hub through the pointer and
            the tens drum until its barb snaps home.
          </FieldDescription>
        </Section>

        <Section title="Inserts">
          <ToggleSetting
            label="Colour inserts"
            checked={counter.inserts}
            defaultChecked={COUNTER_DEFAULTS.inserts}
            onChange={(inserts) => patch({ inserts })}
          />
          {counter.inserts && (
            <>
              <Field orientation="horizontal" className="justify-between">
                <FieldLabel htmlFor="counter-insert-colour" className="font-normal">
                  Insert colour
                </FieldLabel>
                <input
                  id="counter-insert-colour"
                  type="color"
                  value={counter.insertColour}
                  onChange={(e) => patch({ insertColour: e.currentTarget.value })}
                  className="h-8 w-28 cursor-pointer border border-input bg-transparent p-0.5"
                />
              </Field>
              <Dimension
                label="Insert clearance"
                value={counter.insertClearance}
                min={0}
                max={0.2}
                step={0.01}
                defaultValue={COUNTER_DEFAULTS.insertClearance}
                onChange={(insertClearance) => patch({ insertClearance })}
              />
            </>
          )}
          <FieldDescription>
            {counter.inserts
              ? 'Each face is a tile with its digit raised, printed face up on a plate of its own that changes to the insert colour once, above the tiles. Press each tile into its pocket; loosen the clearance if they will not go in, or add a drop of glue if they fall out.'
              : 'The digits and arrows are engraved, ready to paint.'}
          </FieldDescription>
        </Section>

        <PanelFooter resets={resets} />
      </aside>
    </ScrollArea>
  )
}
