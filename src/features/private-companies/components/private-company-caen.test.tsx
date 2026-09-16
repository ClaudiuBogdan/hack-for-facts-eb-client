import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { danteInternationalProfile } from '../mocks/fixtures'
import { PrivateCompanyActivitySection } from './sections/private-company-activity-section'
import { PrivateCompanySummaryHighlights } from './private-company-summary-highlights'

const profile: PrivateCompanyProfile = {
  ...danteInternationalProfile,
  fiscal: {
    ...danteInternationalProfile.fiscal,
    fiscalCaen: { code: '6210', rev: null },
  },
  caenActivities: [
    { code: '0111', rev: 'rev2', label: 'Growing cereals', source: 'onrc' },
    {
      code: '6210',
      rev: 'rev3',
      label: 'Software development',
      source: 'onrc',
    },
  ],
}
afterEach(cleanup)

describe('CAEN provenance in company UI', () => {
  it('shows a shared code once, with each source and its own revision', () => {
    render(<PrivateCompanyActivitySection profile={profile} variant="tab" />)
    expect(screen.getAllByText('6210')).toHaveLength(1)
    const activity = screen.getByText('6210').closest('li')
    expect(activity).toHaveTextContent('ONRC · rev3 — Software development')
    expect(activity).toHaveTextContent('ANAF · Revision not supplied')
    expect(activity).not.toHaveTextContent('rev2')
    const anafObservation = screen.getByText('ANAF').parentElement
    expect(anafObservation).not.toHaveTextContent('rev3')
    expect(anafObservation).not.toHaveTextContent('Software development')
    expect(
      screen.queryByText(/matches an authorized ONRC activity/),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/do not exactly match/)).not.toBeInTheDocument()
    expect(screen.getByText('0111')).toBeInTheDocument()
  })
  it('does not select an arbitrary authorization as the summary headline when revision is unknown', () => {
    render(
      <PrivateCompanySummaryHighlights
        profile={profile}
        onTabChange={() => undefined}
      />,
    )
    expect(screen.getByText('Fiscal CAEN from ANAF')).toBeInTheDocument()
    expect(screen.queryByText('Growing cereals')).not.toBeInTheDocument()
    expect(screen.queryByText('Software development')).not.toBeInTheDocument()
  })
  it('deduplicates repeated source rows and the fiscal representation', () => {
    const known: PrivateCompanyProfile = {
      ...profile,
      fiscal: { ...profile.fiscal, fiscalCaen: { code: '6210', rev: 'rev3' } },
      caenActivities: [
        {
          code: '6210',
          rev: 'rev3',
          label: 'Software development',
          source: 'onrc',
        },
        {
          code: '6210',
          rev: 'rev3',
          label: 'Software development',
          source: 'onrc',
        },
        {
          code: '6210',
          rev: 'rev3',
          label: 'Software development',
          source: 'anaf',
        },
      ],
    }
    render(<PrivateCompanyActivitySection profile={known} variant="tab" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getAllByText('6210')).toHaveLength(1)
    expect(screen.getAllByText('ONRC')).toHaveLength(1)
    expect(screen.getAllByText('ANAF')).toHaveLength(1)
    expect(screen.queryByText(/matches an authorized/)).not.toBeInTheDocument()
  })
  it('keeps conflicting revisions and descriptions attached to their sources under one code', () => {
    const conflict: PrivateCompanyProfile = {
      ...profile,
      fiscal: { ...profile.fiscal, fiscalCaen: { code: '6210', rev: 'rev1' } },
      caenActivities: [
        {
          code: '6210',
          rev: 'rev3',
          label: 'Software development',
          source: 'onrc',
        },
        {
          code: '6210',
          rev: 'rev1',
          label: 'Scheduled air transport',
          source: 'anaf',
        },
        {
          code: '6210',
          rev: 'rev1',
          label: 'Another recorded description',
          source: 'onrc',
        },
      ],
    }
    render(<PrivateCompanyActivitySection profile={conflict} variant="tab" />)
    expect(screen.getAllByText('6210')).toHaveLength(1)
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'ONRC · rev3 — Software development',
    )
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'ANAF · rev1 — Scheduled air transport',
    )
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'ONRC · rev1 — Another recorded description',
    )
  })
  it('shows ANAF-only and ONRC-only codes once without inventing another source', () => {
    render(
      <PrivateCompanyActivitySection
        profile={{ ...profile, caenActivities: [profile.caenActivities[0]] }}
        variant="tab"
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('0111').closest('li')).not.toHaveTextContent('ANAF')
    expect(screen.getByText('6210').closest('li')).not.toHaveTextContent('ONRC')
    expect(screen.getAllByText('6210')).toHaveLength(1)
  })
  it('retains an ANAF activity if the separate fiscal field is unavailable', () => {
    render(
      <PrivateCompanyActivitySection
        profile={{
          ...profile,
          fiscal: { ...profile.fiscal, fiscalCaen: null },
          caenActivities: [
            { code: '0111', rev: null, label: null, source: 'anaf' },
          ],
        }}
        variant="tab"
      />,
    )
    expect(screen.getByRole('listitem')).toHaveTextContent(
      '0111ANAF · Revision not supplied',
    )
    expect(screen.queryByText('ONRC')).not.toBeInTheDocument()
  })
  it('shows an empty state only when neither source has a code', () => {
    render(
      <PrivateCompanyActivitySection
        profile={{
          ...profile,
          fiscal: { ...profile.fiscal, fiscalCaen: null },
          caenActivities: [],
        }}
        variant="tab"
      />,
    )
    expect(screen.getByText('No activity codes')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
