import { describe, expect, it } from 'vitest'
import { labelAngles } from './label'

const degrees = (radians: number) => Math.round(((((radians * 180) / Math.PI) % 360) + 360) % 360)
const ring = (count: number) => Array.from({ length: count }, (_, i) => Math.PI / 2 + (2 * Math.PI * i) / count)

describe('labelAngles', () => {
  it('tries the widest gap first', () => {
    expect(degrees(labelAngles([0, Math.PI / 2], [])[0])).toBe(225)
  })

  it('breaks a tie between equally wide gaps toward -y', () => {
    expect(degrees(labelAngles(ring(3), [])[0])).toBe(270)
  })

  it('ignores floating-point noise when gaps are equally wide', () => {
    const [first, ...rest] = ring(3)
    expect(degrees(labelAngles([first - 1e-13, ...rest], [])[0])).toBe(270)
  })

  it('then breaks a tie toward -x', () => {
    expect(degrees(labelAngles([Math.PI / 2, -Math.PI / 2], [])[0])).toBe(180)
  })

  it('breaks a tie toward -x either side of the -y axis', () => {
    expect(degrees(labelAngles([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2], [])[0])).toBe(225)
  })
})
