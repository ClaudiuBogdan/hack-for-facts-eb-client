import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { procurementMockFixtures } from '../mocks/fixtures'
import { useProcurementSearch } from '../hooks/use-procurement-data'
import { ProcurementSearchPage } from './procurement-search-page'
import { parseProcurementSearch } from '@/schemas/procurement-search'
import { TooltipProvider } from '@/components/ui/tooltip'

const navigateMock = vi.fn()

function macroText(
  strings: TemplateStringsArray | string,
  ...values: readonly unknown[]
) {
  if (typeof strings === 'string') return strings
  return strings.reduce(
    (text, part, index) => `${text}${part}${values[index] ?? ''}`,
    '',
  )
}

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: macroText,
  msg: macroText,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))

vi.mock('../hooks/use-procurement-data', () => ({
  useProcurementSearch: vi.fn(),
}))

const useProcurementSearchMock = vi.mocked(useProcurementSearch)

function renderSearchPage(params = parseProcurementSearch({})) {
  return render(
    <TooltipProvider>
      <ProcurementSearchPage params={params} />
    </TooltipProvider>,
  )
}

describe('ProcurementSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const params = parseProcurementSearch({})
    useProcurementSearchMock.mockReturnValue({
      data: procurementMockFixtures.searchForParams(params),
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useProcurementSearch>)
  })

  it('renders search results with mock, freshness, partial coverage, and blocked-filter guardrails', () => {
    renderSearchPage()

    expect(
      screen.getByRole('heading', { name: 'Caută în achiziții publice' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Mock')[0]).toBeInTheDocument()
    expect(screen.getByText(/Date până la:/)).toHaveTextContent('25.06.2026')
    expect(screen.getByText(/sincronizare suspendată/)).toBeInTheDocument()
    expect(
      screen.getByText(/Filtrul de regiune furnizor este indisponibil în v1/),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Servicii de curățenie')[0]).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Detalii/ }))

    expect(
      screen.getByText('Filtre indisponibile în v1:'),
    ).toBeInTheDocument()
    expect(screen.getByText('Filtru regiune furnizor')).toBeInTheDocument()
    expect(screen.getByText('Filtru generat LLM')).toBeInTheDocument()
    expect(screen.getAllByText('sub prag')[0]).toBeInTheDocument()
  })

  it('submits free text as URL search state while preserving deterministic filters', () => {
    const params = parseProcurementSearch({
      authority_cui: '2939237',
      grain: 'contracts',
      page: 3,
    })

    renderSearchPage(params)

    fireEvent.change(screen.getByLabelText('Caută după text'), {
      target: { value: 'drumuri' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplică textul căutat' }))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/procurement/search',
      search: expect.any(Function),
    })

    const searchUpdater = navigateMock.mock.calls[0]?.[0].search as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>
    expect(searchUpdater(params)).toMatchObject({
      authority_cui: '2939237',
      grain: 'contracts',
      q: 'drumuri',
      page: 1,
    })
  })

  it('renders an honest empty state when the current filters return no records', () => {
    const params = parseProcurementSearch({
      grain: 'contracts',
      supplier_cui: 'does-not-exist',
    })
    const emptyData = {
      ...procurementMockFixtures.searchForParams(params),
      records: [],
      page: { page: 1, pageSize: 25, total: 0 },
    }
    useProcurementSearchMock.mockReturnValue({
      data: emptyData,
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useProcurementSearch>)

    renderSearchPage(params)

    expect(screen.getByText('Niciun rezultat')).toBeInTheDocument()
    expect(
      screen.getByText('Ajustează filtrele sau schimbă tipul de înregistrări.'),
    ).toBeInTheDocument()
  })
})
