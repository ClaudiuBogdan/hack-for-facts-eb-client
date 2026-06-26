import { resolveConfidenceTier } from './resolve-confidence-tier'

describe('resolveConfidenceTier', () => {
  it('direct_cui + accepted → confirmed', () => {
    expect(
      resolveConfidenceTier({ basis: 'direct_cui', reviewStatus: 'accepted' }),
    ).toBe('confirmed')
  })

  it('direct_cui without reviewStatus → confirmed (fail-safe toward confirmed for CUI anchor)', () => {
    expect(resolveConfidenceTier({ basis: 'direct_cui' })).toBe('confirmed')
  })

  it('external_projection + accepted → confirmed', () => {
    expect(
      resolveConfidenceTier({
        basis: 'external_projection',
        reviewStatus: 'accepted',
      }),
    ).toBe('confirmed')
  })

  it('name_review with review case + confidence → candidate', () => {
    expect(
      resolveConfidenceTier({
        basis: 'name_review',
        reviewStatus: 'review_pending',
        confidence: 0.62,
        linkReviewCaseId: 'case-1',
      }),
    ).toBe('candidate')
  })

  it('name_review without a review-case id → unconfirmed', () => {
    expect(
      resolveConfidenceTier({
        basis: 'name_review',
        reviewStatus: 'review_pending',
        confidence: 0.62,
      }),
    ).toBe('unconfirmed')
  })

  it('name_review with review-case id but zero confidence → unconfirmed', () => {
    expect(
      resolveConfidenceTier({
        basis: 'name_review',
        reviewStatus: 'review_pending',
        confidence: 0,
        linkReviewCaseId: 'case-1',
      }),
    ).toBe('unconfirmed')
  })

  it('none basis with no case → unconfirmed', () => {
    expect(resolveConfidenceTier({ basis: 'none' })).toBe('unconfirmed')
  })

  it('rejected reviewStatus → rejected regardless of basis', () => {
    expect(
      resolveConfidenceTier({ basis: 'direct_cui', reviewStatus: 'rejected' }),
    ).toBe('rejected')
    expect(
      resolveConfidenceTier({ basis: 'name_review', reviewStatus: 'rejected' }),
    ).toBe('rejected')
  })

  it('unmatched reviewStatus → unconfirmed (no candidate)', () => {
    expect(
      resolveConfidenceTier({
        basis: 'name_review',
        reviewStatus: 'unmatched',
        linkReviewCaseId: 'case-1',
        confidence: 0.5,
      }),
    ).toBe('unconfirmed')
  })

  it('fails safe to unconfirmed for missing basis', () => {
    expect(
      resolveConfidenceTier({ basis: 'none' as const, reviewStatus: undefined }),
    ).toBe('unconfirmed')
  })
})
