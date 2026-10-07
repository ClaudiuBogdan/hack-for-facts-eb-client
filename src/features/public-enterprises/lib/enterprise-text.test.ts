import { describe, expect, it, vi } from 'vitest'
import type { BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { controlRows, indicatorTables } from './enterprise-model'
import { controlLede, controlSentence, listDateText, originMark, pageCaveats, peersText, s1001Word, shownName, sourceLine, spendingLede } from './enterprise-text'
import { TURSIB_PROFILE, enterpriseReadFixture } from './test/enterprise-fixture'

// Procurement's formatters follow the reader's locale.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const READ = enterpriseReadFixture()
const ROWS = controlRows(READ)

/** The figures `spendingLede` reads, for the last twelve months to May 2026. */
function buyer(overrides: Partial<BuyerProfile> = {}): BuyerProfile {
  return {
    period: { kind: 'recent', year: 2026, from: '2025-06', through: '2026-05' },
    direct: { count: 1490, valued: 1490, value: 2_100_000, suppliers: 120 },
    awards: { count: 10, valued: 10, value: 5_000_000, suppliers: 8 },
    frameworks: 0,
    ...overrides,
  } as BuyerProfile
}

describe('the enterprise page’s sentences', () => {
  it('says who controls it, ANAF’s list first, and the announcements when they name another authority', () => {
    expect(controlSentence(READ, ROWS)).toBe(
      'Consiliul Local Sibiu o controlează, după lista ANAF a întreprinderilor publice. Anunțurile de selecție AMEPIP numesc altă autoritate: Asociatia de Dezvoltare Intercomunitara Transport Metropolitan Sibiu.',
    )
  })

  it('names the announcements’ authority when the list names none, and says when no list names one', () => {
    // Not in ANAF's list: no S1001 observation.
    const unlisted = { ...TURSIB_PROFILE, registryObservations: TURSIB_PROFILE.registryObservations.filter((row) => row.sourceFamily !== 's1001') }
    const aptOnly = enterpriseReadFixture({ profile: { ...unlisted, authorityEdges: TURSIB_PROFILE.authorityEdges.filter((edge) => edge.sourceFamily === 'json_apt') } })
    expect(controlSentence(aptOnly, controlRows(aptOnly))).toBe(
      'Asociatia de Dezvoltare Intercomunitara Transport Metropolitan Sibiu o controlează, după anunțurile de selecție AMEPIP; nu e în lista ANAF.',
    )
    const none = enterpriseReadFixture({ profile: { ...unlisted, authorityEdges: [] } })
    expect(controlSentence(none, [])).toBe('Nicio listă nu numește autoritatea care o controlează.')
    const historical = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, isCurrentMember: false, authorityEdges: [] } })
    expect(controlSentence(historical, [])).toBe('Nu mai apare în nicio listă a întreprinderilor publice.')
  })

  it('says in the control band only that the sources agree: a disagreement is the head’s, said once', () => {
    expect(controlLede(ROWS)).toBeNull()
    expect(controlLede(ROWS.filter((row) => row.source === 's1001'))).toBeNull()
    const same = controlRows(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: TURSIB_PROFILE.authorityEdges.map((edge) => ({ ...edge, authorityCui: '4270740' })) } }))
    expect(controlLede(same)).toBe('Lista ANAF și anunțurile de selecție AMEPIP numesc aceeași autoritate.')
  })

  it('says the announcements name only some of the list’s authorities, never an empty „other"', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: '1001', authorityName: 'CONSILIUL LOCAL ALBA', authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 's1001', authorityCui: '1002', authorityName: 'CONSILIUL LOCAL BRAN', authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: '1001', authorityName: 'CONSILIUL LOCAL ALBA', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    const read = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges }, authorities: {} })
    expect(controlSentence(read, controlRows(read))).toBe(
      'Consiliul Local Alba și Consiliul Local Bran o controlează, după lista ANAF a întreprinderilor publice. Anunțurile de selecție AMEPIP numesc doar: Consiliul Local Alba.',
    )
  })

  it('never credits a list with a name it did not give', () => {
    const nameless = enterpriseReadFixture({
      profile: { ...TURSIB_PROFILE, authorityEdges: TURSIB_PROFILE.authorityEdges.map((edge) => (edge.sourceFamily === 's1001' ? { ...edge, authorityName: null } : edge)) },
    })
    expect(controlSentence(nameless, controlRows(nameless))).toMatch(/^Municipiul Sibiu \(numele din fișa ei de buget\) o controlează, după lista ANAF/u)
  })

  it('names a nameless list row by the other source’s own name for the same authority before the budget record’s', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: '4270740', authorityName: null, authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: '4270740', authorityName: 'CONSILIUL LOCAL MUNICIPIUL SIBIU', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    const read = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges } })
    const rows = controlRows(read)
    expect(controlSentence(read, rows)).toBe('Consiliul Local Municipiul Sibiu (numele din anunțurile AMEPIP) o controlează, după lista ANAF a întreprinderilor publice.')
    expect(originMark(shownName(rows[0]!, rows))).toBe('nume din anunțurile AMEPIP')
  })

  it('tells being in ANAF’s list apart from the list naming its authority', () => {
    const aptOnly = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: TURSIB_PROFILE.authorityEdges.filter((edge) => edge.sourceFamily === 'json_apt') } })
    // Tursib has its S1001 observation: it is in the list, the list just names no authority here.
    expect(controlSentence(aptOnly, controlRows(aptOnly))).toMatch(/; lista ANAF nu-i numește autoritatea\.$/u)
    const noEdges = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: [] } })
    expect(controlSentence(noEdges, [])).toBe('E în lista ANAF, dar nicio listă nu-i numește autoritatea.')
  })

  it('says the announcements are unread when the list names the authority and they are down', () => {
    const sources = TURSIB_PROFILE.sources.map((source) => (source.family === 'json_apt' ? { ...source, laneStatus: 'unavailable' } : source))
    const read = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, sources, authorityEdges: TURSIB_PROFILE.authorityEdges.filter((edge) => edge.sourceFamily === 's1001') } })
    expect(controlSentence(read, controlRows(read))).toBe(
      'Consiliul Local Sibiu o controlează, după lista ANAF a întreprinderilor publice. Anunțurile de selecție AMEPIP nu sunt încărcate acum.',
    )
  })

  it('never calls an announcement with no CUI another authority', () => {
    const edges = [
      { sourceFamily: 's1001', authorityCui: '4270740', authorityName: 'CONSILIUL LOCAL SIBIU', authorityLevel: 'local', enterpriseStatusRaw: 'ACTIV' },
      { sourceFamily: 'json_apt', authorityCui: null, authorityName: 'CONSILIUL LOCAL SIBIU', authorityLevel: 'unknown', enterpriseStatusRaw: null },
    ]
    const read = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: edges } })
    expect(controlSentence(read, controlRows(read))).toBe(
      'Consiliul Local Sibiu o controlează, după lista ANAF a întreprinderilor publice. Anunțurile de selecție AMEPIP numesc și, fără CUI: Consiliul Local Sibiu.',
    )
  })

  it('names only the lanes published in part', () => {
    const sources = TURSIB_PROFILE.sources.map((source) => (source.family === 'json_apt' ? { ...source, laneStatus: 'unavailable' } : source))
    const notes = pageCaveats(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, sources } }), ROWS, null)
    expect(notes).toContain('Publicate parțial: lista ANAF; sursa nu spune ce lipsește.')
    expect(notes).toContain('Nu sunt încărcate acum: anunțurile de selecție AMEPIP. Pagina nu spune nimic din ele.')
  })

  it('says a list the API reports unavailable is unread, never that the enterprise is not on it', () => {
    const down = (family: string) => TURSIB_PROFILE.sources.map((source) => (source.family === family ? { ...source, laneStatus: 'unavailable' } : source))
    const aptOnly = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, sources: down('s1001'), authorityEdges: TURSIB_PROFILE.authorityEdges.filter((edge) => edge.sourceFamily === 'json_apt') } })
    expect(controlSentence(aptOnly, controlRows(aptOnly))).toMatch(/; lista ANAF nu e încărcată acum\.$/u)
    const none = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, sources: down('json_apt'), authorityEdges: [] } })
    // One lane down is said for that lane: ANAF's list is loaded and holds it.
    expect(controlSentence(none, [])).toBe('E în lista ANAF, care nu-i numește autoritatea; anunțurile de selecție AMEPIP nu sunt încărcate acum.')
    const both = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, sources: TURSIB_PROFILE.sources.map((source) => (source.family === 'amepip' ? source : { ...source, laneStatus: 'unavailable' })), authorityEdges: [] } })
    expect(controlSentence(both, [])).toBe('Listele care îi numesc autoritatea nu sunt încărcate acum.')
    const notListed = enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, registryObservations: [], authorityEdges: TURSIB_PROFILE.authorityEdges.filter((edge) => edge.sourceFamily === 'json_apt') } })
    expect(controlSentence(notListed, controlRows(notListed))).toMatch(/; nu e în lista ANAF\.$/u)
    expect(pageCaveats(none, [], null)).toContain('Nu sunt încărcate acum: anunțurile de selecție AMEPIP. Pagina nu spune nimic din ele.')
  })

  it('marks a name that is not the source’s, and never marks a bare CUI as a name', () => {
    const budget = shownName({ ...ROWS[1]!, name: null, budgetName: 'MUNICIPIUL SIBIU' }, [])
    expect(budget).toEqual({ name: 'Municipiul Sibiu', origin: 'budget', from: null })
    expect(originMark(budget)).toBe('nume din fișa de buget')
    const bare = shownName({ ...ROWS[1]!, name: null, budgetName: null }, [])
    expect(bare).toEqual({ name: 'Autoritatea cu CUI 45699112', origin: 'none', from: null })
    expect(originMark(bare)).toBeNull()
  })

  it('says ANAF’s status word as a reader does, and a word it adds later as written', () => {
    expect(s1001Word('ACTIV')).toBe('activă')
    expect(s1001Word('INACTIV')).toBe('inactivă')
    expect(s1001Word('')).toBe('fără stare')
    expect(s1001Word('SUSPENDAT')).toBe('suspendat')
  })

  it('counts an authority’s enterprises with the noun agreeing', () => {
    expect(peersText(1, 'ro')).toBe('o întreprindere în liste')
    expect(peersText(4, 'ro')).toBe('4 întreprinderi în liste')
    expect(peersText(69, 'ro')).toBe('69 de întreprinderi în liste')
  })

  it('says what it bought in the last twelve months, as the institution page does', () => {
    // Money keeps its unit on the line with a no-break space.
    expect(spendingLede(buyer()).replace(/\u00a0/gu, ' ')).toBe('În ultimele 12 luni (iunie 2025 – mai 2026) a făcut 1.490 de achiziții directe, de 2,1 mil. lei fără TVA, și a atribuit 10 contracte.')
    expect(spendingLede(buyer({ direct: { count: 0, valued: 0, value: null, suppliers: 0 }, awards: { count: 0, valued: 0, value: null, suppliers: 0 } }))).toBe(
      'În ultimele 12 luni (iunie 2025 – mai 2026) nu are achiziții publicate în SEAP.',
    )
    expect(spendingLede(buyer({ direct: { count: null, valued: null, value: null, suppliers: null }, awards: { count: null, valued: null, value: null, suppliers: null } }))).toBe(
      'Achizițiile din ultimele 12 luni (iunie 2025 – mai 2026) nu s-au putut citi acum.',
    )
  })

  it('never says „none" for a count it did not read', () => {
    const unread = { count: null, valued: null, value: null, suppliers: null }
    const none = { count: 0, valued: 0, value: null, suppliers: 0 }
    expect(spendingLede(buyer({ direct: unread, awards: none }))).toBe('Achizițiile directe din ultimele 12 luni (iunie 2025 – mai 2026) nu s-au putut citi acum.')
    expect(spendingLede(buyer({ direct: unread }))).toBe('În ultimele 12 luni (iunie 2025 – mai 2026) a atribuit 10 contracte; achizițiile directe nu s-au putut citi acum.')
    expect(spendingLede(buyer({ awards: unread })).replace(/\u00a0/gu, ' ')).toBe(
      'În ultimele 12 luni (iunie 2025 – mai 2026) a făcut 1.490 de achiziții directe, de 2,1 mil. lei fără TVA; contractele atribuite nu s-au putut citi acum.',
    )
    expect(spendingLede(buyer({ direct: none, awards: unread, frameworks: 2 }))).toBe(
      'În ultimele 12 luni (iunie 2025 – mai 2026) a semnat 2 acorduri-cadru; contractele atribuite nu s-au putut citi acum.',
    )
    expect(spendingLede(buyer({ direct: none, awards: unread }))).toBe(
      'În ultimele 12 luni (iunie 2025 – mai 2026) nu are achiziții directe publicate în SEAP; contractele atribuite nu s-au putut citi acum.',
    )
  })

  it('dates each source once, in the source line', () => {
    expect(listDateText(READ, 'ro')).toBe('26 august 2026')
    expect(sourceLine(READ, 'ro', 'ANAF')).toBe(
      'Lista ANAF a întreprinderilor publice din 26 august 2026 · registrul AMEPIP din 13 ianuarie 2026 · anunțurile de selecție AMEPIP · registrul comerțului și ANAF · SEAP',
    )
  })

  it('lists only the caveats that apply', () => {
    const notes = pageCaveats(READ, ROWS, indicatorTables(READ.indicators!))
    expect(notes).toHaveLength(6)
    expect(notes.some((note) => note.includes('În anii fără formular (2021–2022)'))).toBe(true)
    expect(pageCaveats(enterpriseReadFixture({ profile: { ...TURSIB_PROFILE, authorityEdges: [], sources: [] } }), [], null)).toEqual([
      'Valorile din SEAP sunt cele atribuite, nu plățile efective.',
    ])
  })
})
