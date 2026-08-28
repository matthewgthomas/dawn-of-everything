import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CompareTray from './CompareTray'
import DetailDrawer from './DetailDrawer'
import FilterPanel from './FilterPanel'
import App from './App'
import { EMPTY_FILTERS } from './filtering'
import { settlementById } from './data'

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

const setDesktopMedia = (desktop: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('min-width: 901px') ? desktop : false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

describe('App responsive results', () => {
  it('opens the desktop results drawer and restores focus to its launcher', async () => {
    setDesktopMedia(true)
    const user = userEvent.setup()
    render(<App />)
    const launcher = screen.getByRole('button', { name: '174 settlements' })
    await user.click(launcher)
    expect(screen.getByRole('dialog', { name: 'Settlements' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close results' }))
    await waitFor(() => expect(launcher).toHaveFocus())
  })

  it('switches to mobile results only after two search characters', async () => {
    setDesktopMedia(false)
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByRole('textbox', { name: /Search settlements and book text/i })
    const resultsTab = screen.getByRole('button', { name: 'Results' })
    await user.type(input, 'w')
    expect(resultsTab).not.toHaveClass('is-active')
    await user.type(input, 'o')
    expect(resultsTab).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent('0')
  })
})

describe('CompareTray', () => {
  const props = {
    onOpenChange: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onClear: vi.fn(),
  }

  it('hides the bottom launcher until a settlement is pinned', () => {
    const { rerender } = render(<CompareTray settlements={[]} open={false} {...props} />)
    expect(document.querySelector('.compare-launcher')).not.toBeInTheDocument()

    rerender(<CompareTray settlements={[settlementById.get('S106')!]} open={false} {...props} />)
    expect(document.querySelector('.compare-launcher')).toBeInTheDocument()
  })

  it('does not open comparison with no selected settlements', () => {
    render(<CompareTray settlements={[]} open {...props} />)
    expect(screen.queryByRole('dialog', { name: 'Compare settlements' })).not.toBeInTheDocument()
    expect(document.querySelector('.compare-launcher')).not.toBeInTheDocument()
  })

  it('explains that a second settlement is needed and cannot open the full tray', async () => {
    const user = userEvent.setup()
    render(<CompareTray settlements={[settlementById.get('S106')!]} open={false} {...props} />)
    expect(screen.getByText('Add one more to compare')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Compare settlements' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /remove teotihuacan/i }))
    expect(props.onRemove).toHaveBeenCalledWith('S106')
  })
})

describe('FilterPanel', () => {
  it('selects an exact settlement type and resets it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<FilterPanel filters={EMPTY_FILTERS} onChange={onChange} onClose={() => undefined} />)
    await user.click(screen.getByText('ancient city'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ types: ['ancient city'] }))

    const selected = { ...EMPTY_FILTERS, types: ['ancient city'] }
    rerender(<FilterPanel filters={selected} onChange={onChange} onClose={() => undefined} />)
    await user.click(screen.getByRole('button', { name: /reset filters/i }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }))
  })
})

describe('DetailDrawer', () => {
  it('shows the selected settlement on a static world map when coordinates are resolved', () => {
    const teotihuacan = settlementById.get('S106')!
    render(<DetailDrawer settlement={teotihuacan} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByRole('img', { name: /Location of Teotihuacan on the world map/i })).toBeInTheDocument()
    expect(screen.queryByText('Location unresolved')).not.toBeInTheDocument()
  })

  it('keeps an unlocated settlement browseable with full grouped passages', async () => {
    const user = userEvent.setup()
    const aztlan = settlementById.get('S117')!
    render(<DetailDrawer settlement={aztlan} query="homeland" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Aztlán' })).toBeInTheDocument()
    expect(screen.getByText('Location unresolved')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /world map/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Passages \(2\)/ }))
    expect(screen.getByText(/Passages from the book/)).toBeInTheDocument()
    expect(screen.getAllByText(/Chapter/).length).toBeGreaterThan(0)
  })
})
