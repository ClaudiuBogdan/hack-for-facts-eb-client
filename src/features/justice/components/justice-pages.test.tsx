import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { FIXTURE_CASE, FIXTURE_COURT, FIXTURE_YEAR, caseDetailFixture, caseSheetFixture, courtSheetFixture } from '../fixtures/judicial-fixtures'
import { JUSTICE_HUB_DEFAULTS } from '@/schemas/judicial'
import { JUSTICE_HUB_SNAPSHOT } from '../lib/hub-snapshot'
import { JusticeCasePage } from './case/justice-case-page'
import { JusticeCourtPage } from './court/justice-court-page'
import { JusticeHub, JusticeHubPage } from './hub/justice-hub-page'

/**
 * The pages as the server sends them: what the loader seeded (or the
 * snapshot, for the front door) is in the HTML, in the order a reader meets
 * it — and no party is named anywhere.
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search: _search, ...props }: { readonly children: ReactNode; readonly to: string; readonly params?: Record<string, string>; readonly search?: unknown }) => {
    let href = to
    for (const [key, value] of Object.entries(params ?? {})) href = href.replace(key === '_splat' ? /\$$/ : `$${key}`, value)
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => vi.fn(),
  useRouter: () => ({ routesById: {}, state: { matches: [] } }),
}))

// The pages' reads never land here: what they show is what the loader seeded.
vi.mock('../api/judicial-court-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/judicial-court-api')>()),
  fetchCourtSheet: vi.fn(() => new Promise(() => undefined)),
  fetchCourtCases: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('../api/judicial-case-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/judicial-case-api')>()),
  fetchCaseSheet: vi.fn(() => new Promise(() => undefined)),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const wrap = (node: ReactNode) => renderToStaticMarkup(<QueryClientProvider client={createTestQueryClient()}>{node}</QueryClientProvider>)

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

const inOrder = (page: string, parts: readonly string[]) => {
  let at = -1
  for (const part of parts) {
    const next = page.indexOf(part, at + 1)
    expect(next, part).toBeGreaterThan(at)
    at = next
  }
}

describe('the front door', () => {
  const html = wrap(<JusticeHub snapshot={JUSTICE_HUB_SNAPSHOT} choices={{ ...JUSTICE_HUB_DEFAULTS }} onChoose={() => undefined} />)
  const page = text(html)

  it('asks its question, names the busiest courts and dates its source, then the bands in order', () => {
    inOrder(page, [
      'Ce judecă instanțele',
      'Cele mai încărcate instanțe, 2025',
      'Judecătoria Sectorului 1 București',
      'Sursa:',
      'portal.just.ro',
      'date până la 22 iunie 2026',
      'Dosare cu data din 2025',
      'Cât se judecă în județul tău',
      'Ce se judecă',
      'Pe ce treaptă sunt dosarele',
      'Instanțele',
      'Dosarele, an de an',
      'Alte instanțe și autorități',
    ])
  })

  it('links each court it names to its page, and leads to the analysis', () => {
    expect(html).toContain('href="/justice/courts/JudecatoriaSECTORUL1BUCURESTI"')
    expect(html).toContain('href="/justice/analytics"')
  })

  it('shows each choice’s default when the address holds it unset or invalid', () => {
    const unset = text(wrap(<JusticeHubPage search={{ instante: undefined, materii: 'gresit' as never, nivel: undefined }} />))
    // The hero panel's default level and the matters' default scope still list their rows.
    expect(unset).toContain('Judecătoria Sectorului 1 București')
    expect(unset).toContain('Litigii cu profesioniștii')
  })
})

describe('a court', () => {
  const sheet = courtSheetFixture()
  const page = text(wrap(<JusticeCourtPage code={FIXTURE_COURT} year={FIXTURE_YEAR} initialData={{ code: FIXTURE_COURT, year: FIXTURE_YEAR, court: sheet }} />))

  it('says what it is and what it holds in the year, then its matters, stages, the courts under it and its cases', () => {
    inOrder(page, [
      'Tribunalul Sălaj',
      'Tribunal din județul Sălaj.',
      'Pe portal are 2.632 de dosare cu data din 2025',
      'În circumscripția: Curtea de Apel Cluj',
      'Compară cu instanțele de același nivel',
      'Sursa:',
      'Dosare cu data din 2025',
      'Ce se judecă',
      'Pe etape',
      'Alte etape (revizuiri, contestații în anulare)',
      'Instanțele de sub ea',
      'Judecătoria Zalău',
      '4.365',
      'Dosarele',
    ])
  })

  it('says the children could not be counted when their read failed, never zero', () => {
    const partial = text(wrap(<JusticeCourtPage code={FIXTURE_COURT} year={FIXTURE_YEAR} initialData={{ code: FIXTURE_COURT, year: FIXTURE_YEAR, court: courtSheetFixture('failed') }} />))
    expect(partial).toContain('Dosarele lor nu au putut fi numărate acum')
  })

  it('says a court the API does not have was not found', () => {
    expect(text(wrap(<JusticeCourtPage code="TribunalulNIMIC" year={FIXTURE_YEAR} initialData={{ code: 'TribunalulNIMIC', year: FIXTURE_YEAR, court: null }} />))).toContain(
      'Instanța nu a fost găsită',
    )
  })
})

describe('a case', () => {
  const sheet = caseSheetFixture()
  const html = wrap(<JusticeCasePage code={FIXTURE_CASE.code} number={FIXTURE_CASE.number} initialData={{ ...FIXTURE_CASE, sheet }} />)
  const page = text(html)

  it('reads its court, number, object and facts, then hearings, appeals, parties, laws and the same file elsewhere', () => {
    inOrder(page, [
      'Curtea de Apel Constanța',
      'Dosarul 5180/118/2021/a3',
      '„procedura insolvenţei',
      'Sursa:',
      'Materia',
      'Faliment',
      'Ședințele',
      '1 ședință pe portal',
      'hotărârea nr. 75/2024',
      'Căile de atac',
      'Apel',
      'Părțile',
      'Intimat',
      '7 firme (4 SRL)',
      'Legile invocate',
      'Legea nr. 85/2014',
      'Același dosar la alte instanțe',
      'Tribunalul Constanța',
      'posibil',
    ])
  })

  it('links the law to the legislation registry and the other case to its page', () => {
    expect(html).toContain('href="/legislation/acts/56661"')
    expect(html).toContain('href="/justice/cases/TribunalulCONSTANTA/5180/118/2021"')
  })

  it('says what the ÎCCJ archive does not carry as the archive’s, never as the portal’s', () => {
    const detail = caseDetailFixture()
    const iccj = caseSheetFixture('read', {
      ...detail,
      case: { ...detail.case, sourceSlug: 'iccj', institutionCode: 'InaltaCurtedeCasatiesiJustitie', object: null },
      hearings: [],
      appeals: [],
      parties: [],
      lineage: [],
    })
    const page = text(wrap(<JusticeCasePage code="InaltaCurtedeCasatiesiJustitie" number={iccj.case.caseNumber} initialData={{ code: 'InaltaCurtedeCasatiesiJustitie', number: iccj.case.caseNumber, sheet: iccj }} />))
    inOrder(page, [
      'Arhiva Înaltei Curți nu dă obiectul dosarelor ei.',
      'arhiva Înaltei Curți de Casație și Justiție',
      'Data din arhiva ÎCCJ',
      'Arhiva Înaltei Curți nu dă ședințele dosarelor ei.',
      'Arhiva Înaltei Curți nu dă căile de atac ale dosarelor ei.',
      'Arhiva Înaltei Curți nu dă părțile dosarelor ei.',
    ])
    expect(page).not.toContain('Portalul nu')
  })

  it('counts persons by role and never names a party', () => {
    const detail = caseDetailFixture()
    const withPersons = caseSheetFixture('read', {
      ...detail,
      parties: [...detail.parties, { partyIndex: 99, partyKind: 'person', roleNormalized: 'parat', legalForm: null }],
    })
    const personPage = text(wrap(<JusticeCasePage code={FIXTURE_CASE.code} number={FIXTURE_CASE.number} initialData={{ ...FIXTURE_CASE, sheet: withPersons }} />))
    expect(personPage).toContain('Pârât')
    expect(personPage).toContain('1 persoană fizică')
  })
})
