import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PnrrTabNav } from './PnrrTabNav'

describe('PnrrTabNav', () => {
  it('exposes accessible tab names when labels are visually hidden on mobile', () => {
    render(<PnrrTabNav view="overview" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Prezentare generală' })).toHaveAttribute(
      'aria-label',
      'Prezentare generală'
    )
    expect(screen.getByRole('tab', { name: 'Proiecte' })).toHaveAttribute(
      'aria-label',
      'Proiecte'
    )
    expect(screen.getByRole('tab', { name: 'Hartă' })).toHaveAttribute(
      'aria-label',
      'Hartă'
    )
  })
})
