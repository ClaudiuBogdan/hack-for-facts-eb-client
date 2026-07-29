import type { VoteChamber, VoteOutcome } from '@/schemas/parliament'
import { getFinalBillVoteVerdict } from '../api/graphql/parliament-mappers'
import { getVoteChamberLabel } from '../lib/formatting'

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

const VERDICT_COLOR = { adoptat: '#006435', respins: '#9C051A' } as const
const NEUTRAL_ROLE_COLOR = '#505a5f'

type Props = {
  readonly chamber: VoteChamber
  readonly linkRole?: string
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
export function BillVoteRoleBadge({ chamber, linkRole, voteSubject }: Props) {
  // A contradicted role states nothing: keep the chamber, drop the claim.
  const contradicted = roleContradictsSubject(linkRole, voteSubject)
  const roleLabel = contradicted
    ? undefined
    : linkRole
      ? VOTE_ROLE_LABEL[linkRole]
      : undefined
  const verdict = contradicted ? undefined : getFinalBillVoteVerdict({ linkRole })
  const color = verdict ? VERDICT_COLOR[verdict] : NEUTRAL_ROLE_COLOR

  return (
    // Chamber first, chip last: the badge sits flush at the card footer's right
    // edge, so the coloured verdict lands on the edge rather than inside it.
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {getVoteChamberLabel(chamber)}
      </span>
      {roleLabel ? (
        <span
          className="border-2 px-1.5 py-0.5 text-xs font-black uppercase leading-none tracking-wide"
          style={{ color, borderColor: color }}
        >
          {verdict === 'adoptat'
            ? `${roleLabel} · Adoptat`
            : verdict === 'respins'
              ? `${roleLabel} · Respins`
              : roleLabel}
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
  const verdict = getFinalBillVoteVerdict({ linkRole })
  if (verdict === 'respins' && outcome === 'adoptat') {
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
 */
// eslint-disable-next-line react-refresh/only-export-components
export function roleContradictsSubject(
  linkRole: string | undefined,
  voteSubject: string | undefined,
): boolean {
  const verdict = getFinalBillVoteVerdict({ linkRole })
  if (verdict === undefined || voteSubject === undefined) return false
  const folded = voteSubject
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('ro')
  // Only a subject that states a final outcome can contradict; anything else
  // (an amendment, an article, a document version) simply says nothing.
  const saysAdopted = /\badopta/.test(folded) && !/\brespinger|respins/.test(folded)
  const saysRejected = /\brespinger|\brespins/.test(folded)
  return (
    (verdict === 'respins' && saysAdopted) ||
    (verdict === 'adoptat' && saysRejected)
  )
}
