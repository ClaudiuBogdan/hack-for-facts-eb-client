import { describe, expect, it } from 'vitest'
import { disagreements, portfolioRows, type MissingFigure } from './authority-portfolio-model'
import {
  amepipTitle,
  authorityTitle,
  disagreementLede,
  flagText,
  headSentence,
  heldNote,
  kickerText,
  listNoneText,
  listTallyLabel,
  fiscalSegmentLabel,
  hiddenSortNote,
  missingText,
  nameSourceNote,
  portfolioCaveats,
  portfolioSourceLine,
  registryStateLabel,
} from './authority-portfolio-text'
import { portfolioFixture, type FixtureAuthority } from './test/portfolio-fixture'

const sentence = (cui: FixtureAuthority, overrides: Parameters<typeof portfolioFixture>[1] = {}) => {
  const portfolio = portfolioFixture(cui, overrides)
  return headSentence(portfolio, portfolioRows(portfolio), 'ro')
}

const withLane = (cui: FixtureAuthority, family: string, laneStatus: string) => {
  const portfolio = portfolioFixture(cui)
  return { sources: portfolio.sources.map((source) => (source.family === family ? { ...source, laneStatus } : source)) }
}

describe('the authority portfolio’s words', () => {
  it('says what each source gives the authority, with the source, counts only', () => {
    expect(sentence('4270740')).toBe(
      'După lista ANAF a întreprinderilor publice, controlează 4 întreprinderi. Anunțurile de selecție AMEPIP o numesc pentru 2 dintre ele. Pentru una dintre cele din listă, anunțurile numesc altă autoritate.',
    )
    expect(sentence('4374474')).toBe(
      'După lista ANAF a întreprinderilor publice, controlează 3 întreprinderi. Anunțurile de selecție AMEPIP o mai numesc pentru 2 întreprinderi, pe care lista nu le pune sub ea. Pentru una dintre cele din listă, anunțurile numesc altă autoritate.',
    )
    expect(sentence('45699112')).toBe('După anunțurile de selecție AMEPIP, controlează o întreprindere; lista ANAF a întreprinderilor publice o pune sub altă autoritate.')
  })

  it('agrees each count with its noun and pronoun: one enterprise is „o", several „le"', () => {
    const hunedoara = portfolioFixture('4374474')
    const apa = hunedoara.enterprises.find((enterprise) => enterprise.cui === '14071095')!
    // One more only in the announcements, none in both.
    const one = { ...hunedoara, authority: { ...hunedoara.authority, jsonApt: ['14071095'] }, enterprises: [...hunedoara.enterprises.slice(0, 3), apa] }
    expect(headSentence(one, portfolioRows(one), 'ro')).toContain('Anunțurile de selecție AMEPIP o mai numesc pentru o întreprindere, pe care lista nu o pune sub ea.')
    // Two in both, one more only in the announcements.
    const sibiu = portfolioFixture('4270740')
    const mixed = { ...sibiu, authority: { ...sibiu.authority, jsonApt: [...sibiu.authority.jsonApt, '14071095'] }, enterprises: [...sibiu.enterprises, apa] }
    expect(headSentence(mixed, portfolioRows(mixed), 'ro')).toContain('Anunțurile de selecție AMEPIP o numesc pentru 2 dintre ele și pentru încă una, pe care lista nu o pune sub ea.')
    // Named only by the announcements, for one the list does not put under another authority.
    const adi = portfolioFixture('45699112')
    const unlisted = { ...adi, enterprises: adi.enterprises.map((enterprise) => ({ ...enterprise, edges: enterprise.edges.filter((edge) => edge.source !== 's1001') })) }
    expect(headSentence(unlisted, portfolioRows(unlisted), 'ro')).toBe('După anunțurile de selecție AMEPIP, controlează o întreprindere; lista ANAF a întreprinderilor publice nu o pune sub ea.')
  })

  it('says „pentru ea" and „pentru toate" when the announcements name it for every one the list gives it', () => {
    const sibiu = portfolioFixture('4270740')
    const urbana = sibiu.enterprises.find((enterprise) => enterprise.cui === '2684932')!
    const single = { ...sibiu, authority: { ...sibiu.authority, s1001: ['2684932'], jsonApt: ['2684932'] }, enterprises: [urbana] }
    expect(headSentence(single, portfolioRows(single), 'ro')).toBe(
      'După lista ANAF a întreprinderilor publice, controlează o întreprindere. Anunțurile de selecție AMEPIP o numesc și ele pentru ea.',
    )
    const every = { ...sibiu, authority: { ...sibiu.authority, jsonApt: sibiu.authority.s1001 } }
    expect(headSentence(every, portfolioRows(every), 'ro')).toBe('După lista ANAF a întreprinderilor publice, controlează 4 întreprinderi. Anunțurile de selecție AMEPIP o numesc pentru toate.')
    // One in the list, the announcements naming another authority for it.
    const tursib = sibiu.enterprises.find((enterprise) => enterprise.cui === '789401')!
    const elsewhere = { ...sibiu, authority: { ...sibiu.authority, s1001: ['789401'], jsonApt: [] }, enterprises: [tursib] }
    expect(headSentence(elsewhere, portfolioRows(elsewhere), 'ro')).toBe(
      'După lista ANAF a întreprinderilor publice, controlează o întreprindere. Pentru cea din listă, anunțurile numesc altă autoritate.',
    )
  })

  it('says an order by a column a phone hides', () => {
    expect(hiddenSortNote('salariati', 2024)).toBe('Ordonate după numărul de salariați din 2024.')
    expect(hiddenSortNote('cifra', 2024)).toBeNull()
  })

  it('says a lane that was down as down, never as „none"', () => {
    expect(sentence('45699112', withLane('45699112', 's1001', 'unavailable'))).toBe(
      'După anunțurile de selecție AMEPIP, controlează o întreprindere; lista ANAF a întreprinderilor publice nu era încărcată la citire.',
    )
    const listOnly = portfolioFixture('4270740')
    const plain = { ...listOnly, authority: { ...listOnly.authority, jsonApt: [] }, enterprises: listOnly.enterprises.map((enterprise) => ({ ...enterprise, edges: enterprise.edges.filter((edge) => edge.source === 's1001') })) }
    expect(headSentence(plain, portfolioRows(plain), 'ro')).toBe('După lista ANAF a întreprinderilor publice, controlează 4 întreprinderi.')
    const down = { ...plain, ...withLane('4270740', 'json_apt', 'unavailable') }
    expect(headSentence(down, portfolioRows(down), 'ro')).toBe('După lista ANAF a întreprinderilor publice, controlează 4 întreprinderi. Anunțurile de selecție AMEPIP nu erau încărcate la citire.')
  })

  it('names the authority as a source spells it, says when it is not ANAF’s list, and its CUI as a CUI when none does', () => {
    const sibiu = portfolioFixture('4270740').authority
    expect(authorityTitle(sibiu)).toBe('Consiliul Local Sibiu')
    expect(nameSourceNote(sibiu)).toBeNull()
    const adi = portfolioFixture('45699112').authority
    expect(nameSourceNote(adi)).toBe('numele, cum îl scriu anunțurile de selecție AMEPIP')
    expect(nameSourceNote({ ...adi, nameSource: 'budget' })).toBe('numele, cum îl scrie fișa ei din buget')
    expect(authorityTitle({ ...adi, name: null })).toBe('Autoritatea cu CUI 45699112')
    expect(nameSourceNote({ ...adi, name: null })).toBeNull()
    expect(kickerText(sibiu)).toBe('Sibiu')
    expect(kickerText({ ...sibiu, level: 'central' })).toBe('Autoritate centrală')
    expect(kickerText(adi)).toBeNull()
  })

  it('says why a cell has no figure, the word agreeing with its column', () => {
    const cases: readonly [MissingFigure, 'turnover' | 'employees' | 'net', string][] = [
      [{ kind: 'never' }, 'turnover', 'niciun bilanț'],
      [{ kind: 'last', year: 2017 }, 'turnover', 'ultimul bilanț: 2017'],
      [{ kind: 'last', year: 2025 }, 'turnover', 'ultimul bilanț: 2025'],
      [{ kind: 'held', reason: 'profile' }, 'turnover', 'reținută'],
      [{ kind: 'held', reason: 'profile' }, 'net', 'reținut'],
      [{ kind: 'missing' }, 'employees', 'lipsește din bilanț'],
      [{ kind: 'not-admitted' }, 'turnover', 'neadmisă'],
      [{ kind: 'not-admitted' }, 'net', 'neadmis'],
    ]
    for (const [missing, measure, text] of cases) expect(missingText(missing, measure)).toBe(text)
    expect(heldNote(new Set(['profile']))).toBe('„Reținut”: verificarea bilanțurilor ține valoarea deoparte (formularul bilanțului nu e verificat), ca pe pagina firmei. Nu e un zero.')
  })

  it('writes each flag with its source, and the registry’s uncertain state apart from no record', () => {
    expect(flagText({ kind: 'amepip', year: 2024, status: 'faliment' })).toBe('AMEPIP 2024: faliment')
    expect(flagText({ kind: 'amepip', year: 2023, status: null })).toBe('AMEPIP 2023: fără stare')
    expect(flagText({ kind: 'registry', state: 'struck-off', label: 'radiată' })).toBe('registrul comerțului: radiată')
    expect(flagText({ kind: 'fiscal' })).toBe('inactivă fiscal la ANAF')
    expect(registryStateLabel('uncertain', null)).toBe('Fără o stare sigură')
    expect(registryStateLabel('none', null)).toBe('Fără fișă de firmă')
    expect(registryStateLabel('other', '1083')).toBe('Cod 1083, fără nume în sursă')
    expect(listTallyLabel('elsewhere')).toBe('În listă, sub altă autoritate')
    expect(listTallyLabel('absent')).toBe('Nu apare în listă')
    expect(listTallyLabel('unread')).toBe('Lista nu era încărcată la citire')
    expect(fiscalSegmentLabel('none')).toBe('Fără fișă de firmă')
    expect(fiscalSegmentLabel('unknown')).toBe('Fără stare fiscală în fișă')
    expect(amepipTitle({ from: 2024, to: 2024 })).toBe('AMEPIP, 2024')
    expect(amepipTitle({ from: 2019, to: 2024 })).toBe('AMEPIP, ultimul an al fiecăreia (2019–2024)')
    expect(amepipTitle(null)).toBe('AMEPIP')
  })

  it('counts the disagreements, and says what the list says when it names no authority', () => {
    const portfolio = portfolioFixture('4374474')
    const parts = disagreements('4374474', portfolioRows(portfolio))
    expect(disagreementLede(parts, 'ro')).toBe('La 3 întreprinderi, cele două surse nu numesc aceeași autoritate. Fiecare e spusă cum o scrie.')
    expect(disagreementLede(parts.slice(0, 1), 'ro')).toBe('La o întreprindere, cele două surse nu numesc aceeași autoritate. Fiecare e spusă cum o scrie.')
    const row = { enterprise: { ...portfolio.enterprises[0]!, s1001: null }, inList: false, inAnnouncements: true }
    expect(listNoneText({ kind: 'list-none', row })).toBe('nu apare în listă')
    expect(listNoneText({ kind: 'list-none', row: { ...row, enterprise: { ...row.enterprise, s1001: { status: 'ACTIV' } } } })).toBe('nu-i numește autoritatea')
  })

  it('dates the copy and names each source once, with its own date', () => {
    const portfolio = portfolioFixture('4270740')
    expect(portfolioSourceLine(portfolio, 'ro')).toBe(
      'Lista ANAF a întreprinderilor publice din 26 august 2026 · anunțurile de selecție AMEPIP · registrul AMEPIP din 13 ianuarie 2026 · registrul comerțului și bilanțurile · SEAP 2019–2026 · citite pe 7 octombrie 2026',
    )
    const caveats = portfolioCaveats(portfolio)
    expect(caveats[0]).toBe('O autoritate „controlează” o întreprindere așa cum o scrie sursa: nu e o cotă de proprietate.')
    // The read date is the source line's alone.
    expect(caveats).toContain('Pagina e o copie, nu o citire în timp real: listele, registrele și bilanțurile se pot schimba după data din linia surselor.')
    expect(caveats.join(' ')).not.toMatch(/octombrie/u)
    expect(caveats).toContain('Publicate parțial: lista ANAF, anunțurile de selecție AMEPIP; sursa nu spune ce lipsește.')
    expect(portfolioCaveats({ ...portfolio, ...withLane('4270740', 's1001', 'unavailable') })).toContain('Nu erau încărcate la citire: lista ANAF. Pagina nu spune nimic din ele.')
  })
})
