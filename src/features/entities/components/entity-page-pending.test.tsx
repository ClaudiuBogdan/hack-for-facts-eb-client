import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EntityPagePending } from './entity-page-pending'

describe('EntityPagePending', () => {
  it('renders the analysis loading shell inside the page column', () => {
    render(<EntityPagePending />)

    const shell = screen.getByRole('status')

    expect(shell).toHaveAttribute('aria-label', expect.stringMatching(/Loading/i))
    expect(shell.parentElement).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-3xl',
      'px-4',
      'lg:px-10',
    )
  })
})
