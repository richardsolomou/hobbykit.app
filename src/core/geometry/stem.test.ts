import { beforeAll, describe, expect, it } from 'vitest'
import { bounds, openEdges } from './geometry.test.utils'
import { loadManifold } from './manifold'
import { buildFlightStem, CLASSIC_STEM_HEIGHTS, defaultFlightStemConfig, stemMaximumDiameter, stemName, stemOverallHeight } from './stem'

let wasm: Awaited<ReturnType<typeof loadManifold>>

beforeAll(async () => {
  wasm = await loadManifold()
})

describe('buildFlightStem', () => {
  it('uses the classic clear-stem dimensions by default', () => {
    expect(defaultFlightStemConfig()).toMatchObject({
      bodyHeight: 15,
      bodyDiameter: 4.8,
      connection: 'peg',
      modelPegDiameter: 1.8,
      modelPegLength: 4,
      ballDiameter: 4,
    })
  })

  it('builds the requested diameter and overall height on the print axis', () => {
    const config = defaultFlightStemConfig()
    const result = buildFlightStem(wasm, config)
    const measured = bounds(result.mesh)

    expect(openEdges(result.mesh)).toBe(0)
    expect(measured.min[2]).toBeCloseTo(0, 5)
    expect(measured.size[0]).toBeCloseTo(config.bodyDiameter, 2)
    expect(measured.size[1]).toBeCloseTo(config.bodyDiameter, 2)
    expect(measured.size[2]).toBeCloseTo(stemOverallHeight(config), 5)
  })

  it.each(CLASSIC_STEM_HEIGHTS)('builds a %d mm classic stem', (bodyHeight) => {
    const config = { ...defaultFlightStemConfig(), bodyHeight }
    expect(openEdges(buildFlightStem(wasm, config).mesh)).toBe(0)
    expect(stemName(config)).toBe(`flying-stem-${bodyHeight}mm`)
  })

  it('builds a ball-joint connection as one printable solid', () => {
    const config = { ...defaultFlightStemConfig(), connection: 'ball' as const, ballDiameter: 6 }
    const result = buildFlightStem(wasm, config)
    const measured = bounds(result.mesh)

    expect(openEdges(result.mesh)).toBe(0)
    expect(measured.size[0]).toBeCloseTo(stemMaximumDiameter(config), 2)
    expect(measured.size[2]).toBeCloseTo(stemOverallHeight(config), 5)
    expect(stemName(config)).toBe('flying-stem-15mm-ball')
  })

  it('has no coincident vertices after positional welding', () => {
    const { mesh } = buildFlightStem(wasm, defaultFlightStemConfig())
    const positions = new Set<string>()
    for (let i = 0; i < mesh.vertProperties.length; i += mesh.numProp) {
      const position = `${mesh.vertProperties[i]},${mesh.vertProperties[i + 1]},${mesh.vertProperties[i + 2]}`
      expect(positions.has(position)).toBe(false)
      positions.add(position)
    }
  })

  it('rejects a body narrower than the model connection', () => {
    expect(() => buildFlightStem(wasm, { ...defaultFlightStemConfig(), bodyDiameter: 1.5 })).toThrow(/at least as wide/)
  })
})
