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

  it('leaves out an empty note rather than drawing an empty line', () => {
    band([fact('a', null), fact('b')])
    expect(screen.queryByText('note a')).toBeNull()
    expect(screen.getByText('note b')).toBeInTheDocument()
  })
})
