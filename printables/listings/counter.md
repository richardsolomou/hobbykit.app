# Dial counters

- **Category:** Toys & Games › Board Games (or Tabletop Miniatures › Miniature Gaming Accessories)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** dial counter, life counter, wound counter, score counter, battle tracker, counter, mtg, commander, wargaming, warhammer, tabletop, board game, parametric, openscad, no supports

## Summary

Dial counters that click from number to number with no hardware: 00 to 99 on two dials, or 1 to 16 on one.

## Description

An axle presses into a plate at each end, and the dials turn on it between them. A spring arm inside each dial clicks it into place at every number, so it stays where you leave it. The count is the top row, between the marks on the two plates.

There are two ready-made counters here: 00 to 99 on two dials, and 1 to 16 on one. The digits and the top-row marks are inlaid in a second colour, as separate files. To print them in two colours, load each part with its colour file as one object with multiple parts, which most slicers offer when you load several files at once, and give the colour part your second filament.

For anything else, open `counter.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old.

What you can change in the .scad:

- Dials: one to four
- Numbers on each dial, from 6 to 20, and the number they start from
- Count down, so rolling a dial forwards takes one off
- Size, which scales the whole counter while the fits stay the same
- Digits: inlaid, engraved for paint, or raised, and how deep
- The mark over the top row: a bar, a pointer or none
- Text on each plate's outer face
- Fit: the axle's press fit, the dials' play, how firmly they click, and a lead-in that starts the press fit
- Export: everything, or one part, its body or its second colour

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also put an image on the plates, print them in a third colour, and give you a 3MF with the colours already set.

## Print settings

- The axle stands on one end, the plates lie flat and each dial stands with its rib up, as the STLs load
- No supports
- 0.2mm layers
- For two colours, give each colour file a second filament

## Assembly

1. Press the axle into one plate.
2. Slide the dials on, with the rib on each outer dial facing out.
3. Press the other plate on to the axle.

## Files

00 to 99 on two dials:

- `counter-34.95mm-axle.stl`: the axle the dials turn on
- `counter-34.95mm-left-plate.stl`, `counter-34.95mm-right-plate.stl`: the plates at each end
- `counter-34.95mm-left-plate-colour.stl`, `counter-34.95mm-right-plate-colour.stl`: each plate's top-row mark, in a second colour
- `counter-34.95mm-dial-1.stl`, `counter-34.95mm-dial-2.stl`: the tens and units dials
- `counter-34.95mm-dial-1-colour.stl`, `counter-34.95mm-dial-2-colour.stl`: their digits, in a second colour

1 to 16 on one dial:

- `counter-1-16-34.95mm-axle.stl`: the axle
- `counter-1-16-34.95mm-left-plate.stl`, `counter-1-16-34.95mm-right-plate.stl`: the plates
- `counter-1-16-34.95mm-left-plate-colour.stl`, `counter-1-16-34.95mm-right-plate-colour.stl`: their marks, in a second colour
- `counter-1-16-34.95mm-dial.stl`: the dial
- `counter-1-16-34.95mm-dial-colour.stl`: its numbers, in a second colour

- `counter.scad`: the OpenSCAD source for other counts, sizes, digits and plate text

## Images

In upload order, from `makerworld/images`:

1. `counter-cover-4x3.png` (cover, matching MakerWorld)
2. Real photos, once taken
3. `counter-options.png`
4. `counter-render.png`
