# MakerWorld listings

Copy for each MakerWorld listing, ready to paste, one file per `makerworld/<name>.scad`. Every listing:

- turns on Customize with its script;
- is licensed CC BY-SA 4.0;
- never names Warhammer, in the description or the tags: MakerWorld refuses the word;
- stands on its own, and ends its description with one line pointing to hobbykit.app for what the Customizer cannot do. Write the address as plain text rather than a link: MakerWorld's guidelines forbid redirecting users off-platform, so the line must read as an extra, never as the real version being elsewhere, and never calls the site "the full version";
- uploads at least three photos of a real print, from different views, as "Real life photos": MakerWorld will not reach the print profile step with fewer. The covers are the generated 4:3 and 3:4 covers from `just makerworld-images <name>`, and the options grid and plain render go under Model Pictures. MakerWorld recommends a real photo as the cover for exposure, but does not require one. Each listing's Real photos section names the photos taken so far by their camera file names; cropped 4:3 and 3:4 photo covers go in the git-ignored `makerworld/images/photos`.

Each listing is published with its `.scad` under Raw Model Files and, for the extra points, a Bambu Studio print profile of its default model. The token's profile is the Battle shocked token in its photos instead, because a profile's photos must show a print of that profile. Bambu Studio's command line slices them, but it crashes on the app's own multi-plate 3MFs, so the spray tray, token and counter are rebuilt from their STLs: the token through `--assemble` with `--load-filament-ids`, and the counter through `--load-assemble-list`.

Titles must match `LISTINGS` in `scripts/makerworldImages.ts`, which prints them on the covers.
