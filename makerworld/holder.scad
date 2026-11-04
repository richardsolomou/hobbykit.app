// HobbyKit Gridfinity miniature holder, for MakerWorld's Parametric Model Maker.
// A port of src/core/geometry/holder.ts for a single miniature group: change both together, then run `just makerworld check`.
// The holder stands on Gridfinity feet at z = 0, and each slot is cut down from its top face.
// It builds the first module the app would export; miniatures that do not fit in it are left out.
// Licensed under CC BY-SA 4.0, unlike the AGPL-3.0-only app, because MakerWorld offers no GPL licence.

/* [Miniatures] */
// Pick a standard base size, or Custom to use the shape and dimensions below.
standard_size = "round-32"; // [custom:Custom, round-25:Round 25mm - Guardsmen & Gretchin & Kabalite Warriors, round-28.5:Round 28.5mm - Guardians & Kasrkin & Freeguild Fusiliers, round-32:Round 32mm - Intercessors & Necron Warriors & Ork Boyz, round-40:Round 40mm - Terminators & Custodian Guard & Captains, round-50:Round 50mm - Centurions & Obliterators & Kroxigor, round-60:Round 60mm - Dreadnoughts & Daemon Princes & Stormfiends, round-80:Round 80mm - Avatar of Khaine & Ghazghkull & Slann, round-90:Round 90mm - Redemptor and Brutalis Dreadnoughts, round-100:Round 100mm - Armiger Knights & Repulsor & Greater Daemons, round-120:Round 120mm - Wazdakka Gutsmek, round-130:Round 130mm - Great Unclean One & Onager & Nagash, round-160:Round 160mm - Monolith & Defilers & Archaon, oval-60x35.5:Oval 60×35.5mm - Rough Riders & Flesh Hounds & Hexwraiths, oval-75x42:Oval 75×42mm - Chaos Bikers & Vertus Praetors & Blood Knights, oval-90x52.5:Oval 90×52.5mm - Outriders & Bloodcrushers & Dracothian Guard, oval-105x70:Oval 105×70mm - Land Speeder & Carnifexes & Treelord, oval-120x92:Oval 120×92mm - Riptide & Wraithknight & Bloodthirster, oval-150x95:Oval 150×95mm - Ork buggies & Knight Destrier, oval-170x105:Oval 170×105mm - Stardrake & Black Coach & Mortek Crawler, oval-170x109:Oval 170×109mm - Imperial and Chaos Knights & Stormsurge, pill-50x25:Pill 50×25mm - Saga and Bolt Action cavalry, pill-60x35.5:Pill 60×35.5mm - In place of the matching GW oval, pill-75x42:Pill 75×42mm - In place of the matching GW oval, pill-90x52.5:Pill 90×52.5mm - In place of the matching GW oval, pill-105x70:Pill 105×70mm - In place of the matching GW oval, rect-20x20:Rectangle 20×20mm - Kings of War Infantry, rect-25x25:Rectangle 25×25mm - Old World infantry & KoW Heavy Infantry, rect-30x30:Rectangle 30×30mm - Old World Orcs & Chaos Warriors & Saurus, rect-25x50:Rectangle 25×50mm - Old World light cavalry & KoW Cavalry, rect-30x60:Rectangle 30×60mm - Old World knights and cavalry, rect-40x40:Rectangle 40×40mm - Ogres & Trolls & KoW Large Infantry, rect-40x60:Rectangle 40×60mm - Old World Pegasus Knights, rect-50x50:Rectangle 50×50mm - Minotaurs & KoW Large Cavalry and Monsters, rect-50x75:Rectangle 50×75mm - Old World Demigryphs and cannons, rect-50x100:Rectangle 50×100mm - Old World and KoW chariots, rect-60x100:Rectangle 60×100mm - Old World Steam Tank & Griffons & Dragons, rect-75x75:Rectangle 75×75mm - Kings of War Titans, rect-100x150:Rectangle 100×150mm - Old World Terrorgheist & Zombie Dragon, polygon-25:Hex 25mm - Fits a Ø25 round, polygon-32:Hex 32mm - Fits a Ø32 round, polygon-40:Hex 40mm - Fits a Ø40 round, polygon-50:Hex 50mm - Fits a Ø50 round, polygon-60:Hex 60mm - Fits a Ø60 round]
// Used only with a custom size.
shape = "round"; // [round:Round, oval:Oval, pill:Pill, rect:Rectangle, polygon:Hex]
// Custom size: the diameter of a round, the overall width otherwise. Hex sizes run across the corners.
width = 32; // [15:0.5:180]
// Custom size: the depth of an oval, pill or rectangle.
depth = 32; // [15:0.5:180]
// How many miniatures to hold.
quantity = 5; // [1:1:100]

/* [Layout] */
// Gridfinity units the holder may grow to; it uses the fewest that fit.
maximum_columns = 7; // [1:1:12]
maximum_rows = 5; // [1:1:12]
// Edge-to-edge distance between slots.
between_miniatures = 0.5; // [0:0.5:10]
// Minimum distance from a slot to the holder edge. Half the spacing between miniatures is a good start.
from_holder_edge = 0.25; // [0:0.05:10]
holder_height = 14; // [7:7:42]

/* [Slots] */
slot_depth = 3; // [1:0.5:30]
// Added to the base size so bases lift out without binding.
slot_clearance = 0.5; // [0.1:0.1:2]
// Engrave the base size.
labels = true;
label_location = "slots"; // [slots:In slots, module:On module]

/* [Magnets] */
slot_magnets = true;
// The five-pocket cross needs a round base of 50mm or more.
pocket_layout = "balanced"; // [balanced:Balanced, five-cross:Five-pocket cross]
magnet_diameter = 5; // [2:0.5:8]
magnet_thickness = 2; // [0.5:0.1:5]
// Auto picks the count the base generator would.
magnets_per_slot = "auto"; // [auto:Auto, 0, 1, 2, 3, 4, 5, 6, 8]
magnet_diameter_clearance = 0.2; // [0:0.05:0.6]
// Room behind each magnet for adhesive.
magnet_depth_clearance = 0.1; // [0:0.05:0.5]

/* [Matching Bases] */
// Pockets sit where the base generator puts its magnets, so these must match the bases' settings.
base_wall_thickness = 2; // [1:0.1:6]
wall_around_pocket = 0.9; // [0.4:0.1:3]

