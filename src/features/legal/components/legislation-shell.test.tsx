import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { LegislationShell, type LegislationTab } from './legislation-shell'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, activeOptions: _activeOptions, ...props }: { readonly children: ReactNode; readonly to: string; readonly activeOptions?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const PAGES: ReadonlyArray<readonly [LegislationTab, string, string, string]> = [
  ['cauta', 'Caută în legislație', 'Caută', '/legislation/search'],
  ['acte', 'Actele', 'Acte', '/legislation/acts'],
  ['analiza', 'Analiza legislației', 'Analiză', '/legislation/analytics'],
  ['modificari', 'Modificările', 'Modificări', '/legislation/changes'],
  ['monitorul', 'Monitorul Oficial', 'Monitorul Oficial', '/legislation/gazette'],
  ['ghid', 'Ghidul legislației', 'Ghid', '/legislation/guide'],
]

/** The slim head of the six pages other than the landing: back to it, the page's title, one pinned row. */
describe('LegislationShell', () => {
  it.each(PAGES)('names %s in the head and marks it in the pinned row', (tab, title, label, href) => {
    render(
      <LegislationShell activeTab={tab}>
        <p>conținut</p>
      </LegislationShell>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title)
    expect(screen.getByRole('link', { name: 'Legislație' })).toHaveAttribute('href', '/legislation')
    const nav = screen.getByRole('navigation', { name: 'Paginile legislației' })
    expect(within(nav).getAllByRole('link')).toHaveLength(6)
    const own = within(nav).getByRole('link', { name: label })
    expect(own).toHaveAttribute('href', href)
    expect(own).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1)
    expect(screen.getByText('conținut')).toBeInTheDocument()
    // the app shell holds the page's one main landmark
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
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

  it('names the sources with neither a date nor a status (the guide, a cold read of the acts)', () => {
    render(
      <LegislationShell activeTab="ghid">
        <p>conținut</p>
      </LegislationShell>,
    )
    expect(screen.getByText('Portal Legislativ și Monitorul Oficial')).toBeInTheDocument()
    expect(screen.queryByText(/date până la/)).not.toBeInTheDocument()
  })

  it('serves HTML whose parsed tree keeps the badge in the source row (no block inside a paragraph)', () => {
    const html = renderToString(
      <LegislationShell activeTab="cauta" measuredAt="2026-07-09" dataStatus="mock">
        <p>conținut</p>
      </LegislationShell>,
    )
    // the browser's HTML parser, as on a direct load: a <div> inside a <p> would close the paragraph before it
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html')
    const sources = [...doc.querySelectorAll('span')].find((span) => span.textContent?.startsWith('Portal Legislativ și Monitorul Oficial'))
    expect(sources).toBeDefined()
    const row = sources?.parentElement
    expect(row?.tagName).toBe('DIV')
    expect(row?.textContent).toMatch(/Date demonstrative \(mock\)|Demo data/)
    expect(doc.querySelector('header p div')).toBeNull()
  })
})
