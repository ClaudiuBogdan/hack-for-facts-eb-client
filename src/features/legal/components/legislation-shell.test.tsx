import type { ReactNode } from 'react'
import { render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { LegislationShell, type LegislationTab } from './legislation-shell'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const PAGES: ReadonlyArray<readonly [LegislationTab, string, string]> = [
  ['cauta', 'Caută în legislație', 'Caută'],
  ['acte', 'Actele', 'Acte'],
  ['analiza', 'Analiza legislației', 'Analiză'],
  ['modificari', 'Modificările', 'Modificări'],
  ['monitorul', 'Monitorul Oficial', 'Monitorul Oficial'],
  ['ghid', 'Ghidul legislației', 'Ghid'],
]

/** The slim head of the six pages other than the landing: back to it, the page's title, one pinned row. */
describe('LegislationShell', () => {
  it.each(PAGES)('names %s in the head and marks it in the pinned row', (tab, title, label) => {
    render(
      <LegislationShell activeTab={tab}>
        <p>conținut</p>
      </LegislationShell>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title)
    expect(screen.getByRole('link', { name: 'Legislație' })).toHaveAttribute('href', '/legislation')
    const nav = screen.getByRole('navigation', { name: 'Paginile legislației' })
    expect(within(nav).getAllByRole('link')).toHaveLength(6)
    expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1)
    expect(screen.getByText('conținut')).toBeInTheDocument()
  })

  it('keeps the source line, its date and the trust badge', () => {
    render(
      <LegislationShell activeTab="modificari" measuredAt="2026-09-25" dataStatus="mock">
        <p>conținut</p>
      </LegislationShell>,
    )
    expect(screen.getByText(/Portal Legislativ și Monitorul Oficial/)).toHaveTextContent(/date până la (25 septembrie 2026|September 25, 2026)/)
    expect(screen.getByText(/Date demonstrative \(mock\)|Demo data/)).toBeInTheDocument()
  })

  it('leaves the source line out when there is neither a date nor a status (the guide)', () => {
    render(
      <LegislationShell activeTab="ghid">
        <p>conținut</p>
      </LegislationShell>,
    )
    expect(screen.queryByText(/Portal Legislativ și Monitorul Oficial/)).not.toBeInTheDocument()
  })
})
