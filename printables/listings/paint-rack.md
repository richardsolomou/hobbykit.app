# Modular paint rack

- **Category:** Hobby & Makers › Organizers (or Tabletop Miniatures › Miniature Gaming Accessories)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** paint rack, paint storage, paint organizer, citadel, vallejo, army painter, dropper bottle, miniature painting, modular, parametric, openscad

## Summary

A stepped rack for Citadel pots and dropper bottles like Vallejo and Army Painter, in modules that sit side by side as your collection grows.

## Description

Every cell takes a pot or a dropper. Pots sit in a shallow pocket on top of the deck, and droppers go through a bore in the deck onto a ledge. Each row stands higher than the one in front, so you can read every label. Underneath it's all thin-walled hex cells, which keeps the print time down.

The STLs are a 5×4 module of 20 cells and the two ends that go with it. A left end adds four cells and a right end adds two, and each steps its side back to match the rows, so the three together hold 26 bottles. Every module shares the same hex pattern, so a second 5×4 fits right up against the first.

The default pocket is 33.3mm, which holds Citadel pots snugly with a little play. If your pots or bottles are a different brand, print a single cell from the .scad first and adjust.

For other sizes, open `paint-rack.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old.

What you can change in the .scad:

- Pieces: the module, a left end, a right end, or all of them on one plate
- Size: columns, rows and cell size
- Steps: front deck height and the rise for each row
- Pot pockets: depth and diameter, or a depth of 0 for flat decks that print faster
- Dropper seats: bore diameter and depth, and a push-out hole for a stuck bottle
- Wall thickness

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also chain modules into a longer run, turn corners and add brush holders.

## Print settings

- Upright, as the STLs load
- Supports off. The decks bridge between the walls, and auto supports would fill every cell.
- 0.2mm layers. The 5×4 module takes about 5 hours on a Bambu Lab X2D at 0.20mm Standard.
- PLA

## Files

- `paint-rack-5x4.stl`: the 5×4 module, 20 cells, about 193×132×100mm
- `paint-rack-left-end-4-rows.stl`: the left end for a 4-row rack, 4 cells
- `paint-rack-right-end-4-rows.stl`: the right end for a 4-row rack, 2 cells
- `paint-rack.scad`: the OpenSCAD source for other sizes and options

## Images

In upload order, from `makerworld/images`:

1. `paint-rack-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/paint-rack-photo-cover-4x3.jpg`
3. `photos/paint-rack-photo-2.jpg`
4. `photos/paint-rack-photo-3.jpg`
5. `paint-rack-options.png`
6. `paint-rack-render.png`
