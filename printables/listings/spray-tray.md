# Magnetic spray painting tray

- **Category:** Tabletop Miniatures › Miniature Gaming Accessories (or Hobby & Makers › Tools)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** painting handle, spray tray, priming tray, miniature painting, airbrush, magnetised, wargaming, tabletop, parametric, openscad, no supports

## Summary

A magnet tray for priming and airbrushing magnetised miniatures, with a glue-on handle in four grip shapes.

## Description

The tray is a grid of magnet pockets with an extra one in the middle of every four, so bases of different sizes can always find a magnet. The handle is a separate part that glues to the middle of the underside, where there's an engraved + to line it up, so neither part needs supports.

The STLs are a 174×174mm tray with 25 pockets for 5×2mm magnets (a 4×4 grid plus nine in between), and the handle in all four grip shapes at 100mm long: round, oval barrel, flared base and pistol grip. Print the tray and whichever grip suits your hand.

You'll need neodymium magnets (5×2mm, 25 for the tray) and superglue or two-part epoxy for the magnets and the handle.

For other grids or grips, open `spray-tray.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old.

What you can change in the .scad:

- Magnet grid: columns, rows, centre spacing and edge margin
- Tray thickness
- Magnets: size and clearances
- Handle: round, oval barrel, flared base or pistol grip, with length, width, lean, a rounded end and ribs

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also give you a 3MF with the tray and handle on separate plates, ready to slice.

## Print settings

- Tray: flat, pockets facing up
- Handle: upright on its flat end
- No supports for either
- 0.2mm layers
- PLA or PETG

## Assembly

1. Glue a magnet into each pocket, flush with the top.
2. Glue the handle's flat end over the + in the middle of the underside.

## Files

- `spray-tray-4x4-174x174mm.stl`: the tray, 174×174×3mm, 25 magnet pockets
- `spray-tray-handle-round.stl`: round grip, 28mm across, 100mm long
- `spray-tray-handle-oval.stl`: oval barrel grip, 100mm long
- `spray-tray-handle-flared.stl`: grip with a flared base, 100mm long
- `spray-tray-handle-pistol.stl`: pistol grip, 100mm long
- `spray-tray.scad`: the OpenSCAD source for other grids and grips

## Images

In upload order, from `makerworld/images`:

1. `spray-tray-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/spray-tray-photo-cover-4x3.jpg`
3. `photos/spray-tray-photo-1.jpg`
4. `photos/spray-tray-photo-3.jpg`
5. `spray-tray-options.png`
6. `spray-tray-render.png`
