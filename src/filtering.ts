import type { NormalizedSettlement } from './data'

export interface FilterState {
  query: string
  types: string[]
  sections: string[]
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

export const EMPTY_FILTERS: FilterState = {
  query: '',
  types: [],
  sections: [],
  startFrom: null,
  startTo: null,
  endFrom: null,
  endTo: null,
  includeUnknownStart: true,
  includeUnknownEnd: true,
}

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

export const rankSettlement = (settlement: NormalizedSettlement, rawQuery: string) => {
  const query = rawQuery.trim().toLocaleLowerCase()
  if (!query) return 10
  const terms = query.split(/\s+/).filter(Boolean)
  if (!terms.every((term) => settlement.searchText.includes(term))) return null

  const name = settlement.canonical_name.toLocaleLowerCase()
  const aliases = settlement.aliases_in_book.toLocaleLowerCase()
  const type = settlement.settlement_type.toLocaleLowerCase()
  const sectionsText = settlement.sections.join(' ').toLocaleLowerCase()
  const description = settlement.wikidata_description.toLocaleLowerCase()

  if (name === query) return 0
  if (name.startsWith(query)) return 1
  if (name.includes(query)) return 2
  if (aliases.includes(query)) return 3
  if (type.includes(query)) return 4
  if (sectionsText.includes(query)) return 5
  if (description.includes(query)) return 6
  return 8
}

export const matchesFilters = (settlement: NormalizedSettlement, filters: FilterState) => {
  if (filters.types.length > 0 && !filters.types.includes(settlement.settlement_type)) return false
  if (filters.sections.length > 0 && !filters.sections.some((section) => settlement.sections.includes(section))) return false
  if (!isInRange(settlement.startYear, filters.startFrom, filters.startTo, filters.includeUnknownStart)) return false
  if (!isInRange(settlement.endYear, filters.endFrom, filters.endTo, filters.includeUnknownEnd)) return false
  return rankSettlement(settlement, filters.query) !== null
}

export const filterAndSortSettlements = (entries: NormalizedSettlement[], filters: FilterState) =>
  entries
    .filter((settlement) => matchesFilters(settlement, filters))
    .sort((a, b) => {
      const rankA = rankSettlement(a, filters.query) ?? 99
      const rankB = rankSettlement(b, filters.query) ?? 99
      return rankA - rankB || b.mention_paragraph_count - a.mention_paragraph_count || a.canonical_name.localeCompare(b.canonical_name)
    })

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
      types: params.getAll('types').filter((type) => validTypes.has(type)),
      sections: params.getAll('sections').filter((section) => validSections.has(section)),
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
  filters.types.forEach((type) => params.append('types', type))
  filters.sections.forEach((section) => params.append('sections', section))
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
  filters.types.length
  + filters.sections.length
  + [filters.startFrom, filters.startTo, filters.endFrom, filters.endTo].filter((value) => value !== null).length
  + Number(!filters.includeUnknownStart)
  + Number(!filters.includeUnknownEnd)
