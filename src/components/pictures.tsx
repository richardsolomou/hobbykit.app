/**
 * Small drawings for picture choices. Each is a 40×30 SVG in `currentColor`: a body at low opacity, edges in full,
 * and anything printed in the second colour solid. Textures and edge profiles are drawn from the same geometry the
 * generators build, so the picture matches the model.
 */
import { useId, useMemo, type ReactNode } from 'react'
import { profileSteps } from '@/core/geometry/profile'
import { reliefSample } from '@/core/geometry/relief'
import { DEFAULT_TEXTURE, isRelief, textureCells, type JointPattern } from '@/core/geometry/texture'
import type {
  CounterDigits,
  CounterLayout,
  EdgeProfile,
  PaintingHandleShape,
  ShapeKind,
  TexturePattern,
  TokenShape,
} from '@/core/geometry/types'

const BODY = 0.25

function Picture({ children, viewBox = '0 0 40 30' }: { children: ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  )
}

/** A flat-sided hexagon `radius` to its corners, flat on top. */
const hexagon = (cx: number, cy: number, radius: number) =>
  Array.from({ length: 6 }, (_corner, i) => {
    const angle = (Math.PI / 3) * i
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
  }).join(' ')

const body = { fill: 'currentColor', fillOpacity: BODY }
const accent = { fill: 'currentColor', stroke: 'none' }

export const BASE_SHAPE_PICTURES: Record<ShapeKind, ReactNode> = {
  round: (
    <Picture>
      <circle cx={20} cy={15} r={11} {...body} />
    </Picture>
  ),
  oval: (
    <Picture>
      <ellipse cx={20} cy={15} rx={15} ry={10} {...body} />
    </Picture>
  ),
  pill: (
    <Picture>
      <rect x={5} y={6} width={30} height={18} rx={9} {...body} />
    </Picture>
  ),
  rect: (
    <Picture>
      <rect x={6} y={7} width={28} height={16} rx={1} {...body} />
    </Picture>
  ),
  polygon: (
    <Picture>
      <polygon points={hexagon(20, 15, 12)} {...body} />
    </Picture>
  ),
}

export const TOKEN_SHAPE_PICTURES: Record<TokenShape, ReactNode> = {
  round: (
    <Picture>
      <circle cx={20} cy={15} r={11} {...body} />
    </Picture>
  ),
  square: (
    <Picture>
      <rect x={9} y={4} width={22} height={22} rx={2} {...body} />
    </Picture>
  ),
  hex: (
    <Picture>
      <polygon points={hexagon(20, 15, 12)} {...body} />
    </Picture>
  ),
}

/** A base or token cut through its middle: the edge profile on both sides of a slab, the narrower face on top. */
function ProfilePicture({ profile }: { profile: EdgeProfile }) {
  const points = useMemo(() => {
    const steps = profileSteps(10, profile, 5, 0.2)
    const left = steps.map(({ inset, z }) => `${4 + inset},${10 + z}`)
    const right = steps.toReversed().map(({ inset, z }) => `${36 - inset},${10 + z}`)
    return [...left, ...right].join(' ')
  }, [profile])
  return (
    <Picture>
      <polygon points={points} {...body} />
    </Picture>
  )
}

export const PROFILE_PICTURES: Record<EdgeProfile, ReactNode> = {
  taper: <ProfilePicture profile="taper" />,
  bevel: <ProfilePicture profile="bevel" />,
  round: <ProfilePicture profile="round" />,
  straight: <ProfilePicture profile="straight" />,
}

/** Each stone or tile shrunk toward its middle, so the joints between them show. */
function JointPicture({ pattern }: { pattern: JointPattern }) {
  const cells = useMemo(
    () =>
      textureCells({ pattern, seed: 1, ...DEFAULT_TEXTURE[pattern] }, 20, 15).map((cell) => {
        const [cx, cy] = [cell.reduce((sum, [x]) => sum + x, 0) / cell.length, cell.reduce((sum, [, y]) => sum + y, 0) / cell.length]
        return cell.map(([x, y]) => `${cx + 0.86 * (x - cx)},${cy + 0.86 * (y - cy)}`).join(' ')
      }),
    [pattern],
  )
  return (
    <Picture viewBox="-20 -15 40 30">
      {cells.map((points) => (
        <polygon key={points} points={points} fill="currentColor" fillOpacity={0.45} stroke="none" />
      ))}
    </Picture>
  )
}

