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

describe('a search-page row\'s activity', () => {
  it.each([
    [true, null],
    [false, 'Inactiv'],
    [null, 'activitate necunoscută'],
  ] as const)('says %s as %s, and unknown is never active or inactive', (isActive, label) => {
    renderRow({ ...PLAIN, isActive })
    const row = screen.getByRole('option')
    for (const other of ['Inactiv', 'activitate necunoscută']) {
      if (other === label) expect(row).toHaveTextContent(other)
      else expect(row).not.toHaveTextContent(other)
    }
  })
})

describe('a search-page row with a company part', () => {
  const COMPANY = {
    registryState: 'IN_EDITION', name: 'EXEMPLU SRL', nameSource: 'onrc_edition', legalForm: 'SRL',
    countyCode: 'CJ', countyName: 'Cluj', active: true, identifiers: ['J12/1/2020'],
  } as const

  it('shows a company document from its company fields, not its index text', () => {
    renderRow({
      ...PLAIN, docType: 'company', title: 'EXEMPLU SRL', subtitle: 'stale line', snippet: 'stale line',
      countyName: 'Cluj', identifiers: ['31234567'], href: '/companies/31234567', company: COMPANY,
    })
    const row = screen.getByRole('option')
    expect(row).toHaveTextContent('EXEMPLU SRL')
    expect(row).toHaveTextContent('SRL')
    expect(row).toHaveTextContent('Cluj')
    expect(row).toHaveTextContent('denumire din ediția ONRC publicată')
    expect(row).not.toHaveTextContent('stale line')
  })

  it('never passes an institution county off as the company\'s ONRC county', () => {
    renderRow({
      ...PLAIN, docType: 'organization', title: 'SPITALUL EXEMPLU', countyName: 'Sibiu',
      company: { ...COMPANY, name: 'SPITAL EXEMPLU SA', countyCode: null, countyName: null },
    })
    const row = screen.getByRole('option')
    expect(row).toHaveTextContent('SPITALUL EXEMPLU')
    expect(row).toHaveTextContent('județul instituției: Sibiu')
    expect(row).toHaveTextContent('Firmă: SPITAL EXEMPLU SA')
  })
})

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