/* [Hidden] */
LABEL_FONT = "Oswald:style=Bold";
LABEL_MARGIN = 0.8;
MAX_MAGNETS = 8;
EXPORT_CURVE_TOLERANCE = 0.001;
SLICE = 0.001;
GRID = 42;
GAP = 0.5;
// Gridfinity foot: [inset, z] from the plate up.
PROFILE = [[2.95, 0], [2.15, 0.8], [2.15, 2.6], [0, 4.75]];
FOOT_TOP = 4.75;
GRID_CORNER_RADIUS = 3.75;
MIN_SLOT_FLOOR_THICKNESS = 0.4;
ENGRAVING_DEPTH = 0.4;
HEX_ROW_HEIGHT = sqrt(3) / 2;
HEX_SIDES = 6;
MAGNET_PITCH = 31;
END_PAIR_PITCHES = 3;
SINGLE_MAGNET_MAX_SPAN = MAGNET_PITCH * 2;
RING_COUNTS = [3, 4, 5, 6, 8];
ROW_COUNTS = [4, 6, 8];
ROW_LIMIT_COUNTS = [1, 2, 4, 6, 8];
DEFAULT_MAGNET_STRENGTH = 5 ^ 2 * 2;
RAND = 4294967296;

// <generated by scripts/makerworld.ts: sizes glyphs>
// [key, shape, width, length]
SIZES = [
  ["round-25", "round", 25, 25],
  ["round-28.5", "round", 28.5, 28.5],
  ["round-32", "round", 32, 32],
  ["round-40", "round", 40, 40],
  ["round-50", "round", 50, 50],
  ["round-60", "round", 60, 60],
  ["round-80", "round", 80, 80],
  ["round-90", "round", 90, 90],
  ["round-100", "round", 100, 100],
  ["round-120", "round", 120, 120],
  ["round-130", "round", 130, 130],
  ["round-160", "round", 160, 160],
  ["oval-60x35.5", "oval", 60, 35.5],
  ["oval-75x42", "oval", 75, 42],
  ["oval-90x52.5", "oval", 90, 52.5],
  ["oval-105x70", "oval", 105, 70],
  ["oval-120x92", "oval", 120, 92],
  ["oval-150x95", "oval", 150, 95],
  ["oval-170x105", "oval", 170, 105],
  ["oval-170x109", "oval", 170, 109],
  ["pill-50x25", "pill", 50, 25],
  ["pill-60x35.5", "pill", 60, 35.5],
  ["pill-75x42", "pill", 75, 42],
  ["pill-90x52.5", "pill", 90, 52.5],
  ["pill-105x70", "pill", 105, 70],
  ["rect-20x20", "rect", 20, 20],
  ["rect-25x25", "rect", 25, 25],
  ["rect-30x30", "rect", 30, 30],
  ["rect-25x50", "rect", 25, 50],
  ["rect-30x60", "rect", 30, 60],
  ["rect-40x40", "rect", 40, 40],
  ["rect-40x60", "rect", 40, 60],
  ["rect-50x50", "rect", 50, 50],
  ["rect-50x75", "rect", 50, 75],
  ["rect-50x100", "rect", 50, 100],
  ["rect-60x100", "rect", 60, 100],
  ["rect-75x75", "rect", 75, 75],
  ["rect-100x150", "rect", 100, 150],
  ["polygon-25", "polygon", 25, 25],
  ["polygon-32", "polygon", 32, 32],
  ["polygon-40", "polygon", 40, 40],
  ["polygon-50", "polygon", 50, 50],
  ["polygon-60", "polygon", 60, 60],
];
UNITS_PER_EM = 1000;
// [character, advance, xMin, xMax, yMin, yMax] in font units; blank glyphs carry only their advance.
GLYPHS = [
  [" ", 256],
  ["!", 257, 46, 211, 0, 808],
  ["\"", 360, 25, 348, 509, 810],
  ["#", 534, 47, 488, 0, 810],
  ["$", 485, 22, 466, -110, 914],
  ["%", 1006, 45, 960, -1, 811],
  ["&", 570, 39, 528, -15, 822],
  ["'", 170, 25, 158, 509, 810],
  ["(", 338, 62, 303, -178, 819],
  [")", 328, 35, 276, -178, 819],
  ["*", 423, 40, 403, 450, 810],
  ["+", 449, 26, 423, 207, 618],
  [",", 238, 43, 198, -140, 154],
  ["-", 324, 32, 292, 242, 347],
  [".", 244, 46, 200, 0, 154],
  ["/", 422, 43, 379, 0, 810],
  ["0", 550, 54, 495, -15, 822],
  ["1", 385, 22, 300, 0, 810],
  ["2", 514, 39, 486, 0, 821],
  ["3", 514, 38, 483, -15, 822],
  ["4", 524, 25, 505, 0, 810],
  ["5", 509, 43, 476, -15, 810],
  ["6", 538, 52, 497, -12, 821],
  ["7", 439, 20, 404, 0, 810],
  ["8", 521, 38, 482.133, -13, 821],
  ["9", 538, 39, 484, -12, 821],
  [":", 278, 67, 219, 56, 564],
  [";", 285, 67, 221, -117, 575],
  ["<", 398, 54, 364, 195, 635],
  ["=", 442, 63, 379, 272, 557],
  [">", 398, 54, 364, 195, 635],
  ["?", 483, 31, 448, 0, 821],
  ["@", 950, 52.57, 920.953, -126, 810],
  ["A", 551, 21, 529, 0, 810],
  ["B", 588, 60, 554, 0, 810],
  ["C", 563, 49, 525, -12, 821],
  ["D", 586, 60, 537, 0, 810],
  ["E", 447, 60, 426, 0, 810],
  ["F", 434, 60, 410, 0, 810],
  ["G", 582, 49, 530, -12, 821],
  ["H", 610, 63, 547, 0, 810],
  ["I", 301, 61, 240, 0, 810],
  ["J", 349, 13, 289, -21, 810],
  ["K", 567, 60, 557, 0, 810],
  ["L", 443, 60, 425, 0, 810],
  ["M", 704, 57, 647, 0, 810],
  ["N", 561, 60, 500, 0, 810],
  ["O", 586, 49, 537, -12, 821],
  ["P", 571, 60, 545, 0, 810],
  ["Q", 586, 49, 537, -159, 821],
  ["R", 600, 60, 564, 0, 810],
  ["S", 514, 42, 487, -12, 821],
  ["T", 445, 11, 434, 0, 810],
  ["U", 588, 54, 534, -12, 810],
  ["V", 526, 22, 505, 0, 810],
  ["W", 697, 27, 670, 0, 810],
  ["X", 515, 7, 509, 0, 810],
  ["Y", 493, 8, 485, 0, 810],
  ["Z", 433, 29, 405, 0, 810],
  ["[", 332, 51, 303, -185, 810],
  ["\\", 422, 43, 379, 0, 810],
  ["]", 324, 21, 273, -185, 810],
  ["^", 476, 30, 446, 475, 810],
  ["_", 368, 0, 368, -167, -58],
  ["`", 307, 41, 268, 608, 810],
  ["a", 460, 20, 424, -10, 588],
  ["b", 506, 51, 464, -10, 810],
  ["c", 468, 39, 434, -10, 588],
  ["d", 503, 42, 453, -10, 810],
  ["e", 470, 39, 432, -10, 588],
  ["f", 320, 17, 308, 0, 790],
  ["g", 502, 25, 517, -200, 613],
  ["h", 509, 52, 462, 0, 810],
  ["i", 265, 51, 215, 0, 789],
  ["j", 269, -17, 220, -180, 789],
  ["k", 510, 51, 507, 0, 810],
  ["l", 274, 58, 220, 0, 810],
  ["m", 753, 51, 706, 0, 589],
  ["n", 507, 51, 460, 0, 588],
  ["o", 483, 39, 444, -10, 588],
  ["p", 505, 51, 463, -190, 588],
  ["q", 504, 42, 455, -190, 588],
  ["r", 383, 53, 365, 0, 585],
  ["s", 424, 20, 406, -10, 588],
  ["t", 351, 14, 330, -6, 754],
  ["u", 504, 45, 452, -10, 578],
  ["v", 421, 10, 414, 0, 578],
  ["w", 597, 21, 576, 0, 578],
  ["x", 442, 11, 440, 0, 578],
  ["y", 448, 3, 438, -168, 578],
  ["z", 392, 35, 366, 0, 578],
  ["{", 374, 48, 343, -193, 828],
  ["|", 262, 64, 198, -180, 810],
  ["}", 379, 37, 332, -193, 828],
  ["~", 481, 40, 448, 333, 504],
  ["¡", 237, 37, 202, -156, 652],
  ["¢", 457, 38, 433, -132, 709],
  ["£", 490, 21, 461, 0, 821],
  ["¤", 555, 40, 514, 186, 660],
  ["¥", 475, 1, 478, 0, 810],
  ["¦", 217, 51, 165, -181, 810],
  ["§", 473, 42.93, 425, -6, 838],
  ["¨", 425, 39, 386, 662, 810],
  ["©", 884, 43, 840, -13, 825],
  ["ª", 440, 36, 404, 313, 821],
  ["«", 488, 37, 450, 37, 561],
  ["¬", 499, 46, 451, 265, 532],
  ["®", 890, 48, 843, -14, 822],
  ["¯", 368, 57, 311, 733, 810],
  ["°", 540, 69, 472, 424, 821],
  ["±", 449, 26, 423, 158, 652],
  ["²", 474, 79, 400, 433, 898],
  ["³", 474, 80, 397, 423, 898],
  ["´", 307, 54, 282, 608, 810],
  ["µ", 491, 42, 446, -187, 578],
  ["¶", 521, 35, 453, -96, 810],
  ["·", 226, 37, 191, 300, 452],
  ["¸", 353, 65, 288, -277, 0],
  ["¹", 376, 65, 279, 433, 888],
  ["º", 432, 43, 389, 313, 822],
  ["»", 494, 45, 460, 37, 561],
  ["¼", 852, 34, 794, 0, 810],
  ["½", 895, 26, 846, 0, 810],
  ["¾", 922, 60, 876, 0, 821],
  ["¿", 482, 31, 448, -179, 642],
  ["À", 551, 21, 529, 0, 1075],
  ["Á", 551, 21, 529, 0, 1075],
  ["Â", 551, 21, 529, 0, 1073],
  ["Ã", 551, 21, 529, 0, 1048],
  ["Ä", 551, 21, 529, 0, 1042],
  ["Å", 551, 21, 529, 0, 1073],
  ["Æ", 708, -13, 689, 0, 810],
  ["Ç", 563, 49, 525, -277, 821],
  ["È", 447, 60, 426, 0, 1075],
  ["É", 447, 60, 426, 0, 1075],
  ["Ê", 447, 60, 426, 0, 1073],
  ["Ë", 447, 60, 426, 0, 1042],
  ["Ì", 301, -25, 240, 0, 1075],
  ["Í", 301, 61, 325, 0, 1075],
  ["Î", 301, -13, 313, 0, 1073],
  ["Ï", 301, -24, 324, 0, 1042],
  ["Ð", 563, 7, 529, 0, 810],
  ["Ñ", 561, 60, 500, 0, 1048],
  ["Ò", 586, 49, 537, -12, 1075],
  ["Ó", 586, 49, 537, -12, 1075],
  ["Ô", 586, 49, 537, -12, 1073],
  ["Õ", 586, 49, 537, -12, 1048],
  ["Ö", 586, 49, 537, -12, 1042],
  ["×", 486, 54, 432, 227, 606],
  ["Ø", 572, 49, 537, -90, 884],
  ["Ù", 588, 54, 534, -12, 1075],
  ["Ú", 588, 54, 534, -12, 1075],
  ["Û", 588, 54, 534, -12, 1073],
  ["Ü", 588, 54, 534, -12, 1042],
  ["Ý", 493, 8, 485, 0, 1075],
  ["Þ", 562, 51, 547, 0, 810],
  ["ß", 542, 46, 518, -15, 822],
  ["à", 460, 20, 424, -10, 843],
  ["á", 460, 20, 424, -10, 843],
  ["â", 460, 20, 424, -10, 841],
  ["ã", 460, 20, 424, -10, 816],
  ["ä", 460, 20, 424, -10, 810],
  ["å", 460, 20, 424, -10, 841],
  ["æ", 678, 36, 640, -12, 588],
  ["ç", 468, 39, 434, -277, 588],
  ["è", 470, 39, 432, -10, 843],
  ["é", 470, 39, 432, -10, 843],
  ["ê", 470, 39, 432, -10, 841],
  ["ë", 470, 39, 432, -10, 810],
  ["ì", 280, -34, 222, 0, 843],
  ["í", 280, 59, 316, 0, 843],
  ["î", 280, -22, 304, 0, 841],
  ["ï", 280, -33, 315, 0, 810],
  ["ð", 520, 54, 477, -14, 844],
  ["ñ", 507, 51, 460, 0, 816],
  ["ò", 483, 39, 444, -10, 843],
  ["ó", 483, 39, 444, -10, 843],
  ["ô", 483, 39, 444, -10, 841],
  ["õ", 483, 39, 444, -10, 816],
  ["ö", 483, 39, 444, -10, 810],
  ["÷", 456, 35, 421, 175, 654],
  ["ø", 477, 39, 444, -89, 673],
  ["ù", 504, 45, 452, -10, 843],
  ["ú", 504, 45, 452, -10, 843],
  ["û", 504, 45, 452, -10, 841],
  ["ü", 504, 45, 452, -10, 810],
  ["ý", 448, 3, 438, -168, 843],
  ["þ", 494, 46, 457, -190, 810],
  ["ÿ", 448, 3, 438, -168, 810],
];
// </generated>

