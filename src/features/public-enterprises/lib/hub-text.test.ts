import { describe, expect, it } from 'vitest'
import {
  authorityKindLabel,
  controlLede,
  countiesLede,
  hubCaveats,
  hubLede,
  inactiveCount,
  moneyLede,
  nextYearText,
  publishersText,
  statementsSource,
  registryStatusLabel,
  s1001StatusLabel,
  sectorsLede,
  sizeLede,
  sourceStatusLabel,
  statusLede,
} from './hub-text'
import { hubSnapshotFixture } from './test/hub-snapshot-fixture'

const SNAPSHOT = hubSnapshotFixture()

describe('the hub’s sentences', () => {
  it('reads every lede off the snapshot', () => {
    expect(hubLede(SNAPSHOT, 'ro')).toBe('30 de întreprinderi publice: cine le controlează, ce fac și cum le merge.')
    expect(controlLede(SNAPSHOT, 'ro')).toBe(
      'Autoritățile locale au în subordine 18 întreprinderi, cele ale statului central 10. Autoritatea pentru Administrarea Activelor Statului are cele mai multe: 6.',
    )
    expect(countiesLede(SNAPSHOT, 'toate', 'ro')).toBe('Cele mai multe au sediul în București: 12. Urmează Cluj (7) și Timiș (6).')
    expect(statusLede(SNAPSHOT, 'ro')).toBe('În lista ANAF, 24 sunt active și 4 inactive. Registrul comerțului nu spune mereu la fel: cel puțin una e radiată, deși e activă în listă.')
    expect(moneyLede(SNAPSHOT, 'ro')).toBe('14 cumpără prin SEAP și 15 vând instituțiilor prin achiziții directe. Pe pagina fiecărei firme, cât și de la cine.')
  })

  it('computes the activities’ share, never writes it in', () => {
    expect(sectorsLede(SNAPSHOT, 'toate', 'ro')).toMatch(/^Apă potabilă: 9, 30\s?% dintre ele\. Urmează energie electrică, termică și gaze \(7\) și curățenie și întreținerea clădirilor \(6\)\.$/u)
    expect(sectorsLede(hubSnapshotFixture({ sectors: SNAPSHOT.sectors.slice(0, 2) }), 'toate', 'ro')).toBeNull()
  })

  it('describes the population the band shows, its share of that population', () => {
    expect(countiesLede(SNAPSHOT, 'locale', 'ro')).toBe('Cele mai multe au sediul în Timiș: 6. Urmează Cluj (5) și București (4).')
    // The state's 10: energy first, 5 of them.
    expect(sectorsLede(SNAPSHOT, 'centrale', 'ro')).toMatch(/^Energie electrică, termică și gaze: 5, 50\s?% dintre ele\./u)
  })

  it('agrees the head’s lede with a single enterprise too', () => {
    expect(hubLede(hubSnapshotFixture({ members: { anchors: 1, current: 1, historical: 0 } }), 'ro')).toBe('O întreprindere publică: cine o controlează, ce face și cum îi merge.')
    expect(hubLede(hubSnapshotFixture({ members: { anchors: 7, current: 7, historical: 0 } }), 'ro')).toBe('7 întreprinderi publice: cine le controlează, ce fac și cum le merge.')
  })

  it('names the year’s largest turnover with its own figure, then the loss-makers among the admitted net results', () => {
    expect(sizeLede(SNAPSHOT, 'ro')).toBe(
      'Cea mai mare cifră de afaceri în 2024: Societatea de Producere a Energiei Electrice in Hidrocentrale Hidroelectrica S.A., 9,7 mld. lei. 8 din cele 25 cu rezultatul net admis pe 2024 au încheiat anul cu pierdere.',
    )
  })

  it('says the SEAP counts are floors when SEAP withheld some', () => {
    expect(moneyLede(hubSnapshotFixture({ procurement: { ...SNAPSHOT.procurement, unknown: 2 } }), 'ro')).toBe(
      'Cel puțin 14 cumpără prin SEAP și cel puțin 15 vând instituțiilor prin achiziții directe. Pe pagina fiecărei firme, cât și de la cine.',
    )
  })

  it('drops the registry’s disagreement when there is none', () => {
    const agreed = hubSnapshotFixture({ status: { ...SNAPSHOT.status, crossings: { ...SNAPSHOT.status.crossings, radiatedButS1001Active: 0 } } })
    expect(statusLede(agreed, 'ro')).toBe('În lista ANAF, 24 sunt active și 4 inactive.')
  })
})

describe('the labels', () => {
  it('names each kind of authority by its budget record’s kind', () => {
    expect(authorityKindLabel('county', 'local')).toBe('Consiliile județene')
    // The budget record's own categories: a ministry can be either.
    expect(authorityKindLabel('central_authority', 'central')).toBe('Autorități centrale')
    expect(authorityKindLabel('public_entity', 'central')).toBe('Alte instituții publice centrale')
    expect(authorityKindLabel('education', 'central')).toBe('Autoritățile din educație')
    // An authority with no budget record is named by ANAF's level alone.
    expect(authorityKindLabel('unresolved', 'local')).toBe('Autorități locale fără fișă în buget')
    expect(authorityKindLabel('unresolved', 'central')).toBe('Autorități centrale fără fișă în buget')
  })

  it('keeps each source’s own status words, and says when there is none', () => {
    expect(s1001StatusLabel('ACTIV')).toBe('Activă')
    // Listed with a blank cell is not „not listed"; a word the list may add stays its own.
    expect(s1001StatusLabel(null)).toBe('Fără stare în sursă')
    expect(s1001StatusLabel('SUSPENDAT')).toBe('SUSPENDAT')
    expect(sourceStatusLabel('radiată')).toBe('Radiată')
    expect(sourceStatusLabel('1083')).toBe('Cod 1083, fără nume în sursă')
    expect(sourceStatusLabel(null)).toBe('Fără stare în sursă')
    // The trade registry's null is conflicting or partial evidence, not an empty cell.
    expect(registryStatusLabel(null)).toBe('Fără o stare sigură în registru')
    expect(registryStatusLabel('radiată')).toBe('Radiată')
  })
})

