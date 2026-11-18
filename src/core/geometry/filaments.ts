/** Bambu Lab's solid PLA Basic colours, greys first and then round the hues, as a swatch grid reads them; gradients need more than one swatch to preview. */
export const PLA_BASIC_COLOURS = [
  { name: 'Jade White', hex: '#FFFFFF' },
  { name: 'Beige', hex: '#F7E6DE' },
  { name: 'Light Gray', hex: '#D1D3D5' },
  { name: 'Silver', hex: '#A6A9AA' },
  { name: 'Gray', hex: '#8E9089' },
  { name: 'Dark Gray', hex: '#545454' },
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#C12E1F' },
  { name: 'Brown', hex: '#9D432C' },
  { name: 'Orange', hex: '#FF6A13' },
  { name: 'Cocoa Brown', hex: '#6F5034' },
  { name: 'Pumpkin Orange', hex: '#FF9016' },
  { name: 'Gold', hex: '#E4BD68' },
  { name: 'Sunflower Yellow', hex: '#FEC600' },
  { name: 'Bronze', hex: '#847D48' },
  { name: 'Yellow', hex: '#F4EE2A' },
  { name: 'Bright Green', hex: '#BECF00' },
  { name: 'Mistletoe Green', hex: '#3F8E43' },
  { name: 'Bambu Green', hex: '#00AE42' },
  { name: 'Turquoise', hex: '#00B1B7' },
  { name: 'Cyan', hex: '#0086D6' },
  { name: 'Cobalt Blue', hex: '#0056B8' },
  { name: 'Blue Gray', hex: '#5B6579' },
  { name: 'Blue', hex: '#0A2989' },
  { name: 'Purple', hex: '#5E43B7' },
  { name: 'Indigo Purple', hex: '#482960' },
  { name: 'Magenta', hex: '#EC008C' },
  { name: 'Hot Pink', hex: '#F5547C' },
  { name: 'Pink', hex: '#F55A74' },
  { name: 'Maroon Red', hex: '#9D2235' },
] as const

/** The filaments a project prints in, as hex colours. */
export interface FilamentColours {
  body: string
  second: string
  third: string
}

export const DEFAULT_FILAMENTS: FilamentColours = { body: '#D1D3D5', second: '#000000', third: '#C12E1F' }

export const isPlaBasicColour = (hex: string): boolean => PLA_BASIC_COLOURS.some((colour) => colour.hex === hex)