CUSTOM = standard_size == "custom";
SIZE = CUSTOM ? undef : let(found = [for (s = SIZES) if (s[0] == standard_size) s]) assert(len(found) == 1, str("Unknown standard size ", standard_size)) found[0];
SHAPE = CUSTOM ? shape : SIZE[1];
ELONGATED = SHAPE == "oval" || SHAPE == "pill" || SHAPE == "rect";
WIDTH = CUSTOM ? width : SIZE[2];
LENGTH = !ELONGATED ? WIDTH : CUSTOM ? depth : SIZE[3];
CORNER_RADIUS = min(2, min(WIDTH, LENGTH) * 0.06);
CIRCLES = SHAPE == "round" || SHAPE == "polygon";
COLUMNS = max(1, round(maximum_columns));
ROWS = max(1, round(maximum_rows));
SPACING = between_miniatures;
EDGE = from_holder_edge;
CLEARANCE = slot_clearance;
ITEM_W = WIDTH + CLEARANCE;
ITEM_L = LENGTH + CLEARANCE;

function trim_number(value) = str(round(value * 100) / 100);
function segments_for_tolerance(diameter, tolerance) = diameter / 2 <= tolerance ? 3 : ceil(180 / acos(1 - tolerance / (diameter / 2)));

// V8's Math.hypot, operation for operation, so the packing's iterations and its ties land where the app's do.
function hypot(a, b) = let(x = abs(a), y = abs(b), m = max(x, y)) m == 0 ? 0 : let(p = x / m, q = y / m) sqrt(p * p + q * q) * m;

