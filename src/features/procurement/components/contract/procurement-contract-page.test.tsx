import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { cniRead, ctContext, plainRead } from '../../lib/contract.fixture'
import { contractSheetOf, type ContractSheet, type CtContext } from '../../lib/contract-model'
import { ProcurementContractPage } from './procurement-contract-page'

/**
 * The page's contract, as far as a unit test holds it: what the loader read
 * is in the HTML the server sends — the head (what it is, between whom, for
 * how much, when), the contract section by section, and the context after
 * it, in its own band.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: unknown }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(`$${key}`, value)
    return (
      <a href={href} data-search={JSON.stringify(search ?? {})} {...props}>
        {children}
      </a>
    )
  },
  useRouter: () => ({ routesById: {}, state: { matches: [] } }),
}))

// The page's reads never land here: what it shows is what the loader seeded.
vi.mock('../../api/procurement-contract-api', () => ({
  fetchContract: vi.fn(() => new Promise(() => undefined)),
  fetchContractContext: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

function html(sheet: ContractSheet | null, context?: CtContext | null): string {
  const id = sheet?.id ?? 'missing'
  return renderToStaticMarkup(
    <QueryClientProvider client={createTestQueryClient()}>
      <ProcurementContractPage id={id} initialData={{ id, contract: sheet, context }} />
    </QueryClientProvider>,
  )
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    // Every white space, the no-break space between a figure and its unit included.
    .replace(/\s+/g, ' ')
}

const inOrder = (page: string, parts: readonly string[]) => {
  let at = -1
  for (const part of parts) {
    const next = page.indexOf(part, at + 1)
    expect(next, part).toBeGreaterThan(at)
    at = next
  }
}

describe('an association’s contract', () => {
  const page = html(contractSheetOf(cniRead()), ctContext())

  it('opens on what it is, between whom, for how much, when', () => {
    expect(page).toContain('Contract, în asociere · nr. 1065')
    expect(page).toContain('Compania Nationala de Investitii C.N.I. SA a încheiat contractul cu Masterclass AG SRL și alte 2 firme, în asociere, pe 7 decembrie 2021, pentru 8,5 mil. lei .')
  })

  it('then the contract: the value and its facts, the firms, the published values, the history, the source', () => {
    inOrder(page, [
      'Ce s-a atribuit',
      'Valoarea contractului',
      '8.451.291 lei',
      'Valoarea e a întregului contract',
      'Data contractului',
      'Procedura',
      'Categoria',
      'Firmele din asociere',
      'Valorile publicate',
      'SEAP publică acest contract cu 3 valori diferite și nu spune care e în vigoare.',
      'după actul adițional nr. 5',
      'Istoria contractului',
      'actul nr. 5 spune +1,8 mil. lei',
      'Actul adițional nr. 3',
      'Sursa:',
      'rândul din raportul SEAP al contractelor, T2 2024',
    ])
  })

  it('then the context, by count, and the two parties', () => {
    inOrder(page, [
      'Alte contracte între ele',
      'Din 2019 încoace, instituția i-a atribuit firmei 21 de contracte și 1 acord-cadru; primul, în 2019.',
      'În 2021, instituția a atribuit 1.447 de contracte, 15 acestei firme',
      'Între ele, pe ani',
      'Instituția',
      'Achizițiile instituției',
      'Firma',
      'Vânzările firmei',
    ])
  })
})

describe('a contract alone in its notice', () => {
  const page = html(contractSheetOf(plainRead()), null)

  it('says its value is the award notice’s, without VAT', () => {
    expect(page).toContain('Valoarea contractului, fără TVA')
    expect(page).toContain('3.068.398.862,94 lei')
    expect(page).toContain('Valorile anunțului sunt fără TVA.')
  })

  it('has no association, versions or other contracts to list', () => {
    expect(page).not.toContain('Firmele din asociere')
    expect(page).not.toContain('Valorile publicate')
    expect(page).not.toContain('Celelalte contracte din anunț')
  })
})

describe('what the page says without data', () => {
  it('says why a contract before 2019 has no context', () => {
    const sheet = contractSheetOf(cniRead())
    const page = html({ ...sheet, date: '2010-03-01' }, null)
    expect(page).toContain('Contractul e dinainte de 2019; pagina adună contractele dintre ele din 2019 încoace.')
  })

  it('says what may be missing when the notice’s rows could not be read', () => {
    const page = html(contractSheetOf(cniRead({ notice: { rows: [], full: false, failed: true } })), ctContext())
    expect(page).toContain('Celelalte rânduri ale anunțului nu s-au putut citi acum: firmele din asociere, celelalte valori publicate și celelalte contracte din anunț pot lipsi.')
  })

  it('says a title is the procedure’s when SEAP gives the contract none', () => {
    const read = cniRead()
    const page = html(contractSheetOf({ ...read, contract: { ...read.contract, displayTitle: { text: 'Bazin de inot didactic', source: 'procedure', sourceUrl: null } } }), ctContext())
    expect(page).toContain('Bazin de inot didactic Titlul procedurii: SEAP nu dă contractului un titlu al lui.')
  })

  it('says a record SEAP does not have was not found', () => {
    expect(html(null)).toContain('Contractul nu a fost găsit')
  })
})
