import type { ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import type { PrivateCompanyCaenActivity, PrivateCompanyProfile } from '@/schemas/private-company'
import type {
  CompanyMainActivity,
  CompanyMainActivityEvidenceEntry,
  CompanyMainActivityHistoryResult,
  CompanyMainActivityOutcome,
  CompanyMainActivityRead,
} from '@/schemas/private-company-main-activity'
import { releaseV3Fixture, releaseV4Fixture } from '../../api/company-analytics.fixture'
import { historyVisibilityChanged, mainActivityHistoryKey, purgeMainActivityHistory } from '../../hooks/use-company-main-activity-history'
import { mainActivityIdentity } from '../../lib/company-main-activity-model'
import { companyProfile } from '../../lib/company-profile.fixture'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { ACTIVITY_SELECTIONS } from '../../mocks/fixtures/activity-selection'
import { LEGACY_RAW_RETRIEVED_AT, MAIN_ACTIVITIES, NO_ASSIGNMENT_READ, UNAVAILABLE_READ, assignedRead, legacyAnafFixture, mainActivityFixture, mainAnafFixture } from '../../mocks/fixtures/main-activity'
import { CompanyActivitiesBand } from './company-activities-band'

/**
 * The ANAF-assumed main activity on the profile: its block above the derived
 * selection (which keeps its own title), its words for every status and
 * currentness, the activity list's badge only where the API's flag names the
 * row, its bounded history, and the one analysis link that may follow it.
 */

const history = vi.hoisted(() => ({
  calls: [] as { kind: string; after: string | null }[],
  answer: (_request: { kind: string; after: string | null }): Promise<CompanyMainActivityHistoryResult> => Promise.resolve({ status: 'unsupported' }),
}))
const analytics = vi.hoisted(() => ({ release: null as CompanyAnalysisRelease | null }))

vi.mock('../../api/private-company-api', () => ({
  fetchCompanyMainActivityHistory: (request: { kind: string; after: string | null }) => {
    history.calls.push({ kind: request.kind, after: request.after })
    return history.answer(request)
  },
}))

vi.mock('../../api/company-analytics-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/company-analytics-api')>()
  return {
    ...actual,
    readCompanyAnalysisRelease: () => (analytics.release ? Promise.resolve(analytics.release) : Promise.reject(new Error('no release'))),
  }
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: { readonly children: ReactNode; readonly to: string; readonly search?: unknown }) => (
    <a href={to} data-search={JSON.stringify(search ?? {})} {...props}>
      {children}
    </a>
  ),
}))

beforeEach(() => {
  history.calls = []
  history.answer = () => Promise.resolve({ status: 'unsupported' })
  analytics.release = null
})

const onrc = (code: string, rev: string, flags: Partial<PrivateCompanyCaenActivity> = {}): PrivateCompanyCaenActivity => ({
  code,
  rev,
  label: `Eticheta ${code} ${rev}`,
  source: 'onrc',
  labelSource: 'current_db_catalog',
  classState: 'class',
  ...flags,
})
const anaf = (code: string): PrivateCompanyCaenActivity => ({ code, rev: null, label: null, source: 'anaf' })

function profileWith(mainActivity: CompanyMainActivityRead | undefined, caenActivities: PrivateCompanyCaenActivity[], extra: Partial<PrivateCompanyProfile> = {}): PrivateCompanyProfile {
  return companyProfile({ caenActivities, activitySelection: ACTIVITY_SELECTIONS.onrcSingleClass, ...(mainActivity ? { mainActivity } : {}), ...extra })
}

function renderBand(profile: PrivateCompanyProfile, client: QueryClient = createTestQueryClient()) {
  const view = render(
    <QueryClientProvider client={client}>
      <CompanyActivitiesBand model={buildCompanyProfileModel(profile)} index="03 / Activități" />
    </QueryClientProvider>,
  )
  return { ...view, client, rerenderWith: (next: PrivateCompanyProfile) => view.rerender(<QueryClientProvider client={client}><CompanyActivitiesBand model={buildCompanyProfileModel(next)} index="03 / Activități" /></QueryClientProvider>) }
}

const block = () => screen.getByTestId('company-main-activity')
/**
 * Opens each division of the activity list in turn (one is open at a time)
 * and reads its rows' marks: the rows with the main badge and those with the
 * „same code as ANAF" hint, by their text.
 */
function rowMarks(): { readonly main: string[]; readonly sameCode: string[]; readonly rows: string[] } {
  const marks = { main: [] as string[], sameCode: [] as string[], rows: [] as string[] }
  const divisions = screen.queryAllByRole('button').filter((button) => button.getAttribute('aria-controls')?.startsWith('company-activities-'))
  for (const division of divisions) {
    if (division.getAttribute('aria-expanded') !== 'true') fireEvent.click(division)
    const panel = document.getElementById(division.getAttribute('aria-controls') ?? '')
    if (!panel) continue
    for (const row of within(panel).getAllByRole('listitem')) {
      const text = row.textContent ?? ''
      marks.rows.push(text)
      if (within(row).queryByTestId('company-activity-main-badge')) marks.main.push(text)
      if (within(row).queryByTestId('company-activity-same-code-hint')) marks.sameCode.push(text)
    }
  }
  return marks
}

