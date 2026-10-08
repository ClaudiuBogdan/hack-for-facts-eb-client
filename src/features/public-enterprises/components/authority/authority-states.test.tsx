import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthorityPortfolioRouteNotFound } from './authority-states'

let cui: string | undefined
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ cui }),
  Link: ({ children, to, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly preload?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('the portfolio’s not-found page', () => {
  beforeEach(() => {
    cui = undefined
  })

  it('says no source puts an enterprise under the CUI, titles the tab with it, and offers only the way back', () => {
    cui = '99999999'
    render(<AuthorityPortfolioRouteNotFound />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nicio întreprindere publică sub această autoritate')
    expect(screen.getByText(/Nici lista ANAF, nici anunțurile de selecție AMEPIP nu pun vreo întreprindere publică sub CUI-ul 99999999/u)).toBeInTheDocument()
    expect(document.title).toBe('CUI 99999999 — Transparenta.eu')
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/public-enterprises', '/public-enterprises'])
  })

  it('says a path that is not a CUI names none', () => {
    cui = '04270740'
    render(<AuthorityPortfolioRouteNotFound />)
    expect(screen.getByText('Adresa nu numește un CUI.')).toBeInTheDocument()
  })
})
