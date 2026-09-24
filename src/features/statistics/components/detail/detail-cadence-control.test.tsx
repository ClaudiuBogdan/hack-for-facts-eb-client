import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import { DetailCadenceControl } from './detail-cadence-control'

describe('cadence control', () => {
  it('lists every cadence as a radio, disables the ones no chart can draw, and says why', () => {
    render(
      <DetailCadenceControl
        periodicities={['ANNUAL', 'MONTHLY', 'OTHER']}
        selected="MONTHLY"
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByRole('radio', { name: 'anual' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'lunar' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'altă periodicitate' })).toBeDisabled()
    expect(
      screen.getByText('Cadențele estompate nu se pot desena ca serie.'),
    ).toBeInTheDocument()
  })

  it('picks with one click and closes the surface it is in', async () => {
    const select = vi.fn()
    const picked = vi.fn()
    render(
      <DetailCadenceControl
        periodicities={['ANNUAL', 'MONTHLY']}
        selected="MONTHLY"
        onSelect={select}
        onPicked={picked}
      />,
    )
    expect(screen.queryByText(/estompate/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'anual' }))
    expect(select).toHaveBeenCalledWith('ANNUAL')
    expect(picked).toHaveBeenCalledTimes(1)
  })
})
