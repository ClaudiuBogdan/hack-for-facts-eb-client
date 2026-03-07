import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
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
      id: 'resource-1',
      kind: 'guide',
      title: {
        ro: 'Resursă',
        en: 'Resource',
      },
      url: 'https://example.com/resource',
    },
    {
      id: 'resource-2',
      kind: 'tutorial',
      title: {
        ro: 'Resursă 2',
        en: 'Resource 2',
      },
      url: 'https://example.com/resource-2',
    },
    {
      id: 'resource-3',
      kind: 'template',
      title: {
        ro: 'Resursă 3',
        en: 'Resource 3',
      },
      url: 'https://example.com/resource-3',
    },
    {
      id: 'resource-4',
      kind: 'reference',
      title: {
        ro: 'Resursă 4',
        en: 'Resource 4',
      },
      url: 'https://example.com/resource-4',
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
    ).toHaveAttribute('href', '/buget/12345678/primarie')
  })

  it('shows campaign resources without the entity shortcut when no entity is available', () => {
    render(<QuickResourcesPreview locale="ro" />)

    expect(screen.queryByText('My city hall')).not.toBeInTheDocument()
    expect(screen.getByText('Resursă')).toBeInTheDocument()
  })

  it('reveals the remaining resources inline when requested', async () => {
    render(<QuickResourcesPreview locale="ro" />)

    expect(screen.queryByText('Resursă 4')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /View all/i }))

    expect(screen.getByText('Resursă 4')).toBeInTheDocument()
  })
})
