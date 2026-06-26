import type { NgoIdentityBasis, NgoReviewStatus } from '@/schemas/ngos'

export type ConfidenceTier = 'confirmed' | 'candidate' | 'unconfirmed' | 'rejected'

export type IdentityConfidenceInput = {
  readonly basis: NgoIdentityBasis
  readonly reviewStatus?: NgoReviewStatus
  readonly confidence?: number | null
  readonly linkReviewCaseId?: string | null
}

/**
 * Pure tier resolution for identity confidence. Fail-safe to `unconfirmed`:
 * never implies confirmation the data does not support. See
 * `docs/design/ngos/features/identity-confidence-communication.md`.
 *
 * - direct_cui + accepted → confirmed
 * - external_projection + accepted → confirmed (proiecție externă variant)
 * - name_review/none with a review-case id and confidence → candidate
 * - name_review/none without a usable case, or review_pending/unmatched → unconfirmed
 * - rejected → rejected
 */
export function resolveConfidenceTier(
  input: IdentityConfidenceInput,
): ConfidenceTier {
  const { basis, reviewStatus, confidence, linkReviewCaseId } = input

  if (reviewStatus === 'rejected') return 'rejected'

  if (basis === 'direct_cui') {
    return reviewStatus === 'accepted' || reviewStatus === undefined
      ? 'confirmed'
      : 'unconfirmed'
  }

  if (basis === 'external_projection') {
    return reviewStatus === 'accepted' || reviewStatus === undefined
      ? 'confirmed'
      : 'unconfirmed'
  }

  // basis === 'name_review' | 'none'
  if (
    linkReviewCaseId &&
    confidence != null &&
    confidence > 0 &&
    (reviewStatus === undefined ||
      reviewStatus === 'review_pending' ||
      reviewStatus === 'accepted')
  ) {
    return 'candidate'
  }

  return 'unconfirmed'
}

/** Returns true when the tier is in the confirmed family (incl. external projection). */
export function isConfirmedTier(tier: ConfidenceTier): boolean {
  return tier === 'confirmed'
}
