import { use, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { render, screen } from '@/test/test-utils'
import { NationalBudgetHomePage } from './national-budget-home-page'

// The page outside a router: links as anchors, the bare address.
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<object>()),
  Link: ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => <a className={className}>{children}</a>,
  getRouteApi: () => ({ useSearch: () => undefined }),
  useNavigate: () => () => Promise.resolve(),
}))

// A catalog that never arrives: everything that reads it waits.
const never = new Promise<never>(() => undefined)
vi.mock('@/features/national-budget/analytics/hooks/use-national-budget-analytics', async (original) => ({
  ...(await original<object>()),
  useNationalCatalog: () => use(never),
}))

describe('the national budget page before its catalog', () => {
  it('shows the head, the pinned bar and every section’s title, not a page-wide skeleton', () => {
    render(<NationalBudgetHomePage />)
    // Lingui is the suite's mock (src/test/mocks): the source text.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bugetul țării')
    expect(screen.getByRole('navigation', { name: 'Secțiunile paginii' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cifre-cheie' })).toBeInTheDocument()
    for (const title of ['De unde vin banii și pe ce se duc', 'Cât a cheltuit statul pe fiecare dintre noi', 'Prin ce bugete trec banii', 'Bugetul de stat, pe domenii și pe instituții', 'Deficitul, an de an', 'Mai departe']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    // The year menus and the numbers wait for their reads.
    expect(screen.queryByRole('button', { name: /^Anul:/u })).not.toBeInTheDocument()
  })
})
