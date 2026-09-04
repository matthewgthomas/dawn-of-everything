import { describe, expect, it } from 'vitest'
import {
  areaBarPercentage,
  areaObservations,
  formatAreaEstimate,
  getPeakAreaObservation,
  MAX_REPRESENTATIVE_AREA_HECTARES,
  rankSettlementsByArea,
  representativeAreaHectares,
  settlementByName,
  settlements,
} from './data'

const settlement = (name: string) => settlementByName.get(name)!

describe('settlement-area data', () => {
  it('covers every canonical settlement and normalizes the CSV fields', () => {
    expect(areaObservations).toHaveLength(174)
    expect(new Set(areaObservations.map((observation) => observation.settlement_id))).toHaveLength(144)
    expect(settlements.every((settlement) => settlement.areaObservations.length > 0)).toBe(true)
    expect(new Set(areaObservations.filter((observation) => observation.research_status === 'known').map((observation) => observation.settlement_id))).toHaveLength(69)

    const unknown = settlement('Quebec City').areaObservations[0]
    expect(unknown.area_hectares_min).toBeNull()
    expect(unknown.area_hectares_max).toBeNull()
    expect(unknown.is_preferred).toBe(true)
  })

  it('uses the largest preferred phase and excludes alternate observations', () => {
    const uruk = getPeakAreaObservation(settlement('Uruk').areaObservations)
    expect(uruk?.area_hectares_display).toBe('600 ha')
    expect(uruk?.period_label).toContain('Early Dynastic expansion')

    const harappa = getPeakAreaObservation(settlement('Harappa').areaObservations)
    expect(harappa?.area_hectares_display).toBe('150 ha')
    expect(harappa?.is_preferred).toBe(true)

    const dholavira = getPeakAreaObservation(settlement('Dholavira').areaObservations)
    expect(dholavira?.area_hectares_display).toBe('47.6 ha')
    expect(dholavira?.area_basis).toBe('outer fortification footprint')

    const crowCreek = getPeakAreaObservation(settlement('Crow Creek').areaObservations)
    expect(crowCreek?.area_hectares_display).toBe('7.3 ha')
    expect(crowCreek?.area_basis).toBe('fortified village footprint')

    const taljanky = getPeakAreaObservation(settlement('Taljanky').areaObservations)
    expect(taljanky?.area_hectares_display).toBe('320 ha')
  })

  it('uses the populated bound for one-sided estimates and the latest phase for tied peaks', () => {
    const arslantepe = getPeakAreaObservation(settlement('Arslantepe').areaObservations)!
    expect(arslantepe.area_hectares_min).toBeNull()
    expect(representativeAreaHectares(arslantepe)).toBe(5)

    const nippur = getPeakAreaObservation(settlement('Nippur').areaObservations)
    expect(nippur?.period_label).toBe('Kassite recovery')
  })

  it('ranks only the supplied settlements and separates unknown estimates', () => {
    const ranked = rankSettlementsByArea([
      settlement('Uruk'),
      settlement('Teotihuacan'),
      settlement('Quebec City'),
    ])
    expect(ranked.known.map(({ settlement }) => settlement.canonical_name)).toEqual(['Teotihuacan', 'Uruk'])
    expect(ranked.unknown.map((settlement) => settlement.canonical_name)).toEqual(['Quebec City'])
  })

  it('uses a stable logarithmic scale while preserving ordering', () => {
    expect(MAX_REPRESENTATIVE_AREA_HECTARES).toBe(3000)
    expect(areaBarPercentage(MAX_REPRESENTATIVE_AREA_HECTARES)).toBe(100)
    expect(areaBarPercentage(600)).toBeGreaterThan(areaBarPercentage(5))
    expect(areaBarPercentage(5)).toBeGreaterThan(0)
  })

  it('presents decimal area estimates with at most three significant digits', () => {
    expect(formatAreaEstimate('36419.2306 ha')).toBe('36,400 ha')
    expect(formatAreaEstimate('364.192306 km²')).toBe('364 km²')
    expect(formatAreaEstimate('55.34 ha')).toBe('55.3 ha')
    expect(formatAreaEstimate('0.5534 km²')).toBe('0.553 km²')
    expect(formatAreaEstimate('35–40 ha')).toBe('35–40 ha')
  })
})
