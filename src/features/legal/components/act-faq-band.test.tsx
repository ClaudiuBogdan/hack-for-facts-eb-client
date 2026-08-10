import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import type { LegalActDetail } from '@/schemas/legal'
import {
  legalActDetailFixture,
  legalActDetailRichFixture,
} from '../mocks/fixtures/legal-act-detail'
import { ActFaqBand } from './act-faq-band'

const withSummary = (
  act: LegalActDetail,
  patch: Partial<NonNullable<LegalActDetail['summary']>>,
): LegalActDetail =>
  ({
    ...act,
    summary: act.summary === null ? null : { ...act.summary, ...patch },
  }) as LegalActDetail

describe('ActFaqBand', () => {
  it('always answers status, citation and officiality — the data-free floor', () => {
    render(<ActFaqBand act={legalActDetailFixture} textServed />)

    expect(screen.getByText(/Mai este în vigoare/)).toBeInTheDocument()
    expect(screen.getByText(/Cum citez corect acest act\?/)).toBeInTheDocument()
    expect(
      screen.getByText(/Textul de pe această pagină este cel oficial\?/),
    ).toBeInTheDocument()
    // Not legal advice, said on the section itself.
    expect(screen.getByText(/nu consultanță juridică/i)).toBeInTheDocument()
  })

  it('suppresses the penalties question unless the summary asserted them', () => {
    render(
      <ActFaqBand
        act={withSummary(legalActDetailFixture, { penaltiesMentioned: false })}
        textServed
      />,
    )
    expect(screen.queryByText(/Prevede sancțiuni/)).toBeNull()
  })

  it('answers penalties and audiences from the AI summary, saying so', () => {
    const act = withSummary(legalActDetailRichFixture, {
      penaltiesMentioned: true,
      affectedAudiences: ['cetateni'],
    })
    render(<ActFaqBand act={act} textServed />)

    expect(screen.getByText(/Prevede sancțiuni sau amenzi\?/)).toBeInTheDocument()
    // Both AI-derived answers carry their provenance in the copy.
    expect(screen.getAllByText(/generat automat/).length).toBeGreaterThanOrEqual(1)
  })

  it('mentions the amendment caveat only when amendments exist', () => {
    render(
      <ActFaqBand
        act={{ ...legalActDetailFixture, amendedAfterPublication: 0 }}
        textServed={false}
      />,
    )
    expect(screen.queryByText(/a fost modificat/)).toBeNull()
    // And without a served text, the officiality answer must not claim one.
    expect(screen.queryByText(/reprodus caracter cu caracter/)).toBeNull()
  })
})
