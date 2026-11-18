import { Choice, Dimension, Section } from '@/components/controls'
import { FieldDescription } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CounterConfig } from '@/core/geometry/types'
import { defaultCounterConfig, maximumCounterClick, MIN_COUNTER_CLICK, MINIMUM_COUNTER_DRUM_DIAMETER } from '@/core/geometry/counter'
import { tenthAbove } from '@/lib/workspace'
import { PanelFooter, type ResetAction } from './shared'

const COUNTER_DEFAULTS = defaultCounterConfig()
/** Each with a click to suit, because a bigger dial's arms are stiffer and its troughs deeper. */
const SIZES = [
  { value: 39.6, label: 'Full size', click: 1.5 },
  { value: 32, label: 'Medium', click: 1.2 },
  { value: 24, label: 'Small', click: 0.9 },
  { value: 18, label: 'Smallest', click: 0.7 },
]

const LAYOUTS = [
  { value: 'enclosure' as const, label: 'Enclosure with side knobs' },
  { value: 'knobs' as const, label: 'Hubs and side knobs' },
  { value: 'centre' as const, label: 'Frame and base' },
  { value: 'hubs' as const, label: 'Two hubs on legs' },
]
const LAYOUT_NOTES = {
  enclosure:
    'The dials sit in a case with a window over the count, and each turns by a knob outside its end. The case prints as two halves that slot together in the middle. A rod through both dials keeps them in line. Press the knobs on last.',
  knobs:
    'Each dial clicks in a hub at its end, which the counter stands on and which marks the count, and turns by a knob outside it. A rod through both dials keeps them in line. Press the knobs on last.',
  hubs: 'A small hub on two legs at each end holds the tube, leaving the outer rim of each dial free to turn from the side.',
  centre:
    'A frame over the top row marks the count and stands on a post at each end, which holds the tube and plugs into a base plate under the dials. Turn the dials directly.',
}

const DIGIT_STYLES = [
  { value: 'tiles' as const, label: 'Press-in tiles' },
  { value: 'printed' as const, label: 'Printed in the dial' },
  { value: 'engraved' as const, label: 'Engraved for paint' },
]
const DIGIT_FILAMENTS = [
  { value: 2 as const, label: 'Second colour' },
  { value: 3 as const, label: 'Third colour' },
]
const DIGIT_NOTES = {
  tiles: 'Press each tile into its pocket. Raise the clearance if they will not go in.',
  printed:
    'Part of each dial, with no tiles to press in, but a filament change on every layer of the dials. A third colour also flushes on each one.',
  engraved: 'Engraved, ready to paint.',
}

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
        <Section title="Layout">
          <Choice
            label="Layout"
            value={counter.layout}
            defaultValue={COUNTER_DEFAULTS.layout}
            options={LAYOUTS}
            onChange={(layout) => patch({ layout })}
          />
          <Dimension
            label="Grip"
            value={counter.grip}
            min={0}
            max={15}
            step={0.5}
            defaultValue={COUNTER_DEFAULTS.grip}
            onChange={(grip) => patch({ grip })}
          />
          <FieldDescription>{LAYOUT_NOTES[counter.layout]} Grip widens each dial past its digits.</FieldDescription>
        </Section>

        <Section title="Wheels" aside={<span className="readout text-xs text-muted-foreground">00–99</span>}>
          <Choice
            label="Size"
            value={counter.drumDiameter}
            defaultValue={COUNTER_DEFAULTS.drumDiameter}
            options={
              SIZES.some(({ value }) => value === counter.drumDiameter)
                ? SIZES
                : [...SIZES, { value: counter.drumDiameter, label: 'Custom' }]
            }
            onChange={(drumDiameter) =>
              patch({ drumDiameter, click: SIZES.find(({ value }) => value === drumDiameter)?.click ?? counter.click })
            }
          />
          <Dimension
            label="Wheel diameter"
            value={counter.drumDiameter}
            min={tenthAbove(MINIMUM_COUNTER_DRUM_DIAMETER)}
            max={40}
            step={0.1}
            defaultValue={COUNTER_DEFAULTS.drumDiameter}
            onChange={(drumDiameter) => patch({ drumDiameter })}
          />
          <Dimension
            label="Fit clearance"
            value={counter.clearance}
            min={0.1}
            max={0.4}
            step={0.05}
            defaultValue={COUNTER_DEFAULTS.clearance}
            onChange={(clearance) => patch({ clearance })}
          />
          <Dimension
            label="Click"
            value={counter.click}
            min={MIN_COUNTER_CLICK}
            max={maximumCounterClick(counter)}
            step={0.05}
            defaultValue={COUNTER_DEFAULTS.click}
            onChange={(click) => patch({ click })}
          />
          <FieldDescription>
            Size scales the whole caddy and keeps the fit the same. Turn a dial to count, and raise the click if the dials turn too easily.
          </FieldDescription>
        </Section>

        <Section title="Digits">
          <Choice
            label="Digits"
            value={counter.digits}
            defaultValue={COUNTER_DEFAULTS.digits}
            options={DIGIT_STYLES}
            onChange={(digits) => patch({ digits })}
          />
          {counter.digits !== 'engraved' && (
            <Choice
              label="Digit filament"
              value={counter.digitFilament}
              defaultValue={COUNTER_DEFAULTS.digitFilament}
              options={DIGIT_FILAMENTS}
              onChange={(digitFilament) => patch({ digitFilament })}
            />
          )}
          {counter.digits === 'tiles' && (
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
          <FieldDescription>{DIGIT_NOTES[counter.digits]}</FieldDescription>
        </Section>

        <PanelFooter page="counter" resets={resets} />
      </aside>
    </ScrollArea>
  )
}