describe('the main activity block', () => {
  it('Lidl-like: the ONRC counterpart with its frozen label and edition, the latest-revision note; badge on Rev.3 only, „same code" on Rev.2', () => {
    renderBand(
      profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [
        onrc('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true }),
        onrc('4711', 'rev2', { isMainCaen: false, matchesAssumedMainCode: true }),
        onrc('5610', 'rev2', { isMainCaen: false, matchesAssumedMainCode: false }),
        anaf('4711'),
      ]),
    )
    expect(within(block()).getByText('Activitate principală (presupusă după ANAF)')).toBeInTheDocument()
    expect(screen.getByTestId('company-main-activity-headline').textContent).toMatch(
      /^Corespondent ONRC: Rev\.3 4711 — Comerț cu amănuntul nespecializat, predominant alimentar \(MOCK\) \(ediția ONRC din .+2026\)$/u,
    )
    expect(screen.getByTestId('company-main-activity-basis').textContent).toContain('cea mai recentă revizie potrivită; candidați: Rev.3 4711, Rev.2 4711')
    // ANAF's requested status date and ONRC's edition date, each its own.
    expect(screen.getByTestId('company-main-activity-dates').textContent).toMatch(/ANAF: situația cerută la .+ · ediția ONRC din .+/u)
    expect(block().textContent).not.toMatch(/declarat[ăa]? (la|de) ONRC/iu)
    const marks = rowMarks()
    expect(marks.rows).toHaveLength(3)
    expect(marks.main).toEqual([expect.stringContaining('Eticheta 4711 rev3')])
    expect(marks.main[0]).toContain('principală (presupusă)')
    expect(marks.sameCode).toEqual([expect.stringContaining('Eticheta 4711 rev2')])
    expect(marks.sameCode[0]).toContain('același cod ca ANAF')
  })

  it('stays above the derived selection, which keeps its own title and wording', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [onrc('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })]))
    const selection = screen.getByTestId('company-activity-selection')
    expect(block().compareDocumentPosition(selection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(selection).getByText(/^Activitate selectată \(derivată\)/u)).toBeInTheDocument()
  })

  it('OMV-like: the leading-zero basis is said with ANAF’s own token', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.omvLeadingZero), [onrc('0610', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true })]))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toMatch(/^Corespondent ONRC: Rev\.2 0610 — Extracția petrolului brut \(MOCK\)/u)
    expect(screen.getByTestId('company-main-activity-basis').textContent).toContain('cod ANAF „610” potrivit cu ONRC 0610 (zerouri la început)')
  })

  it('NO_ONRC_MATCH: ANAF’s code with an unknown revision and no label; no row is marked', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.marketingNoMatch), [onrc('7311', 'rev2', { isMainCaen: false, matchesAssumedMainCode: false })]))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Cod ANAF 4730 · revizie necunoscută')
    expect(block().textContent).not.toContain('Corespondent ONRC')
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [], rows: [expect.stringContaining('7311')] })
  })

  it('UNRESOLVED_TOKEN_FORM: the original token, „fără corespondent ONRC", never a padded code', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.unresolvedTokenForm), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Cod ANAF în sursă „47” · fără corespondent ONRC')
  })

  it('UNRESOLVED_TOKEN_FORM with more than four significant digits: no token is served or written, only its form', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.unresolvedLongToken), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Cod ANAF într-o formă fără corespondent ONRC')
  })

  it('placeholder, missing: an explicit reason — a missing code is not "no activity"', () => {
    const { unmount } = renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.placeholder), []))
    expect(block().textContent).toContain('Cod substitut ANAF „0000”')
    expect(block().textContent).toContain('nu indică o activitate')
    unmount()
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.missing), []))
    expect(block().textContent).toContain('Fără cod CAEN în înregistrarea fiscală ANAF')
    expect(block().textContent).toContain('Lipsa codului nu înseamnă că firma nu are activitate.')
  })

  it('CORRECTED: the reviewed correction by its id, nothing more (no reviewer or reason is served)', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.corrected), [onrc('5221', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })]))
    expect(screen.getByTestId('company-main-activity-basis').textContent).toContain('corecție revizuită (nr. 3)')
  })

  it('PENDING_REFRESH: the last assignment with its dates and „actualizare în curs"; no badge', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.pendingRefresh), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null })]))
    expect(screen.getByTestId('company-main-activity-pending').textContent).toBe('actualizare în curs')
    expect(screen.getByTestId('company-main-activity-headline').textContent).toMatch(/^Corespondent ONRC: Rev\.3 4711/u)
    expect(screen.getByTestId('company-main-activity-dates').textContent).toMatch(/ANAF: situația cerută la/u)
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
  })

  it('SOURCE_WITHDRAWN: no ANAF code at all; the authorized list stays, without marks', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.sourceWithdrawn), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null }), anaf('4711')]))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
    expect(block().textContent).not.toContain('4711')
    expect(block().textContent).not.toContain('ANAF: situația')
    expect(rowMarks()).toEqual({ main: [], sameCode: [], rows: [expect.stringContaining('Eticheta 4711 rev3')] })
  })

  it('ONRC_UNAVAILABLE: ANAF’s evidence only', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.onrcUnavailable), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Cod ANAF 4711 · fără corespondent ONRC')
    expect(block().textContent).not.toContain('Corespondent ONRC')
    expect(screen.getByTestId('company-main-activity-dates').textContent).not.toContain('ediția ONRC')
  })

  it('NO_ASSIGNMENT: a short neutral note; UNAVAILABLE and an older API: nothing at all', () => {
    const first = renderBand(profileWith(NO_ASSIGNMENT_READ, []))
    expect(block().textContent).toContain('nu a fost încă stabilită')
    first.unmount()
    const second = renderBand(profileWith(UNAVAILABLE_READ, []))
    expect(screen.queryByTestId('company-main-activity')).toBeNull()
    second.unmount()
    renderBand(profileWith(undefined, [onrc('4711', 'rev3')]))
    expect(screen.queryByTestId('company-main-activity')).toBeNull()
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [], rows: [expect.stringContaining('4711')] })
  })

  it('an unreadable answer is said, never guessed', () => {
    renderBand(profileWith(undefined, [], { mainActivityUnreadable: true }))
    expect(block().textContent).toContain('răspunsul API nu a putut fi citit')
  })
})

/** An assignment with ANAF evidence as given, bypassing the parse: the page itself must never render a non-public token. */
const withToken = (status: CompanyMainActivity['status'], anaf: Partial<CompanyMainActivity['anaf'] & object>, extra: Partial<CompanyMainActivity> = {}): CompanyMainActivity =>
  mainActivityFixture({ status, resolved: null, candidates: null, matchBasis: null, revisionBasis: null, anaf: mainAnafFixture(anaf), cacheKey: `t:${String(status)}:${String(anaf.originalToken)}`, ...extra })

const PRIVATE_TOKENS = ['contact@firma.ro', '0722123456', '+40 722 123 456', '{"cod":"4711","tel":"0722123456"}', '٤٧١١', '47111']

