import { BookOpen, Clock3, Ruler } from 'lucide-react'
import type { NormalizedSettlement } from './data'
import type { SettlementSearchResult } from './filtering'
import { ResultsContent } from './ResultsPanel'
import SettlementAreaComparison from './SettlementAreaComparison'
import Timeline, { type TimelinePresetId } from './Timeline'

export type SettlementPanelView = 'timeline' | 'area' | 'mentions'

interface SettlementViewsPanelProps {
  view: SettlementPanelView
  settlements: NormalizedSettlement[]
  searchResults: SettlementSearchResult[]
  query: string
  selectedId: string | null
  pinnedIds: string[]
  requestedPreset?: TimelinePresetId | null
  onViewChange: (view: SettlementPanelView) => void
  onSelect: (id: string) => void
  onSelectSearchResult: (result: SettlementSearchResult) => void
  onPin: (id: string) => void
  onReset: () => void
  onPresetApplied?: () => void
}

const viewLabels: Record<SettlementPanelView, string> = {
  timeline: 'Timeline',
  area: 'Settlement area',
  mentions: 'Book mentions',
}

export default function SettlementViewsPanel({
  view,
  settlements,
  searchResults,
  query,
  selectedId,
  pinnedIds,
  requestedPreset,
  onViewChange,
  onSelect,
  onSelectSearchResult,
  onPin,
  onReset,
  onPresetApplied,
}: SettlementViewsPanelProps) {
  return (
    <>
      <nav className="settlement-view-switcher" aria-label="Settlement list view">
        <button className={view === 'timeline' ? 'is-active' : ''} aria-pressed={view === 'timeline'} onClick={() => onViewChange('timeline')}><Clock3 /> Timeline</button>
        <button className={view === 'area' ? 'is-active' : ''} aria-pressed={view === 'area'} onClick={() => onViewChange('area')}><Ruler /> Settlement area</button>
        <button className={view === 'mentions' ? 'is-active' : ''} aria-pressed={view === 'mentions'} onClick={() => onViewChange('mentions')}><BookOpen /> Book mentions</button>
      </nav>
      <p className="sr-only" aria-live="polite">{viewLabels[view]} view showing {settlements.length} settlement{settlements.length === 1 ? '' : 's'}.</p>

      <div className={`settlement-view-content is-${view}`} role="region" aria-label={`${viewLabels[view]} settlement view`}>
        {view === 'timeline' && (
          <Timeline settlements={settlements} selectedId={selectedId} pinnedIds={pinnedIds} onSelect={onSelect} onPin={onPin} requestedPreset={requestedPreset} onPresetApplied={onPresetApplied} />
        )}
        {view === 'area' && (
          <SettlementAreaComparison settlements={settlements} selectedId={selectedId} pinnedIds={pinnedIds} onSelect={onSelect} onPin={onPin} onReset={onReset} />
        )}
        {view === 'mentions' && (
          <section className="mentions-view" aria-label="Settlements ranked by book mentions">
            <ResultsContent results={searchResults} query={query} selectedId={selectedId} compareIds={pinnedIds} onSelect={onSelectSearchResult} onPin={onPin} onReset={onReset} />
          </section>
        )}
      </div>
    </>
  )
}
