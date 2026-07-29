import { Link } from '@tanstack/react-router'
import type { ParliamentVoteBillLink, VoteOutcome } from '@/schemas/parliament'
import { BillVoteRoleBadge } from './bill-vote-role-badge'

/**
 * WHICH BILL(S) THIS DIVISION BELONGED TO, and what it did to them.
 *
 * What stood here before was a single unnamed link reading "Vezi proiectul de
 * lege", built from the vote's scalar `billKey`. Two things were wrong with it:
 * it named nothing (the reader had to click to learn which bill), and 1,502
 * divisions link to TWO bills, of which that column shows one.
 *
 * The verdict comes from the edge's role composed with this division's outcome —
 * the badge owns that rule, and it is the same badge the bill page uses, so the
 * two surfaces cannot end up saying different things about the same vote.
 */
export function VoteRelatedBillsCard({
  links,
  outcome,
  voteSubject,
}: {
  readonly links: readonly ParliamentVoteBillLink[]
  readonly outcome: VoteOutcome
  readonly voteSubject?: string
}) {
  if (links.length === 0) return null

  return (
    <div className="mb-6 border border-[#b1b4b6] bg-white px-5 py-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
      <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {links.length > 1
          ? 'Vot asociat mai multor proiecte de lege'
          : 'Vot asociat proiectului de lege'}
      </p>
      <ul className="mt-2 space-y-3">
        {links.map((link) => (
          <li
            key={link.billId}
            className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2"
          >
            <div className="min-w-0 flex-1">
              <Link
                to="/parlament/proiecte/$billId"
                params={{ billId: link.billId }}
                className="text-base font-bold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
              >
                {/* The chamber's own reference leads when there is one; it is
                    short and citable. The title is the fallback, and "Vezi
                    proiectul de lege" only when the server resolved no bill row
                    behind the key — never as the default label. */}
                {link.billNumber ?? link.billTitle ?? 'Vezi proiectul de lege'}
              </Link>
              {link.billNumber && link.billTitle ? (
                <p className="mt-1 text-sm leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {link.billTitle}
                </p>
              ) : null}
            </div>
            {/* No chamber: the breadcrumb and the hero both already name it. */}
            {link.role ? (
              <BillVoteRoleBadge
                linkRole={link.role}
                outcome={outcome}
                voteSubject={voteSubject}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
