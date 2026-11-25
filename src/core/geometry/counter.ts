import type { CrossSection, Manifold, ManifoldToplevel, Mat4, Vec3 } from 'manifold-3d'
import type { Font } from 'opentype.js'
import { faceArtwork } from './artwork'
import { buildResult, withOwner, type BuildResult } from './build'
import { COUNTER_DIGITS } from './counterDigits'
import { trimNumber } from './outline'
import { partSegments, previewSegmentsFor } from './quality'
import type { CounterConfig, CounterPart, CounterPlateFace } from './types'

/*
 * Each part is built in a frame of its own: the axle and each
 * dial along Z, a plate flat with its socket opening up, its top-row mark towards -X and its feet towards +X.
 *
 * Any other number of faces moves every feature of the click radially by `shift`, chosen so the troughs, bulb and
 * arm keep their size and shape round a bigger or smaller axle, and angles along the arm become lengths along it.
 */

const BASE_FACES = 10
const degrees = (angle: number) => (angle * Math.PI) / 180

/** The axle: round lobes with a round trough between each pair, round a bore the plates' bosses fill. */
const AXLE_BORE = 5.5
const LOBE_CENTRE = 8.95
const LOBE_RADIUS = 1.55
const TROUGH_CENTRE = 9.9017
const TROUGH_RADIUS = 1.6305
/** Hidden inside the lobes and troughs, so only they shape the outline. */
const AXLE_CORE = 9

const PLATE = 4
/** Each socket is the axle's own outline, so the axle presses in and cannot turn; this deep, with the boss standing to the plate's face. */
const SOCKET_DEPTH = 1.8
const PLATE_RADIUS = 17.2
/** The raised mark over the top row: out to this radius, this far either side of the middle. */
const MARK_RADIUS = 18.2
const MARK_HALF = 5.7
/** One foot, from where it leaves the disc to the tip the counter stands on; an arch between the feet cuts them apart. */
const FOOT: [number, number][] = [
  [10, 14],
  [17.504, 13.281],
  [18.38, 11.771],
]
const FOOT_TIP = FOOT[2][0]
const ARCH_CENTRE = 46.262
const ARCH_RADIUS = 30.257
/** How far a dial's lowest point stays above the table. */
const TABLE_CLEARANCE = 0.006
/** The groove a dial's rib runs in: a straight inner wall, this deep, and an outer wall at 45°. */
const GROOVE_RADIUS = 13.2
const GROOVE_DEPTH = 1.37
/** Artwork on a plate's outer face keeps this far inside its rim, and its second colour fills this deep. */
const ART_MARGIN = 1.5
const ART_DEPTH = 0.6
const ART_TEXT_HEIGHT = 12

/** A dial's height along the axle, rib to narrow end, with its outer face this far above the rib's tip. */
const DIAL_HALF = 5.25
const RIB = 1
const RIB_RADIUS = 13.5
/** Apothems of a dial, by height: its outer face, where the chamfer meets the drafted faces, and its narrow end. */
const DIAL_RINGS: [number, number][] = [
  [-4.25, 16.394545],
  [-3.055968, 17.47501],
  [5.25, 16.64349],
]
const DIAL_BODY = DIAL_RINGS[2][0] - DIAL_RINGS[0][0]
/** A dial with an outer dial or another middle one on both sides is straight, flush with the outer dials' narrow ends. */
const STRAIGHT_RINGS: [number, number][] = [
  [DIAL_RINGS[0][0], DIAL_RINGS[2][1]],
  [DIAL_RINGS[2][0], DIAL_RINGS[2][1]],
]
const STRAIGHT_MIDDLE = (DIAL_RINGS[0][0] + DIAL_RINGS[2][0]) / 2
/** How far a face leans in towards the narrow end, as a slope off the axle. */
const DRAFT = Math.atan((DIAL_RINGS[1][1] - DIAL_RINGS[2][1]) / (DIAL_RINGS[2][0] - DIAL_RINGS[1][0]))
/** A face's apothem where the dial's frame crosses its middle height. */
const FACE_MIDDLE = DIAL_RINGS[2][1] + Math.tan(DRAFT) * DIAL_RINGS[2][0]

/**
 * The click: one spring arm inside each dial, a strip between the bore's relief and a slot behind it, ending in a
 * round bulb that drops into the axle's troughs. The bulb sits under the face that shows, a little behind its middle.
 */
