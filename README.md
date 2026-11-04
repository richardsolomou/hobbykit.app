<div align="center">
  <img src="public/favicon.svg" width="80" alt="HobbyKit logo" />

# HobbyKit

**Printable bases, trays, holders, and paint racks for the tabletop hobby, sized exactly how you need them.**

[hobbykit.app](https://hobbykit.app)

[![Build](https://img.shields.io/github/actions/workflow/status/richardsolomou/hobbykit.app/ci.yml?branch=main)](https://github.com/richardsolomou/hobbykit.app/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/richardsolomou/hobbykit.app)](LICENSE)
</div>

HobbyKit makes support-free STL and 3MF files for tabletop miniature bases, matching flying stems, Gridfinity holders, low-profile spray trays, stepped paint racks, gaming tokens, and dial counters. Pick a standard footprint or enter an exact one, choose the magnets you have, and export a model ready for the slicer. A base's size is embossed inside, so a loose print still tells you what it is: a `28.5` base says `28.5`, not `29`. Type your own label instead, such as a unit name or squad number; text that cannot fit the base is reported rather than dropped, and the filename still names the size.

Everything runs in the browser. Models are built locally and nothing is uploaded.

## Who is it for? 👋

HobbyKit is for hobbyists who need replacement, conversion, or display bases without searching for the right STL or redrawing the same part in CAD.

Built-in presets cover common Games Workshop, The Old World, Kings of War, and historical sizes. Custom footprints from 15–180mm work too.

## How it works 🧲

1. **Choose the footprint** by picking its shape, then a standard size or exact dimensions.
2. **Match your magnets** by setting their diameter, thickness, fit and depth clearances, and count.
3. **Tune the print** with the edge profile, wall thickness, top thickness, and internal supports.
4. **Check both faces** in the live 3D view, where dimensions, the export name, and the part's weight as solid PLA stay visible. Holders and spray trays show the total for every part. A slicer's walls and infill will use less filament than that.
5. **Save an STL or 3MF** built at a 1µm chord tolerance for circular geometry.

The [bases guide](docs/generators/bases.md) covers footprints, labels, magnets, and batch export, and the [flying stems guide](docs/generators/stems.md) covers stems.

## Gridfinity holders 📦

Add miniature groups, choose the available rows and columns, and HobbyKit packs matching slots into printable Gridfinity modules. Read the [holders guide](docs/generators/holders.md).

## Spray trays 🎨

Build a low-profile magnetic platform for batch priming and spray painting. Read the [spray trays guide](docs/generators/spray-tray.md).

## Paint racks 🖌️

Stand your paints in stepped rows so every label shows. Read the [paint racks guide](docs/generators/paint-racks.md).

## Tokens 🪙

Make a round, square, or hex token for objectives, Oath of Moment, or anything else a game tracks. Read the [tokens guide](docs/generators/tokens.md).

## Dial counters 🎲

Track wounds, victory points, or command points from 00 to 99 on two ten-sided drums that rest on their flats and click into place, with raised digits on press-in tiles in a second colour. Read the [dial counters guide](docs/generators/counters.md).

## Designed for one job 🎯

- Round, oval, pill, rectangle, and regular polygon bases.
- Hollow undersides with automatic ribs and magnet layouts.
- Printable 15, 20, 30, and 35mm flying stems with adjustable peg or ball-joint connections.
- Round, square, and hex tokens with wrapped text and traced image silhouettes, raised in a second colour or engraved.
- Stepped honeycomb paint racks for dropper bottles and pots.
- Two-drum 00–99 dial counters held at each count by printed click detents, joined by a snap-fit hub, with a pointer marking the count and raised digits on press-in tiles in a second colour or engraved for paint.
- Shared magnet dimensions across bases, holders, and spray trays.
- Balanced or five-pocket cross magnet arrangements for bases and holders. Saved cross layouts keep one centre pocket and four outer pockets on both axes, including elongated footprints.
- Exact size labels, filenames, dimensions, and high-quality exports.
- Optional textures for the face a model stands on, all without supports: eight paving and plating patterns cut with 45° joints, or seven ground reliefs such as rock, rubble, and snow on a base that prints face up. Every random pattern can be rerolled and made tidier or wilder.
- Browser-saved settings with shared base and holder preferences, and a confirmed reset for each generator or for the shared settings.
- Copyable links that open the current generator with the same settings.

HobbyKit generates bases and the hobby accessories around them. It does not sculpt miniatures, import heightmaps, slice models, or control a printer.

## Private by design 🔒

The generator, 3D preview, fonts, and exporters all run locally in your browser. HobbyKit has no backend, accounts, database, or file uploads.

**Copy link** packs the current generator's settings, plus the shared magnet and wall settings it uses, into the part of the address after `#`, which browsers never send to a server. Opening the link applies those settings over your saved ones for that generator, then tidies the address so a reload uses your saved settings again. A token image travels with the link only while the link stays under about 8KB; otherwise the link is copied without it and HobbyKit says so. A base link leaves the batch export list behind, so opening one keeps your own.

## Development 🛠️

Development requires Node 24.x and pnpm 12.13.0.

```sh
pnpm install
pnpm dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, checks, and sample exports. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

Cloudflare builds the static app with `pnpm build` and serves `dist/`. See the [deployment guide](docs/deployment.md) for Pages setup, custom-domain configuration, and production checks.

## License

[GNU Affero General Public License v3.0](LICENSE). Oswald (`src/assets/fonts`) is used under the [SIL Open Font Licence](src/assets/fonts/OFL.txt).