describe('the caveats', () => {
  it('says each thing a reader must know, with its own count', () => {
    const notes = hubCaveats(SNAPSHOT, 'ro')
    expect(notes).toContain('Încărcate parțial: lista ANAF, anunțurile de selecție AMEPIP. Sursele nu spun ce lipsește.')
    expect(notes.some((note) => note.startsWith('„Controlează" înseamnă autoritatea pe care o numește sursa'))).toBe(true)
    expect(notes).toContain('Pentru o întreprindere, lista ANAF și anunțurile AMEPIP numesc autorități diferite; pagina urmează lista ANAF.')
    expect(notes).toContain('Cel puțin o întreprindere radiată din registrul comerțului e activă în lista ANAF; fiecare stare e arătată cu sursa ei.')
    expect(notes).toContain('2 întreprinderi nu sunt în lista ANAF: numărate, dar fără autoritate în listă.')
    expect(notes).toContain('Din bilanțuri intră doar valorile admise de verificarea firmelor: unul din cele 26 pe 2024 nu are rezultatul net admis și nu e numărat la profit sau pierdere.')
    expect(notes).toContain('Un număr de salariați imposibil (92.149.177, CUI 25252500) e lăsat afară din clasament.')
    expect(notes.some((note) => note.startsWith('Nicio sumă pe toate întreprinderile'))).toBe(true)
  })

  it('names a lane that is not loaded at all apart from a partial one', () => {
    const notes = hubCaveats(hubSnapshotFixture({ sources: SNAPSHOT.sources.map((source) => ({ ...source, laneStatus: source.family === 'json_apt' ? ('unavailable' as const) : ('available' as const) })) }), 'ro')
    expect(notes).toContain('Neîncărcate: anunțurile de selecție AMEPIP. Pagina nu spune nimic din ele.')
    expect(notes.some((note) => note.startsWith('Încărcate parțial'))).toBe(false)
  })

  it('drops a caveat once its problem is gone', () => {
    const clean = hubSnapshotFixture({
      sources: SNAPSHOT.sources.map((source) => ({ ...source, laneStatus: 'available' as const })),
      control: { ...SNAPSHOT.control, disagreements: 0, noS1001: 0 },
      members: { ...SNAPSHOT.members, historical: 0 },
      status: { ...SNAPSHOT.status, crossings: { ...SNAPSHOT.status.crossings, radiatedButS1001Active: 0 } },
      financials: { ...SNAPSHOT.financials, implausibleEmployees: [], netReported: SNAPSHOT.financials.filed },
    })
    expect(hubCaveats(clean, 'ro')).toHaveLength(2)
    expect(hubCaveats(hubSnapshotFixture({ procurement: { ...SNAPSHOT.procurement, unknown: 3 } }), 'ro')).toContain('SEAP nu a răspuns pentru 3 întreprinderi: cifrele achizițiilor sunt minime.')
  })
})

describe('the counts in words', () => {
  it('names the statements’ publisher as recorded, never assumed', () => {
    expect(publishersText(['anaf'])).toBe('depuse la ANAF')
    expect(publishersText(['mfp'])).toBe('publicate de Ministerul Finanțelor')
    expect(publishersText(['anaf', 'mfp'])).toBe('publicate de ANAF și de Ministerul Finanțelor')
    expect(publishersText([])).toBe('ale firmelor')
    expect(statementsSource(['anaf'])).toBe('bilanțurile ANAF')
    expect(statementsSource(['mfp'])).toBe('bilanțurile publicate de Ministerul Finanțelor')
    expect(statementsSource([])).toBe('bilanțurile firmelor')
  })

  it('counts the year after’s statements, never calls it complete or not', () => {
    expect(nextYearText(SNAPSHOT, 'ro')).toBe('Pe 2025 sunt deocamdată 21.')
    expect(nextYearText(hubSnapshotFixture({ financials: { ...SNAPSHOT.financials, nextYearFiled: 1 } }), 'ro')).toBe('Pe 2025 e deocamdată unul.')
    expect(nextYearText(hubSnapshotFixture({ financials: { ...SNAPSHOT.financials, nextYearFiled: 0 } }), 'ro')).toBe('Pe 2025 nu e încă niciunul.')
  })

  it('agrees a single loss-maker with its verb', () => {
    expect(sizeLede(hubSnapshotFixture({ financials: { ...SNAPSHOT.financials, loss: 1 } }), 'ro')).toMatch(/Una din cele 25 cu rezultatul net admis pe 2024 a încheiat anul cu pierdere\.$/u)
  })

  it('agrees the inactive count with its adjective', () => {
    expect(inactiveCount(1, 'ro')).toBe('una inactivă')
    expect(inactiveCount(19, 'ro')).toBe('19 inactive')
    expect(inactiveCount(56, 'ro')).toBe('56 de inactive')
    expect(inactiveCount(274, 'ro')).toBe('274 de inactive')
  })
})
