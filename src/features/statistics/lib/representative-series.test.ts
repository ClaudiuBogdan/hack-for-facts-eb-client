import { describe, expect, it } from 'vitest'
import type { InsDatasetDetails, InsObservation } from '@/schemas/ins'
import { insSourceDescriptorSchema } from '@/lib/ins/source-contract'
import {
  chooseRepresentativeCell,
} from './representative-series'

const dataset = {
  id: 'ADM101A',
  code: 'ADM101A',
  periodicity: ['ANNUAL'],
  has_uat_data: false,
  has_county_data: true,
  has_siruta: false,
  dimension_count: 4,
  metadata: { revision_id: '1', transform_contract_sha256: 'a'.repeat(64) },
  dimensions: [
    {
      index: 0,
      type: 'CLASSIFICATION',
      label_ro: 'Categorii',
      classification_type: { code: 'D0', name_ro: 'Categorii' },
    },
    {
      index: 1,
      type: 'CLASSIFICATION',
      label_ro: 'Regiuni',
      classification_type: { code: 'D1', name_ro: 'Regiuni' },
    },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
} as unknown as InsDatasetDetails

const descriptor = insSourceDescriptorSchema.parse(dataset)

function row(params: {
  readonly id: string
  readonly year: number
  readonly value: string | null
  readonly category: readonly [string, string]
  readonly region: readonly [string, string]
  readonly unit?: string
}): InsObservation {
  return {
    id: params.id,
    dataset_code: 'ADM101A',
    value: params.value,
    value_status: null,
    time_period: {
      iso_period: String(params.year),
      year: params.year,
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: null,
    unit: { code: params.unit ?? '1', symbol: null, name_ro: 'Numar' },
    classifications: [
      { type_code: 'D0', code: params.category[0], name_ro: params.category[1] },
      { type_code: 'D1', code: params.region[0], name_ro: params.region[1] },
    ],
    dimensions: { geography: null },
  } as unknown as InsObservation
}

describe('chooseRepresentativeCell', () => {
  it('prefers the identity that is INS Total on the most axes', () => {
    const chosen = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'a', year: 2024, value: '10', category: ['2', 'Municipii'], region: ['9', 'TOTAL'] }),
        row({ id: 'b', year: 2024, value: '20', category: ['1', 'Total '], region: ['9', 'TOTAL'] }),
      ],
    })
    expect(chosen?.classifications.D0).toBe('1')
    expect(chosen?.classifications.D1).toBe('9')
    expect(chosen?.unitCode).toBe('1')
  })

  it('prefers a series that draws a line over one that draws a point', () => {
    const chosen = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'a', year: 2024, value: '10', category: ['2', 'Municipii'], region: ['7', 'Nord' ] }),
        row({ id: 'b', year: 2022, value: '11', category: ['3', 'Orase'], region: ['7', 'Nord'] }),
        row({ id: 'c', year: 2023, value: '12', category: ['3', 'Orase'], region: ['7', 'Nord'] }),
        row({ id: 'd', year: 2024, value: '13', category: ['3', 'Orase'], region: ['7', 'Nord'] }),
      ],
    })
    expect(chosen?.classifications.D0).toBe('3')
  })

  it('breaks a full tie on INS member order, not on response order', () => {
    const forward = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'a', year: 2024, value: '10', category: ['5', 'Sate'], region: ['7', 'Nord'] }),
        row({ id: 'b', year: 2024, value: '11', category: ['2', 'Municipii'], region: ['7', 'Nord'] }),
      ],
    })
    const reversed = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'b', year: 2024, value: '11', category: ['2', 'Municipii'], region: ['7', 'Nord'] }),
        row({ id: 'a', year: 2024, value: '10', category: ['5', 'Sate'], region: ['7', 'Nord'] }),
      ],
    })
    expect(forward?.classifications.D0).toBe('2')
    expect(reversed).toEqual(forward)
  })

  it('ignores cells that publish no value', () => {
    const chosen = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'a', year: 2024, value: null, category: ['1', 'Total'], region: ['9', 'TOTAL'] }),
        row({ id: 'b', year: 2024, value: '11', category: ['2', 'Municipii'], region: ['7', 'Nord'] }),
      ],
    })
    expect(chosen?.classifications.D0).toBe('2')
  })

  it('reads the cell at a cadence a chart can draw', () => {
    // A matrix declaring both ANNUAL and QUARTERLY resolves neither on its
    // own; without a cadence the page has a complete coordinate it cannot
    // draw, because a series may never mix cadences.
    const chosen = chooseRepresentativeCell({
      descriptor,
      observations: [
        { ...row({ id: 'a', year: 2023, value: '1', category: ['1', 'Total'], region: ['9', 'TOTAL'] }) },
        { ...row({ id: 'b', year: 2024, value: '2', category: ['1', 'Total'], region: ['9', 'TOTAL'] }) },
        {
          ...row({ id: 'c', year: 2024, value: '3', category: ['1', 'Total'], region: ['9', 'TOTAL'] }),
          time_period: {
            iso_period: '2024-Q1',
            year: 2024,
            quarter: 1,
            month: null,
            periodicity: 'QUARTERLY',
          },
        } as unknown as InsObservation,
      ],
    })
    // Two annual rows outweigh one quarterly one.
    expect(chosen?.periodicity).toBe('ANNUAL')
  })

  it('breaks a tie that the member codes sum the same way', () => {
    // {D0:1,D1:4} and {D0:2,D1:3} both sum to 5 and are different cells; a sum
    // comparator returned 0 and let the response order decide.
    const forward = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'a', year: 2024, value: '1', category: ['2', 'B'], region: ['3', 'C'] }),
        row({ id: 'b', year: 2024, value: '2', category: ['1', 'A'], region: ['4', 'D'] }),
      ],
    })
    const reversed = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'b', year: 2024, value: '2', category: ['1', 'A'], region: ['4', 'D'] }),
        row({ id: 'a', year: 2024, value: '1', category: ['2', 'B'], region: ['3', 'C'] }),
      ],
    })
    expect(forward?.classifications.D0).toBe('1')
    expect(reversed).toEqual(forward)
  })

  it('breaks a tie between two units of the same coordinate', () => {
    const forward = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'a', year: 2024, value: '1', category: ['1', 'A'], region: ['1', 'A'], unit: '7' }),
        row({ id: 'b', year: 2024, value: '2', category: ['1', 'A'], region: ['1', 'A'], unit: '3' }),
      ],
    })
    const reversed = chooseRepresentativeCell({
      descriptor,
      observations: [
        row({ id: 'b', year: 2024, value: '2', category: ['1', 'A'], region: ['1', 'A'], unit: '3' }),
        row({ id: 'a', year: 2024, value: '1', category: ['1', 'A'], region: ['1', 'A'], unit: '7' }),
      ],
    })
    expect(forward?.unitCode).toBe('3')
    expect(reversed).toEqual(forward)
  })

  it('picks nothing when there is nothing safe to pick', () => {
    expect(
      chooseRepresentativeCell({ descriptor, observations: [] }),
    ).toBeNull()
    // A row that does not carry every declared axis is never adopted.
    expect(
      chooseRepresentativeCell({
        descriptor: { code: 'ADM101A', dimensions: [] },
        observations: [
          row({ id: 'a', year: 2024, value: '1', category: ['1', 'Total'], region: ['9', 'TOTAL'] }),
        ],
      }),
    ).toBeNull()
  })
})
