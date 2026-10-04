import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import type { CompanyResolveResult } from '@/schemas/private-company-search'
import { MOCK_REGISTRY_ENVELOPE } from '../mocks/fixtures/registry'
import { CompanyRegistryScopeMovedError, isRegistryScopeMoved } from './company-registry-errors'
import { resolveCompanies } from './private-company-api'

/**
 * `companyResolveResult` through the real adapter, parse, mapping and
 * acceptance check (only the transport is scripted, with the real
 * `GraphQLRequestError`), and the mock API answering the same contract:
 * NAME/REGNUM send the page's scope and are used only under it, zero hits
 * included; a refusal is classified, any other failure stays a failure —
 * never an empty answer; `degraded` is not a healthy zero; CAEN/COUNTY are
 * catalogs with no scope sent or answered, each CAEN row with its own
 * revision, key and attribution.
 */

const transport = vi.hoisted(() => ({
  answer: (_variables: Record<string, unknown>, _signal?: AbortSignal): Promise<unknown> => Promise.resolve(null),
  calls: [] as { readonly variables: Record<string, unknown>; readonly signal: AbortSignal | undefined }[],
}))
const mode = vi.hoisted(() => ({ mock: false }))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: vi.fn(async (query: string, variables: Record<string, unknown> = {}, options: { readonly signal?: AbortSignal } = {}) => {
      if (!query.includes('companyResolveResult(')) throw new Error(`unexpected query: ${query.slice(0, 60)}`)
      transport.calls.push({ variables, signal: options.signal })
      return transport.answer(variables, options.signal)
    }),
  }
})
vi.mock('../lib/mock-mode', () => ({ isPrivateCompanyMockEnabled: () => mode.mock }))

const envelope = (scopeKey: string, state = 'PUBLISHED') => ({
  source: 'onrc',
  state,
  editionId: state === 'PUBLISHED' ? '7' : null,
  sourceSnapshotId: 'firme-7',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: '3',
  accessEpoch: '11',
  reason: null,
  scopeKey,
})
const S1 = 'onrc:published:7:3:11'
const S0 = 'onrc:published:6:2:11'

const nameHit = (cui: string, label: string, labelSource: string) => ({ dim: 'NAME', value: cui, label, cui, confidence: 0.9, revision: null, key: null, labelSource })
const answered = (fields: Record<string, unknown>) => () => Promise.resolve({ companyResolveResult: { hits: [], degraded: false, ambiguous: false, registry: envelope(S1), scopeKey: S1, ...fields } })
const refused = (code: string, message: string) => () => Promise.reject(new GraphQLRequestError('GraphQL errors', { graphQLErrors: [{ message, extensions: { code } }] }))

const NAME_S1 = { dim: 'NAME', q: 'dante', limit: 8, registryScope: S1 } as const

beforeEach(() => {
  mode.mock = false
  transport.calls = []
  transport.answer = () => Promise.resolve(null)
})

