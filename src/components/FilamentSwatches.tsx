import { RotateCcw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { DEFAULT_FILAMENTS, PLA_BASIC_COLOURS, type FilamentColours } from '@/core/geometry/filaments'

const FILAMENTS: [keyof FilamentColours, string][] = [
  ['body', 'Body colour'],
  ['second', 'Second colour'],
  ['third', 'Third colour'],
]

const colourName = (hex: string) => PLA_BASIC_COLOURS.find((colour) => colour.hex === hex)?.name ?? hex

/** One set of colours for every generator, shown in the preview and written into each 3MF; `count` is how many the part on screen uses. */
export function FilamentSwatches({
  filaments,
  count,
  onChange,
}: {
  filaments: FilamentColours
  count: number
  onChange: (filaments: FilamentColours) => void
}) {
  return (
    <fieldset aria-label="Colours" className="flex shrink-0 items-center gap-1.5">
      {FILAMENTS.slice(0, count).map(([key, label]) => (
        <Popover key={key}>
          <PopoverTrigger
            aria-label={`${label}: ${colourName(filaments[key])}`}
            title={`${label}: ${colourName(filaments[key])}`}
            className="size-6 rounded-full border border-muted-foreground transition-transform hover:scale-110"
            style={{ backgroundColor: filaments[key] }}
          />
          <PopoverContent align="end" className="w-auto">
            <div className="flex items-center justify-between gap-3">
              <PopoverTitle className="note">{label}</PopoverTitle>
              <span className="flex items-center gap-2">
                <span className="readout text-xs">{colourName(filaments[key])}</span>
                {filaments[key] !== DEFAULT_FILAMENTS[key] && (
                  <button
                    type="button"
                    aria-label={`Reset ${label} to ${colourName(DEFAULT_FILAMENTS[key])}`}
                    onClick={() => onChange({ ...filaments, [key]: DEFAULT_FILAMENTS[key] })}
                    className="text-modified transition-colors hover:text-modified/80"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PLA_BASIC_COLOURS.map(({ name, hex }) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={name}
                  aria-pressed={filaments[key] === hex}
                  title={name}
                  onClick={() => onChange({ ...filaments, [key]: hex })}
                  className="size-7 rounded-full border border-muted-foreground transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-measure aria-pressed:ring-offset-2 aria-pressed:ring-offset-popover"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </fieldset>
  )
}
