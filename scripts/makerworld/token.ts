import { exportSegmentsFor } from '../../src/core/geometry/quality'
import { buildToken, defaultTokenConfig, tokenFootprint } from '../../src/core/geometry/token'
import type { TokenConfig } from '../../src/core/geometry/types'
import { type Case, font } from './shared'

/** The body and, for raised text, the text insert, each compared on its own as the script exports them. */
const custom = (name: string, changes: Partial<TokenConfig>, defines: Case['defines']): Case[] => {
  const config = { ...defaultTokenConfig(), ...changes }
  const build = (wasm: Parameters<Case['build']>[0]) =>
    buildToken(wasm, { ...config, segments: exportSegmentsFor(tokenFootprint(config).width) }, font)
  const body: Case = { name: `${name}-body`, build: (wasm) => build(wasm).mesh, defines: { ...defines, part: 'body' } }
  if (!(config.emboss > 0 && config.text.trim())) return [body]
  const text: Case = {
    name: `${name}-text`,
    build: (wasm) => {
      const { inserts } = build(wasm)
      if (!inserts) throw new Error(`${name} has no raised text`)
      return inserts
    },
    defines: { ...defines, part: 'text' },
  }
  return [body, text]
}

export const cases: Case[] = [
  ...custom('default', {}, {}),
  ...custom('square', { shape: 'square' }, { shape: 'square' }),
  ...custom('square-sharp', { shape: 'square', cornerRadius: 0 }, { shape: 'square', corner_radius: 0 }),
  ...custom('hex', { shape: 'hex', size: 25.4 }, { shape: 'hex', size: 25.4 }),
  ...custom('engraved', { emboss: -1.5 }, { relief: 'engraved', relief_depth: 1.5 }),
  ...custom('none', { emboss: 0 }, { relief: 'none' }),
  ...custom('blank', { text: '' }, { token_text: '' }),
  ...custom('taper', { profile: 'taper', profileSize: 1 }, { top_edge: 'taper', edge_size: 1 }),
  ...custom('round-edge', { profile: 'round', profileSize: 1.2 }, { top_edge: 'round', edge_size: 1.2 }),
  ...custom('straight', { profile: 'straight' }, { top_edge: 'straight' }),
  ...custom('short', { text: '7', size: 25 }, { token_text: '7', size: 25 }),
  ...custom('two-lines', { text: 'Oath of Moment' }, { token_text: 'Oath of Moment' }),
  ...custom(
    'three-lines',
    { shape: 'hex', size: 50, text: 'Secure the objective marker', emboss: -0.8, profile: 'round', profileSize: 1 },
    {
      shape: 'hex',
      size: 50,
      token_text: 'Secure the objective marker',
      relief: 'engraved',
      relief_depth: 0.8,
      top_edge: 'round',
      edge_size: 1,
    },
  ),
  ...custom(
    'long-square',
    { shape: 'square', size: 60, text: 'Sacred Ground Of The Ancients' },
    { shape: 'square', size: 60, token_text: 'Sacred Ground Of The Ancients' },
  ),
  ...custom(
    'many-words',
    { size: 120, text: 'a b c d e f g h i j k l m n o p q r s t', emboss: -1 },
    { size: 120, token_text: 'a b c d e f g h i j k l m n o p q r s t', relief: 'engraved' },
  ),
  ...custom('accents', { text: 'Équipe Ünd Çørë', textHeight: 8 }, { token_text: 'Équipe Ünd Çørë', text_height: 8 }),
  ...custom('overlaps', { text: 'ÏÏ Ø Ç fï gj', textHeight: 10 }, { token_text: 'ÏÏ Ø Ç fï gj', text_height: 10 }),
  ...custom(
    'small',
    { size: 15, text: 'A', thickness: 1.5, emboss: 0.4 },
    { size: 15, token_text: 'A', thickness: 1.5, relief_depth: 0.4 },
  ),
  ...custom(
    'large',
    { size: 120, thickness: 6, text: 'Primary Objective', emboss: 2 },
    { size: 120, thickness: 6, token_text: 'Primary Objective', relief_depth: 2 },
  ),
]