const ARM_INNER = 10.8
const ARM_OUTER = 11.6
const ARM_MIDDLE = (ARM_INNER + ARM_OUTER) / 2
const SLOT_OUTER = 12.6
const BULB = 1.6
const BULB_CENTRE = 10.6
const BULB_CLEAR = 1
const BULB_LAG = 0.32
/** The first value's face, round from +X; every other face follows on from it. */
const FIRST_FACE = -108
/** Round from the bulb: where the relief under the arm ends, where the slot behind it starts to round off towards the arm's root, and that rounding. */
const RELIEF_END = -40.88
const SLOT_ROUNDING = -25.56
const SLOT_END_CENTRE: [number, number] = [9.8545, -25.557]
const SLOT_END_RADIUS = 2.7435

/** How far along the face from its middle height the digits are centred, towards the narrow end, and the space between the two digits of a number. */
const DIGIT_CENTRE = 1.1025
const DIGIT_GAP = 0.6

/** Cuts start this far outside the face they cut, so no face is left coplanar. */
const OVERCUT = 0.1

/** How far the outer dials stand off their plates, and half the gap between neighbouring dials. */
const SEAT_GAP = 0.25
/** Space an exploded preview leaves between parts along the axle. */
const EXPLODED_GAP = 2

/** A ten-numbered dial across its flats at its widest, which `size` measures; every other size scales the whole counter from it. */
export const DEFAULT_COUNTER_SIZE = 34.95
/** Below this the spring arm is too thin to print and flex. */
export const MIN_COUNTER_SIZE = 27
export const MAX_COUNTER_SIZE = 60
export const MAX_COUNTER_DIALS = 4
export const COUNTER_FACES = [6, 20] as const
/** Numbers stop at two digits, which is all a face has room for. */
export const MAX_COUNTER_VALUE = 99
/** What each fit and depth may be set to, as real distances. */
export const COUNTER_RANGES = {
  relief: [0.2, 1],
  inlay: [0.2, 1.6],
  pressFit: [0, 0.3],
  dialClearance: [0.05, 0.3],
  click: [-0.3, 0.3],
  leadIn: [0, 0.6],
} as const

export const counterScale = ({ size }: Pick<CounterConfig, 'size'>): number => size / DEFAULT_COUNTER_SIZE
/** Raised digits stop short of the plates' marks, so they never reach past the plates or below their feet. */
export const maximumCounterRelief = (config: Pick<CounterConfig, 'size' | 'digits'>): number =>
  config.digits === 'raised'
    ? Math.min(
        COUNTER_RANGES.relief[1],
        Number((Math.floor(((MARK_RADIUS - DIAL_RINGS[1][1]) * counterScale(config)) / 0.05) * 0.05).toFixed(2)),
      )
    : COUNTER_RANGES.relief[1]

/** The shape of the click and dials for a number of faces, at the default size. */
function faceGeometry(faces: number) {
  const pitch = 360 / faces
  const shift = BULB_CENTRE * (faces / BASE_FACES - 1)
  /** Turns angles round a ten-faced dial's arm into the same lengths round this one. */
  const along = ARM_MIDDLE / (ARM_MIDDLE + shift)
  const corner = (apothem: number) => (apothem + shift) / Math.cos(degrees(pitch / 2))
  return {
    pitch,
    shift,
    along,
    bulbAngle: FIRST_FACE - BULB_LAG * along,
    corner,
    /** A face's width at the dial's widest, against a ten-faced dial's. */
    widthRatio: ((DIAL_RINGS[1][1] + shift) * Math.tan(degrees(pitch / 2))) / (DIAL_RINGS[1][1] * Math.tan(degrees(18))),
  }
}

/** Each face's number, from the first value's face round, backwards when counting down. */
function faceValues({ faces, first, countDown }: Pick<CounterConfig, 'faces' | 'first' | 'countDown'>) {
  const { pitch } = faceGeometry(faces)
  return Array.from({ length: faces }, (_face, i) => ({ value: first + i, angle: FIRST_FACE + (countDown ? -1 : 1) * i * pitch }))
}

const extent = (rings: readonly (readonly (readonly [number, number])[])[], axis: 0 | 1) => {
  const values = rings.flat().map((point) => point[axis])
  return [Math.min(...values), Math.max(...values)] as const
}
/** The room a number has on a ten-faced dial's face: across it, which is a digit's height, and along it. */
const NUMBER_ACROSS = 9.4
const NUMBER_ALONG = 7.5

/** A number's outline from the digits, side by side along the face and centred on its middle. */
function numberRings(value: number): [number, number][][] {
  const glyphs = String(value)
    .split('')
    .map((digit) => COUNTER_DIGITS[Number(digit)])
  if (glyphs.length === 1) return glyphs[0].map((ring) => ring.map(([u, v]): [number, number] => [u, v]))
  const widths = glyphs.map((rings) => extent(rings, 1))
  let cursor = -(widths.reduce((total, [low, high]) => total + high - low, 0) + DIGIT_GAP * (glyphs.length - 1)) / 2
  return glyphs.flatMap((rings, i) => {
    const offset = cursor - widths[i][0]
    cursor += widths[i][1] - widths[i][0] + DIGIT_GAP
    return rings.map((ring) => ring.map(([u, v]): [number, number] => [u, v + offset]))
  })
}