// Packing, ported from holder.ts. Points are slot centres in a packing area centred on the origin.
function valid_packing(points, d, w, l, spacing, exact = false) =
  len([for (p = points) if (abs(p[0]) > w / 2 - d / 2 + 1e-6 || abs(p[1]) > l / 2 - d / 2 + 1e-6) 1]) == 0
  && len([for (i = [1:1:len(points) - 1]) for (j = [0:1:i - 1])
      let(dx = points[i][0] - points[j][0], dy = points[i][1] - points[j][1])
      if ((exact ? hypot(dx, dy) : norm([dx, dy])) < (d + d) / 2 + spacing - 1e-6) 1]) == 0;

function stagger_attempt(count, d, ow, ol, spacing) =
  let(pitch = d + spacing, across = floor((ow - d) / pitch) + 1)
  across <= 0 ? undef
  : let(span = (across - 1) * pitch, slack = ow - d - span, cross = across == 1 ? slack : min(slack, pitch - slack),
        down_pitch = sqrt(max(pitch * pitch - cross * cross, 0)))
    down_pitch <= 1e-6 ? undef
    : let(down = floor((ol - d) / down_pitch) + 1)
      across * down < count ? undef
      : let(used = ceil(count / across))
        [for (i = [0:count - 1]) let(row = floor(i / across), in_row = min(across, count - row * across))
          [(i % across) * pitch - (in_row - 1) * pitch / 2 + (row % 2 == 0 ? -slack / 2 : slack / 2), (row - (used - 1) / 2) * down_pitch]];

function staggered(count, d, w, l, spacing) =
  let(across = stagger_attempt(count, d, w, l, spacing))
  !is_undef(across) && valid_packing(across, d, w, l, spacing) ? across
  : let(down = stagger_attempt(count, d, l, w, spacing), swapped = is_undef(down) ? undef : [for (p = down) [p[1], p[0]]])
    !is_undef(swapped) && valid_packing(swapped, d, w, l, spacing) ? swapped : undef;

function max_possible(columns, rows) =
  let(w = columns * GRID - GAP - EDGE * 2, l = rows * GRID - GAP - EDGE * 2)
  ITEM_W > w || ITEM_L > l ? 0
  : let(pitch_x = ITEM_W + SPACING, pitch_y = ITEM_L + SPACING,
        aligned = floor((w + SPACING) / pitch_x) * floor((l + SPACING) / pitch_y))
    !CIRCLES || ITEM_W != ITEM_L ? max(0, aligned)
    : let(row_pitch = pitch_x * HEX_ROW_HEIGHT,
          horizontal = floor((w - ITEM_W) / pitch_x + 1) * floor((l - ITEM_L) / row_pitch + 1),
          vertical = floor((l - ITEM_L) / pitch_x + 1) * floor((w - ITEM_W) / row_pitch + 1),
          area_bound = floor(w * l / (PI * (ITEM_W / 2) ^ 2)))
      most_staggered(max(0, aligned, horizontal, vertical), area_bound, w, l);
function most_staggered(lower, upper, w, l) =
  lower >= upper ? lower
  : let(candidate = ceil((lower + upper) / 2))
    is_undef(staggered(candidate, ITEM_W, w, l, SPACING)) ? most_staggered(lower, candidate - 1, w, l) : most_staggered(candidate, upper, w, l);

// The app's fallback when rows do not fit: random starts pushed apart pair by pair.
function lcg(seed) = (seed * 1664525 + 1013904223) % RAND;
function clamp(p, hw, hl) = [max(-hw, min(hw, p[0])), max(-hl, min(hl, p[1]))];
// [p_i, seed, largest overlap, p_j] after pushing one pair apart.
function relax_pair(state, pj, reach, hw, hl) =
  let(pi = state[0], dx0 = pi[0] - pj[0], dy0 = pi[1] - pj[1], d0 = hypot(dx0, dy0), jitter = d0 < 1e-9,
      s1 = jitter ? lcg(state[1]) : state[1], s2 = jitter ? lcg(s1) : s1,
      dx = jitter ? s1 / RAND - 0.5 : dx0, dy = jitter ? s2 / RAND - 0.5 : dy0,
      distance = jitter ? hypot(dx, dy) : d0, overlap = reach - distance)
  overlap <= 0 ? [pi, s2, state[2], pj]
  : let(push = overlap * 0.51 / distance)
    [clamp([pi[0] + dx * push, pi[1] + dy * push], hw, hl), s2, max(state[2], overlap), clamp([pj[0] - dx * push, pj[1] - dy * push], hw, hl)];
// Point i against every earlier point, each move seen by the next pair, as the app's nested loop does.
function relax_row(points, i, seed, largest, reach, hw, hl) =
  i == 0 ? [points, seed, largest]
  : let(out = [for (j = 0, state = [points[i], seed, largest, undef]; j <= i; state = j < i ? relax_pair(state, points[j], reach, hw, hl) : state, j = j + 1)
          each (j == 0 ? [] : j < i ? [state[3]] : [state[3], state])],
        last = out[i])
    [[for (k = [0:len(points) - 1]) k < i ? out[k] : k == i ? last[0] : points[k]], last[1], last[2]];
function relax_sweep(points, seed, reach, hw, hl) =
  [for (i = 0, state = [points, seed, 0]; i <= len(points); state = i < len(points) ? relax_row(state[0], i, state[1], state[2], reach, hw, hl) : state, i = i + 1)
    if (i == len(points)) state][0];
function relax_iterate(points, seed, d, w, l, spacing, left) =
  left <= 0 ? undef
  : let(state = relax_sweep(points, seed, (d + d) / 2 + spacing, w / 2 - d / 2, l / 2 - d / 2))
    state[2] < 1e-5 && valid_packing(state[0], d, w, l, spacing, true) ? state[0] : relax_iterate(state[0], state[1], d, w, l, spacing, left - 1);
