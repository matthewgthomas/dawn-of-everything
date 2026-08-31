import { Ruler, Search, Star } from 'lucide-react'
import {
  areaBarPercentage,
  formatAreaEstimate,
  rankSettlementsByArea,
  type NormalizedSettlement,
} from './data'

interface SettlementAreaComparisonProps {
  settlements: NormalizedSettlement[]
  selectedId: string | null
  pinnedIds: string[]
  onSelect: (id: string) => void
  onPin: (id: string) => void
  onReset: () => void
}

export default function SettlementAreaComparison({
  settlements,
  selectedId,
  pinnedIds,
  onSelect,
  onPin,
  onReset,
}: SettlementAreaComparisonProps) {
  const { known, unknown } = rankSettlementsByArea(settlements)

  return (
    <section className="area-comparison-card" aria-labelledby="area-comparison-title">
      <header className="area-comparison-header">
        <div>
          <h2 id="area-comparison-title"><Ruler aria-hidden="true" /> Settlement area</h2>
          <p>{known.length} of {settlements.length} filtered settlement{settlements.length === 1 ? '' : 's'} have an estimated size.</p>
        </div>
        <span className="area-scale-label">Logarithmic scale</span>
      </header>

      {settlements.length === 0 && (
        <div className="empty-state area-empty-state">
          <Search /><h2>No settlements found</h2><p>Try a broader search or remove some filters.</p>
          <button className="secondary-button" onClick={onReset}>Reset all</button>
        </div>
      )}

      {settlements.length > 0 && (
        <div className="area-comparison-list">
          {known.map(({ settlement, observation, representativeAreaHectares }) => {
            const selected = settlement.settlement_id === selectedId
            const pinIndex = pinnedIds.indexOf(settlement.settlement_id)
            const barWidth = areaBarPercentage(representativeAreaHectares)
            const hectaresDisplay = formatAreaEstimate(observation.area_hectares_display)
            const squareKilometresDisplay = formatAreaEstimate(observation.area_km2_display)
            return (
              <article className={selected ? 'area-comparison-row is-selected' : 'area-comparison-row'} key={settlement.settlement_id}>
                <button className="area-row-main" onClick={() => onSelect(settlement.settlement_id)}>
                  <span className="area-row-heading"><strong>{settlement.canonical_name}</strong><b>{hectaresDisplay}</b></span>
                  <span className="area-row-period">{observation.period_label}</span>
                  <span className="area-bar-track" role="img" aria-label={`${settlement.canonical_name}: ${hectaresDisplay}, displayed on a logarithmic scale`}>
                    <span className="area-bar" style={{ width: `${barWidth}%` }} />
                  </span>
                  <span className="area-row-values">{squareKilometresDisplay} <i aria-hidden="true">·</i> {observation.comparator_text}</span>
                </button>
                <button
                  className={pinIndex >= 0 ? `area-pin is-pinned pin-${pinIndex}` : 'area-pin'}
                  disabled={pinIndex < 0 && pinnedIds.length >= 4}
                  title={pinIndex < 0 && pinnedIds.length >= 4 ? 'Comparison is limited to four settlements' : undefined}
                  onClick={() => onPin(settlement.settlement_id)}
                  aria-label={`${pinIndex >= 0 ? 'Remove' : 'Add'} ${settlement.canonical_name} ${pinIndex >= 0 ? 'from' : 'to'} comparison`}
                >{pinIndex >= 0 ? String.fromCharCode(65 + pinIndex) : <Star />}</button>
              </article>
            )
          })}

          {unknown.length > 0 && (
            <details className="unknown-area-group" open={known.length === 0 || undefined}>
              <summary><span>Area not established</span><small>{unknown.length} settlement{unknown.length === 1 ? '' : 's'}</small></summary>
              <div>
                {unknown.map((settlement) => {
                  const selected = settlement.settlement_id === selectedId
                  const pinIndex = pinnedIds.indexOf(settlement.settlement_id)
                  return (
                    <article className={selected ? 'unknown-area-row is-selected' : 'unknown-area-row'} key={settlement.settlement_id}>
                      <button onClick={() => onSelect(settlement.settlement_id)}><strong>{settlement.canonical_name}</strong><span>{settlement.settlement_type}</span></button>
                      <button
                        className={pinIndex >= 0 ? `area-pin is-pinned pin-${pinIndex}` : 'area-pin'}
                        disabled={pinIndex < 0 && pinnedIds.length >= 4}
                        title={pinIndex < 0 && pinnedIds.length >= 4 ? 'Comparison is limited to four settlements' : undefined}
                        onClick={() => onPin(settlement.settlement_id)}
                        aria-label={`${pinIndex >= 0 ? 'Remove' : 'Add'} ${settlement.canonical_name} ${pinIndex >= 0 ? 'from' : 'to'} comparison`}
                      >{pinIndex >= 0 ? String.fromCharCode(65 + pinIndex) : <Star />}</button>
                    </article>
                  )
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
