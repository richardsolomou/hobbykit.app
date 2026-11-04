# Magnetised miniature bases

- **Category:** Tabletop Miniatures › Miniature Gaming Accessories
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** miniature base, magnetised base, magnet base, miniatures, wargaming, tabletop, warhammer, 40k, age of sigmar, old world, kings of war, parametric, openscad, no supports

## Summary

Hollow miniature bases with flush magnet pockets, in the most common round, oval and rectangle sizes. They print upside down with no supports, and the OpenSCAD file makes any other size.

## Description

The underside of each base is hollow, with a pocket for every magnet. The magnets sit flush with the bottom, so the base holds itself down on a steel or magnetised tray. Small ribs run out to each pocket to keep the floor stiff, and the size is embossed inside, so you can still tell a 28.5 from a 32 once they're painted.

The STLs cover the sizes most armies need, all with pockets for 5×2mm magnets:

- Rounds: 25, 28.5, 32 and 40mm take one magnet; 50 and 60mm take three
- Ovals: 60×35.5, 75×42 and 90×52.5mm take two
- Rectangles: 25×25 and 25×50mm take one; 50×100mm takes two

You'll need neodymium disc magnets (5×2mm, one to three per base as above) and a bit of superglue to hold them flush.

For any other size, open `base.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old, and the label uses Oswald Bold, so install that from Google Fonts first or the label falls back to another font. There are 43 standard sizes in the list, covering the common rounds and ovals, The Old World and Kings of War rectangles, and hexes that fit in place of a round. Choose Custom if you need your own shape or size. The magnet count is picked for you from the base size and the magnet you use, but you can set it yourself.

What you can change in the .scad:

- Size: a standard size, or a custom round, oval, pill, rectangle or hex (3 to 12 sides), with corner rounding for rectangles
- Magnets: diameter, thickness, count and pocket layout
- Label: on or off, your own text, and its size
- Body: height, wall, top thickness, and a taper, bevel, round or straight bottom edge
- Internal supports (the ribs): count, thickness and height
- Fit: magnet clearances, the wall around each pocket, and the label depth

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, plus textured tops (paving, plating, rock, rubble, snow) and a batch of sizes in one go.

## Print settings

- Print the STLs as they load: the face your miniature glues to goes on the plate, recess facing up
- No supports
- 0.2mm layers are fine, 0.12mm gives a crisper label
- PLA or PETG

## Files

- `base-round-25mm.stl`: 25mm round, one magnet
- `base-round-28.5mm.stl`: 28.5mm round (the one everyone calls 28mm), one magnet
- `base-round-32mm.stl`: 32mm round, one magnet
- `base-round-40mm.stl`: 40mm round, one magnet
- `base-round-50mm.stl`: 50mm round, three magnets
- `base-round-60mm.stl`: 60mm round, three magnets
- `base-oval-60x35.5mm.stl`: 60×35.5mm oval, two magnets
- `base-oval-75x42mm.stl`: 75×42mm oval, two magnets
- `base-oval-90x52.5mm.stl`: 90×52.5mm oval, two magnets
- `base-rect-25x25mm.stl`: 25×25mm square, one magnet
- `base-rect-25x50mm.stl`: 25×50mm rectangle, one magnet
- `base-rect-50x100mm.stl`: 50×100mm rectangle, two magnets
- `base.scad`: the OpenSCAD source for every other size and option

## Images

In upload order, from `makerworld/images`:

1. `base-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/base-photo-cover-4x3.jpg`
3. `photos/base-photo-2.jpg`
4. `photos/base-photo-3.jpg`
5. `photos/base-photo-4.jpg`
6. `base-options.png`
7. `base-render.png`
