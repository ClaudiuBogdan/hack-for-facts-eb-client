import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { queryOf, type Query } from '../../lib/analytics-model'
import type { PlaceFeatures } from '../../lib/analytics-places'
import type { Namer } from '../../lib/analytics-text'
import { FilterPanel } from './analytics-filters'

/**
 * The filters panel's contract, as far as a unit test holds it: the recent
 * years first and the rest a click away; a place found by typing and picked
 * by the keys, shown as its path, removed by its ✕; each list saying in
 * words that it is reading, that it failed, or that nothing matched.
 */

const search = vi.hoisted(() => ({
  status: { kind: 'idle' } as { readonly kind: string; readonly stale?: boolean },
  results: [] as readonly unknown[],
  isCurrent: true,
  retry: vi.fn(),
}))
const cpv = vi.hoisted(() => ({ data: undefined as readonly { readonly value: string; readonly label: string }[] | undefined, isError: false, settled: false, retry: vi.fn() }))
const places = vi.hoisted(() => ({ geography: undefined as unknown, uat: undefined as unknown, counties: undefined as unknown, failed: false, countiesFailed: false, retryCounties: vi.fn() }))

vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

vi.mock('@/features/landing/hooks/use-landing-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/landing/hooks/use-landing-search')>()
  const { useState } = await import('react')
  return {
    ...actual,
    useSearchResults: () => {
      const [term, setTerm] = useState('')
      return { term, setTerm, reset: () => setTerm(''), status: search.status, results: search.results, retry: search.retry, isCurrent: search.isCurrent }
    },
  }
})

vi.mock('../../hooks/use-procurement-analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/use-procurement-analytics')>()
  const { placeIndexOf: indexOf } = await import('../../lib/analytics-places')
  return {
    ...actual,
    useCpvSearch: () => cpv,
    useNames: () => ({ data: undefined }),
    usePlaceIndex: () => {
      const index = indexOf(places.geography as Parameters<typeof indexOf>[0], places.uat as PlaceFeatures, places.counties as PlaceFeatures)
      return {
        index,
        loading: !places.failed && (places.uat === undefined || places.counties === undefined),
        failed: places.failed,
        retry: vi.fn(),
        countiesLoading: false,
        countiesFailed: places.countiesFailed,
        retryCounties: places.retryCounties,
      }
    },
  }
})

const GEOGRAPHY = {
  regions: [{ region: 'Centru' }, { region: 'Nord-Vest' }],
  counties: [
    { countyCode: 'SB', countyName: 'SIBIU', region: 'Centru' },
    { countyCode: 'CJ', countyName: 'CLUJ', region: 'Nord-Vest' },
  ],
}
const UAT = {
  features: [
    { properties: { natcode: '143450', name: 'Sibiu', countyMn: 'SB', natLevName: 'Municipiu resedinta de judet', insPop2021: 134308 } },
    { properties: { natcode: '144928', name: 'Miercurea Sibiului', countyMn: 'SB', natLevName: 'Oras', insPop2021: 3619 } },
  ],
}
const COUNTIES = { features: [{ properties: { countyCode: 323, mnemonic: 'SB', name: 'Sibiu' } }] }

const ANSWER = {
  cutoff: { direct: '2026-05', contract: '2026-05', failed: false },
  period: { from: '2025-06', to: '2026-05', throughCutoff: true, replaced: false },
  figures: { data: undefined },
} as unknown as Answer
const NAMER: Namer = { names: undefined, divisions: new Map(), counties: new Map([['SB', 'Sibiu']]), localities: null }

/** Whether a field's live region says `text` now. */
const announced = (text: string) => screen.getAllByRole('status').some((node) => node.textContent === text)

function panel(query: Query = queryOf({}), phone = false) {
  const onChange = vi.fn<(query: Query) => void>()
  const view = render(<FilterPanel query={query} answer={ANSWER} namer={NAMER} phone={phone} onChange={onChange} />)
  return Object.assign(onChange, { view })
}

beforeEach(() => {
  search.status = { kind: 'idle' }
  search.results = []
  search.isCurrent = true
  search.retry.mockClear()
  cpv.data = undefined
  cpv.isError = false
  cpv.settled = false
  places.geography = GEOGRAPHY
  places.uat = UAT
  places.counties = COUNTIES
  places.failed = false
  places.countiesFailed = false
  places.retryCounties.mockClear()
})

