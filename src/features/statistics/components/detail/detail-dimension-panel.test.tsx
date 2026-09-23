import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  createTestQueryClient,
  render,
  screen,
  waitFor,
} from '@/test/test-utils'
import type { InsDimensionValue } from '@/schemas/ins'
import { fetchDimensionValuesPage } from '../../api/dataset-detail-api'
import { DetailDimensionPanel } from './detail-dimension-panel'

vi.mock('../../api/dataset-detail-api', () => ({
  fetchDimensionValuesPage: vi.fn(),
  fetchDatasetSeries: vi.fn(),
  fetchDatasetTier0: vi.fn(),
}))

// jsdom has no layout, so the virtualiser would draw nothing; here it draws
// every row, which also makes „the last row is in view" true at once.
const scrollToIndex = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 36,
        size: 36,
      })),
    getTotalSize: () => count * 36,
    scrollToIndex,
    measureElement: () => undefined,
  }),
}))

const fetchPage = vi.mocked(fetchDimensionValuesPage)

const member = (code: string, label: string): InsDimensionValue => ({
  nom_item_id: Number(code),
  dimension_type: 'CLASSIFICATION',
  label_ro: label,
  classification_value: { type_code: 'D2', code },
})

/** An axis of `total` members served `pageSize` at a time. */
function serveAxis(total: number, pageSize: number) {
  fetchPage.mockImplementation(async ({ offset, limit, search }) => {
    const all = Array.from({ length: total }, (_, index) =>
      member(String(index + 1), `Localitatea ${index + 1}`),
    ).filter((value) => !search || value.label_ro?.includes(search))
    const nodes = all.slice(offset, offset + Math.min(limit, pageSize))
    return {
      nodes,
      pageInfo: {
        totalCount: all.length,
        hasNextPage: offset + nodes.length < all.length,
        hasPreviousPage: offset > 0,
      },
    }
  })
}

function mount(selectedKey: string | null = '1') {
  const select = vi.fn()
  const clear = vi.fn()
  const picked = vi.fn()
  render(
    <DetailDimensionPanel
      datasetCode="SOM101F"
      dimensionIndex={2}
      label="Localitati "
      selectedKey={selectedKey}
      optionKey={(value) => value.classification_value?.code ?? null}
      onSelect={select}
      onClear={clear}
      onPicked={picked}
      active
    />,
    { queryClient: createTestQueryClient() },
  )
  return { select, clear, picked }
}

beforeEach(() => vi.resetAllMocks())

describe('dimension option list', () => {
  it('reads page after page until the axis is held, and counts it once', async () => {
    serveAxis(450, 200)
    mount()
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(450))
    expect(fetchPage.mock.calls.map(([params]) => params.offset)).toEqual([0, 200, 400])
    expect(screen.getByRole('status')).toHaveTextContent('450 de opțiuni')
    expect(screen.queryByRole('button', { name: /pagina/i })).not.toBeInTheDocument()
  })

  it('stops reading on when a later page fails, and offers a retry instead', async () => {
    fetchPage
      .mockResolvedValueOnce({
        nodes: [member('1', 'Localitatea 1')],
        pageInfo: { totalCount: 2, hasNextPage: true, hasPreviousPage: false },
      })
      .mockRejectedValue(new Error('down'))
    mount()
    expect(
      await screen.findByRole('button', { name: 'Reîncearcă' }),
    ).toBeInTheDocument()
    // Settle: a looping effect would keep calling; a sound one stops at two.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('marks the chosen member as current, and offers to clear it', async () => {
    scrollToIndex.mockClear()
    serveAxis(3, 200)
    const { clear, picked } = mount('2')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    // The chosen value is `aria-current`, and the cursor — `aria-selected`,
    // the combobox pattern — opens on it, so the reader hears it first.
    expect(screen.getByRole('option', { name: 'Localitatea 2' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('option', { name: 'Localitatea 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Localitatea 1' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Localitatea 2' }).id,
    )
    // …and the row is shown, not only named: Enter must pick a row in view.
    // Once — the arrows scroll as they move, and the seed never pulls back.
    await userEvent.type(screen.getByRole('combobox'), '{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Localitatea 3' })).toHaveAttribute('aria-selected', 'true')
    expect(scrollToIndex.mock.calls.filter(([, options]) => options !== undefined)).toEqual([[1, { align: 'center' }]])
    expect(scrollToIndex).toHaveBeenLastCalledWith(2)
    await userEvent.click(screen.getByRole('button', { name: 'Șterge' }))
    expect(clear).toHaveBeenCalledTimes(1)
    expect(picked).toHaveBeenCalledTimes(1)
  })

  it('walks the rows from the search box and picks with Enter', async () => {
    serveAxis(3, 200)
    const { select, picked } = mount()
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    const input = screen.getByRole('combobox', { name: /^Caută în / })
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Localitatea 3' }).id,
    )
    // The row the cursor is on is the selected one for a screen reader.
    expect(screen.getByRole('option', { name: 'Localitatea 3' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Localitatea 1' })).toHaveAttribute('aria-selected', 'false')
    await userEvent.keyboard('{Enter}')
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ nom_item_id: 3 }))
    expect(picked).toHaveBeenCalledTimes(1)
  })

  it('hands the typed query to the server and restarts from the first page', async () => {
    serveAxis(450, 200)
    mount()
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(450))
    fetchPage.mockClear()
    await userEvent.type(screen.getByRole('combobox'), 'Localitatea 44')
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('11 opțiuni'),
    )
    expect(fetchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Localitatea 44', offset: 0 }),
    )
    expect(screen.getAllByRole('option')).toHaveLength(11)
  })

  it('says when nothing matches', async () => {
    serveAxis(3, 200)
    mount()
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    await userEvent.type(screen.getByRole('combobox'), 'zzz')
    await waitFor(() => expect(screen.getByText('Niciun rezultat')).toBeInTheDocument())
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})
