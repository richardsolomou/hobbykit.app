// HobbyKit magnetised miniature base, for MakerWorld's Parametric Model Maker.
// A port of src/core/geometry/base.ts: change both together, then run `just makerworld check`.
// The base prints the way it is modelled: z = 0 is the face the miniature is glued to,
// and the magnet pockets open on the top face, which meets a magnetised tray.
// Licensed under CC BY-SA 4.0, unlike the AGPL-3.0-only app, because MakerWorld offers no GPL licence.

/* [Size & Shape] */
// Pick a standard size, or Custom to use the shape and dimensions below.
standard_size = "round-32"; // [custom:Custom, round-25:Round 25mm - Guardsmen & Gretchin & Kabalite Warriors, round-28.5:Round 28.5mm - Guardians & Kasrkin & Freeguild Fusiliers, round-32:Round 32mm - Intercessors & Necron Warriors & Ork Boyz, round-40:Round 40mm - Terminators & Custodian Guard & Captains, round-50:Round 50mm - Centurions & Obliterators & Kroxigor, round-60:Round 60mm - Dreadnoughts & Daemon Princes & Stormfiends, round-80:Round 80mm - Avatar of Khaine & Ghazghkull & Slann, round-90:Round 90mm - Redemptor and Brutalis Dreadnoughts, round-100:Round 100mm - Armiger Knights & Repulsor & Greater Daemons, round-120:Round 120mm - Wazdakka Gutsmek, round-130:Round 130mm - Great Unclean One & Onager & Nagash, round-160:Round 160mm - Monolith & Defilers & Archaon, oval-60x35.5:Oval 60×35.5mm - Rough Riders & Flesh Hounds & Hexwraiths, oval-75x42:Oval 75×42mm - Chaos Bikers & Vertus Praetors & Blood Knights, oval-90x52.5:Oval 90×52.5mm - Outriders & Bloodcrushers & Dracothian Guard, oval-105x70:Oval 105×70mm - Land Speeder & Carnifexes & Treelord, oval-120x92:Oval 120×92mm - Riptide & Wraithknight & Bloodthirster, oval-150x95:Oval 150×95mm - Ork buggies & Knight Destrier, oval-170x105:Oval 170×105mm - Stardrake & Black Coach & Mortek Crawler, oval-170x109:Oval 170×109mm - Imperial and Chaos Knights & Stormsurge, pill-50x25:Pill 50×25mm - Saga and Bolt Action cavalry, pill-60x35.5:Pill 60×35.5mm - In place of the matching GW oval, pill-75x42:Pill 75×42mm - In place of the matching GW oval, pill-90x52.5:Pill 90×52.5mm - In place of the matching GW oval, pill-105x70:Pill 105×70mm - In place of the matching GW oval, rect-20x20:Rectangle 20×20mm - Kings of War Infantry, rect-25x25:Rectangle 25×25mm - Old World infantry & KoW Heavy Infantry, rect-30x30:Rectangle 30×30mm - Old World Orcs & Chaos Warriors & Saurus, rect-25x50:Rectangle 25×50mm - Old World light cavalry & KoW Cavalry, rect-30x60:Rectangle 30×60mm - Old World knights and cavalry, rect-40x40:Rectangle 40×40mm - Ogres & Trolls & KoW Large Infantry, rect-40x60:Rectangle 40×60mm - Old World Pegasus Knights, rect-50x50:Rectangle 50×50mm - Minotaurs & KoW Large Cavalry and Monsters, rect-50x75:Rectangle 50×75mm - Old World Demigryphs and cannons, rect-50x100:Rectangle 50×100mm - Old World and KoW chariots, rect-60x100:Rectangle 60×100mm - Old World Steam Tank & Griffons & Dragons, rect-75x75:Rectangle 75×75mm - Kings of War Titans, rect-100x150:Rectangle 100×150mm - Old World Terrorgheist & Zombie Dragon, polygon-25:Hex 25mm - Fits a Ø25 round, polygon-32:Hex 32mm - Fits a Ø32 round, polygon-40:Hex 40mm - Fits a Ø40 round, polygon-50:Hex 50mm - Fits a Ø50 round, polygon-60:Hex 60mm - Fits a Ø60 round]
// Used only with a custom size.
shape = "round"; // [round:Round, oval:Oval, pill:Pill, rect:Rectangle, polygon:Hex]
// Custom size: the diameter of a round, the overall width otherwise. Hex sizes run across the corners.
width = 32; // [15:0.5:180]
// Custom size: the depth of an oval, pill or rectangle.
depth = 32; // [15:0.5:180]
// Corner rounding for rectangles. 0 picks it from the size.
corner_radius = 0; // [0:0.5:12]
// Sides of a hex base, so 8 makes an octagon.
sides = 6; // [3:1:12]

