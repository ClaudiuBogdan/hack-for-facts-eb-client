import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HubFiguresBand, type HubFact } from './hub-figures'

/** The figures band spreads fewer than four figures over the width, and leaves out a note it does not have. */

function fact(key: string, note: ReactNode = `note ${key}`): HubFact {
  return {
    key,
    value: 1,
    digits: 0,
    label: `label ${key}`,
    note,
    link: (label, className) => (
      <a href={`#${key}`} className={className}>
        {label}
      </a>
    ),
  }
}

function band(facts: readonly HubFact[]) {
  const { container } = render(<HubFiguresBand facts={facts} locale="ro" />)
  return container.querySelector('dl') as HTMLDListElement
}

describe('HubFiguresBand', () => {
  it('keeps four figures on the hubs’ two-then-four grid', () => {
    expect(band(['a', 'b', 'c', 'd'].map((key) => fact(key))).className).toContain('grid-cols-2 lg:grid-cols-4')
  })

  it('spreads one, two or three figures over the width', () => {
    expect(band([fact('a')]).className).toContain('grid-cols-1')
    expect(band([fact('a'), fact('b')]).className).toMatch(/(^|\s)grid-cols-2(\s|$)/u)
    expect(band([fact('a'), fact('b'), fact('c')]).className).toContain('lg:grid-cols-3')
  })

  it('sets labels and notes as mono capitals unless the page asks for plain text', () => {
    const { unmount } = render(<HubFiguresBand facts={[fact('a')]} locale="ro" />)
    expect(screen.getByText('note a')).toHaveClass('font-mono', 'uppercase')
    expect(screen.getByText('label a')).toHaveClass('font-mono', 'uppercase')
    unmount()

    render(<HubFiguresBand facts={[fact('a')]} locale="ro" plain />)
    for (const text of ['note a', 'label a']) {
      expect(screen.getByText(text)).not.toHaveClass('font-mono')
      expect(screen.getByText(text)).not.toHaveClass('uppercase')
    }
    expect(screen.getByText('note a')).toHaveClass('text-xs')
    expect(screen.getByText('label a')).toHaveClass('text-sm', 'font-medium')
  })

  it('draws the corner arrow only when asked, decorative, and only where the tile holds a link', () => {
    const { container, unmount } = render(<HubFiguresBand facts={[fact('a')]} locale="ro" />)
    expect(container.querySelector('svg')).toBeNull()
    unmount()

    const band = render(<HubFiguresBand facts={[fact('a')]} locale="ro" arrow />)
    const svg = band.container.querySelector('dt svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    // Hidden unless the tile has a link in it; then the landing's rule: hover or focus, always on touch.
    expect(svg).toHaveClass('hidden', 'group-has-[a]:block', 'opacity-0', 'group-hover:opacity-100', 'group-focus-within:opacity-100')
    // The tile's link keeps the label alone as its name.
    expect(screen.getByRole('link')).toHaveAccessibleName('label a')
  })

  it('leaves out an empty note rather than drawing an empty line', () => {
    band([fact('a', null), fact('b')])
    expect(screen.queryByText('note a')).toBeNull()
    expect(screen.getByText('note b')).toBeInTheDocument()
  })
})
