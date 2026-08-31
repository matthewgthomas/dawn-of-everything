import type { Mention, NormalizedSettlement } from './data'

export const ERA_PRESETS = {
  earliest: { label: 'Earliest sites', description: 'Before 10,000 BCE', start: null, end: -10001 },
  'early-settled': { label: 'Early settled life', description: '10,000–4,000 BCE', start: -10000, end: -4000 },
  'first-cities': { label: 'First cities', description: '4,000–1,000 BCE', start: -4000, end: -1000 },
  'ancient-classical': { label: 'Ancient and classical', description: '1,000 BCE–500 CE', start: -1000, end: 500 },
  later: { label: 'Later settlements', description: '500 CE–present', start: 500, end: null },
  unknown: { label: 'Unknown occupation', description: 'No known occupation dates', start: null, end: null },
} as const

export type EraPresetId = keyof typeof ERA_PRESETS

export const PLACE_CATEGORIES = {
  cities: {
    label: 'Cities and urban centres',
    types: [
      'ancient and modern city', 'ancient and modern port city', 'ancient city', 'city-state',
      'mega-settlement', 'modern and ancient city', 'modern city', 'Toltec city', 'urban settlement',
    ],
  },
  villages: {
    label: 'Towns and villages',
    types: [
      'ancient town', 'capital village', 'large Neolithic settlement', 'large settlement', 'modern town',
      'modern village', 'royal village', 'seasonal town', 'village', 'walled town', "workers' settlement",
    ],
  },
  seasonal: {
    label: 'Seasonal and aggregation sites',
    types: [
      'Upper Palaeolithic aggregation settlement', 'aggregation and monument site', 'aggregation and mound site',
      'cave habitation and aggregation site', 'ceremonial and aggregation centre',
      'seasonal aggregation and monument complex', 'seasonal aggregation settlement', 'seasonal aggregation site',
      'seasonal town',
    ],
  },
  ceremonial: {
    label: 'Ceremonial and monument sites',
    types: [
      'aggregation and monument site', 'aggregation and mound site', 'ancient settlement and necropolis',
      'burial and habitation locality', 'cave habitation and burial site', 'ceremonial and aggregation centre',
      'ceremonial and residential centre', 'seasonal aggregation and monument complex', 'settlement and cemetery',
      'settlement and ceremonial centre', 'settlement and monument site', 'shell-mound capital',
    ],
  },
  landscape: {
    label: 'Caves and open-air sites',
    types: [
      'cave activity site', 'cave archaeological site', 'cave habitation and aggregation site',
      'cave habitation and burial site', 'open-air settlement', 'open-air settlement complex',
    ],
  },
  centres: {
    label: 'Fortified, capital, and trading centres',
    types: [
      'Shang capital', 'capital settlement', 'capital village', 'city-state', 'fortified trading settlement',
      'modern and historic capital', 'regional centre', 'royal village', 'settlement and capital',
      'shell-mound capital', 'trading settlement', 'walled city', 'walled settlement', 'walled town',
    ],
  },
  other: {
    label: 'Other or unresolved',
    types: [
      'Mesolithic coastal settlement', 'ancient settlement', 'archaeological settlement', 'burial and habitation locality',
      'historical settlement', 'open-air settlement complex', 'settlement', 'settlement and cemetery',
      'unlocated historical or legendary settlement',
    ],
  },
} as const

export type PlaceCategoryId = keyof typeof PLACE_CATEGORIES

const categoriesByType = new Map<string, PlaceCategoryId[]>()
Object.entries(PLACE_CATEGORIES).forEach(([category, definition]) => {
  definition.types.forEach((type) => {
    const categories = categoriesByType.get(type) ?? []
    categories.push(category as PlaceCategoryId)
    categoriesByType.set(type, categories)
  })
})

export const categoriesForType = (type: string) => categoriesByType.get(type) ?? []

export interface FilterState {
  query: string
  settlementIds: string[]
  types: string[]
  sections: string[]
  eras: EraPresetId[]
  categories: PlaceCategoryId[]
  startFrom: number | null
  startTo: number | null
  endFrom: number | null
  endTo: number | null
  includeUnknownStart: boolean
  includeUnknownEnd: boolean
}

