# Dial counters

- **Category:** Toys & Games › Board Games (or Tabletop Miniatures › Miniature Gaming Accessories)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** dial counter, wound counter, wound caddy, battle tracker, life counter, score counter, counter, wargaming, tabletop, board game, mtg, warhammer, parametric, openscad, no supports

## Summary

Slim dial counters that click from 00 to 99, with no hardware. Two ribbed dials turn on a fluted tube, about 44mm wide.

## Description

Two ten-sided wheels turn on a fluted tube pressed between two side pieces. Two spring arms cut into each wheel click it into place at every count and centre it so it does not rock, with no glue or hardware. An optional shield shows only the current count. It stands on its own foot.

The digits are press-in tiles in a second colour. They print on their own plate, so the whole set costs one filament change instead of dozens. The STLs are the default caddy, with 39.6mm wheels: the two wheels, the frame, the cap, and the tiles as two files, one for the tile bases and one for the raised digits that go on them.

To print the tiles in two colours, select both tile files and load them as one object with multiple parts. Most slicers offer that when you load several files at once; if yours doesn't, right-click the tiles and add the digits file as a part. Then give the digits part your second filament.

For other sizes, or engraved digits you can paint instead of tiles, open `counter.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old.

What you can change in the .scad:

- Part: everything on one plate, or each wheel, each side, the tube or the tiles on their own
- Tiles: every tile, or one digit on its own, to reprint one that failed
- Wheel diameter
- Fit: the clearance around the tube
- Click: raise it if the wheels turn too easily
- Digits: press-in tiles, printed into the dial or engraved, and the tile clearance

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also give you a 3MF with the tiles already set to a second filament.

## Print settings

- Each side lies flat, each wheel stands on its outer face and the tube stands on one end, as the STLs load
- No supports
- 0.2mm layers, 0.12mm for sharper digits
- Tiles: one filament for the bases and another for the raised digits

## Assembly

1. Press the tiles into their pockets: 0 to 9 round each wheel.
2. Press the tube into one side and push the tens wheel on.
3. Push the units wheel on, then press the other side on to the tube.

## Files

- `counter-39.6mm-units-wheel.stl`: the units wheel
- `counter-39.6mm-tens-wheel.stl`: the tens wheel
- `counter-39.6mm-axle.stl`: the fluted tube the wheels turn on
- `counter-39.6mm-left-side.stl`: one side piece
- `counter-39.6mm-right-side.stl`: the other side piece
- `counter-39.6mm-left-side-marks.stl`, `counter-39.6mm-right-side-marks.stl`: the top-row brackets, in a second colour
- `counter-39.6mm-inserts.stl`: the tile bases, 0 to 9 for each wheel
- `counter-39.6mm-inserts-marks.stl`: the raised digits, to print on the tile bases in a second colour
- `counter.scad`: the OpenSCAD source for other sizes, engraved digits and single tiles

## Images

In upload order, from `makerworld/images`:

1. `counter-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/counter-photo-cover-4x3.jpg`
3. `photos/counter-photo-2.jpg`
4. `photos/counter-photo-3.jpg`
5. `counter-options.png`
6. `counter-render.png`
