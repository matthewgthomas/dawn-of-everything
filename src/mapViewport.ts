import { zoomIdentity, type ZoomTransform } from 'd3'
import { MIN_MAP_ZOOM } from './mapClustering'

export interface MapViewportSize {
  width: number
  height: number
}

export interface MapViewportPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface MapViewportPoint {
  x: number
  y: number
}

export const MAX_AUTO_FIT_ZOOM = 7
export const SINGLE_POINT_FIT_ZOOM = 4

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export function fitMapPoints(
  points: MapViewportPoint[],
  viewport: MapViewportSize,
  padding: MapViewportPadding,
  minimumZoom = MIN_MAP_ZOOM,
  maximumZoom = MAX_AUTO_FIT_ZOOM,
): ZoomTransform {
  if (points.length === 0 || viewport.width <= 0 || viewport.height <= 0) return zoomIdentity

  const availableWidth = Math.max(1, viewport.width - padding.left - padding.right)
  const availableHeight = Math.max(1, viewport.height - padding.top - padding.bottom)
  const targetX = padding.left + availableWidth / 2
  const targetY = padding.top + availableHeight / 2
  const xMinimum = Math.min(...points.map(({ x }) => x))
  const xMaximum = Math.max(...points.map(({ x }) => x))
  const yMinimum = Math.min(...points.map(({ y }) => y))
  const yMaximum = Math.max(...points.map(({ y }) => y))
  const sourceX = (xMinimum + xMaximum) / 2
  const sourceY = (yMinimum + yMaximum) / 2
  const pointWidth = xMaximum - xMinimum
  const pointHeight = yMaximum - yMinimum

  const zoomLevel = pointWidth < 1 && pointHeight < 1
    ? clamp(SINGLE_POINT_FIT_ZOOM, minimumZoom, maximumZoom)
    : clamp(Math.min(availableWidth / Math.max(1, pointWidth), availableHeight / Math.max(1, pointHeight)), minimumZoom, maximumZoom)

  return zoomIdentity
    .translate(targetX, targetY)
    .scale(zoomLevel)
    .translate(-sourceX, -sourceY)
}
