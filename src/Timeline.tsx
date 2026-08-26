import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, Star } from 'lucide-react'
import type { NormalizedSettlement } from './data'
import { formatYear, settlements as allSettlements, YEAR_MAX, YEAR_MIN } from './data'

interface TimelineProps {
  settlements: NormalizedSettlement[]
  selectedId: string | null
  pinnedIds: string[]
  onSelect: (id: string) => void
  onPin: (id: string) => void
}

const densityBins = 64

export default function Timeline({ settlements, selectedId, pinnedIds, onSelect, onPin }: TimelineProps) {
  const [viewStart, setViewStart] = useState(YEAR_MIN)
  const [viewEnd, setViewEnd] = useState(YEAR_MAX)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  const density = useMemo(() => {
    const counts = Array.from({ length: densityBins }, () => 0)
    allSettlements.forEach((settlement) => {
      if (settlement.startYear === null) return
      const index = Math.min(densityBins - 1, Math.floor(((settlement.startYear - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * densityBins))
      counts[index] += 1
    })
    return counts
  }, [])
  const maxDensity = Math.max(...density)

  const sorted = useMemo(() => [...settlements].sort((a, b) => {
    if (a.startYear === null) return 1
    if (b.startYear === null) return -1
    return a.startYear - b.startYear || a.canonical_name.localeCompare(b.canonical_name)
  }), [settlements])

  useEffect(() => {
    if (!selectedId) return
    const selected = allSettlements.find((settlement) => settlement.settlement_id === selectedId)
    if (!selected) return
    rowRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (selected.startYear === null && selected.endYear === null) return
    const start = selected.startYear ?? selected.endYear!
    const end = selected.endYear ?? selected.startYear!
    if (start < viewStart || end > viewEnd) {
      const padding = Math.max(250, (end - start) * 0.35)
      setViewStart(Math.max(YEAR_MIN, Math.floor(start - padding)))
      setViewEnd(Math.min(YEAR_MAX, Math.ceil(end + padding)))
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (factor: number) => {
    const span = viewEnd - viewStart
    const midpoint = viewStart + span / 2
    const nextSpan = Math.max(200, Math.min(YEAR_MAX - YEAR_MIN, span * factor))
    let nextStart = Math.round(midpoint - nextSpan / 2)
    let nextEnd = Math.round(midpoint + nextSpan / 2)
    if (nextStart < YEAR_MIN) { nextEnd += YEAR_MIN - nextStart; nextStart = YEAR_MIN }
    if (nextEnd > YEAR_MAX) { nextStart -= nextEnd - YEAR_MAX; nextEnd = YEAR_MAX }
    setViewStart(Math.max(YEAR_MIN, nextStart))
    setViewEnd(Math.min(YEAR_MAX, nextEnd))
  }

  const position = (year: number) => ((year - viewStart) / (viewEnd - viewStart)) * 100
  const tickYears = Array.from({ length: 5 }, (_, index) => Math.round(viewStart + ((viewEnd - viewStart) * index) / 4))
  const brushLeft = ((viewStart - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100
  const brushRight = ((viewEnd - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100

  return (
    <section className="timeline-card" aria-labelledby="timeline-title">
      <div className="timeline-header">
        <div><h2 id="timeline-title">Occupation through time</h2></div>
        <div className="timeline-controls" aria-label="Timeline zoom controls">
          <button className="icon-button" onClick={() => zoom(0.55)} aria-label="Zoom timeline in"><Plus /></button>
          <button className="icon-button" onClick={() => zoom(1.8)} aria-label="Zoom timeline out"><Minus /></button>
          <button className="icon-button" onClick={() => { setViewStart(YEAR_MIN); setViewEnd(YEAR_MAX) }} aria-label="Reset timeline"><RotateCcw /></button>
        </div>
      </div>

      <div className="timeline-overview" aria-label={`Full timeline from ${formatYear(YEAR_MIN)} to ${formatYear(YEAR_MAX)}`}>
        <div className="density-bars" aria-hidden="true">
          {density.map((count, index) => <i key={index} style={{ height: `${Math.max(5, (count / maxDensity) * 100)}%` }} />)}
        </div>
        <div className="overview-shade overview-shade-left" style={{ width: `${brushLeft}%` }} />
        <div className="overview-shade overview-shade-right" style={{ left: `${brushRight}%` }} />
        <input
          className="overview-range range-start"
          type="range"
          min={YEAR_MIN}
          max={YEAR_MAX - 1}
          value={viewStart}
          aria-label="Timeline visible start year"
          onChange={(event) => setViewStart(Math.min(Number(event.target.value), viewEnd - 1))}
        />
        <input
          className="overview-range range-end"
          type="range"
          min={YEAR_MIN + 1}
          max={YEAR_MAX}
          value={viewEnd}
          aria-label="Timeline visible end year"
          onChange={(event) => setViewEnd(Math.max(Number(event.target.value), viewStart + 1))}
        />
      </div>
      <div className="overview-labels"><span>{formatYear(YEAR_MIN)}</span><strong>{formatYear(viewStart)} — {formatYear(viewEnd)}</strong><span>Present</span></div>

      <div className="timeline-axis" aria-hidden="true">
        <span />
        <div>{tickYears.map((year) => <i key={year} style={{ left: `${position(year)}%` }}><b>{formatYear(year)}</b></i>)}</div>
      </div>

      <div className="timeline-rows">
        {sorted.length === 0 && <p className="empty-message">No settlements match these filters.</p>}
        {sorted.map((settlement) => {
          const selected = settlement.settlement_id === selectedId
          const pinned = pinnedIds.includes(settlement.settlement_id)
          const knownStart = settlement.startYear ?? settlement.endYear
          const knownEnd = settlement.endYear ?? settlement.startYear
          const overlaps = knownStart !== null && knownEnd !== null && knownEnd >= viewStart && knownStart <= viewEnd
          const left = knownStart === null ? 0 : Math.max(0, Math.min(100, position(knownStart)))
          const right = knownEnd === null ? 100 : Math.max(0, Math.min(100, position(knownEnd)))
          return (
            <div
              className={selected ? 'timeline-row is-selected' : 'timeline-row'}
              key={settlement.settlement_id}
              ref={(element) => { if (element) rowRefs.current.set(settlement.settlement_id, element) }}
            >
              <button className="timeline-name" onClick={() => onSelect(settlement.settlement_id)}>
                <strong>{settlement.canonical_name}</strong><small>{settlement.occupation_interval_display}</small>
              </button>
              <div className="timeline-track">
                {overlaps ? (
                  <button
                    className={`timeline-span${settlement.startYear === null || settlement.endYear === null ? ' is-uncertain' : ''}`}
                    style={{ left: `${left}%`, width: `${Math.max(0.7, right - left)}%` }}
                    onClick={() => onSelect(settlement.settlement_id)}
                    aria-label={`${settlement.canonical_name}, ${settlement.occupation_interval_display}`}
                  />
                ) : <span className="outside-range">Outside view</span>}
              </div>
              <button
                className={pinned ? 'pin-icon is-pinned' : 'pin-icon'}
                disabled={!pinned && pinnedIds.length >= 4}
                title={!pinned && pinnedIds.length >= 4 ? 'Comparison is limited to four settlements' : undefined}
                onClick={() => onPin(settlement.settlement_id)}
                aria-label={pinned ? `Remove ${settlement.canonical_name} from comparison` : pinnedIds.length >= 4 ? `Comparison full; cannot add ${settlement.canonical_name}` : `Add ${settlement.canonical_name} to comparison`}
              ><Star /></button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
