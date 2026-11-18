import { Boxes, Code2, RotateCcw, Signpost } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Dimension } from '@/components/controls'
import { Button, buttonVariants } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { maxHolderSlotDepth, minHolderHeight } from '@/core/geometry/holder'
import { DEFAULT_PRESET, presetFor } from '@/core/geometry/presets'
import { maxProfileSize } from '@/core/geometry/profile'
import { maxTextureDepth } from '@/core/geometry/texture'
import type { BaseConfig, EdgeProfile, HolderConfig, MagnetLayout } from '@/core/geometry/types'
import { PAGES, type Page } from '@/lib/pages'
import { useTour } from '@/lib/tour'

export const PROFILES: { value: EdgeProfile; label: string }[] = [
  { value: 'taper', label: 'Taper' },
  { value: 'bevel', label: 'Bevel' },
  { value: 'round', label: 'Round' },
  { value: 'straight', label: 'Straight' },
]

export const MAGNET_LAYOUTS: { value: MagnetLayout; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'five-cross', label: 'Five-pocket cross' },
]
export const AUTOMATIC_MAGNET_COUNT = 'auto'
export type MagnetCountChoice = number | typeof AUTOMATIC_MAGNET_COUNT
export const BASE_DEFAULTS = presetFor(DEFAULT_PRESET)

export type SharedMagnetChanges = Partial<Pick<BaseConfig['magnets'], 'layout' | 'diameter' | 'thickness' | 'clearance' | 'depthClearance'>>
export type SharedMagnetPlacementChanges = Partial<Pick<BaseConfig, 'wallThickness'> & { bossWall: number }>

export const safeEdgeSize = (next: BaseConfig) => Math.floor((maxProfileSize(next) + 1e-6) * 10) / 10
export const safeTextureDepth = (next: BaseConfig) => Math.floor((maxTextureDepth(next) + 1e-6) * 10) / 10

export const fitSlotDepth = (next: HolderConfig) => ({
  ...next,
  ...(maxHolderSlotDepth(next) < 1
    ? { height: minHolderHeight({ ...next, slotDepth: 1 }), slotDepth: 1 }
    : { slotDepth: Math.min(next.slotDepth, Math.floor(maxHolderSlotDepth(next) / 0.5) * 0.5) }),
})

type MagnetSize = Pick<BaseConfig['magnets'], 'diameter' | 'thickness' | 'clearance'>

/** Magnets are shared across generators, so their size reads and writes the same everywhere. */
export function MagnetSizeFields({
  magnets,
  maxThickness,
  setSharedMagnets,
}: {
  magnets: MagnetSize
  maxThickness: number
  setSharedMagnets: (changes: SharedMagnetChanges) => void
}) {
  return (
    <>
      <Dimension
        label="Magnet diameter"
        value={magnets.diameter}
        min={2}
        max={8}
        step={0.5}
        defaultValue={BASE_DEFAULTS.magnets.diameter}
        onChange={(diameter) => setSharedMagnets({ diameter })}
      />
      <Dimension
        label="Magnet thickness"
        value={magnets.thickness}
        min={0.5}
        max={maxThickness}
        step={0.1}
        defaultValue={BASE_DEFAULTS.magnets.thickness}
        onChange={(thickness) => setSharedMagnets({ thickness })}
      />
    </>
  )
}

export function MagnetClearanceField({
  magnets,
  setSharedMagnets,
}: {
  magnets: MagnetSize
  setSharedMagnets: (changes: SharedMagnetChanges) => void
}) {
  return (
    <Dimension
      label="Magnet diameter clearance"
      advanced
      value={magnets.clearance}
      min={0}
      max={0.6}
      step={0.05}
      defaultValue={BASE_DEFAULTS.magnets.clearance}
      onChange={(clearance) => setSharedMagnets({ clearance })}
    />
  )
}

export interface ResetAction {
  label: string
  description: string
  onReset: () => void
}

function ResetButton({ label, description, onReset }: ResetAction) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" variant="ghost" className="text-muted-foreground" />}>
        <RotateCcw />
        Reset {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset {label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onReset()
              setOpen(false)
            }}
          >
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const footerLink = buttonVariants({ variant: 'link', size: 'sm', className: 'text-muted-foreground' })

export function Panel({ page, resets, children }: { page: Page['value']; resets: ResetAction[]; children: ReactNode }) {
  const { name, makerworld } = PAGES.find((item) => item.value === page)!
  return (
    <ScrollArea className="h-full w-81 max-w-[85vw] shrink-0 border-border bg-card md:border-r">
      {/* Sections number themselves off this counter, in the order they appear. */}
      <aside aria-label={`${name} settings`} className="relative flex min-h-full flex-col pb-4 [counter-reset:schedule]">
        {children}
        <PanelFooter makerworld={makerworld} resets={resets} />
      </aside>
    </ScrollArea>
  )
}

function PanelFooter({ makerworld, resets }: { makerworld: string; resets: ResetAction[] }) {
  const startTour = useTour()
  return (
    // Pushed to the foot of the panel, so it sits at the bottom however few settings show.
    <div className="mt-auto flex flex-col items-center gap-1 border-t border-border px-5 pt-4">
      <div className="flex flex-wrap justify-center gap-1">
        {resets.map((reset) => (
          <ResetButton key={reset.label} {...reset} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        <button type="button" onClick={() => startTour()} className={footerLink}>
          <Signpost className="size-3.5" />
          Tour
        </button>
        <a href={makerworld} target="_blank" rel="noreferrer" className={footerLink}>
          <Boxes className="size-3.5" />
          MakerWorld
        </a>
        <a href="https://github.com/richardsolomou/hobbykit.app" target="_blank" rel="noreferrer" className={footerLink}>
          <Code2 className="size-3.5" />
          GitHub
        </a>
      </div>
    </div>
  )
}
