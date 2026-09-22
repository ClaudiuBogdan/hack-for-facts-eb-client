import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test/test-utils'
import type { InsDatasetDetails } from '@/schemas/ins'
import { fetchDimensionValuesPage } from '../api/dataset-detail-api'
import { DetailScopeSentence } from './detail-scope-sentence'

/**
 * The picker is stubbed down to one button that reports a pick. Both forms
 * are stubbed: a desktop chip opens the panel directly, the phone sheet opens
 * the labelled field. `vi.hoisted` because `vi.mock` factories run before the
 * module body.
 */
const { pickerStub } = vi.hoisted(() => ({
  pickerStub: ({
    dimensionIndex,
    onSelect,
  }: {
    dimensionIndex: number
    onSelect: (row: unknown) => void
  }) => (
    <>
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
      {/* A member nested under member 7 of the axis before. */}
      <button
        onClick={() =>
          onSelect({
            nom_item_id: 44,
            dimension_type: 'CLASSIFICATION',
            parent_nom_item_id: 7,
            classification_value: { type_code: `D${dimensionIndex}`, code: '44' },
          })
        }
      >
        Pick nested {dimensionIndex}
      </button>
    </>
  ),
}))

vi.mock('./detail-dimension-combobox', () => ({
  DetailDimensionCombobox: pickerStub,
}))
vi.mock('./detail-dimension-panel', () => ({
  DetailDimensionPanel: pickerStub,
}))
vi.mock('../api/dataset-detail-api', () => ({
  fetchDimensionValuesPage: vi.fn(),
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
function mount(canDerive = true, clasificari?: unknown, source = dataset) {
  const change = vi.fn()
  render(
    <DetailScopeSentence
      dataset={source}
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
      observedSpan={null}
      yearWindow={null}
      onChange={change}
    />,
  )
  return change
}

describe('source scope edits', () => {
  it('chooses the territory on the geography axes alone', () => {
    mount()
    expect(
      screen.getByRole('button', { name: /Geografie unu: 2/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Geografie doi: 3/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Teritoriu')).not.toBeInTheDocument()
  })
  it('states the territory of a matrix with no geography axis', () => {
    mount(true, undefined, {
      ...dataset,
      dimensions: dataset.dimensions.filter((d) => d.type !== 'TERRITORIAL'),
    })
    expect(screen.getByText('Teritoriu')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Teritoriu/ })).not.toBeInTheDocument()
  })
  it('drops the teritoriu that seeded the geography once an edit pins it', async () => {
    const change = mount(true, undefined)
    await userEvent.click(screen.getByRole('button', { name: /Categorie: 1/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 0' }))
    const patch = change.mock.calls[0][0] as Record<string, unknown>
    expect('teritoriu' in patch && patch.teritoriu === undefined).toBe(true)
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

describe('nested source axes', () => {
  beforeEach(() => vi.mocked(fetchDimensionValuesPage).mockReset())

  // D2 hangs off D1, as SOM101F's localities hang off its counties.
  const nested: InsDatasetDetails = {
    ...dataset,
    dimensions: dataset.dimensions.map((dimension) =>
      dimension.index === 2 ? { ...dimension, is_hierarchical: true } : dimension,
    ),
  }

  it('pins the parent of a nested member it picks', async () => {
    const change = mount(true, undefined, nested)
    await userEvent.click(screen.getByRole('button', { name: /Geografie doi: 3/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick nested 2' }))
    expect(change).toHaveBeenCalledTimes(1)
    const pins = change.mock.calls[0][0].clasificari as string[]
    expect([...pins].sort()).toEqual(['D0:1', 'D1:7', 'D2:44'])
    expect(fetchDimensionValuesPage).not.toHaveBeenCalled()
  })

  it('sends the nested axis back to its root, read from the axis, when its parent changes', async () => {
    vi.mocked(fetchDimensionValuesPage).mockResolvedValue({
      nodes: [
        {
          nom_item_id: 200,
          dimension_type: 'CLASSIFICATION',
          parent_nom_item_id: null,
          classification_value: { type_code: 'D2', code: '200' },
        },
      ],
      pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
    })
    const change = mount(true, undefined, nested)
    await userEvent.click(screen.getByRole('button', { name: /Geografie unu: 2/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 1' }))
    await waitFor(() => expect(change).toHaveBeenCalledTimes(1))
    expect(fetchDimensionValuesPage).toHaveBeenCalledWith(
      expect.objectContaining({ datasetCode: 'TEST', dimensionIndex: 2, offset: 0 }),
    )
    const pins = change.mock.calls[0][0].clasificari as string[]
    expect([...pins].sort()).toEqual(['D0:1', 'D1:9', 'D2:200'])
  })

  it('drops a pick still waiting for its root when the rail writes again before the URL moves', async () => {
    let answer: (value: Awaited<ReturnType<typeof fetchDimensionValuesPage>>) => void = () => {}
    vi.mocked(fetchDimensionValuesPage).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    const change = mount(true, undefined, nested)
    await userEvent.click(screen.getByRole('button', { name: /Geografie unu: 2/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 1' }))
    // A second pick on another axis, written while the first still waits —
    // the `search` prop has not moved (the router is still loading). The
    // stub does not close its popover the way a real pick does.
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: /Categorie: 1/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 0' }))
    expect(change).toHaveBeenCalledTimes(1)
    answer({
      nodes: [
        {
          nom_item_id: 200,
          dimension_type: 'CLASSIFICATION',
          parent_nom_item_id: null,
          classification_value: { type_code: 'D2', code: '200' },
        },
      ],
      pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(change).toHaveBeenCalledTimes(1)
  })

  it('lets the newer of two waiting picks land', async () => {
    let answer: (value: Awaited<ReturnType<typeof fetchDimensionValuesPage>>) => void = () => {}
    vi.mocked(fetchDimensionValuesPage).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    const change = mount(true, undefined, nested)
    await userEvent.click(screen.getByRole('button', { name: /Geografie unu: 2/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick nested 1' }))
    answer({
      nodes: [
        {
          nom_item_id: 200,
          dimension_type: 'CLASSIFICATION',
          parent_nom_item_id: null,
          classification_value: { type_code: 'D2', code: '200' },
        },
      ],
      pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
    })
    await waitFor(() => expect(change).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(change).toHaveBeenCalledTimes(1)
    const pins = change.mock.calls[0][0].clasificari as string[]
    expect(pins).toContain('D1:44')
  })

  it('drops a pick still waiting for its root once the selection has moved on', async () => {
    let answer: (value: Awaited<ReturnType<typeof fetchDimensionValuesPage>>) => void = () => {}
    vi.mocked(fetchDimensionValuesPage).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    const change = vi.fn()
    const props = {
      dataset: nested,
      scope: {
        territory: null,
        territoryMode: 'national-default' as const,
        territoryDefaulted: true,
        classifications: new Map([['D0', '1'], ['D1', '2'], ['D2', '3']]),
        defaultedTypes: new Set(['D0', 'D1', 'D2']),
        unitCode: '0',
        unitDefaulted: true,
        periodicity: 'ANNUAL' as const,
      },
      canDerive: true,
      unresolvedDimensions: [],
      territoryLabel: 'România',
      classificationLabels: new Map<string, string>(),
      unitLabel: 'Persoane',
      observedSpan: null,
      yearWindow: null,
      onChange: change,
    }
    const { rerender } = render(<DetailScopeSentence {...props} search={{}} />)
    await userEvent.click(screen.getByRole('button', { name: /Geografie unu: 2/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick 1' }))
    expect(change).not.toHaveBeenCalled()
    // Another write lands first — here, the back button.
    rerender(<DetailScopeSentence {...props} search={{ clasificari: ['D0:5'] }} />)
    answer({
      nodes: [
        {
          nom_item_id: 200,
          dimension_type: 'CLASSIFICATION',
          parent_nom_item_id: null,
          classification_value: { type_code: 'D2', code: '200' },
        },
      ],
      pageInfo: { totalCount: 1, hasNextPage: false, hasPreviousPage: false },
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(change).not.toHaveBeenCalled()
  })
})
