import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BOOK_WEBSITE_URL } from './BookTitleLink'
import CompareTray from './CompareTray'
import DetailDrawer from './DetailDrawer'
import FilterPanel from './FilterPanel'
import App from './App'
import { EMPTY_FILTERS } from './filtering'
import { settlementByName, settlements } from './data'
import SettlementAreaComparison from './SettlementAreaComparison'

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

const settlement = (name: string) => settlementByName.get(name)!

describe('App responsive results', () => {
  it('links book references and prominently credits the authors and publisher', async () => {
    setDesktopMedia(true)
    const user = userEvent.setup()
    render(<App />)

    const initialBookLinks = screen.getAllByRole('link', { name: 'The Dawn of Everything' })
    expect(initialBookLinks.length).toBeGreaterThanOrEqual(2)
    initialBookLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', BOOK_WEBSITE_URL)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
    expect(screen.getByText('David Graeber')).toBeInTheDocument()
    expect(screen.getByText('David Wengrow')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'About the atlas' }))
    const about = screen.getByRole('dialog', { name: 'About the atlas' })
    expect(about).toHaveTextContent('David Graeber and David Wengrow')
    expect(about).toHaveTextContent('Penguin Random House')
    expect(about).toHaveTextContent('independent, unofficial atlas')
    expect(about).toHaveTextContent('MIT License applies only to its original code')
    expect(about).toHaveTextContent('do not imply endorsement')
    expect(about).toHaveTextContent('should not be treated as authoritative scholarship')
    const aboutBookLinks = about.querySelectorAll<HTMLAnchorElement>(`a[href="${BOOK_WEBSITE_URL}"]`)
    expect(aboutBookLinks.length).toBeGreaterThanOrEqual(2)
    aboutBookLinks.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('retargets the desktop results launcher to the Book mentions panel', async () => {
    setDesktopMedia(true)
    const user = userEvent.setup()
    render(<App />)
    const launcher = screen.getByRole('button', { name: '137 settlements' })
    const viewSwitcher = screen.getByRole('navigation', { name: 'Settlement list view' })
    expect(within(viewSwitcher).getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(launcher)
    expect(screen.queryByRole('dialog', { name: 'Settlements' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book mentions' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Book mentions settlement view' })).toBeInTheDocument()
    expect(launcher).toHaveFocus()
  })

  it('switches mobile search to mentions once while keeping the other settlement views selectable', async () => {
    setDesktopMedia(false)
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('button', { name: 'About the atlas' })).toBeInTheDocument()
    const input = screen.getByRole('combobox', { name: /Search settlements and book text/i })
    const explorerTab = screen.getByRole('button', { name: 'Explorer' })
    expect(screen.queryByRole('button', { name: 'Results' })).not.toBeInTheDocument()
    await user.type(input, 'w')
    expect(explorerTab).not.toHaveClass('is-active')
    await user.type(input, 'o')
    expect(explorerTab).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Book mentions' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent('0')

    await user.click(screen.getByRole('button', { name: 'Timeline' }))
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Occupation through time' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settlement area' }))
    expect(screen.getByRole('button', { name: 'Settlement area' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Settlement area' })).toBeInTheDocument()
  })

  it('switches between timeline and settlement-area modes without replacing the timeline component', async () => {
    setDesktopMedia(true)
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Occupation through time' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Settlement area' }))
    expect(screen.getByRole('heading', { name: 'Settlement area' })).toBeInTheDocument()
    expect(screen.getByText('65 of 137 filtered settlements have an estimated size.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Settlement list view' })).getByRole('button', { name: 'Timeline' }))
    expect(screen.getByRole('heading', { name: 'Occupation through time' })).toBeInTheDocument()
  })

  it('builds a named settlement allow-list from mouse and keyboard suggestions across every view', async () => {
    setDesktopMedia(true)
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByRole('combobox', { name: /Search settlements and book text/i })

    await user.type(input, 'Teo')
    await user.click(screen.getByRole('option', { name: /Teotihuacan.*Add/i }))
    expect(input).toHaveValue('')
    expect(screen.getByRole('button', { name: /Place: Teotihuacan/i })).toBeInTheDocument()

    await user.type(input, 'Uruk')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(input).toHaveValue('')
    expect(screen.getByRole('button', { name: /Place: Uruk/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 results' })).toBeInTheDocument()

    const timeline = screen.getByRole('heading', { name: 'Occupation through time' }).closest('section')!
    expect(within(timeline).getByText('Teotihuacan')).toBeInTheDocument()
    expect(within(timeline).getByText('Uruk')).toBeInTheDocument()
    expect(within(timeline).queryByText('Aztlán')).not.toBeInTheDocument()
    await waitFor(() => expect(document.querySelectorAll('.map-marker')).toHaveLength(2))
    await waitFor(() => expect([...document.querySelectorAll('.map-settlement-label')].map((label) => label.textContent).sort()).toEqual(['Teotihuacan', 'Uruk']))

    await user.click(screen.getByRole('button', { name: 'Settlement area' }))
    const area = screen.getByRole('heading', { name: 'Settlement area' }).closest('section')!
    expect(area).toHaveTextContent('2 filtered settlements')
    expect(within(area).getByText('Teotihuacan')).toBeInTheDocument()
    expect(within(area).getByText('Uruk')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Book mentions' }))
    const mentions = screen.getByRole('region', { name: 'Book mentions settlement view' })
    expect(within(mentions).getByText('Teotihuacan')).toBeInTheDocument()
    expect(within(mentions).getByText('Uruk')).toBeInTheDocument()
    expect(within(mentions).queryByText('Aztlán')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(screen.getByRole('button', { name: '137 settlements' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Place: Teotihuacan/i })).not.toBeInTheDocument()
  })
})

describe('SettlementAreaComparison', () => {
  it('ranks known areas and retains unknown settlements in a separate group', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onPin = vi.fn()
    render(
      <SettlementAreaComparison
        settlements={[settlement('Uruk'), settlement('Teotihuacan'), settlement('Quebec City')]}
        selectedId={null}
        pinnedIds={[]}
        onSelect={onSelect}
        onPin={onPin}
        onReset={() => undefined}
      />,
    )

    const rows = document.querySelectorAll('.area-comparison-row')
    expect(rows[0]).toHaveTextContent('Teotihuacan')
    expect(rows[1]).toHaveTextContent('Uruk')
    expect(screen.getByText('Area not established')).toBeInTheDocument()
    await user.click(screen.getByText('Area not established'))
    expect(screen.getByText('Quebec City')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Add Teotihuacan to comparison/i }))
    expect(onPin).toHaveBeenCalledWith(settlement('Teotihuacan').settlement_id)
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

    rerender(<CompareTray settlements={[settlement('Teotihuacan')]} open={false} {...props} />)
    expect(document.querySelector('.compare-launcher')).toBeInTheDocument()
  })

  it('does not open comparison with no selected settlements', () => {
    render(<CompareTray settlements={[]} open {...props} />)
    expect(screen.queryByRole('dialog', { name: 'Compare settlements' })).not.toBeInTheDocument()
    expect(document.querySelector('.compare-launcher')).not.toBeInTheDocument()
  })

  it('explains that a second settlement is needed and cannot open the full tray', async () => {
    const user = userEvent.setup()
    render(<CompareTray settlements={[settlement('Teotihuacan')]} open={false} {...props} />)
    expect(screen.getByText('Add one more to compare')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Compare settlements' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /remove teotihuacan/i }))
    expect(props.onRemove).toHaveBeenCalledWith(settlement('Teotihuacan').settlement_id)
  })
})

describe('FilterPanel', () => {
  it('selects an exact settlement type and resets it', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<FilterPanel filters={EMPTY_FILTERS} settlements={settlements} onChange={onChange} onClose={() => undefined} />)
    await user.click(within(document.querySelector('.type-list')!).getByText('ancient city'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ types: ['ancient city'] }))

    const selected = { ...EMPTY_FILTERS, types: ['ancient city'] }
    rerender(<FilterPanel filters={selected} settlements={settlements} onChange={onChange} onClose={() => undefined} />)
    await user.click(screen.getByRole('button', { name: /reset filters/i }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }))
  })

  it('searches aliases, manages selected names, and clears the named allow-list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const selected = { ...EMPTY_FILTERS, settlementIds: [settlement('Teotihuacan').settlement_id, settlement('Uruk').settlement_id] }
    const { rerender } = render(<FilterPanel filters={selected} settlements={settlements} onChange={onChange} onClose={() => undefined} />)

    expect(screen.getByRole('button', { name: /Remove Teotihuacan from visible settlements/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear selected' }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ settlementIds: [] }))

    rerender(<FilterPanel filters={EMPTY_FILTERS} settlements={settlements} onChange={onChange} onClose={() => undefined} />)
    await user.type(screen.getByRole('textbox', { name: /Find a settlement by name or alias/i }), 'Warka')
    expect(screen.getByText('Also known as Warka')).toBeInTheDocument()
    await user.click(screen.getByText('Uruk'))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ settlementIds: [settlement('Uruk').settlement_id] }))
  })
})

