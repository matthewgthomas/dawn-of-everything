export const MIN_MAP_ZOOM = 1
export const MAX_MAP_ZOOM = 28
export const CLUSTER_CUTOFF_ZOOM = 14
export const MAX_ZOOM_EPSILON = 0.001

const CLUSTER_DENSITY_BREAKPOINT = 6
const DEFAULT_CLUSTER_CELL_SIZE = 42
const CLOSE_CLUSTER_CELL_SIZE = 20

export interface ClusterableMapPoint {
  id: string
  x: number
  y: number
}

export interface MapPointCluster<Point extends ClusterableMapPoint> {
  key: string
  x: number
  y: number
  points: Point[]
}

export function clusterMapPoints<Point extends ClusterableMapPoint>(
  points: Point[],
  committedScale: number,
): MapPointCluster<Point>[] {
  if (committedScale >= CLUSTER_CUTOFF_ZOOM - MAX_ZOOM_EPSILON) {
    return points.map((point) => ({
      key: `point:${point.id}`,
      x: point.x,
      y: point.y,
      points: [point],
    }))
  }

  const screenCellSize = committedScale > CLUSTER_DENSITY_BREAKPOINT
    ? CLOSE_CLUSTER_CELL_SIZE
    : DEFAULT_CLUSTER_CELL_SIZE
  const projectionCellSize = screenCellSize / Math.max(committedScale, MIN_MAP_ZOOM)
  const cells = new Map<string, Point[]>()

  points.forEach((point) => {
    const cellKey = `${Math.floor(point.x / projectionCellSize)}:${Math.floor(point.y / projectionCellSize)}`
    const entries = cells.get(cellKey) ?? []
    entries.push(point)
    cells.set(cellKey, entries)
  })

  return [...cells.values()].map((entries) => {
    const ids = entries.map((entry) => entry.id).sort()
    return {
      key: entries.length === 1 ? `point:${ids[0]}` : `cluster:${ids.join('|')}`,
      x: entries.reduce((sum, entry) => sum + entry.x, 0) / entries.length,
      y: entries.reduce((sum, entry) => sum + entry.y, 0) / entries.length,
      points: entries,
    }
  })
}
