import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchChangesCount, fetchChangesPage, narrowKinds } from './changes.api'
import { CHANGE_KINDS } from './changes.model'

const mock = vi.mocked(graphqlQuery)
const query = () => String(mock.mock.calls[mock.mock.calls.length - 1][0])
const variables = () => mock.mock.calls[mock.mock.calls.length - 1][1] as Record<string, unknown>

const node = (overrides: Record<string, unknown> = {}) => ({
  eventId: '38613',
  eventKind: 'completare',
  effectiveDate: '2027-01-05',
  sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026', summary: { description: 'Legea reglementează pensiile private.' } },
  actId: '208259',
  displayCitation: 'Legea nr. 204/2006',
  status: 'ABROGAT_PARTIAL',
  ...overrides,
})
const page = (nodes: unknown[], pageInfo = { hasNextPage: false, endCursor: null as string | null }) => ({
  legalRecentChanges: { pageInfo, edges: nodes.map((n) => ({ node: n })) },
})

beforeEach(() => mock.mockReset())

describe('fetchChangesPage', () => {
  it('asks for the changing act description and sends the kinds as a list', async () => {
    mock.mockResolvedValueOnce(page([]))
    await fetchChangesPage({ kinds: ['modificare', 'completare'], until: '2026-11-28' }, { first: 20 })
    expect(query()).toMatch(/summary\s*\{\s*description\s*\}/)
    expect(query()).not.toContain('totalCount')
    expect(variables()).toEqual({ kinds: ['modificare', 'completare'], until: '2026-11-28', first: 20 })
  })

  it('drops the window when asking for undated events', async () => {
    mock.mockResolvedValueOnce(page([]))
    await fetchChangesPage({ kinds: ['abrogare-totala'], since: '2026-01-01', until: '2026-11-28', undatedOnly: true }, {})
    expect(variables()).not.toHaveProperty('since')
    expect(variables()).not.toHaveProperty('until')
    expect(variables()).toMatchObject({ undatedOnly: true })
  })

  it('maps a node, the status enum to the kebab vocabulary, no description to null', async () => {
    mock.mockResolvedValueOnce(page([node(), node({ eventId: '2', sourceAct: { actId: '9', displayCitation: 'Ordinul nr. 9/2026', summary: null } }), node({ eventId: '3', sourceAct: null })], { hasNextPage: true, endCursor: 'c1' }))
    const result = await fetchChangesPage({ kinds: ['completare'] }, {})
    expect(result.endCursor).toBe('c1')
    expect(result.items[0]).toEqual({
      eventId: '38613',
      eventKind: 'completare',
      effectiveDate: '2027-01-05',
      actId: '208259',
      displayCitation: 'Legea nr. 204/2006',
      status: 'abrogat-partial',
      sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026', description: 'Legea reglementează pensiile private.' },
    })
    expect(result.items[1].sourceAct?.description).toBeNull()
    expect(result.items[2].sourceAct).toBeNull()
  })

  it('reads an exhausted page as no next cursor', async () => {
    mock.mockResolvedValueOnce(page([node()], { hasNextPage: false, endCursor: 'stale' }))
    expect((await fetchChangesPage({ kinds: ['completare'] }, {})).endCursor).toBeNull()
  })
})

describe('fetchChangesCount', () => {
  it('reads the count, null when absent', async () => {
    mock.mockResolvedValueOnce({ legalRecentChanges: { totalCount: 52179 } })
    expect(await fetchChangesCount({ kinds: [...CHANGE_KINDS], until: '2026-11-28' })).toBe(52179)
    expect(query()).toContain('totalCount')
    mock.mockResolvedValueOnce({ legalRecentChanges: {} })
    expect(await fetchChangesCount({ kinds: ['promulgare'] })).toBeNull()
  })
})

describe('narrowKinds', () => {
  it('never sends an empty kinds list', () => {
    expect(narrowKinds(CHANGE_KINDS, [])).toEqual(CHANGE_KINDS)
    expect(narrowKinds(CHANGE_KINDS, ['promulgare'])).toEqual(CHANGE_KINDS)
    expect(narrowKinds(CHANGE_KINDS, ['modificare'])).toEqual(['modificare'])
  })
})
