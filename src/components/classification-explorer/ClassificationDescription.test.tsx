import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, createTestQueryClient } from '@/test/test-utils'
import { ClassificationDescription } from './ClassificationDescription'
import { loadClassificationDescription } from '@/lib/description-loader'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/utils', () => ({
  getUserLocale: () => 'ro',
}))

vi.mock('@/lib/description-loader', () => ({
  loadClassificationDescription: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('ClassificationDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders relative classification links as internal app routes', async () => {
    vi.mocked(loadClassificationDescription).mockResolvedValue(`
- [**03.01**](03.01)
- [capitolul 04](04)
    `)

    render(<ClassificationDescription type="functional" code="03" />, {
      queryClient: createTestQueryClient(),
    })

    const childLink = await screen.findByRole('link', { name: '03.01' })
    const siblingLink = screen.getByRole('link', { name: 'capitolul 04' })

    expect(childLink).toHaveAttribute('href', '/classifications/functional/03.01')
    expect(siblingLink).toHaveAttribute('href', '/classifications/functional/04')
  })

  it('keeps safe external links and blocks unsafe schemes', async () => {
    vi.mocked(loadClassificationDescription).mockResolvedValue(`
[Official docs](https://example.com)
[Bad link](javascript:alert(1))
    `)

    render(<ClassificationDescription type="economic" code="20" />, {
      queryClient: createTestQueryClient(),
    })

    const externalLink = await screen.findByRole('link', { name: 'Official docs' })

    expect(externalLink).toHaveAttribute('href', 'https://example.com')
    expect(externalLink).toHaveAttribute('target', '_blank')
    expect(screen.queryByRole('link', { name: 'Bad link' })).not.toBeInTheDocument()
    expect(screen.getByText('Bad link')).toBeInTheDocument()
  })
})
