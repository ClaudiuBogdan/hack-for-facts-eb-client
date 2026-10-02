import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { procedureSheetOf, type ProcedureSheet } from '../../lib/procedure-model'
import { cancelledRaw, cappedRaw, cnirRaw, legacyRaw, readOf } from '../../lib/procedure.fixture'
import { ProcurementProcedurePage } from './procurement-procedure-page'

/**
 * The page's procedure, as far as a unit test holds it: what the loader read
 * is in the HTML the server sends — the head (the route, who awarded what to
 * whom, when, for how much), the value and facts, the calendar, the
 * contracts, the rows SEAP links here by mistake, the source.
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

// The page's read never lands here: what it shows is what the loader seeded.
vi.mock('../../api/procurement-procedure-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/procurement-procedure-api')>()),
  fetchProcedure: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

function render(sheet: ProcedureSheet | null, id = sheet?.id ?? 'missing'): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={createTestQueryClient()}>
      <ProcurementProcedurePage id={id} initialData={{ id, procedure: sheet }} />
    </QueryClientProvider>,
  )
}

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    // Every white space, the no-break space between a figure and its unit included.
    .replace(/\s+/g, ' ')

const inOrder = (page: string, parts: readonly string[]) => {
  let at = -1
  for (const part of parts) {
    const next = page.indexOf(part, at + 1)
    expect(next, part).toBeGreaterThan(at)
    at = next
  }
}

describe('an award notice with an association', () => {
  const html = render(procedureSheetOf(readOf(cnirRaw())))
  const page = text(html)

  it('says who awarded the contract to whom, in association, and for how much', () => {
    inOrder(page, ['Licitație deschisă', 'Proiectare și execuție autostrada', 'a încheiat contractul cu', 'Euro-Asfalt', 'și alte 3 firme, în asociere, pe 31 martie 2025, pentru', '6,1 mld. lei'])
  })

  it('reads the value and the facts, the buyer and the winners beside them, then the contract and its source', () => {
    inOrder(page, ['Ce s-a atribuit', 'Valoarea atribuită', '6.142.792.901,06 lei', 'Procedura', 'Jurnalul UE', 'Contractul, încheiat', 'Cumpărătorul', 'Câștigătorii', 'Contractul', 'Sursa:', 'anunțul de atribuire pe e-licitatie.ro'])
    // An association's rows, one per member at the whole value, are one contract with its four firms.
    expect(page).toContain('1 contract, cu 4 firme.')
    expect(html).toContain('href="https://e-licitatie.ro/pub/notices/ca-notices/view-c/100578781"')
    expect(html).toContain('href="/procurement/contracts/2435981"')
  })

  it('claims no VAT basis the API does not state', () => {
    expect(page).not.toContain('fără TVA')
  })
})

describe('a legacy call with contracts joined by mistake', () => {
  const page = text(render(procedureSheetOf(readOf(legacyRaw()))))

  it('names the untitled notice by its number and says what SEAP does not publish', () => {
    inOrder(page, ['Anunț de participare', 'Anunțul de participare nr. 92137', 'SEAP nu dă acestui anunț un titlu.', 'a publicat anunțul de participare', '10 decembrie 2009', 'SEAP nu publică ce s-a întâmplat cu ea.'])
  })

  it('sets the other institutions’ contracts apart, counted nowhere', () => {
    inOrder(page, ['Ce s-a cerut', 'Valoarea estimată', '183.967,29 lei', 'Contracte legate greșit de acest anunț', 'Municipiul Bucuresti și Rotary Constructii', 'Sursa:', 'anunturi-participare-2009.xls', 'data.gov.ro'])
    expect(page).not.toContain('Câștigători')
  })
})

describe('an award notice with nothing linked', () => {
  const page = text(render(procedureSheetOf(readOf(cancelledRaw()))))

  it('says it was cancelled and that SEAP links no contract to it, without a zero value', () => {
    expect(page).toContain('Procedura a fost anulată.')
    expect(page).toContain('SEAP nu leagă încă de anunț niciun contract.')
    expect(page).not.toMatch(/\b0 lei/u)
  })
})

describe('what the review found the page must say', () => {
  const cnir = cnirRaw()

  it('says a cancelled award notice is cancelled, its figure the notice’s', () => {
    const page = text(render(procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, status: 'cancelled' } }))))
    expect(page).toContain('Procedura a fost anulată.')
    expect(page).toContain('Valoarea din anunț')
    expect(page).not.toContain('Valoarea atribuită')
  })

  it('says the notice’s value apart when its contracts do not add up to it', () => {
    const page = text(render(procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, awardedValueRon: '9000000000.00' } }))))
    inOrder(page, ['a încheiat contractul cu', 'pe 31 martie 2025.', 'Anunțul de atribuire raportează o valoare de', 'mld. lei'])
    expect(page).toContain('contractele pe care SEAP le leagă de el nu o adună')
  })

  it('calls no framework’s firms an association, a framework known by its title', () => {
    const page = text(render(procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, title: 'Acord-cadru furnizare mixturi asfaltice' } }))))
    expect(page).toContain('Euro-Asfalt și alte 3 firme')
    expect(page).not.toContain('în asociere')
  })

  it('lists firms without a shared value together, never in association', () => {
    const contracts = cnir.contracts.slice(1, 3).map((row) => ({ ...row, valueRon: null, value: { valueAccepted: false, valueRonComparable: null } }))
    const page = text(render(procedureSheetOf(readOf({ ...cnir, contracts }))))
    expect(page).toContain('Tehnostrade S.R.L. și încă o firmă')
    expect(page).not.toContain('în asociere')
  })

  it('points to no reason a negotiation’s notice does not give', () => {
    const page = text(render(procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, procedureType: 'Negociere fara publicare prealabila' } }))))
    expect(page).toContain('negociere fără anunț prealabil')
    expect(page).not.toContain('motivul, mai jos')
  })

  it('sets apart, unverified, the rows with no institution under a repeating number', () => {
    const legacy = legacyRaw()
    const page = text(render(procedureSheetOf(readOf({ ...legacy, contracts: [{ ...legacy.contracts[0]!, authority: { cui: null, name: null } }] }))))
    inOrder(page, ['Contracte legate de acest anunț doar după număr', 'ale altor instituții sau fără instituție în SEAP', 'instituție nepublicată în SEAP'])
  })

  it('counts a negotiation’s several contracts', () => {
    const page = text(render(procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, procedureType: 'Negociere fara publicare prealabila' }, contracts: [cnir.contracts[1]!, { ...cnir.contracts[2]!, contractNo: '102/1888' }] }))))
    expect(page).toContain('a încheiat 2 contracte cu 2 firme prin negociere, fără anunț de participare')
  })

  it('makes a full page of rows a floor: the counts, the firms, no span', () => {
    const page = text(render(procedureSheetOf(readOf(cappedRaw()))))
    expect(page).toContain('a încheiat cel puțin 50 de acorduri-cadru, cu cel puțin 7 firme.')
    expect(page).toContain('Cel puțin 50 de acorduri-cadru, cu cel puțin 7 firme: API-ul dă primele 50 de rânduri')
    expect(page).toContain('Anunțul raportează contracte subsecvente de')
    expect(page).not.toContain('Acordurile-cadru, încheiate')
  })
})

describe('a notice SEAP does not have', () => {
  it('says so, apart from a failed read', () => {
    const page = text(render(null, '404404'))
    expect(page).toContain('Procedura nu a fost găsită')
    expect(page).toContain('404404')
  })
})
