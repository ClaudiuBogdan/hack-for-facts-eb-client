import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { LEGAL_ACT_STATUSES } from '@/schemas/legal-search'
import { LegalStatusBadge } from './legal-status-badge'

describe('LegalStatusBadge', () => {
  it('writes the status name and hides the shape from assistive technology', () => {
    const { container } = render(<LegalStatusBadge status="abrogat-partial" />)
    expect(screen.getByText('Abrogat parțial')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('names every status in words, so none is told by its shape or colour alone', () => {
    for (const status of LEGAL_ACT_STATUSES) {
      const { container, unmount } = render(<LegalStatusBadge status={status} />)
      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0)
      expect(container.querySelectorAll('svg')).toHaveLength(1)
      unmount()
    }
  })

  it('draws nothing when the status is not known to the server', () => {
    const { container } = render(<LegalStatusBadge status={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is a size up on the act page', () => {
    render(<LegalStatusBadge status="abrogat" strong />)
    expect(screen.getByText('Abrogat')).toHaveClass('text-base', 'font-semibold')
  })
})
