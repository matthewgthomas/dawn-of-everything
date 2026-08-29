import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settlements } from './data'
import WorldMap from './WorldMap'

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
  it('rebuilds its viewport from ResizeObserver measurements', async () => {
    render(<WorldMap settlements={settlements.slice(0, 2)} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)

    act(() => resizeCallback([{ contentRect: { width: 640, height: 420 } } as ResizeObserverEntry], {} as ResizeObserver))

    const map = screen.getByRole('img', { name: /Settlements in The Dawn of Everything/i })
    await waitFor(() => expect(map).toHaveAttribute('viewBox', '0 0 640 420'))
    expect(map.querySelector('clipPath rect')).toHaveAttribute('width', '640')
    expect(map.querySelector('clipPath rect')).toHaveAttribute('height', '420')
  })

  it('refits when the visible settlement set changes and exposes the fit control', async () => {
    const firstSettlement = settlements.find(({ latitudeNumber, longitudeNumber }) => latitudeNumber !== null && longitudeNumber !== null)!
    const { rerender } = render(<WorldMap settlements={[firstSettlement]} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    const map = screen.getByRole('img', { name: /Settlements in The Dawn of Everything/i })
    const viewportGroup = map.querySelector('g[clip-path] > g')!

    await waitFor(() => expect(viewportGroup.getAttribute('transform')).toContain('scale(4)'))
    const singlePointTransform = viewportGroup.getAttribute('transform')

    rerender(<WorldMap settlements={settlements} selectedId={null} pinnedIds={[]} onSelect={() => undefined} />)
    await waitFor(() => expect(viewportGroup.getAttribute('transform')).not.toBe(singlePointTransform))
    expect(screen.getByRole('button', { name: 'Fit visible settlements' })).toBeInTheDocument()
  })
})