function relax_seed(n, d, w, l, spacing, seed, iterations) =
  let(randoms = [for (k = 0, s = lcg(seed * 7919 + n); k < 2 * n; s = lcg(s), k = k + 1) s],
      points = [for (k = [0:n - 1]) [(randoms[2 * k] / RAND * 2 - 1) * (w / 2 - d / 2), (randoms[2 * k + 1] / RAND * 2 - 1) * (l / 2 - d / 2)]])
  relax_iterate(points, randoms[2 * n - 1], d, w, l, spacing, iterations);
// Skipped where it cannot succeed: past Oler's bound on points this far apart in the area, or past 24 slots,
// where the app makes one 60-sweep attempt that never converged where rows failed, across every preset tried.
function relaxed(n, d, w, l, spacing) =
  let(a = w - d + 2e-6, b = l - d + 2e-6, apart = d + spacing - 1e-6)
  n > 24 || n > 2 / sqrt(3) * a * b / (apart * apart) + (a + b) / apart + 1 + 1e-6 ? undef
  : relax_seeds(n, d, w, l, spacing, 1, n <= 12 ? 8 : 2, n <= 12 ? 350 : 120);
function relax_seeds(n, d, w, l, spacing, seed, seeds, iterations) =
  seed > seeds ? undef
  : let(found = relax_seed(n, d, w, l, spacing, seed, iterations))
    is_undef(found) ? relax_seeds(n, d, w, l, spacing, seed + 1, seeds, iterations) : found;

function circle_packing(n, d, w, l, spacing) =
  let(pitch = d + spacing, across = floor((w - d) / pitch) + 1, down = floor((l - d) / pitch) + 1)
  across * down >= n
    ? let(used = ceil(n / across))
      [for (i = [0:n - 1]) let(row = floor(i / across), in_row = min(across, n - row * across)) [((i % across) - (in_row - 1) / 2) * pitch, (row - (used - 1) / 2) * pitch]]
    : let(rows = staggered(n, d, w, l, spacing))
      !is_undef(rows) ? rows
      : let(shelves = shelf_packing(n, d, w, l, spacing))
        !is_undef(shelves) ? shelves : relaxed(n, d, w, l, spacing);
function shelf_packing(n, d, w, l, spacing) =
  let(across = floor((w + spacing) / (d + spacing)))
  across <= 0 ? undef
  : let(count = ceil(n / across),
        height = [for (k = 0, h = 0; k <= count; h = h + d, k = k + 1) if (k == count) h][0] + max(0, count - 1) * spacing)
    height > l ? undef
    : let(ys = [for (k = 0, y = -height / 2; k < count; y = y + (d + spacing), k = k + 1) y + d / 2],
          packed = [for (k = [0:count - 1]) let(in_shelf = min(across, n - k * across)) for (i = [0:in_shelf - 1]) [(i - (in_shelf - 1) / 2) * (d + spacing), ys[k]]])
      valid_packing(packed, d, w, l, spacing) ? packed : undef;

function box_packing(n, iw, il, w, l, spacing) =
  iw > w || il > l ? undef
  : let(row_widths = [for (k = 0, rw = iw; k < n && rw <= w; rw = rw + spacing + iw, k = k + 1) rw],
        across = len(row_widths), count = ceil(n / across),
        height = [for (k = 0, h = 0; k <= count; h = h + il, k = k + 1) if (k == count) h][0] + max(0, count - 1) * spacing)
    height > l ? undef
    : let(ys = [for (k = 0, y = -height / 2; k < count; y = y + (il + spacing), k = k + 1) y + il / 2],
          packed = [for (k = [0:count - 1]) let(in_row = min(across, n - k * across))
            for (x = [for (i = 0, x = -row_widths[in_row - 1] / 2; i < in_row; x = x + (iw + spacing), i = i + 1) x + iw / 2]) [x, ys[k]]])
      len([for (p = packed) if (abs(p[0]) > w / 2 - iw / 2 + 1e-6 || abs(p[1]) > l / 2 - il / 2 + 1e-6) 1]) == 0
      && len([for (i = [1:1:n - 1]) for (j = [0:1:i - 1])
          if (abs(packed[i][0] - packed[j][0]) < iw + spacing - 1e-6 && abs(packed[i][1] - packed[j][1]) < il + spacing - 1e-6) 1]) == 0
      ? packed : undef;

// Spreads the packed slots out to the packing area's edges, keeping their arrangement.
function distributed(points, w, l) =
  let(xs = [for (p = points) p[0]], ys = [for (p = points) p[1]],
      cx = ((min(xs) - ITEM_W / 2) + (max(xs) + ITEM_W / 2)) / 2, cy = ((min(ys) - ITEM_L / 2) + (max(ys) + ITEM_L / 2)) / 2,
      centred = [for (p = points) [p[0] - cx, p[1] - cy]],
      scales = [for (p = centred) each concat(abs(p[0]) > 1e-9 ? [(w / 2 - ITEM_W / 2) / abs(p[0])] : [], abs(p[1]) > 1e-9 ? [(l / 2 - ITEM_L / 2) / abs(p[1])] : [])],
      scale = len(scales) == 0 ? 1 : max(1, min(scales)))
  [for (p = centred) [p[0] * scale, p[1] * scale]];

// [columns, rows, slot centres] for the smallest box, widest last, that holds n slots, or undef.
function box_layout(n, columns, rows, wide = max(1, ceil((WIDTH + CLEARANCE + EDGE * 2 + GAP) / GRID)), deep = 1) =
  wide > columns ? undef
  : let(found = box_at(n, wide, deep))
    !is_undef(found) ? found : deep < rows ? box_layout(n, columns, rows, wide, deep + 1) : box_layout(n, columns, rows, wide + 1, 1);
function box_at(n, wide, deep) =
  let(w = wide * GRID - GAP - EDGE * 2, l = deep * GRID - GAP - EDGE * 2)
  ITEM_W > w || ITEM_L > l ? undef
  : let(packed = CIRCLES ? circle_packing(n, ITEM_W, w, l, SPACING) : box_packing(n, ITEM_W, ITEM_L, w, l, SPACING))
    is_undef(packed) ? undef : [wide, deep, distributed(packed, w, l)];

// The app plans the largest count that fits and exports that module as planned.
function plan(n, columns, rows) = n <= 0 ? undef : let(found = box_layout(n, columns, rows)) is_undef(found) ? plan(n - 1, columns, rows) : found;
LAYOUT = let(found = plan(min(max(0, round(quantity)), max_possible(COLUMNS, ROWS)), COLUMNS, ROWS))
  assert(!is_undef(found), "Miniatures do not fit within the maximum Gridfinity rows and columns")
  found;
UNITS_WIDE = LAYOUT[0];
UNITS_DEEP = LAYOUT[1];
SLOTS = LAYOUT[2];
HOLDER_W = UNITS_WIDE * GRID - GAP;
HOLDER_L = UNITS_DEEP * GRID - GAP;
echo(str(len(SLOTS), " of ", quantity, " miniatures fit in a ", UNITS_WIDE, " × ", UNITS_DEEP, " holder"));