describe('DetailDrawer', () => {
  it('links the book title in the fallback settlement description', () => {
    const settlementWithoutDescription = settlement('Altamira Cave')
    expect(settlementWithoutDescription.wikidata_description).toBe('')
    render(<DetailDrawer settlement={settlementWithoutDescription} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    const bookLink = screen.getByRole('link', { name: 'The Dawn of Everything' })
    expect(bookLink).toHaveAttribute('href', BOOK_WEBSITE_URL)
    expect(bookLink).toHaveAttribute('target', '_blank')
    expect(bookLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows the selected settlement on a static world map when coordinates are resolved', () => {
    const teotihuacan = settlement('Teotihuacan')
    render(<DetailDrawer settlement={teotihuacan} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByRole('img', { name: /Location of Teotihuacan on the world map/i })).toBeInTheDocument()
    expect(screen.queryByText('Location unresolved')).not.toBeInTheDocument()
  })

  it('summarizes peak area and exposes full comparator provenance', async () => {
    const user = userEvent.setup()
    const teotihuacan = settlement('Teotihuacan')
    render(<DetailDrawer settlement={teotihuacan} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByText('2072 ha')).toBeInTheDocument()
    expect(screen.getByText('About 2.1 × Richmond Park')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Area' }))
    expect(screen.getByRole('heading', { name: 'Settlement area' })).toBeInTheDocument()
    expect(screen.getByText('20.7 km²')).toBeInTheDocument()
    const comparator = screen.getByRole('link', { name: /About 2.1 × Richmond Park/i })
    expect(comparator).toHaveAttribute('href', 'https://www.royalparks.org.uk/visit/parks/richmond-park/faqs')
    expect(comparator).toHaveAttribute('target', '_blank')
    expect(screen.getByText('The Dawn of Everything source text, line 3090')).toBeInTheDocument()
  })

  it('shows every multi-phase estimate and marks alternates', async () => {
    const user = userEvent.setup()
    render(<DetailDrawer settlement={settlement('Uruk')} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    await user.click(screen.getByRole('button', { name: 'Area' }))
    expect(screen.getByText('5 observations')).toBeInTheDocument()
    expect(screen.getByText('Alternate estimate')).toBeInTheDocument()
    expect(screen.getByText('Early Dynastic expansion, by c. 2800 BCE')).toBeInTheDocument()
    expect(screen.getByText('Seleucid city, c. 300–125 BCE')).toBeInTheDocument()
  })

  it('renders multiple area research sources as separate valid links', async () => {
    const user = userEvent.setup()
    render(<DetailDrawer settlement={settlement('Sannai Maruyama')} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    await user.click(screen.getByRole('button', { name: 'Area' }))

    expect(screen.getByRole('link', { name: 'Source 1' })).toHaveAttribute(
      'href',
      'https://www.cambridge.org/core/services/aop-cambridge-core/content/view/AAEB4223BC3D3A300F2D1B8350977479/S0003598X00059159a.pdf/editorial.pdf',
    )
    expect(screen.getByRole('link', { name: 'Source 2' })).toHaveAttribute(
      'href',
      'https://jpsearch.go.jp/en/item/cb1-6a82762f_ac8e_41dd_a325_8dd746bfb39d',
    )
  })

  it('explains unknown areas and links supporting evidence when available', async () => {
    const user = userEvent.setup()
    render(<DetailDrawer settlement={settlement('Durrington Walls')} query="" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByText(/overall Durrington Walls settlement size is unknown/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Area' }))
    const evidence = screen.getByRole('link', { name: /English Heritage, Stonehenge reconstructed/i })
    expect(evidence).toHaveAttribute('target', '_blank')
  })

  it('keeps an unlocated settlement browseable with full grouped passages', async () => {
    const user = userEvent.setup()
    const aztlan = settlement('Aztlán')
    render(<DetailDrawer settlement={aztlan} query="homeland" pinned={false} canPin onPin={() => undefined} onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Aztlán' })).toBeInTheDocument()
    expect(screen.getByText('Location unresolved')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /world map/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Passages \(2\)/ }))
    expect(screen.getByText(/Passages from the book/)).toBeInTheDocument()
    expect(screen.getAllByText(/Chapter/).length).toBeGreaterThan(0)
  })
})
