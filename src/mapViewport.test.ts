import { describe, expect, it } from 'vitest'
import { fitMapPoints, MAX_AUTO_FIT_ZOOM, SINGLE_POINT_FIT_ZOOM } from './mapViewport'

const viewport = { width: 800, height: 500 }
const padding = { top: 50, right: 100, bottom: 150, left: 20 }

describe('fitMapPoints', () => {
  it('returns the identity transform when there are no mapped points', () => {
    expect(fitMapPoints([], viewport, padding)).toMatchObject({ x: 0, y: 0, k: 1 })
  })

  it('fits multiple points inside asymmetric safe-area padding', () => {
    const transform = fitMapPoints([{ x: 100, y: 100 }, { x: 500, y: 300 }], viewport, padding)
    const topLeft = transform.apply([100, 100])
    const bottomRight = transform.apply([500, 300])

    expect(topLeft[0]).toBeGreaterThanOrEqual(padding.left)
    expect(topLeft[1]).toBeGreaterThanOrEqual(padding.top)
    expect(bottomRight[0]).toBeLessThanOrEqual(viewport.width - padding.right)
    expect(bottomRight[1]).toBeLessThanOrEqual(viewport.height - padding.bottom)
  })

  it('centers a single point at a capped contextual zoom', () => {
    const transform = fitMapPoints([{ x: 240, y: 180 }], viewport, padding)
    const centered = transform.apply([240, 180])

    expect(transform.k).toBe(SINGLE_POINT_FIT_ZOOM)
    expect(centered[0]).toBeCloseTo(padding.left + (viewport.width - padding.left - padding.right) / 2)
    expect(centered[1]).toBeCloseTo(padding.top + (viewport.height - padding.top - padding.bottom) / 2)
  })

  it('treats coincident points as a single location', () => {
    const transform = fitMapPoints([{ x: 320, y: 220 }, { x: 320, y: 220 }], viewport, padding)
    expect(transform.k).toBe(SINGLE_POINT_FIT_ZOOM)
  })

  it('clamps extremely close bounds below the manual maximum zoom', () => {
    const transform = fitMapPoints([{ x: 100, y: 100 }, { x: 101, y: 101 }], viewport, padding)
    expect(transform.k).toBe(MAX_AUTO_FIT_ZOOM)
  })

  it('does not zoom below the configured minimum for very wide bounds', () => {
    const transform = fitMapPoints([{ x: -1000, y: 0 }, { x: 2000, y: 0 }], viewport, padding)
    expect(transform.k).toBe(1)
  })
})
