import { t } from '@lingui/core/macro'
import type {
  MemberVoteChoice,
  ParliamentMemberVoteRecord,
} from '@/schemas/parliament'

/**
 * How a SINGLE ballot is named — "Abținere", not "Abțineri". Shared by the
 * member cards and the grouped vote table so one member's position never reads
 * differently depending on which of the two the reader is looking at.
 */
export function memberChoiceLabel(choice: MemberVoteChoice): string {
  switch (choice) {
    case 'pentru':
      return t`Pentru`
    case 'impotriva':
      return t`Împotrivă`
    case 'abtinere':
      return t`Abținere`
    case 'nu_a_votat':
      return t`Fără vot`
  }
}

/**
 * How a COLUMN of ballots is named. Only `abtinere` differs from the singular —
 * a column head counts positions, so it is plural.
 */
export function voteKindColumnLabel(choice: MemberVoteChoice): string {
  return choice === 'abtinere' ? t`Abțineri` : memberChoiceLabel(choice)
}

/**
 * The position as the source recorded it, INCLUDING the two states that are not
 * a choice. A ballot with contradictory observations, or one the source marked
 * without a resolvable position, is never folded into "Fără vot" — that would
 * assert an absence the source never recorded.
 */
export function votePositionLabel(vote: ParliamentMemberVoteRecord): string {
  if (vote.positionStatus === 'conflicting_choice') return t`Conflict în sursă`
  if (
    vote.positionStatus === 'unknown_marker' ||
    vote.positionStatus === 'identity_conflict'
  ) {
    return t`Poziție neclară`
  }
  return vote.choice ? memberChoiceLabel(vote.choice) : t`Poziție neclară`
}

/** A ballot that lands in none of the four vote-kind columns. */
export function isUnattributedVote(vote: ParliamentMemberVoteRecord): boolean {
  return vote.choice === undefined
}
