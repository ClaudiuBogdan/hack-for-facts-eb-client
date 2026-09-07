import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { defaultMapFilters } from '@/schemas/map-filters'
import { FloatingQuickNav } from './FloatingQuickNav'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-router')>(),
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useUatLabel: () => new Map(),
  useEntityLabel: () => new Map(),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ isSignedIn: false }) }))
vi.mock('@/components/entities/FloatingEntitySearch', () => ({ FloatingEntitySearch: () => null }))

describe('entity table navigation preserves selected institutions', () => {
  beforeEach(() => navigate.mockClear())

  it.each([
    { is_territorial_executive: true },
    { is_uat: true },
    { is_uat: false },
    { county_codes: ['CJ'] },
    { entity_types: ['admin_county_council'] },
  ])('keeps filter %j in both map geometries', (selection) => {
    for (const mapViewType of ['UAT', 'County'] as const) {
      const filter = { ...defaultMapFilters, is_territorial_executive: undefined, ...selection }
      const { unmount } = render(<FloatingQuickNav mapViewType={mapViewType} tableActive filterInput={filter} />)
      fireEvent.click(screen.getByRole('button', { name: 'Go to Entity Table' }))
      expect(navigate).toHaveBeenLastCalledWith({
        to: '/entity-analytics',
        search: {
          view: 'table', sortOrder: 'desc', page: 1, pageSize: 25,
          filter: { ...filter, currency: undefined, inflation_adjusted: undefined },
        },
      })
      unmount()
    }
  })
})
