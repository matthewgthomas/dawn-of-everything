import { Search, Star } from 'lucide-react'
import HighlightedText from './HighlightedText'
import { searchTerms, type SettlementSearchResult } from './filtering'

interface ResultsContentProps {
  results: SettlementSearchResult[]
  query: string
  selectedId: string | null
  compareIds: string[]
  onSelect: (result: SettlementSearchResult) => void
  onPin: (id: string) => void
  onReset: () => void
}

const joinList = (values: string[]) => values.length < 2
  ? values[0] ?? ''
  : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`

const passageExplanation = (result: SettlementSearchResult) => {
  const chapters = [...new Set(result.matchingMentions.map((mention) => {
    const chapter = Number(mention.chapter_number)
    return Number.isFinite(chapter) && chapter > 0 ? String(chapter) : mention.section
  }))]
  const passageLabel = `${result.matchingMentions.length} matching passage${result.matchingMentions.length === 1 ? '' : 's'}`
  if (!chapters.length) return passageLabel
  const allNumbered = chapters.every((chapter) => /^\d+$/.test(chapter))
  return `${passageLabel} in ${allNumbered ? `Chapter${chapters.length === 1 ? '' : 's'} ${joinList(chapters)}` : joinList(chapters)}`
}

const matchExplanation = (result: SettlementSearchResult, query: string) => {
  if (result.matchSource === 'passage') return passageExplanation(result)
  if (result.matchSource === 'name') return 'Name match'
  if (result.matchSource === 'alias') return 'Alias match'
  if (result.matchSource === 'type') return 'Place type match'
  if (result.matchSource === 'description') return 'Description match'
  if (result.matchSource === 'section') {
    const terms = searchTerms(query)
    const section = result.settlement.sections.find((entry) => terms.every((term) => entry.toLocaleLowerCase().includes(term)))
    return section ? `Mentioned in ${section}` : 'Book section match'
  }
  return `${result.settlement.mention_paragraph_count} book mentions`
}

export function ResultsContent({ results, query, selectedId, compareIds, onSelect, onPin, onReset }: ResultsContentProps) {
  const searching = Boolean(query.trim())
  return (
    <>
      <div className="panel-label">
        <span>{searching ? 'Search results' : 'Browse settlements'}</span>
        <span>{searching ? 'Sorted by relevance' : 'Ranked by mentions'}</span>
      </div>
      <div className="result-list">
        {results.length === 0 && (
          <div className="empty-state"><Search /><h2>No settlements found</h2><p>Try a broader search or remove some filters.</p><button className="secondary-button" onClick={onReset}>Reset all</button></div>
        )}
        {results.map((result) => {
          const { settlement } = result
          const selectedResult = settlement.settlement_id === selectedId
          const pinIndex = compareIds.indexOf(settlement.settlement_id)
          return (
            <article className={selectedResult ? 'result-card is-selected' : 'result-card'} key={settlement.settlement_id}>
              <button className="result-card-main" onClick={() => onSelect(result)}>
                <span className="result-card-top"><strong>{settlement.canonical_name}</strong>{!searching && <span aria-label={`${settlement.mention_paragraph_count} mentions`}>{settlement.mention_paragraph_count}</span>}</span>
                <span className="result-card-type">{settlement.settlement_type} · {settlement.occupation_interval_display}</span>
                {searching && <span className="match-explanation">{matchExplanation(result, query)}</span>}
                {searching && result.matchSource === 'passage' && result.excerpt && (
                  <span className="result-excerpt"><HighlightedText text={result.excerpt} query={query} /></span>
                )}
                {searching && <span className="result-mentions">{settlement.mention_paragraph_count} total book mention{settlement.mention_paragraph_count === 1 ? '' : 's'}</span>}
                {settlement.latitudeNumber === null && <span className="unlocated-tag">Location unresolved</span>}
              </button>
              <button
                className={pinIndex >= 0 ? `result-pin is-pinned pin-${pinIndex}` : 'result-pin'}
                disabled={pinIndex < 0 && compareIds.length >= 4}
                title={pinIndex < 0 && compareIds.length >= 4 ? 'Comparison is limited to four settlements' : undefined}
                onClick={() => onPin(settlement.settlement_id)}
                aria-label={`${pinIndex >= 0 ? 'Remove' : 'Add'} ${settlement.canonical_name} ${pinIndex >= 0 ? 'from' : 'to'} comparison`}
              >{pinIndex >= 0 ? String.fromCharCode(65 + pinIndex) : <Star />}</button>
            </article>
          )
        })}
      </div>
    </>
  )
}