MAGNET_DEPTH = magnet_thickness + magnet_depth_clearance;
MAX_SLOT_DEPTH = holder_height - FOOT_TOP - MIN_SLOT_FLOOR_THICKNESS
  - max(labels && label_location == "slots" ? ENGRAVING_DEPTH : 0, slot_magnets ? MAGNET_DEPTH : 0);
CHECKED =
  assert(slot_depth <= MAX_SLOT_DEPTH, str("Slots leave too little material above the Gridfinity foot — make them at most ", MAX_SLOT_DEPTH, "mm deep or the holder taller"))
  true;

LONG = max(HOLDER_W, HOLDER_L);
TOLERANCE = LONG / 2 * (1 - cos(180 / segments_for_tolerance(LONG, EXPORT_CURVE_TOLERANCE)));
function segments_for(diameter) = max(3, segments_for_tolerance(diameter, TOLERANCE));

// Outlines as counter-clockwise polygons, vertex for vertex what Manifold builds.
function circle_points(r, n) = [for (i = [0:n - 1]) [r * cos(360 * i / n), r * sin(360 * i / n)]];
function pill_points(r, straight, n) =
  let(angles = [for (i = [0:n - 1]) 360 * i / n])
  concat(
    [for (a = angles) if (a < 90) [straight / 2 + r * cos(a), r * sin(a)]],
    [[straight / 2, r], [-straight / 2, r]],
    [for (a = angles) if (a > 90 && a < 270) [-straight / 2 + r * cos(a), r * sin(a)]],
    [[-straight / 2, -r], [straight / 2, -r]],
    [for (a = angles) if (a > 270) [straight / 2 + r * cos(a), r * sin(a)]]
  );
function rect_points(w, l, radius, n) =
  radius <= 0 ? [[w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2], [-w / 2, -l / 2]]
  : let(k = max(1, ceil(n / 4)), cx = w / 2 - radius, cy = l / 2 - radius)
    [for (q = [0:3]) let(sx = q == 0 || q == 3 ? 1 : -1, sy = q < 2 ? 1 : -1)
      for (j = [0:k]) let(a = 90 * q + 90 * j / k) [sx * cx + radius * cos(a), sy * cy + radius * sin(a)]];
function slot_points(clearance) =
  let(w = WIDTH + clearance, l = LENGTH + clearance, n = segments_for(max(WIDTH, LENGTH) + clearance))
  SHAPE == "round" ? circle_points(w / 2, n)
  : SHAPE == "oval" ? [for (p = circle_points(1, n)) [p[0] * w / 2, p[1] * l / 2]]
  : SHAPE == "polygon" ? circle_points(w / 2, HEX_SIDES)
  : SHAPE == "pill" ? (w <= l ? circle_points(min(w, l) / 2, n) : pill_points(l / 2, w - l, n))
  : rect_points(w, l, max(0, min(CORNER_RADIUS + clearance / 2, min(w, l) / 2 - 0.01)), n);

// Magnet counts and centres, ported from presets.ts and base.ts.
function magnets_ring(w, l) = max(w, l) / min(w, l) <= 1.35;
function spread_count(ideal, counts) = let(fits = [for (c = counts) if (c <= ideal) c]) len(fits) > 0 ? max(fits) : counts[0];
function ring_magnet_count(short) = spread_count(PI * short / 2 / MAGNET_PITCH, RING_COUNTS);
function legacy_magnet_count(w, l, max_count) =
  let(short = min(w, l), long = max(w, l))
  short < 20 ? 0
  : w * l <= 40 * 40 && long <= SINGLE_MAGNET_MAX_SPAN ? 1
  : magnets_ring(w, l) ? min(ring_magnet_count(short), max_count)
  : let(run = long - 8, transverse = ring_magnet_count(short))
    run <= MAGNET_PITCH * END_PAIR_PITCHES && short <= SINGLE_MAGNET_MAX_SPAN && transverse == 3 ? min(2, max_count)
    : let(minimum = transverse % 2 == 0 ? transverse : transverse - 1,
          natural = max(minimum, spread_count(run / MAGNET_PITCH + 1, ROW_COUNTS)))
      spread_count(min(natural, max_count), ROW_LIMIT_COUNTS);
function next_supported_count(ideal, counts, max_count) =
  let(available = [for (c = counts) if (c <= max_count) c], above = [for (c = available) if (c >= ideal) c])
  len(above) > 0 ? above[0] : len(available) > 0 ? available[len(available) - 1] : 0;
function automatic_magnet_count(w, l, max_count, diameter, thickness) =
  let(baseline = legacy_magnet_count(w, l, max_count))
  baseline <= 1 ? baseline
  : let(demand = ceil(baseline * DEFAULT_MAGNET_STRENGTH / (diameter ^ 2 * thickness)))
    magnets_ring(w, l) ? next_supported_count(max(3, demand), RING_COUNTS, max_count)
    : next_supported_count(max(2, demand), ROW_LIMIT_COUNTS, max_count);
function magnet_positions(count, hw, hl, clear, elliptical_row, five_cross) =
  count <= 0 ? []
  : let(short = min(hw, hl), radius = max(min(short * 0.5, short - clear), 0))
    five_cross ? [[0, 0], [0, radius], [-radius, 0], [0, -radius], [radius, 0]]
    : count == 1 ? [[0, 0]]
    : !magnets_ring(hw, hl)
      ? let(long = max(hw, hl),
            ellipse_reach = long * sqrt(max(0, 1 - (clear / short) ^ 2)) - clear,
            reach = max(elliptical_row ? ellipse_reach : long - clear, 0))
        [for (i = [0:count - 1]) let(t = 2 * i / (count - 1) - 1) hw >= hl ? [t * reach, 0] : [0, t * reach]]
      : [for (i = [0:count - 1]) let(a = 90 + 360 * i / count) [radius * cos(a), radius * sin(a)]];

FIVE_CROSS = pocket_layout == "five-cross" && SHAPE == "round" && WIDTH >= 50;
MAGNET_COUNT =
  FIVE_CROSS ? 5
  : magnets_per_slot == "auto" ? automatic_magnet_count(WIDTH, LENGTH, MAX_MAGNETS, magnet_diameter, magnet_thickness)
  : [for (c = [0:MAX_MAGNETS]) if (str(c) == magnets_per_slot) c][0];
POCKET_RADIUS = (magnet_diameter + magnet_diameter_clearance) / 2;
// Centres relative to each slot's centre.
MAGNETS = !slot_magnets ? [] : magnet_positions(MAGNET_COUNT, max(0, WIDTH / 2 - base_wall_thickness), max(0, LENGTH / 2 - base_wall_thickness),
  POCKET_RADIUS + wall_around_pocket + LABEL_MARGIN, SHAPE == "oval", FIVE_CROSS);

