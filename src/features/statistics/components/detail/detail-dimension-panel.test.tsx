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

function mount(selectedKey: string | null = '1', appearance: 'popover' | 'inline' = 'inline') {
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
      appearance={appearance}
    />,
    { queryClient: createTestQueryClient() },
  )
  return { select, clear, picked }
}

beforeEach(() => vi.resetAllMocks())

/** A 20-member axis with diacritics and punctuation in its labels. */
function serveNamedAxis() {
  const names = ['Bârlad', 'Alba Iulia', '0- 4 ani', ...Array.from({ length: 17 }, (_, index) => `Localitatea ${index + 1}`)]
  fetchPage.mockResolvedValue({
    nodes: names.map((name, index) => member(String(index + 1), name)),
    pageInfo: { totalCount: names.length, hasNextPage: false, hasPreviousPage: false },
  })
}

describe('dimension option list', () => {
  it('reads the whole axis, a thousand at a time, and counts it once', async () => {
    // The server hands back 200 however many are asked for: the next read
    // starts after the rows held, not after a page counter.
    serveAxis(450, 200)
    mount()
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(450))
    expect(fetchPage.mock.calls.map(([params]) => params.offset)).toEqual([0, 200, 400])
    expect(fetchPage.mock.calls.every(([params]) => params.limit === 1000)).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('450 de opțiuni')
  })

  it('stops reading when a later page fails, and offers a retry instead', async () => {
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
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('shows no search field on a short list in a section, which takes the keyboard itself', async () => {
    scrollToIndex.mockClear()
    serveAxis(3, 200)
    const { clear, picked, select } = mount('2', 'inline')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const list = screen.getByRole('listbox')
    // The chosen value is `aria-current`, and the cursor opens on it, so the
    // reader hears it first; the row is also scrolled to, once.
    expect(screen.getByRole('option', { name: 'Localitatea 2' })).toHaveAttribute('aria-current', 'true')
    expect(list).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Localitatea 2' }).id)
    list.focus()
    await userEvent.keyboard('{ArrowDown}')
    // The cursor moves; the value chosen, which is what „selected" means in
    // a listbox, does not.
    expect(list).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Localitatea 3' }).id)
    expect(screen.getByRole('option', { name: 'Localitatea 3' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: 'Localitatea 2' })).toHaveAttribute('aria-selected', 'true')
    expect(scrollToIndex.mock.calls.filter(([, options]) => options !== undefined)).toEqual([[1, { align: 'center' }]])
    await userEvent.keyboard('{Enter}')
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ nom_item_id: 3 }))
    await userEvent.click(screen.getByRole('button', { name: 'Șterge' }))
    expect(clear).toHaveBeenCalledTimes(1)
    expect(picked).toHaveBeenCalledTimes(2)
  })

  it('walks the rows from the search field on a long list and picks with Enter', async () => {
    serveNamedAxis()
    const { select, picked } = mount(null)
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(20))
    const input = screen.getByRole('combobox', { name: /^Caută în / })
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: '0- 4 ani' }).id)
    expect(screen.getByRole('option', { name: '0- 4 ani' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Enter}')
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ nom_item_id: 3 }))
    expect(picked).toHaveBeenCalledTimes(1)
  })

  it('searches the held axis on the client, ignoring case, diacritics and punctuation', async () => {
    serveNamedAxis()
    mount(null)
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(20))
    fetchPage.mockClear()
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'barlad')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Bârlad'])
    await userEvent.clear(input)
    // Words in any order, each the start of a word; the dash is not a letter.
    await userEvent.type(input, 'ani 0 4')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['0- 4 ani'])
    expect(screen.getByRole('status')).toHaveTextContent('o opțiune')
    await userEvent.clear(input)
    // „7" starts „7", not the end of „17".
    await userEvent.type(input, 'localitatea 7')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Localitatea 7'])
    // No read went to the server for any of it.
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('says when nothing matches', async () => {
    serveNamedAxis()
    mount(null)
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(20))
    await userEvent.type(screen.getByRole('combobox'), 'zzz')
    expect(screen.getByText('Niciun rezultat')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('keeps the search field in a popover, even on a short list still loading', async () => {
    let answer!: (value: Awaited<ReturnType<typeof fetchDimensionValuesPage>>) => void
    fetchPage.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    mount('2', 'popover')
    // Before the list lands the field is there to take the popover's focus —
    // not „Șterge", which Enter would press.
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    answer({
      nodes: [member('1', 'Localitatea 1'), member('2', 'Localitatea 2')],
      pageInfo: { totalCount: 2, hasNextPage: false, hasPreviousPage: false },
    })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
