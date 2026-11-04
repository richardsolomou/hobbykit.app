# Tabletop gaming tokens

- **Category:** Tabletop Miniatures › Miniature Gaming Accessories (or Toys & Games › Board Games)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)
- **Tags:** tokens, objective marker, objective token, wargaming, tabletop, board game, two colour, multicolor, warhammer, kill team, parametric, openscad

## Summary

Round, square or hex tokens with your own text, raised for a second colour or engraved so they stack. The STLs are a blank 40mm token and two two-colour examples.

## Description

The STLs are a 40mm round token, 3mm thick with a bevelled top edge, and raised text for two of them: "Objective" and "Battle shocked". The text is a separate part that starts on its own layer, so a single-nozzle printer only needs one filament change. Print the token on its own for a blank, or load it with one of the text files for a two-colour token.

To print one in two colours, select `token-round-40mm.stl` and a text file together and load them as one object with multiple parts. Most slicers offer that when you load several files at once; if yours doesn't, right-click the token and add the text file as a part. The text lands on top of the token. Then give the text part your second filament.

For your own text, open `token.scad` in OpenSCAD and use the Customizer panel (Window › Customizer). It needs a recent development snapshot of OpenSCAD (2024 or later), because the 2021.01 release is too old. Type your text and it's fitted to the face. Longer text wraps onto up to three lines and shrinks to fit, but never below a 1.5mm cap height, so it stays printable. Engraved text is cut into the body instead, so the tokens stack flat.

What you can change in the .scad:

- Text and its size
- Relief: raised, engraved or none, and how deep
- Shape: round, square or hex, measured across the flats, with corner rounding for squares
- Thickness, and a taper, bevel, round or straight top edge
- Export: body and text together, or each on its own

This is part of HobbyKit, a free generator I made. hobbykit.app does all of this in a browser, and can also put your own image on the face.

## Print settings

- Face up, as the STLs load
- No supports
- 0.2mm layers, 0.12mm for small text
- For two colours, give the text part a second filament in the slicer

## Files

- `token-round-40mm.stl`: the 40mm round token body, which is also the blank token
- `token-round-40mm-objective-text.stl`: raised "Objective" text, to print on the body in a second colour
- `token-round-40mm-battle-shocked-text.stl`: raised "Battle shocked" text, to print on the body in a second colour
- `token.scad`: the OpenSCAD source for your own text, shapes and sizes

## Images

In upload order, from `makerworld/images`:

1. `token-cover-4x3.png` (cover, matching MakerWorld)
2. `photos/token-photo-cover-4x3.jpg`
3. `photos/token-photo-2.jpg`
4. `photos/token-photo-3.jpg`
5. `token-options.png`
6. `token-render.png`
