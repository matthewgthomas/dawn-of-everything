import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, BookOpen, MapPinOff, Star, X } from 'lucide-react'
import type { Mention, NormalizedSettlement } from './data'
import HighlightedText from './HighlightedText'
import SettlementLocationMap from './SettlementLocationMap'
import { useDialogFocus } from './useDialogFocus'

export type DetailView = 'overview' | 'passages' | 'references'

interface DetailDrawerProps {
  settlement: NormalizedSettlement
  query: string
  initialView?: DetailView
  matchingMentionIds?: string[]
  bestMentionId?: string | null
  pinned: boolean
  canPin: boolean
  onPin: () => void
  onClose: () => void
}

const isSubstantive = (mention: Mention) => mention.section_kind === 'chapter'

const groupMentions = (mentions: Mention[], matchingIds: Set<string>) => {
  const groups = new Map<string, Mention[]>()
  mentions.forEach((mention) => {
    const entries = groups.get(mention.section) ?? []
    entries.push(mention)
    groups.set(mention.section, entries)
  })
  return [...groups.entries()]
    .map(([section, entries]) => [section, [...entries].sort((a, b) => Number(matchingIds.has(b.mention_id)) - Number(matchingIds.has(a.mention_id)) || a.source_line_start - b.source_line_start)] as const)
    .sort(([, a], [, b]) => Number(b.some((mention) => matchingIds.has(mention.mention_id))) - Number(a.some((mention) => matchingIds.has(mention.mention_id))) || a[0].source_line_start - b[0].source_line_start)
}

