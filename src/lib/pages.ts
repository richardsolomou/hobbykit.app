/** One page per generator. The build prerenders each into its own HTML file, so crawlers that run no JavaScript still read what it makes. */
export const PAGES = [
  {
    value: 'base' as const,
    part: 'base' as const,
    label: 'Bases',
    mobileLabel: 'Bases',
    href: '/',
    title: 'Magnetised miniature base generator',
    description:
      'Generate support-free, magnetised miniature bases in any round, oval, pill, rectangle or polygon size from 15 to 180mm, with the exact size embossed inside. Export STL or 3MF.',
  },
  {
    value: 'holder' as const,
    part: 'holder' as const,
    label: 'Holders',
    mobileLabel: 'Holders',
    href: '/holders',
    title: 'Gridfinity miniature holder generator',
    description:
      'Pack miniatures into printable Gridfinity holder modules with slots sized to their bases, engraved sizes and matching magnet pockets. Export STL or 3MF.',
  },
  {
    value: 'painting' as const,
    part: 'paintingTray' as const,
    label: 'Spray tray',
    mobileLabel: 'Spray',
    href: '/spray-tray',
    title: 'Magnetic spray painting tray generator',
    description:
      'Build a low-profile magnetic tray for priming and spray painting miniatures, with an interleaved pocket grid and a support-free glue-on grip. Export STL or 3MF.',
  },
  {
    value: 'rack' as const,
    part: 'paintRack' as const,
    label: 'Paint racks',
    mobileLabel: 'Paints',
    href: '/paint-racks',
    title: 'Modular paint rack generator',
    description:
      'Design stepped honeycomb paint racks for Citadel pots and Vallejo, AK or Army Painter dropper bottles, with corners, ends and brush holes. Export STL or 3MF.',
  },
  {
    value: 'stem' as const,
    part: 'stem' as const,
    label: 'Stems',
    mobileLabel: 'Stems',
    href: '/stems',
    title: 'Flying stem generator',
    description:
      'Print 15, 20, 30 and 35mm flying stems for miniature bases with adjustable peg or ball-joint connections. Export STL or 3MF.',
  },
  {
    value: 'token' as const,
    part: 'token' as const,
    label: 'Tokens',
    mobileLabel: 'Tokens',
    href: '/tokens',
    title: 'Tabletop gaming token generator',
    description:
      'Make round, square or hex tokens for objectives and game effects, with wrapped text or a traced image, raised or engraved. Export STL or 3MF.',
  },
  {
    value: 'counter' as const,
    part: 'counter' as const,
    label: 'Counters',
    mobileLabel: 'Counters',
    href: '/counters',
    title: 'Dial counter generator',
    description:
      'Print a 00–99 dial counter for wounds, victory points or command points, with ten-sided drums that click into place, a pointer marking the count and raised digits in a second colour. Export STL or 3MF.',
  },
]

export type Page = (typeof PAGES)[number]
