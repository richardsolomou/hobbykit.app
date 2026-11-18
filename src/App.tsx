import { FilamentSwatches } from '@/components/FilamentSwatches'
import type { FilamentColours } from '@/core/geometry/filaments'
import { Box, Download, Link, PanelLeft, UnfoldHorizontal } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { BasePanel } from '@/components/panels/BasePanel'
import { HolderPanel } from '@/components/panels/HolderPanel'
import { PaintingTrayPanel } from '@/components/panels/PaintingTrayPanel'
import { PaintRackPanel } from '@/components/panels/PaintRackPanel'
import {
  AUTOMATIC_MAGNET_COUNT,
  fitSlotDepth,
  safeEdgeSize,
  safeTextureDepth,
  type MagnetCountChoice,
  type ResetAction,
  type SharedMagnetChanges,
  type SharedMagnetPlacementChanges,
} from '@/components/panels/shared'
import { StemPanel } from '@/components/panels/StemPanel'
import { TokenPanel } from '@/components/panels/TokenPanel'
import { CounterPanel } from '@/components/panels/CounterPanel'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Toggle } from '@/components/ui/toggle'
import { TourInvite } from '@/components/TourInvite'
import { runTour, TOUR_DONE, TourContext, touring, useTourProgress, type Drawer } from '@/lib/tour'
import { TitleBlock } from '@/components/TitleBlock'
import { Viewer } from '@/components/Viewer'
import { holderLayout, holderName, holderPlan, maxHolderMagnetThickness } from '@/core/geometry/holder'
import { baseName, footprint, isElongated } from '@/core/geometry/outline'
import { footprintKey } from '@/core/geometry/presets'
import { isRelief } from '@/core/geometry/texture'
import { maxTokenEdgeSize, tokenFootprint, tokenHeight, tokenName } from '@/core/geometry/token'
import {
  paintingHandleAxisCenter,
  paintingTrayAssemblyHeight,
  paintingTrayAssemblyMinZ,
  paintingTrayExplodedFrame,
  paintingTrayLayout,
  paintingTrayName,
} from '@/core/geometry/paintingTray'
import { paintRackLayout, paintRackName } from '@/core/geometry/paintRack'
import { stemMaximumDiameter, stemName, stemOverallHeight } from '@/core/geometry/stem'
import { counterLayout, counterName } from '@/core/geometry/counter'
import type {
  BaseConfig,
  FlightStemConfig,
  TokenConfig,
  HolderConfig,
  PaintingTrayConfig,
  PaintRackConfig,
  CounterConfig,
  PartConfig,
} from '@/core/geometry/types'
import { loadTokenImage } from '@/lib/tokenImage'
import { batchBaseConfig, batchName } from '@/lib/batch'
import { useExport } from '@/lib/useExport'
import { useGenerator } from '@/lib/useGenerator'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { PAGES } from '@/lib/pages'
import { posthog } from 'posthog-js'
import { applyBase } from '@/lib/baseLink'
import { shareLink, type SharedLink } from '@/lib/shareLink'
import {
  applyWorkspaceSetup,
  loadWorkspace,
  resetGenerator,
  resetShared,
  saveWorkspace,
  synchronizeWorkspace,
  type WorkspaceState,
} from '@/lib/workspace'

type Generator = (typeof PAGES)[number]['value']

/** A caddy is as deep as it is tall, and its near edges loom past a frame fitted to its largest side. */
const COUNTER_FRAMING_SCALE = 1.4

const modelForPath = (): Generator => PAGES.find((item) => item.href === window.location.pathname)?.value ?? 'base'

const SHARE_NOTICE_MS = 5000

