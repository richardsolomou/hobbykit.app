import { Dimension, Section, ToggleSetting } from '@/components/controls'
import { Button } from '@/components/ui/button'
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CounterConfig, CounterTile } from '@/core/geometry/types'
import {
  COUNTER_TILES,
  defaultCounterConfig,
  MAX_COUNTER_CLICK,
  MIN_COUNTER_DRUM_WIDTH,
  minimumCounterDrumDiameter,
} from '@/core/geometry/counter'
import { tenthAbove } from '@/lib/workspace'
import { PanelFooter, type ResetAction } from './shared'

const COUNTER_DEFAULTS = defaultCounterConfig()

interface Props {
  resets: ResetAction[]
  counter: CounterConfig
  setCounter: (counter: CounterConfig) => void
  exporting: boolean
  /** Downloads one tile, for reprinting one that failed. */
  exportTile: (tile: CounterTile) => void
}

export function CounterPanel({ counter, setCounter, exporting, exportTile, resets }: Props) {
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
          <FieldDescription>Roll a drum onto its next flat to count. Raise the click if the drums turn too easily.</FieldDescription>
        </Section>

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
          {counter.inserts && (
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Download one tile</FieldLegend>
              <div className="flex flex-wrap gap-1">
                {COUNTER_TILES.map((tile) => (
                  <Button
                    key={tile}
                    size="xs"
                    variant="outline"
                    aria-label={tile === 'arrows' ? 'Download the arrows tile' : `Download tile ${tile}`}
                    disabled={exporting}
                    onClick={() => exportTile(tile)}
                  >
                    {tile === 'arrows' ? 'Arrows' : tile}
                  </Button>
                ))}
              </div>
            </FieldSet>
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
