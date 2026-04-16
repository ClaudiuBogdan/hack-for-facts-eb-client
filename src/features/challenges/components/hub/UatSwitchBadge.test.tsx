import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UatSwitchBadge } from './UatSwitchBadge'

const mockGetEntityLabels = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, title, className, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} title={title} className={className} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({
    pathname: '/primarie/4305857/buget',
    searchStr: '',
    search: {},
  }),
  useSearch: () => ({}),
}))

vi.mock('@/lib/api/labels', () => ({
  getEntityLabels: (...args: unknown[]) => mockGetEntityLabels(...args),
}))

vi.mock('@/features/campaigns/buget/utils/entity-selector-navigation', () => ({
  buildEntitySwitchRedirectUri: () => '/primarie/__CUI__/buget',
  buildSelectorSearchState: () => ({}),
}))

vi.mock('../../constants', () => ({
  CHALLENGE_SELECTED_ENTITY_PICKER_PATH: '/primarie',
}))

describe('UatSwitchBadge', () => {
  beforeEach(() => {
    mockGetEntityLabels.mockReset()
    mockGetEntityLabels.mockResolvedValue([
      { id: '4305857', label: 'MUNICIPIUL CLUJ-NAPOCA' },
    ])
  })

  it('renders with the CUI as initial label', () => {
    render(<UatSwitchBadge entityCui="4305857" />)

    expect(screen.getByText('4305857')).toBeInTheDocument()
  })

  it('renders a link to the entity picker', () => {
    render(<UatSwitchBadge entityCui="4305857" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/primarie')
  })

  it('has an accessible title for the switch action', () => {
    render(<UatSwitchBadge entityCui="4305857" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('title', 'Switch city hall')
  })

  it('updates label after entity labels resolve', async () => {
    render(<UatSwitchBadge entityCui="4305857" />)

    const label = await screen.findByText('Municipiul Cluj-Napoca')
    expect(label).toBeInTheDocument()
  })
})
