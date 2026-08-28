import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, RotateCcw, Search, X } from 'lucide-react'
import { formatYear, sections, settlements, settlementTypes } from './data'
import {
  categoriesForType,
  EMPTY_FILTERS,
  ERA_PRESETS,
  PLACE_CATEGORIES,
  type EraPresetId,
  type FilterState,
  type PlaceCategoryId,
} from './filtering'
import { useDialogFocus } from './useDialogFocus'

interface FilterPanelProps {
  filters: FilterState
  resultCount?: number
  onChange: (filters: FilterState) => void
  onClose: () => void
}

interface YearInputProps {
  label: string
  value: number | null
  defaultEra: 'BCE' | 'CE'
  onChange: (value: number | null) => void
}

function YearInput({ label, value, defaultEra, onChange }: YearInputProps) {
  const [emptyEra, setEmptyEra] = useState<'BCE' | 'CE'>(defaultEra)
  const era = value === null ? emptyEra : value < 0 ? 'BCE' : 'CE'
  const magnitude = value === null ? '' : Math.abs(value)

  const updateMagnitude = (raw: string) => {
    if (raw === '') { onChange(null); return }
    const number = Math.abs(Number(raw))
    if (!Number.isFinite(number) || number === 0) return
    onChange(era === 'BCE' ? -number : number)
  }

  const updateEra = (nextEra: 'BCE' | 'CE') => {
    setEmptyEra(nextEra)
    if (value !== null) onChange(nextEra === 'BCE' ? -Math.abs(value) : Math.abs(value))
  }

  return (
    <label className="year-input">
      <span>{label}</span>
      <span className="year-input-control">
        <input type="number" min="1" value={magnitude} placeholder="Any year" onChange={(event) => updateMagnitude(event.target.value)} aria-label={`${label} year`} />
        <select value={era} onChange={(event) => updateEra(event.target.value as 'BCE' | 'CE')} aria-label={`${label} era`}><option>BCE</option><option>CE</option></select>
      </span>
      {value !== null && <small>{formatYear(value)}</small>}
    </label>
  )
}

const toggleValue = <T extends string>(values: T[], value: T) =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]

const mainSections = sections.filter(({ kind }) => kind === 'chapter')
const supplementarySections = sections.filter(({ kind }) => kind !== 'chapter')