// Label fitting, ported from label.ts as makerworld/base.scad does.
function angle_between(a, b) = abs(atan2(sin(a - b), cos(a - b)));
function ordered(items, before) =
  let(n = len(items)) n == 0 ? []
  : [for (r = [0:n - 1]) each [for (i = [0:n - 1])
      if (len([for (j = [0:n - 1]) if (before(items[j], items[i]) || (!before(items[i], items[j]) && j < i)) j]) == r) items[i]]];
function settle(value) = round(value / 1e-9) * 1e-9;
function label_angles(solid_bearings) =
  let(solid = ordered([for (a = solid_bearings) ((a % 360) + 360) % 360], function(a, b) a < b), n = len(solid),
      gaps = n == 0 ? [] : [for (i = [0:n - 1]) let(next = i + 1 < n ? solid[i + 1] : solid[0] + 360, middle = (solid[i] + next) / 2)
        [middle, settle((next - solid[i]) * PI / 180), settle(angle_between(middle, -90) * PI / 180), settle(cos(middle))]],
      widest = ordered(gaps, function(g, h) g[1] > h[1] || (g[1] == h[1] && (g[2] < h[2] || (g[2] == h[2] && g[3] < h[3])))))
  concat([for (g = widest) g[0]], [for (i = [0:7]) 45 * i]);

function box_margin(edges, x, y, hw, hh) = min([for (e = edges) e[0][0] * x + e[0][1] * y - e[1] - hw * abs(e[0][0]) - hh * abs(e[0][1])]);
function box_clearance(x, y, hw, hh, c) =
  let(dx = max(abs(c[0] - x) - hw, 0), dy = max(abs(c[1] - y) - hh, 0)) norm([dx, dy]) - c[2] - LABEL_MARGIN;
function peak(f, lo, hi) =
  hi - lo <= 2 ? let(values = [for (i = [lo:hi]) f(i)]) lo + search(max(values), values)[0]
  : let(third = floor((hi - lo) / 3), m1 = lo + third, m2 = hi - third) f(m1) < f(m2) ? peak(f, m1 + 1, hi) : peak(f, lo, m2 - 1);
function first_where(ok, lo, hi) = lo >= hi ? lo : let(mid = floor((lo + hi) / 2)) ok(mid) ? first_where(ok, lo, mid) : first_where(ok, mid + 1, hi);
function last_where(ok, lo, hi) = lo >= hi ? lo : let(mid = ceil((lo + hi) / 2)) ok(mid) ? last_where(ok, mid, hi) : last_where(ok, lo, mid - 1);
function by_start(intervals) =
  len(intervals) <= 1 ? intervals
  : let(pivot = intervals[floor(len(intervals) / 2)][0])
    concat(by_start([for (v = intervals) if (v[0] < pivot) v]), [for (v = intervals) if (v[0] == pivot) v], by_start([for (v = intervals) if (v[0] > pivot) v]));
function blocked(o, u, hw, hh, lo, hi) =
  let(along = o[0] * u[0] + o[1] * u[1], across = abs(o[1] * u[0] - o[0] * u[1]), reach = o[2] + LABEL_MARGIN + norm([hw, hh]),
      a = max(lo, ceil((along - reach) / 0.25)), b = min(hi, floor((along + reach) / 0.25)))
  across >= reach || a > b ? undef
  : let(f = function(i) box_clearance(i * 0.25 * u[0], i * 0.25 * u[1], hw, hh, o), closest = peak(function(i) -f(i), a, b))
    f(closest) >= 0 ? undef : [first_where(function(i) f(i) < 0, a, closest), last_where(function(i) f(i) < 0, closest, b)];
// The app samples every 0.25mm out along the bearing and takes the middle sample where the box clears
// the wall and every obstacle. This picks the same sample from intervals instead of testing each one.
function fit_along(edges, a, hw, hh, reach, room, obstacles) =
  let(u = [cos(a), sin(a)], f = function(i) box_margin(edges, i * 0.25 * u[0], i * 0.25 * u[1], hw, hh), top = peak(f, 0, floor(reach / 0.25)))
  f(top) < room ? undef
  : let(lo = first_where(function(i) f(i) >= room, 0, top), hi = last_where(function(i) f(i) >= room, top, floor(reach / 0.25)),
        spans = by_start([for (o = obstacles) let(span = blocked(o, u, hw, hh, lo, hi)) if (!is_undef(span)) span]),
        reached = [for (k = 0, end = lo - 1; k < len(spans); end = max(end, spans[k][1]), k = k + 1) max(end, spans[k][1])],
        free = [for (k = [0:len(spans)]) let(from = k == 0 ? lo : reached[k - 1] + 1, to = k == len(spans) ? hi : spans[k][0] - 1) if (to >= from) [from, to]],
        before = [for (k = 0, n = 0; k < len(free); n = n + free[k][1] - free[k][0] + 1, k = k + 1) n],
        total = len(free) == 0 ? 0 : before[len(free) - 1] + free[len(free) - 1][1] - free[len(free) - 1][0] + 1)
    total == 0 ? undef
    : let(middle = floor(total / 2), k = max([for (j = [0:len(free) - 1]) if (before[j] <= middle) j]), rc = (free[k][0] + middle - before[k]) * 0.25)
      [rc * u[0], rc * u[1]];
function fit_angles(edges, hw, hh, reach, room, obstacles, angles, i = 0) =
  i >= len(angles) ? undef
  : let(spot = fit_along(edges, angles[i], hw, hh, reach, room, obstacles))
    is_undef(spot) ? fit_angles(edges, hw, hh, reach, room, obstacles, angles, i + 1) : spot;
function fit_label(edges, width, height, reach, room, obstacles, angles, attempt = 0) =
  attempt >= 14 ? undef
  : let(scale = 0.92 ^ attempt, spot = fit_angles(edges, width * scale / 2, height * scale / 2, reach, room, obstacles, angles))
    is_undef(spot) ? fit_label(edges, width, height, reach, room, obstacles, angles, attempt + 1) : [scale, spot[0], spot[1]];

function glyph(ch) = [for (g = GLYPHS) if (g[0] == ch) g][0];
LABEL = ELONGATED ? str(trim_number(WIDTH), "×", trim_number(LENGTH)) : trim_number(WIDTH);
LABEL_GLYPHS = [for (i = [0:len(LABEL) - 1]) glyph(LABEL[i])];
// Pen position of each glyph, in font units, without kerning, as the app lays them out.
LABEL_PENS = [for (i = 0, pen = 0; i < len(LABEL_GLYPHS); pen = pen + LABEL_GLYPHS[i][1], i = i + 1) pen];
LABEL_INK = [
  min([for (i = [0:len(LABEL) - 1]) LABEL_PENS[i] + LABEL_GLYPHS[i][2]]),
  max([for (i = [0:len(LABEL) - 1]) LABEL_PENS[i] + LABEL_GLYPHS[i][3]]),
  min([for (g = LABEL_GLYPHS) g[4]]),
  max([for (g = LABEL_GLYPHS) g[5]]),
];
// Ink width over ink height, so a label `h` tall is `h * LABEL_ASPECT` wide.
LABEL_ASPECT = (LABEL_INK[1] - LABEL_INK[0]) / (LABEL_INK[3] - LABEL_INK[2]);

