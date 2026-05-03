import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PnrrTabNav } from './PnrrTabNav'

describe('PnrrTabNav', () => {
  it('exposes accessible tab names when labels are visually hidden on mobile', () => {
    render(<PnrrTabNav view="overview" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-label',
      'Overview',
    )
    expect(screen.getByRole('tab', { name: 'Projects' })).toHaveAttribute(
      'aria-label',
      'Projects',
    )
    expect(screen.getByRole('tab', { name: 'Map' })).toHaveAttribute(
      'aria-label',
      'Map',
    )
  })
})
