import { csvParse } from 'd3'
import rawDataset from '../data/derived/dataset.json'
import rawSettlementAreas from '../data/research/settlement_areas.csv?raw'

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
  reference_url: string
  reference_url_kind: 'doi' | 'canonical' | 'repository' | 'catalog' | 'scholar_search'
  linked_book_note_ids: string
}

export interface Dataset {
  settlements: Settlement[]
  mentions: Mention[]
  references: Reference[]
  qa: Array<{ check: string; value: number; status: string }>
}

export type AreaResearchStatus = 'known' | 'unknown'

export interface AreaObservation {
  observation_id: string
  settlement_id: string
  canonical_name: string
  research_status: AreaResearchStatus
  period_start_year: number | null
  period_end_year: number | null
  period_label: string
  area_hectares_min: number | null
  area_hectares_max: number | null
  area_hectares_display: string
  area_km2_min: number | null
  area_km2_max: number | null
  area_km2_display: string
  qualifier: string
  area_basis: string
  is_preferred: boolean
  comparator_text: string
  comparator_reference_area_ha: number | null
  comparator_source_url: string
  source_tier: string
  source_type: string
  source_citation: string
  source_url: string
  source_locator: string
  confidence: string
  notes: string
  sourceOrder: number
}

export interface NormalizedSettlement extends Settlement {
  startYear: number | null
  endYear: number | null
  latitudeNumber: number | null
  longitudeNumber: number | null
  sections: string[]
  mentions: Mention[]
  areaObservations: AreaObservation[]
  searchText: string
}

export const dataset = rawDataset as Dataset
export const referenceByBibliographyKey = new Map(dataset.references.map((reference) => [reference.bibliography_key, reference]))

const parseOptionalNumber = (value: string | undefined) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const areaEstimateNumberFormatter = new Intl.NumberFormat('en-GB', {
  maximumSignificantDigits: 3,
})

export const formatAreaEstimate = (displayValue: string) => displayValue.replace(
  /\d+\.\d+/g,
  (value) => areaEstimateNumberFormatter.format(Number(value)),
)

export const areaObservations: AreaObservation[] = csvParse(rawSettlementAreas).map((row, sourceOrder) => ({
  observation_id: row.observation_id ?? '',
  settlement_id: row.settlement_id ?? '',
  canonical_name: row.canonical_name ?? '',
  research_status: row.research_status === 'known' ? 'known' : 'unknown',
  period_start_year: parseOptionalNumber(row.period_start_year),
  period_end_year: parseOptionalNumber(row.period_end_year),
  period_label: row.period_label ?? '',
  area_hectares_min: parseOptionalNumber(row.area_hectares_min),
  area_hectares_max: parseOptionalNumber(row.area_hectares_max),
  area_hectares_display: row.area_hectares_display ?? '',
  area_km2_min: parseOptionalNumber(row.area_km2_min),
  area_km2_max: parseOptionalNumber(row.area_km2_max),
  area_km2_display: row.area_km2_display ?? '',
  qualifier: row.qualifier ?? '',
  area_basis: row.area_basis ?? '',
  is_preferred: row.is_preferred?.toLocaleLowerCase() === 'true',
  comparator_text: row.comparator_text ?? '',
  comparator_reference_area_ha: parseOptionalNumber(row.comparator_reference_area_ha),
  comparator_source_url: row.comparator_source_url ?? '',
  source_tier: row.source_tier ?? '',
  source_type: row.source_type ?? '',
  source_citation: row.source_citation ?? '',
  source_url: row.source_url ?? '',
  source_locator: row.source_locator ?? '',
  confidence: row.confidence ?? '',
  notes: row.notes ?? '',
  sourceOrder,
}))

const canonicalSettlementIds = new Set(dataset.settlements.map((settlement) => settlement.settlement_id))
const unmatchedAreaIds = [...new Set(areaObservations
  .map((observation) => observation.settlement_id)
  .filter((id) => !canonicalSettlementIds.has(id)))]
if (unmatchedAreaIds.length > 0) throw new Error(`Settlement-area observations contain unknown IDs: ${unmatchedAreaIds.join(', ')}`)

const areasBySettlement = new Map<string, AreaObservation[]>()
areaObservations.forEach((observation) => {
  const entries = areasBySettlement.get(observation.settlement_id) ?? []
  entries.push(observation)
  areasBySettlement.set(observation.settlement_id, entries)
})

const missingAreaIds = dataset.settlements
  .map((settlement) => settlement.settlement_id)
  .filter((id) => !areasBySettlement.has(id))
if (missingAreaIds.length > 0) throw new Error(`Settlements without area research rows: ${missingAreaIds.join(', ')}`)

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
    areaObservations: areasBySettlement.get(settlement.settlement_id) ?? [],
    searchText,
  }
})

export const representativeAreaHectares = (observation: AreaObservation) => {
  const minimum = observation.area_hectares_min
  const maximum = observation.area_hectares_max
  if (minimum !== null && maximum !== null) return (minimum + maximum) / 2
  return minimum ?? maximum
}

const latestObservationYear = (observation: AreaObservation) =>
  observation.period_end_year ?? observation.period_start_year ?? Number.NEGATIVE_INFINITY

export const getPeakAreaObservation = (observations: AreaObservation[]) => observations
  .filter((observation) => observation.is_preferred && observation.research_status === 'known' && representativeAreaHectares(observation) !== null)
  .sort((a, b) => {
    const areaDifference = representativeAreaHectares(b)! - representativeAreaHectares(a)!
    if (areaDifference !== 0) return areaDifference
    const dateDifference = latestObservationYear(b) - latestObservationYear(a)
    if (dateDifference !== 0) return dateDifference
    return b.sourceOrder - a.sourceOrder
  })[0] ?? null

export interface RankedAreaSettlement {
  settlement: NormalizedSettlement
  observation: AreaObservation
  representativeAreaHectares: number
}

export const rankSettlementsByArea = (entries: NormalizedSettlement[]) => {
  const known: RankedAreaSettlement[] = []
  const unknown: NormalizedSettlement[] = []

  entries.forEach((settlement) => {
    const observation = getPeakAreaObservation(settlement.areaObservations)
    const representative = observation ? representativeAreaHectares(observation) : null
    if (!observation || representative === null) unknown.push(settlement)
    else known.push({ settlement, observation, representativeAreaHectares: representative })
  })

  known.sort((a, b) => b.representativeAreaHectares - a.representativeAreaHectares
    || a.settlement.canonical_name.localeCompare(b.settlement.canonical_name))
  unknown.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name))
  return { known, unknown }
}

export const MAX_REPRESENTATIVE_AREA_HECTARES = Math.max(
  ...rankSettlementsByArea(settlements).known.map(({ representativeAreaHectares: area }) => area),
)

export const areaBarPercentage = (areaHectares: number, maximum = MAX_REPRESENTATIVE_AREA_HECTARES) =>
  maximum <= 0 ? 0 : (Math.log1p(areaHectares) / Math.log1p(maximum)) * 100

export const settlementById = new Map(settlements.map((settlement) => [settlement.settlement_id, settlement]))
export const settlementByName = new Map(settlements.map((settlement) => [settlement.canonical_name, settlement]))

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
