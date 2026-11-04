# hobbykit

## 0.23.1

### Patch Changes

- b912312: Every generator's panel now links its MakerWorld listing, where the Customize button runs a smaller version of it.

## 0.23.0

### Minor Changes

- c5df845: Dial counters can hold each count with magnets instead of printed bumps: ten in each drum and one in each face of the pointer, sized by the shared magnet settings.
- 1cd8809: Every dial counter tile is now its own object in the 3MF, named by its drum and digit, so a few failed tiles can be reprinted by deleting the rest from the plate.

## 0.22.1

### Patch Changes

- a7573fd: Holder slots now stop at least 0.05mm inside the wall, so a zero edge spacing no longer leaves open edges a slicer has to repair.
- ef657a4: Holder exports now hold every slot the preview shows. Some round and hex holders packed more slots than the app's own capacity estimate, and the downloaded module came out with fewer.

## 0.22.0

### Minor Changes

- af6c8e8: Remove the movement tray generator, so the Movement trays page is gone. Old movement tray links and bookmarks open on bases, and saved settings for every other generator carry over.

## 0.21.1

### Patch Changes

- 6deb542: Drop the dial counter title block's Digits row, which repeated the Press-in tiles toggle, and refresh the counter and spray tray link previews.

## 0.21.0

### Minor Changes

- 8ff8199: Match standard base sizes to Games Workshop's current Warhammer 40,000 and Age of Sigmar guides, The Old World, and Kings of War, and name units that use each one. Ovals now measure 60×35.5 and 90×52.5, Knights get 170×109, and 120mm, 150×95, 30×30, 30×60, 40×60, 50×75, 75×75, 100×150 and a 50×25 pill join the list; 65mm and 20×40, which no current game uses, are gone.

### Patch Changes

- 4690177: Place a base or holder label in the same gap every time when several gaps are equally wide, preferring below the centre.

## 0.20.1

### Patch Changes

- 2312273: Frame exploded previews so the spread parts stay in view, and name the dial counter's tile toggle "Press-in tiles".

## 0.20.0

### Minor Changes

- b6cc530: Add a dial counter generator: two ten-sided drums count 00–99 by rolling from flat to flat, a pointer between them marks the count, printed bumps click each count into place, the digits and arrows print raised on press-in tiles that change colour once, and the parts snap together on a barbed hub without supports.
- a47fc8e: Explode the spray tray and dial counter previews to see how their separately printed parts fit together.
- a47fc8e: Print raised token artwork in a second colour: the 3MF puts the artwork on its own filament, changing once above the body.

## 0.19.0

### Minor Changes

- 7e1f545: Give every generator its own crawlable page with a title, description, canonical link, structured data, a link preview image of its own, and a Markdown guide, and publish `robots.txt`, `sitemap.xml`, and `llms.txt`. Unknown addresses now return a 404, and every response carries basic security headers.

## 0.18.1

### Patch Changes

- baa3640: Replace the sprue icon with a red miniature base and its magnet.

## 0.18.0

### Minor Changes

- 0d57a14: Rename BaseKit to HobbyKit, now at hobbykit.app, since it makes paint racks, trays, holders, and tokens as well as bases.
- 9cf0c04: Restyle the app on a graphite sheet with a red accent, and shorten the paint rack panel's notes.

## 0.17.0

### Minor Changes

- b8c345c: Add stepped paint racks that hold Citadel pots and Vallejo, AK and Army Painter droppers, laid out as interlocking modules, corners and stepped ends that download as separate pieces and print hollow, with no infill or supports.

## 0.16.1

### Patch Changes

- 1b9f577: Keep saved five-pocket magnet layouts in a cross on elongated bases and matching holders.

## 0.16.0

### Minor Changes

- 54e22be: Allow negative token relief to engrave text and images for flat stacking.

## 0.15.0

### Minor Changes

- b8b28be: Remove the base adapter generator. Rebasing a miniature is simpler with a new base of the right size, so the Adapters page is gone. Old adapter links and bookmarks open on bases, and saved settings for every other generator carry over.

## 0.14.1

### Patch Changes

- 0f2dc36: Keep every dimension field on values its input accepts, so defaults such as the movement tray rim and spray tray spacing no longer read as invalid and arrow keys step to round figures.

## 0.14.0

### Minor Changes

- 31f5ddf: Add a Copy link button that shares the current generator's settings in the address, with no server involved.

## 0.13.0

### Minor Changes

- 6da438d: Add base adapters that seat an old base in a recess inside a new footprint, with optional magnet pockets in the underside.

## 0.12.0

### Minor Changes

- c8e031c: Add rank-and-file movement trays with base slots and magnet pockets that match magnetised bases.

## 0.11.0

### Minor Changes

- abe2ec8: Add square and hex tokens, sized across their flats, with text and images fitted to each shape's face.

## 0.10.0

### Minor Changes

- 9d18a64: Export several base sizes at once, with quantities, as an STL archive or a multi-plate 3MF.

## 0.9.0

### Minor Changes

- 0dfe417: Add a confirmed reset for each generator's settings and for the shared magnet settings, so a bad saved configuration no longer sticks.

## 0.8.0

### Minor Changes

- a4c23b0: Show an approximate solid-PLA filament weight for every generator in the title block, totalled across holder modules and the spray tray with its handle.

## 0.7.0

### Minor Changes

- a1b0474: Emboss custom base label text, such as a unit name or squad number, and report text that does not fit instead of dropping it.

## 0.6.0

### Minor Changes

- f668c4a: Show how many more of each holder miniature size fit in the modules already planned.

## 0.5.1

### Patch Changes

- eb8330e: Fill raised text solidly where neighbouring glyphs overlap, such as accented letters, instead of leaving gaps in tokens, base labels and holder engravings.
- bfc0b01: Stop the 3D viewer redrawing while nothing changes, and keep a drag's momentum from carrying into the next generator's view.

## 0.5.0

### Minor Changes

- 730f0f5: Add round gaming tokens with wrapped text and uploaded images traced into raised, support-free silhouettes.

## 0.4.0

### Minor Changes

- ccc6720: Add low-profile magnetic spray trays with interleaved pocket grids, configurable glue-on handles, and engraved centre marks for batch priming mixed miniature sizes.

## 0.3.0

### Minor Changes

- 8ab0a9c: Add printable, configurable flying stems with flat feet and peg or ball-joint miniature connections.

## 0.2.0

### Minor Changes

- 7370713: Add configurable holder-edge spacing with a default of half the miniature spacing.

## 0.1.4

### Patch Changes

- 8227229: Keep the 3D viewer responsive without browser resize warnings.

## 0.1.3

### Patch Changes

- 1dc6d85: Increase the default top thickness of bases 65mm and larger to 1.5mm, and add magnet depth clearance for a more reliable fit.

## 0.1.2

### Patch Changes

- 3312116: Use shared PostHog defaults for analytics, replay, feature flags, and error tracking.

## 0.1.1

### Patch Changes

- f153047: Adopt automated versioned releases for BaseKit.
