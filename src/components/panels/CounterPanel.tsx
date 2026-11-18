import { Dimension, PictureChoice, Section } from '@/components/controls'
import { COUNTER_DIGIT_PICTURES, COUNTER_LAYOUT_PICTURES, counterSizePicture, filamentPicture } from '@/components/pictures'
import { FieldDescription } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { FilamentColours } from '@/core/geometry/filaments'
import type { CounterConfig } from '@/core/geometry/types'
import {
  automaticCounterClick,
  defaultCounterConfig,
  maximumCounterClick,
  MIN_COUNTER_CLICK,
  MINIMUM_COUNTER_DRUM_DIAMETER,
} from '@/core/geometry/counter'
import { tenthAbove } from '@/lib/workspace'
import { PanelFooter, type ResetAction } from './shared'

const COUNTER_DEFAULTS = defaultCounterConfig()
/** Shortcuts for the wheel diameter; the click follows the diameter on its own. */
const SIZES = [
  { value: 39.6, label: 'Full size' },
  { value: 32, label: 'Medium' },
  { value: 24, label: 'Small' },
  { value: 18, label: 'Smallest' },
].map((size) => ({ ...size, picture: counterSizePicture(size.value) }))

const LAYOUTS = [
  { value: 'enclosure' as const, label: 'Enclosure' },
  { value: 'knobs' as const, label: 'Hubs and knobs' },
  { value: 'centre' as const, label: 'Frame and base' },
  { value: 'hubs' as const, label: 'Hubs on legs' },
]
const DIGIT_STYLES = [
  { value: 'tiles' as const, label: 'Press-in tiles' },
  { value: 'printed' as const, label: 'Printed in the dial' },
  { value: 'engraved' as const, label: 'Engraved for paint' },
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
  /** The colours picked at the top of the page, which the digit filament choice shows. */
  filaments: FilamentColours
}

export function CounterPanel({ counter, setCounter, filaments, resets }: Props) {
  const patch = (changes: Partial<CounterConfig>) => setCounter({ ...counter, ...changes })
  /** What the click is at this wheel size until someone sets it by hand. */
  const automaticClick = automaticCounterClick(counter)
  return (
    <ScrollArea className="h-full w-81 max-w-[85vw] shrink-0 border-border bg-card md:border-r">
      <aside aria-label="Dial counter settings" className="relative flex min-h-full flex-col pb-4 [counter-reset:schedule]">
        <Section title="Layout" first>
          <PictureChoice
            label="Layout"
            value={counter.layout}
            defaultValue={COUNTER_DEFAULTS.layout}
            options={LAYOUTS.map((layout) => ({ ...layout, picture: COUNTER_LAYOUT_PICTURES[layout.value] }))}
            columns={4}
            onChange={(layout) => patch({ layout })}
          />
          <Dimension
            label="Grip"
            advanced
            value={counter.grip}
            min={0}
            max={15}
            step={0.5}
            defaultValue={COUNTER_DEFAULTS.grip}
            onChange={(grip) => patch({ grip })}
          />
        </Section>

        <Section title="Wheels" aside={<span className="readout text-xs text-muted-foreground">00–99</span>}>
          <PictureChoice
            label="Size"
            value={counter.drumDiameter}
            defaultValue={COUNTER_DEFAULTS.drumDiameter}
            columns={4}
            options={SIZES}
            onChange={(drumDiameter) => patch({ drumDiameter })}
          />
          <Dimension
            label="Wheel diameter"
            advanced={SIZES.some(({ value }) => value === counter.drumDiameter)}
            value={counter.drumDiameter}
            min={tenthAbove(MINIMUM_COUNTER_DRUM_DIAMETER)}
            max={40}
            step={0.1}
            onChange={(drumDiameter) => patch({ drumDiameter })}
          />
          <Dimension
            label="Fit clearance"
            advanced
            value={counter.clearance}
            min={0.1}
            max={0.4}
            step={0.05}
            defaultValue={COUNTER_DEFAULTS.clearance}
            onChange={(clearance) => patch({ clearance })}
          />
          <Dimension
            label="Click"
            advanced
            value={counter.click}
            min={MIN_COUNTER_CLICK}
            max={maximumCounterClick(counter)}
            step={0.05}
            defaultValue={automaticClick}
            automatic={!counter.pinned.includes('click')}
            onChange={(click) => patch({ click, pinned: Math.abs(click - automaticClick) < 1e-9 ? [] : ['click'] })}
          />
          <FieldDescription>
            Size scales the whole counter and keeps the fit the same. The click grows with the wheels; raise it if the dials turn too
            easily.
          </FieldDescription>
        </Section>

        <Section title="Digits">
          <PictureChoice
            label="Digits"
            value={counter.digits}
            defaultValue={COUNTER_DEFAULTS.digits}
            options={DIGIT_STYLES.map((style) => ({ ...style, picture: COUNTER_DIGIT_PICTURES[style.value] }))}
            onChange={(digits) => patch({ digits })}
          />
          {counter.digits !== 'engraved' && (
            <PictureChoice
              label="Digit filament"
              advanced
              value={counter.digitFilament}
              defaultValue={COUNTER_DEFAULTS.digitFilament}
              options={[
                { value: 2 as const, label: 'Second colour', picture: filamentPicture(filaments.second) },
                { value: 3 as const, label: 'Third colour', picture: filamentPicture(filaments.third) },
              ]}
              columns={4}
              onChange={(digitFilament) => patch({ digitFilament })}
            />
          )}
          {counter.digits === 'tiles' && (
            <Dimension
              label="Insert clearance"
              advanced
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