describe('the main block never writes a token that is no public digit form', () => {
  it('an invalid token (contact-like, phone-like, object text, Unicode digits, five digits): its diagnostics, never its value', () => {
    for (const token of PRIVATE_TOKENS) {
      for (const status of ['TOKEN_INVALID', 'UNRESOLVED_TOKEN_FORM', 'TOKEN_PLACEHOLDER', 'NO_ONRC_MATCH'] as const) {
        const view = renderBand(profileWith(assignedRead(withToken(status, { originalToken: token, tokenForm: status === 'TOKEN_INVALID' ? 'INVALID' : 'OTHER_DIGIT_FORM', assumedCode: status === 'NO_ONRC_MATCH' ? token : null, canonicalDigits: token })), []))
        const text = block().textContent ?? ''
        expect(text).not.toContain(token)
        expect(text).not.toMatch(/0722|contact@|٤|47111|„—”/u)
        view.unmount()
      }
    }
  })

  it('says an invalid token by its JSON type, without the token', () => {
    const cases = [
      [{ originalToken: '{"tel":"0722123456"}', jsonType: 'OBJECT', tokenForm: 'INVALID' }, 'Cod ANAF nevalid în sursă (obiect JSON)'],
      [{ originalToken: 'contact@firma.ro', jsonType: 'STRING', tokenForm: 'INVALID' }, 'Cod ANAF nevalid în sursă (valoare text)'],
      [{ originalToken: null, jsonType: 'ARRAY', tokenForm: 'INVALID' }, 'Cod ANAF nevalid în sursă (listă JSON)'],
      [{ originalToken: null, jsonType: null, tokenForm: 'INVALID' }, 'Cod ANAF nevalid în sursă'],
    ] as const
    for (const [anaf, headline] of cases) {
      const view = renderBand(profileWith(assignedRead(withToken('TOKEN_INVALID', anaf)), []))
      expect(screen.getByTestId('company-main-activity-headline').textContent).toBe(headline)
      view.unmount()
    }
  })

  it('ANAF’s evidence alone (ONRC unavailable): an invalid token or assumed code is never written either', () => {
    renderBand(profileWith(assignedRead({ ...MAIN_ACTIVITIES.onrcUnavailable, anaf: mainAnafFixture({ originalToken: '0722123456', jsonType: 'NUMBER', tokenForm: 'INVALID', assumedCode: '0722123456' }) }), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Cod ANAF nevalid în sursă (valoare numerică)')
  })

  it('writes the public digit forms as they are: „610", „0610", „000610", „9999", „0000"', () => {
    const omv = MAIN_ACTIVITIES.omvLeadingZero
    for (const token of ['610', '0610', '000610']) {
      const view = renderBand(profileWith(assignedRead({ ...omv, anaf: mainAnafFixture({ ...omv.anaf, originalToken: token }) }), [onrc('0610', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true })]))
      expect(screen.getByTestId('company-main-activity-basis').textContent).toContain(`cod ANAF „${token}” potrivit cu ONRC 0610`)
      view.unmount()
    }
    for (const token of ['9999', '0000']) {
      const view = renderBand(profileWith(assignedRead(withToken('TOKEN_PLACEHOLDER', { originalToken: token, tokenForm: token === '0000' ? 'ZERO_PLACEHOLDER' : 'PLACEHOLDER_9999' })), []))
      expect(screen.getByTestId('company-main-activity-headline').textContent).toBe(`Cod substitut ANAF „${token}”`)
      view.unmount()
    }
  })
})

describe('what is shown as the current main activity', () => {
  it('CURRENT with an exact key only: marked current; a pending one with a key is shown, never marked current', () => {
    const current = renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), []))
    expect(block().getAttribute('data-current')).toBe('true')
    current.unmount()
    const pending = renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.pendingRefresh), []))
    expect(block().getAttribute('data-current')).toBe('false')
    expect(block().className).not.toContain('border-primary')
    pending.unmount()
    // A status alone (no key) is never current either.
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.marketingNoMatch), []))
    expect(block().getAttribute('data-current')).toBe('false')
  })

  it('the interpretation withheld: pending, „interpretation withheld", no key, no label, no code, no badge, no analysis link', async () => {
    analytics.release = releaseV4Fixture()
    const client = createTestQueryClient()
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.interpretationWithheld), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null })]), client)
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Interpretare reținută până la verificare')
    expect(screen.getByTestId('company-main-activity-pending').textContent).toBe('actualizare în curs')
    expect(screen.getByTestId('company-main-activity-currentness').textContent).toContain('reținută până la verificare')
    expect(block().getAttribute('data-current')).toBe('false')
    const text = block().textContent ?? ''
    expect(text).not.toContain('Corespondent ONRC')
    expect(text).not.toContain('4711')
    expect(text).not.toContain('Comerț')
    // The fiscal source's own date may stay: an honest reference to the old source.
    expect(screen.getByTestId('company-main-activity-dates').textContent).toContain('ANAF: situația cerută la')
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByTestId('company-main-activity-analysis')).toBeNull()
  })

  it('integrityHeld: the source held for integrity verification — pending, never current, no key, code, badge or analysis link', async () => {
    analytics.release = releaseV4Fixture()
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.integrityHeld), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null })]))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF reținută pentru verificarea integrității')
    expect(screen.getByTestId('company-main-activity-currentness').textContent).toContain('reținută pentru verificarea integrității')
    expect(screen.getByTestId('company-main-activity-pending')).toBeInTheDocument()
    expect(block().getAttribute('data-current')).toBe('false')
    expect(block().textContent).not.toMatch(/Corespondent ONRC|4711|Comerț|Interpretare reținută/u)
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByTestId('company-main-activity-analysis')).toBeNull()
  })

  it('pending with no status but no hold: the generic withheld wording — never a claim of corruption or integrity', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.interpretationWithheld), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Interpretare reținută până la verificare')
    expect(block().textContent).not.toMatch(/integrit|corup/iu)
  })

  it('anafWithdrawn: nothing about an ANAF code whatever the currentness — the withdrawn headline, no key, no badge', () => {
    // The mapper drops all of it; the block does not lean on that.
    const leaky = mainActivityFixture({ anafWithdrawn: true, cacheKey: 'w:current' })
    renderBand(profileWith(assignedRead(leaky), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null })]))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
    expect(screen.getByTestId('company-main-activity-currentness').textContent).toContain('nu mai sunt publice')
    expect(block().getAttribute('data-current')).toBe('false')
  })

  it('an integrity hold beside ONRC unavailable: both said, no code, never current; beside a withdrawal: the withdrawal first', () => {
    const first = renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.integrityHeldOnrcUnavailable), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF reținută pentru verificarea integrității · ediția ONRC indisponibilă')
    expect(screen.getByTestId('company-main-activity-currentness').textContent).toContain('Ediția ONRC nu poate fi folosită acum, iar sursa ANAF folosită e reținută')
    expect(block().textContent).not.toMatch(/Cod ANAF|Fără cod CAEN|4711|doar observația ANAF/u)
    expect(block().getAttribute('data-current')).toBe('false')
    first.unmount()
    const second = renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.integrityHeldSourceWithdrawn), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
    expect(block().textContent).not.toContain('integrității')
    second.unmount()
    renderBand(profileWith(assignedRead({ ...MAIN_ACTIVITIES.integrityHeldOnrcUnavailable, anaf: null, anafWithdrawn: true }), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
  })

  it('ONRC unavailable and ANAF withdrawn: the withdrawn headline, never „no CAEN code in the observation"', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.onrcUnavailableAnafWithdrawn), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
    expect(block().textContent).not.toContain('Fără cod CAEN')
    expect(block().textContent).not.toContain('doar observația ANAF')
  })

  it('flags null under CURRENT (the flag list unavailable): the current key stays, no row gets a badge or a hint', () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null }), onrc('4711', 'rev2', { isMainCaen: null, matchesAssumedMainCode: null })]))
    expect(block().getAttribute('data-current')).toBe('true')
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
  })
})