describe('resolveCompanies — NAME/REGNUM under the page’s scope', () => {
  it('sends the page’s scope and uses an answer under it, each hit with its own attribution', async () => {
    transport.answer = answered({ hits: [nameHit('14399840', 'DANTE INTERNATIONAL SA', 'onrc_edition'), nameHit('1', 'DANTE SRL', 'core_organization')], ambiguous: true })
    const result = await resolveCompanies(NAME_S1)
    expect(transport.calls[0]?.variables).toEqual({ dim: 'NAME', q: 'dante', limit: 8, registryScope: S1 })
    expect(result.scopeKey).toBe(S1)
    expect(result.registry?.scopeKey).toBe(S1)
    expect(result.hits.map((hit) => [hit.cui, hit.labelSource])).toEqual([
      ['14399840', 'onrc_edition'],
      ['1', 'core_organization'],
    ])
    expect(result).toMatchObject({ degraded: false, ambiguous: true })
  })

  it('uses a scoped empty answer as a genuine no match — and a degraded one as the engine down, never the same', async () => {
    transport.answer = answered({})
    expect(await resolveCompanies(NAME_S1)).toMatchObject({ hits: [], degraded: false, scopeKey: S1 })
    transport.answer = answered({ degraded: true })
    expect(await resolveCompanies(NAME_S1)).toMatchObject({ hits: [], degraded: true, scopeKey: S1 })
  })

  it('refuses an answer under another scope, an empty one included, as a moved scope — never a no match', async () => {
    transport.answer = answered({ registry: envelope(S0), scopeKey: S0 })
    await expect(resolveCompanies(NAME_S1)).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
    transport.answer = answered({ hits: [nameHit('9', 'VECHI SRL', 'onrc_edition')], registry: envelope(S0), scopeKey: S0 })
    await expect(resolveCompanies(NAME_S1)).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
  })

  it('refuses an answer that does not carry its scope, or whose envelope and key disagree, as a failure', async () => {
    transport.answer = answered({ registry: null, scopeKey: null })
    const missing = await resolveCompanies(NAME_S1).catch((error: unknown) => error)
    expect(missing).toBeInstanceOf(Error)
    expect(isRegistryScopeMoved(missing)).toBe(false)
    transport.answer = answered({ registry: envelope(S0), scopeKey: S1 })
    await expect(resolveCompanies(NAME_S1)).rejects.toThrow(/without its registry scope/u)
  })

  it('classifies the resolver’s scope refusals as a moved scope: stale key, malformed key, and the final guard', async () => {
    for (const answer of [
      refused('INVALID_INPUT', 'company registry scope changed (publication, rollback, withdrawal or access) since registryScope was issued; read the current scope and resolve again'),
      refused('INVALID_INPUT', 'registryScope is not a registry scope key issued by this API; pass the scopeKey of a companies response, or omit it'),
      refused('SERVICE_UNAVAILABLE', 'the ONRC registry publication or company access changed during the request; retry'),
    ]) {
      transport.answer = answer
      await expect(resolveCompanies(NAME_S1)).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
    }
  })

  it('keeps every other failure a failure: another refused input, a transport error, a null field — never an empty answer, never a move', async () => {
    for (const answer of [
      refused('INVALID_INPUT', 'registryScope applies to NAME and REGNUM only: CAEN and COUNTY are catalog reads with no registry scope'),
      () => Promise.reject(new GraphQLRequestError('GraphQL request failed: 502 Bad Gateway', { status: 502 })),
      () => Promise.resolve({ companyResolveResult: null }),
    ]) {
      transport.answer = answer
      const failure = await resolveCompanies(NAME_S1).catch((error: unknown) => error)
      expect(failure).toBeInstanceOf(Error)
      expect(isRegistryScopeMoved(failure)).toBe(false)
    }
  })

  it('passes a cancellation on as the abort it is', async () => {
    const controller = new AbortController()
    transport.answer = (_variables, signal) =>
      new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError'))))
    const pending = resolveCompanies(NAME_S1, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(transport.calls[0]?.signal).toBe(controller.signal)
  })

  it('sends the scope for REGNUM too', async () => {
    transport.answer = answered({ hits: [{ ...nameHit('2', 'ALFA SRL', 'onrc_edition'), dim: 'REGNUM', value: 'J12/100/2002' }] })
    const result = await resolveCompanies({ dim: 'REGNUM', q: 'J12/100/2002', registryScope: S1 })
    expect(transport.calls[0]?.variables).toMatchObject({ dim: 'REGNUM', registryScope: S1 })
    expect(result.hits[0]).toMatchObject({ dim: 'REGNUM', value: 'J12/100/2002', labelSource: 'onrc_edition' })
  })
})

describe('resolveCompanies — the CAEN and COUNTY catalogs', () => {
  it('sends no scope, answers none, and keeps each CAEN row’s own revision, key and label — or its key, unlabelled', async () => {
    transport.answer = () =>
      Promise.resolve({
        companyResolveResult: {
          hits: [
            { dim: 'CAEN', value: '6201', label: 'Activități de realizare a soft-ului la comandă', cui: null, confidence: null, revision: 'rev2', key: 'rev2:6201', labelSource: 'current_db_catalog' },
            { dim: 'CAEN', value: '6201', label: 'Transporturi aeriene regulate', cui: null, confidence: null, revision: 'rev0', key: 'rev0:6201', labelSource: 'current_db_catalog' },
            { dim: 'CAEN', value: '6201', label: 'rev3:6201', cui: null, confidence: null, revision: 'rev3', key: 'rev3:6201', labelSource: null },
          ],
          degraded: false,
          ambiguous: true,
          registry: null,
          scopeKey: null,
        },
      })
    const result = await resolveCompanies({ dim: 'CAEN', q: '6201' })
    expect(transport.calls[0]?.variables).toEqual({ dim: 'CAEN', q: '6201', limit: undefined })
    expect('registryScope' in (transport.calls[0]?.variables ?? {})).toBe(false)
    expect(result).toMatchObject({ registry: null, scopeKey: null })
    expect(result.hits.map((hit) => [hit.revision, hit.key, hit.label, hit.labelSource])).toEqual([
      ['rev2', 'rev2:6201', 'Activități de realizare a soft-ului la comandă', 'current_db_catalog'],
      ['rev0', 'rev0:6201', 'Transporturi aeriene regulate', 'current_db_catalog'],
      ['rev3', 'rev3:6201', 'rev3:6201', null],
    ])
  })

  it('refuses a catalog answer that carries a registry: no ONRC provenance is claimed for a catalog label', async () => {
    transport.answer = () =>
      Promise.resolve({ companyResolveResult: { hits: [], degraded: false, ambiguous: false, registry: envelope(S1), scopeKey: S1 } })
    await expect(resolveCompanies({ dim: 'COUNTY', q: 'cluj' })).rejects.toThrow(/catalog with a registry scope/u)
  })
})

describe('resolveCompanies — the mock API answers the same contract', () => {
  /** What every accepted NAME answer is, whichever API gave it. */
  const scopedTo = (result: CompanyResolveResult, scopeKey: string) => {
    expect(result.scopeKey).toBe(scopeKey)
    expect(result.registry?.scopeKey).toBe(scopeKey)
    expect(result.ambiguous).toBe(result.hits.length > 1)
    for (const hit of result.hits) expect(hit).toMatchObject({ dim: 'NAME', revision: null, key: null })
  }

  it('answers NAME under its scope, refuses another, and answers the catalogs with none', async () => {
    mode.mock = true
    const scope = MOCK_REGISTRY_ENVELOPE.scopeKey
    const named = await resolveCompanies({ dim: 'NAME', q: 'srl', limit: 8, registryScope: scope })
    scopedTo(named, scope)
    expect(named.hits.length).toBeGreaterThan(0)
    for (const hit of named.hits) expect(['onrc_edition', 'core_organization']).toContain(hit.labelSource)
    // Zero hits are still scoped.
    scopedTo(await resolveCompanies({ dim: 'NAME', q: 'nicio firmă așa', registryScope: scope }), scope)
    await expect(resolveCompanies({ dim: 'NAME', q: 'srl', registryScope: S0 })).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
    const caen = await resolveCompanies({ dim: 'CAEN', q: '56' })
    expect(caen).toMatchObject({ registry: null, scopeKey: null, degraded: false })
    for (const hit of caen.hits) expect(hit.key).toBe(`${hit.revision ?? ''}:${hit.value}`)
    expect(transport.calls).toEqual([])

    // The live API, answering the same scoped request, satisfies the same checks.
    mode.mock = false
    transport.answer = answered({ hits: [nameHit('1', 'ALFA SRL', 'onrc_edition')], registry: envelope(S1), scopeKey: S1 })
    scopedTo(await resolveCompanies({ dim: 'NAME', q: 'srl', limit: 8, registryScope: S1 }), S1)
  })
})
