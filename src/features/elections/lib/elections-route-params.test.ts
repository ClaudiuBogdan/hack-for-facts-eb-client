import { createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

/**
 * The elections pages address records by their opaque keys. These keys hold
 * colons, and may hold any other punctuation: through the router's own
 * encoding a key must come back to the page exactly as the API gave it.
 * The tree mirrors the three `/alegeri` paths.
 */
function electionsRouter() {
  const root = createRootRoute()
  const alegeri = createRoute({ getParentRoute: () => root, path: '/alegeri' })
  const edition = createRoute({ getParentRoute: () => alegeri, path: '$electionKey' })
  const contest = createRoute({ getParentRoute: () => alegeri, path: 'contest/$contestKey' })
  return createRouter({ routeTree: root.addChildren([alegeri.addChildren([edition, contest])]), history: createMemoryHistory({ initialEntries: ['/'] }) })
}

const KEYS = [
  'contest:bec-local-2024:mayor:source_constituency:8-19',
  'contest:bec-local-2024:local-council:source_constituency:9-37',
  'alegeri-pentru-autoritatile-administratiei-publice-locale-2014-t1',
  'a b+c',
  'a%20b',
  'ș,ț;Ă',
  'a?b#c&d=e',
  `it's "quoted"`,
  'bec/local/2024',
]

describe('a record key in the address', () => {
  it.each(KEYS)('comes back exactly from a contest’s address: %s', async (contestKey) => {
    const router = electionsRouter()
    await router.navigate({ to: '/alegeri/contest/$contestKey', params: { contestKey } } as never)
    const match = router.state.matches[router.state.matches.length - 1]
    expect(match?.routeId).toBe('/alegeri/contest/$contestKey')
    expect(match?.params).toEqual({ contestKey })
  })

  it.each(KEYS)('comes back exactly from an edition’s address: %s', async (electionKey) => {
    const router = electionsRouter()
    await router.navigate({ to: '/alegeri/$electionKey', params: { electionKey } } as never)
    const match = router.state.matches[router.state.matches.length - 1]
    expect(match?.routeId).toBe('/alegeri/$electionKey')
    expect(match?.params).toEqual({ electionKey })
  })

  it('is encoded as one path segment', () => {
    const router = electionsRouter()
    const location = router.buildLocation({ to: '/alegeri/contest/$contestKey', params: { contestKey: KEYS[0] } } as never)
    expect(location.pathname).toBe(`/alegeri/contest/${encodeURIComponent(KEYS[0] ?? '')}`)
  })
})
