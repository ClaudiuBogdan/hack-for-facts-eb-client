import type { VoteChamber, VoteOutcome } from '@/schemas/parliament'
import {
  getFinalBillVoteVerdict,
  isFinalBillVote,
} from '../api/graphql/parliament-mappers'
import { getVoteChamberLabel } from '../lib/formatting'
import { foldText } from '../lib/text-fold'

/**
 * What a bill↔vote edge was FOR, in the bill's own procedure.
 *
 * Open vocabulary on purpose — `bill_vote_links.role` is a server-side string
 * and the platform adds kinds as it resolves more edges. An unrecognised role
 * costs a missing chip, never a wrong label: the reader sees the chamber and the
 * tally, which are always true, instead of a guess at what the vote was about.
 */
const VOTE_ROLE_LABEL: Readonly<Record<string, string>> = {
  final_adoption: 'Vot final',
  final_rejection: 'Vot final',
  amendment: 'Amendament',
  procedural: 'Vot procedural',
}

/**
 * What the chip says for each composed verdict — NEGATIVE READINGS ONLY.
 *
 * There is no „Adoptat" here and that is deliberate: a motion that carried on
 * the counts is not thereby adopted in law (cdep:33731 carried 164–60 and the
 * official page says the qualified majority was not reached). Where a motion
 * carried, the chip names the motion and stops.
 *
 * `rejection_failed` is spelled out rather than collapsed into a colour: the
 * chamber declined to throw the bill out, so neither „Adoptat" nor „Respins" is
 * true, and the tally beside it (58–206 on cdep:18797) reads as a rejection
 * unless the card says otherwise.
 */
const VERDICT_TEXT = {
  respins: 'Respins',
  rejection_failed: 'Respingerea nu a trecut',
} as const

const VERDICT_COLOR = {
  respins: '#9C051A',
  rejection_failed: '#505a5f',
} as const
const NEUTRAL_ROLE_COLOR = '#505a5f'

type Props = {
  /**
   * Omitted where the surface already states it — the vote-detail page names the
   * chamber in its breadcrumb AND its hero. Never pass a placeholder: half this
   * badge's purpose is that a Romanian bill gets a final vote in EACH chamber,
   * so a wrong chamber is worse than none.
   */
  readonly chamber?: VoteChamber
  readonly linkRole?: string
  /**
   * Whether the motion CARRIED. Required for the verdict: the role names what
   * was on the floor, not what happened to it.
   */
  readonly outcome: VoteOutcome
  /** The division's own subject — used to refuse a contradicted verdict. */
  readonly voteSubject?: string
}

/**
 * The one line that says WHICH VOTE THIS IS — chamber, kind, and (for a final
 * vote) what it decided.
 *
 * Without it a bill's divisions are indistinguishable: every related vote
 * carries the BILL's title, so PL-x 16828 showed two identical cards, both
 * green, one a 2019 procedural division in the Chamber and the other the
 * Senate's 2026 rejection — 101 votes cast FOR throwing the bill out, drawn in
 * the same green as an adoption.
 *
 * The verdict comes from the ROLE and never from the tally; see
 * `getFinalBillVoteVerdict` for why the tally answers a different question.
 */
export function BillVoteRoleBadge({
  chamber,
  linkRole,
  outcome,
  voteSubject,
}: Props) {
  // A contradicted role states nothing: keep the chamber, drop the claim.
  const contradicted = roleContradictsSubject(linkRole, voteSubject)
  const roleLabel = contradicted
    ? undefined
    : linkRole
      ? VOTE_ROLE_LABEL[linkRole]
      : undefined
  const verdict = contradicted
    ? undefined
    : getFinalBillVoteVerdict({ linkRole, outcome, voteSubject })
  const color = verdict ? VERDICT_COLOR[verdict] : NEUTRAL_ROLE_COLOR

  return (
    // Chamber first, chip last: the badge sits flush at the card footer's right
    // edge, so the coloured verdict lands on the edge rather than inside it.
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {chamber ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {getVoteChamberLabel(chamber)}
        </span>
      ) : null}
      {roleLabel ? (
        <span
          className="border-2 px-1.5 py-0.5 text-xs font-black uppercase leading-none tracking-wide"
          style={{ color, borderColor: color }}
        >
          {verdict ? `${roleLabel} · ${VERDICT_TEXT[verdict]}` : roleLabel}
        </span>
      ) : null}
    </div>
  )
}

