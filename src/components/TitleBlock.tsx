import { counterRange } from '@/core/geometry/counter'
import { Badge } from '@/components/ui/badge'
import { defaultLabel, trimNumber } from '@/core/geometry/outline'
import { paintingHandleDescription, paintingTrayLayout, paintingTrayMagnetPocketCount } from '@/core/geometry/paintingTray'
import { holderGroupLabel, holderLayout, holderMagnetPocketCount, holderPlan } from '@/core/geometry/holder'
import { paintRackLayout, paintRackLoadout } from '@/core/geometry/paintRack'
import { stemOverallHeight } from '@/core/geometry/stem'
import { filamentEstimate } from '@/lib/filament'
import type { PartConfig } from '@/core/geometry/types'

interface Props {
  config: PartConfig
  /**
   * Only whether the config builds. There is deliberately no pending preview
   * state: a typical rebuild takes about 15ms, so a spinner would strobe on every
   * drag step without ever telling anyone anything.
   */
  status: 'ready' | 'blocked'
  name: string
  /** Weight of the solid the preview last built; absent until the first build. */
  grams?: number
}

/** `truncate` keeps free-form values such as filenames to one line. */
function Row({ label, value, truncate = false }: { label: string; value: string; truncate?: boolean }) {
  return (
    <>
      <dt className="note">{label}</dt>
      <dd className={`readout pr-3 text-right ${truncate ? 'min-w-0 truncate' : ''}`}>{value}</dd>
    </>
  )
}

/**
 * The title block of a drawing: what the part is, in the corner of the sheet. It
 * replaces a status bar rather than adding to one.
 */
export function TitleBlock({ config, status, name, grams }: Props) {
  return (
    // On a phone only the name and status show, in a strip along the foot, so the part keeps most of the screen.
    <footer className="pointer-events-none absolute inset-x-3 bottom-3 border-2 border-measure/50 bg-card/90 text-card-foreground backdrop-blur-sm sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-72">
      <div className="flex items-center gap-2 px-3 py-2 sm:border-b-2 sm:border-measure/50">
        <span className="readout truncate text-xs text-measure">{name}</span>
        <Badge variant={status === 'blocked' ? 'destructive' : 'secondary'} className="note ms-auto">
          {status}
        </Badge>
      </div>

      {/* Only what the dimension leaders do not show. Nothing here claims the mesh is watertight, which only a real
          export can prove, and the weight is of the solid, which a slicer's walls and infill print lighter. */}
      <dl className="grid grid-cols-[5.5rem_1fr] items-baseline text-xs max-sm:hidden *:py-1 [&>dd]:pl-3 [&>dt]:border-r [&>dt]:border-border [&>dt]:px-3">
        <PartRows config={config} />
        {grams !== undefined && <Row label="Filament" value={filamentEstimate(grams)} />}
      </dl>
    </footer>
  )
}

function PartRows({ config }: { config: PartConfig }) {
  if (config.kind === 'token') {
    return (
      <>
        <Row truncate label="Text" value={config.text.trim() ? `“${config.text.trim()}”` : 'none'} />
        <Row truncate label="Image" value={config.image?.name ?? 'none'} />
        <Row label="Top edge" value={config.profile === 'straight' ? 'square' : `${trimNumber(config.profileSize)}mm ${config.profile}`} />
      </>
    )
  }
  if (config.kind === 'counter') {
    return (
      <>
        <Row label="Counts" value={counterRange(config)} />
      </>
    )
  }
  if (config.kind === 'paint-rack') {
    const layout = paintRackLayout(config)
    return (
      <>
        <Row label="Loadout" value={paintRackLoadout(config)} />
        <Row label="Bottles" value={`${layout.bottles} in ${trimNumber(config.pitch)} mm cells`} />
        {layout.brushes > 0 && <Row label="Brushes" value={`${layout.brushes} × Ø${trimNumber(config.brushDiameter)} mm`} />}
        <Row label="Rise" value={`${trimNumber(config.rise)} mm per row`} />
      </>
    )
  }
  if (config.kind === 'stem') {
    return (
      <>
        <Row label="Overall" value={`${trimNumber(stemOverallHeight(config))} mm`} />
        {config.connection === 'peg' ? (
          <Row label="Model peg" value={`Ø${trimNumber(config.modelPegDiameter)} × ${trimNumber(config.modelPegLength)} mm`} />
        ) : (
          <Row label="Ball joint" value={`Ø${trimNumber(config.ballDiameter)} mm`} />
        )}
      </>
    )
  }
  if (config.kind === 'holder') {
    const layout = holderLayout(config)
    const plan = holderPlan(config)
    const pocket = trimNumber(config.magnets.diameter + config.magnets.clearance)
    const slots = config.groups.map((group) => `${group.quantity}×${holderGroupLabel(group)}`).join(' · ')
    return (
      <>
        <Row label="Models" value={slots} />
        <Row label="Modules" value={`${plan.modules.length} in ${layout.unitsWide} × ${layout.unitsDeep}`} />
        {plan.omitted.length > 0 && (
          <Row label="Overflow" value={plan.omitted.map((group) => `${group.quantity}×${holderGroupLabel(group)}`).join(' · ')} />
        )}
        <Row label="Magnets" value={config.magnets.enabled ? `${holderMagnetPocketCount(config)} × ${pocket} mm hole` : 'none'} />
      </>
    )
  }
  if (config.kind === 'painting-tray') {
    const layout = paintingTrayLayout(config)
    const pocket = trimNumber(config.magnets.diameter + config.magnets.clearance)
    return (
      <>
        <Row
          label="Grid"
          value={`${layout.columns}×${layout.rows} + ${Math.max(0, layout.columns - 1)}×${Math.max(0, layout.rows - 1)} · ${trimNumber(config.spacing)} mm pitch`}
        />
        <Row label="Tray" value={`${trimNumber(layout.width)} × ${trimNumber(layout.length)} × ${trimNumber(config.height)} mm`} />
        <Row label="Magnets" value={`${paintingTrayMagnetPocketCount(config)} × ${pocket} mm hole`} />
        <Row label="Handle" value={paintingHandleDescription(config)} />
      </>
    )
  }
  const pocket = trimNumber(config.magnets.diameter + config.magnets.clearance)
  const pocketDepth = trimNumber(config.magnets.thickness + config.magnets.depthClearance)

  return (
    <>
      <Row
        label="Magnets"
        value={config.magnets.count === 0 ? 'none' : `${config.magnets.count} × ${pocket} mm hole · ${pocketDepth}mm deep`}
      />
      <Row label="Label" value={config.label.enabled ? `“${config.label.text?.trim() || defaultLabel(config)}”` : 'none'} />
    </>
  )
}
