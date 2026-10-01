import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { daRecord, directPurchase, dpContext } from '../../lib/direct-purchase.fixture'
import type { DirectPurchase, DpContext } from '../../lib/direct-purchase-model'
import { ProcurementDirectPurchasePage } from './procurement-direct-purchase-page'

/**
 * The page's contract, as far as a unit test holds it: what the loader read is
 * in the HTML the server sends — the purchase first (how it ended, what, from
 * whom, for how much; the institution's words; the value beside its facts;
 * the lines; the steps and terms; the source) and the context after it, in
 * its own band — and each kind of record says what it is.
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
vi.mock('../../api/procurement-direct-purchase-api', () => ({
  fetchDirectPurchase: vi.fn(() => new Promise(() => undefined)),
  fetchDirectPurchaseContext: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

function html(purchase: DirectPurchase | null, context?: DpContext | null): string {
  const id = purchase?.id ?? 'missing'
  return renderToStaticMarkup(
    <QueryClientProvider client={createTestQueryClient()}>
      <ProcurementDirectPurchasePage id={id} initialData={{ id, purchase, context }} />
    </QueryClientProvider>,
  )
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    // Every white space, the no-break space between a figure and its unit included.
    .replace(/\s+/g, ' ')
}

describe('a catalogue purchase', () => {
  const page = html(directPurchase(), dpContext())

  it('opens on how it ended, what, from whom, for how much and when', () => {
    expect(page).toContain('Finalizată Aranjamente florale')
    expect(page).toContain('Banca Nationala a Romaniei a cumpărat direct de la Floraria Iris SRL , cu 98.448 lei fără TVA , pe 21 ianuarie 2026.')
  })

  it('then the purchase: the institution’s words, the value beside its facts, the lines, the steps, the terms, the source', () => {
    const order = [
      'Ce s-a cumpărat',
      'Instituția a descris achiziția așa:',
      '„Diverse aranjamente florale”',
      'Valoarea, fără TVA',
      'Starea',
      'Ambele părți au acceptat.',
      'Coșul',
      '3 produse',
      'Categoria',
      'Aranjamente florale CPV 03121210',
      'Cel mai mare rând, Aranjament floral mic, face 48% din bani.',
      'Coroana funerara model I',
      'Total, fără TVA',
      'Cum s-a făcut',
      'Firma a acceptat condițiile',
      'Livrarea și plata',
      'Sursa: pagina achiziției pe e-licitatie.ro',
    ].map((text) => page.indexOf(text))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('then, apart, the context: the other purchases between the two', () => {
    const context = page.indexOf('Context Alte achiziții între ele')
    expect(context).toBeGreaterThan(page.indexOf('Sursa:'))
    expect(page).toContain('Ce a mai cumpărat Banca Nationala a Romaniei de la Floraria Iris SRL , din 2019 încoace.')
    expect(page).toContain('Din 2019 încoace, au fost 17 achiziții directe între ele; prima, în 2023.')
    expect(page).toContain('În 2026 (până în mai), firma e al șaselea furnizor al instituției din 47, cu 5,6% din banii achizițiilor ei directe.')
    expect(page).toContain('Pentru firmă, instituția e al doilea client din 7: 27,9% din vânzările ei directe.')
    expect(page).toContain('Diferite aranjamente florale nefinalizată')
    // No count on the link: the list runs to the cutoff and leaves the cancelled out, so it may hold fewer than the 17.
    expect(page).toContain('Toate achizițiile dintre ele')
  })

  it('leaves out a part of the context it could not read — never a zero — and says so', () => {
    const partial = html(directPurchase(), dpContext({ years: null, buyer: null, seller: null, partial: true }))
    expect(partial).not.toContain('Din 2019 încoace')
    expect(partial).not.toContain('nicio achiziție')
    expect(partial).not.toContain('Între ele, pe ani, lei')
    expect(partial).not.toContain('firma e al șaselea furnizor')
    expect(partial).not.toContain('În 2026 (până în mai): ')
    expect(partial).toContain('O parte din aceste cifre nu s-a putut citi acum')
    // What was read stands: the records around this one.
    expect(partial).toContain('Diferite aranjamente florale nefinalizată')
  })

  it('names the other sources that publish the same purchase', () => {
    expect(html(directPurchase({}, {}, undefined, ['seap_da']), dpContext())).toContain('SEAP o publică și în raportul trimestrial al achizițiilor directe; Transparenta o numără o singură dată.')
  })
})

describe('the other kinds of record', () => {
  it('a refused offer: struck, who refused and why, dated by its request, and its redo', () => {
    const refused = directPurchase(
      { id: 'r', status: 'cancelled', title: 'Servicii de contabilitate', valueRon: '25000.00', estimatedValueRon: '20000.00', value: null, finalizationDate: '2026-03-05', publicationDate: '2026-03-04' },
      { supplierRejectionReason: 'pret incorect', supplierDecisionDate: '2026-03-05T07:49:31Z', caDecisionDate: null },
    )
    const redo = { id: 'd', code: null, title: 'Servicii de contabilitate', value: 20000, date: '2026-03-05', done: true }
    const page = html(refused, dpContext({ others: [redo] }))
    expect(page).toContain('Refuzată de firmă Servicii de contabilitate')
    expect(page).toContain('a vrut să cumpere direct de la Floraria Iris SRL , cu 25.000 lei fără TVA , pe 4 martie 2026. Achiziția nu s-a făcut: firma a refuzat condițiile instituției („pret incorect”).')
    // Dated plainly: a count of days from the attempt's end would read as from its request.
    expect(page).toContain('Refăcută pe 5 martie 2026: aceeași achiziție, de la aceeași firmă, finalizată cu 20.000 lei.')
    expect(page).toContain('Oferta, fără TVA')
    expect(page).toContain('Data cererii 4 martie 2026 anulată pe 5 martie 2026')
    expect(page).toContain('Estimarea instituției 20.000 lei')
    expect(page).toContain('02 · 5 martie 2026 Firma a refuzat condițiile: „pret incorect” a doua zi')
  })

  it('a refused offer redone the day it was asked: „în aceeași zi"', () => {
    const refused = directPurchase(
      { id: 'r', status: 'cancelled', title: 'Servicii de contabilitate', value: null, publicationDate: '2026-03-05', finalizationDate: '2026-03-05' },
      { supplierRejectionReason: 'pret incorect', supplierDecisionDate: '2026-03-05T07:49:31Z', caDecisionDate: null },
    )
    const redo = { id: 'd', code: null, title: 'Servicii de contabilitate', value: 20000, date: '2026-03-05', done: true }
    expect(html(refused, dpContext({ others: [redo] }))).toContain('Refăcută în aceeași zi: aceeași achiziție, de la aceeași firmă, finalizată cu 20.000 lei.')
  })

  it('a cancelled purchase whose reasons are withheld: each side only answered, never „accepted"', () => {
    const page = html(directPurchase({ status: 'cancelled' }, { textRedacted: true }), dpContext())
    expect(page).toContain('Nefinalizată')
    expect(page).toContain('SEAP nu spune cine a oprit-o.')
    expect(page).toContain('Firma a răspuns')
    expect(page).toContain('Instituția a răspuns')
    expect(page).not.toContain('a acceptat')
  })

  it('a cancelled purchase with no lines read: its second date is its end', () => {
    const page = html(directPurchase({ status: 'cancelled' }, null), dpContext())
    expect(page).toContain('Publicată în SEAP pe 16 ianuarie 2026, anulată pe 21 ianuarie 2026.')
    expect(page).not.toContain('finalizată pe')
  })

  it('a catalogue purchase whose lines are not taken over yet: said, with the way to them', () => {
    const page = html(directPurchase({}, null), dpContext())
    expect(page).toContain('SEAP publică și lista de produse, pașii și condițiile acestei achiziții, dar Transparenta nu le-a preluat încă.')
    expect(page).toContain('Vezi-le pe pagina achiziției din SEAP')
    expect(page).not.toContain('Cum s-a făcut')
  })

  it('a quarterly-export row and an award notification: what SEAP publishes for them, and their file', () => {
    const row = html(directPurchase({ sourceSystem: 'seap_da', status: 'unknown', sourceUrl: 'https://data.gov.ro/x/achizitii-directe-t2-2025.xlsx' }, null))
    expect(row).toContain('Raportată în SEAP')
    expect(row).toContain('SEAP are această achiziție în raportul trimestrial al achizițiilor directe')
    expect(row).toContain('raportul SEAP al achizițiilor directe, T2 2025')
    const notice = html(directPurchase({ sourceSystem: 'seap_dan', status: 'unknown', sourceUrl: 'https://data.gov.ro/x/notificari-tiii-2025.xlsx' }, null))
    expect(notice).toContain('în afara catalogului electronic, și a notificat achiziția în SEAP')
    expect(notice).toContain('notificările de atribuire SEAP, T3 2025')
  })

  it('a party SEAP gave no CUI for: its name without the CUI written before it, and why there is no context', () => {
    const page = html(directPurchase({ authority: { cui: null, name: 'R 361684 Banca Nationala a Romaniei', displayName: 'R 361684 Banca Nationala a Romaniei' } }), null)
    expect(page).toContain('Banca Nationala a Romaniei a cumpărat direct')
    expect(page).toContain('SEAP nu dă codul fiscal al uneia dintre părți')
  })

  it('a record with no date, and one from before 2019: each says why there is no context', () => {
    const undated = html(directPurchase({ sourceSystem: 'seap_da', status: 'unknown', publicationDate: null, finalizationDate: null }, null), null)
    expect(undated).toContain(', cu 98.448 lei fără TVA , la o dată nepublicată.')
    expect(undated).toContain('SEAP nu publică data acestei achiziții')
    expect(undated).not.toContain('codul fiscal')
    const legacy = html(directPurchase({ sourceSystem: 'seap_da', status: 'unknown', publicationDate: '2017-04-03', finalizationDate: '2017-04-05' }, null), null)
    expect(legacy).toContain('Achiziția e dinainte de 2019')
  })

  it('a record SEAP does not have', () => {
    expect(html(null)).toContain('Achiziția nu a fost găsită')
  })

  it('an unchecked value is said, never shown as the value', () => {
    const page = html(directPurchase({ value: { ...daRecord().value!, valueAccepted: false, valueRonComparable: null } }))
    expect(page).toContain('SEAP publică 98.448 lei, dar valoarea nu a trecut verificările platformei.')
    expect(page).toContain('cu o valoare neverificată')
  })
})