// ───────────────────────────────────────────────────────────── history ──

const outcome = (resolutionId: string, extra: Partial<CompanyMainActivityOutcome> = {}): CompanyMainActivityOutcome => ({
  resolutionId,
  previousResolutionId: null,
  refreshId: '41',
  reasons: [],
  policy: 'anaf-assumed-main-caen-v1',
  basis: 'ANAF_ASSUMED_MAIN',
  status: 'RESOLVED_LATEST_REVISION',
  revisionBasis: 'LATEST_MATCHING_ONRC_REVISION',
  matchBasis: 'EXACT',
  anaf: { originalToken: '4711', jsonType: 'STRING', tokenForm: 'FOUR_DIGIT', canonicalDigits: '4711', assumedCode: '4711' },
  editionId: '7',
  candidates: null,
  resolved: { revision: 'rev3', code: '4711', label: 'Comerț (MOCK)', labelSource: 'frozen_at_derivation' },
  correctionId: null,
  derivedAt: '2026-10-01T03:00:00Z',
  anafWithdrawn: false,
  onrcWithdrawn: false,
  ...extra,
})

const page = (outcomes: CompanyMainActivityOutcome[], nextCursor: string | null): CompanyMainActivityHistoryResult => ({
  status: 'page',
  page: { state: 'AVAILABLE', kind: 'OUTCOMES', outcomes, evidence: [], nextCursor, scopeKey: 'mock' },
})