export default function DetailDrawer({
  settlement,
  query,
  initialView = 'overview',
  matchingMentionIds = [],
  bestMentionId = null,
  pinned,
  canPin,
  onPin,
  onClose,
}: DetailDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null)
  const [view, setView] = useState<DetailView>(initialView)
  const matchingIds = useMemo(() => new Set(matchingMentionIds), [matchingMentionIds])
  const mentionGroups = useMemo(() => groupMentions(settlement.mentions, matchingIds), [matchingIds, settlement.mentions])
  const firstSubstantiveGroup = mentionGroups.find(([, mentions]) => mentions.some(isSubstantive))?.[0] ?? mentionGroups[0]?.[0]
  const [openGroups, setOpenGroups] = useState(() => new Set([
    ...(firstSubstantiveGroup ? [firstSubstantiveGroup] : []),
    ...mentionGroups.filter(([, mentions]) => mentions.some((mention) => matchingIds.has(mention.mention_id))).map(([section]) => section),
  ]))
  const located = settlement.latitudeNumber !== null && settlement.longitudeNumber !== null
  const featuredMention = useMemo(() => [...settlement.mentions]
    .filter(isSubstantive)
    .sort((a, b) => Number(b.complete_paragraph_text.length > 120) - Number(a.complete_paragraph_text.length > 120) || a.source_line_start - b.source_line_start)[0]
    ?? settlement.mentions[0], [settlement.mentions])
  const references = useMemo(() => [...new Set(settlement.mentions.flatMap((mention) => mention.full_bibliography_entries ? [mention.full_bibliography_entries] : []))], [settlement.mentions])
  const notes = useMemo(() => [...new Set(settlement.mentions.flatMap((mention) => mention.book_note_texts ? [mention.book_note_texts] : []))], [settlement.mentions])
  const hasReferences = references.length > 0 || notes.length > 0

  useDialogFocus(drawerRef)

  useEffect(() => {
    if (view !== 'passages' || !bestMentionId) return
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`mention-${bestMentionId}`)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
      target?.focus({ preventScroll: true })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [bestMentionId, view])

  const setGroupOpen = (section: string, open: boolean) => setOpenGroups((current) => {
    const next = new Set(current)
    if (open) next.add(section)
    else next.delete(section)
    return next
  })

  return (
    <aside ref={drawerRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="detail-hero">
        <div className="drawer-header detail-header">
          <h2 id="detail-title">{settlement.canonical_name}</h2>
          <button className="icon-button on-dark" onClick={onClose} aria-label="Close settlement details"><X /></button>
        </div>
        <div className="detail-meta">
          <p className="detail-era">{settlement.occupation_interval_display}</p>
          <div className="detail-actions">
            <button className={pinned ? 'pin-button is-pinned' : 'pin-button'} disabled={!pinned && !canPin} title={!pinned && !canPin ? 'Comparison is limited to four settlements' : undefined} onClick={onPin}>
              <Star size={16} /> {pinned ? 'Pinned for comparison' : canPin ? 'Pin for comparison' : 'Comparison full (4 of 4)'}
            </button>
          </div>
        </div>
      </div>

      <nav className="detail-nav" aria-label={`${settlement.canonical_name} details`}>
        <button className={view === 'overview' ? 'is-active' : ''} aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}>Overview</button>
        <button className={view === 'passages' ? 'is-active' : ''} aria-current={view === 'passages' ? 'page' : undefined} onClick={() => setView('passages')}>Passages ({settlement.mentions.length})</button>
        {hasReferences && <button className={view === 'references' ? 'is-active' : ''} aria-current={view === 'references' ? 'page' : undefined} onClick={() => setView('references')}>References</button>}
      </nav>

      <div className="detail-content">
        {view === 'overview' && (
          <div className="detail-view overview-view">
            <p className="detail-description">{settlement.wikidata_description || `A ${settlement.settlement_type} mentioned in The Dawn of Everything.`}</p>

            {featuredMention && (
              <article className="featured-passage">
                <div><BookOpen aria-hidden="true" /><span>Featured passage</span><small>{featuredMention.section}</small></div>
                <p><HighlightedText text={featuredMention.complete_paragraph_text} query={query} /></p>
              </article>
            )}

            <section className="appears-summary">
              <div className="detail-section-title"><h3>Appears in</h3><span>{settlement.sections.length} sections</span></div>
              <div className="section-chips">{settlement.sections.map((section) => <span key={section}>{section}</span>)}</div>
            </section>

            {located && <SettlementLocationMap settlement={settlement} />}
            {!located && <div className="location-warning"><MapPinOff /><span><strong>Location unresolved</strong>This settlement remains browseable but is not plotted on the map.</span></div>}

            <dl className="metadata-grid">
              <div><dt>Place type</dt><dd>{settlement.settlement_type}</dd></div>
              <div><dt>Book mentions</dt><dd>{settlement.mention_paragraph_count} paragraphs</dd></div>
              <div><dt>Aliases in the book</dt><dd>{settlement.aliases_in_book || 'None recorded'}</dd></div>
              <div><dt>Occupation basis</dt><dd>{settlement.occupation_basis || 'Not specified'}</dd></div>
              <div><dt>Location precision</dt><dd>{located ? settlement.coordinate_precision : 'Unresolved'}</dd></div>
              <div><dt>Coordinates</dt><dd>{located ? `${settlement.latitudeNumber?.toFixed(3)}, ${settlement.longitudeNumber?.toFixed(3)}` : '—'}</dd></div>
            </dl>

            {(settlement.curation_note || settlement.coordinate_note) && (
              <section className="curator-note"><p className="eyebrow">Curation and location note</p><p>{[settlement.curation_note, settlement.coordinate_note].filter(Boolean).join(' ')}</p></section>
            )}

            <div className="external-links">
              {settlement.wikipedia_url && <a href={settlement.wikipedia_url} target="_blank" rel="noreferrer">Wikipedia <ArrowUpRight /></a>}
              {settlement.wikidata_url && <a href={settlement.wikidata_url} target="_blank" rel="noreferrer">Wikidata <ArrowUpRight /></a>}
            </div>
          </div>
        )}

        {view === 'passages' && (
          <section className="detail-view passages-section" aria-labelledby="passages-title">
            <div className="detail-section-title"><h3 id="passages-title">Passages from the book</h3><span>{settlement.mentions.length} paragraphs</span></div>
            {matchingIds.size > 0 && <p className="matching-passages-summary" role="status"><strong>{matchingIds.size} matching passage{matchingIds.size === 1 ? '' : 's'}</strong> shown first within the matching sections.</p>}
            {mentionGroups.map(([section, mentions]) => {
              const matchesInGroup = mentions.filter((mention) => matchingIds.has(mention.mention_id)).length
              const isOpen = openGroups.has(section)
              return (
                <details className="mention-group" key={section} open={isOpen} onToggle={(event) => setGroupOpen(section, event.currentTarget.open)}>
                  <summary><span>{section}</span><small>{mentions.length} passage{mentions.length === 1 ? '' : 's'}{matchesInGroup ? ` · ${matchesInGroup} matching` : ''}</small></summary>
                  <div className="mention-group-content">
                    {mentions.map((mention) => (
                      <article className={matchingIds.has(mention.mention_id) ? 'mention-card is-match' : 'mention-card'} id={`mention-${mention.mention_id}`} tabIndex={-1} key={mention.mention_id}>
                        {matchingIds.has(mention.mention_id) && <span className="match-label">Search match</span>}
                        <p><HighlightedText text={mention.complete_paragraph_text} query={query} /></p>
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
                </details>
              )
            })}
          </section>
        )}

        {view === 'references' && hasReferences && (
          <section className="detail-view references-view" aria-labelledby="references-title">
            <div className="detail-section-title"><h3 id="references-title">References</h3><span>{references.length + notes.length} entries</span></div>
            {notes.length > 0 && <div className="reference-group"><h4>Book notes</h4>{notes.map((note) => <p key={note}>{note}</p>)}</div>}
            {references.length > 0 && <div className="reference-group"><h4>Bibliography</h4>{references.map((reference) => <p key={reference}>{reference}</p>)}</div>}
          </section>
        )}
      </div>
    </aside>
  )
}
