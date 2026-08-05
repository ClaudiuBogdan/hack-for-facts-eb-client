/**
 * A group page pinned to one legislature showed a tenth of what the server
 * serves: the fetch layer hardcoded `{ legislature: LATEST_LEGISLATURE,
 * current: true }`, so PSD Camera's 924 mandates across seven legislatures read
 * as the 93 of 2024 (measured on Chronos 2026-08-05).
 *
 * The trap this file exists to hold down: `current` means "holds the seat
 * TODAY", so carrying it into a past term is not a narrower filter but an empty
 * one — `psd-camera_deputatilor` + 2016 + `current:true` returns 0 of 156 rows
 * against live prod. A picker that keeps the flag answers every historical
 * question with "this group held no seats".
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const graphqlQueryMock = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql/graphql-client')>(
    '@/lib/graphql/graphql-client',
  )
  return { ...actual, graphqlQuery: (...args: unknown[]) => graphqlQueryMock(...args) }
})

import { LATEST_LEGISLATURE } from './graphql/parliament-translate'
import { fetchParliamentGroupMembersLive, fetchParliamentGroupLive } from './parliament-api.live'

/** Variables of the Nth recorded call. */
const varsOf = (call: number): Record<string, unknown> =>
  graphqlQueryMock.mock.calls[call]?.[1] as Record<string, unknown>

describe('fetchParliamentGroupMembersLive — the current flag is term-dependent', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
    graphqlQueryMock.mockResolvedValue({ parliamentGroupMembers: [] })
  })

  it('asks for current seats ONLY on the sitting term', async () => {
    await fetchParliamentGroupMembersLive('psd-camera_deputatilor')
    expect(varsOf(0)).toMatchObject({
      groupId: 'psd-camera_deputatilor',
      legislature: LATEST_LEGISLATURE,
      current: true,
    })
  })

  it('DROPS current for a past term, or the roster comes back empty', async () => {
    await fetchParliamentGroupMembersLive('psd-camera_deputatilor', '2016')
    const vars = varsOf(0)
    expect(vars['legislature']).toBe('2016')
    expect('current' in vars).toBe(false)
  })

  it('carries the requested term through, not a default', async () => {
    await fetchParliamentGroupMembersLive('psd-camera_deputatilor', '2008')
    expect(varsOf(0)['legislature']).toBe('2008')
    expect('current' in varsOf(0)).toBe(false)
  })
})

describe('fetchParliamentGroupLive — per-term identity and cache keying', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('reads the group directory for the requested term', async () => {
    graphqlQueryMock.mockResolvedValue({
      parliamentGroups: [
        { groupId: 'psd-camera_deputatilor', chamber: 'camera_deputatilor', name: 'PSD', memberCount: 156 },
      ],
    })
    const group = await fetchParliamentGroupLive('psd-camera_deputatilor', '2016')
    // Both chambers are fetched explicitly (the no-chamber root returns a
    // party-level aggregate), so the term must appear on every call.
    for (const call of graphqlQueryMock.mock.calls) {
      expect((call[1] as Record<string, unknown>)['legislature']).toBe('2016')
    }
    expect(group?.memberCount).toBe(156)
  })

  it('returns null for a term the group did not sit in — a real answer, not a miss', async () => {
    graphqlQueryMock.mockResolvedValue({ parliamentGroups: [] })
    expect(await fetchParliamentGroupLive('psd-camera_deputatilor', '1992')).toBeNull()
  })

  it('does not serve one term from another term`s cache entry', async () => {
    // The cache was keyed on `current` alone. With a legislature axis that key
    // would have returned the 2024 directory for every year on the picker.
    graphqlQueryMock.mockImplementation((_q: unknown, vars: Record<string, unknown>) =>
      Promise.resolve({
        parliamentGroups: [
          {
            groupId: 'psd-camera_deputatilor',
            chamber: 'camera_deputatilor',
            name: 'PSD',
            memberCount: vars['legislature'] === '2012' ? 155 : 999,
          },
        ],
      }),
    )
    const a = await fetchParliamentGroupLive('psd-camera_deputatilor', '2012')
    const b = await fetchParliamentGroupLive('psd-camera_deputatilor', '2004')
    expect(a?.memberCount).toBe(155)
    expect(b?.memberCount).toBe(999)
  })
})
