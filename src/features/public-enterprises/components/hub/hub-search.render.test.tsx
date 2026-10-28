import type { ReactNode } from 'react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils'
import type { EntitySearchHit, EntitySearchResult } from '@/schemas/entity-search'
import { EnterpriseSearch } from './hub-search'

/**
 * The hub's search rendered through the real field and hook, with only the
 * router and the API replaced: the request it sends and where its rows lead
 * (PC-AUDIT-02).
 */

const navigate = vi.fn()
const searchEntities = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigate,
  useSearch: () => ({}),
  useLocation: () => ({ hash: '' }),
}))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({
  searchEntitiesLive: (...args: readonly unknown[]) => searchEntities(...args),
}))
vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: { EntitySearchPerformed: 'entity_search_performed', EntitySearchSelected: 'entity_search_selected' },
    capture: vi.fn(),
  },
}))

/** ADPB: a current enterprise indexed as the public institution it also is. */
const ADPB: EntitySearchHit = {
  id: 'organization:10020943', title: 'ADMINISTRAREA DOMENIULUI PUBLIC BUCURESTI (A.D.P.B.) SA', docType: 'organization',
  href: '/entities/10020943', isExternal: false, identifiers: ['10020943'],
  countyName: 'București', subtitle: null, snippet: null, roles: ['company', 'organization', 'public_enterprise'],
  isActive: true, docId: null, docKey: '10020943', url: null, score: null,
}
/** Hidroelectrica: indexed as an enterprise, found before this change too. */
const HIDRO: EntitySearchHit = {
  ...ADPB, id: 'public_enterprise:13267213', docType: 'public_enterprise',
  title: 'SOCIETATEA DE PRODUCERE A ENERGIEI ELECTRICE IN HIDROCENTRALE HIDROELECTRICA S.A.',
  href: '/public-enterprises/13267213', identifiers: ['13267213'], docKey: '13267213', roles: ['company', 'pnrr_entity', 'public_enterprise'],
}
/** An institution playing no enterprise role: the role filter keeps it out, and if it came it would keep its page. */
const CLUJ: EntitySearchHit = {
  ...ADPB, id: 'organization:4305857', title: 'Municipiul Cluj-Napoca', href: '/entities/4305857',
  identifiers: ['4305857'], docKey: '4305857', roles: ['organization'], countyName: 'Cluj',
}

const response = (hits: readonly EntitySearchHit[]): EntitySearchResult => ({
  query: 'q', engine: 'meili', degraded: false, estimatedTotalHits: hits.length, facets: [], hits,
  generation: { generationId: 'entities_build_1759593600000_k3x9q2', registryScopeKey: 'onrc:published:41:3:7' },
  companyScope: 'onrc:published:41:3:7',
  companyContribution: 'CURRENT',
  companyContributionReason: null,
  continuation: { candidatesReturned: hits.length, nextOffset: null },
})

async function typeAndWait(term: string) {
  const user = userEvent.setup()
  const input = screen.getByRole('combobox')
  await user.click(input)
  await user.type(input, term)
  await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))
  // The field the hub server-renders hands over to the combobox once its code is in: a new node.
  return screen.getByRole('combobox')
}

describe('the hub’s search, end to end', () => {
  beforeEach(() => {
    navigate.mockReset()
    searchEntities.mockReset()
  })

  it('asks for enterprises by role and opens one indexed as an institution on its enterprise page', async () => {
    searchEntities.mockResolvedValue(response([ADPB]))
    render(<EnterpriseSearch />, { queryClient: createTestQueryClient() })
    const input = await typeAndWait('10020943')
    expect(searchEntities).toHaveBeenLastCalledWith(
      { q: '10020943', docTypes: ['public_enterprise', 'organization'], roles: ['public_enterprise'], limit: 8 },
      expect.any(AbortSignal),
    )
    expect(screen.getByRole('option')).toHaveAttribute('href', '/public-enterprises/10020943')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(navigate).toHaveBeenCalledWith({ to: '/public-enterprises/10020943' })
  })

  it('keeps enterprise hits on their pages and an institution without the role on its own', async () => {
    searchEntities.mockResolvedValue(response([HIDRO, ADPB, CLUJ]))
    render(<EnterpriseSearch />, { queryClient: createTestQueryClient() })
    await typeAndWait('administrarea')
    expect(screen.getAllByRole('option').map((row) => row.getAttribute('href'))).toEqual([
      '/public-enterprises/13267213', '/public-enterprises/10020943', '/entities/4305857',
    ])
  })
})
