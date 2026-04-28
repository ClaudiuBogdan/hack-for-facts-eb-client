import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { QuickEntityAccess } from './QuickEntityAccess'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/useRecentEntities', () => ({
  useRecentEntities: () => ({
    recentEntities: [
      {
        cui: '4305857',
        name: 'Municipiul Cluj-Napoca',
        entity_type: 'admin_municipality',
        is_uat: true,
      },
      {
        cui: '4266456',
        name: 'Ministerul Sănătății',
        is_uat: false,
      },
    ],
  }),
}))

vi.mock('@/lib/constants/predefined-entities', () => ({
  PREDEFINED_ENTITIES: [],
}))

describe('QuickEntityAccess', () => {
  it('routes recent badges to entities for UATs and regular entities', () => {
    render(<QuickEntityAccess />)

    const links = screen.getAllByRole('link')

    expect(links[0]).toHaveAttribute('href', '/entities/4305857')
    expect(links[1]).toHaveAttribute('href', '/entities/4266456')
  })
})
