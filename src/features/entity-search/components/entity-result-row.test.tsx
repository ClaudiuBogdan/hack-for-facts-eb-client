import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { EntityResultRow } from './entity-result-row'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => <a href={to}>{children}</a>,
}))

const PLAIN: EntitySearchHit = {
  id: 'ngo_10860991_x', docType: 'organization_unclassified', title: 'Societatea Națională de Cruce Roșie din România, Filiala Cluj',
  href: '', isExternal: false, identifiers: ['10860991'], countyName: 'Cluj', subtitle: null, snippet: null,
  roles: ['organization_unclassified'], isActive: true, docId: null, docKey: '10860991', url: null, score: null,
}

const renderRow = (hit: EntitySearchHit) =>
  render(
    <ul role="listbox">
      <EntityResultRow hit={hit} id="row" active={false} rowRef={() => undefined} actionRef={() => undefined} />
    </ul>,
  )

describe('a search-page row for an organisation outside the NGO registry', () => {
  it('names it an organisation, shows its CUI and county, and says why it opens nothing', () => {
    renderRow(PLAIN)
    const row = screen.getByRole('option')
    expect(row).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(row).toHaveTextContent('Organizație')
    expect(row).toHaveTextContent('CUI 10860991')
    expect(row).toHaveTextContent('Cluj')
    expect(row).toHaveTextContent('fără profil pe platformă')
  })
})
