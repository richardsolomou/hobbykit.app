import type { CrossSection, Manifold, ManifoldToplevel, Mat4, Vec3 } from 'manifold-3d'
import type { Font } from 'opentype.js'
import type { BuildResult } from './base'
import { trimNumber } from './outline'
import { previewSegmentsFor } from './quality'
import { GLYPH_FILL, textPolygons, type Polygon } from './text'
import type { CounterConfig, CounterLayout, CounterPart, CounterTile } from './types'

const PLA_DENSITY = 1.24e-3
const FACES = 10
const HALF_FACE = Math.PI / FACES
const FACE_DEGREES = 360 / FACES
/** Height of each insert's tile under its raised digit; the 3MF changes filament above it. */
export const COUNTER_TILE_BASE = 0.6
/** How far a digit stands up from its tile, which leaves it flush with the face. */
const RELIEF = 0.2
/** Depth of the pocket each insert presses into. */
export const COUNTER_POCKET = COUNTER_TILE_BASE + RELIEF
/** Depth of the digits cut into the faces when there are no inserts: just enough to hold a touch of paint, so a painted digit reads as flush. */
export const COUNTER_ENGRAVING = 0.2
/** Pockets and engravings start this far outside the face they cut, so no face is left coplanar. */
const OVERCUT = 0.05
/** The widest digit's width as a share of its height, rounded up from Oswald's. */
export const COUNTER_WIDEST_DIGIT = 0.6
/** Space between a digit and the lines above and below it. */
const DIGIT_MARGIN = 0.25
/** Width of the line along each long edge of a digit's face, part of the digit's mark, so the two either side of the top row frame the count in the digits' colour and a dial needs no second colour of its own. */
const DIGIT_LINE = 0.35
const MIN_DIGIT_HEIGHT = 3
/** Extra width of a dial, split either side of its digit, since the dial itself is what a thumb turns. */
const DIAL_BAND = 1.14
/** How far the band round each end of a dial stands out past its corners. */
const BAND_HEIGHT = 0.31
/** How far along each face a dial's corners are bevelled, which softens them and keeps the end band's chamfer from meeting a corner edge at a single point. */
const CORNER_BEVEL = 0.2
/** Width of the raised band round each end of a dial, which with the lines above and below each digit frames every number. */
const FRAME_BAND = 0.4
const FRAME_RELIEF = 0.08
/** How far under the barrel's surface the chamfer runs, so it leaves no edge lying exactly on it. */
const FRAME_BURY = 0.1
/** Clearance between the dials and the table. */
const FOOT_GAP = 0.2
/** Room left round a digit along the axle, inside its pocket. */
const POCKET_END_MARGIN = 0.25
/** Barrel left between neighbouring pockets, each side of a corner, which grips the tiles. */
const POCKET_WALL = 0.45
/** Barrel left across a wheel's inner end, past its pockets. */
const INNER_WALL = 0.4
/** Gap between the wheels, and between a wheel and a side piece. */
const FACE_GAP = 0.1
/** Thickness of a hub. */
const SIDE_PLATE = 2.27
/** Depth of the socket each end of the axle tube presses into. */
export const COUNTER_SOCKET = 1.82
/** The tube stops this far short of the bottom of each socket, so its ends are what seat a side piece. */
const AXLE_END_GAP = 0.05
/** Real gap round the tube in a socket's lobed wall: a press fit, which the lobes also stop turning. */
const AXLE_PRESS_FIT = 0.1
/** Crest radius of the lobes on the axle tube, and the radius of its hollow. */
const AXLE_RADIUS = 5.56
const AXLE_BORE = 4.25
/** Room between the tube's hollow and the boss in each socket that fills it. */
const BOSS_CLEARANCE = 0.23
const LOBE_STEPS = 8
/** Each wheel's cavity: the outside of its arms, and the wall the arms flex towards. */
const ARM_OUTER = 6.44
const ARM_TRAVEL = 0.86
/** How far round the wheel each arm runs from its tip to its root. */
const ARM_SPAN = (72 * Math.PI) / 180
const ARM_STEPS = 16
/** How far an arm continues past its bulb's centre, and the width of the gap that frees its tip. */
const ARM_TIP_EXTRA = 0.95
const ARM_TIP_GAP = 0.6
/** The round bulb at an arm's tip. */
const BULB_RADIUS = 0.8
const BULB_STEPS = 24
/** How far a bulb reaches past the bottom of a trough, so the two opposed arms grip the axle and centre the wheel with no play. */
const BULB_REACH = 0.06
/** Solid left between an arm's cavity and the face pockets. */
const CAVITY_WALL = 0.45
/** The bracket inlaid flush in the top of each side piece or hub that marks the top row, a part of its own in the second filament: how deep it goes, how far each prong is from the middle, and how far back from its outer end the bar joining them starts. */
const INDICATOR_DEPTH = 2
const INDICATOR_INNER = 2.25
const INDICATOR_OUTER = 2.85
const INDICATOR_BAR = 0.6
/** Real play round a bracket in its slot: it presses in from above like a tile, so the side piece or hub prints in one colour and the bracket in any. */
const BRACKET_FIT = 0.1
/** Space between inserts laid out on their plate. */
const INSERT_SPACING = 3
/** How far an exploded preview lifts each tile clear of its pocket. */
const EXPLODED_LIFT = 3
/** Space an exploded preview leaves past a wheel's whole length. */
const EXPLODED_CLEAR = 2
/** How many wheel spreads an exploded preview moves the end pieces, which draws the axle clear out of the wheel beside it. */
const EXPLODED_ENDS = 3
/** Wall round the socket in a hub. */
const HUB_WALL = 1.2
/** One leg of a hub, from inside its disc down to a foot. */
const LEG: [number, number][] = [
  [1, -6],
  [3.63, -9.51],
  [7.26, -9.51],
  [8.17, -7.69],
  [5, -4.5],
]
/** In the frame layout, a frame in the second colour boxes the top row: a rail along each of its edges and a bar past each dial's outer end. The rails stand this far clear of the end bands' sweep, start this far out from the middle, and are this wide and thick. */
const WINDOW_CLEAR = 0.2
const WINDOW_INNER = 2.9
const WINDOW_RAIL = 0.9
const WINDOW_THICKNESS = 0.45
/** Under each end bar the frame stands on a post down into the base plate, which also holds the tube: this far clear of the dial, this thick along the tube, its legs either side of the tube this wide, sunk into the plate all but this floor, with this much real play in every fit. */
const POST_GAP = 0.3
const POST = 1.2
const POST_LEG = 1.2
const POST_FLOOR = 0.2
const FRAME_FIT = 0.05
/** The tube's ends are cut to two flats this far either side of the middle, which drop between the post's legs so the tube cannot turn. */
const TUBE_KEY = 4.2
/** The base plate under the dials, below the sweep of their end bands: its thickness and half its depth. */
const BASE_PLATE = 1
const BASE_HALF = 7
/** With side knobs there is no tube: each dial runs on as a lobed shaft through a ten-sided hub that the counter stands on, whose spring arms click on the lobes, to a ribbed knob pressed on outside it. The knob's length, rib depth and rib count, how deep the shaft goes into it, and the real play round the shaft in the knob. */
const KNOB_LENGTH = 2.5
const KNOB_RIB = 0.35
const KNOB_RIBS = 24
const KNOB_SOCKET = 1.8
const KNOB_FIT = 0.05
/** The enclosure layout: a ten-sided case round the dials, which have no end bands there, this far clear of their corners' sweep, with walls this thick; a window over the top row, this far past the tiles either side, its long edges bevelled at 45° so the wall hides none of the number; and a lip this long on one half that fits a step in the other. */
const CASE_GAP = 0.2
const CASE_WALL = 0.7
const WINDOW_MARGIN = 0.15
const CASE_LIP = 0.8
/** A rod runs free through both knob dials and their shafts, stopping this far short of each shaft's end inside its knob, so the dials stay in line and the counter holds together as one piece. */
const ROD_SHORT = 0.05

