import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import type { InsDatasetDetails, InsDimensionValue } from '@/schemas/ins'
import { DetailScopeSentence } from './detail-scope-sentence'

vi.mock('./detail-dimension-combobox', () => ({
  DetailDimensionCombobox: ({
    dimensionIndex,
    onSelect,
  }: {
    dimensionIndex: number
    onSelect: (row: InsDimensionValue) => void
  }) => (
    <button
      onClick={() =>
        onSelect({
          nom_item_id: 9,
          dimension_type:
            dimensionIndex === 4 ? 'UNIT_OF_MEASURE' : 'CLASSIFICATION',
          classification_value: { type_code: `D${dimensionIndex}`, code: '9' },
          unit: { code: '9' },
        })
      }
    >
      Pick {dimensionIndex}
    </button>
  ),
}))
const dataset: InsDatasetDetails = {
  id: 'TEST',
  code: 'TEST',
  periodicity: ['ANNUAL'],
  dimension_count: 5,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  dimensions: [
    {
      index: 0,
      type: 'CLASSIFICATION',
      label_ro: 'Categorie',
      classification_type: { code: 'D0' },
    },
    {
      index: 1,
      type: 'TERRITORIAL',
      label_ro: 'Geografie unu',
      classification_type: { code: 'D1' },
    },
    {
      index: 2,
      type: 'TERRITORIAL',
      label_ro: 'Geografie doi',
      classification_type: { code: 'D2' },
    },
    { index: 3, type: 'TEMPORAL', classification_type: null },
    { index: 4, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
function mount(canDerive = true, clasificari?: unknown) {
  const change = vi.fn()
  render(
    <DetailScopeSentence
      dataset={dataset}
      search={{ clasificari }}
      scope={{
        territory: null,
        territoryMode: 'national-default',
        territoryDefaulted: true,
        classifications: new Map([
          ['D0', '1'],
          ['D1', '2'],
          ['D2', '3'],
        ]),
        defaultedTypes: new Set(['D0', 'D1', 'D2']),
        unitCode: '0',
        unitDefaulted: true,
        periodicity: 'ANNUAL',
      }}
      canDerive={canDerive}
      unresolvedDimensions={[]}
      territoryLabel="România"
      classificationLabels={new Map()}
      unitLabel="Persoane"
      yearSpanLabel={null}
      onChange={change}
    />,
  )
  return change
}

describe('source scope edits', () => {
  it('renders every geographic source axis independently', () => {
    mount()
    expect(
      screen.getByRole('button', { name: /Geografie unu: 2/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Geografie doi: 3/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Filtru teritorial canonic: România/,
      }),
    ).toBeInTheDocument()
  })
  it('materializes the other default coordinates and unit when editing one axis', async () => {
    const change = mount()
    expect(change).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /Categorie: 1/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 0' }))
    expect(change).toHaveBeenCalledWith({
      clasificari: ['D1:2', 'D2:3', 'D0:9'],
      unitate: '0',
      frecventa: 'ANNUAL',
    })
  })
  it('materializes the full coordinate when changing the default unit', async () => {
    const change = mount()
    await userEvent.click(
      screen.getByRole('button', { name: /Unitate de măsură: Persoane/ }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Pick 4' }))
    expect(change).toHaveBeenCalledWith({
      clasificari: ['D0:1', 'D1:2', 'D2:3'],
      unitate: '9',
      frecventa: 'ANNUAL',
    })
  })
  it('retains unrelated invalid entries during a recoverable axis edit', async () => {
    const change = mount(false, ['D0:1', 'broken', null])
    await userEvent.click(screen.getByRole('button', { name: /Categorie: 1/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 0' }))
    expect(change).toHaveBeenCalledWith({
      clasificari: ['broken', null, 'D0:9'],
    })
  })
})
