import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CompareTray from './CompareTray'
import DetailDrawer from './DetailDrawer'
import FilterPanel from './FilterPanel'
import { EMPTY_FILTERS } from './filtering'
import { settlementById } from './data'

afterEach(cleanup)

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

  it('still shows the empty tray when opened from elsewhere', () => {
    render(<CompareTray settlements={[]} open {...props} />)
    expect(screen.getByRole('dialog', { name: 'Compare settlements' })).toBeInTheDocument()
    expect(document.querySelector('.compare-launcher')).not.toBeInTheDocument()
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

  it('keeps an unlocated settlement browseable with full grouped passages', () => {
    const aztlan = settlementById.get('S117')!
    render(<DetailDrawer settlement={aztlan} query="homeland" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Aztlán' })).toBeInTheDocument()
    expect(screen.getByText('Location unresolved')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /world map/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Passages from the book/)).toBeInTheDocument()
    expect(screen.getAllByText(/Chapter/).length).toBeGreaterThan(0)
  })
})
