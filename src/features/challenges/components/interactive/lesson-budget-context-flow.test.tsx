import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { BudgetContextMapControls } from './lesson-budget-context-flow'

vi.mock('@/hooks/useWindowSize', () => ({
  useWindowSize: () => ({
    width: 375,
    height: 812,
  }),
}))

vi.mock('@/features/advanced-map-analytics/components/map-analytics-workspace', () => ({
  MapAnalyticsWorkspace: () => <div>Mock map workspace</div>,
}))

describe('BudgetContextMapControls', () => {
  it('opens the responsive mobile controls and lets the learner switch map series', () => {
    const onSelect = vi.fn()

    render(
      <BudgetContextMapControls
        locale="ro"
        activeOptionId="lesson-expenses-per-capita"
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Schimbă harta/i }))

    expect(screen.getByRole('button', { name: /Venituri totale/i })).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Venituri totale/i }),
    )

    expect(onSelect).toHaveBeenCalledWith('lesson-income-total')
  })
})