export default function FilterPanel({ filters, resultCount = settlements.length, onChange, onClose }: FilterPanelProps) {
  const [typeSearch, setTypeSearch] = useState('')
  const panelRef = useRef<HTMLElement>(null)
  useDialogFocus(panelRef)

  const visibleTypes = useMemo(() => {
    const query = typeSearch.trim().toLocaleLowerCase()
    return query ? settlementTypes.filter(({ type }) => type.toLocaleLowerCase().includes(query)) : settlementTypes
  }, [typeSearch])
  const categoryCounts = useMemo(() => Object.fromEntries(Object.keys(PLACE_CATEGORIES).map((category) => [
    category,
    settlements.filter((settlement) => categoriesForType(settlement.settlement_type).includes(category as PlaceCategoryId)).length,
  ])), [])

  return (
    <aside ref={panelRef} className="filter-panel" role="dialog" aria-modal="true" aria-labelledby="filter-title">
      <div className="drawer-header">
        <div><h2 id="filter-title">Filters</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close filters"><X /></button>
      </div>

      <div className="filter-content">
        <section className="filter-section section-filter">
          <div className="filter-section-heading"><h3>Book chapters</h3><span>{filters.sections.length || 'All'} selected</span></div>
          <div className="chapter-grid" aria-label="Book chapters">
            {mainSections.map(({ section, chapter }) => {
              const checked = filters.sections.includes(section)
              return <button type="button" className={checked ? 'filter-chip is-checked' : 'filter-chip'} aria-pressed={checked} key={section} onClick={() => onChange({ ...filters, sections: toggleValue(filters.sections, section) })}>Chapter {chapter}</button>
            })}
          </div>
          <details className="filter-details supplementary-filter">
            <summary><ChevronDown /> Notes and front matter <span>{supplementarySections.filter(({ section }) => filters.sections.includes(section)).length || ''}</span></summary>
            <div className="check-list">
              {supplementarySections.map(({ section, kind, count, chapter }) => {
                const checked = filters.sections.includes(section)
                return (
                  <label className={checked ? 'check-row section-row is-checked' : 'check-row section-row'} key={section}>
                    <input type="checkbox" checked={checked} onChange={() => onChange({ ...filters, sections: toggleValue(filters.sections, section) })} />
                    <span className="custom-check">{checked && <Check size={12} />}</span>
                    <span><b>{kind === 'front-matter' ? 'Front matter' : `Notes to Chapter ${chapter}`}</b><em>{section.replace(/^Notes to Chapter \d+: /, '')}</em></span>
                    <small>{count}</small>
                  </label>
                )
              })}
            </div>
          </details>
        </section>

        <section className="filter-section">
          <div className="filter-section-heading"><h3>Era</h3><span>Occupation overlap</span></div>
          <div className="era-grid">
            {(Object.entries(ERA_PRESETS) as [EraPresetId, (typeof ERA_PRESETS)[EraPresetId]][]).map(([id, definition]) => {
              const checked = filters.eras.includes(id)
              return <button type="button" className={checked ? 'era-option is-checked' : 'era-option'} aria-pressed={checked} key={id} onClick={() => onChange({ ...filters, eras: toggleValue(filters.eras, id) })}><strong>{definition.label}</strong><span>{definition.description}</span></button>
            })}
          </div>
        </section>

        <section className="filter-section">
          <div className="filter-section-heading"><h3>Place category</h3><span>{filters.categories.length || 'All'} selected</span></div>
          <div className="check-list category-list">
            {(Object.entries(PLACE_CATEGORIES) as [PlaceCategoryId, (typeof PLACE_CATEGORIES)[PlaceCategoryId]][]).map(([id, definition]) => {
              const checked = filters.categories.includes(id)
              return (
                <label className={checked ? 'check-row is-checked' : 'check-row'} key={id}>
                  <input type="checkbox" checked={checked} onChange={() => onChange({ ...filters, categories: toggleValue(filters.categories, id) })} />
                  <span className="custom-check">{checked && <Check size={12} />}</span><span>{definition.label}</span><small>{categoryCounts[id]}</small>
                </label>
              )
            })}
          </div>
          <details className="filter-details specific-types-filter">
            <summary><ChevronDown /> Specific types <span>{filters.types.length || ''}</span></summary>
            <label className="mini-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Search settlement types</span><input value={typeSearch} onChange={(event) => setTypeSearch(event.target.value)} placeholder="Find a type…" /></label>
            <div className="check-list type-list">
              {visibleTypes.map(({ type, count }) => {
                const checked = filters.types.includes(type)
                return (
                  <label className={checked ? 'check-row is-checked' : 'check-row'} key={type}>
                    <input type="checkbox" checked={checked} onChange={() => onChange({ ...filters, types: toggleValue(filters.types, type) })} />
                    <span className="custom-check">{checked && <Check size={12} />}</span><span>{type}</span><small>{count}</small>
                  </label>
                )
              })}
            </div>
          </details>
        </section>

        <section className="filter-section advanced-date-filter">
          <details className="filter-details">
            <summary><ChevronDown /> Advanced occupation dates</summary>
            <p className="filter-helper">Filter exact starts and ends. Existing shared links remain compatible.</p>
            <fieldset className="date-fieldset">
              <legend>Occupation started</legend>
              <div className="date-input-grid">
                <YearInput label="From" value={filters.startFrom} defaultEra="BCE" onChange={(startFrom) => onChange({ ...filters, startFrom })} />
                <YearInput label="To" value={filters.startTo} defaultEra="CE" onChange={(startTo) => onChange({ ...filters, startTo })} />
              </div>
              <label className="unknown-toggle"><input type="checkbox" checked={filters.includeUnknownStart} onChange={(event) => onChange({ ...filters, includeUnknownStart: event.target.checked })} />Include settlements with unknown start dates</label>
            </fieldset>
            <fieldset className="date-fieldset">
              <legend>Occupation ended</legend>
              <div className="date-input-grid">
                <YearInput label="From" value={filters.endFrom} defaultEra="BCE" onChange={(endFrom) => onChange({ ...filters, endFrom })} />
                <YearInput label="To" value={filters.endTo} defaultEra="CE" onChange={(endTo) => onChange({ ...filters, endTo })} />
              </div>
              <label className="unknown-toggle"><input type="checkbox" checked={filters.includeUnknownEnd} onChange={(event) => onChange({ ...filters, includeUnknownEnd: event.target.checked })} />Include settlements with unknown end dates</label>
            </fieldset>
          </details>
        </section>
      </div>

      <div className="drawer-footer">
        <button className="secondary-button" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}><RotateCcw size={16} /> Reset filters</button>
        <button className="primary-button" onClick={onClose}>View {resultCount} settlements</button>
      </div>
    </aside>
  )
}