describe('the main activity history', () => {
  it('an ANAF-only company with no authorized ONRC class: the main block and its history still show, beside no authorized list', async () => {
    history.answer = () => Promise.resolve(page([outcome('501', { status: 'NO_ONRC_MATCH', resolved: null, candidates: [] })], null))
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.marketingNoMatch), []))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Cod ANAF 4730 · revizie necunoscută')
    expect(screen.queryByText('Activitățile autorizate, pe domenii')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    expect(screen.getByTestId('company-main-activity-outcome').textContent).toContain('fără potrivire ONRC')
  })

  it('opens on demand, newest first, a bounded page at a time', async () => {
    history.answer = ({ after }) => Promise.resolve(after === 'c1' ? page([outcome('499', { status: 'NO_ONRC_MATCH', resolved: null })], null) : page([outcome('501'), outcome('500', { status: 'NO_ONRC_MATCH', resolved: null })], 'c1'))
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), []))
    expect(history.calls).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(2))
    expect(screen.getByTestId('company-main-activity-history').textContent).toContain('nu date legale de intrare în vigoare')
    const rows = screen.getAllByTestId('company-main-activity-outcome').map((row) => row.textContent ?? '')
    expect(rows[0]).toContain('Rev.3 4711 — Comerț (MOCK)')
    expect(rows[0]).toContain('cod ANAF „4711”')
    expect(rows[1]).toContain('fără potrivire ONRC')
    fireEvent.click(screen.getByRole('button', { name: 'Mai multe' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(3))
    expect(history.calls).toEqual([
      { kind: 'OUTCOMES', after: null },
      { kind: 'OUTCOMES', after: 'c1' },
    ])
    expect(screen.queryByTestId('company-main-activity-history-anaf-withdrawn')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mai multe' })).toBeNull()
  })

  it('a later page reporting ANAF withdrawn hides page one’s ANAF fields and the profile’s at once, drops every page and reads profile and history again (turn 01 kept page one public)', async () => {
    let withdrawn = false
    history.answer = ({ after }) => {
      if (after === 'c1') {
        withdrawn = true
        return Promise.resolve(page([outcome('499', { anaf: null, anafWithdrawn: true })], null))
      }
      // Page one as first read (public), then as read again after the withdrawal (the server's now-withdrawn rows).
      return Promise.resolve(withdrawn ? page([outcome('501', { anaf: null, anafWithdrawn: true }), outcome('500', { anaf: null, anafWithdrawn: true, onrcWithdrawn: true })], 'c1') : page([outcome('501'), outcome('500', { onrcWithdrawn: true })], 'c1'))
    }
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const profile = profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [
      onrc('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true }),
      onrc('4711', 'rev2', { isMainCaen: false, matchesAssumedMainCode: true }),
    ])
    renderBand(profile, client)
    expect(rowMarks()).toMatchObject({ main: [expect.stringContaining('rev3')], sameCode: [expect.stringContaining('rev2')] })
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(2))
    expect(screen.getAllByTestId('company-main-activity-outcome')[0]?.textContent).toContain('cod ANAF „4711”')
    fireEvent.click(screen.getByRole('button', { name: 'Mai multe' }))
    // The profile's ANAF data goes at once: the withdrawn headline, no counterpart, no badge or hint, the same cacheKey.
    await waitFor(() => expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă'))
    expect(block().getAttribute('data-current')).toBe('false')
    expect(block().textContent).not.toContain('Corespondent ONRC')
    expect(block().textContent).not.toContain('ANAF: situația')
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
    // Every page read is dropped and the history read again from page one; the profile is read again.
    await waitFor(() => expect(history.calls).toEqual([
      { kind: 'OUTCOMES', after: null },
      { kind: 'OUTCOMES', after: 'c1' },
      { kind: 'OUTCOMES', after: null },
    ]))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['private-company', profile.cui], exact: true })
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(2))
    expect(screen.getByTestId('company-main-activity-history-anaf-withdrawn').textContent).toContain('istoricul nu mai arată niciun câmp ANAF')
    const rows = screen.getAllByTestId('company-main-activity-outcome').map((row) => row.textContent ?? '')
    for (const row of rows) {
      expect(row).not.toContain('cod ANAF')
      expect(row).toContain('date ANAF retrase')
    }
    // The main key is derived from ANAF and ONRC both: no row keeps it once ANAF is withdrawn (turn 02's first pass kept it).
    for (const row of rows) expect(row).not.toMatch(/Rev\.3 4711|Comerț/u)
    // The edition's own withdrawal is still said per row.
    expect(rows[1]).toContain('date ONRC retrase')
    expect(rows[0]).not.toContain('date ONRC retrase')
  })

  it('page one resolved rev2:0610, page two ANAF withdrawn: at once no old key, label, current marking or main drill, before any reset or reread', async () => {
    analytics.release = releaseV4Fixture({ mainCaen: { contentEpoch: '12', refreshId: '41', policy: 'anaf-assumed-main-caen-v1', editionId: '7' } })
    const omv = MAIN_ACTIVITIES.omvLeadingZero
    const resolved = { revision: 'rev2' as const, code: '0610', label: 'Extracția petrolului brut (MOCK)', labelSource: 'frozen_at_derivation' as const }
    history.answer = ({ after }) => {
      if (after === 'c1') return Promise.resolve(page([outcome('501', { anaf: null, anafWithdrawn: true, resolved, status: 'RESOLVED', matchBasis: 'LEADING_ZERO_MATCH' })], null))
      return Promise.resolve(page([outcome('502', { resolved, status: 'RESOLVED', matchBasis: 'LEADING_ZERO_MATCH', anaf: { originalToken: '610', jsonType: 'STRING', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: '610', assumedCode: null } })], 'c1'))
    }
    const client = createTestQueryClient()
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, retryDelay: 0 } })
    // The reset is held back, so what is checked is the render that first learns of the withdrawal — never the empty reread.
    const reset = vi.spyOn(client, 'resetQueries').mockResolvedValue(undefined)
    const profile = profileWith(assignedRead({ ...omv, resolutionId: '502' }), [onrc('0610', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true })])
    renderBand(profile, client)
    // Before: the current key, its label, the current marking, the badge and the drill into the analysis.
    await screen.findByTestId('company-main-activity-analysis')
    expect(block().getAttribute('data-current')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    expect(screen.getByTestId('company-main-activity-outcome').textContent).toContain('Rev.2 0610 — Extracția petrolului brut (MOCK)')
    fireEvent.click(screen.getByRole('button', { name: 'Mai multe' }))
    await screen.findByTestId('company-main-activity-history-anaf-withdrawn')
    // The main block: no key, no label, no ANAF code, not current, no drill.
    expect(block().textContent).not.toMatch(/0610|610|Extracția|Corespondent ONRC/u)
    expect(block().getAttribute('data-current')).toBe('false')
    expect(screen.queryByTestId('company-main-activity-analysis')).toBeNull()
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
    // Every history row, page one's cached copy included: no key, no label, no status, no token.
    const rows = screen.getAllByTestId('company-main-activity-outcome')
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.textContent).not.toMatch(/0610|610|Extracția|potrivit cu ONRC/u)
      expect(row.textContent).toContain('date ANAF retrase')
    }
    // And the cached pages are dropped for a reread from page one.
    expect(reset).toHaveBeenCalledWith({ queryKey: ['company-main-activity-history', profile.cui] })
  })

  it('a row read with ANAF withdrawn hides the ANAF fields of the rows read with it, and of page one, before any reread answers', async () => {
    history.answer = ({ after }) =>
      after === 'c1' ? new Promise(() => undefined) : Promise.resolve(page([outcome('501'), outcome('500', { anaf: null, anafWithdrawn: true })], 'c1'))
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), []))
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await screen.findByTestId('company-main-activity-history-anaf-withdrawn')
    expect(screen.getByTestId('company-main-activity-history').textContent).not.toContain('cod ANAF „4711”')
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
  })

  it('ONRC editions withdrawn row by row: another row keeps its key and every row its ANAF fields; nothing is purged', async () => {
    history.answer = () => Promise.resolve(page([outcome('501'), outcome('500', { onrcWithdrawn: true, resolved: { revision: 'rev2', code: '4711', label: 'Vechi (MOCK)', labelSource: 'frozen_at_derivation' } })], null))
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), []), client)
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(2))
    const rows = screen.getAllByTestId('company-main-activity-outcome').map((row) => row.textContent ?? '')
    expect(rows[0]).toContain('Rev.3 4711 — Comerț (MOCK)')
    expect(rows[0]).toContain('cod ANAF „4711”')
    expect(rows[1]).not.toContain('Vechi (MOCK)')
    expect(rows[1]).toContain('cod ANAF „4711”')
    expect(rows[1]).toContain('date ONRC retrase')
    expect(history.calls).toHaveLength(1)
    expect(invalidate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('company-main-activity-history-anaf-withdrawn')).toBeNull()
  })

  it('a row read again with another visibility (same ids, same cacheKey): every page dropped, history and profile read again', async () => {
    let read = 0
    history.answer = () => {
      read += 1
      return Promise.resolve(page([outcome('501'), outcome('500', { onrcWithdrawn: read > 1 })], null))
    }
    const client = createTestQueryClient()
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, retryDelay: 0 } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const profile = profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [])
    renderBand(profile, client)
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(2))
    expect(screen.getAllByTestId('company-main-activity-outcome')[1]?.textContent).toContain('Rev.3 4711')
    await act(async () => {
      await client.refetchQueries({ queryKey: ['company-main-activity-history'] }).catch(() => undefined)
    })
    // Read 2 found the change (never retried as is), read 3 is the fresh read after every page was dropped.
    await waitFor(() => expect(read).toBe(3))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(2))
    expect(screen.getAllByTestId('company-main-activity-outcome')[1]?.textContent).toContain('date ONRC retrase')
    expect(screen.getAllByTestId('company-main-activity-outcome')[1]?.textContent).not.toContain('Rev.3 4711')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['private-company', profile.cui], exact: true })
  })

  it('a row read again ANAF-withdrawn (same ids, same cacheKey): the profile’s ANAF fields go at once, before the history read again answers', async () => {
    let read = 0
    history.answer = () => {
      read += 1
      if (read === 1) return Promise.resolve(page([outcome('501')], null))
      if (read === 2) return Promise.resolve(page([outcome('501', { anaf: null, anafWithdrawn: true })], null))
      return new Promise(() => undefined)
    }
    const client = createTestQueryClient()
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, retryDelay: 0 } })
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [onrc('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })]), client)
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    await act(async () => {
      await client.refetchQueries({ queryKey: ['company-main-activity-history'] }).catch(() => undefined)
    })
    await waitFor(() => expect(read).toBe(3))
    expect(screen.getByTestId('company-main-activity-headline').textContent).toBe('Sursa ANAF a fost retrasă')
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
    expect(screen.getByTestId('company-main-activity-history').textContent).not.toContain('cod ANAF „4711”')
  })

  it('a main activity that moved during the read (SERVICE_UNAVAILABLE): retried, then a failure to retry — never empty, never an older API, no row kept beside it', async () => {
    const moved = new GraphQLRequestError('GraphQL request failed', { graphQLErrors: [{ message: 'the main activity changed during the request; retry', path: ['companyMainActivityHistory'], extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
    history.answer = ({ after }) => (after === 'c1' ? Promise.reject(moved) : Promise.resolve(page([outcome('501')], 'c1')))
    const client = createTestQueryClient()
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, retryDelay: 0 } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const profile = profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [])
    renderBand(profile, client)
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: 'Mai multe' }))
    const failed = await screen.findByTestId('company-main-activity-history-failed')
    expect(failed.textContent).toContain('s-a schimbat în timpul citirii istoricului')
    // Retried like any failure: the first read and two retries of the page.
    expect(history.calls.filter((call) => call.after === 'c1')).toHaveLength(3)
    expect(screen.queryAllByTestId('company-main-activity-outcome')).toHaveLength(0)
    expect(screen.getByTestId('company-main-activity-history').textContent).not.toContain('Nicio înregistrare')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['private-company', profile.cui], exact: true })
    fireEvent.click(within(failed).getByRole('button', { name: 'Reîncearcă' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    expect(history.calls[history.calls.length - 1]).toEqual({ kind: 'OUTCOMES', after: null })
  })

  it('never writes a non-public token in the history, outcomes or evidence: diagnostics only; the public forms as they are', async () => {
    const outcomes = [
      outcome('510', { status: 'TOKEN_INVALID', resolved: null, anaf: { originalToken: 'contact@firma.ro', jsonType: 'STRING', tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null } }),
      outcome('509', { status: 'TOKEN_INVALID', resolved: null, anaf: { originalToken: '{"tel":"0722123456"}', jsonType: 'OBJECT', tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null } }),
      outcome('508', { status: 'UNRESOLVED_TOKEN_FORM', resolved: null, anaf: { originalToken: '0722123456', jsonType: 'NUMBER', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: '722123456', assumedCode: null } }),
      outcome('507', { status: 'UNRESOLVED_TOKEN_FORM', resolved: null, anaf: { originalToken: '٤٧١١', jsonType: 'STRING', tokenForm: 'INVALID', canonicalDigits: null, assumedCode: null } }),
      ...['610', '0610', '000610', '9999', '0000'].map((token, index) => outcome(String(506 - index), { anaf: { originalToken: token, jsonType: 'STRING', tokenForm: 'OTHER_DIGIT_FORM', canonicalDigits: null, assumedCode: null } })),
    ]
    const evidence = (supportId: string, originalToken: string, jsonType: 'STRING' | 'NUMBER' | 'OBJECT'): CompanyMainActivityEvidenceEntry => ({
      supportId,
      previousSupportId: null,
      resolutionId: '510',
      refreshId: '41',
      editionId: '7',
      anaf: { sourceSnapshotId: 's', sourceHash: null, statusDate: '2026-09-20', retrievedAt: null, timeBasis: 'NATIVE', rawRetrievedAt: null, sourceUrl: null, rawCaptureId: null, rawCustodyId: null, evidenceCustody: null, originalToken, jsonType },
      caenCoverage: null,
      evidenceAt: '2026-10-01T03:00:00Z',
      anafWithdrawn: false,
      onrcWithdrawn: false,
    })
    history.answer = ({ kind }) =>
      Promise.resolve(
        kind === 'EVIDENCE'
          ? { status: 'page', page: { state: 'AVAILABLE', kind: 'EVIDENCE', outcomes: [], evidence: [evidence('701', 'tel 0722 123 456', 'STRING'), evidence('700', '{"email":"contact@firma.ro"}', 'OBJECT'), evidence('699', '0610', 'STRING')], nextCursor: null, scopeKey: 'mock' } }
          : page(outcomes, null),
      )
    renderBand(profileWith(assignedRead(mainActivityFixture({ resolutionId: '510', supportId: '701', cacheKey: 'tokens' })), []))
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(9))
    const rows = screen.getAllByTestId('company-main-activity-outcome').map((row) => row.textContent ?? '')
    const all = rows.join('\n')
    expect(all).not.toMatch(/contact@|firma\.ro|0722|722123456|tel|٤/u)
    expect(rows[0]).toContain('cod ANAF nevalid în sursă (valoare text)')
    expect(rows[1]).toContain('cod ANAF nevalid în sursă (obiect JSON)')
    expect(rows[2]).toContain('cod ANAF neafișat (nu e o formă de cod CAEN)')
    expect(rows[3]).toContain('cod ANAF nevalid în sursă (valoare text)')
    ;['610', '0610', '000610', '9999', '0000'].forEach((token, index) => expect(rows[4 + index]).toContain(`cod ANAF „${token}”`))
    fireEvent.click(screen.getByRole('button', { name: 'Observații din sursă' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-evidence')).toHaveLength(3))
    const entries = screen.getAllByTestId('company-main-activity-evidence').map((row) => row.textContent ?? '')
    expect(entries.join('\n')).not.toMatch(/contact@|firma\.ro|0722|email|tel/u)
    expect(entries[0]).toContain('cod ANAF neafișat (nu e o formă de cod CAEN)')
    expect(entries[1]).toContain('cod ANAF nevalid în sursă (obiect JSON)')
    expect(entries[2]).toContain('cod ANAF „0610”')
  })

  it('a history ahead of the assignment shown is not shown beside it: the profile is read again, once', async () => {
    history.answer = () => Promise.resolve(page([outcome('502'), outcome('501')], 'c1'))
    const client = createTestQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const profile = profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [])
    renderBand(profile, client)
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await screen.findByTestId('company-main-activity-history-ahead')
    expect(screen.queryAllByTestId('company-main-activity-outcome')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Mai multe' })).toBeNull()
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['private-company', profile.cui], exact: true })
  })

  it('an API without the history root shows no history at all', async () => {
    renderBand(profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), []))
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(history.calls).toHaveLength(1))
    await waitFor(() => expect(screen.queryByTestId('company-main-activity-history')).toBeNull())
    expect(screen.queryByRole('button', { name: /Istoricul/u })).toBeNull()
  })

  it('a moved main activity drops the history read under the old one; no assignment drops it all', async () => {
    history.answer = () => Promise.resolve(page([outcome('501')], null))
    const client = createTestQueryClient()
    // A long gcTime, so only the purge — not garbage collection — can remove a page.
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } })
    const first = profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [])
    const view = renderBand(first, client)
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    const scopeKey = first.registry.registry.scopeKey
    const oldKey = mainActivityHistoryKey(first.cui ?? '', 'OUTCOMES', MAIN_ACTIVITIES.lidlLatestRevision.cacheKey, scopeKey)
    expect(client.getQueryData(oldKey)).toBeDefined()
    // An evidence-only confirmation: same content epoch, another support → another cacheKey.
    const confirmed: CompanyMainActivity = { ...MAIN_ACTIVITIES.lidlLatestRevision, supportId: '602', cacheKey: '12:501:602:current:41:7' }
    view.rerenderWith(profileWith(assignedRead(confirmed), []))
    await waitFor(() => expect(client.getQueryData(oldKey)).toBeUndefined())
    view.rerenderWith(profileWith(NO_ASSIGNMENT_READ, []))
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['company-main-activity-history'] })).toHaveLength(0))
  })
})

