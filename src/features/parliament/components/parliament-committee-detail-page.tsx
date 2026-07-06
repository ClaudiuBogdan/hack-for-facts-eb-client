import { ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  ParliamentBillSummary,
  ParliamentCommitteeMembership,
} from '@/schemas/parliament'
import { useParliamentCommittee } from '../hooks/use-parliament-data'
import {
  committeeChamberLabel,
  committeeRoleLabel,
  formatCommitteeDate,
} from '../lib/committee-format'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentBackLink, ParliamentPageFrame } from './parliament-page-frame'

type Props = {
  readonly committeeKey: string
}

function isHttp(url: string | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url))
}

function membershipInterval(m: ParliamentCommitteeMembership): string | null {
  const from = formatCommitteeDate(m.joinedDate)
  const to = formatCommitteeDate(m.leftDate)
  if (from && to) return `${from} – ${to}`
  if (from) return `din ${from}`
  if (to) return `până la ${to}`
  return null
}

function RosterRow({ membership }: { readonly membership: ParliamentCommitteeMembership }) {
  const member = membership.member
  const interval = membershipInterval(membership)
  const roleAndInterval = [committeeRoleLabel(membership.role), interval]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className="border border-[#b1b4b6] bg-white p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {/* The name slot NEVER carries a fabricated placeholder. Deep-link when
              the row resolves to a real member; show a plain name when we have a
              name but no linkable mandate; otherwise leave the slot name-free (a
              muted em-dash) and keep only role/dates/isBureau — the footnote under
              the roster explains the unassociated mandates. */}
          {member?.mandateKey && member.fullName ? (
            <Link
              to="/parlament/membri/$memberId"
              params={{ memberId: member.mandateKey }}
              className="text-base font-bold text-[#1d70b8] underline-offset-2 hover:underline"
            >
              {member.fullName}
            </Link>
          ) : member?.fullName ? (
            <span className="text-base font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {member.fullName}
            </span>
          ) : (
            <span
              className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]"
              aria-label="Mandat neasociat unui profil"
            >
              —
            </span>
          )}
          <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {roleAndInterval}
            {member?.groupName ? ` · ${member.groupName}` : ''}
          </p>
        </div>
        {membership.isBureau ? (
          <span className="w-fit shrink-0 rounded-none bg-[#eef7f1] px-2 py-1 text-xs font-semibold text-[#006435]">
            Birou
          </span>
        ) : null}
      </div>
    </li>
  )
}

function LinkedBillRow({ bill }: { readonly bill: ParliamentBillSummary }) {
  return (
    <Link
      to="/parlament/proiecte/$billId"
      params={{ billId: bill.billId }}
      className="group flex items-center justify-between gap-4 border border-[#b1b4b6] bg-white p-4 transition-colors hover:bg-[#f8f8f8] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-hover)]"
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1d70b8] underline-offset-2 group-hover:underline">
          {bill.title}
        </p>
        <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {bill.number}
        </p>
      </div>
      <ParliamentCardChevron className="shrink-0" />
    </Link>
  )
}

/** Committee detail at /parlament/comisii/$committeeKey */
export function ParliamentCommitteeDetailPage({ committeeKey }: Props) {
  const { data: committee, isLoading } = useParliamentCommittee(committeeKey)

  if (isLoading) {
    return (
      <ParliamentPageFrame>
        <Skeleton className="h-32 w-full rounded-none" />
      </ParliamentPageFrame>
    )
  }

  if (!committee) {
    return (
      <ParliamentPageFrame>
        <ParliamentBackLink to="/parlament/comisii" label="Comisii" />
        <p className="text-muted-foreground">Comisia nu a fost găsită.</p>
      </ParliamentPageFrame>
    )
  }

  const showingLinkedBills = committee.linkedBills.length
  const capped = committee.linkedBillsTotal > showingLinkedBills
  // Some roster rows carry no resolved member profile (name-free); a footnote
  // explains the empty name slots rather than inventing a placeholder name.
  const hasUnassociatedRoster = committee.members.some((m) => !m.member?.fullName)

  return (
    <ParliamentPageFrame className="space-y-8">
      <ParliamentBackLink to="/parlament/comisii" label="Comisii" />

      <header className="border-b border-border pb-6">
        <h1
          className="font-black leading-tight tracking-tight"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}
        >
          {committee.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {committeeChamberLabel(committee.chamber)}
          {committee.committeeType ? ` · ${committee.committeeType}` : ''}
        </p>
        {isHttp(committee.sourceUrl) ? (
          <a
            href={committee.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-2"
          >
            Pagina oficială a comisiei
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="border-2 border-[#b1b4b6] px-4 py-3 dark:border-[var(--pnrr-border)]">
          <span className="block text-2xl font-black text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {committee.members.length}
          </span>
          <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            membri
          </span>
        </div>
        <div className="border-2 border-[#b1b4b6] px-4 py-3 dark:border-[var(--pnrr-border)]">
          <span className="block text-2xl font-black text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {committee.meetingsCount.toLocaleString('ro-RO')}
          </span>
          <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            ședințe
          </span>
        </div>
        <div className="border-2 border-[#b1b4b6] px-4 py-3 dark:border-[var(--pnrr-border)]">
          <span className="block text-2xl font-black text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {committee.linkedBillsTotal.toLocaleString('ro-RO')}
          </span>
          <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            proiecte asociate
          </span>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Componență
        </h2>
        {committee.members.length > 0 ? (
          <>
            <ul className="space-y-3">
              {committee.members.map((membership) => (
                <RosterRow key={membership.membershipKey} membership={membership} />
              ))}
            </ul>
            {hasUnassociatedRoster ? (
              <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Unele mandate nu sunt încă asociate unui profil.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Componența acestei comisii nu este disponibilă.
          </p>
        )}
      </section>

      {committee.linkedBills.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Proiecte de lege
            </h2>
            {capped ? (
              <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                afișate {showingLinkedBills} din{' '}
                {committee.linkedBillsTotal.toLocaleString('ro-RO')}
              </span>
            ) : null}
          </div>
          <ul className="space-y-3">
            {committee.linkedBills.map((bill) => (
              <li key={bill.billId}>
                <LinkedBillRow bill={bill} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ParliamentPageFrame>
  )
}
