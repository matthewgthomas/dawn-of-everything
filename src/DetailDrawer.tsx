import { Fragment, useMemo } from 'react'
import { ArrowUpRight, MapPinOff, Star, X } from 'lucide-react'
import type { Mention, NormalizedSettlement } from './data'
import SettlementLocationMap from './SettlementLocationMap'

interface DetailDrawerProps {
  settlement: NormalizedSettlement
  query: string
  pinned: boolean
  canPin: boolean
  onPin: () => void
  onClose: () => void
}

const highlightText = (text: string, query: string) => {
  const terms = query.trim().split(/\s+/).filter((term) => term.length > 2)
  if (!terms.length) return text
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(regex).map((part, index) =>
    terms.some((term) => part.toLocaleLowerCase() === term.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>,
  )
}

const groupMentions = (mentions: Mention[]) => {
  const groups = new Map<string, Mention[]>()
  mentions.forEach((mention) => {
    const entries = groups.get(mention.section) ?? []
    entries.push(mention)
    groups.set(mention.section, entries)
  })
  return [...groups.entries()]
}

export default function DetailDrawer({ settlement, query, pinned, canPin, onPin, onClose }: DetailDrawerProps) {
  const mentionGroups = useMemo(() => groupMentions(settlement.mentions), [settlement])
  const located = settlement.latitudeNumber !== null && settlement.longitudeNumber !== null

  return (
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail-hero">
        <div className="drawer-header detail-header">
          {/* <p className="eyebrow">Settlement record · {settlement.settlement_id}</p> */}
          <button className="icon-button on-dark" onClick={onClose} aria-label="Close settlement details"><X /></button>
        </div>
        <h2 id="detail-title">{settlement.canonical_name}</h2>
        <p className="detail-era">{settlement.occupation_interval_display}</p>
        <div className="detail-actions">
          <button className={pinned ? 'pin-button is-pinned' : 'pin-button'} disabled={!pinned && !canPin} onClick={onPin}>
            <Star size={16} /> {pinned ? 'Pinned for comparison' : canPin ? 'Pin for comparison' : 'Comparison full'}
          </button>
        </div>
      </div>

      <div className="detail-content">
        <p className="detail-description">{settlement.wikidata_description || `A ${settlement.settlement_type} mentioned in The Dawn of Everything.`}</p>

        {located && <SettlementLocationMap settlement={settlement} />}
        {!located && <div className="location-warning"><MapPinOff /><span><strong>Location unresolved</strong>This settlement remains browseable but is not plotted on the map.</span></div>}

        <dl className="metadata-grid">
          <div><dt>Settlement type</dt><dd>{settlement.settlement_type}</dd></div>
          <div><dt>Book mentions</dt><dd>{settlement.mention_paragraph_count} paragraphs</dd></div>
          <div><dt>Aliases in the book</dt><dd>{settlement.aliases_in_book || 'None recorded'}</dd></div>
          <div><dt>Occupation basis</dt><dd>{settlement.occupation_basis || 'Not specified'}</dd></div>
          <div><dt>Location precision</dt><dd>{located ? settlement.coordinate_precision : 'Unresolved'}</dd></div>
          <div><dt>Coordinates</dt><dd>{located ? `${settlement.latitudeNumber?.toFixed(3)}, ${settlement.longitudeNumber?.toFixed(3)}` : '—'}</dd></div>
        </dl>

        {(settlement.curation_note || settlement.coordinate_note) && (
          <section className="curator-note">
            <p className="eyebrow">Curator’s note</p>
            <p>{settlement.curation_note || settlement.coordinate_note}</p>
          </section>
        )}

        <section className="detail-section">
          <div className="detail-section-title"><h3>Appears in</h3><span>{settlement.sections.length} sections</span></div>
          <div className="section-chips">{settlement.sections.map((section) => <span key={section}>{section}</span>)}</div>
        </section>

        <section className="detail-section passages-section">
          <div className="detail-section-title"><h3>Passages from the book</h3><span>{settlement.mentions.length} paragraphs</span></div>
          {mentionGroups.map(([section, mentions]) => (
            <div className="mention-group" key={section}>
              <h4>{section}</h4>
              {mentions.map((mention) => (
                <article className="mention-card" key={mention.mention_id}>
                  <p>{highlightText(mention.complete_paragraph_text, query)}</p>
                  <div className="mention-meta"><span>{mention.paragraph_id}</span><span>Lines {mention.source_line_start}–{mention.source_line_end}</span></div>
                  {(mention.book_note_texts || mention.full_bibliography_entries) && (
                    <details>
                      <summary>Notes & bibliography</summary>
                      {mention.book_note_texts && <div><b>Book notes</b><p>{mention.book_note_texts}</p></div>}
                      {mention.full_bibliography_entries && <div><b>Bibliography</b><p>{mention.full_bibliography_entries}</p></div>}
                    </details>
                  )}
                </article>
              ))}
            </div>
          ))}
        </section>

        <div className="external-links">
          {settlement.wikipedia_url && <a href={settlement.wikipedia_url} target="_blank" rel="noreferrer">Wikipedia <ArrowUpRight /></a>}
          {settlement.wikidata_url && <a href={settlement.wikidata_url} target="_blank" rel="noreferrer">Wikidata <ArrowUpRight /></a>}
        </div>
      </div>
    </aside>
  )
}
