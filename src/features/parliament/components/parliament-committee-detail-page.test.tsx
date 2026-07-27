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
