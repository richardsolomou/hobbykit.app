import { readFileSync } from 'node:fs'
import { parse } from 'opentype.js'
import { describe, expect, it } from 'vitest'
import { makerworldBaseSource } from './makerworld'

const SCAD = 'makerworld/base.scad'
const bytes = readFileSync('src/assets/fonts/oswald-700.woff')
const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

describe('makerworld/base.scad', () => {
  it('carries the current standard sizes and label glyph metrics; run `just makerworld` if not', () => {
    const source = readFileSync(SCAD, 'utf8')
    expect(makerworldBaseSource(font, source)).toBe(source)
  })

  it('refuses a script that has lost its generated block', () => {
    expect(() => makerworldBaseSource(font, 'standard_size = "round-32";\n')).toThrow(/generated markers/)
  })
})