/** `sharedLink` is what a share or base link carried, laid over the saved workspace. */
export function App({ sharedLink }: { sharedLink?: SharedLink }) {
  const [opened] = useState(() => {
    const saved = loadWorkspace(window.localStorage)
    const shared =
      sharedLink === undefined
        ? undefined
        : 'base' in sharedLink
          ? { workspace: applyBase(saved, sharedLink.base), part: 'base' as const }
          : applyWorkspaceSetup(saved, sharedLink.setup)
    return {
      workspace: shared?.workspace ?? saved,
      model: shared ? PAGES.find((item) => item.part === shared.part)!.value : modelForPath(),
    }
  })
  const [workspace, setWorkspaceState] = useState(opened.workspace)
  const config = workspace.base
  const holder = workspace.holder
  const paintingTray = workspace.paintingTray
  const paintRack = workspace.paintRack
  const stem = workspace.stem
  const token = workspace.token
  const counter = workspace.counter
  const setWorkspace = (next: WorkspaceState | ((current: WorkspaceState) => WorkspaceState)) =>
    setWorkspaceState((current) => synchronizeWorkspace(typeof next === 'function' ? next(current) : next))
  const setConfig = (next: BaseConfig | ((current: BaseConfig) => BaseConfig)) =>
    setWorkspace((current) => ({ ...current, base: typeof next === 'function' ? next(current.base) : next }))
  const setHolder = (next: HolderConfig) => setWorkspace((current) => ({ ...current, holder: next }))
  const setPaintingTray = (next: PaintingTrayConfig) => setWorkspace((current) => ({ ...current, paintingTray: next }))
  const setPaintRack = (next: PaintRackConfig) => setWorkspace((current) => ({ ...current, paintRack: next }))
  const setStem = (next: FlightStemConfig) => setWorkspace((current) => ({ ...current, stem: next }))
  const setCounter = (next: CounterConfig) => setWorkspace((current) => ({ ...current, counter: next }))
  const setFilaments = (filaments: FilamentColours) => setWorkspace((current) => ({ ...current, filaments }))
  const patchToken = (changes: Partial<TokenConfig>) =>
    setWorkspace((current) => {
      const next = { ...current.token, ...changes }
      return {
        ...current,
        token: {
          ...next,
          cornerRadius: Math.min(next.cornerRadius, next.size / 2),
          profileSize: Math.min(next.profileSize, maxTokenEdgeSize(next)),
          emboss: Math.max(next.emboss, 1 - next.thickness),
        },
      }
    })
  const [model, setModel] = useState<Generator>(opened.model)
  /** A view of the preview, not part of the design, so it is neither saved nor shared. */
  const [exploded, setExploded] = useState(false)
  const explodable = model === 'painting' || model === 'counter'
  const page = PAGES.find((item) => item.value === model)!
  const [tokenImageError, setTokenImageError] = useState<string>()
  const addTokenImage = async (file: File) => {
    setTokenImageError(undefined)
    try {
      const image = await loadTokenImage(file)
      posthog.capture('token_image_added', { width: image.width, height: image.height, type: file.type })
      patchToken({ image })
    } catch (failure) {
      setTokenImageError(failure instanceof Error ? failure.message : String(failure))
    }
  }
  useEffect(() => {
    if (sharedLink && 'base' in sharedLink) posthog.capture('base_link_opened', { shape: sharedLink.base.shape })
  }, [sharedLink])
  const dropTokenImage = useEffectEvent((file: File) => void addTokenImage(file))
  useEffect(() => {
    if (model !== 'token') return
    const accept = (event: DragEvent) => event.preventDefault()
    const drop = (event: DragEvent) => {
      event.preventDefault()
      const file = event.dataTransfer?.files[0]
      if (file) dropTokenImage(file)
    }
    window.addEventListener('dragover', accept)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', accept)
      window.removeEventListener('drop', drop)
    }
  }, [model])
  // Tailwind's `md`, the width at which the panel stops needing to slide in.
  const docked = useMediaQuery('(min-width: 48rem)')
  const partConfig: PartConfig =
    model === 'base'
      ? config
      : model === 'holder'
        ? holder
        : model === 'painting'
          ? paintingTray
          : model === 'rack'
            ? paintRack
            : model === 'stem'
              ? stem
              : model === 'token'
                ? token
                : counter
  const previewConfig = explodable ? { ...partConfig, exploded } : partConfig
  const { preview, built, grams, error } = useGenerator(previewConfig)
  const reached = useTourProgress(model)
  const unfinished = reached !== undefined && reached !== TOUR_DONE
  const [drawerOpen, setDrawerOpen] = useState(false)
  // The tour reads and moves the drawer from outside React, so it goes through a ref and waits for each slide to finish.
  const drawerState = useRef({ open: false, settled: () => {} })
  const drawer: Drawer = {
    isOpen: () => drawerState.current.open,
    setOpen: (open) =>
      new Promise((settled) => {
        drawerState.current = { open, settled }
        setDrawerOpen(open)
      }),
  }
  const startTour = (mode?: 'first') => void runTour(model, mode ?? (unfinished ? 'resume' : 'replay'), docked ? undefined : drawer)

  useEffect(() => {
    const href = PAGES.find((item) => item.value === opened.model)!.href
    if (window.location.pathname !== href) window.history.replaceState(null, '', href + window.location.search + window.location.hash)
  }, [opened])

  const [shareNotice, setShareNotice] = useState<{ text: string }>()
  useEffect(() => {
    if (!shareNotice) return
    const timer = window.setTimeout(() => setShareNotice(undefined), SHARE_NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [shareNotice])
  const copyLink = async () => {
    const { url, imageOmitted } = shareLink(`${window.location.origin}${page.href}`, workspace, page.part)
    try {
      await navigator.clipboard.writeText(url)
      posthog.capture('share_link_copied', { generator: model, image_omitted: imageOmitted })
      setShareNotice({ text: imageOmitted ? 'Link copied without the image, which would make it too long to share' : 'Link copied' })
    } catch {
      setShareNotice({ text: 'The browser blocked copying the link' })
    }
  }

  useEffect(() => {
    const syncRoute = () => setModel(modelForPath())
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    document.title = `${page.title} — HobbyKit`
  }, [page])

  useEffect(() => saveWorkspace(window.localStorage, workspace), [workspace])

  const generators = useRef<HTMLElement>(null)
  useEffect(() => {
    generators.current?.querySelector(`[href="${page.href}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [page])

  const changeModel = (next: Generator) => {
    if (next === model) return
    posthog.capture('generator_selected', { generator: next })
    window.history.pushState(null, '', PAGES.find((item) => item.value === next)!.href)
    setModel(next)
  }

  const patch = (changes: Partial<BaseConfig>) =>
    setConfig((current) => {
      const next = { ...current, ...changes }
      return {
        ...next,
        profileSize: Math.min(next.profileSize, safeEdgeSize(next)),
        texture: { ...next.texture, depth: Math.min(next.texture.depth, safeTextureDepth(next)) },
      }
    })
  const { width, length } = footprint(config)
  const holderSize = useMemo(() => holderLayout(holder), [holder])
  const paintingSize = useMemo(() => paintingTrayLayout(paintingTray), [paintingTray])
  const rackSize = useMemo(() => paintRackLayout(paintRack), [paintRack])
  const maxBaseMagnetThickness = Math.max(0.5, config.height - config.floorThickness) - config.magnets.depthClearance
  const maxSharedMagnetThickness = Math.max(0.5, Math.min(maxBaseMagnetThickness, Math.floor(maxHolderMagnetThickness(holder) * 10) / 10))
  const maxBaseDepthClearance = config.height - config.floorThickness - config.magnets.thickness
  const maxHolderDepthClearance = maxHolderMagnetThickness(holder) + holder.magnets.depthClearance - holder.magnets.thickness
  const maxSharedDepthClearance = Math.max(0, Math.min(0.5, maxBaseDepthClearance, maxHolderDepthClearance))
  const plan = useMemo(() => holderPlan(holder), [holder])
  const stemDiameter = stemMaximumDiameter(stem)
  const counterSize = counterLayout(counter)
  const partWidth =
    model === 'base'
      ? width
      : model === 'holder'
        ? holderSize.width
        : model === 'painting'
          ? paintingSize.width
          : model === 'rack'
            ? rackSize.width
            : model === 'stem'
              ? stemDiameter
              : model === 'token'
                ? tokenFootprint(token).width
                : counterSize.width
  const partLength =
    model === 'base'
      ? length
      : model === 'holder'
        ? holderSize.length
        : model === 'painting'
          ? paintingSize.length
          : model === 'rack'
            ? rackSize.length
            : model === 'stem'
              ? stemDiameter
              : model === 'token'
                ? tokenFootprint(token).length
                : counterSize.length
  const partHeight =
    model === 'base'
      ? config.height
      : model === 'holder'
        ? holder.height
        : model === 'painting'
          ? paintingTrayAssemblyHeight(paintingTray)
          : model === 'rack'
            ? rackSize.height
            : model === 'stem'
              ? stemOverallHeight(stem)
              : model === 'token'
                ? tokenHeight(token)
                : counterSize.height
  /** What the viewer frames, which takes in the parts' new positions while exploded. */
  const framed = (() => {
    if (model === 'painting' && exploded) {
      const frame = paintingTrayExplodedFrame(paintingTray)
      return { ...frame, minZ: frame.target[2] - frame.height / 2, orbitTarget: frame.target }
    }
    if (model === 'counter' && exploded) return counterLayout({ ...counter, exploded })
    return {
      width: partWidth,
      length: partLength,
      height: partHeight,
      minZ: model === 'painting' ? paintingTrayAssemblyMinZ(paintingTray) : 0,
      orbitTarget: model === 'painting' ? paintingHandleAxisCenter(paintingTray) : undefined,
    }
  })()
  const partName =
    model === 'base'
      ? baseName(config)
      : model === 'holder'
        ? holderName(holder)
        : model === 'painting'
          ? paintingTrayName(paintingTray)
          : model === 'rack'
            ? paintRackName(paintRack)
            : model === 'stem'
              ? stemName(stem)
              : model === 'token'
                ? tokenName(token)
                : counterName(counter)
  const batch = useMemo(
    () => workspace.batch.map((entry) => ({ config: batchBaseConfig(workspace, entry), quantity: entry.quantity })),
    [workspace],
  )
  const {
    exporting,
    error: exportError,
    exportStl,
    export3mf,
    exportBatchStl,
    exportBatch3mf,
    exportRackPiece,
  } = useExport({
    model,
    config: partConfig,
    name: partName,
    filaments: workspace.filaments,
    width: partWidth,
    length: partLength,
    batch,
    batchName: batchName(workspace.batch),
  })
  const elongated = isElongated(config.shape)
  const magnetCountKey = footprintKey(config.shape, config.width, config.length)
  const magnetCountValue = (key: string): MagnetCountChoice => workspace.shared.magnetCounts[key] ?? AUTOMATIC_MAGNET_COUNT

  const setSharedMagnets = (changes: SharedMagnetChanges) => {
    setWorkspace((current) => ({
      ...current,
      shared: { ...current.shared, magnets: { ...current.shared.magnets, ...changes } },
    }))
  }

  const setMagnetCount = (key: string) => (count: MagnetCountChoice) =>
    setWorkspace((current) => {
      const magnetCounts = { ...current.shared.magnetCounts }
      if (count === AUTOMATIC_MAGNET_COUNT) delete magnetCounts[key]
      else magnetCounts[key] = count
      return { ...current, shared: { ...current.shared, magnetCounts } }
    })

  const setSharedLabels = (labelsEnabled: boolean) =>
    setWorkspace((current) => ({
      ...current,
      shared: { ...current.shared, labelsEnabled },
      holder: labelsEnabled
        ? fitSlotDepth({ ...current.holder, engraving: { ...current.holder.engraving, enabled: true } })
        : current.holder,
    }))

  const setSharedMagnetPlacement = (changes: SharedMagnetPlacementChanges) => {
    setWorkspace((current) => {
      const shared = {
        ...current.shared,
        ...('wallThickness' in changes ? { wallThickness: changes.wallThickness } : {}),
        ...('bossWall' in changes ? { magnetBossWall: changes.bossWall } : {}),
      }
      const base = {
        ...current.base,
        wallThickness: shared.wallThickness,
        magnets: { ...current.base.magnets, bossWall: shared.magnetBossWall },
      }
      return {
        ...current,
        shared,
        base: { ...base, profileSize: Math.min(base.profileSize, safeEdgeSize(base)) },
      }
    })
  }

  const resetPart = (shared: boolean): ResetAction => {
    const { part } = page
    const label = page.name.toLowerCase()
    return {
      label,
      description: `Every ${label} setting returns to its default${part === 'base' ? ' and the batch list empties' : ''}. ${shared ? 'Shared settings and the' : 'The'} other generators keep their values.`,
      onReset: () => {
        posthog.capture('settings_reset', { scope: part })
        if (part === 'token') setTokenImageError(undefined)
        setWorkspace((current) => resetGenerator(current, part))
      },
    }
  }
  const resetSharedSettings: ResetAction = {
    label: 'shared settings',
    description:
      'Magnet size and fit, pocket layout, magnet counts, wall thickness, magnet boss wall and the labels toggle return to their defaults on bases, holders and spray trays.',
    onReset: () => {
      posthog.capture('settings_reset', { scope: 'shared' })
      setWorkspace(resetShared)
    },
  }

  const panel =
    model === 'base' ? (
      <BasePanel
        config={config}
        setConfig={setConfig}
        patch={patch}
        magnetCountValue={magnetCountValue(magnetCountKey)}
        setMagnetCount={setMagnetCount(magnetCountKey)}
        maxSharedMagnetThickness={maxSharedMagnetThickness}
        maxSharedDepthClearance={maxSharedDepthClearance}
        setSharedMagnets={setSharedMagnets}
        setSharedLabels={setSharedLabels}
        setSharedMagnetPlacement={setSharedMagnetPlacement}
        batch={workspace.batch}
        setBatch={(next) => setWorkspace((current) => ({ ...current, batch: next(current.batch) }))}
        exporting={exporting}
        exportBatchStl={exportBatchStl}
        exportBatch3mf={exportBatch3mf}
        resets={[resetPart(true), resetSharedSettings]}
      />
    ) : model === 'holder' ? (
      <HolderPanel
        holder={holder}
        setHolder={setHolder}
        holderSize={holderSize}
        plan={plan}
        maxSharedMagnetThickness={maxSharedMagnetThickness}
        maxSharedDepthClearance={maxSharedDepthClearance}
        setSharedMagnets={setSharedMagnets}
        setSharedLabels={setSharedLabels}
        resets={[resetPart(true), resetSharedSettings]}
      />
    ) : model === 'painting' ? (
      <PaintingTrayPanel
        paintingTray={paintingTray}
        setPaintingTray={setPaintingTray}
        paintingSize={paintingSize}
        maxSharedMagnetThickness={maxSharedMagnetThickness}
        maxSharedDepthClearance={maxSharedDepthClearance}
        setSharedMagnets={setSharedMagnets}
        resets={[resetPart(true), resetSharedSettings]}
      />
    ) : model === 'rack' ? (
      <PaintRackPanel
        paintRack={paintRack}
        setPaintRack={setPaintRack}
        exporting={exporting !== undefined}
        exportPiece={exportRackPiece}
        resets={[resetPart(false)]}
      />
    ) : model === 'stem' ? (
      <StemPanel stem={stem} setStem={setStem} resets={[resetPart(false)]} />
    ) : model === 'counter' ? (
      <CounterPanel counter={counter} setCounter={setCounter} filaments={workspace.filaments} resets={[resetPart(false)]} />
    ) : (
      <TokenPanel
        token={token}
        patchToken={patchToken}
        addTokenImage={addTokenImage}
        tokenImageError={tokenImageError}
        resets={[resetPart(false)]}
      />
    )

  return (
    <TourContext value={startTour}>
      <div className="flex h-full flex-col bg-background">
        {/* One row on a wide screen; narrower than that the generators drop to a full-width row of their own, so none is cut off or slides under the name. */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 border-b border-border px-4 max-xl:pt-2 sm:gap-x-3 sm:px-5 xl:flex-nowrap">
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {/* Same panel, same order; on a narrow screen it slides in from the left
              instead of standing beside the sheet. */}
            {!docked && (
              <Sheet
                open={drawerOpen}
                onOpenChange={(open) => {
                  // A click on the tour's popover lands outside the drawer; the tour opens and closes it itself.
                  if (touring()) return
                  drawerState.current = { ...drawerState.current, open }
                  setDrawerOpen(open)
                }}
                onOpenChangeComplete={() => drawerState.current.settled()}
              >
                <SheetTrigger
                  render={<Button size="icon-sm" variant="outline" aria-label={`${page.name} settings`} data-tour="settings" />}
                >
                  <PanelLeft />
                </SheetTrigger>
                <SheetContent side="left" className="max-w-[85vw] gap-0 p-0 data-[side=left]:w-81">
                  {/* A header row of its own, so the close button has somewhere to sit
                    that is not on top of the first section heading. */}
                  <SheetHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-border px-5 py-3.5 pr-12">
                    <SheetTitle className="note truncate">
                      <span aria-hidden>{page.mobileLabel}</span>
                      <span className="sr-only">{page.name} settings</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex min-h-0 flex-1 flex-col">{panel}</div>
                </SheetContent>
              </Sheet>
            )}
            {/* Names the generator for search engines and screen readers, which read the page after it mounts. */}
            <h1 className="shrink-0 py-3 text-sm font-medium tracking-[0.18em] uppercase max-sm:py-0 max-sm:text-xs max-sm:tracking-[0.12em] max-[22rem]:sr-only">
              Hobby<span className="text-measure">Kit</span>
              <span className="sr-only"> — {page.title}</span>
            </h1>
          </div>
          <nav
            ref={generators}
            aria-label="Generators"
            className="flex min-w-0 self-stretch overflow-x-auto [scrollbar-width:none] max-xl:order-last max-xl:-mx-4 max-xl:mt-2 max-xl:w-[calc(100%+2rem)] max-xl:justify-between max-xl:border-t max-xl:border-border max-xl:px-2 max-xl:py-2.5 sm:max-xl:-mx-5 sm:max-xl:w-[calc(100%+2.5rem)] sm:max-xl:justify-start sm:max-xl:px-2 xl:mr-auto"
          >
            {PAGES.map((item) => (
              <a
                key={item.value}
                href={item.href}
                aria-label={item.label}
                aria-current={model === item.value ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  changeModel(item.value)
                }}
                className="note relative flex shrink-0 items-center px-1 text-muted-foreground max-sm:text-[0.6875rem] max-sm:tracking-wide transition-colors hover:text-foreground aria-[current=page]:text-measure after:absolute after:inset-x-1 after:-bottom-2.5 xl:after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-measure after:transition-transform aria-[current=page]:after:scale-x-100 sm:px-3 sm:after:inset-x-3"
              >
                <span aria-hidden="true" className="sm:hidden">
                  {item.mobileLabel}
                </span>
                <span aria-hidden="true" className="max-sm:hidden">
                  {item.label}
                </span>
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <FilamentSwatches
              filaments={workspace.filaments}
              count={preview?.third ? 3 : preview?.inserts ? 2 : 1}
              onChange={setFilaments}
            />
            <ButtonGroup data-tour="downloads">
              {/* The labels fold away on a phone; the icons and the names still read out. */}
              <Button size="sm" onClick={exportStl} disabled={!preview || exporting !== undefined}>
                <Download />
                <span className="max-sm:sr-only">
                  {exporting === 'stl' ? 'Building STL' : model === 'holder' && plan.modules.length > 1 ? 'Download STLs' : 'Download STL'}
                </span>
              </Button>
              <Button size="sm" variant="outline" onClick={export3mf} disabled={!preview || exporting !== undefined}>
                <Box />
                <span className="max-sm:sr-only">{exporting === '3mf' ? 'Building 3MF' : 'Download 3MF'}</span>
                <span aria-hidden className="sm:hidden">
                  3MF
                </span>
              </Button>
              <Button size="sm" variant="outline" onClick={() => void copyLink()}>
                <Link />
                <span className="max-sm:sr-only">Copy link</span>
              </Button>
            </ButtonGroup>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {docked && panel}

          <main data-tour="viewport" className="relative min-w-0 flex-1">
            <Viewer
              viewKey={model}
              filaments={workspace.filaments}
              mesh={preview}
              width={framed.width}
              length={framed.length}
              height={framed.height}
              minZ={framed.minZ}
              orbitTarget={'orbitTarget' in framed ? framed.orbitTarget : undefined}
              round={model === 'stem' || (model === 'token' && token.shape === 'round') || (model === 'base' && !elongated)}
              fitToPart={model !== 'base'}
              framingScale={model === 'counter' ? COUNTER_FRAMING_SCALE : undefined}
              leaders={!(explodable && exploded)}
              // Taken from the config the mesh was built from, so the old mesh never turns over before the new one lands.
              flipped={built !== undefined && 'texture' in built && built.texture.pattern !== 'none' && !isRelief(built.texture.pattern)}
            />
            <div className="absolute bottom-8 left-8 flex gap-2 max-sm:top-4 max-sm:bottom-auto max-sm:left-4">
              {explodable && (
                <Toggle
                  variant="outline"
                  size="sm"
                  pressed={exploded}
                  onPressedChange={setExploded}
                  data-tour="explode"
                  className="bg-card/90 backdrop-blur-sm aria-pressed:border-measure/50 aria-pressed:text-measure"
                >
                  <UnfoldHorizontal />
                  Explode
                </Toggle>
              )}
              {preview && <TourInvite page={page} />}
            </div>
            <div className="pointer-events-none absolute inset-x-12 top-5 flex flex-col gap-2">
              {(error || exportError) && (
                <div role="alert" className="border border-destructive/50 bg-card/90 px-3 py-2 backdrop-blur-sm text-xs text-destructive">
                  {error ? `${error}. Showing the last model that built.` : `Export failed: ${exportError}`}
                </div>
              )}
              <output className="block empty:hidden border border-measure/50 bg-card/90 px-3 py-2 backdrop-blur-sm text-xs text-measure">
                {shareNotice?.text}
              </output>
            </div>
            <TitleBlock config={partConfig} status={error ? 'blocked' : 'ready'} name={partName} grams={grams} />
          </main>
        </div>
      </div>
    </TourContext>
  )
}
