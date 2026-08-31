import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Clock3, Filter, Info, List, Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from 'lucide-react'
import AboutPanel from './AboutPanel'
import BookTitleLink from './BookTitleLink'
import CompareTray from './CompareTray'
import DetailDrawer, { type DetailView } from './DetailDrawer'
import FilterPanel from './FilterPanel'
import SettlementViewsPanel, { type SettlementPanelView } from './SettlementViewsPanel'
import type { TimelinePresetId } from './Timeline'
import WorldMap from './WorldMap'
import { formatYear, sections, settlementById, settlements, settlementTypes } from './data'
import {
  countActiveFilters,
  deriveSearchResults,
  EMPTY_FILTERS,
  ERA_PRESETS,
  PLACE_CATEGORIES,
  readUrlState,
  writeUrlState,
  type FilterState,
  type SettlementSearchResult,
} from './filtering'

type MobileView = 'map' | 'list'
interface DetailContext { initialView: DetailView; matchingMentionIds: string[]; bestMentionId: string | null }

const validTypes = new Set(settlementTypes.map(({ type }) => type))
const validSections = new Set(sections.map(({ section }) => section))
const validIds = new Set(settlements.map((settlement) => settlement.settlement_id))
const initialUrlState = typeof window === 'undefined'
  ? { filters: EMPTY_FILTERS, selectedId: null, compareIds: [] }
  : readUrlState(window.location.search, validTypes, validSections, validIds)
const chapterEight = sections.find(({ chapter, kind }) => chapter === 8 && kind === 'chapter')?.section ?? 'Chapter 8: Imaginary Cities'
const onboardingStorageKey = 'dawn-atlas:onboarding-dismissed'

const urlForState = (filters: FilterState, selectedId: string | null, compareIds: string[]) => {
  const query = writeUrlState({ filters, selectedId, compareIds })
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
}