/**
 * What a „Pentru" MEANT — but only when the ballot direction and the bill's fate
 * disagree, which is the one case a reader cannot resolve from the numbers.
 *
 * PL-x 16828 is the worked example: the Senate's final vote was 101 for, 1
 * against, and the bill was REJECTED. Both is not a contradiction — the motion
 * on the floor was the committees' report, and both committees had filed
 * NEGATIV six days earlier (senat.ro, 23 June 2026), so a „Pentru" was a vote to
 * throw the bill out. Without this line the card reads as 101 deputies backing a
 * bill that the same card calls rejected.
 *
 * A final rejection can also arrive the other way — the chamber votes on the
 * BILL and the bill loses — and then the numbers already say it (pentru <
 * împotrivă). Nothing is printed there, nor when a vote carried a bill it
 * adopted: an explanation of the obvious is noise.
 */
// The note is the badge's own vocabulary; a separate module would split one
// fact in two.
// eslint-disable-next-line react-refresh/only-export-components
export function getVoteTallySubjectNote(
  linkRole: string | undefined,
  outcome: VoteOutcome,
  voteSubject?: string,
): string | undefined {
  if (roleContradictsSubject(linkRole, voteSubject)) return undefined
  // Keyed on the MOTION, not the composed verdict. A failed adoption also ends
  // in „Respins", but there a „Pentru" was a vote FOR the bill exactly as the
  // reader assumes — nothing needs rescuing, and printing this line over it
  // would invert the meaning it exists to protect.
  if (linkRole === 'final_rejection' && outcome === 'adoptat') {
    return '„Pentru” = pentru respingerea proiectului'
  }
  return undefined
}

/**
 * Does the edge's role contradict what the division itself says it was?
 *
 * `bill_vote_links.role` is derived, and its derivation has been wrong: on 15
 * live links it read a rejection off a dossier row describing the OTHER
 * chamber's act, while the division's own subject said 'Vot final adoptare'.
 * cdep:18768 carried 184-0 FOR the bill and the role called it a rejection.
 *
 * The upstream derivation is being fixed, but this surface must not depend on
 * that landing first. Where the two disagree the card asserts NEITHER: it keeps
 * the chamber and the subject, which are the chamber's own words, and drops the
 * verdict chip and the ballot-direction note. Silence is the only honest output
 * when the two witnesses contradict each other.
 *
 * Both witnesses are read as MOTIONS, which is the only way the comparison is
 * meaningful: the role names what was put on the floor and so does the subject.
 * Comparing the subject against the composed verdict would fire on every one of
 * the 441 adoption motions that were voted down — where role and subject agree
 * perfectly and it is the tally that turned them into a rejection.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function roleContradictsSubject(
  linkRole: string | undefined,
  voteSubject: string | undefined,
): boolean {
  if (!isFinalBillVote({ linkRole }) || voteSubject === undefined) return false
  const folded = foldText(voteSubject)
  // Only a subject that states a final motion can contradict; anything else
  // (an amendment, an article, a document version) simply says nothing.
  const saysAdopted = /\badopta/.test(folded) && !/\brespinger|respins/.test(folded)
  const saysRejected = /\brespinger|\brespins/.test(folded)
  return (
    (linkRole === 'final_rejection' && saysAdopted) ||
    (linkRole === 'final_adoption' && saysRejected)
  )
}
