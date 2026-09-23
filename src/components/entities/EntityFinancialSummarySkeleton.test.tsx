import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EntityFinancialSummarySkeleton } from './EntityFinancialSummarySkeleton'
import { getEntityFinancialSummaryClassNames } from './entity-financial-frames'

const classList = (className: string) => className.split(' ')

describe.each(['default', 'compact-desktop'] as const)(
  'EntityFinancialSummarySkeleton (%s)',
  (density) => {
    it('renders three cards in the frames of the loaded summary', () => {
      const { container } = render(
        <EntityFinancialSummarySkeleton density={density} />,
      )
      const frames = getEntityFinancialSummaryClassNames(density)
      const grid = container.firstElementChild

      expect(grid).toHaveClass(...classList(frames.section))
      expect(grid?.children).toHaveLength(3)

      for (const card of Array.from(grid?.children ?? [])) {
        expect(card).toHaveClass(...classList(frames.card))
        expect(card.children[0]).toHaveClass(...classList(frames.header))
        expect(card.children[1]).toHaveClass(...classList(frames.content))
      }
    })
  },
)

describe('EntityFinancialSummarySkeleton', () => {
  it('uses the default density when none is given', () => {
    const { container } = render(<EntityFinancialSummarySkeleton />)

    expect(container.firstElementChild).toHaveClass(
      ...classList(getEntityFinancialSummaryClassNames('default').section),
    )
    expect(container.firstElementChild).not.toHaveClass('grid-cols-3')
  })
})