export default function App() {
  const [filters, setFilters] = useState<FilterState>(initialUrlState.filters)
  const [selectedId, setSelectedId] = useState<string | null>(initialUrlState.selectedId)
  const [compareIds, setCompareIds] = useState<string[]>(initialUrlState.compareIds)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(Boolean(initialUrlState.selectedId))
  const [detailContext, setDetailContext] = useState<DetailContext>({ initialView: 'overview', matchingMentionIds: [], bestMentionId: null })
  const [compareOpen, setCompareOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('map')
  const [panelView, setPanelView] = useState<SettlementPanelView>('timeline')
  const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 901px)').matches)
  const [timelineRequest, setTimelineRequest] = useState<TimelinePresetId | null>(null)
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try { return localStorage.getItem(onboardingStorageKey) === 'true' } catch { return false }
  })
  const searchRef = useRef<HTMLInputElement>(null)
  const searchSessionRef = useRef(false)
  const suppressSearchResultsRef = useRef(false)
  const deferredQuery = useDeferredValue(filters.query)

  const effectiveFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [filters, deferredQuery])
  const searchResults = useMemo(() => deriveSearchResults(settlements, effectiveFilters), [effectiveFilters])
  const results = useMemo(() => searchResults.map((result) => result.settlement), [searchResults])
  const selected = selectedId ? settlementById.get(selectedId) ?? null : null
  const compared = compareIds.flatMap((id) => {
    const settlement = settlementById.get(id)
    return settlement ? [settlement] : []
  })
  const activeFilterCount = countActiveFilters(filters)
  const hasFilters = activeFilterCount > 0 || filters.query.trim().length > 0
  const showOnboarding = !onboardingDismissed && !hasFilters && !selectedId && compareIds.length === 0

  const closeLocalSurfaces = () => {
    setFiltersOpen(false)
    setAboutOpen(false)
    setCompareOpen(false)
  }

  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)')
    const handleChange = () => setIsDesktop(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    window.history.replaceState(window.history.state, '', urlForState(filters, selectedId, compareIds))
  }, [filters, compareIds]) // selection is handled as discrete navigation

  useEffect(() => {
    const handlePopState = () => {
      const state = readUrlState(window.location.search, validTypes, validSections, validIds)
      setFilters(state.filters)
      setCompareIds(state.compareIds)
      setSelectedId(state.selectedId)
      setDetailOpen(Boolean(state.selectedId))
      setDetailContext({ initialView: 'overview', matchingMentionIds: [], bestMentionId: null })
      closeLocalSurfaces()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (isDesktop || filters.query.trim().length < 2) return
    setPanelView('mentions')
    setMobileView('list')
  }, [filters.query, isDesktop])

  useEffect(() => {
    if (!isDesktop || filters.query.trim().length < 2) return
    if (!searchSessionRef.current || suppressSearchResultsRef.current || panelView === 'mentions' || detailOpen || filtersOpen || aboutOpen || compareOpen) return
    const timer = window.setTimeout(() => {
      if (searchSessionRef.current && !suppressSearchResultsRef.current) {
        setFiltersOpen(false)
        setAboutOpen(false)
        setDetailOpen(false)
        setPanelView('mentions')
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [aboutOpen, compareOpen, detailOpen, filters.query, filtersOpen, isDesktop, panelView])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        if (compareOpen) setCompareOpen(false)
        else if (aboutOpen) setAboutOpen(false)
        else if (filtersOpen) setFiltersOpen(false)
        else if (detailOpen) closeDetail()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const selectSettlement = (id: string, context?: DetailContext) => {
    const nextContext = context ?? { initialView: 'overview' as const, matchingMentionIds: [], bestMentionId: null }
    closeLocalSurfaces()
    setSelectedId(id)
    setDetailContext(nextContext)
    setDetailOpen(true)
    window.history.pushState({ atlasSettlement: true }, '', urlForState(filters, id, compareIds))
  }

  const selectSearchResult = (result: SettlementSearchResult) => {
    suppressSearchResultsRef.current = true
    selectSettlement(result.settlement.settlement_id, {
      initialView: result.matchSource === 'passage' ? 'passages' : 'overview',
      matchingMentionIds: result.matchSource === 'passage' ? result.matchingMentions.map((mention) => mention.mention_id) : [],
      bestMentionId: result.matchSource === 'passage' ? result.bestMention?.mention_id ?? null : null,
    })
  }

  const closeDetail = () => {
    if (window.history.state?.atlasSettlement) {
      window.history.back()
      return
    }
    setDetailOpen(false)
    setSelectedId(null)
    setDetailContext({ initialView: 'overview', matchingMentionIds: [], bestMentionId: null })
    window.history.replaceState(window.history.state, '', urlForState(filters, null, compareIds))
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
  const removeEra = (era: FilterState['eras'][number]) => setFilters((current) => ({ ...current, eras: current.eras.filter((entry) => entry !== era) }))
  const removeCategory = (category: FilterState['categories'][number]) => setFilters((current) => ({ ...current, categories: current.categories.filter((entry) => entry !== category) }))

  const dismissOnboarding = () => {
    setOnboardingDismissed(true)
    try { localStorage.setItem(onboardingStorageKey, 'true') } catch { /* private browsing */ }
  }
  const exploreTeotihuacan = () => selectSettlement('S106')
  const browseChapterEight = () => {
    setAboutOpen(false)
    setFilters((current) => ({ ...current, sections: [chapterEight] }))
  }
  const exploreEarliest = () => {
    setAboutOpen(false)
    setFilters((current) => ({ ...current, eras: ['earliest'] }))
    setTimelineRequest('earliest')
    setPanelView('timeline')
    if (!isDesktop) setMobileView('list')
  }
  const openAbout = () => { setFiltersOpen(false); setDetailOpen(false); setCompareOpen(false); setAboutOpen(true) }
  const openFilters = () => { setAboutOpen(false); setDetailOpen(false); setCompareOpen(false); setFiltersOpen(true) }
  const openResults = () => {
    setFiltersOpen(false)
    setAboutOpen(false)
    setDetailOpen(false)
    setCompareOpen(false)
    setPanelView('mentions')
    if (!isDesktop) setMobileView('list')
  }
  const changePanelView = (view: SettlementPanelView) => {
    if (view !== 'mentions' && searchSessionRef.current) suppressSearchResultsRef.current = true
    setPanelView(view)
  }

  const onboardingCard = (
    <section className="start-card" aria-labelledby="start-card-title">
      <button className="start-card-close" onClick={dismissOnboarding} aria-label="Dismiss start exploring card"><X /></button>
      <p className="eyebrow">The book, mapped</p><h2 id="start-card-title">Start exploring</h2>
      <p>Discover how settlements connect to the passages and ideas in <BookTitleLink />.</p>
      <div>
        <button onClick={exploreTeotihuacan}><MapPin /> Explore Teotihuacan</button>
        <button onClick={browseChapterEight}><BookOpen /> Browse Chapter 8</button>
        <button onClick={exploreEarliest}><Clock3 /> See earliest settlements</button>
      </div>
    </section>
  )

  return (
    <main className={`site-shell${compared.length > 0 ? ' has-compare-launcher' : ''}`}>
      <header className="site-header">
        <div className="brand-mark" aria-hidden="true"><span /></div>
        <div className="brand-copy"><h1 aria-label="The Dawn Atlas"><span aria-hidden="true">The Dawn</span><span aria-hidden="true">Atlas</span></h1></div>
        <p className="header-subtitle">Explore {settlements.length} human settlements discussed in <BookTitleLink /> by <strong>David Graeber</strong> and <strong>David Wengrow</strong>.</p>
        <nav className="header-actions" aria-label="Atlas information"><button className="header-compare-button" onClick={openAbout} aria-label="About the atlas"><Info size={16} aria-hidden="true" /><span>About the atlas</span></button></nav>
      </header>

      <section className="search-band" aria-label="Search and filter settlements">
        <label className="search-box">
          <Search size={19} aria-hidden="true" /><span className="sr-only">Search settlements and book text</span>
          <input
            ref={searchRef}
            value={filters.query}
            onFocus={() => {
              if (!searchSessionRef.current) suppressSearchResultsRef.current = false
              searchSessionRef.current = true
            }}
            onBlur={() => { searchSessionRef.current = false }}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder="Search places, chapters or passages…"
          />
          {filters.query ? <button onClick={() => setFilters({ ...filters, query: '' })} aria-label="Clear search"><X /></button> : <kbd>⌘ K</kbd>}
        </label>
        <button className={activeFilterCount ? 'filter-button has-filters' : 'filter-button'} onClick={openFilters}><SlidersHorizontal size={17} /><span className="filter-button-label">Filters</span>{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}</button>
        <button className="results-button" aria-pressed={panelView === 'mentions'} onClick={openResults}><List size={17} /><span>{hasFilters ? `${results.length} results` : `${settlements.length} settlements`}</span></button>
        <p className="sr-only" aria-live="polite">{results.length} settlements shown</p>
      </section>

      {hasFilters && (
        <section className="active-filter-strip" aria-label="Active filters">
          <Filter size={14} aria-hidden="true" /><span>Showing</span>
          {filters.query && <button onClick={() => setFilters({ ...filters, query: '' })}>Search: {filters.query}<X /></button>}
          {filters.sections.map((section) => <button key={section} onClick={() => removeSection(section)}>{section}<X /></button>)}
          {filters.eras.map((era) => <button key={era} onClick={() => removeEra(era)}>{ERA_PRESETS[era].label}<X /></button>)}
          {filters.categories.map((category) => <button key={category} onClick={() => removeCategory(category)}>{PLACE_CATEGORIES[category].label}<X /></button>)}
          {filters.types.map((type) => <button key={type} onClick={() => removeType(type)}>{type}<X /></button>)}
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
        <button className={mobileView === 'map' ? 'is-active' : ''} onClick={() => setMobileView('map')}><MapIcon /> Map</button>
        <button className={mobileView === 'list' ? 'is-active' : ''} onClick={() => setMobileView('list')}><List /> Explorer</button>
      </nav>

      <section className="explorer-grid">
        <div className="visual-workspace">
          <section className={`map-panel view-pane${mobileView === 'map' ? ' mobile-active' : ''}`}>
            {showOnboarding && onboardingCard}
            <WorldMap settlements={results} selectedId={selectedId} pinnedIds={compareIds} onSelect={selectSettlement} />
            <section className="map-discovery" data-state={selected ? 'selected' : hasFilters ? 'filtered' : 'default'} aria-label="Map discovery">
              {selected ? <><p className="eyebrow">Selected place</p><h2>{selected.canonical_name}</h2><p>{selected.settlement_type} · {selected.occupation_interval_display}</p><button className="primary-button" onClick={() => selectSettlement(selected.settlement_id)}>Open details</button></>
                : hasFilters ? <><p><strong>{results.length}</strong> settlement{results.length === 1 ? '' : 's'} match your search and filters.</p><button className="primary-button" onClick={openResults}>View results</button></>
                  : <><p><strong>{results.length} settlements</strong> to explore. Select a marker or start with one of these places.</p><div className="discovery-suggestions">{results.slice(0, 3).map((settlement) => <button key={settlement.settlement_id} onClick={() => selectSettlement(settlement.settlement_id)}>{settlement.canonical_name}</button>)}</div></>}
            </section>
          </section>

          <div className={`timeline-panel view-pane${mobileView === 'list' ? ' mobile-active' : ''}`}>
            <SettlementViewsPanel
              view={panelView}
              settlements={results}
              searchResults={searchResults}
              query={filters.query}
              selectedId={selectedId}
              pinnedIds={compareIds}
              onViewChange={changePanelView}
              onSelect={selectSettlement}
              onSelectSearchResult={selectSearchResult}
              onPin={togglePin}
              onReset={resetAll}
              requestedPreset={timelineRequest}
              onPresetApplied={() => setTimelineRequest(null)}
            />
          </div>
        </div>
      </section>

      {filtersOpen && <><div className="drawer-scrim" onClick={() => setFiltersOpen(false)} /><FilterPanel filters={filters} resultCount={results.length} onChange={setFilters} onClose={() => setFiltersOpen(false)} /></>}
      {detailOpen && selected && <><div className="drawer-scrim detail-scrim" onClick={closeDetail} /><DetailDrawer key={`${selected.settlement_id}-${detailContext.initialView}`} settlement={selected} query={filters.query} initialView={detailContext.initialView} matchingMentionIds={detailContext.matchingMentionIds} bestMentionId={detailContext.bestMentionId} pinned={compareIds.includes(selected.settlement_id)} canPin={compareIds.length < 4} onPin={() => togglePin(selected.settlement_id)} onClose={closeDetail} /></>}
      {aboutOpen && <><div className="drawer-scrim" onClick={() => setAboutOpen(false)} /><AboutPanel onClose={() => setAboutOpen(false)} onExploreSettlement={exploreTeotihuacan} onBrowseChapter={browseChapterEight} onExploreEarliest={exploreEarliest} /></>}

      <CompareTray settlements={compared} open={compareOpen} onOpenChange={setCompareOpen} onRemove={togglePin} onMove={movePin} onClear={() => setCompareIds([])} />
    </main>
  )
}
