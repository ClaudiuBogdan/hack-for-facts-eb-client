import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentCommitteeDetail } from '@/schemas/parliament'

const useCommitteeMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentCommittee: (key: string) => useCommitteeMock(key),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as Record<string, unknown>)}>{children}</a>
  ),
}))

import { ParliamentCommitteeDetailPage } from './parliament-committee-detail-page'

const detail: ParliamentCommitteeDetail = {
  committeeKey: 'camera_deputatilor:buget|2024',
  chamber: 'camera_deputatilor',
  name: 'Comisia pentru buget',
  legislature: '2024',
  committeeType: 'permanenta',
  sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
  members: [
    {
      membershipKey: 'k1',
      member: { mandateKey: 'dep-001', fullName: 'Ana Nord', groupName: 'PSD' },
      role: 'presedinte',
      joinedDate: '2024-12-20',
      isBureau: true,
      sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
    },
    {
      // Unresolved roster row — NO member ref. Must render name-free, never a
      // fabricated placeholder.
      membershipKey: 'k2',
      role: 'membru',
      joinedDate: '2020-01-15',
      leftDate: '2024-12-01',
      sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
    },
  ],
  linkedBills: [],
  linkedBillsTotal: 0,
  meetingsCount: 12,
}

describe('ParliamentCommitteeDetailPage roster (codex MAJOR: no fabricated names)', () => {
  beforeEach(() => {
    useCommitteeMock.mockReset()
    useCommitteeMock.mockReturnValue({ data: detail, isLoading: false })
  })

  it('never renders a fabricated placeholder name for an unresolved roster row', () => {
    render(<ParliamentCommitteeDetailPage committeeKey="camera_deputatilor:buget|2024" />)
    expect(screen.queryByText('Membru (neasociat)')).not.toBeInTheDocument()
    // The resolved member still renders (and deep-links) — from the Conducere
    // band, which lifts the bureau out of the roster.
    expect(screen.getByText('Ana Nord')).toBeInTheDocument()

    // The rank-and-file sit in collapsed per-group panels now, so open the one
    // holding the unresolved row before asserting on its name slot.
    fireEvent.click(screen.getByRole('button', { name: /Neafiliat/ }))

    // The name-free slot exposes an accessible label instead of a made-up name.
    expect(
      screen.getByLabelText('Mandat neasociat unui profil'),
    ).toBeInTheDocument()
    // A footnote explains the unassociated mandates.
    expect(
      screen.getByText('Unele mandate nu sunt încă asociate unui profil.'),
    ).toBeInTheDocument()
  })

  it('omits the footnote when every roster row resolves to a member', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...detail, members: [detail.members[0]!] },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey="camera_deputatilor:buget|2024" />)
    expect(
      screen.queryByText('Unele mandate nu sunt încă asociate unui profil.'),
    ).not.toBeInTheDocument()
  })
})

/**
 * The empty state is a property of the PAYLOAD, not of the chamber.
 *
 * This page used to branch `isSenate ? <notice> : <bills>`, so every Senate
 * committee rendered "we don't have the bills yet" no matter what the server
 * sent. On live data that hid real rows: `senate:1d044a32-…` is served with
 * 24 linked bills and 2 meetings and still showed the notice.
 */
const senateBill = {
  billId: 'senat:123',
  number: 'L123/2026',
  title: 'Lege privind comunicațiile electronice',
  billType: 'parlamentar' as const,
  originatingChamber: 'senat' as const,
  currentLocation: 'senat' as const,
  currentStageLabel: 'La comisie',
  lastUpdatedAt: '2026-06-01',
  legislatureId: '2024',
}

const senateDetail: ParliamentCommitteeDetail = {
  ...detail,
  committeeKey: 'senate:1d044a32-1bad-4adf-925e-0abab63af58a',
  chamber: 'senat',
  name: 'Comisia pentru drepturile omului',
  // Every Senate committee carries no legislature — 191/191 on live data.
  legislature: undefined,
  sourceUrl: 'https://www.senat.ro/EnumComisii.aspx?Permanenta=1',
  linkedBills: [senateBill],
  linkedBillsTotal: 24,
  meetingsCount: 2,
}

const SENATE_EMPTY_NOTICE = /Pentru această comisie nu avem încă proiectele repartizate/

describe('ParliamentCommitteeDetailPage — Senate activity is served, not assumed absent', () => {
  beforeEach(() => {
    useCommitteeMock.mockReset()
  })

  it('renders a Senate committee’s linked bills instead of the "not published" notice', () => {
    useCommitteeMock.mockReturnValue({ data: senateDetail, isLoading: false })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('Proiecte de lege')).toBeInTheDocument()
    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
    expect(screen.queryByText(SENATE_EMPTY_NOTICE)).not.toBeInTheDocument()
  })

  it('shows the Senate counters when they are non-zero (a zero stays omitted)', () => {
    useCommitteeMock.mockReturnValue({ data: senateDetail, isLoading: false })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('proiecte repartizate')).toBeInTheDocument()
    expect(screen.getByText('ședințe')).toBeInTheDocument()
  })

  it('omits an AMBIGUOUS Senate zero rather than printing "0 ședințe" as a fact', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...senateDetail, linkedBills: [], linkedBillsTotal: 0, meetingsCount: 0 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.queryByText('proiecte repartizate')).not.toBeInTheDocument()
    expect(screen.queryByText('ședințe')).not.toBeInTheDocument()
    expect(screen.getByText(SENATE_EMPTY_NOTICE)).toBeInTheDocument()
  })

  it('names the missing meetings figure when a Senate committee HAS bills but no meetings', () => {
    // Otherwise the page shows bills, silently omits the meetings figure, and
    // says nothing — the absent-vs-zero ambiguity this change set out to remove.
    useCommitteeMock.mockReturnValue({
      data: { ...senateDetail, meetingsCount: 0 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
    expect(screen.queryByText('ședințe')).not.toBeInTheDocument()
    expect(
      screen.getByText('Numărul de ședințe pentru această comisie nu este încă disponibil.'),
    ).toBeInTheDocument()
  })

  it('renders the bills section for a CAMERA committee too (the restructured branch)', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...detail, linkedBills: [senateBill], linkedBillsTotal: 3 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    expect(screen.getByText('Proiecte de lege')).toBeInTheDocument()
    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
    // No Senate-only notice may leak onto a Camera page.
    expect(screen.queryByText(SENATE_EMPTY_NOTICE)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Numărul de ședințe pentru această comisie nu este încă disponibil.'),
    ).not.toBeInTheDocument()
  })

  it('still prints a Camera zero — there a zero is a better-founded floor', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...detail, linkedBills: [], linkedBillsTotal: 0, meetingsCount: 0 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    expect(screen.getByText('proiecte repartizate')).toBeInTheDocument()
    expect(screen.getByText('ședințe')).toBeInTheDocument()
    // The Senate-only explanation must never appear on a Camera committee.
    expect(screen.queryByText(SENATE_EMPTY_NOTICE)).not.toBeInTheDocument()
  })
})
