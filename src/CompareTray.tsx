import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Star, Trash2, X } from 'lucide-react'
import { formatDuration, type NormalizedSettlement } from './data'

interface CompareTrayProps {
  settlements: NormalizedSettlement[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onClear: () => void
}

const pinLetters = ['A', 'B', 'C', 'D']

const chapterCoverage = (settlement: NormalizedSettlement, chapter: number | null) => {
  if (chapter === null) return settlement.mentions.some((mention) => mention.section_kind === 'front-matter')
  return settlement.mentions.some((mention) => Number(mention.chapter_number) === chapter)
}

export default function CompareTray({ settlements, open, onOpenChange, onRemove, onMove, onClear }: CompareTrayProps) {
  if (settlements.length === 0) {
    return (
      <>
        <button className="compare-launcher is-empty" onClick={() => onOpenChange(true)} aria-label="Comparison tray, no settlements pinned">
          <Star /> <span><strong>Compare settlements</strong><small>Pin up to four from the atlas</small></span><b>0 / 4</b>
        </button>
        {open && (
          <aside className="compare-tray empty-compare-tray" role="dialog" aria-modal="true" aria-labelledby="empty-compare-title">
            <div className="drawer-header compare-header">
              <div><p className="eyebrow">Side by side</p><h2 id="empty-compare-title">Compare settlements</h2></div>
              <button className="icon-button" onClick={() => onOpenChange(false)} aria-label="Close comparison"><X /></button>
            </div>
            <div className="empty-state"><Star /><h2>Nothing pinned yet</h2><p>Close this tray, then use the star beside any settlement to add up to four places.</p><button className="primary-button" onClick={() => onOpenChange(false)}>Browse settlements</button></div>
          </aside>
        )}
      </>
    )
  }

  return (
    <>
      <div className="compare-launcher">
        <button className="compare-launcher-main" onClick={() => onOpenChange(!open)} aria-expanded={open}>
          <Star /> <span><strong>Comparison tray</strong><small>{settlements.map((settlement) => settlement.canonical_name).join(' · ')}</small></span><b>{settlements.length} / 4</b>
          {open ? <ChevronDown /> : <ChevronUp />}
        </button>
      </div>
      {open && (
        <aside className="compare-tray" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <div className="drawer-header compare-header">
            <div><p className="eyebrow">Side by side</p><h2 id="compare-title">Compare settlements</h2></div>
            <div className="compare-header-actions"><button className="text-button" onClick={onClear}><Trash2 /> Clear all</button><button className="icon-button" onClick={() => onOpenChange(false)} aria-label="Close comparison"><X /></button></div>
          </div>
          <div className="compare-content">
            <div className="compare-columns" style={{ '--compare-count': settlements.length } as React.CSSProperties}>
              <div className="compare-label-cell" />
              {settlements.map((settlement, index) => (
                <article className={`compare-place pin-${index}`} key={settlement.settlement_id}>
                  <span className="pin-letter">{pinLetters[index]}</span>
                  <h3>{settlement.canonical_name}</h3>
                  <div className="reorder-controls">
                    <button className="icon-button" disabled={index === 0} onClick={() => onMove(settlement.settlement_id, -1)} aria-label={`Move ${settlement.canonical_name} left`}><ArrowUp /></button>
                    <button className="icon-button" disabled={index === settlements.length - 1} onClick={() => onMove(settlement.settlement_id, 1)} aria-label={`Move ${settlement.canonical_name} right`}><ArrowDown /></button>
                    <button className="icon-button" onClick={() => onRemove(settlement.settlement_id)} aria-label={`Remove ${settlement.canonical_name} from comparison`}><X /></button>
                  </div>
                </article>
              ))}

              {[
                ['Type', (settlement: NormalizedSettlement) => settlement.settlement_type],
                ['Occupation', (settlement: NormalizedSettlement) => settlement.occupation_interval_display],
                ['Known span', (settlement: NormalizedSettlement) => formatDuration(settlement)],
                ['Aliases', (settlement: NormalizedSettlement) => settlement.aliases_in_book || '—'],
                ['Location', (settlement: NormalizedSettlement) => settlement.latitudeNumber === null ? 'Unresolved' : `${settlement.latitudeNumber.toFixed(2)}, ${settlement.longitudeNumber?.toFixed(2)}`],
                ['Book mentions', (settlement: NormalizedSettlement) => `${settlement.mention_paragraph_count} paragraphs`],
                ['Sections', (settlement: NormalizedSettlement) => `${settlement.sections.length} sections`],
                ['References', (settlement: NormalizedSettlement) => settlement.wikidata_id || settlement.wikipedia_url ? [settlement.wikidata_id, settlement.wikipedia_url ? 'Wikipedia' : ''].filter(Boolean).join(' · ') : '—'],
              ].map(([label, getter]) => (
                <div className="compare-row" key={label as string}>
                  <strong className="compare-row-label">{label as string}</strong>
                  {settlements.map((settlement) => <span key={settlement.settlement_id}>{(getter as (settlement: NormalizedSettlement) => string)(settlement)}</span>)}
                </div>
              ))}
            </div>

            <section className="coverage-matrix">
              <div className="detail-section-title"><h3>Chapter coverage</h3><span>● mentioned</span></div>
              <table>
                <thead><tr><th>Book section</th>{settlements.map((settlement, index) => <th key={settlement.settlement_id}><span className={`pin-letter pin-${index}`}>{pinLetters[index]}</span><span className="sr-only">{settlement.canonical_name}</span></th>)}</tr></thead>
                <tbody>
                  {[null, ...Array.from({ length: 12 }, (_, index) => index + 1)].map((chapter) => (
                    <tr key={chapter ?? 'front'}>
                      <th>{chapter === null ? 'Front matter' : `Chapter ${chapter}`}</th>
                      {settlements.map((settlement) => <td key={settlement.settlement_id}>{chapterCoverage(settlement, chapter) ? <><span aria-hidden="true">●</span><span className="sr-only">Mentioned</span></> : <><span aria-hidden="true">—</span><span className="sr-only">Not mentioned</span></>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </aside>
      )}
    </>
  )
}
