import { i18n } from '@lingui/core'
import { describe, expect, it, vi } from 'vitest'
import { supplierView } from './supplier-model'
import { clientsLede, headSentence, howLede, partnersLede, steadyLede, whatLede, whereLede } from './supplier-text'
import { consortiumContracts, supplierContracts, supplierProfile } from './supplier.fixture'

// Numbers follow the page's language: Romanian here.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const NBSP = '\u00a0'
const none = { count: 0, valued: 0, value: null, clients: 0 }

describe('headSentence', () => {
  it('says what the firm sold directly and won in the year', () => {
    expect(headSentence(supplierProfile())).toBe(`În 2025 a vândut direct de 4,8${NBSP}mil.${NBSP}lei, fără TVA, la 5 instituții și a câștigat 1 contract.`)
  })

  it('counts the contracts won with other firms, when every row was read', () => {
    const profile = supplierProfile({ year: 2024, direct: none, contracts: consortiumContracts() })
    expect(headSentence(profile)).toBe('În 2024 a câștigat 16 contracte, 14 împreună cu alte firme.')
    // Past the hundred largest rows the scan cannot tell the rest apart.
    expect(headSentence({ ...profile, contracts: { ...consortiumContracts(), count: 400, scanned: 100 } })).toBe('În 2024 a câștigat 400 de contracte.')
  })

  it('says a year with no sale, and a firm that never sold since 2019', () => {
    expect(headSentence(supplierProfile({ direct: none, contracts: supplierContracts({ count: 0 }) }))).toBe('Nu a vândut nimic instituțiilor publice prin SEAP în 2025.')
    expect(headSentence(supplierProfile({ directYears: [], contractYears: [] }))).toBe('Nu apare ca furnizor în achizițiile publice (SEAP) din 2019 încoace.')
  })
})

describe('clientsLede', () => {
  it('states the largest clients’ share and the firm’s weight for the institution it mattered most to', () => {
    expect(clientsLede(supplierProfile())).toBe(
      'Orasul Otopeni a plătit 61% din banii achizițiilor directe ale firmei în 2025; primele trei instituții, 89%. Pentru Gradinita Nr 1 Otopeni, firma a fost cel mai mare furnizor direct: 29% din achizițiile ei directe.',
    )
  })

  it('reads a firm that sells only through contracts by its contracts', () => {
    const profile = supplierProfile({ direct: none, directClients: { rankedBy: 'value', rows: [] }, weights: new Map(), contracts: consortiumContracts() })
    expect(clientsLede(profile)).toBe('Compania Regională de Apă Bacău SA i-a atribuit 11 contracte în 2025, cele mai multe.')
  })

  it('says nothing of a weight under a tenth', () => {
    expect(clientsLede(supplierProfile({ weights: new Map([['4364446', { share: 0.08, first: false }]]) }))).not.toContain('Pentru')
  })
})

describe('steadyLede', () => {
  it('names the institution that bought almost every year', () => {
    const profile = supplierProfile()
    expect(steadyLede(profile, profile.clientYears)).toBe('Orasul Otopeni a cumpărat direct de la firmă în aproape fiecare an din 2019–2025.')
  })
})

describe('whatLede', () => {
  it('names what the firm sells most, and says when it sells more than that', () => {
    const profile = supplierProfile()
    expect(whatLede(profile.categories.direct, 'direct', 2025, i18n)).toBe('Categoria cu cei mai mulți bani din 2025 e drumuri, poduri și autostrăzi (38%); firma vinde și altceva.')
    expect(whatLede(consortiumContracts().categories ?? [], 'contract', 2024, i18n)).toBe('Mai mult de jumătate din valoarea contractelor din 2024 e la apă, canalizare și rețele.')
  })
})

describe('whatLede, guarded', () => {
  it('names no leader when „Altele" or the records with no CPV code hold more', () => {
    const [roads] = supplierProfile().categories.direct
    const other = { category: { key: 'altele', label: { id: 'Altele', message: 'Altele' }, prefixes: [] }, value: 900, count: 9, share: 0.9 }
    expect(whatLede([{ ...roads!, share: 0.1, value: 100 }, other as never], 'direct', 2025, i18n)).toBeNull()
  })
})

describe('whereLede', () => {
  it('says how much came from the firm’s own county, and from how many others', () => {
    expect(whereLede(supplierView(supplierProfile()))).toBe('85% din banii achizițiilor directe au venit de la instituții din județul Ilfov, județul firmei; restul, din alt județ.')
    const three = supplierView(
      supplierProfile({
        counties: [
          { code: 'IF', count: 10, value: 4_000_000, share: 0.8 },
          { code: 'DB', count: 1, value: 500_000, share: 0.1 },
          { code: 'B', count: 1, value: 500_000, share: 0.1 },
        ],
      }),
    )
    expect(whereLede(three)).toContain('restul, din alte 2 județe.')
  })

  it('says „all" only when the one county holds every row', () => {
    const partly = supplierView(supplierProfile({ counties: [{ code: 'B', count: 20, value: null, share: 0.95 }], countiesRankedBy: 'count', countiesOf: 'contracts' }))
    expect(whereLede(partly)).not.toContain('Toate instituțiile')
  })

  it('reads a firm with no direct purchase by its contracts', () => {
    const view = supplierView(supplierProfile({ registry: null, direct: none, contracts: consortiumContracts(), counties: consortiumContracts().counties ?? [], countiesRankedBy: 'count', countiesOf: 'contracts' }))
    expect(whereLede(view)).toBe('A câștigat contracte de la instituții din 2 județe; cele mai multe, din Bacău.')
  })
})

