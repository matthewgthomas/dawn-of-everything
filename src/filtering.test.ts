import { describe, expect, it } from 'vitest'
import { formatDuration, formatYear, settlementById, settlements } from './data'
import {
  categoriesForType,
  createPassageExcerpt,
  deriveSettlementNameSuggestions,
  deriveSearchResult,
  deriveSearchResults,
  EMPTY_FILTERS,
  filterAndSortSettlements,
  matchesFilters,
  overlapsEra,
  rankSettlement,
  readUrlState,
  writeUrlState,
} from './filtering'

describe('dataset normalization and dates', () => {
  it('normalizes signed years and missing coordinates', () => {
    const aztlan = settlementById.get('S117')!
    expect(aztlan.startYear).toBeNull()
    expect(aztlan.endYear).toBe(1150)
    expect(aztlan.latitudeNumber).toBeNull()
    expect(formatYear(-9500)).toBe('9,500 BCE')
    expect(formatYear(550)).toBe('550 CE')
    expect(formatDuration(settlementById.get('S106')!)).toBe('649 years')
  })
})

describe('search ranking and filters', () => {
  const teotihuacan = settlementById.get('S106')!

  it('ranks canonical names ahead of passage-only matches', () => {
    expect(rankSettlement(teotihuacan, 'Teotihuacan')).toBe(0)
    const results = filterAndSortSettlements(settlements, { ...EMPTY_FILTERS, query: 'Teotihuacan' })
    expect(results[0].settlement_id).toBe('S106')
  })

  it('combines categories with AND and values within a category with OR', () => {
    expect(matchesFilters(teotihuacan, {
      ...EMPTY_FILTERS,
      types: ['ancient city', 'modern city'],
      sections: ['Chapter 8: Imaginary Cities'],
      startFrom: -500,
      startTo: 0,
    })).toBe(true)
    expect(matchesFilters(teotihuacan, { ...EMPTY_FILTERS, types: ['modern city'] })).toBe(false)
  })

  it('handles unknown date endpoints explicitly', () => {
    const aztlan = settlementById.get('S117')!
    expect(matchesFilters(aztlan, { ...EMPTY_FILTERS, startFrom: -10000 })).toBe(true)
    expect(matchesFilters(aztlan, { ...EMPTY_FILTERS, startFrom: -10000, includeUnknownStart: false })).toBe(false)
  })

  it('classifies passage-only searches and exposes a centered excerpt', () => {
    const results = deriveSearchResults(settlements, { ...EMPTY_FILTERS, query: 'women' })
    const passageResult = results.find((result) => result.matchSource === 'passage')
    expect(passageResult?.bestMention).not.toBeNull()
    expect(passageResult?.excerpt?.toLocaleLowerCase()).toContain('women')
    expect(passageResult?.matchingMentions.length).toBeGreaterThan(0)
  })

  it('classifies aliases and preserves Unicode-safe excerpts', () => {
    const krakow = settlementById.get('S031')!
    expect(deriveSearchResult(krakow, 'Krakow')?.matchSource).toBe('alias')
    const excerpt = createPassageExcerpt(`Beginning 😀 ${'long text '.repeat(30)}women gathered here ${'after '.repeat(30)}`, ['women'], 90)
    expect(excerpt).toContain('women')
    expect(excerpt).not.toContain('�')
  })

  it('uses occupation overlap for era presets, including partial unknown intervals', () => {
    expect(overlapsEra(teotihuacan, 'ancient-classical')).toBe(true)
    expect(overlapsEra(teotihuacan, 'earliest')).toBe(false)
    expect(overlapsEra(settlementById.get('S117')!, 'later')).toBe(true)
  })

  it('maps every detailed settlement type to a broad category', () => {
    const unmapped = [...new Set(settlements.map((settlement) => settlement.settlement_type))]
      .filter((type) => categoriesForType(type).length === 0)
    expect(unmapped).toEqual([])
  })

  it('limits results to selected settlement IDs before applying other filters', () => {
    const filters = { ...EMPTY_FILTERS, settlementIds: ['S106', 'S078'] }
    expect(matchesFilters(teotihuacan, filters)).toBe(true)
    expect(matchesFilters(settlementById.get('S078')!, filters)).toBe(true)
    expect(matchesFilters(settlementById.get('S117')!, filters)).toBe(false)

    const queried = deriveSearchResults(settlements, { ...filters, query: 'Warka' })
    expect(queried.map(({ settlement }) => settlement.settlement_id)).toEqual(['S078'])
    expect(matchesFilters(teotihuacan, { ...filters, types: ['modern city'] })).toBe(false)
  })

  it('ranks canonical and alias-only settlement name suggestions', () => {
    const canonical = deriveSettlementNameSuggestions(settlements, 'Teotihuacan')
    expect(canonical[0]).toMatchObject({ settlement: { settlement_id: 'S106' }, matchingAlias: null, rank: 0 })

    const alias = deriveSettlementNameSuggestions(settlements, 'Krakow')
    expect(alias[0]).toMatchObject({ settlement: { canonical_name: 'Kraków' }, matchingAlias: 'Krakow', rank: 1 })

    const prefix = deriveSettlementNameSuggestions(settlements, 'Wark')
    expect(prefix[0]).toMatchObject({ settlement: { canonical_name: 'Uruk' }, matchingAlias: 'Warka', rank: 3 })
  })
})

describe('shareable URL state', () => {
  it('round-trips supported state and rejects stale IDs', () => {
    const filters = {
      ...EMPTY_FILTERS,
      query: 'ice age',
      settlementIds: ['S106', 'S117'],
      types: ['ancient city'],
      sections: ['Chapter 8: Imaginary Cities'],
      eras: ['ancient-classical' as const],
      categories: ['cities' as const],
      startFrom: -5000,
      includeUnknownEnd: false,
    }
    const query = writeUrlState({ filters, selectedId: 'S106', compareIds: ['S106', 'S117'] })
    const parsed = readUrlState(
      `?${query.replace('settlement=S106', 'settlement=BAD')}`,
      new Set(['ancient city']),
      new Set(['Chapter 8: Imaginary Cities']),
      new Set(['S106', 'S117']),
    )
    expect(parsed.filters.query).toBe('ice age')
    expect(parsed.filters.settlementIds).toEqual(['S106', 'S117'])
    expect(parsed.filters.startFrom).toBe(-5000)
    expect(parsed.filters.includeUnknownEnd).toBe(false)
    expect(parsed.filters.eras).toEqual(['ancient-classical'])
    expect(parsed.filters.categories).toEqual(['cities'])
    expect(parsed.compareIds).toEqual(['S106', 'S117'])
    expect(parsed.selectedId).toBeNull()
  })

  it('limits comparison IDs to four', () => {
    const parsed = readUrlState(
      '?compare=S001,S002,S003,S004,S005,S001',
      new Set(),
      new Set(),
      new Set(['S001', 'S002', 'S003', 'S004', 'S005']),
    )
    expect(parsed.compareIds).toEqual(['S001', 'S002', 'S003', 'S004'])
  })

  it('validates and de-duplicates named settlement filter IDs in URL order', () => {
    const parsed = readUrlState(
      '?places=S106&places=BAD&places=S106&places=S078',
      new Set(),
      new Set(),
      new Set(['S106', 'S078']),
    )
    expect(parsed.filters.settlementIds).toEqual(['S106', 'S078'])
  })
})
