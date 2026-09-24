import { describe, expect, it, vi } from 'vitest'
import type { InsDatasetDetails } from '@/schemas/ins'
import { comparisonAxes } from './comparison-pins'

const dataset = (periodicity: InsDatasetDetails['periodicity']): InsDatasetDetails => ({
  id: 'TEST',
  code: 'TEST',
  periodicity,
  dimension_count: 2,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', label_ro: 'Sexe', classification_type: { code: 'D0' } },
    { index: 1, type: 'TEMPORAL', classification_type: null },
  ],
})

const axes = (params: {
  readonly periodicity: InsDatasetDetails['periodicity']
  readonly cadence: 'ANNUAL' | 'MONTHLY' | null
  readonly pinnedCadence: boolean
}) =>
  comparisonAxes({
    datasetMeta: dataset(params.periodicity),
    effectivePins: [{ typeCode: 'D0', valueCode: '1' }],
    unitCode: null,
    unitWord: null,
    cadence: params.cadence,
    cadencePinned: params.pinnedCadence,
    memberLabel: (lookup) => lookup.code,
    onPinClassification: vi.fn(),
    onPinUnit: vi.fn(),
    onPinCadence: vi.fn(),
  })

const frequency = (list: ReturnType<typeof axes>) => list.find((axis) => axis.id === 'frecventa')

describe('comparisonAxes', () => {
  it('states a single cadence the matrix resolves on its own as a fact', () => {
    expect(frequency(axes({ periodicity: ['ANNUAL'], cadence: 'ANNUAL', pinnedCadence: false }))?.control).toBeNull()
  })

  it('keeps a pinned cadence editable, even one the matrix does not list', () => {
    const axis = frequency(axes({ periodicity: ['ANNUAL'], cadence: 'MONTHLY', pinnedCadence: true }))
    expect(axis?.control).not.toBeNull()
  })

  it('offers a cadence still to choose, and marks it as waited on', () => {
    const axis = frequency(axes({ periodicity: ['ANNUAL'], cadence: null, pinnedCadence: false }))
    expect(axis?.control).not.toBeNull()
    expect(axis?.unresolved).toBe(true)
  })

  it('names a classification by its member, as the page does whoever chose it', () => {
    const classification = axes({ periodicity: ['ANNUAL'], cadence: 'ANNUAL', pinnedCadence: false })[0]
    expect(classification?.label).toBe('Sexe')
    expect(classification?.value).toBe('1')
  })
})