export interface UrlState {
  filters: FilterState
  selectedId: string | null
  compareIds: string[]
}

export type MatchSource = 'name' | 'alias' | 'type' | 'section' | 'description' | 'passage'

export interface SettlementSearchResult {
  settlement: NormalizedSettlement
  matchSource: MatchSource | null
  matchingMentions: Mention[]
  bestMention: Mention | null
  excerpt: string | null
  rank: number
  matchScore: number
}

export interface SettlementNameSuggestion {
  settlement: NormalizedSettlement
  matchingAlias: string | null
  rank: number
}

export const EMPTY_FILTERS: FilterState = {
  query: '',
  settlementIds: [],
  types: [],
  sections: [],
  eras: [],
  categories: [],
  startFrom: null,
  startTo: null,
  endFrom: null,
  endTo: null,
  includeUnknownStart: true,
  includeUnknownEnd: true,
}

export const normalizeSearchText = (value: string) => value
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/\p{M}/gu, '')

const normalize = normalizeSearchText
export const searchTerms = (rawQuery: string) => normalize(rawQuery.trim()).split(/\s+/u).filter(Boolean)
const containsTerms = (text: string, terms: string[]) => {
  const normalized = normalize(text)
  return terms.every((term) => normalized.includes(term))
}

const termScore = (text: string, terms: string[]) => {
  const normalized = normalize(text)
  return terms.reduce((score, term) => {
    let index = 0
    let matches = 0
    while ((index = normalized.indexOf(term, index)) >= 0) {
      matches += 1
      index += Math.max(1, term.length)
    }
    return score + matches
  }, 0)
}

const aliasesForSettlement = (settlement: NormalizedSettlement) => settlement.aliases_in_book
  .split('|')
  .map((alias) => alias.trim())
  .filter((alias) => alias && normalize(alias) !== normalize(settlement.canonical_name))

export const deriveSettlementNameSuggestions = (
  entries: NormalizedSettlement[],
  rawQuery: string,
): SettlementNameSuggestion[] => {
  const query = normalize(rawQuery.trim())
  return entries.flatMap((settlement): SettlementNameSuggestion[] => {
    if (!query) return [{ settlement, matchingAlias: null, rank: 6 }]

    const canonicalName = normalize(settlement.canonical_name)
    const aliases = aliasesForSettlement(settlement)
    const exactAlias = aliases.find((alias) => normalize(alias) === query)
    const prefixAlias = aliases.find((alias) => normalize(alias).startsWith(query))
    const containingAlias = aliases.find((alias) => normalize(alias).includes(query))

    if (canonicalName === query) return [{ settlement, matchingAlias: null, rank: 0 }]
    if (exactAlias) return [{ settlement, matchingAlias: exactAlias, rank: 1 }]
    if (canonicalName.startsWith(query)) return [{ settlement, matchingAlias: null, rank: 2 }]
    if (prefixAlias) return [{ settlement, matchingAlias: prefixAlias, rank: 3 }]
    if (canonicalName.includes(query)) return [{ settlement, matchingAlias: null, rank: 4 }]
    if (containingAlias) return [{ settlement, matchingAlias: containingAlias, rank: 5 }]
    return []
  }).sort((a, b) => a.rank - b.rank
    || a.settlement.canonical_name.localeCompare(b.settlement.canonical_name))
}

