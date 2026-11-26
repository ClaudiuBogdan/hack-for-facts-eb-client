import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import {
  legalActDetailFixture,
  legalActDetailV2Fixture,
  legalActDetailV2UnbridgedFixture,
} from '../mocks/fixtures/legal-act-detail'
import { ActDetailHeader } from './act-detail-header'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('ActDetailHeader — the legal_v2 bridge line', () => {
  it('says once, quietly, that status, links and summary come from the previous corpus', () => {
    render(<ActDetailHeader act={legalActDetailV2Fixture} />)
    expect(
      screen.getByText('Starea, legăturile și rezumatul provin din corpusul anterior.'),
    ).toBeInTheDocument()
    // on the act's own page the status is a size up and in full contrast
    expect(screen.getByText('În vigoare')).toHaveClass('text-base', 'font-semibold', 'text-foreground')
  })

  it('shows no status badge for an act the previous corpus does not hold, and says why', () => {
    render(<ActDetailHeader act={legalActDetailV2UnbridgedFixture} />)
    expect(screen.queryByText('Necunoscut')).not.toBeInTheDocument()
    expect(screen.queryByText('În vigoare')).not.toBeInTheDocument()
    expect(screen.getByText(/corpusul anterior nu îl conține/)).toBeInTheDocument()
  })

  it('says nothing about a bridge on the legacy source', () => {
    render(<ActDetailHeader act={legalActDetailFixture} />)
    expect(screen.queryByText(/corpusul anterior/)).not.toBeInTheDocument()
  })
})
