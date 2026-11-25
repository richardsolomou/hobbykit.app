/**
 * Small drawings for picture choices. Each is a 40×30 SVG in `currentColor`: a body at low opacity, edges in full,
 * and anything printed in the second colour solid. Textures and edge profiles are drawn from the same geometry the
 * generators build, so the picture matches the model.
 */
import { useId, useMemo, type ReactNode } from 'react'
import { profileSteps } from '@/core/geometry/profile'
import { reliefSample } from '@/core/geometry/relief'
import { DEFAULT_TEXTURE, isRelief, nailHoles, textureCells, type JointPattern } from '@/core/geometry/texture'
import type {
  CounterDigits,
  CounterMark,
  EdgeProfile,
  LabelStyle,
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

/** Each stone or tile shrunk toward its middle, so the joints between them show, with a plank's nails. */
function JointPicture({ pattern }: { pattern: JointPattern }) {
  const { cells, nails } = useMemo(() => {
    const layout = textureCells({ pattern, seed: 1, ...DEFAULT_TEXTURE[pattern] }, 20, 15)
    return {
      cells: layout.map((cell) => {
        const [cx, cy] = [cell.reduce((sum, [x]) => sum + x, 0) / cell.length, cell.reduce((sum, [, y]) => sum + y, 0) / cell.length]
        return cell.map(([x, y]) => `${cx + 0.86 * (x - cx)},${cy + 0.86 * (y - cy)}`).join(' ')
      }),
      nails: pattern === 'plank' ? nailHoles(layout, DEFAULT_TEXTURE.plank.depth) : [],
    }
  }, [pattern])
  return (
    <Picture viewBox="-20 -15 40 30">
      {cells.map((points) => (
        <polygon key={points} points={points} fill="currentColor" fillOpacity={0.45} stroke="none" />
      ))}
      {nails.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={0.45} strokeWidth={0.3} />
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

/** A dial seen end on, in proportion to the largest, `size` across its flats. */
export function counterSizePicture(size: number, largest: number): ReactNode {
  const flat = 4 + (size / largest) * 9
  const corners = Array.from({ length: 10 }, (_corner, i) => {
    const angle = Math.PI / 10 + (2 * Math.PI * i) / 10
    const radius = flat / Math.cos(Math.PI / 10)
    return `${20 + radius * Math.cos(angle)},${15 - radius * Math.sin(angle)}`
  }).join(' ')
  return (
    <Picture>
      <polygon points={corners} {...body} />
      <circle cx={20} cy={15} r={flat * 0.6} />
    </Picture>
  )
}

/** A dial's face cut through a digit: the digit sunk and filled, sunk and empty, or standing on the face. */
const NOTCHED_FACE = 'M4 12 H14 V15 H26 V12 H36 V24 H4 Z'
export const COUNTER_DIGIT_PICTURES: Record<CounterDigits, ReactNode> = {
  inlaid: (
    <Picture>
      <path d={NOTCHED_FACE} {...body} />
      <rect x={14} y={15} width={12} height={4} {...accent} />
    </Picture>
  ),
  engraved: (
    <Picture>
      <path d={NOTCHED_FACE} {...body} />
    </Picture>
  ),
  raised: (
    <Picture>
      <rect x={4} y={12} width={32} height={12} {...body} />
      <rect x={14} y={9} width={12} height={3} {...accent} />
    </Picture>
  ),
}

/** The counter from the front: a plate at each end and `dials` dials between them. */
function Dials({ dials }: { dials: number }) {
  const width = 6
  const left = 20 - (dials * width + 4) / 2
  return (
    <Picture>
      <rect x={left - 2} y={6} width={2} height={18} rx={0.5} {...body} />
      {Array.from({ length: dials }, (_dial, i) => (
        <rect key={i} x={left + 1 + i * width} y={8} width={width - 1} height={14} rx={0.8} {...body} />
      ))}
      <rect x={left + dials * width + 2} y={6} width={2} height={18} rx={0.5} {...body} />
    </Picture>
  )
}
export const COUNTER_DIAL_PICTURES: ReactNode[] = [1, 2, 3, 4].map((dials) => <Dials key={dials} dials={dials} />)

/** A plate from outside, with what marks the top row above it. */
export const COUNTER_MARK_PICTURES: Record<CounterMark, ReactNode> = {
  bar: (
    <Picture>
      <circle cx={20} cy={17} r={10} {...body} />
      <path d="M15.5 6.4 A11.5 11.5 0 0 1 24.5 6.4 L24.1 7.9 A10 10 0 0 0 15.9 7.9 Z" {...accent} />
    </Picture>
  ),
  pointer: (
    <Picture>
      <circle cx={20} cy={17} r={10} {...body} />
      <path d="M17 7.5 L20 4.5 L23 7.5 Z" {...accent} />
    </Picture>
  ),
  none: (
    <Picture>
      <circle cx={20} cy={17} r={10} {...body} />
    </Picture>
  ),
}

/** A tile in a filament's own colour, so the choice shows the colour it prints in. */
export function filamentPicture(colour: string): ReactNode {
  return (
    <Picture>
      <rect x={10} y={4} width={20} height={22} rx={1.5} style={{ fill: colour }} />
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

/** A slab cut through a label: letters standing proud of it, or cut down into it. */
export const LABEL_STYLE_PICTURES: Record<LabelStyle, ReactNode> = {
  raised: (
    <Picture>
      <rect x={4} y={16} width={32} height={8} {...body} />
      {[9, 17.5, 26].map((x) => (
        <rect key={x} x={x} y={12} width={5} height={4} {...body} />
      ))}
    </Picture>
  ),
  engraved: (
    <Picture>
      <path d="M4 12 h5 v4 h5 v-4 h3.5 v4 h5 v-4 h3.5 v4 h5 v-4 h5 v12 h-32 z" {...body} />
    </Picture>
  ),
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
