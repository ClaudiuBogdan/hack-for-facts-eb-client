import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'

import { EntityProfilePresentation } from './entity-profile-view.presentation'
import type { EntityProfileData } from './entity-profile-view.types'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

function createProfile(
  overrides: Partial<EntityProfileData> = {},
): EntityProfileData {
  return {
    institution_type: null,
    website_url: null,
    official_email: null,
    phone_primary: null,
    address_raw: null,
    address_locality: null,
    county_code: null,
    county_name: null,
    leader_name: null,
    leader_title: null,
    leader_party: null,
    scraped_at: '2026-03-26T10:00:00Z',
    extraction_confidence: 0.92,
    ...overrides,
  }
}

describe('EntityProfilePresentation', () => {
  it('renders the contact card when county is the only populated contact field', () => {
    render(
      <EntityProfilePresentation
        profile={createProfile({
          county_name: 'Cluj',
          county_code: 'CJ',
        })}
        isLoading={false}
        error={null}
        locale="en"
      />,
    )

    expect(screen.getByText('Contact information')).toBeInTheDocument()
    expect(screen.getByText('County')).toBeInTheDocument()
    expect(screen.getByText('Cluj (CJ)')).toBeInTheDocument()
  })

  it('renders only the county name when county code is missing', () => {
    render(
      <EntityProfilePresentation
        profile={createProfile({
          county_name: 'Cluj',
          county_code: null,
        })}
        isLoading={false}
        error={null}
        locale="en"
      />,
    )

    expect(screen.getByText('Cluj')).toBeInTheDocument()
    expect(screen.queryByText('Cluj (null)')).not.toBeInTheDocument()
    expect(screen.queryByText('Cluj (undefined)')).not.toBeInTheDocument()
  })
})