/* [Magnets] */
magnet_diameter = 5; // [2:0.5:8]
magnet_thickness = 2; // [0.5:0.1:5]
// Auto picks a count from the footprint and the magnet's strength.
magnets_per_base = "auto"; // [auto:Auto, 0, 1, 2, 3, 4, 5, 6, 8]
// The five-pocket cross needs a round base of 50mm or more.
pocket_layout = "balanced"; // [balanced:Balanced, five-cross:Five-pocket cross]

/* [Label] */
// Emboss a label inside the base.
labels = true;
// Leave empty to emboss the base size.
label_text = "";
// Cap height in mm. 0 picks it from the size.
label_size = 0; // [0:0.1:12]

/* [Construction] */
// 0 picks 4mm, or 4.5mm from 65mm up.
base_height = 0; // [0:0.25:12]
wall_thickness = 2; // [1:0.1:6]
// Material between the recess and the face the model is glued to. 0 picks 1mm, or 1.5mm from 65mm up.
top_thickness = 0; // [0:0.1:6]
bottom_edge = "taper"; // [taper:Taper, bevel:Bevel, round:Round, straight:Straight]
edge_size = 1; // [0:0.1:3]

/* [Internal Supports] */
// Auto puts a support through every magnet pocket.
number_of_supports = "auto"; // [auto:Auto, 0, 2, 3, 4, 5, 6, 8]
support_thickness = 1.6; // [0.8:0.1:4]
support_height = 1.2; // [0.4:0.1:10]

/* [Fit & Detail] */
magnet_diameter_clearance = 0.2; // [0:0.05:0.6]
// Room behind each magnet for adhesive.
magnet_depth_clearance = 0.1; // [0:0.05:2]
wall_around_pocket = 0.9; // [0.4:0.1:3]
label_emboss = 0.6; // [0.2:0.1:2]

/* [Hidden] */
LABEL_FONT = "Oswald:style=Bold";
LABEL_MARGIN = 0.8;
LABEL_MAX_LENGTH = 20;
MAX_MAGNETS = 8;
MIN_PROFILE_WALL = 0.4;
EXPORT_CURVE_TOLERANCE = 0.001;
// The rest of the hull is exact; each loft slice is this thin.
SLICE = 0.001;
MAGNET_PITCH = 31;
END_PAIR_PITCHES = 3;
SINGLE_MAGNET_MAX_SPAN = MAGNET_PITCH * 2;
RING_COUNTS = [3, 4, 5, 6, 8];
ROW_COUNTS = [4, 6, 8];
ROW_LIMIT_COUNTS = [1, 2, 4, 6, 8];
DEFAULT_MAGNET_STRENGTH = 5 ^ 2 * 2;

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
SHORT = min(WIDTH, LENGTH);
LONG = max(WIDTH, LENGTH);