const RELIEF_SAMPLES = 48

/** The relief's surface lit from the top left, drawn as one smooth image that masks the picture's colour. */
function ReliefPicture({ pattern }: { pattern: TexturePattern }) {
  const id = useId()
  const href = useMemo(() => {
    if (!isRelief(pattern)) return ''
    const heights = reliefSample({ pattern, seed: 1, ...DEFAULT_TEXTURE[pattern] }, 20, RELIEF_SAMPLES)
    const at = (i: number, j: number) =>
      heights[Math.min(RELIEF_SAMPLES - 1, Math.max(0, j)) * RELIEF_SAMPLES + Math.min(RELIEF_SAMPLES - 1, Math.max(0, i))]
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = RELIEF_SAMPLES
    const context = canvas.getContext('2d')
    if (!context) return ''
    const image = context.createImageData(RELIEF_SAMPLES, RELIEF_SAMPLES)
    for (let k = 0; k < heights.length; k++) {
      const [i, j] = [k % RELIEF_SAMPLES, Math.floor(k / RELIEF_SAMPLES)]
      const slope = at(i - 1, j) - at(i + 1, j) + at(i, j - 1) - at(i, j + 1)
      const light = Math.min(0.9, Math.max(0.1, 0.25 + 0.4 * at(i, j) + 1.6 * slope))
      image.data.set([255 * light, 255 * light, 255 * light, 255], 4 * k)
    }
    context.putImageData(image, 0, 0)
    return canvas.toDataURL()
  }, [pattern])
  return (
    <Picture viewBox="-20 -15 40 30">
      <mask id={id}>
        <image href={href} x={-20} y={-20} width={40} height={40} preserveAspectRatio="none" />
      </mask>
      <rect x={-20} y={-15} width={40} height={30} fill="currentColor" stroke="none" mask={`url(#${id})`} />
    </Picture>
  )
}

export function texturePicture(pattern: TexturePattern): ReactNode {
  if (pattern === 'none') {
    return (
      <Picture>
        <rect x={0} y={0} width={40} height={30} fill="currentColor" fillOpacity={0.3} stroke="none" />
      </Picture>
    )
  }
  return isRelief(pattern) ? <ReliefPicture pattern={pattern} /> : <JointPicture pattern={pattern} />
}

/** A dial seen from the front, its top digit's tile showing, `x` its left edge. */
function Dial({ x, top = 8, bottom = 22 }: { x: number; top?: number; bottom?: number }) {
  return (
    <>
      <rect x={x} y={top} width={7} height={bottom - top} rx={1} {...body} />
      <line x1={x + 1} y1={top + 2} x2={x + 6} y2={top + 2} />
      <line x1={x + 1} y1={(top + bottom) / 2} x2={x + 6} y2={(top + bottom) / 2} />
    </>
  )
}

/** A ribbed knob seen edge on. */
function Knob({ x }: { x: number }) {
  return (
    <>
      <rect x={x} y={8} width={3} height={14} rx={0.8} {...body} />
      {[10.5, 13.5, 16.5, 19.5].map((y) => (
        <line key={y} x1={x} y1={y} x2={x + 3} y2={y} />
      ))}
    </>
  )
}

