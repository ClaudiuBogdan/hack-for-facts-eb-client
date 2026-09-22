import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  createTestQueryClient,
  render,
  screen,
  waitFor,
} from '@/test/test-utils'
import { searchInsTerritories } from '../api/graphql/statistics-fetchers'
import { DetailTerritoryControl } from './detail-territory-control'
import type { StatisticsTerritorySearchRow } from '@/schemas/statistics'

vi.mock('../api/graphql/statistics-fetchers', () => ({
  searchInsTerritories: vi.fn(),
}))
// jsdom has no layout, so the virtualiser would draw nothing; here it draws
// every row, which also makes „the last row is in view" true at once.
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
    scrollToIndex: vi.fn(),
    measureElement: () => undefined,
  }),
}))
const county: StatisticsTerritorySearchRow = {
  code: 'B',
  siruta: null,
  level: 'NUTS3',
  name: 'București județ',
  countyCode: null,
  countyName: null,
}
const city: StatisticsTerritorySearchRow = {
  ...county,
  code: '179132',
  siruta: '179132',
  level: 'LAU',
  name: 'Municipiul București',
}
const sector: StatisticsTerritorySearchRow = {
  ...city,
  code: '179141',
  siruta: '179141',
  name: 'Sectorul 1',
}
const page = (rows: StatisticsTerritorySearchRow[], hasNextPage = false) => ({
  rows,
  totalCount: -1,
  hasNextPage,
})
const mount = (onChange = vi.fn()) => {
  render(
    <DetailTerritoryControl
      levels={['NATIONAL', 'NUTS3', 'LAU']}
      search={{
        teritoriu: 'siruta:179132',
        clasificari: ['D0:7', 'D1:8'],
        unitate: '0',
      }}
      onChange={onChange}
    />,
    { queryClient: createTestQueryClient() },
  )
  return onChange
}

beforeEach(() => vi.resetAllMocks())

describe('independent canonical territory control', () => {
  it('distinguishes county, municipality and sector and patches no source coordinates', async () => {
    vi.mocked(searchInsTerritories).mockResolvedValue(
      page([county, city, sector]),
    )
    const change = mount()
    await userEvent.click(
      await screen.findByRole('option', { name: /București județ/ }),
    )
    expect(change).toHaveBeenLastCalledWith({ teritoriu: 'cod:B' })
    await userEvent.click(
      screen.getByRole('option', { name: /Municipiul București/ }),
    )
    expect(change).toHaveBeenLastCalledWith({ teritoriu: 'siruta:179132' })
    await userEvent.click(screen.getByRole('option', { name: /Sectorul 1/ }))
    expect(change).toHaveBeenLastCalledWith({ teritoriu: 'siruta:179141' })
    await userEvent.click(
      screen.getByRole('button', { name: 'Șterge filtrul teritorial' }),
    )
    expect(change).toHaveBeenLastCalledWith({ teritoriu: undefined })
    expect(searchInsTerritories).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { levels: ['NATIONAL', 'NUTS3', 'LAU'] },
        signal: expect.any(AbortSignal),
      }),
    )
  })
  it('reads on by returned row count as the list is scrolled, and restarts a new search from the first page', async () => {
    vi.mocked(searchInsTerritories)
      .mockResolvedValueOnce(page([county, city], true))
      .mockResolvedValueOnce(page([sector]))
      .mockResolvedValue(page([county]))
    mount()
    await screen.findByRole('option', { name: /Sectorul 1/ })
    expect(searchInsTerritories).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ offset: 2 }),
    )
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Următor' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('combobox'), 'București')
    await waitFor(() =>
      expect(searchInsTerritories).toHaveBeenLastCalledWith(
        expect.objectContaining({
          offset: 0,
          filter: { levels: ['NATIONAL', 'NUTS3', 'LAU'], search: 'București' },
        }),
      ),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: /Sectorul 1/ }),
      ).not.toBeInTheDocument(),
    )
  })
  it('offers retry for an empty continuing page instead of silently ending the result list', async () => {
    vi.mocked(searchInsTerritories)
      .mockResolvedValueOnce(page([], true))
      .mockResolvedValue(page([county]))
    mount()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reîncearcă' }),
    )
    expect(
      await screen.findByRole('option', { name: /București județ/ }),
    ).toBeInTheDocument()
  })
  it('aborts an outstanding lookup when the control closes', async () => {
    vi.mocked(searchInsTerritories).mockImplementation(
      () => new Promise(() => {}),
    )
    const { unmount } = render(
      <DetailTerritoryControl
        search={{}}
        onChange={vi.fn()}
        levels={['NATIONAL', 'NUTS3', 'LAU']}
      />,
      { queryClient: createTestQueryClient() },
    )
    const signal = vi.mocked(searchInsTerritories).mock.calls[0][0].signal
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
  })
})
