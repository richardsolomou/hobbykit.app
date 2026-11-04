# Dial counters

- **Category:** Toys & Games › Board Games (or Tabletop Miniatures › Miniature Gaming Accessories)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** dial counter, wound counter, life counter, score counter, counter, wargaming, tabletop, board game, mtg, warhammer, parametric, openscad, no supports

## Summary

Two-drum dial counters that click from 00 to 99, with no hardware. The hub snaps together and every count clicks into place.

## Description

Two ten-sided drums turn on a snap-fit hub with a pointer between them. Little printed bumps on each drum click into dimples on the pointer, so the count stays put when you set the counter down. The pointer has a flat bottom, so it stays upright while the drums roll.

The digits are press-in tiles in a second colour. They print on their own plate, so the whole set costs one filament change instead of dozens. The STLs are the default 34mm counter, with drums 12mm wide: the two drums, the pointer, and the tiles as two files, one for the tile bases and one for the raised digits and arrows that go on them.

To print the tiles in two colours, select both tile files and load them as one object with multiple parts. Most slicers offer that when you load several files at once; if yours doesn't, right-click the tiles and add the digits file as a part. Then give the digits part your second filament.

For other sizes, or engraved digits you can paint instead of tiles, open `counter.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old.

What you can change in the .scad:

- Part: everything on one plate, or each drum, the pointer or the tiles on their own
- Tiles: every tile, or one digit or the arrows on its own, to reprint one that failed
- Drum diameter and width
- Fit: the clearance around the hub
- Detent: printed bumps with a click you raise if the drums turn too easily, or 22 magnets, with their diameter, thickness and fit
- Inserts: colour tiles or engraved digits, and the tile clearance

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also give you a 3MF with the tiles already set to a second filament.

## Print settings

- Every part lies flat on its outer face, as the STLs load
- No supports
- 0.2mm layers, 0.12mm for sharper digits
- Tiles: one filament for the bases and another for the raised digits

## Assembly

1. Press the tiles into their pockets: 0 to 9 into each drum and the arrows into the pointer.
2. Slide the pointer, then the tens drum, onto the units drum's hub until the barb snaps in.

## Files

- `counter-34mm-units-drum.stl`: the units drum, with the hub standing up from it
- `counter-34mm-tens-drum.stl`: the tens drum
- `counter-34mm-pointer.stl`: the pointer that sits between the drums
- `counter-34mm-inserts.stl`: the tile bases, 0 to 9 for each drum plus the arrow tile
- `counter-34mm-inserts-marks.stl`: the raised digits and arrows, to print on the tile bases in a second colour
- `counter.scad`: the OpenSCAD source for other sizes, engraved digits, single tiles and the magnet version

## Images

In upload order, from `makerworld/images`:

1. `counter-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/counter-photo-cover-4x3.jpg`
3. `photos/counter-photo-2.jpg`
4. `photos/counter-photo-3.jpg`
5. `counter-options.png`
6. `counter-render.png`
