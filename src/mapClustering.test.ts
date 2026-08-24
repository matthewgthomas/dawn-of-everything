import { describe, expect, it } from 'vitest'
import {
  clusterMapPoints,
  MAX_MAP_ZOOM,
  MAX_ZOOM_EPSILON,
  type ClusterableMapPoint,
} from './mapClustering'

const point = (id: string, x: number, y: number): ClusterableMapPoint => ({ id, x, y })

const clusterSummary = (points: ClusterableMapPoint[], scale: number) => clusterMapPoints(points, scale)
  .map((cluster) => ({
    key: cluster.key,
    ids: cluster.points.map((entry) => entry.id).sort(),
  }))
  .sort((a, b) => a.key.localeCompare(b.key))

describe('clusterMapPoints', () => {
  it('groups nearby points while keeping distant points separate', () => {
    const clusters = clusterMapPoints([
      point('near-a', 5, 5),
      point('near-b', 20, 20),
      point('far', 60, 5),
    ], 1)

    expect(clusters.map((cluster) => cluster.points.length).sort()).toEqual([1, 2])
  })

  it('uses stable membership keys regardless of input order', () => {
    const points = [point('b', 20, 20), point('a', 5, 5), point('c', 60, 5)]

    expect(clusterSummary(points, 1)).toEqual(clusterSummary([...points].reverse(), 1))
    expect(clusterSummary(points, 1)).toContainEqual({ key: 'cluster:a|b', ids: ['a', 'b'] })
  })

  it('is unaffected by pan offsets because clustering only receives the committed scale', () => {
    const points = [point('a', 5, 5), point('b', 20, 20), point('c', 60, 5)]
    const beforePan = { x: 0, y: 0, k: 2 }
    const afterPan = { x: 240, y: -90, k: 2 }

    expect(clusterSummary(points, beforePan.k)).toEqual(clusterSummary(points, afterPan.k))
  })

  it('returns every point as a singleton at maximum zoom', () => {
    const points = [point('a', 5, 5), point('b', 5, 5), point('c', 6, 6)]
    const clusters = clusterMapPoints(points, MAX_MAP_ZOOM - MAX_ZOOM_EPSILON / 2)

    expect(clusters).toHaveLength(points.length)
    expect(clusters.every((cluster) => cluster.points.length === 1)).toBe(true)
    expect(clusters.map((cluster) => cluster.key)).toEqual(['point:a', 'point:b', 'point:c'])
  })
})