describe('FilterPanel', () => {
  it('shows the four recent years, the rest on request, and opens them when a hidden year is picked', () => {
    panel()
    expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2022' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Arată mai multe' }))
    expect(screen.getByRole('button', { name: '2016' })).toBeInTheDocument()
  })

  it('keeps a picked older year in view beside the recent ones, the rest still a click away', () => {
    panel(queryOf({ perioada: '2019' }))
    expect(screen.getByRole('button', { name: '2019' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: '2020' })).not.toBeInTheDocument()
    const more = screen.getByRole('button', { name: 'Arată mai multe' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(more)
    expect(screen.getByRole('button', { name: '2020' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Arată mai puține' }))
    expect(screen.queryByRole('button', { name: '2020' })).not.toBeInTheDocument()
  })

  it('names the months in the page’s language', () => {
    panel()
    expect(screen.getByRole('button', { name: /^De la: iun\. 2025$/ })).toBeInTheDocument()
  })

  it('finds a place by typing and picks it with the keys', () => {
    const onChange = panel()
    const field = screen.getByRole('combobox', { name: 'Locul instituției' })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: 'sibiu' } })
    const list = screen.getByRole('listbox', { name: 'Locuri' })
    // The county, then its localities, each with its kind and its county.
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual(['Sibiu', 'SibiureședințăSibiu', 'Miercurea SibiuluiorașSibiu'])
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0].filters.loc).toEqual({ level: 'localitate', values: ['143450'] })
  })

  it('picks nothing on Enter with nothing typed: the regions on offer are no answer', () => {
    const onChange = panel()
    const field = screen.getByRole('combobox', { name: 'Locul firmei' })
    fireEvent.focus(field)
    fireEvent.submit(field.closest('form')!)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('takes the focus to the chip when a pick removes the field', () => {
    const onChange = panel()
    const field = screen.getByRole('combobox', { name: 'Locul instituției' })
    act(() => field.focus())
    fireEvent.change(field, { target: { value: 'sibiu' } })
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'Enter' })
    onChange.view.rerender(<FilterPanel query={onChange.mock.calls[0]![0]} answer={ANSWER} namer={NAMER} phone={false} onChange={onChange} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Scoate Municipiul Sibiu' }))
  })

  it('closes a place’s list on Escape and keeps the focus in the field', () => {
    panel()
    const field = screen.getByRole('combobox', { name: 'Locul instituției' })
    act(() => field.focus())
    fireEvent.change(field, { target: { value: 'sibiu' } })
    expect(screen.getByRole('listbox', { name: 'Locuri' })).toBeInTheDocument()
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.queryByRole('listbox', { name: 'Locuri' })).not.toBeInTheDocument()
    expect(field).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(field)
    fireEvent.change(field, { target: { value: 'cluj' } })
    expect(screen.getByRole('listbox', { name: 'Locuri' })).toBeInTheDocument()
  })

  it('shows the last term’s institutions dimmed while the new one is read, and picks none of them', () => {
    search.status = { kind: 'results', stale: true }
    search.results = [{ id: '1', title: 'Spitalul Județean Sibiu', href: '/entities/4240600', isExternal: false }]
    search.isCurrent = false
    const onChange = panel()
    const field = screen.getByRole('combobox', { name: 'Instituția' })
    fireEvent.change(field, { target: { value: 'spital cluj' } })
    expect(screen.getByRole('option', { name: 'Spitalul Județean Sibiu' })).toBeDisabled()
    expect(announced('Se caută…')).toBe(true)
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.submit(field.closest('form')!)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the options, and the box that scrolls them, out of the Tab order', () => {
    panel()
    const field = screen.getByRole('combobox', { name: 'Locul firmei' })
    fireEvent.focus(field)
    for (const option of screen.getAllByRole('option')) expect(option).toHaveAttribute('tabindex', '-1')
    // Chrome makes a scroller that overflows a Tab stop of its own.
    fireEvent.change(field, { target: { value: 'sibiu' } })
    expect(screen.getByRole('listbox', { name: 'Locuri' }).parentElement).toHaveAttribute('tabindex', '-1')
  })

  it('offers the regions before a word is typed', () => {
    panel()
    fireEvent.focus(screen.getByRole('combobox', { name: 'Locul firmei' }))
    expect(within(screen.getByRole('listbox', { name: 'Regiuni' })).getAllByRole('option').map((option) => option.textContent)).toEqual(['Centru', 'Nord-Vest'])
  })

  it('shows a picked place as its path, a step back up, and its ✕', () => {
    const onChange = panel(queryOf({ localitate: '143450' }))
    expect(screen.getByRole('button', { name: 'Reg. Centru' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jud. Sibiu' }))
    expect(onChange.mock.calls[0]![0].filters.loc).toEqual({ level: 'judet', values: ['SB'] })
    fireEvent.click(screen.getByRole('button', { name: 'Scoate Municipiul Sibiu' }))
    expect(onChange.mock.calls[1]![0].filters.loc).toBeUndefined()
  })

  it('says the localities are loading, and that they failed, while the counties still answer', () => {
    places.uat = undefined
    places.counties = undefined
    panel()
    const field = screen.getByRole('combobox', { name: 'Locul instituției' })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: 'sibiu' } })
    expect(screen.getByText('Se încarcă localitățile…')).toBeInTheDocument()
    expect(announced('Se încarcă…')).toBe(true)
    expect(within(screen.getByRole('listbox', { name: 'Locuri' })).getAllByRole('option').map((option) => option.textContent)).toEqual(['Sibiu'])
  })

  it('says the regions and counties failed in a search too, and still finds the localities', () => {
    places.geography = undefined
    places.countiesFailed = true
    panel()
    const field = screen.getByRole('combobox', { name: 'Locul instituției' })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: 'sibiu' } })
    expect(within(screen.getByRole('listbox', { name: 'Locuri' })).getAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('alert')).toHaveTextContent('Regiunile și județele nu s-au încărcat.')
    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(places.retryCounties).toHaveBeenCalledTimes(1)
  })

  it('on a phone, gives a focused search room to rise, and takes it back when a pick removes the field', () => {
    const onChange = panel(queryOf({}), true)
    const root = onChange.view.container.firstElementChild!
    const field = screen.getByRole('combobox', { name: 'Locul instituției' })
    fireEvent.focus(field)
    expect(root).toHaveClass('pb-[70vh]')
    fireEvent.change(field, { target: { value: 'sibiu' } })
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.keyDown(field, { key: 'Enter' })
    // The address now holds the locality: its picker gives way to the chip, the field with it.
    onChange.view.rerender(<FilterPanel query={onChange.mock.calls[0]![0]} answer={ANSWER} namer={NAMER} phone onChange={onChange} />)
    expect(screen.queryByRole('combobox', { name: 'Locul instituției' })).not.toBeInTheDocument()
    expect(root).not.toHaveClass('pb-[70vh]')
  })

  it('says a failed search failed, and runs it again on request', () => {
    search.status = { kind: 'error' }
    panel()
    fireEvent.change(screen.getByRole('combobox', { name: 'Instituția' }), { target: { value: 'spital' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Căutarea nu a mers.')
    fireEvent.click(screen.getByRole('button', { name: 'Încearcă din nou' }))
    expect(search.retry).toHaveBeenCalledTimes(1)
  })

  it('says a category search found nothing, and that it is reading before it knows', () => {
    const { rerender } = render(<FilterPanel query={queryOf({})} answer={ANSWER} namer={NAMER} phone={false} onChange={vi.fn()} />)
    const field = screen.getByRole('combobox', { name: 'Categoria' })
    fireEvent.change(field, { target: { value: 'xyzw' } })
    expect(announced('Se caută…')).toBe(true)
    cpv.data = []
    cpv.settled = true
    rerender(<FilterPanel query={queryOf({})} answer={ANSWER} namer={NAMER} phone={false} onChange={vi.fn()} />)
    expect(announced('Nimic pentru „xyzw".')).toBe(true)
  })

  it('never picks the last term’s categories for the new one', () => {
    const onChange = vi.fn()
    cpv.data = [{ value: '33600000', label: 'Produse farmaceutice' }]
    cpv.settled = false
    render(<FilterPanel query={queryOf({})} answer={ANSWER} namer={NAMER} phone={false} onChange={onChange} />)
    const field = screen.getByRole('combobox', { name: 'Categoria' })
    fireEvent.change(field, { target: { value: 'drumuri' } })
    expect(screen.getByRole('option', { name: /Produse farmaceutice/ })).toBeDisabled()
    fireEvent.keyDown(field, { key: 'ArrowDown' })
    fireEvent.submit(field.closest('form')!)
    expect(onChange).not.toHaveBeenCalled()
  })
})