SLOT_EDGES = let(points = slot_points(0))
  [for (i = [0:len(points) - 1]) let(a = points[i], e = points[(i + 1) % len(points)] - a, n = [-e[1], e[0]] / norm(e)) [n, n * a]];
SLOT_LABEL_HEIGHT = min(4, min(WIDTH, LENGTH) * 0.14);
// [scale, x, y] of the label in each slot, relative to the slot's centre, or undef when it does not fit.
SLOT_LABEL = !labels || label_location != "slots" ? undef : fit_label(
  SLOT_EDGES,
  SLOT_LABEL_HEIGHT * LABEL_ASPECT,
  SLOT_LABEL_HEIGHT,
  norm([WIDTH / 2, LENGTH / 2]),
  LABEL_MARGIN,
  [for (m = MAGNETS) [m[0], m[1], POCKET_RADIUS]],
  label_angles([for (m = MAGNETS) if (norm(m) > 1e-6) atan2(m[1], m[0])])
);

// How far a label box clears one slot, as holder.ts measures it.
function slot_clearance_of(s, x, y, hw, hh) =
  CIRCLES ? hypot(max(abs(s[0] - x) - hw, 0), max(abs(s[1] - y) - hh, 0)) - ITEM_W / 2
  : let(dx = abs(s[0] - x) - hw - ITEM_W / 2, dy = abs(s[1] - y) - hh - ITEM_L / 2)
    dx < 0 && dy < 0 ? max(dx, dy) : hypot(max(dx, 0), max(dy, 0));
// Slots further than this from a row of positions are measured only when none nearer is.
NEAR = 10;
// [height, x, y] of the label on the module: the largest height from 4mm down that clears every slot by 1mm,
// at the position on a 2mm grid with the most clearance, the first of equals in the app's order.
function module_spot(height) =
  let(hh = height / 2, hw = height * LABEL_ASPECT / 2,
      candidates = [for (y = -HOLDER_L / 2 + hh + 3; y <= HOLDER_L / 2 - hh - 3; y = y + 2)
        let(near = [for (s = SLOTS) if (abs(s[1] - y) - hh - ITEM_L / 2 <= NEAR) s])
        for (x = -HOLDER_W / 2 + hw + 3; x <= HOLDER_W / 2 - hw - 3; x = x + 2)
          let(close = len(near) == 0 ? undef : min([for (s = near) slot_clearance_of(s, x, y, hw, hh)]),
              clearance = !is_undef(close) && close <= NEAR ? close : min([for (s = SLOTS) slot_clearance_of(s, x, y, hw, hh)]))
          if (clearance >= 1) [clearance, x, y]],
      best = len(candidates) == 0 ? undef : max([for (c = candidates) c[0]]))
  is_undef(best) ? undef : let(c = [for (c = candidates) if (c[0] == best) c][0]) [height, c[1], c[2]];
function module_label(height = 4) = height < 2 ? undef : let(spot = module_spot(height)) is_undef(spot) ? module_label(height - 0.5) : spot;
MODULE_LABEL = !labels || label_location != "module" ? undef : module_label();

// The label `height` tall, its ink centred on the origin.
module label(height) {
  scale(height / (LABEL_INK[3] - LABEL_INK[2]))
    translate([-(LABEL_INK[0] + LABEL_INK[1]) / 2, -(LABEL_INK[2] + LABEL_INK[3]) / 2])
      for (i = [0:len(LABEL) - 1]) if (len(LABEL_GLYPHS[i]) > 2) translate([LABEL_PENS[i], 0])
        text(LABEL[i], size = 0.72 * UNITS_PER_EM, font = LABEL_FONT, halign = "left", valign = "baseline", $fn = 8);
}

PROFILE_SEGMENTS = segments_for(GRID_CORNER_RADIUS * 2);
module rounded_rect(w, l, inset) {
  polygon(rect_points(w - inset * 2, l - inset * 2, max(0.01, GRID_CORNER_RADIUS - inset), PROFILE_SEGMENTS));
}

module foot() {
  for (i = [0:len(PROFILE) - 2]) hull() {
    translate([0, 0, PROFILE[i][1]]) linear_extrude(SLICE) rounded_rect(GRID - GAP, GRID - GAP, PROFILE[i][0]);
    translate([0, 0, PROFILE[i + 1][1] - SLICE]) linear_extrude(SLICE) rounded_rect(GRID - GAP, GRID - GAP, PROFILE[i + 1][0]);
  }
}

module slot() {
  w = WIDTH + CLEARANCE;
  l = LENGTH + CLEARANCE;
  // A pill is a rectangle and two circles, as holder.ts unions them.
  if (SHAPE == "pill" && w > l) {
    n = segments_for(max(WIDTH, LENGTH) + CLEARANCE);
    square([w - l, l], center = true);
    for (side = [-1, 1]) translate([side * (w - l) / 2, 0]) polygon(circle_points(l / 2, n));
  } else polygon(slot_points(CLEARANCE));
}

module holder() {
  difference() {
    union() {
      for (x = [0:UNITS_WIDE - 1], y = [0:UNITS_DEEP - 1])
        translate([(x - (UNITS_WIDE - 1) / 2) * GRID, (y - (UNITS_DEEP - 1) / 2) * GRID]) foot();
      translate([0, 0, FOOT_TOP]) linear_extrude(holder_height - FOOT_TOP) rounded_rect(HOLDER_W, HOLDER_L, 0);
    }
    translate([0, 0, holder_height - slot_depth]) linear_extrude(slot_depth + 0.01)
      for (s = SLOTS) translate(s) slot();
    if (len(MAGNETS) > 0) translate([0, 0, holder_height - slot_depth - MAGNET_DEPTH]) linear_extrude(MAGNET_DEPTH + 0.001)
      for (s = SLOTS, m = MAGNETS) translate(s + m) polygon(circle_points(POCKET_RADIUS, segments_for(POCKET_RADIUS * 2)));
    if (!is_undef(SLOT_LABEL)) translate([0, 0, holder_height - slot_depth - ENGRAVING_DEPTH]) linear_extrude(ENGRAVING_DEPTH + 0.01)
      for (s = SLOTS) translate([s[0] + SLOT_LABEL[1], s[1] + SLOT_LABEL[2]]) label(SLOT_LABEL_HEIGHT * SLOT_LABEL[0]);
    if (!is_undef(MODULE_LABEL)) translate([MODULE_LABEL[1], MODULE_LABEL[2], holder_height - ENGRAVING_DEPTH]) linear_extrude(ENGRAVING_DEPTH + 0.01)
      label(MODULE_LABEL[0]);
  }
}

holder();