/** The wheel diameter the caddy is designed at. Above it the whole caddy scales, so its walls and digits grow with it. */
export const COUNTER_BASE_DIAMETER = 18
/** The size the design was drawn at, and the default: smaller dials are fiddly to turn. */
export const COUNTER_FULL_SIZE = 39.6
export const counterScale = ({ drumDiameter }: Pick<CounterConfig, 'drumDiameter'>): number =>
  Math.max(1, drumDiameter / COUNTER_BASE_DIAMETER)
/** The design a scaled caddy is built from: fits are real gaps, which must not grow, so they shrink here by the scale the model then gains. */
const atBaseSize = <
  T extends Pick<CounterConfig, 'drumDiameter'> & Partial<Pick<CounterConfig, 'clearance' | 'click' | 'insertClearance' | 'grip'>>,
>(
  config: T,
): T => {
  const scale = counterScale(config)
  return {
    ...config,
    drumDiameter: config.drumDiameter / scale,
    ...(config.clearance === undefined ? {} : { clearance: config.clearance / scale }),
    ...(config.click === undefined ? {} : { click: config.click / scale }),
    ...(config.insertClearance === undefined ? {} : { insertClearance: config.insertClearance / scale }),
    ...(config.grip === undefined ? {} : { grip: config.grip / scale }),
  }
}
export const MIN_COUNTER_CLICK = 0.15
/** An arm must keep some of the room behind it when a lobe's crest passes under its nub. */
export const maximumCounterClick = (config: Pick<CounterConfig, 'drumDiameter'>): number => counterScale(config) * (ARM_TRAVEL - 0.15)

export function counterParts(config: Pick<CounterConfig, 'digits' | 'layout'>): { part: CounterPart; name: string; filament?: 2 }[] {
  return [
    ...(config.layout === 'centre' ? [{ part: 'stand' as const, name: 'base' }] : []),
    ...(config.layout === 'centre' ? [{ part: 'frame' as const, name: 'frame', filament: 2 as const }] : []),
    ...(config.layout === 'centre'
      ? []
      : [
          { part: 'left' as const, name: config.layout === 'enclosure' ? 'left-case' : 'left-hub' },
          { part: 'right' as const, name: config.layout === 'enclosure' ? 'right-case' : 'right-hub' },
        ]),
    // Knob layouts' rod is part of the left knob, and the hubs' tube part of the left hub.
    ...(config.layout === 'knobs' || config.layout === 'enclosure'
      ? [{ part: 'axle' as const, name: 'left-knob' }]
      : config.layout === 'centre'
        ? [{ part: 'axle' as const, name: 'tube' }]
        : []),
    { part: 'tens', name: 'tens-wheel' },
    { part: 'units', name: 'units-wheel' },
    ...(config.layout === 'centre' || config.layout === 'enclosure'
      ? []
      : [
          { part: 'bracket' as const, name: 'left-bracket' },
          { part: 'bracket' as const, name: 'right-bracket' },
        ]),
    ...(config.layout === 'knobs' || config.layout === 'enclosure' ? [{ part: 'knob' as const, name: 'right-knob' }] : []),
    ...(config.digits === 'tiles' ? [{ part: 'inserts' as const, name: 'inserts' }] : []),
  ]
}

export function defaultCounterConfig(): CounterConfig {
  return {
    kind: 'counter',
    drumDiameter: COUNTER_FULL_SIZE,
    layout: 'enclosure',
    grip: 4,
    digits: 'tiles',
    digitFilament: 2,
    insertClearance: 0.05,
    clearance: 0.2,
    click: 1.5,
    segments: previewSegmentsFor(COUNTER_FULL_SIZE),
  }
}

/** Large enough for a readable digit on each tile, and for the spring arms' cavity to stay clear of the face pockets. */
export const MINIMUM_COUNTER_DRUM_DIAMETER = Math.max(
  (MIN_DIGIT_HEIGHT + 2 * (DIGIT_MARGIN + DIGIT_LINE + POCKET_WALL)) / Math.sin(HALF_FACE),
  (2 * (ARM_OUTER + ARM_TRAVEL + CAVITY_WALL + COUNTER_POCKET)) / Math.cos(HALF_FACE),
)

const pocketAcross = ({ drumDiameter }: Pick<CounterConfig, 'drumDiameter'>) => (drumDiameter / 2) * Math.sin(HALF_FACE) - POCKET_WALL
/** Digits fill their face, so the wheel's diameter sets their height. */
export const counterDigitHeight = (config: Pick<CounterConfig, 'drumDiameter'>): number =>
  counterScale(config) * 2 * (pocketAcross(atBaseSize(config)) - DIGIT_LINE - DIGIT_MARGIN)
/** Each wheel's barrel length: just wide enough for the widest digit at that height. */
export const counterDrumWidth = (requested: Pick<CounterConfig, 'drumDiameter'>): number =>
  counterScale(requested) * (2 * pocketHalfSize({ ...atBaseSize(requested), grip: 0 }).x + INNER_WALL + DIAL_BAND)

