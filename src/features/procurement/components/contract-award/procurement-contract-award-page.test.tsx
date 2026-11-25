import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createTestQueryClient } from '@/test/test-utils'
import { mapContractAward } from '../../lib/contract-award-model'
import { rawAward, RECORD_ID } from '../../lib/contract-award.fixture'
import { ProcurementContractAwardPage, type ProcurementContractAwardInitialData } from './procurement-contract-award-page'

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
  fetchContractAward: (...args: unknown[]) => read(...args),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const { CaRecordsOffError } = await import('../../api/procurement-contract-award-api')

function page(initialData?: ProcurementContractAwardInitialData, id = RECORD_ID) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ProcurementContractAwardPage id={id} initialData={initialData} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

const found = (raw = rawAward()) => ({ kind: 'found' as const, award: mapContractAward(raw.award), reanchored: false })

/** One contract award from procurement v3 (PROC-KB0Z step 1), as the server renders it and the browser reads it. */
describe('ProcurementContractAwardPage', () => {
  beforeEach(() => {
    navigate.mockClear()
    read.mockReset()
    read.mockImplementation(() => new Promise(() => undefined))
  })
  afterEach(cleanup)

  it('server-renders the award: its amount as awarded, the buyer’s page, the winner’s, the lot’s estimate as an estimate, the notice', () => {
    const html = renderToStaticMarkup(page({ id: RECORD_ID, read: found() }))
    expect(html).toContain('Reabilitare școala gimnazială nr. 2')
    expect(html).toContain('Valoarea atribuită')
    expect(html).toContain('SEAP nu spune dacă include TVA')
    expect(html).toContain('href="/procurement/institutions/4364446"')
    expect(html).toContain('href="/procurement/suppliers/14837428"')
    expect(html).toContain('estimat 1.300.000')
    expect(html).toContain('href="https://www.e-licitatie.ro/pub/notices/contract-award-notices/view/100234"')
  })

  it('says a masked, a code-only and a withheld winner as plain text, a person buyer with no link, and a joint win', () => {
    const raw = rawAward({
      record: {
        winnerCount: 3,
        flags: ['joint_win'],
        buyer: { fiscalCode: '30111299', displayKind: 'person_masked', name: 'Maria I***' },
        winners: [
          { order: 1, displayKind: 'person_masked', fiscalCode: '30111222', name: 'Ion P*** PFA', disclosed: true },
          { order: 2, displayKind: 'code_only', fiscalCode: '30111223', name: null, disclosed: false },
          { order: 3, displayKind: 'withheld', fiscalCode: null, name: null, disclosed: null },
        ],
      },
    })
    const html = renderToStaticMarkup(page({ id: RECORD_ID, read: found(raw) }))
    expect(html).toContain('Ion P*** PFA (CUI 30111222)')
    expect(html).toContain('CUI 30111223 (nume nepublicat)')
    expect(html).toContain('Câștigător nepublicat')
    expect(html).toContain('Maria I*** (CUI 30111299)')
    expect(html).not.toContain('/procurement/suppliers/')
    expect(html).not.toContain('/procurement/institutions/')
    expect(html).toContain('Câștigat de o asociere')
  })

  it('says a framework’s ceiling as the most it may spend, and a price change apart from the amount', () => {
    const raw = rawAward({ record: { valueKind: 'framework_ceiling', contractKind: 'framework_agreement', changeLei: '-3500', changePublicationDay: '2024-09-02' } })
    const html = renderToStaticMarkup(page({ id: RECORD_ID, read: found(raw) }))
    expect(html).toContain('Acord-cadru')
    expect(html).toContain('Valoarea maximă a acordului-cadru')
    expect(html).toContain('−3.500')
    expect(html).toContain('neadunată la valoare')
  })

  it('keeps an award before 2021, a missing one and the API’s switch off apart', async () => {
    expect(renderToStaticMarkup(page({ id: RECORD_ID, read: { kind: 'outside' } }))).toContain('Contractele atribuite înainte de 2021 nu sunt încă publicate.')
    expect(renderToStaticMarkup(page({ id: RECORD_ID, read: { kind: 'missing' } }))).toContain('Contractul nu a fost găsit')
    read.mockRejectedValue(new CaRecordsOffError())
    render(page({ id: RECORD_ID, off: true }))
    expect(await screen.findByText('Contractul nu este disponibil acum')).toBeInTheDocument()
  })

  it('never shows a kept award once a read fails: the switch off is said, not the older answer', async () => {
    read.mockRejectedValue(new CaRecordsOffError())
    const client = createTestQueryClient()
    client.setQueryData(['procurement', 'contract-award', RECORD_ID], found())
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <ProcurementContractAwardPage id={RECORD_ID} />
        </TooltipProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Contractul nu este disponibil acum')).toBeInTheDocument()
    expect(screen.queryByText('CONSTRUCT TEST SRL')).toBeNull()
  })

  it('says a framework’s footer as its maximum, not an award', () => {
    const html = renderToStaticMarkup(page({ id: RECORD_ID, read: found(rawAward({ record: { valueKind: 'framework_ceiling', contractKind: 'framework_agreement' } })) }))
    expect(html).toContain('Valoarea e cea maximă a acordului-cadru, nu o plată.')
    expect(html).not.toContain('Valoarea e cea atribuită, nu o plată.')
  })

  it('moves an earlier build’s id to the current one, the history entry replaced', async () => {
    render(page({ id: 'e_licitatie:ca:99:11', read: { ...found(), reanchored: true } }, 'e_licitatie:ca:99:11'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/procurement/contract-awards/$id', params: { id: RECORD_ID }, replace: true }))
  })
})
