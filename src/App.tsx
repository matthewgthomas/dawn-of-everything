import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Filter, List, Map as MapIcon, Search, SlidersHorizontal, Star, X } from 'lucide-react'
import AboutPanel from './AboutPanel'
import CompareTray from './CompareTray'
import DetailDrawer from './DetailDrawer'
import FilterPanel from './FilterPanel'
import Timeline from './Timeline'
import WorldMap from './WorldMap'
import { formatYear, sections, settlementById, settlements, settlementTypes } from './data'
import { countActiveFilters, EMPTY_FILTERS, filterAndSortSettlements, readUrlState, writeUrlState, type FilterState } from './filtering'

type MobileView = 'results' | 'map' | 'timeline'

const validTypes = new Set(settlementTypes.map(({ type }) => type))
const validSections = new Set(sections.map(({ section }) => section))
const validIds = new Set(settlements.map((settlement) => settlement.settlement_id))
const initialUrlState = typeof window === 'undefined'
  ? { filters: EMPTY_FILTERS, selectedId: null, compareIds: [] }
  : readUrlState(window.location.search, validTypes, validSections, validIds)

export default function App() {
  const [filters, setFilters] = useState<FilterState>(initialUrlState.filters)
  const [selectedId, setSelectedId] = useState<string | null>(initialUrlState.selectedId)
  const [compareIds, setCompareIds] = useState<string[]>(initialUrlState.compareIds)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(Boolean(initialUrlState.selectedId))
  const [compareOpen, setCompareOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('map')
  const searchRef = useRef<HTMLInputElement>(null)
  const deferredQuery = useDeferredValue(filters.query)

  const effectiveFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery])
  const results = useMemo(() => filterAndSortSettlements(settlements, effectiveFilters), [effectiveFilters])
  const selected = selectedId ? settlementById.get(selectedId) ?? null : null
  const compared = compareIds.flatMap((id) => {
    const settlement = settlementById.get(id)
    return settlement ? [settlement] : []
  })
  const activeFilterCount = countActiveFilters(filters)
  const hasFilters = activeFilterCount > 0 || filters.query.length > 0

  useEffect(() => {
    const query = writeUrlState({ filters, selectedId, compareIds })
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', nextUrl)
  }, [filters, selectedId, compareIds])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        if (aboutOpen) setAboutOpen(false)
        else if (filtersOpen) setFiltersOpen(false)
        else if (compareOpen) setCompareOpen(false)
        else if (detailOpen) setDetailOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [aboutOpen, compareOpen, detailOpen, filtersOpen])

  const selectSettlement = (id: string) => {
    setSelectedId(id)
    setDetailOpen(true)
  }

  const togglePin = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id)
      if (current.length >= 4) return current
      return [...current, id]
    })
  }

  const movePin = (id: string, direction: -1 | 1) => {
    setCompareIds((current) => {
      const index = current.indexOf(id)
      const destination = index + direction
      if (index < 0 || destination < 0 || destination >= current.length) return current
      const next = [...current]
      ;[next[index], next[destination]] = [next[destination], next[index]]
      return next
    })
  }

  const resetAll = () => setFilters({ ...EMPTY_FILTERS })

  const removeType = (type: string) => setFilters((current) => ({ ...current, types: current.types.filter((entry) => entry !== type) }))
  const removeSection = (section: string) => setFilters((current) => ({ ...current, sections: current.sections.filter((entry) => entry !== section) }))

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <div className="brand-copy">
          <h1 aria-label="The Dawn Atlas"><span aria-hidden="true">The Dawn</span><span aria-hidden="true">Atlas</span></h1>
        </div>
        <p className="header-subtitle"><span>Settlements mentioned in</span><em>The Dawn of Everything</em></p>
        <nav className="header-actions" aria-label="Atlas information and comparison">
          <button className="text-button" onClick={() => setAboutOpen(true)}>About the data <ArrowUpRight size={15} /></button>
          <button className="header-compare-button" onClick={() => setCompareOpen(true)}><Star size={16} /> Compare <b>{compareIds.length}/4</b></button>
        </nav>
      </header>

      <section className="search-band" aria-label="Search and filter settlements">
        <label className="search-box">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search settlements and book text</span>
          <input
            ref={searchRef}
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search places, chapters or passages…"
          />
          {filters.query ? <button onClick={() => setFilters({ ...filters, query: '' })} aria-label="Clear search"><X /></button> : <kbd>⌘ K</kbd>}
        </label>
        <button className={activeFilterCount ? 'filter-button has-filters' : 'filter-button'} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /> Filters <span>{activeFilterCount}</span></button>
        <p className="result-total" aria-live="polite"><strong>{results.length}</strong> of 174 settlements</p>
      </section>

      {hasFilters && (
        <section className="active-filter-strip" aria-label="Active filters">
          <Filter size={14} aria-hidden="true" /><span>Showing</span>
          {filters.query && <button onClick={() => setFilters({ ...filters, query: '' })}>Search: {filters.query}<X /></button>}
          {filters.types.map((type) => <button key={type} onClick={() => removeType(type)}>{type}<X /></button>)}
          {filters.sections.map((section) => <button key={section} onClick={() => removeSection(section)}>{section}<X /></button>)}
          {filters.startFrom !== null && <button onClick={() => setFilters({ ...filters, startFrom: null })}>Starts after {formatYear(filters.startFrom)}<X /></button>}
          {filters.startTo !== null && <button onClick={() => setFilters({ ...filters, startTo: null })}>Starts before {formatYear(filters.startTo)}<X /></button>}
          {filters.endFrom !== null && <button onClick={() => setFilters({ ...filters, endFrom: null })}>Ends after {formatYear(filters.endFrom)}<X /></button>}
          {filters.endTo !== null && <button onClick={() => setFilters({ ...filters, endTo: null })}>Ends before {formatYear(filters.endTo)}<X /></button>}
          {!filters.includeUnknownStart && <button onClick={() => setFilters({ ...filters, includeUnknownStart: true })}>Known start only<X /></button>}
          {!filters.includeUnknownEnd && <button onClick={() => setFilters({ ...filters, includeUnknownEnd: true })}>Known end only<X /></button>}
          <button className="reset-link" onClick={resetAll}>Reset all</button>
        </section>
      )}

      <nav className="mobile-tabs" aria-label="Explorer views">
        <button className={mobileView === 'results' ? 'is-active' : ''} onClick={() => setMobileView('results')}><List /> Results</button>
        <button className={mobileView === 'map' ? 'is-active' : ''} onClick={() => setMobileView('map')}><MapIcon /> Map</button>
        <button className={mobileView === 'timeline' ? 'is-active' : ''} onClick={() => setMobileView('timeline')}><span className="timeline-tab-icon" /> Timeline</button>
      </nav>

      <section className="explorer-grid">
        <aside className={`results-panel view-pane${mobileView === 'results' ? ' mobile-active' : ''}`}>
          <div className="panel-label"><span>Browse settlements</span><span>Ranked by mentions</span></div>
          <div className="result-list">
            {results.length === 0 && (
              <div className="empty-state"><Search /><h2>No settlements found</h2><p>Try a broader search or remove some filters.</p><button className="secondary-button" onClick={resetAll}>Reset all</button></div>
            )}
            {results.map((settlement) => {
              const selectedResult = settlement.settlement_id === selectedId
              const pinIndex = compareIds.indexOf(settlement.settlement_id)
              return (
                <article className={selectedResult ? 'result-card is-selected' : 'result-card'} key={settlement.settlement_id}>
                  <button className="result-card-main" onClick={() => selectSettlement(settlement.settlement_id)}>
                    <span className="result-card-top"><strong>{settlement.canonical_name}</strong><span>{settlement.mention_paragraph_count}</span></span>
                    <span className="result-card-type">{settlement.settlement_type}</span>
                    <span className="result-card-era">{settlement.occupation_interval_display}</span>
                    {settlement.latitudeNumber === null && <span className="unlocated-tag">Location unresolved</span>}
                  </button>
                  <button
                    className={pinIndex >= 0 ? `result-pin is-pinned pin-${pinIndex}` : 'result-pin'}
                    disabled={pinIndex < 0 && compareIds.length >= 4}
                    title={pinIndex < 0 && compareIds.length >= 4 ? 'Comparison is limited to four settlements' : undefined}
                    onClick={() => togglePin(settlement.settlement_id)}
                    aria-label={`${pinIndex >= 0 ? 'Remove' : 'Add'} ${settlement.canonical_name} ${pinIndex >= 0 ? 'from' : 'to'} comparison`}
                  >{pinIndex >= 0 ? String.fromCharCode(65 + pinIndex) : <Star />}</button>
                </article>
              )
            })}
          </div>
        </aside>

        <div className="visual-workspace">
          <section className={`map-panel view-pane${mobileView === 'map' ? ' mobile-active' : ''}`}>
            <p className="map-description">Every point is a place where people lived together. Select a cluster to move closer.</p>
            <WorldMap settlements={results} selectedId={selectedId} pinnedIds={compareIds} onSelect={selectSettlement} />
          </section>

          <div className={`timeline-panel view-pane${mobileView === 'timeline' ? ' mobile-active' : ''}`}>
            <Timeline settlements={results} selectedId={selectedId} pinnedIds={compareIds} onSelect={selectSettlement} onPin={togglePin} />
          </div>
        </div>
      </section>

      {filtersOpen && <><div className="drawer-scrim" onClick={() => setFiltersOpen(false)} /><FilterPanel filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} /></>}
      {detailOpen && selected && <><div className="drawer-scrim detail-scrim" onClick={() => setDetailOpen(false)} /><DetailDrawer settlement={selected} query={filters.query} pinned={compareIds.includes(selected.settlement_id)} canPin={compareIds.length < 4} onPin={() => togglePin(selected.settlement_id)} onClose={() => setDetailOpen(false)} /></>}
      {aboutOpen && <><div className="drawer-scrim" onClick={() => setAboutOpen(false)} /><AboutPanel onClose={() => setAboutOpen(false)} /></>}

      <CompareTray settlements={compared} open={compareOpen} onOpenChange={setCompareOpen} onRemove={togglePin} onMove={movePin} onClear={() => setCompareIds([])} />
    </main>
  )
}