// ──────────────────────────────── the owning company no longer public ──

describe('a fresh history answer that the company is no longer public (not_public)', () => {
  const resolved = MAIN_ACTIVITIES.omvLeadingZero
  const omvRows = () => [onrc('0610', 'rev2', { isMainCaen: true, matchesAssumedMainCode: true }), onrc('0610', 'rev3', { isMainCaen: false, matchesAssumedMainCode: true })]

  function renderOwned(profile: PrivateCompanyProfile, client: QueryClient, onCompanyGone: () => void) {
    return render(
      <QueryClientProvider client={client}>
        <CompanyActivitiesBand model={buildCompanyProfileModel(profile)} index="03 / Activități" onCompanyGone={onCompanyGone} />
      </QueryClientProvider>,
    )
  }

  async function opened(answer: typeof history.answer) {
    analytics.release = releaseV4Fixture({ mainCaen: { contentEpoch: '12', refreshId: '41', policy: 'anaf-assumed-main-caen-v1', editionId: '7' } })
    history.answer = answer
    const client = createTestQueryClient()
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, retryDelay: 0 } })
    // The profile reread is held pending: whatever is checked below is what shows before it answers.
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockImplementation(() => new Promise<void>(() => undefined))
    const profile = profileWith(assignedRead(resolved), omvRows())
    // Another history page of the company, cached: it must not survive a refusal.
    client.setQueryData(mainActivityHistoryKey(profile.cui ?? '', 'EVIDENCE', resolved.cacheKey, profile.registry.registry.scopeKey), { pages: [page([outcome('502')], null)], pageParams: [null] })
    const onCompanyGone = vi.fn()
    renderOwned(profile, client, onCompanyGone)
    // Before: the current key, its frozen label, the current marking, the badge, the hint and the drill.
    await screen.findByTestId('company-main-activity-analysis')
    expect(block().getAttribute('data-current')).toBe('true')
    expect(screen.getByTestId('company-main-activity-headline').textContent).toContain('Rev.2 0610 — Extracția petrolului brut (MOCK)')
    expect(rowMarks()).toMatchObject({ main: [expect.stringContaining('rev2')], sameCode: [expect.stringContaining('rev3')] })
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    return { client, invalidate, profile, onCompanyGone }
  }

  it('withholds every cached main surface at once, tells the page’s privacy path, purges the history and reads the profile again (turn 02 only swapped the history panel)', async () => {
    const { client, invalidate, profile, onCompanyGone } = await opened(() => Promise.resolve({ status: 'not_public' }))
    await waitFor(() => expect(history.calls).toHaveLength(1))
    // The main block is gone with its key, label, current marking and drill; no row keeps a badge or a hint.
    await waitFor(() => expect(screen.queryByTestId('company-main-activity')).toBeNull())
    expect(onCompanyGone).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('company-main-activity-analysis')).toBeNull()
    // The frozen label exactly: the Rev.3 division heading of the authorized activities (a different, still public name) stays.
    expect(document.body.textContent).not.toMatch(/Extracția petrolului brut \(MOCK\)|Corespondent ONRC|principală \(presupusă\)|același cod ca ANAF/u)
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
    // Never worded as a withdrawn ANAF source or an older API.
    expect(document.body.textContent).not.toMatch(/Sursa ANAF a fost retrasă|date ANAF retrase|nu mai sunt publice/u)
    // The profile is read again (still pending) and every history page of the company is purged.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['private-company', profile.cui], exact: true })
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['company-main-activity-history', profile.cui] })).toHaveLength(0))
  })

  it('negative control: an ordinary history transport failure does none of it — the main block, its key, marks and drill stay', async () => {
    const { invalidate, onCompanyGone } = await opened(() => Promise.reject(new Error('fetch failed')))
    await screen.findByTestId('company-main-activity-history-failed')
    expect(onCompanyGone).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    expect(block().getAttribute('data-current')).toBe('true')
    expect(screen.getByTestId('company-main-activity-headline').textContent).toContain('Rev.2 0610 — Extracția petrolului brut (MOCK)')
    expect(screen.getByTestId('company-main-activity-analysis')).toBeInTheDocument()
    expect(rowMarks()).toMatchObject({ main: [expect.stringContaining('rev2')], sameCode: [expect.stringContaining('rev3')] })
  })
})