/** Half the size of each face's pocket, along the axle and across the face; the pocket runs the dial's whole length between its end bands, grip included. */
function pocketHalfSize(config: Pick<CounterConfig, 'drumDiameter' | 'grip'>) {
  return {
    x: (counterDigitHeight(atBaseSize(config)) * COUNTER_WIDEST_DIGIT) / 2 + POCKET_END_MARGIN + config.grip / 2,
    y: pocketAcross(config),
  }
}

/** How thick the piece at each end of the tube is, along it. */
const END_THICKNESS: Record<Exclude<CounterLayout, 'centre'>, number> = {
  hubs: SIDE_PLATE,
  knobs: SIDE_PLATE + FACE_GAP + KNOB_LENGTH,
  enclosure: SIDE_PLATE + FACE_GAP + KNOB_LENGTH,
}

export function counterLayout(requested: Pick<CounterConfig, 'drumDiameter' | 'exploded' | 'layout' | 'grip'>) {
  const config = atBaseSize(requested)
  const scale = counterScale(requested)
  const drumWidth = counterDrumWidth(config)
  const corner = config.drumDiameter / 2
  const flat = corner * Math.cos(HALF_FACE)
  /** How far the end bands reach from the axle. */
  const knurl = corner + BAND_HEIGHT
  /** The frame layout stands on a base plate under the dials. */
  const framed = config.layout === 'centre'
  /** Knob hubs and knobs are decagons the size of the dials' end bands, and the counter stands on a flat of either hub. */
  const hubCorner = knurl - FRAME_RELIEF + 0.05
  /** From the axle to the table. */
  /** An enclosure's case stands on a flat, its inside this far clear of the end bands' sweep. */
  const caseInner = corner + CASE_GAP
  const rise =
    config.layout === 'knobs'
      ? hubCorner * Math.cos(HALF_FACE)
      : config.layout === 'enclosure'
        ? caseInner + CASE_WALL
        : knurl + FOOT_GAP + (framed ? BASE_PLATE : 0)
  /** From the middle of the axle to each dial's inner end. */
  const inner = FACE_GAP
  const dialLength = drumWidth + config.grip
  /** From the middle of the axle to the inside of the piece at each end. */
  const endFace = inner + dialLength + FACE_GAP
  const spread = config.exploded ? dialLength + EXPLODED_CLEAR : 0
  const lift = config.exploded ? EXPLODED_LIFT : 0
  /** The end bands are decagons just inside `knurl`, flat on top and with a corner out to each side. */
  const band = knurl - FRAME_RELIEF
  /** The bracket on a knob hub reaches up through its top flat. */
  const hubFlat = config.layout === 'knobs' || config.layout === 'enclosure' ? rise : 0
  const reach = Math.max(flat, band * Math.cos(HALF_FACE), hubFlat)
  const sideways = Math.max(band, hubFlat / Math.cos(HALF_FACE), config.exploded ? corner + lift : 0)
  /** The underside of the frame, where its rails' inner edges clear the end bands' sweep; how far out it reaches along the tube, to the outside of its posts; and how far an exploded preview lifts it clear of the dials. */
  const windowBottom = Math.sqrt((band + WINDOW_CLEAR) ** 2 - WINDOW_INNER ** 2)
  const frameEnd = inner + dialLength + POST_GAP + POST
  const raise = config.exploded && framed ? rise + flat + lift + 1 : 0
  const top = rise + Math.max(reach, flat + lift, framed ? windowBottom + WINDOW_THICKNESS + raise : 0)
  /** An exploded base plate drops clear below the dials and their lifted tiles, since it runs under them. */
  const drop = config.exploded && framed ? 2 * flat + lift + COUNTER_POCKET + 1 : 0
  const minZ = Math.min(0, rise - flat - lift, -drop)
  return {
    corner: scale * corner,
    flat: scale * flat,
    knurl: scale * knurl,
    rise: scale * rise,
    inner: scale * inner,
    dialLength: scale * dialLength,
    endFace: scale * endFace,
    spread: scale * spread,
    lift: scale * lift,
    drop: scale * drop,
    windowBottom: scale * windowBottom,
    raise: scale * raise,
    frameEnd: scale * frameEnd,
    caseInner: scale * caseInner,
    width:
      scale *
      2 *
      (config.layout === 'centre'
        ? Math.max(inner + dialLength + spread, frameEnd)
        : endFace + END_THICKNESS[config.layout] + (EXPLODED_ENDS + (config.layout === 'hubs' ? 0 : 1)) * spread),
    length: scale * 2 * sideways,
    height: scale * (top - minZ),
    minZ: scale * minZ,
  }
}

export interface CounterTilePlacement {
  tile: CounterTile
  /** The wheel a tile is for; both wheels' tiles for a digit are alike. */
  drum: 'tens' | 'units'
  /** The tile base's lower-left corner, with the plate's at the origin. */
  x: number
  y: number
}

/** Every tile lies face up, a row of 0–9 for the tens wheel above one for the units wheel. */
export function counterTileLayout(requested: Pick<CounterConfig, 'drumDiameter' | 'insertClearance' | 'grip'>): CounterTilePlacement[] {
  const config = atBaseSize(requested)
  const pocket = pocketHalfSize(config)
  const scale = counterScale(requested)
  const across = scale * (2 * (pocket.x - config.insertClearance) + INSERT_SPACING)
  const down = scale * (2 * (pocket.y - config.insertClearance) + INSERT_SPACING)
  const digits = (drum: 'tens' | 'units', row: number) =>
    Array.from({ length: FACES }, (_digit, digit) => ({ tile: digit as CounterTile, drum, x: digit * across, y: row * down }))
  return [...digits('tens', 1), ...digits('units', 0)]
}

export function counterName(config: CounterConfig): string {
  return `counter-${trimNumber(config.drumDiameter)}mm`
}

const mat4 = (x: Vec3, y: Vec3, z: Vec3, t: Vec3 = [0, 0, 0]): Mat4 => [...x, 0, ...y, 0, ...z, 0, ...t, 1] as Mat4
/** Turns a solid built along Z to lie along X: (a, b, h) becomes (h, b, -a). */
const ALONG_X = mat4([0, 0, -1], [0, 1, 0], [1, 0, 0])
/** A point in the YZ plane as the 2D coordinate that lands there once extruded and turned along X. */
const yz = (y: number, z: number): [number, number] => [-z, y]
/** A positive angle rolls the top of a wheel towards the front, which is -Y, and the bottom towards the back. */
const rollX = (degrees: number): Mat4 => {
  const a = (degrees * Math.PI) / 180
  return mat4([1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)])
}

