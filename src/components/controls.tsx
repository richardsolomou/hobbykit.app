import { RotateCcw } from 'lucide-react'
import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useHidden } from '@/lib/advanced'
import { SectionContext, useSettingChanged } from '@/lib/analytics'
import { sectionTarget } from '@/lib/tour'
import { AdvancedToggle } from '@/components/AdvancedToggle'

/** A group of always-visible controls, with an optional figure in the header. */
export function Section({
  title,
  children,
  aside,
  first,
}: {
  title: string
  children: ReactNode
  aside?: ReactNode
  /** The panel's first section, whose heading carries the Advanced switch so it scrolls with the settings. */
  first?: boolean
}) {
  return (
    // A section whose every setting is hidden as advanced hides with them.
    <FieldSet
      data-tour={sectionTarget(title)}
      className="min-w-0 gap-3 border-t border-border px-5 py-4 not-has-[[data-slot=field],button]:hidden"
    >
      <div className={`flex justify-between gap-2 ${first ? 'items-center' : 'items-baseline'}`}>
        <FieldLegend variant="label" className={`note schedule-index mb-0 ${first ? 'whitespace-nowrap' : ''}`}>
          {title}
        </FieldLegend>
        {first ? (
          <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
            {aside}
            <AdvancedToggle />
          </div>
        ) : (
          aside
        )}
      </div>
      <FieldGroup className="gap-3">
        <SectionContext value={title}>{children}</SectionContext>
      </FieldGroup>
    </FieldSet>
  )
}

interface DimensionProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
  compact?: boolean
  compactLabel?: string
  defaultValue?: number
  /** Marks a value that follows something else, such as the footprint, until it is set by hand. */
  automatic?: boolean
  /** Hidden while at its default unless advanced settings are shown. */
  advanced?: boolean
  /** A button inside the input, such as one that picks a value at random. */
  action?: { label: string; icon: ReactNode; onClick: () => void }
  onChange: (value: number) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const quantise = (value: number, step: number) => Math.round(value / step) * step
/** Narrows bounds inward to multiples of step; a range narrower than one step keeps its raw bounds. */
const onStepGrid = (min: number, max: number, step: number): [number, number] => {
  const lo = Number((Math.ceil(min / step - 1e-9) * step).toFixed(6))
  const hi = Number((Math.floor(max / step + 1e-9) * step).toFixed(6))
  return lo <= hi ? [lo, hi] : [min, max]
}