/** Every face's number, all shrunk alike until the widest fits the room a face has. */
function dialNumbers(config: Pick<CounterConfig, 'faces' | 'first' | 'countDown'>) {
  const numbers = faceValues(config).map(({ value, angle }) => ({ angle, rings: numberRings(value) }))
  const across = Math.max(...numbers.map(({ rings }) => extent(rings, 0)[1] - extent(rings, 0)[0]))
  const along = Math.max(...numbers.map(({ rings }) => extent(rings, 1)[1] - extent(rings, 1)[0]))
  const scale = Math.min(1, NUMBER_ALONG / along, (NUMBER_ACROSS * faceGeometry(config.faces).widthRatio) / across)
  return numbers.map(({ angle, rings }) => ({
    angle,
    rings: rings.map((ring) => ring.map(([u, v]): [number, number] => [u * scale, v * scale])),
  }))
}

/** Which way a dial's narrow end points along Z, or 0 for a straight dial. */
type DialSide = 1 | -1 | 0

/** The face at `angle`, for a dial whose narrow end is towards `side` along Z: across it, along it towards the narrow end, out of it, and the middle of its number. */
function faceFrame(side: DialSide, angle: number, shift: number) {
  const face = degrees(angle)
  if (side === 0) {
    const middle = STRAIGHT_RINGS[0][1] + shift
    return {
      across: [-Math.sin(face), Math.cos(face), 0] as Vec3,
      along: [0, 0, 1] as Vec3,
      normal: [Math.cos(face), Math.sin(face), 0] as Vec3,
      origin: [middle * Math.cos(face), middle * Math.sin(face), STRAIGHT_MIDDLE] as Vec3,
    }
  }
  const tilt = side * DRAFT
  const normal: Vec3 = [Math.cos(tilt) * Math.cos(face), Math.cos(tilt) * Math.sin(face), Math.sin(tilt)]
  const across: Vec3 = [-Math.sin(face), Math.cos(face), 0]
  const along: Vec3 = [-Math.sin(tilt) * Math.cos(face), -Math.sin(tilt) * Math.sin(face), Math.cos(tilt)]
  const middle = FACE_MIDDLE + shift
  const origin = [0, 1, 2].map(
    (axis) => [middle * Math.cos(face), middle * Math.sin(face), 0][axis] + side * DIGIT_CENTRE * along[axis],
  ) as Vec3
  return { across, along, normal, origin }
}

type ReachConfig = Pick<CounterConfig, 'faces' | 'first' | 'countDown' | 'digits' | 'relief' | 'size'>
/** How far a dial reaches from the axle, turned as assembled: across the counter, up and down, by its corners or the tops of raised digits. */
function dialReach(config: ReachConfig) {
  const geometry = faceGeometry(config.faces)
  const turn = degrees(180 - geometry.bulbAngle)
  const points: [number, number][] = Array.from({ length: config.faces }, (_corner, i) => {
    const angle = degrees(FIRST_FACE + geometry.pitch / 2 + i * geometry.pitch)
    const radius = geometry.corner(DIAL_RINGS[1][1])
    return [radius * Math.cos(angle), radius * Math.sin(angle)]
  })
  if (config.digits === 'raised') {
    const height = config.relief / counterScale(config)
    for (const side of [1, -1, 0] as const) {
      for (const { angle, rings } of dialNumbers(config)) {
        const { across, along, normal, origin } = faceFrame(side, angle, geometry.shift)
        for (const [u, v] of rings.flat()) {
          points.push([0, 1].map((axis) => origin[axis] + u * across[axis] + v * along[axis] + height * normal[axis]) as [number, number])
        }
      }
    }
  }
  const turned = points.map(([x, y]) => [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn)])
  return {
    across: Math.max(...turned.map(([, y]) => Math.abs(y))),
    up: Math.max(...turned.map(([x]) => -x)),
    down: Math.max(...turned.map(([x]) => x)),
  }
}

/** Where the counter stands: the feet's tips, far enough out that no dial reaches the table. */
const footTip = (config: ReachConfig) => Math.max(FOOT_TIP + faceGeometry(config.faces).shift, dialReach(config).down + TABLE_CLEARANCE)

/**
 * Between the plates' inner faces, and each dial's position: its left end, which way its narrow end points, and
 * whether it has a rib to run in a plate's groove. The two outer dials lean in to meet, and any between them, or a lone
 * dial, is straight; a lone dial's rib is on its left end alone, since a rib on both ends would leave it nothing flat to print on.
 */
