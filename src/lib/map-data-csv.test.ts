import { describe, expect, it } from 'vitest'
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'
import {
  buildMapDataCsv,
  buildUatMapMetadataBySiruta,
} from './map-data-csv'

const UAT_POINT: HeatmapUATDataPoint = {
  uat_id: '179132',
  uat_code: '179132',
  uat_name: 'București, Sector 1',
  siruta_code: '179132',
  county_code: 'B',
  county_name: 'București',
  population: 0,
  amount: 1234.5,
  total_amount: 1234.5,
  per_capita_amount: 0,
}

const COUNTY_POINT: HeatmapCountyDataPoint = {
  county_code: 'CJ',
  county_name: '=Cluj',
  county_population: 0,
  amount: 42,
  total_amount: 42,
  per_capita_amount: 0,
  county_entity: { cui: '', name: 'Cluj' },
}

describe('buildMapDataCsv', () => {
  it('exports the exact UAT map value joined to CUI and UAT metadata', () => {
    const uatMetadataBySiruta = buildUatMapMetadataBySiruta({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: {
            natcode: '179132',
            cui: '4267117',
            name: 'București, Sector 1',
            countyMn: 'B',
            county: 'București',
          },
        },
      ],
    })
    const csv = buildMapDataCsv({
      data: [UAT_POINT],
      grain: 'uat',
      indicator: 'total-value',
      unit: 'EUR',
      transformValue: (value) => value / 5,
      uatMetadataBySiruta,
    })

    expect(csv).toContain(
      'territory_grain,siruta_code,cui,uat_name,county_code,county_name',
    )
    expect(csv).toContain(
      'uat,179132,4267117,"București, Sector 1",B,București,246.9,total-value,EUR',
    )
  })

  it('keeps SIRUTA blank at county grain and neutralizes spreadsheet formulas', () => {
    const csv = buildMapDataCsv({
      data: [COUNTY_POINT],
      grain: 'county',
      indicator: 'record_count',
      unit: 'count',
    })

    expect(csv).toContain("county,,,,CJ,'=Cluj,42,record_count,count")
  })

  it('does not mislabel region identifiers as county or SIRUTA codes', () => {
    const csv = buildMapDataCsv({
      data: [{ ...COUNTY_POINT, county_code: 'NORD-VEST', county_name: 'Nord-Vest' }],
      grain: 'region',
      indicator: 'value_awarded',
      unit: 'RON',
    })

    expect(csv).toContain('region,,,,,,42,value_awarded,RON')
  })
})
