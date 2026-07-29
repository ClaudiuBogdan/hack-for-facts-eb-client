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
export function BillVoteRoleBadge({ chamber, linkRole }: Props) {
  const roleLabel = linkRole ? VOTE_ROLE_LABEL[linkRole] : undefined
  const verdict = getFinalBillVoteVerdict({ linkRole })
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
): string | undefined {
  const verdict = getFinalBillVoteVerdict({ linkRole })
  if (verdict === 'respins' && outcome === 'adoptat') {
    return '„Pentru” = pentru respingerea proiectului'
  }
  return undefined
}