describe('historyVisibilityChanged', () => {
  const result = (outcomes: CompanyMainActivityOutcome[]): CompanyMainActivityHistoryResult => page(outcomes, null)
  it('compares a row with its earlier copies only, by id, on both withdrawal flags', () => {
    const earlier = [result([outcome('501'), outcome('500')])]
    expect(historyVisibilityChanged(earlier, { outcomes: [outcome('501'), outcome('499', { anafWithdrawn: true })], evidence: [] })).toBe(false)
    expect(historyVisibilityChanged(earlier, { outcomes: [outcome('500', { onrcWithdrawn: true })], evidence: [] })).toBe(true)
    expect(historyVisibilityChanged(earlier, { outcomes: [outcome('501', { anafWithdrawn: true, anaf: null })], evidence: [] })).toBe(true)
    expect(historyVisibilityChanged([result([outcome('501', { anafWithdrawn: true })])], { outcomes: [outcome('501')], evidence: [] })).toBe(true)
    expect(historyVisibilityChanged([], { outcomes: [outcome('501', { anafWithdrawn: true })], evidence: [] })).toBe(false)
    expect(historyVisibilityChanged([{ status: 'unsupported' }], { outcomes: [outcome('501')], evidence: [] })).toBe(false)
  })
})

describe('purgeMainActivityHistory', () => {
  it('keeps only the current identity and scope of the company; none at all without an identity', () => {
    const client = createTestQueryClient()
    client.setDefaultOptions({ queries: { gcTime: Infinity } })
    const keep = mainActivityHistoryKey('1', 'OUTCOMES', 'k2', 's1')
    client.setQueryData(mainActivityHistoryKey('1', 'OUTCOMES', 'k1', 's1'), 'old')
    client.setQueryData(mainActivityHistoryKey('1', 'EVIDENCE', 'k2', 's0'), 'other scope')
    client.setQueryData(keep, 'current')
    client.setQueryData(mainActivityHistoryKey('2', 'OUTCOMES', 'k1', 's1'), 'another company')
    purgeMainActivityHistory(client, '1', 'k2', 's1')
    expect(client.getQueryCache().findAll({ queryKey: ['company-main-activity-history'] }).map((query) => query.queryKey)).toEqual([keep, mainActivityHistoryKey('2', 'OUTCOMES', 'k1', 's1')])
    purgeMainActivityHistory(client, '1', null, 's1')
    expect(client.getQueryCache().findAll({ queryKey: ['company-main-activity-history', '1'] })).toHaveLength(0)
  })

  it('the identity is the whole cacheKey, not the content epoch alone', () => {
    const base = MAIN_ACTIVITIES.lidlLatestRevision
    const confirmed = { ...base, supportId: '602', cacheKey: '12:501:602:current:41:7' }
    expect(base.contentEpoch).toBe(confirmed.contentEpoch)
    expect(mainActivityIdentity({ kind: 'assigned', activity: base })).not.toBe(mainActivityIdentity({ kind: 'assigned', activity: confirmed }))
    expect(mainActivityIdentity({ kind: 'no_assignment' })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────── analysis link ──

describe('the link into the analysis of the same main activity', () => {
  const current = profileWith(assignedRead(MAIN_ACTIVITIES.lidlLatestRevision), [onrc('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })])

  it('is shown only for a v4 release that pins the same edition and content epoch, pinned to that release', async () => {
    analytics.release = releaseV4Fixture()
    renderBand(current)
    const link = await screen.findByTestId('company-main-activity-analysis')
    expect(link.getAttribute('href')).toBe('/companies/analytics')
    expect(JSON.parse(link.getAttribute('data-search') ?? '{}')).toEqual({ editie: 9, activitate_principala: 'rev3:4711' })
  })

  it('is never shown for a v3 release, nor for a v4 release pinned to other content', async () => {
    for (const release of [releaseV3Fixture(), releaseV4Fixture({ mainCaen: { contentEpoch: '13', refreshId: '42', policy: 'anaf-assumed-main-caen-v1', editionId: '7' } }), releaseV4Fixture({ mainCaen: { contentEpoch: '12', refreshId: '41', policy: 'anaf-assumed-main-caen-v1', editionId: '8' } })]) {
      analytics.release = release
      const client = createTestQueryClient()
      const view = renderBand(current, client)
      await waitFor(() => expect(client.getQueryState(['companies', 'analytics', 'release', 'active'])?.status).toBe('success'))
      expect(screen.queryByTestId('company-main-activity-analysis')).toBeNull()
      view.unmount()
    }
  })
})

describe('contract v2: the legacy time projection, said as what it is', () => {
  const legacy = mainActivityFixture({ policy: 'anaf-assumed-main-caen-v2', basis: 'ANAF_ASSUMED_MAIN_LEGACY_TIME', anaf: legacyAnafFixture(), cacheKey: 'legacy' })

  it('the current block: custody and the exact six-digit raw time, compatibility with an older import — never the row writer, the HTTP exchange or a legal date', () => {
    renderBand(profileWith(assignedRead(legacy), [onrc('4711', 'rev3', { isMainCaen: true, matchesAssumedMainCode: true })]))
    const text = screen.getByTestId('company-main-activity-legacy-time').textContent ?? ''
    expect(text).toContain(`ora brută: ${LEGACY_RAW_RETRIEVED_AT}`)
    expect(text).toContain('2026-09-21T04:00:12.642832Z')
    expect(text).toContain('nu cine a scris rândul și nici schimbul HTTP original')
    expect(text).toContain('nicio oră de preluare nu e o dată legală')
    expect(block().textContent).toContain('legată prin compatibilitatea cu un import mai vechi, după răspunsul brut indicat atunci')
    expect(rowMarks()).toMatchObject({ main: [expect.stringContaining('4711')] })
  })

  it('native evidence says nothing about a projection', () => {
    renderBand(profileWith(assignedRead(mainActivityFixture()), []))
    expect(screen.queryByTestId('company-main-activity-legacy-time')).toBeNull()
  })

  it('a withdrawn legacy assignment says nothing of ANAF: no time, no custody, no badge', () => {
    const withdrawn = mainActivityFixture({ ...legacy, currentness: 'SOURCE_WITHDRAWN', anafWithdrawn: true, status: null, resolved: null, candidates: null, matchBasis: null, revisionBasis: null, anaf: null, cacheKey: 'legacy-withdrawn' })
    renderBand(profileWith(assignedRead(withdrawn), [onrc('4711', 'rev3', { isMainCaen: null, matchesAssumedMainCode: null })]))
    expect(screen.queryByTestId('company-main-activity-legacy-time')).toBeNull()
    expect(block().textContent).not.toMatch(/642832|compatibilitatea cu un import/u)
    expect(rowMarks()).toMatchObject({ main: [], sameCode: [] })
  })

  it('history: a legacy outcome is marked while ANAF is shown; a legacy evidence entry carries its raw time', async () => {
    history.answer = ({ kind }) =>
      Promise.resolve(
        kind === 'EVIDENCE'
          ? {
              status: 'page',
              page: {
                state: 'AVAILABLE',
                kind: 'EVIDENCE',
                outcomes: [],
                evidence: [
                  {
                    supportId: '601',
                    previousSupportId: null,
                    resolutionId: '501',
                    refreshId: '41',
                    editionId: '7',
                    anaf: { ...legacyAnafFixture(), sourceHash: null, statusDate: '2026-09-20' },
                    caenCoverage: null,
                    evidenceAt: '2026-10-01T03:00:00Z',
                    anafWithdrawn: false,
                    onrcWithdrawn: false,
                  },
                ],
                nextCursor: null,
                scopeKey: 'mock',
              },
            }
          : page([outcome('501', { policy: 'anaf-assumed-main-caen-v2', basis: 'ANAF_ASSUMED_MAIN_LEGACY_TIME' })], null),
      )
    renderBand(profileWith(assignedRead(legacy), []))
    fireEvent.click(screen.getByRole('button', { name: 'Istoricul activității principale presupuse' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-outcome')).toHaveLength(1))
    expect(screen.getByTestId('company-main-activity-outcome-legacy').textContent).toContain('legat prin compatibilitatea cu un import mai vechi')
    fireEvent.click(screen.getByRole('button', { name: 'Observații din sursă' }))
    await waitFor(() => expect(screen.getAllByTestId('company-main-activity-evidence')).toHaveLength(1))
    expect(screen.getByTestId('company-main-activity-evidence-legacy-time').textContent).toContain('ora brută: 2026-09-21T04:00:12.642832Z')
  })
})