function arrangement({ dials }: Pick<CounterConfig, 'dials'>) {
  const span = dials * DIAL_BODY + 2 * SEAT_GAP + 2 * SEAT_GAP * (dials - 1)
  const axleLength = span + 2 * SOCKET_DEPTH
  const placed = Array.from({ length: dials }, (_dial, i) => {
    const last = dials > 1 && i === dials - 1
    const left = -span / 2 + SEAT_GAP + i * (DIAL_BODY + 2 * SEAT_GAP)
    const side: DialSide = last ? -1 : i === 0 && dials > 1 ? 1 : 0
    return {
      left,
      side,
      rib: i === 0 || last,
      /** From the dial's frame to its place along the axle. */
      offset: left - (last ? -DIAL_RINGS[2][0] : DIAL_RINGS[0][0]),
      group: 2 * i < dials ? ('left' as const) : ('right' as const),
    }
  })
  /** Exploded, each half of the dials slides clear of the axle's end, and each plate clear of its outermost dial. */
  const leftDials = placed.filter(({ group }) => group === 'left')
  const rightDials = placed.filter(({ group }) => group === 'right')
  const leftShift = Math.max(...leftDials.map(({ left }) => left + DIAL_BODY)) + axleLength / 2 + EXPLODED_GAP
  const rightShift = rightDials.length > 0 ? axleLength / 2 + EXPLODED_GAP - Math.min(...rightDials.map(({ left }) => left)) : 0
  const leftPlateShift = -span / 2 - (placed[0].left - RIB - leftShift - EXPLODED_GAP)
  const rightPlateShift =
    rightDials.length > 0
      ? Math.max(...rightDials.map(({ left }) => left + DIAL_BODY)) + RIB + rightShift + EXPLODED_GAP - span / 2
      : axleLength / 2 + EXPLODED_GAP - span / 2
  return { span, axleLength, placed, leftShift, rightShift, leftPlateShift, rightPlateShift }
}

/** Across the counter's widest part, which sets its curve segments. */
export const counterExportSize = (config: Pick<CounterConfig, 'size' | 'faces'>): number =>
  2 * faceGeometry(config.faces).corner(DIAL_RINGS[1][1]) * counterScale(config)

export function counterParts(
  config: Pick<CounterConfig, 'dials' | 'plateFilament'>,
): { part: CounterPart; name: string; dial?: number; filament?: 3; settings?: Record<string, string> }[] {
  const plates = config.plateFilament === 3 ? { filament: 3 as const } : {}
  return [
    // The axle prints on an end, which then presses into a socket, so it keeps its first layer from spreading.
    { part: 'axle', name: 'axle', settings: { elefant_foot_compensation: '0.3' } },
    { part: 'left', name: 'left-plate', ...plates },
    { part: 'right', name: 'right-plate', ...plates },
    ...Array.from({ length: config.dials }, (_dial, i) => ({
      part: 'dial' as const,
      name: config.dials === 1 ? 'dial' : `dial-${i + 1}`,
      dial: i,
    })),
  ]
}

const blankFace = (): CounterPlateFace => ({ text: '', image: null, threshold: 0.5, invert: false })

export function defaultCounterConfig(): CounterConfig {
  return {
    kind: 'counter',
    size: DEFAULT_COUNTER_SIZE,
    dials: 2,
    faces: 10,
    first: 0,
    countDown: false,
    digits: 'inlaid',
    relief: 0.4,
    inlay: 0.8,
    mark: 'bar',
    left: blankFace(),
    right: blankFace(),
    plateFilament: 1,
    pressFit: 0,
    dialClearance: 0.1,
    click: 0,
    leadIn: 0,
    segments: previewSegmentsFor(2 * faceGeometry(10).corner(DIAL_RINGS[1][1])),
  }
}

/** What the dials count, as a reader would write it: 00–99 for ten numbers from 0, or each dial's own run of numbers. */
export function counterRange(config: Pick<CounterConfig, 'dials' | 'faces' | 'first' | 'countDown'>, dash = '–'): string {
  if (config.faces === 10 && config.first === 0) return `${'0'.repeat(config.dials)}${dash}${'9'.repeat(config.dials)}`
  const last = config.first + config.faces - 1
  return `${config.dials > 1 ? `${config.dials}×` : ''}${config.first}${dash}${last}`
}

export function counterName(config: Pick<CounterConfig, 'size' | 'dials' | 'faces' | 'first' | 'countDown'>): string {
  const original = config.dials === 2 && config.faces === 10 && config.first === 0
  return `counter-${original ? '' : `${counterRange(config, '-').replace('×', 'x')}-`}${trimNumber(config.size)}mm`
}

