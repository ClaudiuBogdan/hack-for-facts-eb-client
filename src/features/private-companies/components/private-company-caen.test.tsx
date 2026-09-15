import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { danteInternationalProfile } from '../mocks/fixtures'
import { PrivateCompanyActivitySection } from './sections/private-company-activity-section'
import { PrivateCompanySummaryHighlights } from './private-company-summary-highlights'

const profile: PrivateCompanyProfile = {
  ...danteInternationalProfile,
  fiscal: { ...danteInternationalProfile.fiscal, fiscalCaen: { code: '6210', rev: null } },
  caenActivities: [
    { code: '0111', rev: 'rev2', label: 'Growing cereals', source: 'onrc' },
    { code: '6210', rev: 'rev3', label: 'Software development', source: 'onrc' },
  ],
}
afterEach(cleanup)

describe('CAEN provenance in company UI', () => {
  it('shows unknown fiscal revision without asserting a match or a difference', () => {
    render(<PrivateCompanyActivitySection profile={profile} variant="tab" />)
    expect(screen.getByText(/Revision not supplied/)).toBeInTheDocument()
    expect(screen.getByText('ANAF does not supply the CAEN revision. Activity agreement cannot be confirmed.')).toBeInTheDocument()
    expect(screen.queryByText('Fiscal CAEN from ANAF matches an authorized ONRC activity.')).not.toBeInTheDocument()
  })
  it('does not select an arbitrary authorization as the headline when revision is unknown', () => {
    render(<PrivateCompanySummaryHighlights profile={profile} onTabChange={() => undefined} />)
    expect(screen.getByText('Fiscal CAEN from ANAF')).toBeInTheDocument()
    expect(screen.queryByText('Growing cereals')).not.toBeInTheDocument()
    expect(screen.queryByText('Software development')).not.toBeInTheDocument()
  })
  it('uses an explicitly matching revision and code', () => {
    const known = { ...profile, fiscal: { ...profile.fiscal, fiscalCaen: { code: '6210', rev: 'rev3' } } }
    render(<PrivateCompanyActivitySection profile={known} variant="tab" />)
    expect(screen.getByText('Fiscal CAEN from ANAF matches an authorized ONRC activity.')).toBeInTheDocument()
  })
})
