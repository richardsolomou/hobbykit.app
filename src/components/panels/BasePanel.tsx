import { Box, Download, Plus, Shuffle, Trash2 } from 'lucide-react'
import {
  BASE_SHAPE_PICTURES,
  LABEL_STYLE_PICTURES,
  MAGNET_LAYOUT_PICTURES,
  magnetCountPicture,
  PROFILE_PICTURES,
  ribPicture,
  texturePicture,
} from '@/components/pictures'
import { Dimension, PictureChoice, Section, StandardSizes, ToggleSetting } from '@/components/controls'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useTextSettingChanged } from '@/lib/analytics'
import { supportsFivePocketCross } from '@/core/geometry/base'
import { labelText } from '@/core/geometry/label'
import { DEFAULT_TEXTURE, isRegular, isRelief, maxLabelDepth, MAX_SEED, solidWithPattern, withPattern } from '@/core/geometry/texture'
import { defaultLabel, footprint, isElongated, sizeText, trimNumber } from '@/core/geometry/outline'
import {
  automaticMagnetCount,
  DEFAULT_SIZE,
  defaultLabelStyle,
  labelStyleWithSolid,
  MAGNET_CHOICES,
  pinned,
  resized,
  RIB_CHOICES,
  sizeDefaults,
  SIZES_BY_SHAPE,
} from '@/core/geometry/presets'
import type { BaseConfig, BasePinned, LabelStyle, ShapeKind, TexturePattern } from '@/core/geometry/types'
import { addToBatch } from '@/lib/batch'
import { posthog } from 'posthog-js'
import type { ExportFormat } from '@/lib/useExport'
import type { BatchEntry } from '@/lib/workspace'
import {
  AUTOMATIC_MAGNET_COUNT,
  BASE_DEFAULTS,
  MAGNET_LAYOUTS,
  MagnetClearanceField,
  MagnetSizeFields,
  PROFILES,
  Panel,
  safeEdgeSize,
  safeTextureDepth,
  type MagnetCountChoice,
  type ResetAction,
  type SharedMagnetChanges,
  type SharedMagnetPlacementChanges,
} from './shared'

const SHAPES: { value: ShapeKind; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'pill', label: 'Pill' },
  { value: 'rect', label: 'Rectangle' },
  { value: 'polygon', label: 'Hex' },
]

/** `size` names what the size control measures for each pattern. */
const TEXTURES: { value: TexturePattern; label: string; size: string }[] = [
  { value: 'none', label: 'None', size: '' },
  { value: 'flagstone', label: 'Flagstone', size: 'Stone size' },
  { value: 'cobblestone', label: 'Cobblestone', size: 'Cobble size' },
  { value: 'hex', label: 'Hex tile', size: 'Tile size' },
  { value: 'tile', label: 'Square tile', size: 'Tile size' },
  { value: 'plank', label: 'Plank', size: 'Plank width' },
  { value: 'plate', label: 'Plate', size: 'Plate depth' },
  { value: 'brick', label: 'Brick', size: 'Course height' },
  { value: 'herringbone', label: 'Herringbone', size: 'Brick width' },
  { value: 'diamond', label: 'Diamond plate', size: 'Diamond width' },
  { value: 'rock', label: 'Rock', size: 'Rock size' },
  { value: 'earth', label: 'Earth', size: 'Feature size' },
  { value: 'rubble', label: 'Rubble', size: 'Stone size' },
  { value: 'sand', label: 'Sand', size: 'Ripple spacing' },
  { value: 'cracked', label: 'Cracked earth', size: 'Plate size' },
  { value: 'snow', label: 'Snow', size: 'Drift size' },
  { value: 'roots', label: 'Roots', size: 'Feature size' },
]
const TEXTURE_OPTIONS = TEXTURES.map((texture) => ({ ...texture, picture: texturePicture(texture.value) }))
const PROFILE_OPTIONS = PROFILES.map((profile) => ({ ...profile, picture: PROFILE_PICTURES[profile.value] }))
const MIN_TEXTURE_DEPTH = 0.2
const LABEL_STYLES: { value: LabelStyle; label: string }[] = [
  { value: 'raised', label: 'Raised' },
  { value: 'engraved', label: 'Engraved' },
]
const LABEL_STYLE_OPTIONS = LABEL_STYLES.map((style) => ({ ...style, picture: LABEL_STYLE_PICTURES[style.value] }))

