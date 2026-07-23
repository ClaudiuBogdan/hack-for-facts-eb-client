import { describe, expect, it } from 'vitest'
import {
  buildProcurementMapHeatmap,
  buildRegionHeatmapByCounty,
  isProcurementMapCountyPainted,
  regionBucketsFromBreakdown,
  resolveProcurementMapAnalysisPlan,
  selectionGrainFromPaintMode,
} from './procurement-map-series'
import type { ProcurementGeographyOptions } from '../api/procurement-reference-api'

describe('procurement map series', () => {
  it('keeps only valued region keys from breakdown buckets', () => {
    const buckets = regionBucketsFromBreakdown([
      {
        key: 'Nord-Vest',
        kind: 'value',
        recordCount: '100',
        withValueCount: '90',
        valueAwardedSum: '1000.5',
        shareOfScope: '0.1',
      },
      {
        key: null,
        kind: 'unknown',
        recordCount: '50',
        withValueCount: null,
        valueAwardedSum: null,
        shareOfScope: null,
      },
      {
        key: 'Other',
        kind: 'other',
        recordCount: '10',
        withValueCount: null,
        valueAwardedSum: null,
        shareOfScope: null,
      },
    ])
    expect(buckets).toEqual([
      {
        region: 'Nord-Vest',
        recordCount: 100,
        valueAwardedSum: 1000.5,
        kind: 'value',
      },
    ])
  })

  it('avoids buyerRegion facet when buyerRegion is already in scope', () => {
    expect(
      resolveProcurementMapAnalysisPlan('region', { buyerRegion: 'Centru' }),
    ).toEqual({
      dimension: 'buyerCounty',
      paintMode: 'county',
      topN: 100,
    })
    expect(
      resolveProcurementMapAnalysisPlan('county', { buyerCounty: 'BV' }),
    ).toEqual({
      dimension: 'cpvDivision',
      paintMode: 'single-county',
      topN: 1,
      singleTerritoryId: 'BV',
    })
    expect(resolveProcurementMapAnalysisPlan('region', {})).toEqual({
      dimension: 'buyerRegion',
      paintMode: 'region',
      topN: 20,
    })
  })

  it('derives click/drawer grain from paint mode, not toolbar mapGrain', () => {
    expect(selectionGrainFromPaintMode('county')).toBe('county')
    expect(selectionGrainFromPaintMode('single-county')).toBe('county')
    expect(selectionGrainFromPaintMode('uat')).toBe('uat')
    expect(selectionGrainFromPaintMode('single-uat')).toBe('uat')
    expect(selectionGrainFromPaintMode('region')).toBe('region')
    expect(selectionGrainFromPaintMode('single-region')).toBe('region')

    const scopedCounty = resolveProcurementMapAnalysisPlan('region', {
      buyerCounty: 'BV',
    })
    expect(selectionGrainFromPaintMode(scopedCounty.paintMode)).toBe('county')

    const regionDrill = resolveProcurementMapAnalysisPlan('region', {
      buyerRegion: 'Centru',
    })
    expect(selectionGrainFromPaintMode(regionDrill.paintMode)).toBe('county')
  })

  it('does not treat an unpainted county as selectable in the active scope', () => {
    const paintedCountyCodes = new Set(['BV'])
    expect(isProcurementMapCountyPainted('BV', paintedCountyCodes)).toBe(true)
    expect(isProcurementMapCountyPainted('CJ', paintedCountyCodes)).toBe(false)
    expect(isProcurementMapCountyPainted(undefined, paintedCountyCodes)).toBe(
      false,
    )
  })

  it('paints counties with parent region totals', () => {
    const geography: ProcurementGeographyOptions = {
      regions: [{ region: 'Nord-Vest', countyCount: 2, uatCount: 0 }],
      counties: [
        {
          countyCode: 'CJ',
          countyName: 'CLUJ',
          region: 'Nord-Vest',
          uatCount: 1,
        },
        {
          countyCode: 'BH',
          countyName: 'BIHOR',
          region: 'Nord-Vest',
          uatCount: 1,
        },
        {
          countyCode: 'B',
          countyName: 'BUCURESTI',
          region: 'București-Ilfov',
          uatCount: 1,
        },
      ],
    }
    const points = buildRegionHeatmapByCounty(
      geography,
      [
        {
          region: 'Nord-Vest',
          recordCount: 42,
          valueAwardedSum: 1000,
          kind: 'value',
        },
      ],
      'record_count',
    )
    expect(points).toHaveLength(2)
    expect(points.every((point) => point.amount === 42)).toBe(true)
    expect(points.map((point) => point.county_code).sort()).toEqual(['BH', 'CJ'])
  })

  it('returns empty heatmap for county/uat until rollups exist', () => {
    expect(
      buildProcurementMapHeatmap('county', undefined, [], 'record_count'),
    ).toEqual([])
    expect(
      buildProcurementMapHeatmap('uat', undefined, [], 'value_awarded'),
    ).toEqual([])
  })
})