describe('howLede', () => {
  it('names both routes in plain words, and the contracts negotiated without a notice', () => {
    expect(howLede(supplierProfile())).toBe(
      'În 2025, 11 achiziții directe, adică vânzări fără licitație, și 1 contract câștigat printr-o procedură: licitație, negociere sau alta.',
    )
    const procedures = [
      { key: 'negociere fara publicare prealabila', count: 2 },
      { key: 'licitatie deschisa', count: 3 },
    ]
    const five = { ...supplierProfile().contracts, count: 5 }
    expect(howLede(supplierProfile({ procedures, contracts: five }))).toContain('2 din 5 contracte au fost negociate fără anunț public.')
    // One contract is singular; all of them is „toate".
    expect(howLede(supplierProfile({ procedures: [{ key: 'negociere fara publicare prealabila', count: 1 }] }))).toContain('A fost negociat fără anunț public.')
    expect(howLede(supplierProfile({ procedures: [{ key: 'negociere fara publicare prealabila', count: 1 }, { key: 'licitatie deschisa', count: 4 }], contracts: five }))).toContain(
      'Unul din 5 contracte a fost negociat fără anunț public.',
    )
  })

  it('writes no second total when the analysis gives the procedure of another number of contracts', () => {
    const profile = supplierProfile({ procedures: [{ key: 'negociere fara publicare prealabila', count: 23 }, { key: 'licitatie deschisa', count: 43 }], contracts: { ...supplierProfile().contracts, count: 65 } })
    expect(howLede(profile)).toContain('23 dintre ele au fost negociate fără anunț public.')
    expect(howLede(profile)).not.toContain('66')
  })
})

describe('partnersLede', () => {
  it('counts the contracts won in a consortium and names the partner seen most', () => {
    const profile = supplierProfile({ year: 2024, contracts: consortiumContracts() })
    expect(partnersLede(profile)).toBe('14 din cele 16 contracte din 2024 au fost câștigate împreună cu alte firme, în asociere. Cel mai des, cu Dexamart: 6 contracte.')
    expect(partnersLede(supplierProfile())).toBeNull()
  })

  it('says for how many contracts SEAP does not show whether they had partners', () => {
    const profile = supplierProfile({ year: 2024, contracts: { ...consortiumContracts(), unresolved: 2 } })
    expect(partnersLede(profile)).toContain('Pentru 2 contracte, datele SEAP nu arată dacă au avut parteneri.')
    // …and the head does not count the partnerships as if the rest had none.
    expect(headSentence({ ...profile, direct: none })).toBe('În 2024 a câștigat 16 contracte.')
  })

  it('says the scan covered only the largest contracts', () => {
    const profile = supplierProfile({ year: 2024, contracts: { ...consortiumContracts(), count: 400, scanned: 100 } })
    expect(partnersLede(profile)).toContain('Dintre cele mai mari 100 de contracte din 2024, 14 au fost câștigate împreună cu alte firme')
  })

  it('says one contract in the singular', () => {
    const one = (overrides: Partial<ReturnType<typeof consortiumContracts>>) => partnersLede(supplierProfile({ year: 2025, contracts: { ...consortiumContracts(), together: 1, ...overrides } }))
    expect(one({ count: 137, scanned: 100 })).toContain('Dintre cele mai mari 100 de contracte din 2025, unul a fost câștigat împreună cu alte firme, în asociere.')
    expect(one({})).toContain('Unul din cele 16 contracte din 2025 a fost câștigat împreună cu alte firme, în asociere.')
    expect(one({ count: 1, scanned: 1 })).toContain('Singurul contract din 2025 a fost câștigat împreună cu alte firme, în asociere.')
    expect(one({ unresolved: 1 })).toContain('Pentru un contract, datele SEAP nu arată dacă a avut parteneri.')
  })

  it('says in the head when every contract was won with others, or one', () => {
    const all = supplierProfile({ year: 2024, direct: none, contracts: { ...consortiumContracts(), together: 16 } })
    expect(headSentence(all)).toBe('În 2024 a câștigat 16 contracte, toate împreună cu alte firme.')
    expect(headSentence({ ...all, contracts: { ...all.contracts, together: 1 } })).toBe('În 2024 a câștigat 16 contracte, unul împreună cu alte firme.')
  })
})
