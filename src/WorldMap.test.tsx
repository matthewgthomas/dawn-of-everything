import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { geoEqualEarth, zoomIdentity } from 'd3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settlementById, settlements } from './data'
import WorldMap, {
  SETTLEMENT_LABEL_FONT_SIZE,
  SETTLEMENT_LABEL_MIN_ZOOM,
  layoutSettlementLabels,
  shouldShowSettlementLabels,
} from './WorldMap'

let resizeCallback: ResizeObserverCallback
const originalMatchMedia = window.matchMedia

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback
  }

  observe() { /* Triggered explicitly by the test. */ }
  disconnect() { /* No resources to release. */ }
  unobserve() { /* No resources to release. */ }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
})

describe('WorldMap', () => {
  it('uses an adaptive visibility policy for named settlement labels', () => {
    expect(shouldShowSettlementLabels(0, SETTLEMENT_LABEL_MIN_ZOOM)).toBe(false)
    expect(shouldShowSettlementLabels(4, 1)).toBe(true)
    expect(shouldShowSettlementLabels(5, SETTLEMENT_LABEL_MIN_ZOOM - 0.01)).toBe(false)
    expect(shouldShowSettlementLabels(5, SETTLEMENT_LABEL_MIN_ZOOM)).toBe(true)
  })

  it('places labels to the right unless their estimated width would cross the viewport edge', () => {
    const transform = zoomIdentity.scale(2)
    const placements = layoutSettlementLabels([
      { id: 'uruk', label: 'Uruk', x: 100, y: 100, markerRadius: 5 },
      { id: 'teotihuacan', label: 'Teotihuacan', x: 380, y: 100, markerRadius: 5 },
    ], transform, 800, 500)

    expect(placements.get('uruk')).toMatchObject({ x: 5, textAnchor: 'start' })
    expect(placements.get('teotihuacan')).toMatchObject({ x: -5, textAnchor: 'end' })
  })

  it.each([
    ['Uruk and Lagash', ['S078', 'S088']],
    ['Tenochtitlan and Tlaxcala', ['S105', 'S115']],
  ])('moves nearby %s labels to non-overlapping positions at the active zoom', (_name, ids) => {
    const projection = geoEqualEarth().fitExtent([[18, 18], [782, 482]], { type: 'Sphere' })
    const entries = ids.map((id) => {
      const settlement = settlementById.get(id)!
      const [x, y] = projection([settlement.longitudeNumber!, settlement.latitudeNumber!])!
      return { id, label: settlement.canonical_name, x, y, markerRadius: 5 }
    })
    const centerX = (entries[0].x + entries[1].x) / 2
    const centerY = (entries[0].y + entries[1].y) / 2
    const transform = zoomIdentity.translate(400, 250).scale(14).translate(-centerX, -centerY)
    const placements = layoutSettlementLabels(entries, transform, 800, 500)
    const screenBaselines = entries.map((entry) => {
      const placement = placements.get(entry.id)!
      return transform.apply([entry.x + placement.x, entry.y + placement.y])
    })

    expect(placements.size).toBe(2)
    expect(Math.abs(screenBaselines[0][1] - screenBaselines[1][1])).toBeGreaterThan(SETTLEMENT_LABEL_FONT_SIZE)
  })

  it('omits a label when no collision-free placement fits in the viewport', () => {
    const placements = layoutSettlementLabels([
      { id: 'first', label: 'Tenochtitlan', x: 10, y: 10, markerRadius: 5 },
      { id: 'second', label: 'Tlaxcala', x: 10, y: 10, markerRadius: 5 },
      { id: 'third', label: 'Teotihuacan', x: 10, y: 10, markerRadius: 5 },
    ], zoomIdentity, 50, 30)

    expect(placements.size).toBeLessThan(3)
  })

  it('rebuilds its viewport from ResizeObserver measurements', async () => {
    render(<WorldMap settlements={settlements.slice(0, 2)} labelledSettlementIds={[]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)

    act(() => resizeCallback([{ contentRect: { width: 640, height: 420 } } as ResizeObserverEntry], {} as ResizeObserver))

    const map = screen.getByRole('img', { name: /Settlements in The Dawn of Everything/i })
    await waitFor(() => expect(map).toHaveAttribute('viewBox', '0 0 640 420'))
    expect(map.querySelector('clipPath rect')).toHaveAttribute('width', '640')
    expect(map.querySelector('clipPath rect')).toHaveAttribute('height', '420')
  })

  it('refits when the visible settlement set changes and exposes the fit control', async () => {
    const firstSettlement = settlements.find(({ latitudeNumber, longitudeNumber }) => latitudeNumber !== null && longitudeNumber !== null)!
    const { rerender } = render(<WorldMap settlements={[firstSettlement]} labelledSettlementIds={[]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    const map = screen.getByRole('img', { name: /Settlements in The Dawn of Everything/i })
    const viewportGroup = map.querySelector('g[clip-path] > g')!

    await waitFor(() => expect(viewportGroup.getAttribute('transform')).toContain('scale(4)'))
    const singlePointTransform = viewportGroup.getAttribute('transform')

    rerender(<WorldMap settlements={settlements} labelledSettlementIds={[]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    await waitFor(() => expect(viewportGroup.getAttribute('transform')).not.toBe(singlePointTransform))
    expect(screen.getByRole('button', { name: 'Fit visible settlements' })).toBeInTheDocument()
  })

  it('lets readers control the physical map layers', async () => {
    const user = userEvent.setup()
    render(<WorldMap settlements={settlements.slice(0, 2)} labelledSettlementIds={[]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)

    const layerButton = screen.getByRole('button', { name: 'Map layers' })
    expect(layerButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(layerButton)

    expect(layerButton).toHaveAttribute('aria-expanded', 'true')
    const waterLayer = screen.getByRole('checkbox', { name: /Water Rivers and lakes/i })
    expect(waterLayer).toBeChecked()
    await waitFor(() => expect(document.querySelector('.map-river')).toBeInTheDocument())
    expect(document.querySelector('.map-lake')).toBeInTheDocument()

    await user.click(waterLayer)
    expect(waterLayer).not.toBeChecked()
    expect(document.querySelector('.map-river')).not.toBeInTheDocument()
    expect(document.querySelector('.map-lake')).not.toBeInTheDocument()
  })

  it('keeps geography label outlines from growing with map zoom', async () => {
    const firstMappedSettlement = settlements.find(
      ({ latitudeNumber, longitudeNumber }) => latitudeNumber !== null && longitudeNumber !== null,
    )!
    render(<WorldMap settlements={[firstMappedSettlement]} labelledSettlementIds={[]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)

    await waitFor(() => expect(document.querySelector('.map-elevation text')).toBeInTheDocument())
    const labels = document.querySelectorAll('.map-geography-label, .map-elevation text')

    expect(labels.length).toBeGreaterThan(0)
    labels.forEach((label) => expect(label).toHaveAttribute('vector-effect', 'non-scaling-stroke'))
  })

  it('labels a small named-filter set with fixed-size, non-interactive text independent of the Names layer', async () => {
    const user = userEvent.setup()
    const teotihuacan = settlementById.get('S106')!
    const { rerender } = render(<WorldMap settlements={[teotihuacan]} labelledSettlementIds={[]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    expect(document.querySelector('.map-settlement-label')).not.toBeInTheDocument()

    rerender(<WorldMap settlements={[teotihuacan]} labelledSettlementIds={['S106']} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    await waitFor(() => expect(document.querySelector('.map-settlement-label')).toBeInTheDocument())
    const label = document.querySelector<SVGTextElement>('.map-settlement-label')!
    expect(label).toHaveTextContent('Teotihuacan')
    expect(label).toHaveAttribute('aria-hidden', 'true')
    expect(label).toHaveAttribute('vector-effect', 'non-scaling-stroke')
    expect(label).toHaveAttribute('pointer-events', 'none')

    const viewportGroup = document.querySelector<SVGGElement>('.world-map g[clip-path] > g')!
    await waitFor(() => expect(viewportGroup.getAttribute('transform')).toContain('scale(4)'))
    expect(Number(label.getAttribute('font-size')) * 4).toBeCloseTo(SETTLEMENT_LABEL_FONT_SIZE)

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(screen.getByRole('checkbox', { name: /Names Geographic labels/i }))
    expect(document.querySelector('.map-settlement-label')).toBeInTheDocument()
  })

  it('does not label unresolved or clustered named settlements', async () => {
    const aztlan = settlementById.get('S117')!
    const { rerender } = render(<WorldMap settlements={[aztlan]} labelledSettlementIds={['S117']} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    expect(document.querySelector('.map-settlement-label')).not.toBeInTheDocument()

    const teotihuacan = settlementById.get('S106')!
    const duplicate = {
      ...settlementById.get('S078')!,
      settlement_id: 'S078-nearby',
      canonical_name: 'Nearby settlement',
      latitudeNumber: teotihuacan.latitudeNumber,
      longitudeNumber: teotihuacan.longitudeNumber,
    }
    rerender(<WorldMap settlements={[teotihuacan, duplicate]} labelledSettlementIds={['S106', duplicate.settlement_id]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    await waitFor(() => expect(document.querySelector('.map-cluster')).toBeInTheDocument())
    expect(document.querySelector('.map-settlement-label')).not.toBeInTheDocument()
  })
})