/** The assembly's extents, axle along X, standing on its feet at Z = 0. */
export function counterLayout(config: Pick<CounterConfig, 'size' | 'exploded' | 'dials' | 'mark' | ReachKeys>) {
  const scale = counterScale(config)
  const { span, leftPlateShift, rightPlateShift } = arrangement(config)
  const reach = dialReach(config)
  const { shift } = faceGeometry(config.faces)
  const spread = config.exploded ? leftPlateShift + rightPlateShift : 0
  return {
    width: scale * (span + 2 * PLATE + spread),
    length: scale * 2 * reach.across,
    height: scale * (footTip(config) + Math.max(config.mark === 'none' ? 0 : MARK_RADIUS + shift, PLATE_RADIUS + shift, reach.up)),
    minZ: 0,
  }
}
type ReachKeys = 'faces' | 'first' | 'countDown' | 'digits' | 'relief'

const mat4 = (x: Vec3, y: Vec3, z: Vec3, t: Vec3 = [0, 0, 0]): Mat4 => [...x, 0, ...y, 0, ...z, 0, ...t, 1] as Mat4
/** From a part's own frame to the assembly's: its Z along the axle, and its -X up, standing on feet whose tips are `tip` from the axle. */
const alongAxle = (offset: number, tip: number): Mat4 => mat4([0, 0, -1], [0, 1, 0], [1, 0, 0], [offset, 0, tip])
const reversed = (offset: number, tip: number): Mat4 => mat4([0, 0, -1], [0, -1, 0], [-1, 0, 0], [offset, 0, tip])
const asBuilt = mat4([1, 0, 0], [0, 1, 0], [0, 0, 1])
const upsideDown = mat4([1, 0, 0], [0, -1, 0], [0, 0, -1])

/**
 * Built at the default size and then scaled, so every fit and depth, which are real distances, is first shrunk by
 * the scale the model then gains.
 */
