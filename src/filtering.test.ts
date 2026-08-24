import { describe, expect, it } from 'vitest'
import { formatDuration, formatYear, settlementById, settlements } from './data'
import { EMPTY_FILTERS, filterAndSortSettlements, matchesFilters, rankSettlement, readUrlState, writeUrlState } from './filtering'

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
})

describe('shareable URL state', () => {
  it('round-trips supported state and rejects stale IDs', () => {
    const filters = {
      ...EMPTY_FILTERS,
      query: 'ice age',
      types: ['ancient city'],
      sections: ['Chapter 8: Imaginary Cities'],
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
    expect(parsed.filters.startFrom).toBe(-5000)
    expect(parsed.filters.includeUnknownEnd).toBe(false)
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
})