FLOOR = top_thickness > 0 ? top_thickness : SHORT >= 65 ? 1.5 : 1;
HEIGHT = base_height > 0 ? base_height : 3 + (SHORT >= 65 ? 1.5 : 1);
WELL_DEPTH = HEIGHT - FLOOR;
CORNER_RADIUS = corner_radius > 0 ? corner_radius : min(2, SHORT * 0.06);
LABEL_HEIGHT = label_size > 0 ? label_size : min(8, max(3.5, SHORT * 0.2));

function segments_for_tolerance(diameter, tolerance) = diameter / 2 <= tolerance ? 3 : ceil(180 / acos(1 - tolerance / (diameter / 2)));
SEGMENTS = segments_for_tolerance(LONG, EXPORT_CURVE_TOLERANCE);
TOLERANCE = LONG / 2 * (1 - cos(180 / SEGMENTS));

function sum(values, i = 0) = i >= len(values) ? 0 : values[i] + sum(values, i + 1);
function trim_number(value) = str(round(value * 100) / 100);

// Edge profile: [inset, z] slices from the glued face up to the top face.
function profile_steps(height, profile, size, tolerance) =
  let(s = max(0, min(size, height - 0.1)))
  profile == "straight" || s <= 0 ? [[0, 0], [0, height]]
  : profile == "taper" ? [[s, 0], [0, height]]
  : profile == "bevel" ? [[s, 0], [0, s], [0, height]]
  : let(steps = max(3, ceil(segments_for_tolerance(2 * s, tolerance) / 4)))
    concat([for (i = [0:steps]) let(a = 90 * i / steps) [s - s * sin(a), s - s * cos(a)]], [[0, height]]);

function inset_at(steps, z, i = 1) =
  z <= steps[0][1] ? steps[0][0]
  : i >= len(steps) ? steps[len(steps) - 1][0]
  : z > steps[i][1] ? inset_at(steps, z, i + 1)
  : let(before = steps[i - 1], after = steps[i]) before[0] + (after[0] - before[0]) * (z - before[1]) / (after[1] - before[1]);

STEPS = profile_steps(HEIGHT, bottom_edge, edge_size, TOLERANCE);

// The footprint as a counter-clockwise convex polygon, vertex for vertex what Manifold builds.
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

PILL_STRAIGHT = max(WIDTH - LENGTH, 0);
POLYGON_SIDES = max(3, round(sides));
OUTLINE =
  SHAPE == "round" ? circle_points(WIDTH / 2, SEGMENTS)
  : SHAPE == "oval" ? [for (p = circle_points(1, SEGMENTS)) [p[0] * WIDTH / 2, p[1] * LENGTH / 2]]
  : SHAPE == "polygon" ? circle_points(WIDTH / 2, POLYGON_SIDES)
  : SHAPE == "pill" ? (PILL_STRAIGHT <= 0 ? circle_points(SHORT / 2, SEGMENTS) : pill_points(SHORT / 2, PILL_STRAIGHT, SEGMENTS))
  : rect_points(WIDTH, LENGTH, max(0, min(CORNER_RADIUS, SHORT / 2 - 0.01)), SEGMENTS);

// Each edge as its inward unit normal n and offset c, so a point p lies n·p - c inside that edge.
EDGES = [for (i = [0:len(OUTLINE) - 1]) let(a = OUTLINE[i], e = OUTLINE[(i + 1) % len(OUTLINE)] - a, n = [-e[1], e[0]] / norm(e)) [n, n * a]];

// Half extents of the well, the outline offset inwards by the wall.
function regular_half_extents(r, n, inset) =
  let(reach = r - inset / cos(180 / n), angles = [for (i = [0:n - 1]) 360 * i / n])
  [reach * max([for (a = angles) cos(a)]), reach * max([for (a = angles) sin(a)])];
WELL_HALF =
  SHAPE == "round" || (SHAPE == "pill" && PILL_STRAIGHT <= 0) ? regular_half_extents(SHORT / 2, SEGMENTS, wall_thickness)
  : SHAPE == "polygon" ? regular_half_extents(WIDTH / 2, POLYGON_SIDES, wall_thickness)
  : [WIDTH / 2 - wall_thickness, LENGTH / 2 - wall_thickness];
