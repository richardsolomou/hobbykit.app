/** One page per generator. The build prerenders each into its own HTML file, so crawlers that run no JavaScript still read what it makes. */
export const PAGES = [
  {
    value: 'base' as const,
    name: 'Base',
    part: 'base' as const,
    label: 'Bases',
    mobileLabel: 'Bases',
    href: '/',
    makerworld: 'https://makerworld.com/en/models/3545631-magnetised-miniature-bases',
    title: 'Magnetised miniature base generator',
    description:
      'Generate support-free, magnetised miniature bases in any round, oval, pill, rectangle or polygon size from 15 to 180mm, with the exact size embossed inside. Export STL or 3MF.',
  },
  {
    value: 'holder' as const,
    name: 'Holder',
    part: 'holder' as const,
    label: 'Holders',
    mobileLabel: 'Holders',
    href: '/holders',
    makerworld: 'https://makerworld.com/en/models/3545623-gridfinity-miniature-holder',
    title: 'Gridfinity miniature holder generator',
    description:
      'Pack miniatures into printable Gridfinity holder modules with slots sized to their bases, engraved sizes and matching magnet pockets. Export STL or 3MF.',
  },
  {
    value: 'painting' as const,
    name: 'Spray tray',
    part: 'paintingTray' as const,
    label: 'Spray tray',
    mobileLabel: 'Spray',
    href: '/spray-tray',
    makerworld: 'https://makerworld.com/en/models/3545630-magnetic-spray-painting-tray',
    title: 'Magnetic spray painting tray generator',
    description:
      'Build a low-profile magnetic tray for priming and spray painting miniatures, with an interleaved pocket grid and a support-free glue-on grip. Export STL or 3MF.',
  },
  {
    value: 'rack' as const,
    name: 'Paint rack',
    part: 'paintRack' as const,
    label: 'Paint racks',
    mobileLabel: 'Paints',
    href: '/paint-racks',
    makerworld: 'https://makerworld.com/en/models/3545632-modular-paint-rack',
    title: 'Modular paint rack generator',
    description:
      'Design stepped honeycomb paint racks for Citadel pots and Vallejo, AK or Army Painter dropper bottles, with corners, ends and brush holes. Export STL or 3MF.',
  },
  {
    value: 'stem' as const,
    name: 'Stem',
    part: 'stem' as const,
    label: 'Stems',
    mobileLabel: 'Stems',
    href: '/stems',
    makerworld: 'https://makerworld.com/en/models/3545624-flying-stems',
    title: 'Flying stem generator',
    description:
      'Print 15, 20, 30 and 35mm flying stems for miniature bases with adjustable peg or ball-joint connections. Export STL or 3MF.',
  },
  {
    value: 'token' as const,
    name: 'Token',
    part: 'token' as const,
    label: 'Tokens',
    mobileLabel: 'Tokens',
    href: '/tokens',
    makerworld: 'https://makerworld.com/en/models/3545628-tabletop-gaming-tokens',
    title: 'Tabletop gaming token generator',
    description:
      'Make round, square or hex tokens for objectives and game effects, with wrapped text or a traced image, raised or engraved. Export STL or 3MF.',
  },
  {
    value: 'counter' as const,
    name: 'Dial counter',
    part: 'counter' as const,
    label: 'Counters',
    mobileLabel: 'Counters',
    href: '/counters',
    makerworld: 'https://makerworld.com/en/models/3545629-dial-counters',
    title: 'Dial counter generator',
    description:
      'Print a 00–99 dial counter, or life counter, for life totals, wounds, victory points or command points, with dials that click into place and digits in a second colour. Export STL or 3MF.',
  },
]

export type Page = (typeof PAGES)[number]

/** The page's name in its file paths; the base generator lives at `/` but its files need a name. */
export const slug = (page: Page) => (page.href === '/' ? 'bases' : page.href.slice(1))

export const GUIDES_PATH = '/guides'

/** Where the generator's guide is served as a page of its own, readable without the app. */
export const guidePath = (page: Page) => `${GUIDES_PATH}/${slug(page)}`

/** The generator a path opens, the bases at `/` and for any path that is not a generator's. */
export const generatorForPath = (path: string): Page['value'] => PAGES.find((page) => page.href === path)?.value ?? 'base'
