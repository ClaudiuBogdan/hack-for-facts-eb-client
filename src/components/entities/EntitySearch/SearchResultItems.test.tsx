import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { SearchResultItem } from './SearchResultItems'

let currentSearchState: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const href = typeof to === 'string' ? to : '#'
    const resolvedSearch =
      typeof search === 'function' ? search(currentSearchState) : search
    const query = resolvedSearch
      ? new URLSearchParams(
          Object.entries(resolvedSearch).reduce<Record<string, string>>(
            (result, [key, value]) => {
              if (value !== undefined) {
                result[key] = String(value)
              }
              return result
            },
            {},
          ),
        ).toString()
      : ''
    return <a href={query ? `${href}?${query}` : href} {...props}>
      {children}
    </a>
  },
  useSearch: () => currentSearchState,
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

    expect(screen.getByRole('link')).toHaveAttribute('href', '/entities/4305857')
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

  it('preserves the current search state in the generated href', () => {
    currentSearchState = {
      view: 'main-info',
      lang: 'en',
      currency: 'EUR',
    }

    render(
      <ul>
        <SearchResultItem
          id="entity-result-3"
          entity={{
            cui: '4305857',
            name: 'Cluj-Napoca',
            entity_type: 'admin_municipality',
            is_uat: false,
          }}
          isActive={false}
          selectionBehavior="navigate-to-entity"
          onClick={vi.fn()}
        />
      </ul>,
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/entities/4305857?view=main-info&lang=en&currency=EUR',
    )
  })
})
