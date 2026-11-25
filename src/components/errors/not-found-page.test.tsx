import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@/test/test-utils'
import { NotFoundPage } from './not-found-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/bugetul-national/2019/cheltuieli' }),
}))

describe('NotFoundPage', () => {
  it('names the address that led nowhere and the page character searching for it', () => {
    render(<NotFoundPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Fila asta lipsește din dosar' })).toBeInTheDocument()
    expect(screen.getByText('/bugetul-national/2019/cheltuieli').tagName).toBe('CODE')
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /caută cu o lupă/ })).toHaveAttribute('data-character', 'search')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers home, back, and the site’s main sections', () => {
    render(<NotFoundPage />)

    expect(screen.getByRole('link', { name: 'Mergi la prima pagină' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Înapoi' })).toBeInTheDocument()
    const sections = within(screen.getByRole('navigation', { name: 'Secțiunile site-ului' }))
    expect(sections.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/national-budget', '/achizitii', '/companies', '/legislation', '/map'])
  })
})
