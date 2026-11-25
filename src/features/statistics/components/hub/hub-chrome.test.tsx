import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HubSectionHead } from './hub-chrome'

/** A band's head: its numbered caption over the title, or the title alone on a page that numbers no band. */

describe('HubSectionHead', () => {
  it('draws the numbered caption over the title, the title a step under it', () => {
    render(<HubSectionHead index="02 / Pe domenii" title="Titlul benzii" lede="O propoziție." />)
    expect(screen.getByText('02 / Pe domenii')).toHaveClass('font-mono')
    expect(screen.getByRole('heading', { level: 2, name: 'Titlul benzii' })).toHaveClass('mt-3')
    expect(screen.getByText('O propoziție.')).toBeInTheDocument()
  })

  it('starts on the title when the page gives no caption', () => {
    const { container } = render(<HubSectionHead title="Titlul benzii" lede="O propoziție." />)
    const title = screen.getByRole('heading', { level: 2, name: 'Titlul benzii' })
    // Nothing over the title, and no gap kept for what is not there.
    expect(title).not.toHaveClass('mt-3')
    expect(title.previousElementSibling).toBeNull()
    expect(container.querySelector('.font-mono')).toBeNull()
    expect(screen.getByText('O propoziție.')).toBeInTheDocument()
  })
})
