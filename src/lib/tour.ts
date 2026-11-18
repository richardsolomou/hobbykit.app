import { driver } from 'driver.js'
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Page } from './pages'

type Generator = Page['value']

/** Each generator's tour progress in this browser; scripts that screenshot the app mark every tour done so none covers the part. */
export const TOUR_KEY = 'hobbykit.tour'

/** Each panel section by its title, so a step follows the section wherever it renders. */
export const sectionTarget = (title: string) => `section:${title}`

/** The sections every visitor sees; advanced-only ones stay out so the tour is the same length whatever the Advanced toggle says. */
const SECTIONS: Record<Generator, [title: string, description: string][]> = {
  base: [
    [
      'Shape & Size',
      'Pick a shape, then type an exact size or tap a standard one. Settings that depend on the size follow it until you set them yourself.',
    ],
    ['Magnets', 'Enter the magnets you own. The count is picked for the size, or choose your own.'],
    [
      'Label',
      'The size is embossed inside the base, so a loose print still says what it is. Type your own text instead, like a unit name.',
    ],
    ['Texture', 'Cut paving or plating into the face the model stands on, or raise rocky ground. Every pattern prints without supports.'],
    ['Body', 'Shape the bottom edge, and set how tall and thick the base is.'],
    ['Batch', 'Queue other sizes with these settings and download them all at once.'],
  ],
  holder: [
    ['Miniatures', 'Add a group for each base size you store, and how many of them.'],
    ['Layout', 'Set the Gridfinity grid the holders have to fit in.'],
    ['Slots', 'Tune how the slots are spaced and how deep they go.'],
    ['Magnets', 'Pockets under each slot hold magnetised bases in place.'],
  ],
  painting: [
    [
      'Magnet grid',
      'Set the rows, columns and spacing. An extra pocket sits between every four, so mixed base sizes still land on a magnet.',
    ],
    ['Handle', 'Shape the grip. It prints as a separate part and glues on.'],
    ['Magnets', 'The same magnets as your bases, so they line up.'],
  ],
  rack: [
    [
      'Pieces',
      'Start with one module, then add modules, corners or ends on either side as your collection grows. Pieces you have printed never change.',
    ],
    ['Cells', 'Size the cells to your paints, and the holes to your brushes.'],
    ['Pot pockets', 'How deep pots sit. Zero leaves a flat deck that prints faster.'],
  ],
  stem: [
    ['Stem', 'Pick how tall the flying stem is and what it looks like.'],
    ['Miniature Connection', 'Choose a peg or a ball joint, and how tightly it fits the model.'],
  ],
  token: [
    ['Body', 'Pick round, square or hex, sized across the flats so tokens fill a grid.'],
    ['Text', 'Type a word or a number and it wraps and scales to fill the face.'],
    ['Image', 'Drop in an image and its dark areas become a silhouette.'],
    ['Relief', 'Raise the artwork in a second colour, or engrave it so tokens stack.'],
  ],
  counter: [
    ['Layout', 'Choose what holds the dials: a case that shows only the count, open hubs, a frame and base, or hubs on legs.'],
    ['Wheels', 'Size the dials and how firmly they click.'],
    ['Digits', 'Press-in tiles, printed digits or engraved ones, and which filament they take.'],
  ],
}

/** In tour order: a phone opens the drawer at Settings, walks the sections and Advanced inside it, then closes it for the rest. */
const COMMON: [target: string, title: string, description: string][] = [
  ['settings', 'Settings', 'Every setting for this part is in here.'],
  ['advanced', 'Advanced', 'Show the fine-tuning settings too. Any you have changed always stay in view.'],
  ['viewport', 'Preview', 'Drag to turn the part, and scroll or pinch to zoom. The red lines measure it.'],
  ['explode', 'Explode', 'Pull the parts apart to see how they fit together.'],
  ['colours', 'Colours', 'Pick the filament colours for the preview and the 3MF.'],
  [
    'downloads',
    'Download',
    'Get an STL, or a 3MF that keeps each part and its colour for your slicer. Copy link shares these exact settings.',
  ],
]

