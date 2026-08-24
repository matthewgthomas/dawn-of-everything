import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DetailDrawer from './DetailDrawer'
import FilterPanel from './FilterPanel'
import { EMPTY_FILTERS } from './filtering'
import { settlementById } from './data'

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
  it('keeps an unlocated settlement browseable with full grouped passages', () => {
    const aztlan = settlementById.get('S117')!
    render(<DetailDrawer settlement={aztlan} query="homeland" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Aztlán' })).toBeInTheDocument()
    expect(screen.getByText('Location unresolved')).toBeInTheDocument()
    expect(screen.getByText(/Passages from the book/)).toBeInTheDocument()
    expect(screen.getAllByText(/Chapter/).length).toBeGreaterThan(0)
  })
})
