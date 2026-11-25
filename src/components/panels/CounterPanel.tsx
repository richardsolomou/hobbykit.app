import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'
import { Dimension, PictureChoice, Section, ToggleSetting } from '@/components/controls'
import {
  COUNTER_DIAL_PICTURES,
  COUNTER_DIGIT_PICTURES,
  COUNTER_MARK_PICTURES,
  counterSizePicture,
  filamentPicture,
} from '@/components/pictures'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  COUNTER_FACES,
  COUNTER_RANGES,
  counterRange,
  defaultCounterConfig,
  MAX_COUNTER_SIZE,
  MAX_COUNTER_VALUE,
  maximumCounterRelief,
  MIN_COUNTER_SIZE,
  DEFAULT_COUNTER_SIZE,
} from '@/core/geometry/counter'
import type { FilamentColours } from '@/core/geometry/filaments'
import type { CounterConfig, CounterPlateFace } from '@/core/geometry/types'
import { useTextSettingChanged } from '@/lib/analytics'
import { Panel, type ResetAction } from './shared'

const COUNTER_DEFAULTS = defaultCounterConfig()
const SIZES = [
  { value: 28, label: 'Small' },
  { value: DEFAULT_COUNTER_SIZE, label: 'Standard' },
  { value: 42, label: 'Large' },
  { value: 50, label: 'Extra large' },
].map((size) => ({ ...size, picture: counterSizePicture(size.value, 50) }))
const DIALS = [1, 2, 3, 4].map((dials) => ({ value: dials, label: String(dials), picture: COUNTER_DIAL_PICTURES[dials - 1] }))
const DIGIT_STYLES = [
  { value: 'inlaid' as const, label: 'Inlaid' },
  { value: 'engraved' as const, label: 'Engraved for paint' },
  { value: 'raised' as const, label: 'Raised' },
]
const MARKS = [
  { value: 'bar' as const, label: 'Bar' },
  { value: 'pointer' as const, label: 'Pointer' },
  { value: 'none' as const, label: 'None' },
]

interface Props {
  resets: ResetAction[]
  counter: CounterConfig
  setCounter: (counter: CounterConfig) => void
  filaments: FilamentColours
  addPlateImage: (side: 'left' | 'right', file: File) => Promise<void>
  plateImageError: { side: 'left' | 'right'; message: string } | undefined
}