// Checked here, before anything is built from the well.
WELL_REACH =
  assert(WELL_DEPTH >= 0.2, "No room left for a well — thin the top")
  assert(wall_thickness - inset_at(STEPS, FLOOR) >= MIN_PROFILE_WALL - 1e-6, "Edge profile leaves too little wall at the well floor — reduce the edge size")
  assert(WELL_HALF[0] > 0 && WELL_HALF[1] > 0, "Walls leave no room inside — thin the wall")
  norm(WELL_HALF);

// Magnet counts, ported from presets.ts.
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
function rib_count_for(w, l, magnets) =
  let(short = min(w, l))
  magnets >= 2 ? (magnets_ring(w, l) ? magnets : short <= 45 ? 4 : 6)
  : short <= 28.5 ? 2 : short <= 34 ? 3 : 4;

FIVE_CROSS = pocket_layout == "five-cross" && SHAPE == "round" && WIDTH >= 50;
MAGNET_COUNT =
  FIVE_CROSS ? 5
  : magnets_per_base == "auto" ? automatic_magnet_count(WIDTH, LENGTH, MAX_MAGNETS, magnet_diameter, magnet_thickness)
  : [for (c = [0:MAX_MAGNETS]) if (str(c) == magnets_per_base) c][0];
RIB_COUNT =
  number_of_supports != "auto" ? [for (c = [0:MAX_MAGNETS]) if (str(c) == number_of_supports) c][0]
  : FIVE_CROSS ? 4 : rib_count_for(WIDTH, LENGTH, MAGNET_COUNT);

POCKET_RADIUS = (magnet_diameter + magnet_diameter_clearance) / 2;
BOSS_RADIUS = POCKET_RADIUS + wall_around_pocket;
POCKET_DEPTH = min(magnet_thickness + magnet_depth_clearance, WELL_DEPTH);

// Magnet centres: a ring on round-ish footprints, a row down the long axis otherwise.
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

MAGNETS = magnet_positions(MAGNET_COUNT, WELL_HALF[0], WELL_HALF[1], BOSS_RADIUS + LABEL_MARGIN, SHAPE == "oval", FIVE_CROSS);
BOSS_BEARINGS = [for (m = MAGNETS) if (norm(m) > 1e-6) atan2(m[1], m[0])];

// Rib bearings, phased from a boss bearing so ribs run exactly through as many bosses as the counts allow.
function angle_between(a, b) = abs(atan2(sin(a - b), cos(a - b)));
function spokes(count, phase) = [for (i = [0:count - 1]) phase + 360 * i / count];
function rib_angles(count, bosses) =
  count <= 0 ? []
  : len(bosses) == 0 ? spokes(count, 90)
  : let(missed = [for (phase = bosses) let(arranged = spokes(count, phase))
                    sum([for (b = bosses) min([for (s = arranged) angle_between(s, b)])])])
    spokes(count, bosses[search(min(missed), missed)[0]]);
RIBS = rib_angles(RIB_COUNT, BOSS_BEARINGS);

// A stable sort: items in the order `before` gives, keeping ties in their original order.
function ordered(items, before) =
  let(n = len(items)) n == 0 ? []
  : [for (r = [0:n - 1]) each [for (i = [0:n - 1])
      if (len([for (j = [0:n - 1]) if (before(items[j], items[i]) || (!before(items[i], items[j]) && j < i)) j]) == r) items[i]]];

// Gaps are compared at this precision, so float noise never decides between equally wide ones.
function settle(value) = round(value / 1e-9) * 1e-9;

