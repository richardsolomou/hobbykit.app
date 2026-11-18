import { readFileSync } from 'node:fs'
import type { Mesh } from 'manifold-3d'
import { parse } from 'opentype.js'

const bytes = readFileSync('src/assets/fonts/oswald-700.woff')
export const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

/** Every vertex position, as [x, y, z]. */
export function vertices(mesh: Mesh) {
  return Array.from({ length: mesh.vertProperties.length / mesh.numProp }, (_value, index) =>
    [0, 1, 2].map((axis) => mesh.vertProperties[index * mesh.numProp + axis]),
  )
}

export function bounds(mesh: Mesh) {
  const { numProp, vertProperties: v } = mesh
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < v.length; i += numProp) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], v[i + axis])
      max[axis] = Math.max(max[axis], v[i + axis])
    }
  }
  return { min, max, size: max.map((value, axis) => value - min[axis]) }
}

/** Vertices whose position another vertex already holds, which slicers weld into one. */
export function duplicateVertices(mesh: Mesh) {
  const keys = vertices(mesh).map((vertex) => vertex.join(','))
  return keys.length - new Set(keys).size
}

/** Edges not shared by exactly two triangles once vertices are welded by position, as a slicer loads them. */
export function openEdges(mesh: Mesh) {
  const ids = new Map<string, number>()
  const id = (vertex: number) => {
    const key = [0, 1, 2].map((axis) => mesh.vertProperties[vertex * mesh.numProp + axis]).join()
    if (!ids.has(key)) ids.set(key, ids.size)
    return ids.get(key)!
  }
  const edges = new Map<string, number>()
  for (let t = 0; t < mesh.triVerts.length; t += 3) {
    const corners = [0, 1, 2].map((i) => id(mesh.triVerts[t + i]))
    for (let i = 0; i < 3; i++) {
      const edge = [corners[i], corners[(i + 1) % 3]].sort((a, b) => a - b).join()
      edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
  }
  return [...edges.values()].filter((count) => count !== 2).length
}

/**
 * Every downward face flatter than 45° above the build plate, sorted, as a flat at its height or a
 * slope. Float32 vertices tip a 45° face by up to about a tenth of a degree, so the check allows
 * that and ignores slivers under 0.001mm².
 */
export function overhangs(mesh: Mesh): string[] {
  const { numProp, vertProperties: v, triVerts } = mesh
  const found = new Set<string>()
  for (let t = 0; t < triVerts.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => triVerts[t + k] * numProp)
    const u = [0, 1, 2].map((axis) => v[b + axis] - v[a + axis])
    const w = [0, 1, 2].map((axis) => v[c + axis] - v[a + axis])
    const normal = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const area = Math.hypot(...normal) / 2
    const nz = normal[2] / (2 * area)
    const z = Math.max(v[a + 2], v[b + 2], v[c + 2])
    if (area > 1e-3 && nz < -Math.SQRT1_2 - 3e-3 && z > 1e-6) found.add(nz < -0.999 ? `flat at ${z.toFixed(2)}` : 'slope')
  }
  return [...found].sort()
}
