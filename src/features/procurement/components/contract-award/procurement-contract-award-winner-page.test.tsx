import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createTestQueryClient } from '@/test/test-utils'
import type { ProcurementContractAwardWinnerSearch } from '@/schemas/procurement-contract-award-winner'
import { mapWinnerContractAwards } from '../../lib/contract-award-model'
import { rawWinnerAwards, WINNER_CODE } from '../../lib/contract-award.fixture'
import { ProcurementContractAwardWinnerPage } from './procurement-contract-award-winner-page'

const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search: _search, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: unknown }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => navigate,
  useRouter: () => ({ routesById: {}, state: { matches: [] } }),
}))

const read = vi.hoisted(() => vi.fn())
vi.mock('../../api/procurement-contract-award-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/procurement-contract-award-api')>()),
  fetchWinnerContractAwards: (...args: unknown[]) => read(...args),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const { CaRecordsOffError } = await import('../../api/procurement-contract-award-api')

function page(search: ProcurementContractAwardWinnerSearch = {}, cui = WINNER_CODE) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ProcurementContractAwardWinnerPage cui={cui} search={search} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

const found = (raw = rawWinnerAwards()) => ({ kind: 'found' as const, awards: mapWinnerContractAwards(raw) })

/** The search a navigation wrote, from the updater the page passed. */
function lastSearch(previous: Record<string, unknown>): Record<string, unknown> {
  const call = navigate.mock.calls[navigate.mock.calls.length - 1] as unknown as [{ readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }]
  return call[0].search(previous)
}

/** A winner code's contract awards (KB0Z): the list an off-gate registry-named company links to. */
describe('ProcurementContractAwardWinnerPage', () => {
  beforeEach(() => {
    navigate.mockClear()
    read.mockReset()
    read.mockImplementation(() => new Promise(() => undefined))
  })
  afterEach(cleanup)

  it('names the company as the API serves it, counts its awards, and lists each with its buyer', async () => {
    read.mockResolvedValue(found())
    render(page())
    expect(await screen.findByRole('heading', { name: 'CONSTRUCT TEST SRL' })).toBeInTheDocument()
    expect(read.mock.calls[0]?.[0]).toEqual({ code: WINNER_CODE, year: null, sort: 'awardDayDesc', page: 1 })
    expect(document.body).toHaveTextContent('2 contracte atribuite câștigate din 2021 încoace, 2 cu valoare publicată.')
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/procurement/contract-awards/e_licitatie:ca:100234:550011')
    expect(hrefs).toContain('/procurement/institutions/4364446')
    // A person buyer by its masked name, with no link; outside the gate, no supplier's page.
    expect(document.body).toHaveTextContent('Maria I*** (CUI 30111299)')
    expect(hrefs.some((href) => href?.includes('/procurement/suppliers/'))).toBe(false)
    expect(document.body).toHaveTextContent('în asociere')
  })

  it('links a company in the direct purchases’ gate to its supplier’s page too', async () => {
    read.mockResolvedValue(found(rawWinnerAwards({ summary: { winner: { order: null, displayKind: 'company', fiscalCode: WINNER_CODE, name: 'CONSTRUCT TEST SRL', disclosed: true } } })))
    render(page({ year: 2024 }))
    expect(await screen.findByRole('link', { name: 'Achizițiile directe ale firmei' })).toHaveAttribute('href', `/procurement/suppliers/${WINNER_CODE}`)
    expect(read.mock.calls[0]?.[0]).toMatchObject({ year: 2024 })
  })

  it('says one „none" for any code the API refuses, and the switch off apart from it', async () => {
    read.mockResolvedValue({ kind: 'missing' })
    render(page({}, '30111222'))
    expect(await screen.findByText('Nu sunt contracte atribuite de arătat')).toBeInTheDocument()
    expect(document.body).toHaveTextContent('Pentru codul 30111222 nu avem o listă publicată de contracte atribuite.')
    expect(screen.queryByRole('heading')).toBeNull()
    cleanup()
    read.mockRejectedValue(new CaRecordsOffError())
    render(page())
    expect(await screen.findByText('Contractele atribuite nu sunt disponibile acum')).toBeInTheDocument()
  })

  it('says a year with no awards as such, and writes the order to the URL starting from its first page', async () => {
    read.mockResolvedValue(found(rawWinnerAwards({ rows: [], summary: { recordCount: 0, valuedCount: 0 }, records: { total: 0 } })))
    render(page({ year: 2023, pagina: 2 }))
    await waitFor(() => expect(document.body).toHaveTextContent('Niciun contract atribuit câștigat în 2023.'))
    fireEvent.click(screen.getByRole('radio', { name: 'Cele mai mari' }))
    expect(lastSearch({ year: 2023, pagina: 2 })).toEqual({ year: 2023, ordine: 'valoare', pagina: undefined })
  })
})