export function buildCounter(wasm: ManifoldToplevel, config: CounterConfig, font?: Font): BuildResult {
  const { CrossSection, Manifold } = wasm
  const scale = counterScale(config)
  const [pressFit, dialClearance, click, relief, inlay, leadIn, artDepth] = [
    config.pressFit,
    config.dialClearance,
    config.click,
    config.relief,
    config.inlay,
    config.leadIn,
    ART_DEPTH,
  ].map((distance) => distance / scale)
  const geometry = faceGeometry(config.faces)
  const { pitch, shift, along } = geometry
  const { span, axleLength, placed: dials, leftShift, rightShift, leftPlateShift, rightPlateShift } = arrangement(config)
  const tip = footTip(config)
  return withOwner((own) => {
    if (config.size < MIN_COUNTER_SIZE - 1e-6) throw new Error('The dials are too small for their spring arms — enlarge them')
    if (config.dialClearance <= 0) throw new Error('The dials need clearance to turn')
    if (config.relief > maximumCounterRelief(config) + 1e-6) throw new Error('Raised digits would stand past the plates — lower them')
    if (config.first + config.faces - 1 > MAX_COUNTER_VALUE)
      throw new Error(`Numbers stop at ${MAX_COUNTER_VALUE} — start lower or use fewer faces`)
    const segmentsFor = partSegments(2 * geometry.corner(DIAL_RINGS[1][1]), config.segments)
    const circle = (radius: number, [x, y]: [number, number] = [0, 0]) =>
      own(own(CrossSection.circle(radius, segmentsFor(2 * radius, 24))).translate([x, y]))
    const polar = (radius: number, angle: number): [number, number] => [
      radius * Math.cos(degrees(angle)),
      radius * Math.sin(degrees(angle)),
    ]
    const union = (sections: CrossSection[]) => own(CrossSection.union(sections))
    const sector = (inner: number, outer: number, from: number, to: number) => {
      const steps = Math.max(2, Math.ceil((segmentsFor(2 * outer, 24) * Math.abs(to - from)) / 360))
      const arc = (radius: number) => Array.from({ length: steps + 1 }, (_point, i) => polar(radius, from + ((to - from) * i) / steps))
      return own(CrossSection.ofPolygons([[...arc(outer), ...arc(inner).toReversed()]], 'NonZero'))
    }
    const prism = (section: CrossSection, from: number, to: number) => own(own(section.extrude(to - from)).translate([0, 0, from]))
    const revolved = (points: [number, number][]) =>
      own(own(CrossSection.ofPolygons([points], 'NonZero')).revolve(segmentsFor(2 * points[0][0], 48)))

    // A trough under the top of the counter, at 180°, and the lobes halfway between.
    const troughs = Array.from({ length: config.faces }, (_trough, i) => 180 + i * pitch)
    const axleOutline = own(
      union([
        circle(AXLE_CORE + shift),
        ...troughs.map((angle) => circle(LOBE_RADIUS, polar(LOBE_CENTRE + shift, angle + pitch / 2))),
      ]).subtract(union(troughs.map((angle) => circle(TROUGH_RADIUS, polar(TROUGH_CENTRE + shift, angle))))),
    )
    const axleTip = LOBE_CENTRE + LOBE_RADIUS + shift
    const axleBore = (AXLE_BORE * (TROUGH_CENTRE - TROUGH_RADIUS + shift)) / (TROUGH_CENTRE - TROUGH_RADIUS)
    /** `outline` from `from` up to `to`, scaled about the axis so its lobes' tips move `grow` outwards on the way, which slopes them at 45°. */
    const flared = (outline: CrossSection, from: number, to: number, outer: number, grow: number) =>
      own(own(outline.extrude(to - from, 0, 0, [(outer + grow) / outer, (outer + grow) / outer])).translate([0, 0, from]))
    const axleBody =
      leadIn > 0
        ? own(
            Manifold.union([
              prism(axleOutline, -axleLength / 2 + leadIn, axleLength / 2 - leadIn),
              flared(axleOutline, axleLength / 2 - leadIn, axleLength / 2, axleTip, -leadIn),
              own(flared(axleOutline, axleLength / 2 - leadIn, axleLength / 2, axleTip, -leadIn).mirror([0, 0, 1])),
            ]),
          )
        : prism(axleOutline, -axleLength / 2, axleLength / 2)
    const axle = own(axleBody.subtract(prism(circle(axleBore), -axleLength / 2 - 1, axleLength / 2 + 1)))

    const plateRadius = PLATE_RADIUS + shift
    const markRadius = MARK_RADIUS + shift
    const disc = circle(plateRadius)
    const markHalf = MARK_HALF * geometry.widthRatio
    const markOutline = (() => {
      if (config.mark === 'none') return undefined
      if (config.mark === 'pointer') {
        const base = Math.sqrt(plateRadius ** 2 - markHalf ** 2) - 0.5
        const pointer = own(
          CrossSection.ofPolygons(
            [
              [
                [-markRadius, 0],
                [-base, -markHalf],
                [-base, markHalf],
              ],
            ],
            'NonZero',
          ),
        )
        return own(pointer.subtract(disc))
      }
      const band = own(own(CrossSection.square([markRadius + 1, 2 * markHalf])).translate([-markRadius - 1, -markHalf]))
      return own(own(band.intersect(circle(markRadius))).subtract(disc))
    })()
    // The feet keep their shape round a larger or smaller disc, and step further out if a dial would reach the table.
    const footScale = Math.sqrt(plateRadius ** 2 - (FOOT[0][0] + shift) ** 2) / Math.sqrt(PLATE_RADIUS ** 2 - FOOT[0][0] ** 2)
    const footOut = tip - (FOOT_TIP + shift)
    const foot = FOOT.map(([x, y], i): [number, number] => [x + shift + (i > 0 ? footOut : 0), y * footScale])
    const archRadius =
      (ARCH_RADIUS * Math.hypot(ARCH_CENTRE - FOOT_TIP, FOOT[2][1] * footScale)) / Math.hypot(ARCH_CENTRE - FOOT_TIP, FOOT[2][1])
    const feet = own(
      own(CrossSection.ofPolygons([[...foot, ...foot.map(([x, y]): [number, number] => [x, -y]).toReversed()]], 'NonZero')).subtract(
        circle(archRadius, [ARCH_CENTRE + shift + footOut, 0]),
      ),
    )
    const groove = revolved([
      [GROOVE_RADIUS + shift, PLATE / 2 - GROOVE_DEPTH],
      [GROOVE_RADIUS + shift + GROOVE_DEPTH + OVERCUT, PLATE / 2 + OVERCUT],
      [GROOVE_RADIUS + shift, PLATE / 2 + OVERCUT],
    ])
    const socketOutline =
      pressFit > 0 ? own(own(axleOutline.offset(pressFit, 'Round', 2, segmentsFor(2 * LOBE_RADIUS, 24))).simplify(1e-3)) : axleOutline
    const bossRadius = axleBore - pressFit
    const socketFloor = PLATE / 2 - SOCKET_DEPTH
    /** A lead-in flares the socket's mouth and chamfers the boss's top, each at 45°, to meet the axle's chamfered ends. */
    const socket =
      leadIn > 0
        ? own(
            own(
              Manifold.union([
                prism(socketOutline, socketFloor, PLATE / 2 + OVERCUT),
                flared(socketOutline, PLATE / 2 - leadIn, PLATE / 2 + OVERCUT, axleTip + pressFit, leadIn + OVERCUT),
              ]),
            ).subtract(
              own(
                Manifold.union([
                  own(
                    own(
                      Manifold.cylinder(PLATE / 2 - leadIn - socketFloor + 1, bossRadius, bossRadius, segmentsFor(2 * bossRadius, 24)),
                    ).translate([0, 0, socketFloor - 1]),
                  ),
                  own(
                    own(Manifold.cylinder(leadIn, bossRadius, bossRadius - leadIn, segmentsFor(2 * bossRadius, 24))).translate([
                      0,
                      0,
                      PLATE / 2 - leadIn,
                    ]),
                  ),
                ]),
              ),
            ),
          )
        : prism(own(socketOutline.subtract(circle(bossRadius))), socketFloor, PLATE / 2 + OVERCUT)
    const outer = -PLATE / 2
    const coloured = config.digits !== 'engraved'
    /** Each plate's outer face read from outside, upright with the mark at the top. */
    const plateArt = (face: CounterPlateFace) => {
      const art = faceArtwork(wasm, own, circle(plateRadius - ART_MARGIN), { ...face, textHeight: ART_TEXT_HEIGHT }, font)
      if (!art) return undefined
      return own(own(art.rotate(90)).scale([1, -1]))
    }
    const plate = (face: CounterPlateFace) => {
      const art = plateArt(face)
      const cuts = [socket, groove, ...(art ? [prism(art, outer - OVERCUT, outer + artDepth)] : [])]
      const body = own(prism(union([disc, feet]), outer, PLATE / 2).subtract(own(Manifold.union(cuts))))
      const mark = markOutline && prism(markOutline, outer, PLATE / 2)
      const artInlay = art && prism(art, outer, outer + artDepth)
      if (!coloured) return { body: mark ? own(Manifold.union([body, mark])) : body }
      const colours = [mark, artInlay].filter((solid) => solid !== undefined)
      return { body, colour: colours.length > 0 ? own(Manifold.union(colours)) : undefined }
    }
    const plates = { left: plate(config.left), right: plate(config.right) }

    const bulbAngle = geometry.bulbAngle
    const round = (angle: number) => bulbAngle + angle * along
    const bulbCentre = polar(BULB_CENTRE + shift - click, bulbAngle)
    // The slot and the relief reach a little into the arm, which is subtracted from them, so only the arm's own edges
    // bound it, and the slot's two pieces overlap where they meet, so no edge of one ends on an edge of the other.
    const slot = union([
      sector(ARM_OUTER + shift - 0.05, SLOT_OUTER + shift, round(SLOT_ROUNDING - 0.5), bulbAngle),
      own(
        sector(ARM_OUTER + shift - 0.05, SLOT_OUTER + shift, round(RELIEF_END), round(SLOT_ROUNDING + 0.5)).intersect(
          circle(SLOT_END_RADIUS, polar(SLOT_END_CENTRE[0] + shift, round(SLOT_END_CENTRE[1]))),
        ),
      ),
    ])
    const arm = own(
      // Running past the arm's outer edge, so the one circle that clips it draws that edge along its whole length.
      union([sector(ARM_INNER + shift, ARM_OUTER + shift + 1, round(RELIEF_END - 1), bulbAngle), circle(BULB, bulbCentre)]).intersect(
        circle(ARM_OUTER + shift),
      ),
    )
    const boreRadius = axleTip + dialClearance
    const bore = own(
      union([
        circle(boreRadius),
        sector(boreRadius - 0.01, ARM_INNER + shift + 0.05, round(RELIEF_END), bulbAngle),
        slot,
        circle(BULB + BULB_CLEAR, bulbCentre),
      ]).subtract(arm),
    )
    const ring = ([z, apothem]: [number, number]): Vec3[] =>
      Array.from({ length: config.faces }, (_corner, i) => {
        const [x, y] = polar(geometry.corner(apothem), FIRST_FACE + pitch / 2 + i * pitch)
        return [x, y, z]
      })
    const rib = revolved([
      [RIB_RADIUS + shift, -DIAL_HALF],
      [RIB_RADIUS + shift + RIB, -DIAL_HALF + RIB],
      [RIB_RADIUS + shift + RIB, -DIAL_HALF + RIB + OVERCUT],
      [RIB_RADIUS + shift, -DIAL_HALF + RIB + OVERCUT],
    ])
    const boreCut = prism(bore, -DIAL_HALF - 1, DIAL_HALF + 1)
    const dialBody = (rings: [number, number][], ribbed: boolean) => {
      const hull = own(Manifold.hull(rings.flatMap(ring)))
      return own((ribbed ? own(Manifold.union([hull, rib])) : hull).subtract(boreCut))
    }

    const numbers = dialNumbers(config)
    /** Every number on its face, as a solid from `from` to `to` along the face's normal, for a dial whose narrow end is towards `side` along Z. */
    const engraved = (side: DialSide, from: number, to: number) =>
      own(
        Manifold.union(
          numbers.map(({ angle, rings }) => {
            const { across, along: up, normal, origin } = faceFrame(side, angle, shift)
            const section = own(CrossSection.ofPolygons(rings, 'EvenOdd'))
            return own(prism(section, from, to).transform(mat4(across, up, normal, origin)))
          }),
        ),
      )
    /** Inlaid numbers are engraved and filled below by the second filament; engraved ones are left for paint; raised ones stand on the faces in the second filament. */
    const dial = ({ side, rib: ribbed }: { side: DialSide; rib: boolean }) => {
      const shape = dialBody(side === 0 ? STRAIGHT_RINGS : DIAL_RINGS, ribbed)
      const body = side < 0 ? own(shape.mirror([0, 0, 1])) : shape
      if (config.digits === 'raised') return { body, colour: engraved(side, 0, relief) }
      if (config.digits === 'engraved') return { body: own(body.subtract(engraved(side, -relief, OVERCUT))) }
      return {
        body: own(body.subtract(engraved(side, -relief - inlay, OVERCUT))),
        colour: engraved(side, -relief - inlay, -relief),
      }
    }
    const scaled = (solid: Manifold) => (scale === 1 ? solid : own(solid.scale(scale)))
    const platesInThird = config.plateFilament === 3

    if (config.part) {
      const index = config.dial ?? 0
      if (config.part === 'dial' && !dials[index]) throw new Error(`The counter has no dial ${index + 1}`)
      const { body, colour, printed } =
        config.part === 'axle'
          ? { body: axle, colour: undefined, printed: asBuilt }
          : config.part === 'dial'
            ? // Each dial prints with its rib on top, so a leaning dial stands on its narrow end and its faces lean out no more than their draft.
              { ...dial(dials[index]), printed: dials[index].side < 0 ? asBuilt : upsideDown }
            : { ...plates[config.part], printed: asBuilt }
      const laid = own(body.transform(printed))
      const { min, max } = laid.boundingBox()
      const shiftTo: Vec3 = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]]
      return buildResult(scaled(own(laid.translate(shiftTo))), colour && scaled(own(own(colour.transform(printed)).translate(shiftTo))))
    }

    const exploded = config.exploded ?? false
    /** An exploded view with more dials on one side than the other is moved back to the middle. */
    const centring = exploded ? (leftPlateShift - rightPlateShift) / 2 : 0
    /** Each dial turned so its bulb drops into the trough under the mark, which puts its first value on top. */
    const turned = (solid: Manifold) => own(solid.rotate([0, 0, 180 - bulbAngle]))
    const atPlace = (solid: Manifold | undefined, transform: Mat4, turn = false) =>
      solid && own((turn ? turned(solid) : solid).transform(transform))
    const leftAt = alongAxle(centring - span / 2 - PLATE / 2 - (exploded ? leftPlateShift : 0), tip)
    const rightAt = reversed(centring + span / 2 + PLATE / 2 + (exploded ? rightPlateShift : 0), tip)
    const bodies: Manifold[] = [own(axle.transform(alongAxle(centring, tip)))]
    const colours: (Manifold | undefined)[] = []
    const thirds: Manifold[] = []
    const leftPlate = [atPlace(plates.left.body, leftAt)!, atPlace(plates.left.colour, leftAt)] as const
    const rightPlate = [atPlace(plates.right.body, rightAt)!, atPlace(plates.right.colour, rightAt)] as const
    ;(platesInThird ? thirds : bodies).push(leftPlate[0], rightPlate[0])
    colours.push(leftPlate[1], rightPlate[1])
    for (const placement of dials) {
      const built = dial(placement)
      const slide = exploded ? (placement.group === 'left' ? -leftShift : rightShift) : 0
      const at = alongAxle(centring + placement.offset + slide, tip)
      bodies.push(atPlace(built.body, at, true)!)
      colours.push(atPlace(built.colour, at, true))
    }
    const seconds = colours.filter((solid) => solid !== undefined)
    return buildResult(
      scaled(own(Manifold.union(bodies))),
      seconds.length > 0 ? scaled(own(Manifold.union(seconds))) : undefined,
      thirds.length > 0 ? scaled(own(Manifold.union(thirds))) : undefined,
    )
  })
}
