import { describe, expect, it } from 'vitest'
import { parseProcurementHubSearch } from '@/schemas/procurement-hub'
import { rankingRowViewRecordsSearch } from './ranking-links'

describe('rankingRowViewRecordsSearch', () => {
  it('opens List with authority CUI and shared scope', () => {
    const hubState = parseProcurementHubSearch({
      view: 'rankings',
      grain: 'contracts',
      buyerRegion: 'Nord-Vest',
      status: 'cancelled',
    })
    expect(
      rankingRowViewRecordsSearch({
        hubState,
        rankDim: 'buyer',
        cpvLevel: 'division',
        rowKey: '123456',
      }),
    ).toMatchObject({
      view: 'list',
      authority_cui: '123456',
      buyerRegion: 'Nord-Vest',
      status: ['cancelled'],
    })
  })

  it('maps CPV division and code facets', () => {
    const hubState = parseProcurementHubSearch({ view: 'rankings' })
    expect(
      rankingRowViewRecordsSearch({
        hubState,
        rankDim: 'cpv',
        cpvLevel: 'division',
        rowKey: '45',
      }),
    ).toMatchObject({ cpv_division: '45', view: 'list' })
    expect(
      rankingRowViewRecordsSearch({
        hubState,
        rankDim: 'cpv',
        cpvLevel: 'code',
        rowKey: '45453000',
      }),
    ).toMatchObject({ cpv: '45453000', view: 'list' })
  })
})
