import { describe, expect, it } from 'vitest'
import {
  PARLIAMENT_BILL_QUERY,
  PARLIAMENT_VOTE_QUERY,
} from '../api/graphql/parliament-queries'
import {
  hasExactStenogramRelationship,
  resolveStenogramContext,
} from './bill-vote-stenogram-context'

describe('the gate only opens on an exact stored relationship', () => {
  it('is shut for absent, null and empty relationships', () => {
    expect(hasExactStenogramRelationship(undefined)).toBe(false)
    expect(hasExactStenogramRelationship(null)).toBe(false)
    expect(hasExactStenogramRelationship([])).toBe(false)
    expect(resolveStenogramContext(undefined)).toEqual([])
  })

  it('opens for a server-stated edge and echoes WHY the records are linked', () => {
    const links = [
      {
        sessionKey: 'canon:cdep:9043',
        speechKey: 'canon:cdep:9043:718',
        relationshipKind: 'debated_in',
      },
    ]
    expect(hasExactStenogramRelationship(links)).toBe(true)
    expect(resolveStenogramContext(links)).toEqual(links)
  })

  it('drops a half-populated edge rather than linking on part of one', () => {
    expect(
      resolveStenogramContext([
        { sessionKey: 'canon:s1', speechKey: '', relationshipKind: 'debated_in' },
        { sessionKey: '', speechKey: 'canon:sp:1', relationshipKind: 'x' },
        { sessionKey: 'canon:s1', speechKey: 'canon:sp:1', relationshipKind: '' },
      ]),
    ).toEqual([])
  })
})

/**
 * A CONTRACT guard, not a style check.
 *
 * The bill and vote reads must not start selecting stenogram fields — and a UI
 * must not start rendering stenogram links — before the API actually exposes an
 * edge. If the server grows one, these assertions fail and force the wiring to
 * be done deliberately (with provenance), instead of a plausible-looking join
 * appearing by accident.
 */
describe('bill/vote reads request no stenogram fields today', () => {
  const STENOGRAM_FIELDS = [
    'stenogram',
    'sessionKey',
    'segmentKey',
    'speechKey',
    'agendaRef',
  ]

  it('the bill dossier query selects none of them', () => {
    for (const field of STENOGRAM_FIELDS) {
      expect(PARLIAMENT_BILL_QUERY).not.toContain(field)
    }
  })

  it('the vote detail query selects none of them', () => {
    for (const field of STENOGRAM_FIELDS) {
      expect(PARLIAMENT_VOTE_QUERY).not.toContain(field)
    }
  })

  it('never joins on agendaRef, which is a source locator and not a bill key', () => {
    // The SDL documents agendaRef as "Source-printed agenda reference in scope
    // (CDep section anchor / Senate agenda GUID)" — using it as a bill key
    // would manufacture a citation the institution never made.
    expect(PARLIAMENT_BILL_QUERY).not.toContain('agendaRef')
    expect(PARLIAMENT_VOTE_QUERY).not.toContain('agendaRef')
  })
})
