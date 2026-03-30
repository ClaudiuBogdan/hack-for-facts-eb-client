import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { QuickResourcesPreview } from './QuickResourcesPreview'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const query = search ? new URLSearchParams(search).toString() : ''
    const href = typeof to === 'string'
      ? `${to}${query ? `?${query}` : ''}`
      : '#'

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

describe('QuickResourcesPreview', () => {
  it('shows the My city hall shortcut when an entity is available', () => {
    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByText('My city hall')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /My city hall/i }),
    ).toHaveAttribute('href', '/primarie/12345678')
    expect(
      screen.getByRole('link', { name: /My city hall/i }),
    ).toHaveAttribute('preload', 'intent')
  })

  it('shows the send debate request link with correct path', () => {
    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Send debate request/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/primarie/12345678/buget/provocari/civic-campaign/civic-monitor-and-request/04-debate-request'),
    )
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('section=trimite-cererea'),
    )
  })

  it('shows the guides & templates link pointing to the resources page', () => {
    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    const link = screen.getByRole('link', { name: /Guides & templates/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/primarie/12345678/buget/resurse')
  })

  it('renders nothing when no entity is available', () => {
    const { container } = render(<QuickResourcesPreview locale="ro" />)

    expect(container.innerHTML).toBe('')
  })
})