export const COUNTER_LAYOUT_PICTURES: Record<CounterLayout, ReactNode> = {
  enclosure: (
    <Picture>
      <rect x={6} y={6} width={28} height={18} rx={2} {...body} />
      <rect x={11} y={6} width={18} height={2.2} {...accent} />
      <Knob x={2} />
      <Knob x={35} />
    </Picture>
  ),
  knobs: (
    <Picture>
      <Dial x={12.5} />
      <Dial x={20.5} />
      <rect x={9} y={7} width={2.5} height={16} {...body} />
      <rect x={28.5} y={7} width={2.5} height={16} {...body} />
      <rect x={9} y={7} width={2.5} height={1.5} {...accent} />
      <rect x={28.5} y={7} width={2.5} height={1.5} {...accent} />
      <Knob x={5} />
      <Knob x={32} />
    </Picture>
  ),
  hubs: (
    <Picture>
      <Dial x={12.5} />
      <Dial x={20.5} />
      <path d="M9 7 h2.5 v13 l2 5 h-6.5 l2 -5 z" {...body} />
      <path d="M28.5 7 h2.5 v13 l2 5 h-6.5 l2 -5 z" {...body} />
      <rect x={9} y={7} width={2.5} height={1.5} {...accent} />
      <rect x={28.5} y={7} width={2.5} height={1.5} {...accent} />
    </Picture>
  ),
  centre: (
    <Picture>
      <Dial x={12.5} />
      <Dial x={20.5} />
      <rect x={6} y={24} width={28} height={2.5} {...body} />
      <rect x={9} y={5} width={2} height={19} {...accent} />
      <rect x={29} y={5} width={2} height={19} {...accent} />
      <rect x={9} y={5} width={22} height={1.5} {...accent} />
    </Picture>
  ),
}

const SEVEN = 'M15 9 h9 l-5 13'

export const COUNTER_DIGIT_PICTURES: Record<CounterDigits, ReactNode> = {
  tiles: (
    <Picture>
      <rect x={3} y={6} width={17} height={19} rx={1.5} {...body} />
      <rect x={6} y={9} width={11} height={13} strokeDasharray="1.2 1" />
      <rect x={23} y={9} width={13} height={14} rx={0.5} {...body} />
      <path d="M26 12 h7 l-4 9" strokeWidth={2} />
      <path d="M21.5 16 h-2.5 m1 -1.2 l-1 1.2 l1 1.2" strokeWidth={0.8} />
    </Picture>
  ),
  printed: (
    <Picture>
      <rect x={9} y={5} width={22} height={21} rx={1.5} {...body} />
      <path d={SEVEN} transform="translate(0.5 0)" strokeWidth={2.4} />
    </Picture>
  ),
  engraved: (
    <Picture>
      <rect x={9} y={5} width={22} height={21} rx={1.5} {...body} />
      <path d={SEVEN} transform="translate(0.5 0)" strokeWidth={2.4} strokeOpacity={0.45} strokeDasharray="1.2 1" />
    </Picture>
  ),
}

/** A stem from the side: a foot, a column `height` tall in mm, and what holds the miniature on top. */
function Stem({ height, top = 'peg' }: { height: number; top?: 'peg' | 'ball' }) {
  const column = 4 + (height / 35) * 18
  const summit = 27 - column
  return (
    <Picture>
      <path d="M14 27 h12 l-3 -2.5 h-6 z" {...body} />
      <rect x={18.5} y={summit} width={3} height={column - 2.5} {...body} />
      {top === 'peg' ? (
        <rect x={19.3} y={summit - 3} width={1.4} height={3} {...accent} />
      ) : (
        <circle cx={20} cy={summit - 2} r={2.2} {...body} />
      )}
    </Picture>
  )
}

export const stemHeightPicture = (height: number): ReactNode => <Stem height={height} />

export const STEM_CONNECTION_PICTURES: Record<'peg' | 'ball', ReactNode> = {
  peg: <Stem height={20} />,
  ball: <Stem height={20} top="ball" />,
}

/** The grip under a sliver of tray, seen from the side. */
function Grip({ outline }: { outline: string }) {
  return (
    <Picture>
      <rect x={6} y={3} width={28} height={2.5} {...body} />
      <path d={outline} {...body} />
    </Picture>
  )
}

