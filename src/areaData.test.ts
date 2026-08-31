import { describe, expect, it } from 'vitest'
import {
  areaBarPercentage,
  areaObservations,
  getPeakAreaObservation,
  MAX_REPRESENTATIVE_AREA_HECTARES,
  rankSettlementsByArea,
  representativeAreaHectares,
  settlementById,
  settlements,
} from './data'

describe('settlement-area data', () => {
  it('covers every canonical settlement and normalizes the CSV fields', () => {
    expect(areaObservations).toHaveLength(204)
    expect(new Set(areaObservations.map((observation) => observation.settlement_id))).toHaveLength(174)
    expect(settlements.every((settlement) => settlement.areaObservations.length > 0)).toBe(true)
    expect(new Set(areaObservations.filter((observation) => observation.research_status === 'known').map((observation) => observation.settlement_id))).toHaveLength(69)

    const unknown = settlementById.get('S001')!.areaObservations[0]
    expect(unknown.area_hectares_min).toBeNull()
    expect(unknown.area_hectares_max).toBeNull()
    expect(unknown.is_preferred).toBe(true)
  })

  it('uses the largest preferred phase and excludes alternate observations', () => {
    const uruk = getPeakAreaObservation(settlementById.get('S078')!.areaObservations)
    expect(uruk?.area_hectares_display).toBe('600 ha')
    expect(uruk?.period_label).toContain('Early Dynastic expansion')

    const harappa = getPeakAreaObservation(settlementById.get('S079')!.areaObservations)
    expect(harappa?.area_hectares_display).toBe('150 ha')
    expect(harappa?.is_preferred).toBe(true)

    const taljanky = getPeakAreaObservation(settlementById.get('S075')!.areaObservations)
    expect(taljanky?.area_hectares_display).toBe('320 ha')
  })

  it('uses the populated bound for one-sided estimates and the latest phase for tied peaks', () => {
    const arslantepe = getPeakAreaObservation(settlementById.get('S170')!.areaObservations)!
    expect(arslantepe.area_hectares_min).toBeNull()
    expect(representativeAreaHectares(arslantepe)).toBe(5)

    const nippur = getPeakAreaObservation(settlementById.get('S090')!.areaObservations)
    expect(nippur?.period_label).toBe('Kassite recovery')
  })

  it('ranks only the supplied settlements and separates unknown estimates', () => {
    const ranked = rankSettlementsByArea([
      settlementById.get('S078')!,
      settlementById.get('S106')!,
      settlementById.get('S001')!,
    ])
    expect(ranked.known.map(({ settlement }) => settlement.canonical_name)).toEqual(['Teotihuacan', 'Uruk'])
    expect(ranked.unknown.map((settlement) => settlement.canonical_name)).toEqual(['Quebec City'])
  })

  it('uses a stable logarithmic scale while preserving ordering', () => {
    expect(MAX_REPRESENTATIVE_AREA_HECTARES).toBe(90669)
    expect(areaBarPercentage(MAX_REPRESENTATIVE_AREA_HECTARES)).toBe(100)
    expect(areaBarPercentage(600)).toBeGreaterThan(areaBarPercentage(5))
    expect(areaBarPercentage(5)).toBeGreaterThan(0)
  })
})
