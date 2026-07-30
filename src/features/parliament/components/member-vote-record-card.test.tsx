import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemberVoteRecordCard } from './member-vote-record-card'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/vot">{children}</a>
  ),
}))

const base = {
  voteId: 'senat:123',
  chamber: 'senat' as const,
  title: 'Vot de test',
  heldAt: '2026-06-10',
}

describe('MemberVoteRecordCard', () => {
  it('renders a source conflict without inventing a no-vote choice', () => {
    render(
      <MemberVoteRecordCard {...base} positionStatus="conflicting_choice" />,
    )

    expect(screen.getByText('Conflict în sursă')).toBeInTheDocument()
    expect(screen.queryByText('Fără vot')).not.toBeInTheDocument()
  })

  it('renders an unknown marker without inventing a no-vote choice', () => {
    render(<MemberVoteRecordCard {...base} positionStatus="unknown_marker" />)

    expect(screen.getByText('Poziție neclară')).toBeInTheDocument()
    expect(screen.queryByText('Fără vot')).not.toBeInTheDocument()
  })
})
