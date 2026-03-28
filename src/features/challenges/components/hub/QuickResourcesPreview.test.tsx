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

vi.mock('@/features/campaigns/buget/hooks/use-campaign-content', () => ({
  getCampaignResources: () => [
    {
      id: 'ghid-bugete-locale-1',
      kind: 'guide',
      title: { ro: 'Partea I: Ce sunt bugetele publice locale?', en: 'Part I: What are local public budgets?' },
      url: 'https://funky.ong/partea-i-ghid-despre-bugetele-locale/',
    },
    {
      id: 'model-cerere-dezbatere',
      kind: 'template',
      title: { ro: 'Model cerere dezbatere', en: 'Template debate request' },
      url: 'https://docs.google.com/document/d/example',
    },
    {
      id: 'tutorial-utilizare-platforma',
      kind: 'tutorial',
      title: { ro: 'Tutorial utilizare transparenta.eu', en: 'Transparenta.eu usage tutorial' },
      url: 'https://funky.ong/toate-analizele-cmtrfb/#ghiduri',
    },
  ],
  getCampaignText: (value: { ro: string; en: string }, locale: 'ro' | 'en') =>
    locale === 'en' ? value.en : value.ro,
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

  it('shows only the tutorial as an external resource link', () => {
    render(<QuickResourcesPreview locale="ro" entityCui="12345678" />)

    expect(screen.getByText('Tutorial utilizare transparenta.eu')).toBeInTheDocument()

    // Consolidated resources should not appear as individual items
    expect(screen.queryByText('Partea I: Ce sunt bugetele publice locale?')).not.toBeInTheDocument()
    expect(screen.queryByText('Model cerere dezbatere')).not.toBeInTheDocument()
  })

  it('hides entity-specific links when no entity is available', () => {
    render(<QuickResourcesPreview locale="ro" />)

    expect(screen.queryByText('My city hall')).not.toBeInTheDocument()
    expect(screen.queryByText('Send debate request')).not.toBeInTheDocument()
    expect(screen.queryByText('Guides & templates')).not.toBeInTheDocument()

    // Tutorial should still render
    expect(screen.getByText('Tutorial utilizare transparenta.eu')).toBeInTheDocument()
  })
})