// Label bearings: the middles of the gaps between ribs and bosses, widest first, then eight fallbacks.
// Equally wide gaps go nearest -y first, then toward -x, as label.ts orders them.
function label_angles(solid_bearings) =
  let(solid = ordered([for (a = solid_bearings) ((a % 360) + 360) % 360], function(a, b) a < b), n = len(solid),
      gaps = n == 0 ? [] : [for (i = [0:n - 1]) let(next = i + 1 < n ? solid[i + 1] : solid[0] + 360, middle = (solid[i] + next) / 2)
        [middle, settle((next - solid[i]) * PI / 180), settle(angle_between(middle, -90) * PI / 180), settle(cos(middle))]],
      widest = ordered(gaps, function(g, h) g[1] > h[1] || (g[1] == h[1] && (g[2] < h[2] || (g[2] == h[2] && g[3] < h[3])))))
  concat([for (g = widest) g[0]], [for (i = [0:7]) 45 * i]);

function rib_obstacles(angles, length, thickness) =
  length <= 0 ? [] : let(step = max(0.4, thickness / 2))
  [for (a = angles) for (r = [0:step:length]) [r * cos(a), r * sin(a), thickness / 2]];

// How far a box's nearest corner lies inside the outline; boxes at least d inside fit its miter offset by d,
// since it is convex. Being the minimum of linear functions it is concave along any line, so the stretch
// of a ray where a box clears the wall is one interval.
function box_margin(x, y, hw, hh) = min([for (e = EDGES) e[0][0] * x + e[0][1] * y - e[1] - hw * abs(e[0][0]) - hh * abs(e[0][1])]);
// How far a box clears an obstacle circle, padded by the label margin; negative when they overlap.
// A point's distance to a box is convex as the box slides along a line, so each obstacle blocks one interval.
function box_clearance(x, y, hw, hh, c) =
  let(dx = max(abs(c[0] - x) - hw, 0), dy = max(abs(c[1] - y) - hh, 0)) norm([dx, dy]) - c[2] - LABEL_MARGIN;

// Searches over sample indices: the highest point of a concave f, and the ends of a run where `ok` holds.
function peak(f, lo, hi) =
  hi - lo <= 2 ? let(values = [for (i = [lo:hi]) f(i)]) lo + search(max(values), values)[0]
  : let(third = floor((hi - lo) / 3), m1 = lo + third, m2 = hi - third) f(m1) < f(m2) ? peak(f, m1 + 1, hi) : peak(f, lo, m2 - 1);
function first_where(ok, lo, hi) = lo >= hi ? lo : let(mid = floor((lo + hi) / 2)) ok(mid) ? first_where(ok, lo, mid) : first_where(ok, mid + 1, hi);
function last_where(ok, lo, hi) = lo >= hi ? lo : let(mid = ceil((lo + hi) / 2)) ok(mid) ? last_where(ok, mid, hi) : last_where(ok, lo, mid - 1);
function by_start(intervals) =
  len(intervals) <= 1 ? intervals
  : let(pivot = intervals[floor(len(intervals) / 2)][0])
    concat(by_start([for (v = intervals) if (v[0] < pivot) v]), [for (v = intervals) if (v[0] == pivot) v], by_start([for (v = intervals) if (v[0] > pivot) v]));

// Sample indices in [lo, hi] an obstacle blocks, or undef.
function blocked(o, u, hw, hh, lo, hi) =
  let(along = o[0] * u[0] + o[1] * u[1], across = abs(o[1] * u[0] - o[0] * u[1]), reach = o[2] + LABEL_MARGIN + norm([hw, hh]),
      a = max(lo, ceil((along - reach) / 0.25)), b = min(hi, floor((along + reach) / 0.25)))
  across >= reach || a > b ? undef
  : let(f = function(i) box_clearance(i * 0.25 * u[0], i * 0.25 * u[1], hw, hh, o), closest = peak(function(i) -f(i), a, b))
    f(closest) >= 0 ? undef : [first_where(function(i) f(i) < 0, a, closest), last_where(function(i) f(i) < 0, closest, b)];