const find = (target: string) => document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`) ?? undefined

/** Only what is on screen: the settings button beside a docked panel and Explode on a part that has none drop out. */
function visible(target: string) {
  const box = find(target)?.getBoundingClientRect()
  return box && box.width > 0 && box.left >= 0 && box.right <= window.innerWidth
}

/** The settings drawer on a narrow screen, which the tour opens for the steps inside it. */
export interface Drawer {
  isOpen: () => boolean
  /** Resolves once the drawer has finished sliding in or out. */
  setOpen: (open: boolean) => Promise<void>
}

/**
 * Where each generator's tour got to (the title of the step it was closed on, or `done`; no entry means it has never run), and
 * which generator's tour first showed each step every page shares, so another generator's tour does not show it again.
 */
interface Progress {
  reached: Partial<Record<Generator, string>>
  shared: Record<string, Generator>
}

export const TOUR_DONE = 'done'

function stored(): Progress {
  try {
    return { reached: {}, shared: {}, ...(JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? '{}') as Partial<Progress>) }
  } catch {
    return { reached: {}, shared: {} }
  }
}

let progress = stored()
const listeners = new Set<() => void>()
/** Set by "Not now" for the rest of the visit only, so the invite comes back next time; the footer link still starts a tour. */
let declined = false

function save(next: Progress) {
  progress = next
  try {
    window.localStorage.setItem(TOUR_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts; the tour still runs.
  }
  for (const listener of listeners) listener()
}

const record = (generator: Generator, reached: string) => save({ ...progress, reached: { ...progress.reached, [generator]: reached } })

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Where this generator's tour got to, so the page can offer to pick it up again. */
export const useTourProgress = (generator: Generator) => useSyncExternalStore(subscribe, () => progress.reached[generator])

/** Whether to invite a tour of this generator: it has never been started and no invite has been turned down this visit. */
export const useTourInvited = (generator: Generator) =>
  useSyncExternalStore(subscribe, () => progress.reached[generator] === undefined && !declined)

/** Whether any generator's tour has been started, after which an invite no longer greets a newcomer. */
export const useToured = () => useSyncExternalStore(subscribe, () => Object.keys(progress.reached).length > 0)

export function declineTours() {
  declined = true
  for (const listener of listeners) listener()
}

const SHARED_TITLES = new Set(COMMON.map(([, title]) => title))

let active: ReturnType<typeof driver> | undefined

/** Whether a tour is running, so the drawer can ignore the clicks on its popover that land outside it. */
export const touring = () => active?.isActive() ?? false

interface Step {
  target: string
  title: string
  description: string
  inDrawer: boolean
}

/**
 * Walks through this generator's settings and whatever else is on screen, opening and closing a phone's drawer as the steps
 * move in and out of it. `first` and `resume` leave out the shared steps another generator's tour has shown, and `resume`
 * starts at the step it was last closed on; `replay` shows everything from the start. Closing it early remembers that step;
 * reaching the end marks it done.
 */
export async function runTour(generator: Generator, mode: 'first' | 'resume' | 'replay', drawer?: Drawer) {
  const shownElsewhere = (title: string) => mode !== 'replay' && (progress.shared[title] ?? generator) !== generator
  const sections: Step[] = SECTIONS[generator].map(([title, description]) => ({
    target: sectionTarget(title),
    title,
    description,
    inDrawer: drawer !== undefined,
  }))
  const common: Step[] = COMMON.filter(([, title]) => !shownElsewhere(title)).map(([target, title, description]) => ({
    target,
    title,
    description,
    inDrawer: drawer !== undefined && target === 'advanced',
  }))
  // The drawer's contents are checked once open; everything outside it is checked now.
  const steps = [
    ...common.filter((step) => step.target === 'settings'),
    ...sections,
    ...common.filter((step) => step.target !== 'settings'),
  ].filter((step) => step.inDrawer || visible(step.target))
  const start =
    mode === 'resume'
      ? Math.max(
          0,
          steps.findIndex((step) => step.title === progress.reached[generator]),
        )
      : 0

  const place = async (index: number) => {
    if (drawer && steps[index].inDrawer !== drawer.isOpen()) await drawer.setOpen(steps[index].inDrawer)
  }
  const go = async (index: number) => {
    if (index >= steps.length) return tour.destroy()
    if (index < 0) return
    await place(index)
    tour.moveTo(index)
  }

  active?.destroy()
  const tour = driver({
    steps: steps.map((step) => ({
      element: () => find(step.target) ?? document.body,
      popover: { title: step.title, description: step.description, side: step.target.startsWith('section:') ? 'right' : undefined },
    })),
    showProgress: true,
    popoverClass: 'hobbykit-tour',
    smoothScroll: true,
    onNextClick: () => void go((tour.getActiveIndex() ?? 0) + 1),
    onPrevClick: () => void go((tour.getActiveIndex() ?? 0) - 1),
    onHighlightStarted: (_element, step, { index }) => {
      const title = step.popover?.title ?? TOUR_DONE
      // Reaching the last step counts as finishing, however the tour is then closed.
      record(generator, index === steps.length - 1 ? TOUR_DONE : title)
      if (SHARED_TITLES.has(title) && !progress.shared[title]) save({ ...progress, shared: { ...progress.shared, [title]: generator } })
    },
    onDestroyed: () => {
      active = undefined
      // The tour scrolls the panel down section by section; it ends with the panel back where it starts.
      find(sections[0]?.target ?? '')?.scrollIntoView({ block: 'nearest' })
    },
  })
  active = tour
  record(generator, steps[start]?.title ?? TOUR_DONE)
  await place(start)
  tour.drive(start)
}

/** Starts the tour for the generator on screen from wherever it is asked for; with no mode it resumes or replays. */
export const TourContext = createContext<(mode?: 'first') => void>(() => undefined)
export const useTour = () => useContext(TourContext)
