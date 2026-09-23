import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { DetailEmptyState } from './detail-empty-state'

describe('DetailEmptyState', () => {
  it('undoes a frequency the matrix does not publish, which the rail cannot offer to change', async () => {
    const onSearchChange = vi.fn()
    render(<DetailEmptyState reason="cadence" yearWindow={null} observedSpan={null} onSearchChange={onSearchChange} />)
    expect(screen.getByText('Seria nu are observații la frecvența din adresă.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Arată frecvența publicată' }))
    expect(onSearchChange).toHaveBeenCalledWith({ frecventa: undefined })
  })

  it('shows the whole span when the address asks for years the series does not cover', async () => {
    const onSearchChange = vi.fn()
    render(
      <DetailEmptyState
        reason="window"
        yearWindow={{ from: 2030, to: 2031 }}
        observedSpan={{ from: 2000, to: 2024 }}
        onSearchChange={onSearchChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Arată tot intervalul' }))
    expect(onSearchChange).toHaveBeenCalledWith({ din: undefined, pana: undefined })
  })
})