export const GRIP_PICTURES: Record<PaintingHandleShape, ReactNode> = {
  round: <Grip outline="M16 5.5 h8 v21 h-8 z" />,
  oval: <Grip outline="M16 5.5 h8 c2 7 2 14 0 21 h-8 c-2 -7 -2 -14 0 -21 z" />,
  flared: <Grip outline="M16.5 5.5 h7 c0 9 1 15 4 21 h-15 c3 -6 4 -12 4 -21 z" />,
  pistol: <Grip outline="M15 5.5 h8 c0 6 2 13 7 20 l-5 2 c-6 -6 -10 -13 -10 -22 z" />,
}

/** A dial seen end on, its size in proportion to the largest, `diameter` across its corners. */
export function counterSizePicture(diameter: number): ReactNode {
  const radius = 4 + (diameter / 40) * 9.5
  const corners = Array.from({ length: 10 }, (_corner, i) => {
    const angle = Math.PI / 2 + Math.PI / 10 + (2 * Math.PI * i) / 10
    return `${20 + radius * Math.cos(angle)},${15 - radius * Math.sin(angle)}`
  }).join(' ')
  return (
    <Picture>
      <polygon points={corners} {...body} />
      <circle cx={20} cy={15} r={radius * 0.3} />
    </Picture>
  )
}

/** A tile in a filament's own colour, so the choice shows the colour it prints in. */
export function filamentPicture(colour: string): ReactNode {
  return (
    <Picture>
      <rect x={10} y={4} width={20} height={22} rx={1.5} style={{ fill: colour }} />
      <path d="M16 9 h8 l-4.5 12" strokeWidth={2.2} style={{ stroke: 'var(--background)' }} />
    </Picture>
  )
}

/** A round base from below, a dot for each magnet pocket. */
export function magnetCountPicture(count: number): ReactNode {
  const dots =
    count === 1
      ? [[20, 15]]
      : Array.from({ length: count }, (_dot, i) => {
          const angle = Math.PI / 2 + (2 * Math.PI * i) / count
          return [20 + 7.5 * Math.cos(angle), 15 - 7.5 * Math.sin(angle)]
        })
  return (
    <Picture>
      <circle cx={20} cy={15} r={12} {...body} />
      {dots.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={2} {...accent} />
      ))}
    </Picture>
  )
}

export const MAGNET_LAYOUT_PICTURES: Record<'balanced' | 'five-cross', ReactNode> = {
  balanced: magnetCountPicture(4),
  'five-cross': (
    <Picture>
      <circle cx={20} cy={15} r={12} {...body} />
      {[
        [20, 15],
        [20, 7],
        [20, 23],
        [12, 15],
        [28, 15],
      ].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={2} {...accent} />
      ))}
    </Picture>
  ),
}

/** A base's underside, its supports running out from the middle like spokes. */
export function ribPicture(count: number): ReactNode {
  return (
    <Picture>
      <circle cx={20} cy={15} r={12} {...body} />
      {Array.from({ length: count }, (_spoke, i) => {
        const angle = Math.PI / 2 + (2 * Math.PI * i) / count
        return <line key={i} x1={20} y1={15} x2={20 + 11.5 * Math.cos(angle)} y2={15 - 11.5 * Math.sin(angle)} strokeWidth={1.6} />
      })}
    </Picture>
  )
}

/** A holder module from above with three slots, its labels in the slots or along its front edge. */
export const LABEL_PLACEMENT_PICTURES: Record<'slots' | 'module', ReactNode> = {
  slots: (
    <Picture>
      <rect x={3} y={5} width={34} height={20} rx={1.5} {...body} />
      {[10, 20, 30].map((x) => (
        <g key={x}>
          <circle cx={x} cy={15} r={4.2} />
          <line x1={x - 2} y1={15} x2={x + 2} y2={15} strokeWidth={1.4} />
        </g>
      ))}
    </Picture>
  ),
  module: (
    <Picture>
      <rect x={3} y={5} width={34} height={20} rx={1.5} {...body} />
      {[10, 20, 30].map((x) => (
        <circle key={x} cx={x} cy={13} r={4.2} />
      ))}
      <line x1={13} y1={21.5} x2={27} y2={21.5} strokeWidth={1.4} />
    </Picture>
  ),
}