/**
 * A slim caddy of three structural pieces and two dials: a hollow fluted tube pressed between two side pieces,
 * with two ten-sided wheels, tens on the left and units on the right, turning on the tube. Each end of the tube
 * goes into an annular socket in a side piece, between a lobed wall that stops it turning and a boss that fills
 * its hollow.
 *
 * The caddy is turned by its dials, which have a rib along each corner to grip.
 *
 * Each wheel clicks on two spring arms cut into its own centre, opposite each other. An arm is a curved
 * strip left between the wheel's bore and a crescent cut behind it, with a round bulb at its tip that sits in
 * a trough between the tube's lobes. Opposed arms grip the tube from both sides, which centres the wheel
 * with no play. A wheel prints standing on its outer face, so an arm is a plain extrusion up from the plate.
 *
 * The assembly is modelled the way it is used, axle along X, front towards -Y.
 */
export function buildCounter(wasm: ManifoldToplevel, requested: CounterConfig, font: Font): BuildResult {
  const config = atBaseSize(requested)
  const scale = counterScale(requested)
  const { CrossSection, Manifold } = wasm
  const trash: { delete: () => void }[] = []
  const own = <T extends { delete: () => void }>(value: T): T => {
    trash.push(value)
    return value
  }

  try {
    if (config.clearance <= 0) throw new Error('The wheels need clearance to turn')
    const maxClick = maximumCounterClick(requested)
    if (requested.click < MIN_COUNTER_CLICK - 1e-6 || requested.click > maxClick + 1e-6) {
      throw new Error(`The click must be from ${MIN_COUNTER_CLICK} to ${trimNumber(maxClick)}mm at this wheel size`)
    }
    if (requested.drumDiameter < MINIMUM_COUNTER_DRUM_DIAMETER - 1e-6) {
      throw new Error('Wheels are too small for their digits and spring arms — enlarge them')
    }
    if (config.insertClearance < 0) throw new Error('Inserts need a clearance of zero or more')

    const { segments, clearance: gap } = config
    if (config.grip < 0) throw new Error('The grip cannot be less than nothing')
    const { corner, flat, knurl, rise, inner, dialLength, endFace, spread, lift, drop, windowBottom, raise, frameEnd, caseInner } =
      counterLayout(config)
    const alongX = (solid: Manifold) => own(solid.transform(ALONG_X))
    const prism = (section: CrossSection, length: number) => alongX(own(section.extrude(length)))
    const polygon = (points: Polygon) => own(CrossSection.ofPolygons([points], 'NonZero'))
    const rectangle = (x: number, y: number) => own(CrossSection.square([2 * x, 2 * y], true))
    const pointAt = (radius: number, angle: number) => yz(radius * Math.cos(angle), radius * Math.sin(angle))

    // The wheel's centre: a bore, and behind each arm a crescent joined to the bore at the arm's free tip.
    const troughRadius = AXLE_RADIUS - config.click
    const wheelBore = AXLE_RADIUS + gap
    const crescentOuter = ARM_OUTER + ARM_TRAVEL
    const arc = (radius: number, from: number, to: number, steps = ARM_STEPS) =>
      Array.from({ length: steps + 1 }, (_point, i) => pointAt(radius, from + ((to - from) * i) / steps))
    const armCuts = (tip: number) => {
      const middle = (wheelBore + ARM_OUTER) / 2
      const free = tip - ARM_TIP_EXTRA / middle
      const open = free - ARM_TIP_GAP / middle
      const root = tip + ARM_SPAN
      return [
        // Running on a little past the gap, so the two cuts share no edge.
        polygon([...arc(crescentOuter, open - 0.02, root), ...arc(ARM_OUTER, root, open - 0.02)]),
        polygon([...arc(ARM_OUTER + 0.1, open, free, 2), ...arc(wheelBore - 0.5, free, open, 2)]),
      ]
    }
    const bulb = (tip: number) => {
      const [y, z] = pointAt(troughRadius - BULB_REACH + BULB_RADIUS, tip)
      return polygon(
        Array.from({ length: BULB_STEPS }, (_point, i) => {
          const angle = (2 * Math.PI * i) / BULB_STEPS
          return [y + BULB_RADIUS * Math.cos(angle), z + BULB_RADIUS * Math.sin(angle)]
        }),
      )
    }
    const armTips = [Math.PI / 2, (3 * Math.PI) / 2]
    const centreCut = own(
      own(CrossSection.union([own(CrossSection.circle(wheelBore, segments)), ...armTips.flatMap(armCuts)])).subtract(
        own(CrossSection.union(armTips.map(bulb))),
      ),
    )
    const ring = (radius: number, x: number): Vec3[] =>
      Array.from({ length: FACES }, (_corner, i) => {
        const angle = Math.PI / 2 + HALF_FACE + (2 * Math.PI * i) / FACES
        return [x, radius * Math.cos(angle), radius * Math.sin(angle)]
      })
    /** As a dial prints, its outer end is on the plate and its inner end is on top, so the inner band's underside is chamfered at 45°. */
    const frameRadius = knurl - FRAME_RELIEF
    /** A dial with a knob prints on its inner end instead, with its shaft on top, so its outer band is chamfered too. */
    /** Knob layouts turn each dial by a shaft through the piece at its end; the enclosure's ends are the ends of its case. */
    const knobbed = config.layout === 'knobs' || config.layout === 'enclosure'
    const cased = config.layout === 'enclosure'
    const chamfer = frameRadius - corner + FRAME_BURY
    const frameBands = (): Manifold[] => [
      own(Manifold.hull([...ring(frameRadius, 0), ...ring(frameRadius, FRAME_BAND), ...ring(corner - FRAME_BURY, FRAME_BAND + chamfer)])),
      own(
        Manifold.hull([
          ...(knobbed ? [...ring(corner - FRAME_BURY, dialLength - FRAME_BAND - chamfer)] : []),
          ...ring(frameRadius, dialLength - FRAME_BAND),
          ...ring(frameRadius, dialLength),
        ]),
      ),
    ]
    const corners = Array.from({ length: FACES }, (_corner, i) => pointAt(corner, Math.PI / 2 + HALF_FACE + (2 * Math.PI * i) / FACES))
    const towards = ([x, y]: [number, number], [tx, ty]: [number, number]): [number, number] => {
      const length = Math.hypot(tx - x, ty - y)
      return [x + (CORNER_BEVEL * (tx - x)) / length, y + (CORNER_BEVEL * (ty - y)) / length]
    }
    const barrel = polygon(
      corners.flatMap((point, i) => [towards(point, corners[(i + FACES - 1) % FACES]), towards(point, corners[(i + 1) % FACES])]),
    )
    const dial = cased ? prism(barrel, dialLength) : own(Manifold.union([prism(barrel, dialLength), ...frameBands()]))
    const centred = own(dial.subtract(own(prism(centreCut, dialLength + 2).translate([-1, 0, 0]))))
    /** Lobed so a trough lies under each flat at every count; `grow` opens the same shape out for a socket. */
    const lobeCount = FACES * LOBE_STEPS
    const lobed = (grow: number) =>
      polygon(
        Array.from({ length: lobeCount }, (_point, i) => {
          const angle = Math.PI / 2 + (2 * Math.PI * i) / lobeCount
          return pointAt(grow + AXLE_RADIUS - (config.click * (1 + Math.cos(FACES * (angle - Math.PI / 2)))) / 2, angle)
        }),
      )
    /** A knob dial has no arms of its own: it is solid round a bore for the pin, and runs on as a lobed shaft through its hub and into its knob. */
    const shaftLength = FACE_GAP + SIDE_PLATE + FACE_GAP + KNOB_SOCKET - 0.1
    const bore = (length: number) => own(prism(own(CrossSection.circle(AXLE_BORE, segments)), length + 2).translate([-1, 0, 0]))
    const wheelBody = (() => {
      if (!knobbed) return centred
      const shaft = own(prism(lobed(0), shaftLength + 0.1).translate([dialLength - 0.1, 0, 0]))
      return own(own(Manifold.union([dial, shaft])).subtract(bore(dialLength + shaftLength)))
    })()

    const digitPolygons = Array.from({ length: FACES }, (_digit, digit) => textPolygons(font, String(digit), 1))
    const { x: pocketX, y: pocketY } = pocketHalfSize(config)
    const digitHeight = counterDigitHeight(config)
    if (digitHeight < MIN_DIGIT_HEIGHT) throw new Error('Digits would be too small to read — enlarge the wheels')
    /** A tile's lines stop at its edge, inside the pocket by the clearance; printed and engraved lines run to the pocket's. */
    const lineEdge = config.digits === 'tiles' ? config.insertClearance : 0
    const lines = own(
      CrossSection.union(
        [-1, 1].map((side) =>
          own(
            own(CrossSection.square([2 * (pocketX - lineEdge), DIGIT_LINE - lineEdge], true)).translate([
              0,
              side * (pocketY - (DIGIT_LINE + lineEdge) / 2),
            ]),
          ),
        ),
      ),
    )
    const digitSections = digitPolygons.map((polygons) =>
      own(
        own(
          CrossSection.ofPolygons(
            polygons.map((p) => p.map(([u, v]): [number, number] => [u * digitHeight, v * digitHeight])),
            GLYPH_FILL,
          ),
        ).add(lines),
      ),
    )
    /** From the middle of the axle to the middle of a wheel's pockets and digits. */
    const digitCentre = inner + dialLength / 2

    const shrunk = (section: CrossSection) =>
      config.insertClearance > 0 ? own(own(section.offset(-config.insertClearance, 'Miter', 2)).simplify(1e-3)) : section
    /** A tile prints as two parts, its base in the body's filament and its raised digit in the second, which no layer shares. */
    const tileBase = () => own(shrunk(rectangle(pocketX, pocketY)).extrude(COUNTER_TILE_BASE))
    const tileMark = (mark: CrossSection) => own(own(mark.extrude(RELIEF)).translate([0, 0, COUNTER_TILE_BASE]))
    /** A printed digit runs a pocket deep, so its colour is solid on a wall that prints upright; an engraved one is a shallow groove for paint. */
    const faceDepth = config.digits === 'printed' ? COUNTER_POCKET : COUNTER_ENGRAVING
    const below = (solid: Manifold, depth: number) => own(solid.translate([0, 0, -depth]))
    const cut = (mark: CrossSection) =>
      config.digits === 'tiles'
        ? below(own(rectangle(pocketX, pocketY).extrude(COUNTER_POCKET + OVERCUT)), COUNTER_POCKET)
        : below(own(mark.extrude(faceDepth + OVERCUT)), faceDepth)

    /** Digit `k` on the flat `k` faces round from the active one, so rolling a wheel on by one flat counts one. */
    const digits = (centre: number, solid: (mark: CrossSection) => Manifold, raised = 0) =>
      own(
        Manifold.union(
          digitSections.map((section, digit) =>
            own(own(solid(section).translate([centre, 0, flat + raised])).transform(rollX(FACE_DEGREES * digit))),
          ),
        ),
      )
    const tens = own(own(own(wheelBody.mirror([1, 0, 0])).translate([-inner, 0, 0])).subtract(digits(-digitCentre, cut)))
    const units = own(own(wheelBody.translate([inner, 0, 0])).subtract(digits(digitCentre, cut)))
    const printsDigits = config.digits === 'printed'
    const inlay = (mark: CrossSection) => below(own(mark.extrude(COUNTER_POCKET)), COUNTER_POCKET)
    const dialDigits: { tens?: Manifold; units?: Manifold } = printsDigits
      ? { tens: digits(-digitCentre, inlay), units: digits(digitCentre, inlay) }
      : {}
    const inThird = config.digitFilament === 3

    const inYz = (points: [number, number][]) => points.map(([across, up]) => yz(across, up))

    /** The frame's real play, and where its posts start along the tube. */
    const fit = FRAME_FIT / scale
    const postFrom = frameEnd - POST
    /** The hubs' tube, from inside the left hub, which it is part of, to the right hub's socket. */
    const axleTube =
      config.layout === 'hubs'
        ? (() => {
            const from = endFace + 0.5
            const to = endFace + COUNTER_SOCKET - AXLE_END_GAP
            const tube = own(prism(lobed(0), from + to).translate([-from, 0, 0]))
            return own(
              tube.subtract(own(prism(own(CrossSection.circle(AXLE_BORE, segments)), from + to + 1).translate([-from + 0.01, 0, 0]))),
            )
          })()
        : undefined
    const axle = (() => {
      if (knobbed) {
        // From inside the left knob, past its socket's floor, to just short of the right shaft's end.
        const socketFloor = endFace + SIDE_PLATE + FACE_GAP + KNOB_SOCKET
        const from = socketFloor + 0.1
        const to = inner + dialLength + shaftLength - ROD_SHORT
        return own(prism(own(CrossSection.circle(AXLE_BORE - config.clearance, segments)), from + to).translate([-from, 0, 0]))
      }
      if (config.layout !== 'centre') return undefined
      // Its ends are cut to two flats that drop between a post's legs, starting at a little steeper than 45° so the tube still prints on end.
      const length = 2 * frameEnd
      const flats = own(
        CrossSection.union(
          [-1, 1].flatMap((end) =>
            [-1, 1].map((side) =>
              polygon(
                [
                  [postFrom, TUBE_KEY],
                  [frameEnd + 1, TUBE_KEY],
                  [frameEnd + 1, AXLE_RADIUS + 1],
                  [postFrom - 1.1 * (AXLE_RADIUS + 1 - TUBE_KEY), AXLE_RADIUS + 1],
                ].map(([x, y]): [number, number] => [end * x, side * y]),
              ),
            ),
          ),
        ),
      )
      return own(
        own(prism(lobed(0), length).translate([-length / 2, 0, 0])).subtract(
          own(own(flats.extrude(2 * AXLE_RADIUS + 2)).translate([0, 0, -AXLE_RADIUS - 1])),
        ),
      )
    })()
    const socket = own(
      prism(
        own(lobed(AXLE_PRESS_FIT / scale).subtract(own(CrossSection.circle(AXLE_BORE - BOSS_CLEARANCE, segments)))),
        COUNTER_SOCKET + 1,
      ).translate([endFace - 1, 0, 0]),
    )

    /** Two prongs along the top row's edges, joined by a bar whose underside is chamfered at 45°. They run the whole thickness of the plate, so the side piece has no ceiling over them to bridge. */
    /** The face the bracket stands on: the top flat of the dials, or of a knob hub. */
    const indicatorBase = config.layout === 'knobs' ? rise : flat
    const plateEnd = endFace + SIDE_PLATE
    /** Seen from above: a prong along each edge of the top row through the plate's whole thickness, joined by a bar across its outer end. */
    const bracketPlan = (from: number, to: number, barFrom = plateEnd - INDICATOR_BAR, barTo = to) =>
      own(
        CrossSection.union([
          ...[-1, 1].map((side) =>
            own(
              own(CrossSection.square([to - from, INDICATOR_OUTER - INDICATOR_INNER], true)).translate([
                (from + to) / 2,
                (side * (INDICATOR_INNER + INDICATOR_OUTER)) / 2,
              ]),
            ),
          ),
          own(own(CrossSection.square([barTo - barFrom, 2 * INDICATOR_INNER + 0.2], true)).translate([(barFrom + barTo) / 2, 0])),
        ]),
      )
    /** The bracket, a part of its own inlaid flush with the top, and deep enough to show on both faces, and the slot it presses into, open above and through both faces. */
    const bracketRight = own(
      own(bracketPlan(endFace, plateEnd).extrude(INDICATOR_DEPTH)).translate([0, 0, indicatorBase - INDICATOR_DEPTH]),
    )
    const bracketFit = BRACKET_FIT / scale
    const slotFor = (plan: CrossSection) =>
      own(
        own(own(plan.offset(bracketFit, 'Miter', 2)).extrude(INDICATOR_DEPTH + bracketFit + 1)).translate([
          0,
          0,
          indicatorBase - INDICATOR_DEPTH - bracketFit,
        ]),
      )
    const bracketSlot = slotFor(bracketPlan(endFace - 1, plateEnd + 1))
    /** The left hub prints on its outer face with the tube standing up from it, so its bracket's bar is at its inner face, on top as it prints; the bracket is the same part turned round. */
    const innerBarPlan = (from: number, to: number) => bracketPlan(from, to, from, endFace + INDICATOR_BAR)
    const bracketInnerBar = own(
      own(innerBarPlan(endFace, plateEnd).extrude(INDICATOR_DEPTH)).translate([0, 0, indicatorBase - INDICATOR_DEPTH]),
    )
    const innerBarSlot = slotFor(innerBarPlan(endFace - 1, plateEnd + 1))

    /** A disc round the socket, or round a knob hub's spring arms, on two legs, with a mast up to the top row that carries the bracket. */
    const hubOutline = (radius: number) =>
      own(
        CrossSection.union([
          own(CrossSection.circle(radius, segments)),
          polygon(
            inYz([
              [-INDICATOR_OUTER - 0.5, 0],
              [INDICATOR_OUTER + 0.5, 0],
              [INDICATOR_OUTER + 0.5, flat],
              [-INDICATOR_OUTER - 0.5, flat],
            ]),
          ),
          ...[-1, 1].map((side) => polygon(inYz(LEG.map(([across, up]): [number, number] => [side * across, up])))),
        ]),
      )
    const endParts: Record<'hubs' | 'knobs', () => Manifold> = {
      hubs: () => own(prism(hubOutline(AXLE_RADIUS + AXLE_PRESS_FIT / scale + HUB_WALL), SIDE_PLATE).translate([endFace, 0, 0])),
      knobs: () =>
        own(
          prism(
            polygon(
              Array.from({ length: FACES }, (_corner, i) =>
                pointAt(rise / Math.cos(HALF_FACE), Math.PI / 2 + HALF_FACE + (2 * Math.PI * i) / FACES),
              ),
            ),
            SIDE_PLATE,
          ).translate([endFace, 0, 0]),
        ),
    }
    /** A knob hub carries the spring arms the dials once had, round the dial's lobed shaft. */
    const arms = own(prism(centreCut, SIDE_PLATE + 2).translate([endFace - 1, 0, 0]))
    const hasBrackets = config.layout === 'hubs' || config.layout === 'knobs'
    const decagonAt = (radius: number) =>
      polygon(Array.from({ length: FACES }, (_corner, i) => pointAt(radius, Math.PI / 2 + HALF_FACE + (2 * Math.PI * i) / FACES)))
    /**
     * Half of the enclosure's case: its end wall carries the spring arms, its shell runs to the middle, and a window
     * over the top row opens to the middle too, so each half prints on its end wall with nothing to bridge. The left
     * half's inner wall runs on as a lip into a step in the right half's, which lines the two up and stops them turning.
     */
    const caseHalf = (lipped: boolean) => {
      const toCorner = (flatDistance: number) => flatDistance / Math.cos(HALF_FACE)
      const split = 0.025
      const end = endFace + SIDE_PLATE
      const middle = caseInner + CASE_WALL / 2
      const shell = own(prism(decagonAt(toCorner(rise)), end - split).translate([split, 0, 0]))
      const lip = own(
        prism(own(decagonAt(toCorner(middle)).subtract(decagonAt(toCorner(caseInner) - 0.5))), CASE_LIP + 0.5).translate([-CASE_LIP, 0, 0]),
      )
      const body = lipped ? own(Manifold.union([shell, lip])) : shell
      const step = own(prism(decagonAt(toCorner(middle + fit)), CASE_LIP + fit + 1).translate([-1, 0, 0]))
      const hollow = own(prism(decagonAt(toCorner(caseInner)), endFace + 2).translate([-2, 0, 0]))
      const along = inner + dialLength - FRAME_BAND
      const across = pocketY + WINDOW_MARGIN
      const insideTop = caseInner
      const window = own(
        Manifold.hull(
          [-1, 1].flatMap((x) =>
            [-1, 1].flatMap((y): Vec3[] => [
              [x * along, y * across, flat - 0.5],
              [x * along, y * across, insideTop],
              [x * along, y * (across + rise + 1 - insideTop), rise + 1],
            ]),
          ),
        ),
      )
      const stepped = lipped ? body : own(body.subtract(step))
      return own(own(own(stepped.subtract(hollow)).subtract(window)).subtract(arms))
    }
    const right = cased
      ? caseHalf(false)
      : config.layout === 'centre'
        ? undefined
        : own(own(endParts[config.layout === 'knobs' ? 'knobs' : 'hubs']().subtract(knobbed ? arms : socket)).subtract(bracketSlot))
    /** Ribbed round its edge, narrower than the dial, with a lobed socket for the shaft. */
    const knob = (() => {
      if (!knobbed) return undefined
      const ribbed = polygon(
        Array.from({ length: 2 * KNOB_RIBS }, (_point, i) =>
          pointAt(rise / Math.cos(HALF_FACE) - (i % 2) * KNOB_RIB, (Math.PI * i) / KNOB_RIBS),
        ),
      )
      const start = endFace + SIDE_PLATE + FACE_GAP
      return own(
        own(prism(ribbed, KNOB_LENGTH).translate([start, 0, 0])).subtract(
          own(prism(lobed(KNOB_FIT / scale), KNOB_SOCKET + 1).translate([start - 1, 0, 0])),
        ),
      )
    })()
    const tubed = config.layout === 'hubs'
    const left = cased
      ? own(caseHalf(true).mirror([1, 0, 0]))
      : tubed
        ? own(Manifold.union([own(own(endParts.hubs().subtract(innerBarSlot)).mirror([1, 0, 0])), axleTube!]))
        : right && own(right.mirror([1, 0, 0]))
    const leftBracket = own((tubed ? bracketInnerBar : bracketRight).mirror([1, 0, 0]))
    /** In knob layouts the left knob carries the rod, which runs through both dials and turns with the tens. */
    const leftKnobRod = knob && axle ? own(Manifold.union([own(knob.mirror([1, 0, 0])), axle])) : undefined

    /** Each end of the frame's tube sits between the legs of a post, which stand in the base plate either side of it. */
    const legs = (grow: number, bottom: number, top: number) =>
      own(
        Manifold.union(
          [-1, 1].flatMap((end) =>
            [-1, 1].map((side) =>
              own(
                own(Manifold.cube([POST + 2 * grow, POST_LEG + 2 * grow, top - bottom], true)).translate([
                  end * (frameEnd - POST / 2),
                  side * (TUBE_KEY + fit + POST_LEG / 2),
                  (top + bottom) / 2,
                ]),
              ),
            ),
          ),
        ),
      )
    /** Over the top row, a rail along each edge into a post past each dial, whose legs straddle the tube's flats and stand in the base plate. */
    const frame = (() => {
      if (config.layout !== 'centre') return undefined
      const outer = TUBE_KEY + fit + POST_LEG
      const plan = own(
        CrossSection.union([
          ...[-1, 1].map((side) =>
            own(own(CrossSection.square([2 * frameEnd - POST, WINDOW_RAIL], true)).translate([0, side * (WINDOW_INNER + WINDOW_RAIL / 2)])),
          ),
          ...[-1, 1].map((end) => own(own(CrossSection.square([POST, 2 * outer], true)).translate([end * (frameEnd - POST / 2), 0]))),
        ]),
      )
      const top = own(own(plan.extrude(WINDOW_THICKNESS)).translate([0, 0, windowBottom]))
      // A hair inside the top's footprint, so no face of a post lies on one of the top's.
      const inset = 0.02
      const section = polygon(
        inYz([
          [-outer + inset, -rise + POST_FLOOR],
          [-TUBE_KEY - fit, -rise + POST_FLOOR],
          [-TUBE_KEY - fit, AXLE_RADIUS + fit],
          [TUBE_KEY + fit, AXLE_RADIUS + fit],
          [TUBE_KEY + fit, -rise + POST_FLOOR],
          [outer - inset, -rise + POST_FLOOR],
          [outer - inset, windowBottom + WINDOW_THICKNESS / 2],
          [-outer + inset, windowBottom + WINDOW_THICKNESS / 2],
        ]),
      )
      const posts = [-1, 1].map((end) =>
        own(prism(section, POST - 2 * inset).translate([end > 0 ? postFrom + inset : -frameEnd + inset, 0, 0])),
      )
      return own(Manifold.union([top, ...posts]))
    })()
    /** A plate under the dials, below their sweep, with sockets for the frame's legs and a cradle under each end of the tube. */
    const stand = (() => {
      if (config.layout !== 'centre') return undefined
      const plateLength = frameEnd + 0.5
      const plate = own(own(Manifold.cube([2 * plateLength, 2 * BASE_HALF, BASE_PLATE], true)).translate([0, 0, -rise + BASE_PLATE / 2]))
      const cradleTop = -AXLE_RADIUS - fit
      const cradles = [-1, 1].map((end) =>
        own(
          own(Manifold.cube([POST, 2 * TUBE_KEY, cradleTop + rise - BASE_PLATE / 2], true)).translate([
            end * (frameEnd - POST / 2),
            0,
            (cradleTop - rise + BASE_PLATE / 2) / 2,
          ]),
        ),
      )
      return own(own(Manifold.union([plate, ...cradles])).subtract(legs(fit, -rise + POST_FLOOR - fit, -rise + BASE_PLATE + 1)))
    })()

    const bodies = {
      tens,
      left,
      right,
      axle: leftKnobRod ?? axle,
      units,
      stand,
      frame,
      knob,
      bracket: hasBrackets ? bracketRight : undefined,
    }
    /** The parts printed in the second filament, each laid on the plate with its body. */
    const seconds: Partial<Record<keyof typeof bodies, Manifold>> = {}
    const onEnd = mat4([0, 0, 1], [0, 1, 0], [-1, 0, 0])
    const onOtherEnd = mat4([0, 0, -1], [0, 1, 0], [1, 0, 0])
    const upright = mat4([1, 0, 0], [0, 1, 0], [0, 0, 1])
    /** Each wheel on its outer face, each side piece or hub on the face that meets the wheels, each cap on its outer face so its socket opens upwards, the stand as it is used, and the tube on one end. */
    const printed: Record<keyof typeof bodies, Mat4> = {
      tens: knobbed ? onOtherEnd : onEnd,
      /** A case half stands on its end wall, so its shell, its window and the step or lip rise from it. */
      right: cased ? onOtherEnd : onEnd,
      axle: onEnd,
      /** The left hub of the hubs layout stands on its outer face too, with its tube rising from it. */
      left: cased || config.layout === 'hubs' ? onEnd : onOtherEnd,
      units: knobbed ? onEnd : onOtherEnd,
      /** On its outer face, so its socket opens upwards. */
      knob: onOtherEnd,
      /** As it is used, so it prints beside the tiles and changes filament at the same height they do. */
      bracket: upright,
      stand: upright,
      /** Upside down, so its rails lie on the plate and its tabs stand up from them. */
      frame: mat4([1, 0, 0], [0, -1, 0], [0, 0, -1]),
    }
    const tileOf = (tile: CounterTile) => ({ base: tileBase(), mark: tileMark(digitSections[tile]) })
    /** The whole plate of tiles, or one alone, centred on the origin. */
    const insertPlate = (only?: CounterTile) => {
      const placed = (only === undefined ? counterTileLayout(config) : [{ tile: only, x: 0, y: 0 }]).map(({ tile, x, y }) => {
        const { base, mark } = tileOf(tile)
        const { min } = base.boundingBox()
        const shift: Vec3 = [x - min[0], y - min[1], 0]
        return { base: own(base.translate(shift)), mark: own(mark.translate(shift)) }
      })
      const bases = own(Manifold.union(placed.map(({ base }) => base)))
      const { min, max } = bases.boundingBox()
      const centre: Vec3 = [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, 0]
      return { bases: own(bases.translate(centre)), marks: own(own(Manifold.union(placed.map(({ mark }) => mark))).translate(centre)) }
    }
    const toPlate = (solid: Manifold): Vec3 => {
      const { min, max } = solid.boundingBox()
      return [-(min[0] + max[0]) / 2, -(min[1] + max[1]) / 2, -min[2]]
    }

    const part = config.part
    let solid: Manifold
    let inserts: Manifold | undefined
    let third: Manifold | undefined
    if (part === 'inserts') {
      const { bases, marks } = insertPlate(config.tile)
      solid = bases
      if (inThird) third = marks
      else inserts = marks
    } else if (part === 'bracket') {
      // Its hidden foot, as high as a tile's base, takes the body's filament and the rest the second, so printed with the tiles the plate changes filament once.
      if (!hasBrackets) throw new Error(`The ${config.layout} layout has no bracket`)
      const laid = own(bracketRight.translate(toPlate(bracketRight)))
      solid = own(laid.trimByPlane([0, 0, -1], -COUNTER_TILE_BASE))
      inserts = own(laid.trimByPlane([0, 0, 1], COUNTER_TILE_BASE))
    } else if (part) {
      const body = bodies[part]
      if (!body) throw new Error(`The ${config.layout} layout has no ${part}`)
      const laid = own(body.transform(printed[part]))
      const shift = toPlate(laid)
      solid = own(laid.translate(shift))
      const laidOut = (mark: Manifold) => own(own(mark.transform(printed[part])).translate(shift))
      const digitPart = part === 'tens' || part === 'units' ? dialDigits[part] : undefined
      const second = [seconds[part], inThird ? undefined : digitPart].filter((mark) => mark !== undefined)
      if (second.length > 0) inserts = laidOut(own(Manifold.union(second)))
      if (inThird && digitPart) third = laidOut(digitPart)
    } else {
      const onFaces = (tilePart: (mark: CrossSection) => Manifold) => [
        digits(-digitCentre - spread, (mark) => below(tilePart(mark), COUNTER_POCKET), lift),
        digits(digitCentre + spread, (mark) => below(tilePart(mark), COUNTER_POCKET), lift),
      ]
      const bases = config.digits === 'tiles' ? onFaces(tileBase) : []
      const placed: Vec3 = [0, 0, rise]
      const assembled = [
        ...(stand ? [own(stand.translate([0, 0, -drop]))] : []),
        ...(leftKnobRod ? [own(leftKnobRod.translate([-(EXPLODED_ENDS + 1) * spread, 0, 0]))] : axle ? [axle] : []),
        ...(left ? [own(left.translate([-EXPLODED_ENDS * spread, 0, 0]))] : []),
        own(tens.translate([-spread, 0, 0])),
        own(units.translate([spread, 0, 0])),
        ...(right ? [own(right.translate([EXPLODED_ENDS * spread, 0, 0]))] : []),
        ...(knob ? [own(knob.translate([(EXPLODED_ENDS + 1) * spread, 0, 0]))] : []),
      ]
      solid = own(own(Manifold.union([...assembled, ...bases])).translate(placed))
      const digitMarks = [
        ...(config.digits === 'tiles' ? onFaces(tileMark) : []),
        ...(dialDigits.tens && dialDigits.units
          ? [own(dialDigits.tens.translate([-spread, 0, 0])), own(dialDigits.units.translate([spread, 0, 0]))]
          : []),
      ]
      const marks = [
        ...(inThird ? [] : digitMarks),
        ...(hasBrackets
          ? [own(leftBracket.translate([-EXPLODED_ENDS * spread, 0, 0])), own(bracketRight.translate([EXPLODED_ENDS * spread, 0, 0]))]
          : frame
            ? [own(frame.translate([0, 0, raise]))]
            : []),
      ]
      inserts = own(own(Manifold.union(marks)).translate(placed))
      third = inThird && digitMarks.length > 0 ? own(own(Manifold.union(digitMarks)).translate(placed)) : undefined
    }

    if (scale > 1) {
      solid = own(solid.scale(scale))
      inserts = inserts && own(inserts.scale(scale))
      third = third && own(third.scale(scale))
    }
    const volume = solid.volume() + (inserts?.volume() ?? 0) + (third?.volume() ?? 0)
    const triangles = solid.numTri() + (inserts?.numTri() ?? 0) + (third?.numTri() ?? 0)
    return {
      mesh: solid.getMesh(),
      ...(inserts ? { inserts: inserts.getMesh() } : {}),
      ...(third ? { third: third.getMesh() } : {}),
      stats: { triangles, volume, grams: volume * PLA_DENSITY, solid: volume > 0 && triangles > 0 },
    }
  } finally {
    for (const value of trash) value.delete()
  }
}
