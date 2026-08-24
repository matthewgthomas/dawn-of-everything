import rawDataset from '../data/derived/dataset.json'

export interface Settlement {
  settlement_id: string
  canonical_name: string
  aliases_in_book: string
  settlement_type: string
  latitude: string
  longitude: string
  coordinate_note: string
  coordinate_precision: string
  coordinate_source_url: string
  wikidata_id: string
  wikidata_url: string
  wikipedia_url: string
  wikidata_description: string
  entity_resolution_score: number
  occupation_start_year: string
  occupation_end_year: string
  occupation_interval_display: string
  occupation_qualifier: string
  occupation_basis: string
  curation_note: string
  mention_paragraph_count: number
  sections_mentioned: string
  first_source_line: number
  last_source_line: number
}

export interface Mention {
  mention_id: string
  settlement_id: string
  canonical_name: string
  matched_aliases: string
  paragraph_id: string
  source_line_start: number
  source_line_end: number
  section: string
  section_kind: string
  chapter_number: number | string
  complete_paragraph_text: string
  book_note_ids: string
  book_note_texts: string
  bibliography_keys: string
  full_bibliography_entries: string
}

export interface Reference {
  reference_id: string
  bibliography_key: string
  full_bibliography_entry: string
  linked_book_note_ids: string
}

export interface Dataset {
  settlements: Settlement[]
  mentions: Mention[]
  references: Reference[]
  qa: Array<{ check: string; value: number; status: string }>
}

export interface NormalizedSettlement extends Settlement {
  startYear: number | null
  endYear: number | null
  latitudeNumber: number | null
  longitudeNumber: number | null
  sections: string[]
  mentions: Mention[]
  searchText: string
}

export const dataset = rawDataset as Dataset

const mentionsBySettlement = new Map<string, Mention[]>()
dataset.mentions.forEach((mention) => {
  const entries = mentionsBySettlement.get(mention.settlement_id) ?? []
  entries.push(mention)
  mentionsBySettlement.set(mention.settlement_id, entries)
})

const parseNumber = (value: string) => (value === '' ? null : Number(value))

export const settlements: NormalizedSettlement[] = dataset.settlements.map((settlement) => {
  const mentions = mentionsBySettlement.get(settlement.settlement_id) ?? []
  const sections = [...new Set(mentions.map((mention) => mention.section))]
  const searchText = [
    settlement.canonical_name,
    settlement.aliases_in_book,
    settlement.settlement_type,
    settlement.wikidata_description,
    sections.join(' '),
    mentions.map((mention) => mention.complete_paragraph_text).join(' '),
  ]
    .join(' ')
    .toLocaleLowerCase()

  return {
    ...settlement,
    startYear: parseNumber(settlement.occupation_start_year),
    endYear: parseNumber(settlement.occupation_end_year),
    latitudeNumber: parseNumber(settlement.latitude),
    longitudeNumber: parseNumber(settlement.longitude),
    sections,
    mentions,
    searchText,
  }
})

export const settlementById = new Map(settlements.map((settlement) => [settlement.settlement_id, settlement]))

export const settlementTypes = [...new Set(settlements.map((settlement) => settlement.settlement_type))]
  .map((type) => ({
    type,
    count: settlements.filter((settlement) => settlement.settlement_type === type).length,
  }))
  .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))

export const sections = [...new Set(dataset.mentions.map((mention) => mention.section))]
  .map((section) => {
    const mention = dataset.mentions.find((entry) => entry.section === section)!
    return {
      section,
      kind: mention.section_kind,
      chapter: mention.chapter_number === '' ? null : Number(mention.chapter_number),
      count: dataset.mentions.filter((entry) => entry.section === section).length,
    }
  })
  .sort((a, b) => {
    if (a.chapter === null) return -1
    if (b.chapter === null) return 1
    return a.chapter - b.chapter || a.kind.localeCompare(b.kind)
  })

export const YEAR_MIN = Math.min(...settlements.flatMap((settlement) =>
  [settlement.startYear, settlement.endYear].filter((year): year is number => year !== null),
))

export const YEAR_MAX = Math.max(...settlements.flatMap((settlement) =>
  [settlement.startYear, settlement.endYear].filter((year): year is number => year !== null),
))

export const formatYear = (year: number | null) => {
  if (year === null) return 'Unknown'
  if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`
  return `${year.toLocaleString()} CE`
}

export const formatDuration = (settlement: NormalizedSettlement) => {
  if (settlement.startYear === null || settlement.endYear === null) return 'Unknown'
  const crossesEraBoundary = settlement.startYear < 0 && settlement.endYear > 0
  const years = settlement.endYear - settlement.startYear - Number(crossesEraBoundary)
  if (years >= 1000) return `${(years / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} millennia`
  return `${years.toLocaleString()} years`
}
