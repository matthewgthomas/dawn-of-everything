import { useEffect, useMemo, useRef } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Star, Trash2, X } from 'lucide-react'
import { formatDuration, type NormalizedSettlement } from './data'
import { useDialogFocus } from './useDialogFocus'

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

const chapterLabels = (settlement: NormalizedSettlement) => [...new Set(settlement.mentions.map((mention) => {
  const chapter = Number(mention.chapter_number)
  return Number.isFinite(chapter) && chapter > 0 ? `Chapter ${chapter}` : 'Front matter'
}))]

const referenceCount = (settlement: NormalizedSettlement) => new Set(settlement.mentions.flatMap((mention) => mention.bibliography_keys ? mention.bibliography_keys.split(/\s*[|;]\s*/).filter(Boolean) : [])).size

export default function CompareTray({ settlements, open, onOpenChange, onRemove, onMove, onClear }: CompareTrayProps) {
  const trayRef = useRef<HTMLElement>(null)
  useDialogFocus(trayRef, open && settlements.length >= 2)

  useEffect(() => {
    if (open && settlements.length < 2) onOpenChange(false)
  }, [open, onOpenChange, settlements.length])

  const chapterRelationships = useMemo(() => {
    if (settlements.length < 2) return { shared: [], unique: [] as string[] }
    const chapterSets = settlements.map((settlement) => new Set(chapterLabels(settlement)))
    const shared = [...chapterSets[0]].filter((chapter) => chapterSets.every((set) => set.has(chapter)))
    const unique = [...new Set(chapterSets.flatMap((set) => [...set]))].filter((chapter) => chapterSets.filter((set) => set.has(chapter)).length === 1)
    return { shared, unique }
  }, [settlements])

  if (settlements.length === 0) return null

  if (settlements.length === 1) {
    const settlement = settlements[0]
    return (
      <div className="compare-launcher compare-launcher-single">
        <div className="compare-launcher-main"><Star /><span><strong>1 of 4 selected</strong><small>Add one more to compare</small></span><button onClick={() => onRemove(settlement.settlement_id)} aria-label={`Remove ${settlement.canonical_name} from comparison`}><X /> Remove</button></div>
      </div>
    )
  }

  return (
    <>
      <div className="compare-launcher">
        <button className="compare-launcher-main" onClick={() => onOpenChange(!open)} aria-expanded={open}>
          <Star /> <span><strong>Compare {settlements.length} settlements</strong><small>{settlements.map((settlement) => settlement.canonical_name).join(' · ')}</small></span><b>{settlements.length} / 4</b>
          {open ? <ChevronDown /> : <ChevronUp />}
        </button>
      </div>
      {open && (
        <aside ref={trayRef} className="compare-tray" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <div className="drawer-header compare-header">
            <div><p className="eyebrow">Side by side</p><h2 id="compare-title">Compare settlements</h2></div>
            <div className="compare-header-actions"><button className="text-button" onClick={onClear}><Trash2 /> Clear all</button><button className="icon-button" onClick={() => onOpenChange(false)} aria-label="Close comparison"><X /></button></div>
          </div>
          <div className="compare-content">
            <div className="compare-columns" style={{ '--compare-count': settlements.length } as React.CSSProperties}>
              <div className="compare-label-cell" />
              {settlements.map((settlement, index) => (
                <article className={`compare-place pin-${index}`} key={settlement.settlement_id}>
                  <span className="pin-letter">{pinLetters[index]}</span><h3>{settlement.canonical_name}</h3>
                  <div className="reorder-controls">
                    <button className="icon-button" disabled={index === 0} onClick={() => onMove(settlement.settlement_id, -1)} aria-label={`Move ${settlement.canonical_name} left`}><ArrowUp /></button>
                    <button className="icon-button" disabled={index === settlements.length - 1} onClick={() => onMove(settlement.settlement_id, 1)} aria-label={`Move ${settlement.canonical_name} right`}><ArrowDown /></button>
                    <button className="icon-button" onClick={() => onRemove(settlement.settlement_id)} aria-label={`Remove ${settlement.canonical_name} from comparison`}><X /></button>
                  </div>
                </article>
              ))}

              {[
                ['Place type', (settlement: NormalizedSettlement) => settlement.settlement_type],
                ['Occupation interval', (settlement: NormalizedSettlement) => settlement.occupation_interval_display],
                ['Known span', (settlement: NormalizedSettlement) => formatDuration(settlement)],
                ['Total book mentions', (settlement: NormalizedSettlement) => `${settlement.mention_paragraph_count} paragraphs`],
                ['Sections / chapters', (settlement: NormalizedSettlement) => chapterLabels(settlement).join(', ')],
                ['References', (settlement: NormalizedSettlement) => `${referenceCount(settlement)} linked reference${referenceCount(settlement) === 1 ? '' : 's'}`],
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
                <tbody>{[null, ...Array.from({ length: 12 }, (_, index) => index + 1)].map((chapter) => (
                  <tr key={chapter ?? 'front'}><th>{chapter === null ? 'Front matter' : `Chapter ${chapter}`}</th>{settlements.map((settlement) => <td key={settlement.settlement_id}>{chapterCoverage(settlement, chapter) ? <><span aria-hidden="true">●</span><span className="sr-only">Mentioned</span></> : <><span aria-hidden="true">—</span><span className="sr-only">Not mentioned</span></>}</td>)}</tr>
                ))}</tbody>
              </table>
            </section>

            <section className="chapter-relationships">
              <div><h3>Shared chapters</h3><p>{chapterRelationships.shared.join(', ') || 'No chapters shared by every selected settlement.'}</p></div>
              <div><h3>Unique chapters</h3><p>{chapterRelationships.unique.join(', ') || 'No chapters unique to a single selected settlement.'}</p></div>
            </section>

            <details className="additional-metadata"><summary>Additional metadata</summary>
              <div className="compare-columns compact" style={{ '--compare-count': settlements.length } as React.CSSProperties}>
                <div className="compare-label-cell" />{settlements.map((settlement) => <strong key={settlement.settlement_id}>{settlement.canonical_name}</strong>)}
                {[['Aliases', (settlement: NormalizedSettlement) => settlement.aliases_in_book || '—'], ['Coordinates', (settlement: NormalizedSettlement) => settlement.latitudeNumber === null ? 'Unresolved' : `${settlement.latitudeNumber.toFixed(2)}, ${settlement.longitudeNumber?.toFixed(2)}`]].map(([label, getter]) => <div className="compare-row" key={label as string}><strong className="compare-row-label">{label as string}</strong>{settlements.map((settlement) => <span key={settlement.settlement_id}>{(getter as (settlement: NormalizedSettlement) => string)(settlement)}</span>)}</div>)}
              </div>
            </details>
          </div>
        </aside>
      )}
    </>
  )
}