export const createPassageExcerpt = (text: string, terms: string[], maxCharacters = 220) => {
  const points = Array.from(text.trim())
  if (points.length <= maxCharacters) return points.join('')

  let originalOffset = 0
  const normalizedParts: string[] = []
  const originalOffsets: number[] = []
  Array.from(text).forEach((point) => {
    const normalizedPoint = normalize(point)
    normalizedParts.push(normalizedPoint)
    originalOffsets.push(...Array.from({ length: normalizedPoint.length }, () => originalOffset))
    originalOffset += point.length
  })
  const normalized = normalizedParts.join('')
  const utf16MatchIndex = terms
    .map((term) => normalized.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0
  const matchIndex = Array.from(text.slice(0, originalOffsets[utf16MatchIndex] ?? 0)).length
  let start = Math.max(0, matchIndex - Math.floor(maxCharacters * 0.38))
  let end = Math.min(points.length, start + maxCharacters)

  while (start > 0 && !/\s/u.test(points[start - 1])) start += 1
  while (end < points.length && !/\s/u.test(points[end])) end -= 1
  if (end <= start) {
    start = Math.max(0, matchIndex - Math.floor(maxCharacters / 2))
    end = Math.min(points.length, start + maxCharacters)
  }
  return `${start > 0 ? '…' : ''}${points.slice(start, end).join('').trim()}${end < points.length ? '…' : ''}`
}

export const deriveSearchResult = (settlement: NormalizedSettlement, rawQuery: string): SettlementSearchResult | null => {
  const query = normalize(rawQuery.trim())
  const terms = searchTerms(rawQuery)
  if (!terms.length) {
    return { settlement, matchSource: null, matchingMentions: [], bestMention: null, excerpt: null, rank: 10, matchScore: 0 }
  }

  const name = normalize(settlement.canonical_name)
  const aliases = settlement.aliases_in_book
  const type = settlement.settlement_type
  const sectionText = settlement.sections.join(' ')
  const description = settlement.wikidata_description
  const matchingMentions = settlement.mentions
    .filter((mention) => containsTerms(mention.complete_paragraph_text, terms))
    .sort((a, b) => termScore(b.complete_paragraph_text, terms) - termScore(a.complete_paragraph_text, terms)
      || a.source_line_start - b.source_line_start)
  const bestMention = matchingMentions[0] ?? null

  let matchSource: MatchSource
  let rank: number
  let sourceText: string
  if (name === query) { matchSource = 'name'; rank = 0; sourceText = settlement.canonical_name }
  else if (name.startsWith(query)) { matchSource = 'name'; rank = 1; sourceText = settlement.canonical_name }
  else if (containsTerms(settlement.canonical_name, terms)) { matchSource = 'name'; rank = 2; sourceText = settlement.canonical_name }
  else if (containsTerms(aliases, terms)) { matchSource = 'alias'; rank = 3; sourceText = aliases }
  else if (containsTerms(type, terms)) { matchSource = 'type'; rank = 4; sourceText = type }
  else if (containsTerms(sectionText, terms)) { matchSource = 'section'; rank = 4; sourceText = sectionText }
  else if (containsTerms(description, terms)) { matchSource = 'description'; rank = 5; sourceText = description }
  else if (bestMention) { matchSource = 'passage'; rank = 6; sourceText = bestMention.complete_paragraph_text }
  else return null

  return {
    settlement,
    matchSource,
    matchingMentions,
    bestMention,
    excerpt: bestMention ? createPassageExcerpt(bestMention.complete_paragraph_text, terms) : null,
    rank,
    matchScore: termScore(sourceText, terms),
  }
}

export const rankSettlement = (settlement: NormalizedSettlement, rawQuery: string) =>
  deriveSearchResult(settlement, rawQuery)?.rank ?? null

const isInRange = (
  value: number | null,
  from: number | null,
  to: number | null,
  includeUnknown: boolean,
) => {
  if (value === null) return includeUnknown
  if (from !== null && value < from) return false
  if (to !== null && value > to) return false
  return true
}

export const overlapsEra = (settlement: NormalizedSettlement, era: EraPresetId) => {
  if (era === 'unknown') return settlement.startYear === null && settlement.endYear === null
  const definition = ERA_PRESETS[era]
  if (settlement.startYear === null && settlement.endYear === null) return false
  const knownStart = settlement.startYear ?? settlement.endYear!
  const knownEnd = settlement.endYear ?? settlement.startYear!
  return (definition.end === null || knownStart <= definition.end)
    && (definition.start === null || knownEnd >= definition.start)
}

export const matchesFilters = (settlement: NormalizedSettlement, filters: FilterState) => {
  if (filters.settlementIds.length > 0 && !filters.settlementIds.includes(settlement.settlement_id)) return false
  if (filters.types.length > 0 && !filters.types.includes(settlement.settlement_type)) return false
  if (filters.categories.length > 0 && !filters.categories.some((category) => categoriesForType(settlement.settlement_type).includes(category))) return false
  if (filters.sections.length > 0 && !filters.sections.some((section) => settlement.sections.includes(section))) return false
  if (filters.eras.length > 0 && !filters.eras.some((era) => overlapsEra(settlement, era))) return false
  if (!isInRange(settlement.startYear, filters.startFrom, filters.startTo, filters.includeUnknownStart)) return false
  if (!isInRange(settlement.endYear, filters.endFrom, filters.endTo, filters.includeUnknownEnd)) return false
  return deriveSearchResult(settlement, filters.query) !== null
}

export const deriveSearchResults = (entries: NormalizedSettlement[], filters: FilterState) =>
  entries
    .filter((settlement) => matchesFilters(settlement, { ...filters, query: '' }))
    .flatMap((settlement) => {
      const result = deriveSearchResult(settlement, filters.query)
      return result ? [result] : []
    })
    .sort((a, b) => a.rank - b.rank
      || b.matchScore - a.matchScore
      || b.matchingMentions.length - a.matchingMentions.length
      || b.settlement.mention_paragraph_count - a.settlement.mention_paragraph_count
      || a.settlement.canonical_name.localeCompare(b.settlement.canonical_name))

export const filterAndSortSettlements = (entries: NormalizedSettlement[], filters: FilterState) =>
  deriveSearchResults(entries, filters).map((result) => result.settlement)

const parseYear = (value: string | null) => {
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : null
}

export const readUrlState = (
  search: string,
  validTypes: Set<string>,
  validSections: Set<string>,
  validIds: Set<string>,
): UrlState => {
  const params = new URLSearchParams(search)
  const selectedId = params.get('settlement')
  const compareIds = (params.get('compare') ?? '')
    .split(',')
    .filter((id, index, ids) => validIds.has(id) && ids.indexOf(id) === index)
    .slice(0, 4)

  return {
    filters: {
      query: params.get('q') ?? '',
      settlementIds: params.getAll('places')
        .filter((id, index, ids) => validIds.has(id) && ids.indexOf(id) === index),
      types: params.getAll('types').filter((type) => validTypes.has(type)),
      sections: params.getAll('sections').filter((section) => validSections.has(section)),
      eras: params.getAll('era').filter((era): era is EraPresetId => era in ERA_PRESETS),
      categories: params.getAll('category').filter((category): category is PlaceCategoryId => category in PLACE_CATEGORIES),
      startFrom: parseYear(params.get('startFrom')),
      startTo: parseYear(params.get('startTo')),
      endFrom: parseYear(params.get('endFrom')),
      endTo: parseYear(params.get('endTo')),
      includeUnknownStart: params.get('unknownStart') !== 'exclude',
      includeUnknownEnd: params.get('unknownEnd') !== 'exclude',
    },
    selectedId: selectedId && validIds.has(selectedId) ? selectedId : null,
    compareIds,
  }
}

export const writeUrlState = (state: UrlState) => {
  const params = new URLSearchParams()
  const { filters } = state
  if (filters.query) params.set('q', filters.query)
  filters.settlementIds.forEach((id) => params.append('places', id))
  filters.types.forEach((type) => params.append('types', type))
  filters.sections.forEach((section) => params.append('sections', section))
  filters.eras.forEach((era) => params.append('era', era))
  filters.categories.forEach((category) => params.append('category', category))
  if (filters.startFrom !== null) params.set('startFrom', String(filters.startFrom))
  if (filters.startTo !== null) params.set('startTo', String(filters.startTo))
  if (filters.endFrom !== null) params.set('endFrom', String(filters.endFrom))
  if (filters.endTo !== null) params.set('endTo', String(filters.endTo))
  if (!filters.includeUnknownStart) params.set('unknownStart', 'exclude')
  if (!filters.includeUnknownEnd) params.set('unknownEnd', 'exclude')
  if (state.selectedId) params.set('settlement', state.selectedId)
  if (state.compareIds.length) params.set('compare', state.compareIds.slice(0, 4).join(','))
  return params.toString()
}

export const countActiveFilters = (filters: FilterState) =>
  filters.settlementIds.length
  + filters.types.length
  + filters.sections.length
  + filters.eras.length
  + filters.categories.length
  + [filters.startFrom, filters.startTo, filters.endFrom, filters.endTo].filter((value) => value !== null).length
  + Number(!filters.includeUnknownStart)
  + Number(!filters.includeUnknownEnd)