// The app samples every 0.25mm out along the bearing and takes the middle sample where the box clears
// the wall and every obstacle. This picks the same sample from intervals instead of testing each one.
function fit_along(a, hw, hh, reach, room, obstacles) =
  let(u = [cos(a), sin(a)], f = function(i) box_margin(i * 0.25 * u[0], i * 0.25 * u[1], hw, hh), top = peak(f, 0, floor(reach / 0.25)))
  f(top) < room ? undef
  : let(lo = first_where(function(i) f(i) >= room, 0, top), hi = last_where(function(i) f(i) >= room, top, floor(reach / 0.25)),
        spans = by_start([for (o = obstacles) let(span = blocked(o, u, hw, hh, lo, hi)) if (!is_undef(span)) span]),
        // Furthest sample blocked by the first k spans, so each gap between them is what lies past it.
        reached = [for (k = 0, end = lo - 1; k < len(spans); end = max(end, spans[k][1]), k = k + 1) max(end, spans[k][1])],
        free = [for (k = [0:len(spans)]) let(from = k == 0 ? lo : reached[k - 1] + 1, to = k == len(spans) ? hi : spans[k][0] - 1) if (to >= from) [from, to]],
        before = [for (k = 0, n = 0; k < len(free); n = n + free[k][1] - free[k][0] + 1, k = k + 1) n],
        total = len(free) == 0 ? 0 : before[len(free) - 1] + free[len(free) - 1][1] - free[len(free) - 1][0] + 1)
    total == 0 ? undef
    : let(middle = floor(total / 2), k = max([for (j = [0:len(free) - 1]) if (before[j] <= middle) j]), rc = (free[k][0] + middle - before[k]) * 0.25)
      [rc * u[0], rc * u[1]];
function fit_angles(hw, hh, reach, room, obstacles, angles, i = 0) =
  i >= len(angles) ? undef
  : let(spot = fit_along(angles[i], hw, hh, reach, room, obstacles))
    is_undef(spot) ? fit_angles(hw, hh, reach, room, obstacles, angles, i + 1) : spot;
// [scale, x, y] for a width × height box, shrinking 8% at a time, or undef when nothing fits.
function fit_label(width, height, reach, room, obstacles, angles, attempt = 0) =
  attempt >= 14 ? undef
  : let(scale = 0.92 ^ attempt, spot = fit_angles(width * scale / 2, height * scale / 2, reach, room, obstacles, angles))
    is_undef(spot) ? fit_label(width, height, reach, room, obstacles, angles, attempt + 1) : [scale, spot[0], spot[1]];

function trim(text, from = 0, to = -1) =
  let(end = to < 0 ? len(text) - 1 : to)
  from <= end && text[from] == " " ? trim(text, from + 1, end)
  : end >= from && text[end] == " " ? trim(text, from, end - 1)
  : from > end ? "" : chr([for (i = [from:end]) ord(text[i])]);
function glyph(ch) = [for (g = GLYPHS) if (g[0] == ch) g][0];

CUSTOM_LABEL = trim(label_text);
LABEL = CUSTOM_LABEL != "" ? CUSTOM_LABEL : ELONGATED ? str(trim_number(WIDTH), "x", trim_number(LENGTH)) : trim_number(WIDTH);
LABEL_GLYPHS =
  let(glyphs = [for (i = [0:1:len(LABEL) - 1]) glyph(LABEL[i])])
  assert(!labels || (len(LABEL) <= LABEL_MAX_LENGTH && len([for (g = glyphs) if (is_undef(g)) 1]) == 0),
    str("Label text must be at most ", LABEL_MAX_LENGTH, " characters the font can draw"))
  labels ? glyphs : [];