function ResetButton({ label, value, onReset }: { label: string; value: string; onReset: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Reset ${label} to ${value}`}
      title={`Reset to ${value}`}
      onClick={onReset}
      className="shrink-0 text-modified transition-colors hover:text-modified/80"
    >
      <RotateCcw className="size-3.5" />
    </button>
  )
}

function ResetSlot({ children }: { children?: ReactNode }) {
  return <span className="col-start-2 row-start-1 flex size-3.5 items-center justify-center">{children}</span>
}

const settingColumns = 'grid w-full grid-cols-[minmax(0,1fr)_0.875rem_7rem] items-center gap-2'
const settingLabel = 'col-start-1 row-start-1 w-full font-normal'

/**
 * A dimension: type an exact figure, or drag its label to scrub. Typing is the
 * point — a slider cannot land on 28.5 reliably, and these are millimetres
 * someone is going to print.
 */
export function Dimension({
  label,
  value,
  min: rawMin,
  max: rawMax,
  step,
  unit = 'mm',
  disabled,
  compact,
  compactLabel,
  defaultValue,
  automatic,
  advanced,
  action,
  onChange,
}: DimensionProps) {
  // Values snap to multiples of step, but a number input counts steps from its min, so the bounds move onto the same grid.
  const [min, max] = onStepGrid(rawMin, rawMax, step)
  const id = useId()
  const [text, setText] = useState<string | undefined>()
  const format = (next: number) => (Number.isInteger(step) ? String(Math.round(next)) : next.toFixed(step < 0.1 ? 2 : 1))
  const formatted = format(value)
  const modified = defaultValue !== undefined && value !== defaultValue
  const hidden = useHidden(advanced, modified)
  const report = useSettingChanged(label, advanced)
  /** The value when the input took focus, so typing reports once, when it is left. */
  const focusedAt = useRef(value)

  /**
   * Listeners go on at pointerdown rather than through an effect: setting a ref
   * does not re-render, so an effect would never see the drag begin. Props are
   * captured here and stay correct because every move recomputes from the value
   * the drag started on.
   */
  const startScrub = (event: ReactPointerEvent) => {
    if (disabled) return
    const startX = event.clientX
    const from = value
    const span = (max - min) / 240 // a full sweep in roughly one panel width
    let last = from
    const move = (moved: PointerEvent) => {
      last = clamp(quantise(from + (moved.clientX - startX) * span, step), min, max)
      onChange(last)
    }
    const stop = () => {
      document.removeEventListener('pointermove', move)
      document.body.style.cursor = ''
      if (last !== from) report({ method: 'scrubbed', value: last, defaultValue })
    }
    document.body.style.cursor = 'ew-resize'
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', stop, { once: true })
  }

  const change = (raw: string) => {
    setText(raw)
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(quantise(parsed, step))
  }

  const finish = (raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (Number.isFinite(parsed)) {
      const next = clamp(quantise(parsed, step), min, max)
      onChange(next)
      if (next !== focusedAt.current) report({ method: 'typed', value: next, defaultValue })
    }
    setText(undefined)
  }

  if (hidden) return null
  return (
    <Field orientation={compactLabel ? undefined : 'horizontal'} data-disabled={disabled} className={compact ? 'min-w-0' : undefined}>
      <div className={compact ? 'contents' : settingColumns}>
        <FieldLabel
          htmlFor={id}
          onPointerDown={startScrub}
          className={
            compactLabel
              ? 'px-1 text-[0.625rem] tracking-wider text-muted-foreground uppercase'
              : compact
                ? 'sr-only'
                : `${settingLabel} col-span-2 cursor-ew-resize touch-none ${modified ? 'text-modified' : ''}`
          }
        >
          {compactLabel ?? label}
          {automatic && !modified && (
            <span aria-hidden className="readout ml-1.5 text-[0.625rem] text-muted-foreground uppercase">
              auto
            </span>
          )}
        </FieldLabel>
        {!compact && modified && (
          <ResetSlot>
            <ResetButton
              label={label}
              value={`${format(defaultValue)}${unit ? ` ${unit}` : ''}`}
              onReset={() => {
                setText(undefined)
                onChange(defaultValue)
                report({ method: 'reset', value: defaultValue, defaultValue })
              }}
            />
          </ResetSlot>
        )}
        <InputGroup className={compact ? 'w-full min-w-0' : 'w-28 shrink-0'}>
          <InputGroupInput
            id={id}
            type="number"
            inputMode="decimal"
            aria-label={`${label} in ${unit}`}
            value={text ?? formatted}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(event) => change(event.currentTarget.value)}
            onFocus={() => (focusedAt.current = value)}
            onBlur={(event) => finish(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
            className="readout text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && (
            <InputGroupAddon align="inline-end">
              <InputGroupText className="text-xs">{unit}</InputGroupText>
            </InputGroupAddon>
          )}
          {action && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={action.label}
                title={action.label}
                disabled={disabled}
                onClick={() => {
                  setText(undefined)
                  action.onClick()
                  report({ method: 'action' })
                }}
              >
                {action.icon}
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
    </Field>
  )
}

interface ChoiceProps<T extends string | number> {
  label: string
  value: T
  defaultValue?: T
  disabled?: boolean
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}

/** The popup grows past a narrow trigger to fit its longest option, so no label runs under the check mark. */
const widestOption = 'w-auto min-w-(--anchor-width)'

const GRID_COLUMNS = { 3: 'grid-cols-3 gap-1.5', 4: 'grid-cols-4 gap-1.5', 5: 'grid-cols-5 gap-1' }

interface PictureChoiceProps<T extends string | number> extends Omit<ChoiceProps<T>, 'options'> {
  options: readonly { value: T; label: string; picture: ReactNode }[]
  /** Tiles per row; small pictures read at four or five, detailed ones need three. */
  columns?: 3 | 4 | 5
  /** Hidden while at its default unless advanced settings are shown. */
  advanced?: boolean
}

/**
 * A choice made by picture: a grid of tiles, each a small drawing of the option over its name, so what an option
 * looks like is clear before it is picked. A radio group underneath, so the arrow keys move between tiles.
 */
export function PictureChoice<T extends string | number>({
  label,
  value,
  defaultValue,
  disabled,
  options,
  onChange,
  columns = 3,
  advanced,
}: PictureChoiceProps<T>) {
  const id = useId()
  const modified = defaultValue !== undefined && value !== defaultValue
  const hidden = useHidden(advanced, modified)
  const report = useSettingChanged(label, advanced)
  if (options.length <= 1 || hidden) return null
  const defaultLabel = options.find((option) => option.value === defaultValue)?.label ?? String(defaultValue)
  return (
    <Field data-disabled={disabled} className="gap-2">
      <div className="flex items-center gap-2">
        <FieldLabel id={id} className={`font-normal ${modified ? 'text-modified' : ''}`}>
          {label}
        </FieldLabel>
        {modified && !disabled && (
          <ResetButton
            label={label}
            value={defaultLabel}
            onReset={() => {
              onChange(defaultValue)
              report({ method: 'reset', value: defaultValue, defaultValue })
            }}
          />
        )}
      </div>
      <RadioGroup
        aria-labelledby={id}
        disabled={disabled}
        value={String(value)}
        onValueChange={(next) => {
          const picked = options.find((option) => String(option.value) === String(next))
          if (!picked) return
          onChange(picked.value)
          report({ method: 'picked', value: picked.value, defaultValue })
        }}
        className={GRID_COLUMNS[columns]}
      >
        {options.map((option) => (
          <Radio.Root
            key={String(option.value)}
            value={String(option.value)}
            aria-label={option.label}
            className="flex min-w-0 flex-col items-center gap-1 rounded-md border border-border bg-background px-0.5 pt-1.5 pb-1 text-muted-foreground outline-none transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-measure data-checked:text-foreground data-checked:hover:border-measure"
          >
            <span aria-hidden className="flex aspect-[4/3] w-full items-center justify-center [&>svg]:size-full">
              {option.picture}
            </span>
            <span
              className={`readout line-clamp-2 flex min-h-[2lh] w-full items-start justify-center text-center leading-tight tracking-tighter text-balance [overflow-wrap:anywhere] ${columns === 5 ? 'text-[0.5rem]' : 'text-[0.5625rem]'}`}
            >
              {option.label}
            </span>
          </Radio.Root>
        ))}
      </RadioGroup>
    </Field>
  )
}

export function CompactChoice<T extends string | number>({ label, value, options, onChange }: Omit<ChoiceProps<T>, 'defaultValue'>) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? String(value)
  const report = useSettingChanged(label)
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        const picked = options.find((option) => String(option.value) === String(next))
        if (!picked) return
        onChange(picked.value)
        report({ method: 'picked', value: picked.value })
      }}
    >
      <SelectTrigger aria-label={label} className="w-full min-w-0">
        <SelectValue>
          <span className="readout truncate text-xs">{selectedLabel}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={widestOption}>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            <span className="readout text-xs">{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ToggleSetting({
  label,
  checked,
  defaultChecked,
  advanced,
  onChange,
}: {
  label: string
  checked: boolean
  defaultChecked: boolean
  /** Hidden while at its default unless advanced settings are shown. */
  advanced?: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  const modified = checked !== defaultChecked
  const report = useSettingChanged(label, advanced)
  if (useHidden(advanced, modified)) return null
  const toggle = (next: boolean, method: 'toggled' | 'reset') => {
    onChange(next)
    report({ method, value: next, defaultValue: defaultChecked })
  }
  return (
    <Field orientation="horizontal">
      <div className={settingColumns}>
        <FieldLabel htmlFor={id} className={`${settingLabel} col-span-2 ${modified ? 'text-modified' : ''}`}>
          {label}
        </FieldLabel>
        {modified && (
          <ResetSlot>
            <ResetButton label={label} value={defaultChecked ? 'on' : 'off'} onReset={() => toggle(defaultChecked, 'reset')} />
          </ResetSlot>
        )}
        <div className="flex w-28 justify-start">
          <Switch id={id} checked={checked} onCheckedChange={(next) => toggle(next, 'toggled')} className="ms-px" />
        </div>
      </div>
    </Field>
  )
}

export interface SizeOption {
  value: string
  label?: string
  use: string
}

/**
 * Standard sizes as a grid of chips, the size typed above them lighting up the one it matches. What the picked size is
 * for sits in a caption of its own two lines, so moving between sizes never shifts the panel.
 */
export function StandardSizes({
  value,
  options,
  onChange,
  label = 'Standard base size',
}: {
  value: string | undefined
  options: readonly SizeOption[]
  onChange: (value: string) => void
  label?: string
}) {
  const id = useId()
  const report = useSettingChanged('Standard size')
  const selected = options.find((option) => option.value === value)
  const wide = options.some((option) => (option.label ?? option.value).length > 5)
  return (
    <Field className="gap-2">
      <FieldLabel id={id} className="font-normal">
        Standard sizes
      </FieldLabel>
      <RadioGroup
        aria-label={label}
        value={value ?? null}
        onValueChange={(next) => {
          onChange(String(next))
          report({ method: 'picked', value: String(next) })
        }}
        className={wide ? 'grid-cols-3 gap-1' : 'grid-cols-5 gap-1'}
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            aria-label={`${option.label ?? option.value} ${option.use}`}
            className="readout flex items-center justify-center rounded-md border border-border bg-background py-1 text-xs text-muted-foreground outline-none transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-measure data-checked:text-foreground data-checked:hover:border-measure"
          >
            {option.label ?? option.value}
          </Radio.Root>
        ))}
      </RadioGroup>
      <p aria-live="polite" className="note line-clamp-2 min-h-[2lh] text-xs text-muted-foreground">
        {selected ? selected.use : 'Off the standard range.'}
      </p>
    </Field>
  )
}

/**
 * Standard sizes collapse into a select: the round family alone runs to a dozen
 * entries, and a list that long reflows the whole panel every time the shape
 * changes. What the size is for rides inside the trigger rather than in a caption
 * under it, so dialling in a footprint off the standard range does not shift
 * everything below.
 */
export function SizeSelect({
  value,
  options,
  onChange,
  label = 'Standard base size',
  compact = false,
}: {
  value: string | null
  options: readonly SizeOption[]
  onChange: (value: string) => void
  label?: string
  compact?: boolean
}) {
  const id = useId()
  const report = useSettingChanged('Size')
  const selected = options.find((option) => option.value === value)
  return (
    <Field orientation={compact ? undefined : 'horizontal'} className={compact ? 'min-w-0' : undefined}>
      <div className={compact ? 'contents' : settingColumns}>
        {!compact && (
          <FieldLabel htmlFor={id} className={`${settingLabel} col-span-2`}>
            Size
          </FieldLabel>
        )}
        <Select
          value={value}
          onValueChange={(next) => {
            onChange(String(next))
            report({ method: 'picked', value: String(next) })
          }}
        >
          <SelectTrigger id={id} aria-label={label} className={compact ? 'w-full min-w-0' : 'w-28'}>
            <SelectValue>
              <span className="readout shrink-0">{selected?.label ?? selected?.value ?? 'Custom'}</span>
              <span className="truncate text-muted-foreground">{selected?.use ?? 'off the standard range'}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} style={{ width: '20rem', maxWidth: 'calc(100vw - 2rem)' }}>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="readout shrink-0">{option.label ?? option.value}</span>
                <span className="text-muted-foreground">{option.use}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Field>
  )
}