export function CounterPanel({ counter, setCounter, filaments, addPlateImage, plateImageError, resets }: Props) {
  const patch = (changes: Partial<CounterConfig>) => setCounter({ ...counter, ...changes })
  const range = (key: keyof typeof COUNTER_RANGES) => ({ min: COUNTER_RANGES[key][0], max: COUNTER_RANGES[key][1] })
  return (
    <Panel page="counter" resets={resets}>
      <Section title="Size" first>
        <PictureChoice
          label="Size"
          value={counter.size}
          defaultValue={COUNTER_DEFAULTS.size}
          columns={4}
          options={SIZES}
          onChange={(size) => patch({ size })}
        />
        <Dimension
          label="Dial size"
          advanced={SIZES.some(({ value }) => value === counter.size)}
          value={counter.size}
          min={MIN_COUNTER_SIZE}
          max={MAX_COUNTER_SIZE}
          step={0.05}
          onChange={(size) => patch({ size })}
        />
        <FieldDescription>Scales the whole counter; the fits stay the same.</FieldDescription>
      </Section>

      <Section title="Dials" aside={<span className="readout text-xs text-muted-foreground">{counterRange(counter)}</span>}>
        <PictureChoice
          label="Dials"
          value={counter.dials}
          defaultValue={COUNTER_DEFAULTS.dials}
          columns={4}
          options={DIALS}
          onChange={(dials) => patch({ dials })}
        />
        <Dimension
          label="Numbers per dial"
          value={counter.faces}
          min={COUNTER_FACES[0]}
          max={COUNTER_FACES[1]}
          step={1}
          unit=""
          defaultValue={COUNTER_DEFAULTS.faces}
          onChange={(faces) => patch({ faces, first: Math.min(counter.first, MAX_COUNTER_VALUE + 1 - faces) })}
        />
        <Dimension
          label="First number"
          value={counter.first}
          min={0}
          max={MAX_COUNTER_VALUE + 1 - counter.faces}
          step={1}
          unit=""
          defaultValue={COUNTER_DEFAULTS.first}
          onChange={(first) => patch({ first })}
        />
        <ToggleSetting
          label="Count down"
          checked={counter.countDown}
          defaultChecked={COUNTER_DEFAULTS.countDown}
          onChange={(countDown) => patch({ countDown })}
        />
        <FieldDescription>Ten numbers from 0 read 00 to 99 across the dials.</FieldDescription>
      </Section>

      <Section title="Digits">
        <PictureChoice
          label="Digits"
          value={counter.digits}
          defaultValue={COUNTER_DEFAULTS.digits}
          options={DIGIT_STYLES.map((style) => ({ ...style, picture: COUNTER_DIGIT_PICTURES[style.value] }))}
          onChange={(digits) => patch({ digits })}
        />
        <Dimension
          label={counter.digits === 'raised' ? 'Digit height' : 'Digit depth'}
          advanced
          value={counter.relief}
          min={COUNTER_RANGES.relief[0]}
          max={maximumCounterRelief(counter)}
          step={0.05}
          defaultValue={COUNTER_DEFAULTS.relief}
          onChange={(relief) => patch({ relief })}
        />
        {counter.digits === 'inlaid' && (
          <Dimension
            label="Inlay depth"
            advanced
            value={counter.inlay}
            {...range('inlay')}
            step={0.05}
            defaultValue={COUNTER_DEFAULTS.inlay}
            onChange={(inlay) => patch({ inlay })}
          />
        )}
      </Section>

      <Section title="Plates">
        <PictureChoice
          label="Top-row mark"
          value={counter.mark}
          defaultValue={COUNTER_DEFAULTS.mark}
          options={MARKS.map((mark) => ({ ...mark, picture: COUNTER_MARK_PICTURES[mark.value] }))}
          onChange={(mark) => patch({ mark })}
        />
        <PictureChoice
          label="Plate colour"
          value={counter.plateFilament}
          defaultValue={COUNTER_DEFAULTS.plateFilament}
          columns={4}
          options={[
            { value: 1 as const, label: 'Body colour', picture: filamentPicture(filaments.body) },
            { value: 3 as const, label: 'Third colour', picture: filamentPicture(filaments.third) },
          ]}
          onChange={(plateFilament) => patch({ plateFilament })}
        />
      </Section>

      {(['left', 'right'] as const).map((side) => (
        <PlateFaceSection
          key={side}
          side={side}
          face={counter[side]}
          onChange={(face) => patch({ [side]: face })}
          addImage={(file) => addPlateImage(side, file)}
          error={plateImageError?.side === side ? plateImageError.message : undefined}
        />
      ))}

      <Section title="Fit">
        <Dimension
          label="Axle press fit"
          advanced
          value={counter.pressFit}
          {...range('pressFit')}
          step={0.05}
          defaultValue={COUNTER_DEFAULTS.pressFit}
          onChange={(pressFit) => patch({ pressFit })}
        />
        <Dimension
          label="Dial play"
          advanced
          value={counter.dialClearance}
          {...range('dialClearance')}
          step={0.05}
          defaultValue={COUNTER_DEFAULTS.dialClearance}
          onChange={(dialClearance) => patch({ dialClearance })}
        />
        <Dimension
          label="Click"
          advanced
          value={counter.click}
          {...range('click')}
          step={0.05}
          defaultValue={COUNTER_DEFAULTS.click}
          onChange={(click) => patch({ click })}
        />
        <Dimension
          label="Lead-in"
          advanced
          value={counter.leadIn}
          {...range('leadIn')}
          step={0.05}
          defaultValue={COUNTER_DEFAULTS.leadIn}
          onChange={(leadIn) => patch({ leadIn })}
        />
        <FieldDescription>Raise the press fit if the axle won't go in, and the click if the dials turn too easily.</FieldDescription>
      </Section>
    </Panel>
  )
}

/** Text and an image inlaid in one plate's outer face. */
function PlateFaceSection({
  side,
  face,
  onChange,
  addImage,
  error,
}: {
  side: 'left' | 'right'
  face: CounterPlateFace
  onChange: (face: CounterPlateFace) => void
  addImage: (file: File) => Promise<void>
  error: string | undefined
}) {
  const title = side === 'left' ? 'Left plate' : 'Right plate'
  const textReport = useTextSettingChanged(title, 'Text')
  const imageInput = useRef<HTMLInputElement>(null)
  const defaults = COUNTER_DEFAULTS[side]
  return (
    <Section title={title}>
      <Field>
        <FieldLabel htmlFor={`counter-${side}-text`}>Text</FieldLabel>
        <Input
          id={`counter-${side}-text`}
          value={face.text}
          maxLength={30}
          placeholder={side === 'left' ? 'Life' : 'Your name'}
          onChange={(e) => onChange({ ...face, text: e.currentTarget.value })}
          {...textReport}
          className="readout"
        />
      </Field>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        aria-label={`${title} image`}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0]
          e.currentTarget.value = ''
          if (file) void addImage(file)
        }}
      />
      <ButtonGroup className="w-full">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => imageInput.current?.click()}>
          <ImagePlus />
          {face.image ? 'Replace image' : 'Add image'}
        </Button>
        {face.image && (
          <Button variant="outline" size="sm" onClick={() => onChange({ ...face, image: null })}>
            <X />
            Remove
          </Button>
        )}
      </ButtonGroup>
      {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
      {face.image && (
        <>
          <Dimension
            label="Threshold"
            advanced
            value={Math.round(face.threshold * 100)}
            min={1}
            max={99}
            step={1}
            unit="%"
            defaultValue={Math.round(defaults.threshold * 100)}
            onChange={(threshold) => onChange({ ...face, threshold: threshold / 100 })}
          />
          <ToggleSetting
            label="Use light areas"
            advanced
            checked={face.invert}
            defaultChecked={defaults.invert}
            onChange={(invert) => onChange({ ...face, invert })}
          />
        </>
      )}
    </Section>
  )
}
