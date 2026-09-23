import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ENTITY_FINANCIAL_TRENDS_CARD_CLASS_NAME,
  getEntityFinancialSummaryClassNames,
} from '@/components/entities/entity-financial-frames'
import {
  CHALLENGE_ENTITY_ANALYSIS_ROOT_CLASS_NAME,
  CHALLENGE_ENTITY_EXPLAINER_CARD_CLASS_NAME,
  CHALLENGE_ENTITY_HERO_FRAME_CLASS_NAME,
  CHALLENGE_ENTITY_TREEMAP_CARD_CLASS_NAME,
  CHALLENGE_ENTITY_VIEW_SHORTCUTS_CLASS_NAME,
} from './challenge-entity-analysis-frames'
import { ChallengeEntityAnalysisLoadingShell } from './challenge-entity-analysis-loading-shell'

const classList = (className: string) => className.split(' ')

describe('ChallengeEntityAnalysisLoadingShell', () => {
  it('renders the loading status region', () => {
    render(<ChallengeEntityAnalysisLoadingShell />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('names and announces the loading state', () => {
    render(<ChallengeEntityAnalysisLoadingShell />)

    const shell = screen.getByRole('status')

    expect(shell).toHaveAttribute('aria-label', expect.stringMatching(/Loading/i))
    expect(shell).toHaveAttribute('aria-busy', 'true')
    expect(shell).toHaveTextContent(/Loading/i)
  })

  it('stacks the blocks of the loaded page in order, in their frames', () => {
    render(<ChallengeEntityAnalysisLoadingShell />)

    const shell = screen.getByRole('status')
    const blocks = Array.from(shell.children).filter(
      (block) => !block.classList.contains('sr-only'),
    )

    expect(shell).toHaveClass(...classList(CHALLENGE_ENTITY_ANALYSIS_ROOT_CLASS_NAME))

    // Hero header, explainer card, KPI grid, trends card, view shortcuts,
    // treemap card: the same blocks, in the same order, as the default view.
    expect(blocks).toHaveLength(6)
    expect(blocks[0]).toHaveClass(...classList(CHALLENGE_ENTITY_HERO_FRAME_CLASS_NAME))
    expect(blocks[1]).toHaveClass(...classList(CHALLENGE_ENTITY_EXPLAINER_CARD_CLASS_NAME))
    expect(blocks[2]).toHaveClass(
      ...classList(getEntityFinancialSummaryClassNames('compact-desktop').section),
    )
    expect(blocks[2]?.children).toHaveLength(3)
    expect(blocks[3]).toHaveClass(...classList(ENTITY_FINANCIAL_TRENDS_CARD_CLASS_NAME))
    expect(blocks[4]).toHaveClass(...classList(CHALLENGE_ENTITY_VIEW_SHORTCUTS_CLASS_NAME))
    expect(blocks[5]).toHaveClass(...classList(CHALLENGE_ENTITY_TREEMAP_CARD_CLASS_NAME))
  })
})
