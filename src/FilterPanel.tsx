import { useMemo, useState } from 'react'
import { Check, RotateCcw, Search, X } from 'lucide-react'
import { formatYear, sections, settlementTypes } from './data'
import { EMPTY_FILTERS, type FilterState } from './filtering'

interface FilterPanelProps {
  filters: FilterState
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
    if (raw === '') {
      onChange(null)
      return
    }
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
        <input
          type="number"
          min="1"
          value={magnitude}
          placeholder="Any year"
          onChange={(event) => updateMagnitude(event.target.value)}
          aria-label={`${label} year`}
        />
        <select value={era} onChange={(event) => updateEra(event.target.value as 'BCE' | 'CE')} aria-label={`${label} era`}>
          <option>BCE</option>
          <option>CE</option>
        </select>
      </span>
      {value !== null && <small>{formatYear(value)}</small>}
    </label>
  )
}

const toggleValue = (values: string[], value: string) =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]

export default function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
  const [typeSearch, setTypeSearch] = useState('')
  const visibleTypes = useMemo(() => {
    const query = typeSearch.trim().toLocaleLowerCase()
    return query ? settlementTypes.filter(({ type }) => type.toLocaleLowerCase().includes(query)) : settlementTypes
  }, [typeSearch])

  return (
    <aside className="filter-panel" role="dialog" aria-modal="true" aria-labelledby="filter-title">
      <div className="drawer-header">
        <div><p className="eyebrow">Refine the atlas</p><h2 id="filter-title">Filters</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close filters"><X /></button>
      </div>

      <div className="filter-content">
        <section className="filter-section">
          <div className="filter-section-heading"><h3>Settlement type</h3><span>{filters.types.length || 'All'} selected</span></div>
          <label className="mini-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search settlement types</span>
            <input value={typeSearch} onChange={(event) => setTypeSearch(event.target.value)} placeholder="Find a type…" />
          </label>
          <div className="check-list type-list">
            {visibleTypes.map(({ type, count }) => {
              const checked = filters.types.includes(type)
              return (
                <label className={checked ? 'check-row is-checked' : 'check-row'} key={type}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange({ ...filters, types: toggleValue(filters.types, type) })}
                  />
                  <span className="custom-check">{checked && <Check size={12} />}</span>
                  <span>{type}</span><small>{count}</small>
                </label>
              )
            })}
          </div>
        </section>

        <section className="filter-section">
          <div className="filter-section-heading"><h3>Occupation dates</h3><span>Inclusive ranges</span></div>
          <fieldset className="date-fieldset">
            <legend>Occupation started</legend>
            <div className="date-input-grid">
              <YearInput label="From" value={filters.startFrom} defaultEra="BCE" onChange={(startFrom) => onChange({ ...filters, startFrom })} />
              <YearInput label="To" value={filters.startTo} defaultEra="CE" onChange={(startTo) => onChange({ ...filters, startTo })} />
            </div>
            <label className="unknown-toggle">
              <input type="checkbox" checked={filters.includeUnknownStart} onChange={(event) => onChange({ ...filters, includeUnknownStart: event.target.checked })} />
              Include settlements with unknown start dates
            </label>
          </fieldset>
          <fieldset className="date-fieldset">
            <legend>Occupation ended</legend>
            <div className="date-input-grid">
              <YearInput label="From" value={filters.endFrom} defaultEra="BCE" onChange={(endFrom) => onChange({ ...filters, endFrom })} />
              <YearInput label="To" value={filters.endTo} defaultEra="CE" onChange={(endTo) => onChange({ ...filters, endTo })} />
            </div>
            <label className="unknown-toggle">
              <input type="checkbox" checked={filters.includeUnknownEnd} onChange={(event) => onChange({ ...filters, includeUnknownEnd: event.target.checked })} />
              Include settlements with unknown end dates
            </label>
          </fieldset>
        </section>

        <section className="filter-section section-filter">
          <div className="filter-section-heading"><h3>Book chapters & sections</h3><span>{filters.sections.length || 'All'} selected</span></div>
          <div className="check-list">
            {sections.map(({ section, kind, count, chapter }) => {
              const checked = filters.sections.includes(section)
              return (
                <label className={checked ? 'check-row section-row is-checked' : 'check-row section-row'} key={section}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange({ ...filters, sections: toggleValue(filters.sections, section) })}
                  />
                  <span className="custom-check">{checked && <Check size={12} />}</span>
                  <span><b>{chapter === null ? 'Front matter' : `Chapter ${chapter}`}</b><em>{kind === 'notes' ? 'Notes' : kind === 'front-matter' ? 'Maps & figures' : section.replace(/^Chapter \d+: /, '')}</em></span>
                  <small>{count}</small>
                </label>
              )
            })}
          </div>
        </section>
      </div>

      <div className="drawer-footer">
        <button className="secondary-button" onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}><RotateCcw size={16} /> Reset filters</button>
        <button className="primary-button" onClick={onClose}>View settlements</button>
      </div>
    </aside>
  )
}