const counts = (values: number[]) => values.map((value) => ({ value, label: value === 0 ? 'None' : String(value) }))
const RIB_COUNTS = counts(RIB_CHOICES).map((option) => ({ ...option, picture: ribPicture(option.value) }))

const entryText = (entry: BatchEntry) => `${SHAPES.find((shape) => shape.value === entry.shape)!.label} ${sizeText(entry, '×')}`

interface Props {
  resets: ResetAction[]
  config: BaseConfig
  setConfig: (config: BaseConfig) => void
  patch: (changes: Partial<BaseConfig>) => void
  magnetCountValue: MagnetCountChoice
  setMagnetCount: (count: MagnetCountChoice) => void
  maxSharedMagnetThickness: number
  maxSharedDepthClearance: number
  setSharedMagnets: (changes: SharedMagnetChanges) => void
  setSharedLabels: (enabled: boolean) => void
  setSharedMagnetPlacement: (changes: SharedMagnetPlacementChanges) => void
  batch: BatchEntry[]
  setBatch: (next: (batch: BatchEntry[]) => BatchEntry[]) => void
  exporting: ExportFormat | undefined
  exportBatchStl: () => void
  exportBatch3mf: () => void
}

export function BasePanel({
  config,
  setConfig,
  patch,
  magnetCountValue,
  setMagnetCount,
  maxSharedMagnetThickness,
  maxSharedDepthClearance,
  setSharedMagnets,
  setSharedLabels,
  setSharedMagnetPlacement,
  batch,
  setBatch,
  exporting,
  exportBatchStl,
  exportBatch3mf,
  resets,
}: Props) {
  const { width, length } = footprint(config)
  const elongated = isElongated(config.shape)
  const faceUp = isRelief(config.texture.pattern)
  const hollow = !config.solid
  const sizes = SIZES_BY_SHAPE[config.shape]
  const standard = sizes.find((size) => size.width === width && (size.length ?? size.width) === length)
  /** What each size-driven setting gives for this footprint; a value matching it follows the size, one set apart stays put. */
  const auto = sizeDefaults(config)
  const follows = (key: BasePinned) => !config.pinned.includes(key)
  const setSized = (key: BasePinned, value: number, changes: Partial<BaseConfig>) =>
    patch({ ...changes, pinned: pinned(config, key, value) })
  /** What automatic gives for this footprint, whatever count is picked now. */
  const automaticMagnets = automaticMagnetCount(
    config.width,
    config.length,
    config.magnets.maxCount,
    config.magnets.diameter,
    config.magnets.thickness,
  )
  const magnetCountOptions = [
    {
      value: AUTOMATIC_MAGNET_COUNT as MagnetCountChoice,
      label: `Auto · ${automaticMagnets}`,
      picture: magnetCountPicture(automaticMagnets),
    },
    ...counts(MAGNET_CHOICES).map((option) => ({ ...option, picture: magnetCountPicture(option.value) })),
  ]
  const magnetLayoutOptions =
    config.magnets.patternVersion === 1 || supportsFivePocketCross(config.shape, config.width) ? MAGNET_LAYOUTS : MAGNET_LAYOUTS.slice(0, 1)

  const batchTotal = batch.reduce((total, entry) => total + entry.quantity, 0)
  const setQuantity = (index: number, quantity: number) =>
    setBatch((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, quantity } : entry)))

  /** Every way of changing the footprint takes this one path, so a standard size and the same size typed come out alike. */
  const setFootprint = (shape: ShapeKind, nextWidth: number, nextLength: number) =>
    setConfig(resized({ ...config, shape, label: { ...config.label } }, nextWidth, nextLength))

  /** Changing solid carries the label style the way a pattern switch carries texture values. */
  const solidChanges = (solid: boolean): Partial<BaseConfig> => ({
    solid,
    label: { ...config.label, style: labelStyleWithSolid(config.label.style, config.solid, solid) },
  })

  const labelTextReport = useTextSettingChanged('Label', 'Text')
  /** Keeps the size where the new shape is measured the same way, and otherwise starts from the shape's usual footprint. */
  const changeShape = (shape: ShapeKind) => {
    if (shape === config.shape) return
    if (isElongated(shape) === elongated) return setFootprint(shape, config.width, config.length)
    const target = DEFAULT_SIZE[shape]
    setFootprint(shape, target.width, target.length ?? target.width)
  }

  return (
    <Panel page="base" resets={resets}>
      <Section title="Shape & Size" first>
        <PictureChoice
          label="Shape"
          value={config.shape}
          defaultValue={BASE_DEFAULTS.shape}
          options={SHAPES.map((shape) => ({ ...shape, picture: BASE_SHAPE_PICTURES[shape.value] }))}
          columns={5}
          onChange={changeShape}
        />
        <Dimension
          label={elongated ? 'Width' : config.shape === 'round' ? 'Diameter' : 'Across corners'}
          value={config.width}
          min={15}
          max={180}
          step={0.5}
          onChange={(next) => setFootprint(config.shape, next, config.length)}
        />
        {elongated && (
          <Dimension
            label="Depth"
            value={config.length}
            min={15}
            max={180}
            step={0.5}
            onChange={(next) => setFootprint(config.shape, config.width, next)}
          />
        )}
        <StandardSizes
          value={standard?.label}
          options={sizes.map((size) => ({ value: size.label, use: size.use }))}
          onChange={(label) => {
            const size = sizes.find((candidate) => candidate.label === label)
            if (!size) return
            setFootprint(config.shape, size.width, size.length ?? size.width)
          }}
        />
      </Section>

      <Section
        title="Magnets"
        aside={
          <span className="readout text-xs text-muted-foreground">
            {config.magnets.count === 0 ? 'none' : `${trimNumber(config.magnets.diameter + config.magnets.clearance)} mm hole`}
          </span>
        }
      >
        {config.magnets.count > 0 && (
          <MagnetSizeFields magnets={config.magnets} maxThickness={maxSharedMagnetThickness} setSharedMagnets={setSharedMagnets} />
        )}
        <PictureChoice
          label="Pocket layout"
          advanced
          value={config.magnets.layout}
          defaultValue={BASE_DEFAULTS.magnets.layout}
          options={magnetLayoutOptions.map((layout) => ({ ...layout, picture: MAGNET_LAYOUT_PICTURES[layout.value] }))}
          columns={4}
          onChange={(layout) => setSharedMagnets({ layout })}
        />
        {config.magnets.layout !== 'five-cross' && (
          <PictureChoice
            label="Magnets per base"
            value={magnetCountValue}
            defaultValue={AUTOMATIC_MAGNET_COUNT}
            options={magnetCountOptions}
            columns={5}
            onChange={setMagnetCount}
          />
        )}
        <FieldDescription>
          {config.magnets.layout === 'five-cross'
            ? 'The cross always provides one centre and four outer pockets.'
            : 'Automatic balances the footprint using the selected magnet dimensions.'}
        </FieldDescription>
      </Section>

      <Section title="Label">
        <ToggleSetting
          label="Labels"
          checked={config.label.enabled}
          defaultChecked={BASE_DEFAULTS.label.enabled}
          onChange={setSharedLabels}
        />
        {config.label.enabled && (
          <>
            <Field>
              <FieldLabel htmlFor="marking-text" className="sr-only">
                Label text
              </FieldLabel>
              <Input
                id="marking-text"
                value={config.label.text ?? ''}
                placeholder={defaultLabel(config)}
                onChange={(e) => patch({ label: { ...config.label, text: labelText(e.currentTarget.value) } })}
                {...labelTextReport}
                className="readout"
              />
              <FieldDescription>Leave empty to label the exact size.</FieldDescription>
            </Field>
            {!(faceUp && hollow) && (
              <PictureChoice
                label="Letters"
                advanced
                value={config.label.style}
                defaultValue={defaultLabelStyle(config.solid)}
                options={LABEL_STYLE_OPTIONS}
                columns={4}
                onChange={(style) => patch({ label: { ...config.label, style } })}
              />
            )}
            <Dimension
              label="Label size"
              advanced
              value={config.label.height}
              min={2}
              max={16}
              step={0.1}
              defaultValue={auto.labelHeight}
              automatic={follows('labelHeight')}
              onChange={(height) => setSized('labelHeight', height, { label: { ...config.label, height } })}
            />
            <Dimension
              label="Label thickness"
              advanced
              value={config.label.emboss}
              min={0.2}
              max={Math.max(0.2, Math.floor((maxLabelDepth(config) + 1e-6) * 10) / 10)}
              step={0.1}
              defaultValue={BASE_DEFAULTS.label.emboss}
              onChange={(emboss) => patch({ label: { ...config.label, emboss } })}
            />
          </>
        )}
      </Section>

      <Section title="Texture">
        <PictureChoice
          label="Pattern"
          value={config.texture.pattern}
          defaultValue={BASE_DEFAULTS.texture.pattern}
          options={TEXTURE_OPTIONS}
          columns={4}
          onChange={(pattern) => {
            patch({
              texture: withPattern(config.texture, pattern),
              ...solidChanges(solidWithPattern(config.solid, config.texture.pattern, pattern)),
            })
          }}
        />
        {config.texture.pattern !== 'none' &&
          (safeTextureDepth(config) < MIN_TEXTURE_DEPTH ? (
            <FieldDescription>
              {config.solid ? 'Raise the base to make room for the joints.' : 'Thicken the top to make room for the joints.'}
            </FieldDescription>
          ) : (
            <>
              <Dimension
                label={TEXTURES.find((texture) => texture.value === config.texture.pattern)!.size}
                value={config.texture.scale}
                min={3}
                max={30}
                step={0.5}
                defaultValue={DEFAULT_TEXTURE[config.texture.pattern].scale}
                onChange={(scale) => patch({ texture: { ...config.texture, scale } })}
              />
              <Dimension
                label={faceUp ? 'Relief height' : 'Joint depth'}
                value={config.texture.depth}
                min={MIN_TEXTURE_DEPTH}
                max={safeTextureDepth(config)}
                step={0.1}
                defaultValue={Math.min(DEFAULT_TEXTURE[config.texture.pattern].depth, safeTextureDepth(config))}
                onChange={(depth) => patch({ texture: { ...config.texture, depth } })}
              />
              {!isRegular(config.texture.pattern) && (
                <>
                  <Dimension
                    label="Irregularity"
                    value={config.texture.irregularity}
                    min={0}
                    max={100}
                    step={5}
                    unit="%"
                    defaultValue={DEFAULT_TEXTURE[config.texture.pattern].irregularity}
                    onChange={(irregularity) => patch({ texture: { ...config.texture, irregularity } })}
                  />
                  <Dimension
                    label="Variation"
                    value={config.texture.seed}
                    min={1}
                    max={MAX_SEED}
                    step={1}
                    unit=""
                    defaultValue={BASE_DEFAULTS.texture.seed}
                    action={{
                      label: 'Shuffle variation',
                      icon: <Shuffle />,
                      onClick: () => patch({ texture: { ...config.texture, seed: 1 + Math.floor(Math.random() * MAX_SEED) } }),
                    }}
                    onChange={(seed) => patch({ texture: { ...config.texture, seed } })}
                  />
                </>
              )}
              {faceUp && (
                <FieldDescription>
                  {hollow
                    ? 'Prints model face up, so the hollow underside opens onto the plate and its roof has to bridge. Supports stand on the plate to shorten the bridges.'
                    : 'Prints model face up. Magnet pockets open underneath, and the label is engraved there.'}
                </FieldDescription>
              )}
            </>
          ))}
      </Section>

      <Section title="Body" aside={<span className="readout text-xs text-muted-foreground">{trimNumber(config.height)}mm</span>}>
        <Dimension
          label="Base height"
          value={config.height}
          min={2}
          max={12}
          step={0.25}
          defaultValue={auto.height}
          automatic={follows('height')}
          onChange={(height) => setSized('height', height, { height })}
        />
        <ToggleSetting label="Solid" checked={config.solid} defaultChecked={faceUp} onChange={(solid) => patch(solidChanges(solid))} />
        {hollow && (
          <Dimension
            label="Top thickness"
            advanced
            value={config.floorThickness}
            min={0.4}
            max={Math.max(0.5, config.height - 0.5)}
            step={0.1}
            defaultValue={auto.floorThickness}
            automatic={follows('floorThickness')}
            onChange={(floorThickness) => setSized('floorThickness', floorThickness, { floorThickness })}
          />
        )}
        <Dimension
          label="Wall thickness"
          advanced
          value={config.wallThickness}
          min={1}
          max={6}
          step={0.1}
          defaultValue={BASE_DEFAULTS.wallThickness}
          onChange={(wallThickness) => setSharedMagnetPlacement({ wallThickness })}
        />
        <PictureChoice
          label="Bottom edge"
          value={config.profile}
          defaultValue={BASE_DEFAULTS.profile}
          options={PROFILE_OPTIONS}
          columns={4}
          onChange={(profile) => patch({ profile })}
        />
        {config.profile !== 'straight' && (
          <Dimension
            label="Edge size"
            advanced
            value={config.profileSize}
            min={0}
            max={safeEdgeSize(config)}
            step={0.1}
            defaultValue={BASE_DEFAULTS.profileSize}
            onChange={(profileSize) => patch({ profileSize })}
          />
        )}
        {config.shape === 'rect' && (
          <Dimension
            label="Corner radius"
            advanced
            value={config.cornerRadius}
            min={0}
            max={12}
            step={0.5}
            defaultValue={auto.cornerRadius}
            automatic={follows('cornerRadius')}
            onChange={(cornerRadius) => setSized('cornerRadius', cornerRadius, { cornerRadius })}
          />
        )}
        {config.shape === 'polygon' && (
          <Dimension
            label="Sides"
            advanced
            value={config.sides}
            min={3}
            max={12}
            step={1}
            unit=""
            defaultValue={BASE_DEFAULTS.sides}
            onChange={(sides) => patch({ sides })}
          />
        )}
        {config.shape === 'polygon' && (
          <Dimension
            label="Rotation"
            advanced
            value={config.rotation}
            min={0}
            max={180}
            step={1}
            unit="°"
            defaultValue={BASE_DEFAULTS.rotation}
            onChange={(rotation) => patch({ rotation })}
          />
        )}
      </Section>

      {hollow && (
        <Section
          title="Internal Supports"
          aside={
            <span className="readout text-xs text-muted-foreground">
              {config.ribs.count === 0 ? 'none' : `${config.ribs.count} spokes`}
            </span>
          }
        >
          {config.magnets.layout !== 'five-cross' && (
            <PictureChoice
              label="Number of supports"
              advanced
              value={follows('ribs') ? AUTOMATIC_MAGNET_COUNT : config.ribs.count}
              defaultValue={AUTOMATIC_MAGNET_COUNT}
              options={[{ value: AUTOMATIC_MAGNET_COUNT, label: `Auto · ${auto.ribs}`, picture: ribPicture(auto.ribs) }, ...RIB_COUNTS]}
              columns={4}
              onChange={(count) =>
                patch({
                  ribs: { ...config.ribs, count: count === AUTOMATIC_MAGNET_COUNT ? auto.ribs : count },
                  pinned:
                    count === AUTOMATIC_MAGNET_COUNT
                      ? config.pinned.filter((key) => key !== 'ribs')
                      : [...new Set([...config.pinned, 'ribs' as const])],
                })
              }
            />
          )}
          {config.ribs.count > 0 && (
            <>
              <Dimension
                label="Support thickness"
                advanced
                value={config.ribs.thickness}
                min={0.8}
                max={4}
                step={0.1}
                defaultValue={BASE_DEFAULTS.ribs.thickness}
                onChange={(thickness) => patch({ ribs: { ...config.ribs, thickness } })}
              />
              {!faceUp && (
                <Dimension
                  label="Support height"
                  advanced
                  value={config.ribs.height}
                  min={0.4}
                  max={Math.max(0.5, config.height - config.floorThickness)}
                  step={0.1}
                  defaultValue={BASE_DEFAULTS.ribs.height}
                  onChange={(height) => patch({ ribs: { ...config.ribs, height } })}
                />
              )}
            </>
          )}
        </Section>
      )}

      {config.magnets.count > 0 && (
        <Section
          title="Magnet Fit"
          aside={<span className="readout text-xs text-muted-foreground">Ø{trimNumber(config.magnets.clearance)} fit</span>}
        >
          <MagnetClearanceField magnets={config.magnets} setSharedMagnets={setSharedMagnets} />
          <Dimension
            label="Magnet depth clearance"
            advanced
            value={config.magnets.depthClearance}
            min={0}
            max={maxSharedDepthClearance}
            step={0.05}
            defaultValue={BASE_DEFAULTS.magnets.depthClearance}
            onChange={(depthClearance) => setSharedMagnets({ depthClearance })}
          />
          <Dimension
            label="Wall around pocket"
            advanced
            value={config.magnets.bossWall}
            min={0.4}
            max={3}
            step={0.1}
            defaultValue={BASE_DEFAULTS.magnets.bossWall}
            onChange={(bossWall) => setSharedMagnetPlacement({ bossWall })}
          />
        </Section>
      )}

      <Section
        title="Batch"
        aside={batchTotal > 0 ? <span className="readout text-xs text-muted-foreground">{batchTotal} bases</span> : undefined}
      >
        {batch.map((entry, index) => {
          const text = entryText(entry)
          return (
            <div
              key={`${entry.shape}:${entry.width}x${entry.length}`}
              className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2"
            >
              <Dimension
                label={`Quantity of ${text}`}
                value={entry.quantity}
                min={1}
                max={100}
                step={1}
                unit=""
                compact
                onChange={(quantity) => setQuantity(index, Math.round(quantity))}
              />
              <span className="readout truncate text-xs">{text}</span>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Remove ${text} from batch`}
                onClick={() => {
                  posthog.capture('base_batch_size_removed', { sizes: batch.length - 1 })
                  setBatch((current) => current.filter((_, entryIndex) => entryIndex !== index))
                }}
              >
                <Trash2 />
              </Button>
            </div>
          )
        })}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            posthog.capture('base_batch_size_added', { shape: config.shape, width, length })
            setBatch((current) => addToBatch(current, config))
          }}
        >
          <Plus /> Add {sizeText(config, '×')} to batch
        </Button>
        {batch.length > 0 && (
          <ButtonGroup className="w-full [&>*]:flex-1">
            <Button size="sm" onClick={exportBatchStl} disabled={exporting !== undefined}>
              <Download />
              {exporting === 'batch-stl' ? 'Building STLs' : 'Batch STLs'}
            </Button>
            <Button size="sm" variant="outline" onClick={exportBatch3mf} disabled={exporting !== undefined}>
              <Box />
              {exporting === 'batch-3mf' ? 'Building 3MF' : 'Batch 3MF'}
            </Button>
          </ButtonGroup>
        )}
      </Section>
    </Panel>
  )
}
