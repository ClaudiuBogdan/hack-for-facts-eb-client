import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SearchResultItem } from './SearchResultItems'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search: _search, ...props }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
}))

describe('SearchResultItem', () => {
  it('uses the preferred route for non-county UAT search results', () => {
    render(
      <ul>
        <SearchResultItem
          id="entity-result-1"
          entity={{
            cui: '4305857',
            name: 'Cluj-Napoca',
            entity_type: 'admin_municipality',
            is_uat: true,
          }}
          isActive={false}
          selectionBehavior="navigate-to-preferred-entity"
          onClick={vi.fn()}
        />
      </ul>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/primarie/4305857')
  })

  it('keeps the entity page route for direct entity navigation', () => {
    render(
      <ul>
        <SearchResultItem
          id="entity-result-2"
          entity={{
            cui: '4305857',
            name: 'Cluj-Napoca',
            entity_type: 'admin_municipality',
            is_uat: true,
          }}
          isActive={false}
          selectionBehavior="navigate-to-entity"
          onClick={vi.fn()}
        />
      </ul>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/entities/4305857')
  })
})
