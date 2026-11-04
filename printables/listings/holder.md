# Gridfinity miniature holder

- **Category:** Tabletop Miniatures › Miniature Gaming Accessories (or Hobby & Makers › Organizers)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** gridfinity, miniature storage, miniature holder, miniature transport, magnetised, wargaming, tabletop, warhammer, 40k, army transport, parametric, openscad

## Summary

A Gridfinity bin with a slot for each miniature, with magnet pockets that line up with your magnetised bases. The STLs cover common round base sizes, and the OpenSCAD file makes any other.

## Description

Each slot has magnet pockets in the same spots as the magnets in the matching base, so a magnetised miniature snaps into its slot and stays there while you move the bin around. The size is engraved in every slot.

The STLs are filled to the size of the bin, at the default spacing, with pockets for 5×2mm magnets:

- 25mm: 12 slots in a 2×3
- 28.5mm: 11 slots in a 2×3
- 32mm: 5 slots in a 1×4, or 10 in a 2×4
- 40mm: 1 slot in a 1×1, 5 in a 1×5, or 10 in a 2×5
- 50mm: 5 slots in a 2×5, three magnets each

You'll need a Gridfinity baseplate. Magnets are optional: use the same ones as your bases (5×2mm), one per slot, or three per slot for the 50mm holder.

For other base sizes or counts, open `holder.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old, and the engraving uses Oswald Bold, so install that from Google Fonts first or the labels fall back to another font. Pick a base size and how many miniatures you want to carry, and the holder packs them into as few Gridfinity units as it can, up to the size you allow. One holder takes one base size. If they don't all fit in the largest size you allow, the extras are left out, so check the count in the preview.

What you can change in the .scad:

- Miniatures: a standard or custom base size, and how many
- Layout: the most Gridfinity columns and rows to use, spacing between slots and from the edge, and the height in 7mm steps
- Slots: depth, clearance, and the size engraved in each slot or once on the holder
- Magnets: on or off, size, count per slot and pocket layout
- Matching bases: the wall settings your bases were printed with, so the pockets line up

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also mix base sizes in one holder or split a big army across several modules.

## Print settings

- Gridfinity feet on the plate, slots facing up
- No supports
- 0.2mm layers
- PLA or PETG

## Files

- `holder-2x3-12x-round-25mm.stl`: 2×3 units, twelve 25mm slots
- `holder-2x3-11x-round-28.5mm.stl`: 2×3 units, eleven 28.5mm slots
- `holder-1x4-5x-round-32mm.stl`: 1×4 units, five 32mm slots
- `holder-2x4-10x-round-32mm.stl`: 2×4 units, ten 32mm slots
- `holder-1x1-1x-round-40mm.stl`: 1×1 unit, one 40mm slot
- `holder-1x5-5x-round-40mm.stl`: 1×5 units, five 40mm slots
- `holder-2x5-10x-round-40mm.stl`: 2×5 units, ten 40mm slots
- `holder-2x5-5x-round-50mm.stl`: 2×5 units, five 50mm slots
- `holder.scad`: the OpenSCAD source for every other size, count and option

## Images

In upload order, from `makerworld/images`:

1. `holder-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/holder-photo-cover-4x3.jpg`
3. `photos/holder-photo-2.jpg`
4. `photos/holder-photo-3.jpg`
5. `holder-options.png`
6. `holder-render.png`