// Pen position of each glyph, in font units, without kerning, as the app lays them out.
LABEL_PENS = [for (i = 0, pen = 0; i < len(LABEL_GLYPHS); pen = pen + LABEL_GLYPHS[i][1], i = i + 1) pen];
LABEL_INKED = [for (i = [0:1:len(LABEL_GLYPHS) - 1]) if (len(LABEL_GLYPHS[i]) > 2) i];
LABEL_INK = len(LABEL_INKED) == 0 ? undef : [
  min([for (i = LABEL_INKED) LABEL_PENS[i] + LABEL_GLYPHS[i][2]]),
  max([for (i = LABEL_INKED) LABEL_PENS[i] + LABEL_GLYPHS[i][3]]),
  min([for (i = LABEL_INKED) LABEL_GLYPHS[i][4]]),
  max([for (i = LABEL_INKED) LABEL_GLYPHS[i][5]]),
];
// Millimetres per font unit, so the label's ink is exactly the label height tall.
LABEL_UNIT = is_undef(LABEL_INK) ? 0 : LABEL_HEIGHT / (LABEL_INK[3] - LABEL_INK[2]);
// A size label that cannot be placed is left out, but text someone typed must fit or the build fails.
LABEL_FIT =
  let(fit = is_undef(LABEL_INK) ? undef : fit_label(
    (LABEL_INK[1] - LABEL_INK[0]) * LABEL_UNIT,
    LABEL_HEIGHT,
    WELL_REACH,
    wall_thickness + LABEL_MARGIN,
    concat([for (m = MAGNETS) [m[0], m[1], BOSS_RADIUS]], rib_obstacles(RIBS, WELL_REACH, support_thickness)),
    label_angles(concat(RIBS, BOSS_BEARINGS))
  ))
  assert(CUSTOM_LABEL == "" || !labels || !is_undef(fit), "Label text does not fit this base — shorten it or reduce the label size")
  fit;

module outline(inset = 0) {
  if (inset == 0) polygon(OUTLINE);
  else offset(delta = -inset) polygon(OUTLINE);
}

// The body is the convex hull of the outline offset at each profile height; every footprint is convex.
module body() {
  hull() for (step = STEPS)
    translate([0, 0, step[1] == 0 ? 0 : step[1] - SLICE]) linear_extrude(SLICE) outline(step[0]);
}

module label() {
  translate([LABEL_FIT[1], LABEL_FIT[2]]) scale(LABEL_FIT[0] * LABEL_UNIT)
    translate([-(LABEL_INK[0] + LABEL_INK[1]) / 2, -(LABEL_INK[2] + LABEL_INK[3]) / 2])
      for (i = LABEL_INKED) translate([LABEL_PENS[i], 0])
        text(LABEL[i], size = 0.72 * UNITS_PER_EM, font = LABEL_FONT, halign = "left", valign = "baseline", $fn = 8);
}

module base() {
  difference() {
    union() {
      difference() {
        body();
        translate([0, 0, FLOOR]) linear_extrude(WELL_DEPTH + 1) outline(wall_thickness);
      }
      for (m = MAGNETS) translate([m[0], m[1], FLOOR]) cylinder(r = BOSS_RADIUS, h = WELL_DEPTH, $fn = SEGMENTS);
      rib_height = min(support_height, WELL_DEPTH);
      if (len(RIBS) > 0 && rib_height > 0) {
        reach = WELL_REACH + wall_thickness;
        translate([0, 0, FLOOR]) linear_extrude(rib_height) intersection() {
          for (a = RIBS) rotate(a) translate([reach / 2, 0]) square([reach, support_thickness], center = true);
          // Ribs run a little way into the wall so the two never meet tangent.
          offset(delta = min(0.4, wall_thickness / 2)) outline(wall_thickness);
        }
      }
      if (!is_undef(LABEL_FIT)) translate([0, 0, FLOOR]) linear_extrude(min(label_emboss, WELL_DEPTH)) label();
    }
    for (m = MAGNETS) translate([m[0], m[1], HEIGHT - POCKET_DEPTH]) cylinder(r = POCKET_RADIUS, h = POCKET_DEPTH + 1.001, $fn = SEGMENTS);
  }
}

base();
