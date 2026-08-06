import { useMemo, useState } from 'react'
import { Download, ExternalLink, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  ParliamentBillSummary,
  ParliamentCommitteeDetail,
  ParliamentCommitteeDocument,
  ParliamentCommitteeMembership,
} from '@/schemas/parliament'
import {
  useParliamentCommittee,
  useParliamentCommitteeDocuments,
} from '../hooks/use-parliament-data'
import {
  committeeChamberLabel,
  committeeRoleLabel,
  formatCommitteeDate,
} from '../lib/committee-format'
import { COMMITTEE_TYPE_BADGES } from '../lib/committee-browse-search'
import { foldText } from '../lib/text-fold'
import {
  COMMITTEE_BREADCRUMB_BG,
  COMMITTEE_NOTICE_BG,
  COMMITTEE_SURFACE,
  committeeCardClassName,
  committeeChamberColor,
  committeeControlClassName,
  committeeGroupHeadingClassName,
  committeeMutedTextClassName,
  committeeNoticeClassName,
  committeePageContainerClassName,
  committeeSectionTitleClassName,
  PARLIAMENT_RESOURCE_PURPLE,
} from '../lib/committee-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

/**
 * I18N: DEFERRED DEBT — not resolved, and not an oversight in one section.
 *
 * Every user-facing string on this page is hardcoded Romanian and every number
 * is formatted `ro-RO` directly; there is no Lingui macro anywhere in this file.
 * 27 of the 175 parliament components DO use Lingui, so the feature is midway
 * through a conversion this page has not had.
 *
 * New copy here follows the page rather than the repo convention on purpose:
 * half-converting one section would leave the page switching languages mid-scroll
 * for a reader on `en`, which is worse than being uniformly untranslated and
 * makes the remaining work harder to see.
 *
 * This is a DEFERRAL, not a decision that the page is finished. It is open work
 * awaiting product acceptance of the `en` parliament surface, and it lands as
 * ONE pass over this file: the strings, `formatCommitteeDate`'s locale, and
 * every `toLocaleString('ro-RO')`. Until that happens the page is Romanian-only,
 * and a reader on `en` sees it that way.
 */
type Props = {
  readonly committeeKey: string
}

/** Bills shown before the reader asks for the rest. */
const BILLS_PREVIEW = 10

/** Where a bill currently sits. Labels for the facet; unknown tokens pass through. */
const BILL_LOCATION_LABELS: Readonly<Record<string, string>> = {
  camera: 'La Camera Deputaților',
  senat: 'La Senat',
  mediere: 'În mediere',
  presedinte: 'La promulgare',
  promulgat: 'Promulgat',
  respins: 'Respins',
  retras: 'Retras',
}

/** Bureau roles, in the order the institution ranks them. */
const BUREAU_ROLE_ORDER: readonly string[] = [
  'presedinte',
  'vicepresedinte',
  'secretar',
]

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

/** The name slot NEVER carries a fabricated placeholder — link, plain, or em-dash. */
function MemberName({ membership }: { readonly membership: ParliamentCommitteeMembership }) {
  const member = membership.member
  if (member?.mandateKey && member.fullName) {
    return (
      <Link
        to="/parlament/membri/$memberId"
        params={{ memberId: member.mandateKey }}
        className="text-base font-bold text-[#1d70b8] underline-offset-2 hover:underline"
      >
        {member.fullName}
      </Link>
    )
  }
  if (member?.fullName) {
    return (
      <span className="text-base font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {member.fullName}
      </span>
    )
  }
  return (
    <span className={committeeMutedTextClassName} aria-label="Mandat neasociat unui profil">
      —
    </span>
  )
}

function BureauCard({ membership }: { readonly membership: ParliamentCommitteeMembership }) {
  const interval = membershipInterval(membership)
  return (
    <div className={cn(committeeCardClassName, 'p-4')}>
      <p className={committeeGroupHeadingClassName}>
        {committeeRoleLabel(membership.role)}
      </p>
      <div className="mt-1.5">
        <MemberName membership={membership} />
      </div>
      <p className={cn('mt-1', committeeMutedTextClassName)}>
        {[membership.member?.groupName, interval].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

function RosterRow({ membership }: { readonly membership: ParliamentCommitteeMembership }) {
  const interval = membershipInterval(membership)
  return (
    <li className="flex flex-col gap-1 border-b border-[#dee0e2] py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 dark:border-[var(--pnrr-border)]/60">
      <MemberName membership={membership} />
      {interval ? (
        <span className={cn('shrink-0 tabular-nums', committeeMutedTextClassName)}>
          {interval}
        </span>
      ) : null}
    </li>
  )
}

function LinkedBillRow({ bill }: { readonly bill: ParliamentBillSummary }) {
  return (
    <Link
      to="/parlament/proiecte/$billId"
      params={{ billId: bill.billId }}
      className={cn(
        committeeCardClassName,
        'group flex items-center justify-between gap-4 p-4 transition-colors hover:bg-[#f8f8f8] dark:hover:bg-[var(--pnrr-hover)]',
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-[#1d70b8] underline-offset-2 group-hover:underline">
          {bill.title}
        </p>
        <p className={cn('mt-1 tabular-nums', committeeMutedTextClassName)}>
          {bill.number}
        </p>
      </div>
      <ParliamentCardChevron className="shrink-0" />
    </Link>
  )
}

function StatBlock({
  value,
  label,
}: {
  readonly value: string
  readonly label: string
}) {
  return (
    <div>
      <span className="block text-3xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-white/90">{label}</span>
    </div>
  )
}

/** Group the roster by parliamentary group, largest delegation first. */
function groupRoster(
  members: readonly ParliamentCommitteeMembership[],
): ReadonlyArray<readonly [string, ParliamentCommitteeMembership[]]> {
  const byGroup = new Map<string, ParliamentCommitteeMembership[]>()
  for (const membership of members) {
    const key = membership.member?.groupName ?? 'Neafiliat'
    byGroup.set(key, [...(byGroup.get(key) ?? []), membership])
  }
  return [...byGroup.entries()].sort((left, right) => {
    const bySize = right[1].length - left[1].length
    return bySize !== 0 ? bySize : left[0].localeCompare(right[0], 'ro')
  })
}

function CommitteeNotice({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      className={committeeNoticeClassName}
      style={{
        backgroundColor: COMMITTEE_NOTICE_BG,
        borderLeftColor: PARLIAMENT_RESOURCE_PURPLE,
      }}
    >
      {children}
    </div>
  )
}

/**
 * One committee document.
 *
 * Adapted from the bill documents tab with three changes the DATA forces, each
 * of which would otherwise print something the source never said:
 *  - no date line when the document carries none (1,980 of 2,056 Senate rows);
 *  - no type badge when the API serves none (every Senate row — the server
 *    suppresses a classifier that mislabelled a newsletter and a JPEG);
 *  - no download affordance when there is no file, only a link to the page the
 *    document lives on.
 */
function CommitteeDocumentRow({
  document,
  isSenate,
}: {
  readonly document: ParliamentCommitteeDocument
  readonly isSenate: boolean
}) {
  const href = document.documentUrl ?? document.sourceUrl
  const label = document.title ?? 'Document fără titlu în sursă'
  const sourceLabel = isSenate ? 'Vezi pe senat.ro' : 'Vezi pe cdep.ro'
  // Every row's link reads "Descarcă" / "Vezi pe senat.ro" visually, which is
  // fine beside the title but useless in a screen reader's link list — twenty
  // identical "Descarcă" entries name nothing. The accessible name carries the
  // document.
  const linkLabel = document.documentUrl
    ? `Descarcă ${label}`
    : `${sourceLabel}: ${label}`
  return (
    <div
      className={cn(
        committeeCardClassName,
        'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-[#512178] dark:text-[var(--pnrr-text)]">
          {label}
        </p>
        {document.publishedAt ? (
          <p className={cn('mt-1', committeeMutedTextClassName)}>
            {formatCommitteeDate(document.publishedAt)}
          </p>
        ) : null}
        {document.docType ? (
          <span
            className="mt-2 inline-block border-2 border-[#0b0c0c] px-2 py-0.5 text-xs font-bold uppercase dark:border-[var(--pnrr-border)]"
          >
            {document.docType}
          </span>
        ) : null}
      </div>
      <Button
        asChild
        variant="outline"
        className="shrink-0 rounded-none border-2 border-[#1d70b8] text-[#1d70b8] hover:bg-[#1d70b8]/5"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={linkLabel}
        >
          {document.documentUrl ? (
            <>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Descarcă
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              {sourceLabel}
            </>
          )}
        </a>
      </Button>
    </div>
  )
}

/**
 * One row per document, in the order the server sent them.
 *
 * `documentId` is the server's `committeeDocumentKey` — the primary key, so it
 * identifies the document rather than merely labelling it. First occurrence wins
 * because pages arrive newest-first and the earlier copy is the one whose
 * position in the list the reader has already scrolled past.
 */
function dedupeDocuments(
  documents: readonly ParliamentCommitteeDocument[],
): ParliamentCommitteeDocument[] {
  const seen = new Set<string>()
  return documents.filter((document) => {
    if (seen.has(document.documentId)) return false
    seen.add(document.documentId)
    return true
  })
}

function CommitteeDocumentsSection({
  committeeKey,
  isSenate,
}: {
  readonly committeeKey: string
  readonly isSenate: boolean
}) {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useParliamentCommitteeDocuments(committeeKey)

  // Deduped at the FLATTEN boundary, first occurrence wins.
  //
  // The hook's stuck-cursor guard stops the loop, but it can only run AFTER the
  // repeated page has been fetched and appended — `getNextPageParam` reads the
  // page it is deciding about. So the cache legitimately holds one duplicate
  // page, and rendering it raw meant the same document twice: duplicate React
  // keys, and "afișate N" counting a document the reader can see only once.
  // The count is derived from this list for exactly that reason.
  const documents = dedupeDocuments(data?.pages.flatMap((page) => page.documents) ?? [])
  const total = data?.pages[0]?.total ?? 0

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className={committeeSectionTitleClassName}>Documente</h2>
        {/* A bare Skeleton is invisible to a screen reader — the section just
            goes quiet. Announce that it is loading. */}
        <div role="status" aria-label="Se încarcă documentele comisiei">
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
      </section>
    )
  }

  // A failed page is NOT "no documents" — saying so would tell the reader this
  // committee published nothing. The bills and roster above are unaffected,
  // which is why this section fetches separately.
  if (isError) {
    return (
      <section className="space-y-4">
        <h2 className={committeeSectionTitleClassName}>Documente</h2>
        <CommitteeNotice>
          Documentele comisiei nu au putut fi încărcate. Restul paginii este
          neafectat; reîncărcați pagina pentru a încerca din nou.
        </CommitteeNotice>
      </section>
    )
  }

  // A successful empty result is a FINDING, not an absence of the surface.
  // Returning null here made "this committee published nothing we hold" look
  // identical to "this page has no documents section" — and the reader cannot
  // tell those apart, so they assume the second. Distinct from the failure
  // notice above, which says the opposite thing.
  if (documents.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className={committeeSectionTitleClassName}>Documente</h2>
        <CommitteeNotice>
          Nu am găsit documente publicate de această comisie în datele sursă.
        </CommitteeNotice>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={committeeSectionTitleClassName}>Documente</h2>
        <span className={committeeMutedTextClassName}>
          afișate <span className="tabular-nums">{documents.length}</span> din{' '}
          <span className="tabular-nums">{total.toLocaleString('ro-RO')}</span>
        </span>
      </div>
      <div className="space-y-3">
        {documents.map((document) => (
          <CommitteeDocumentRow
            key={document.documentId}
            document={document}
            isSenate={isSenate}
          />
        ))}
      </div>
      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-none border-2 border-[#0b0c0c] text-base font-normal dark:border-[var(--pnrr-border)]"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? 'Se încarcă…' : 'Încarcă mai multe documente'}
        </Button>
      ) : null}
    </section>
  )
}

/** Committee detail at /parlament/comisii/$committeeKey */
export function ParliamentCommitteeDetailPage({ committeeKey }: Props) {
  const { data: committee, isLoading, isError, refetch } = useParliamentCommittee(committeeKey)
  const [showAllBills, setShowAllBills] = useState(false)
  const [billQuery, setBillQuery] = useState('')
  const [billLocation, setBillLocation] = useState('all')

  if (isLoading) return <CommitteeDetailSkeleton />

  if (isError) {
    return (
      <CommitteeShell>
        <div className={cn(committeeCardClassName, 'px-5 py-8')}>
          <p className="text-base font-bold">Comisia nu a putut fi încărcată</p>
          <p className={cn('mt-2', committeeMutedTextClassName)}>
            Este o eroare temporară a serviciului de date, nu o comisie inexistentă.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10 rounded-none border-2"
            onClick={() => void refetch()}
          >
            Reîncearcă
          </Button>
        </div>
      </CommitteeShell>
    )
  }

  if (!committee) {
    return (
      <CommitteeShell>
        <div className={cn(committeeCardClassName, 'px-5 py-8')}>
          <p className="text-base font-bold">Comisia nu a fost găsită</p>
          <p className={cn('mt-2', committeeMutedTextClassName)}>
            Cheia <span className="tabular-nums">{committeeKey}</span> nu corespunde
            niciunei comisii publicate.
          </p>
        </div>
      </CommitteeShell>
    )
  }

  return (
    <CommitteeDossier
      committee={committee}
      showAllBills={showAllBills}
      onShowAllBills={() => setShowAllBills(true)}
      billQuery={billQuery}
      billLocation={billLocation}
      onBillQuery={(value) => {
        setBillQuery(value)
        setShowAllBills(false)
      }}
      onBillLocation={(value) => {
        setBillLocation(value)
        setShowAllBills(false)
      }}
    />
  )
}

function CommitteeShell({
  children,
  chamber,
}: {
  readonly children: React.ReactNode
  readonly chamber?: string
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: COMMITTEE_SURFACE }}>
      <nav
        className="py-3 text-sm text-white"
        style={{ backgroundColor: COMMITTEE_BREADCRUMB_BG }}
        aria-label="Breadcrumb"
      >
        <div className={committeePageContainerClassName}>
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link to="/parlament" search={{ tab: 'prezentare' }} className="hover:underline">
                Parlament
              </Link>
            </li>
            <li aria-hidden className="opacity-70">›</li>
            <li>
              <Link to="/parlament/comisii" className="hover:underline">
                Comisii
              </Link>
            </li>
            {chamber ? (
              <>
                <li aria-hidden className="opacity-70">›</li>
                <li className="font-semibold" aria-current="page">
                  {committeeChamberLabel(chamber)}
                </li>
              </>
            ) : null}
          </ol>
        </div>
      </nav>
      <div className={cn(committeePageContainerClassName, 'py-8')}>{children}</div>
    </div>
  )
}

function CommitteeDetailSkeleton() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: COMMITTEE_SURFACE }}
      aria-busy="true"
      aria-label="Se încarcă comisia"
    >
      <div className="py-3" style={{ backgroundColor: COMMITTEE_BREADCRUMB_BG }}>
        <div className={committeePageContainerClassName}>
          <Skeleton className="h-4 w-56 rounded-none bg-white/30" />
        </div>
      </div>
      <section className="py-8 text-white" style={{ backgroundColor: committeeChamberColor(undefined) }}>
        <div className={committeePageContainerClassName}>
          <Skeleton className="h-8 w-full max-w-[34rem] rounded-none bg-white/25 sm:h-9" />
          <Skeleton className="mt-3 h-5 w-64 rounded-none bg-white/20" />
          <div className="mt-6 flex gap-10">
            {[0, 1, 2].map((stat) => (
              <div key={stat}>
                <Skeleton className="h-8 w-16 rounded-none bg-white/25" />
                <Skeleton className="mt-1 h-4 w-20 rounded-none bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className={cn(committeePageContainerClassName, 'space-y-6 py-8')}>
        <Skeleton className="h-32 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    </div>
  )
}

function CommitteeDossier({
  committee,
  showAllBills,
  onShowAllBills,
  billQuery,
  billLocation,
  onBillQuery,
  onBillLocation,
}: {
  readonly committee: ParliamentCommitteeDetail
  readonly showAllBills: boolean
  readonly onShowAllBills: () => void
  readonly billQuery: string
  readonly billLocation: string
  readonly onBillQuery: (value: string) => void
  readonly onBillLocation: (value: string) => void
}) {
  const heroColor = committeeChamberColor(committee.chamber)
  const isSenate = committee.chamber === 'senat'

  const bureau = useMemo(
    () =>
      committee.members
        .filter((m) => m.isBureau || BUREAU_ROLE_ORDER.includes((m.role ?? '').toLowerCase()))
        .sort(
          (left, right) =>
            BUREAU_ROLE_ORDER.indexOf((left.role ?? '').toLowerCase()) -
            BUREAU_ROLE_ORDER.indexOf((right.role ?? '').toLowerCase()),
        ),
    [committee.members],
  )
  const bureauKeys = useMemo(
    () => new Set(bureau.map((m) => m.membershipKey)),
    [bureau],
  )
  const rank = useMemo(
    () => committee.members.filter((m) => !bureauKeys.has(m.membershipKey)),
    [committee.members, bureauKeys],
  )
  const rosterGroups = useMemo(() => groupRoster(rank), [rank])

  // The facet options come from the bills actually loaded, so the control can
  // never offer a state that yields nothing.
  const locationOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const bill of committee.linkedBills) seen.add(bill.currentLocation)
    return [...seen].sort((left, right) =>
      (BILL_LOCATION_LABELS[left] ?? left).localeCompare(
        BILL_LOCATION_LABELS[right] ?? right,
        'ro',
      ),
    )
  }, [committee.linkedBills])

  const matchedBills = useMemo(() => {
    const needle = foldText(billQuery.trim())
    return committee.linkedBills.filter(
      (bill) =>
        (billLocation === 'all' || bill.currentLocation === billLocation) &&
        (!needle ||
          foldText(bill.title).includes(needle) ||
          foldText(bill.number).includes(needle)),
    )
  }, [committee.linkedBills, billQuery, billLocation])

  const billFilterActive = billQuery.trim() !== '' || billLocation !== 'all'
  const visibleBills = showAllBills ? matchedBills : matchedBills.slice(0, BILLS_PREVIEW)
  const cappedByServer = committee.linkedBillsTotal > committee.linkedBills.length
  const hasUnassociatedRoster = committee.members.some((m) => !m.member?.fullName)

  return (
    <div className="min-h-screen" style={{ backgroundColor: COMMITTEE_SURFACE }}>
      <nav
        className="py-3 text-sm text-white"
        style={{ backgroundColor: COMMITTEE_BREADCRUMB_BG }}
        aria-label="Breadcrumb"
      >
        <div className={committeePageContainerClassName}>
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link to="/parlament" search={{ tab: 'prezentare' }} className="hover:underline">
                Parlament
              </Link>
            </li>
            <li aria-hidden className="opacity-70">›</li>
            <li>
              <Link to="/parlament/comisii" className="hover:underline">
                Comisii
              </Link>
            </li>
            <li aria-hidden className="opacity-70">›</li>
            <li className="min-w-0 truncate font-semibold" aria-current="page">
              {committee.name}
            </li>
          </ol>
        </div>
      </nav>

      <section className="py-8 text-white" style={{ backgroundColor: heroColor }}>
        <div className={committeePageContainerClassName}>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-[2rem]">
            {committee.name}
          </h1>
          <p className="mt-3 text-base text-white/90">
            {[
              committee.committeeType
                ? (COMMITTEE_TYPE_BADGES[committee.committeeType] ?? committee.committeeType)
                : null,
              committeeChamberLabel(committee.chamber),
              committee.legislature ? `Legislatura ${committee.legislature}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {/* A Senate ZERO here is ambiguous — it can mean "no activity" or "we
              have not linked it yet" — so a zero is omitted rather than printed
              as a fact. A NON-zero is never ambiguous, so it is shown: suppressing
              per chamber (the old rule) hid real counts, because Senate
              committees do report bills and meetings. Camera prints both
              unconditionally — its zero is a far better-founded floor (70% of
              Camera committee documents carry a bill link, against 4% of the
              Senate's), not a different KIND of number. */}
          <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <StatBlock
              value={committee.members.length.toLocaleString('ro-RO')}
              label={committee.members.length === 1 ? 'membru' : 'membri'}
            />
            {!isSenate || committee.linkedBillsTotal > 0 ? (
              <StatBlock
                value={committee.linkedBillsTotal.toLocaleString('ro-RO')}
                label="proiecte repartizate"
              />
            ) : null}
            {!isSenate || committee.meetingsCount > 0 ? (
              <StatBlock
                value={committee.meetingsCount.toLocaleString('ro-RO')}
                label="ședințe"
              />
            ) : null}
          </div>
        </div>
      </section>

      <div className={cn(committeePageContainerClassName, 'space-y-10 py-8')}>
        {bureau.length > 0 ? (
          <section className="space-y-4">
            <h2 className={committeeSectionTitleClassName}>Conducere</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bureau.map((membership) => (
                <BureauCard key={membership.membershipKey} membership={membership} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={committeeSectionTitleClassName}>Componență</h2>
            {rank.length > 0 ? (
              <span className={committeeMutedTextClassName}>
                <span className="tabular-nums">{rank.length}</span> membri, pe grupuri
              </span>
            ) : null}
          </div>

          {committee.members.length === 0 ? (
            <CommitteeNotice>
              Componența acestei comisii nu este publicată de sursă. Absența listei
              nu înseamnă o comisie fără membri.
            </CommitteeNotice>
          ) : rosterGroups.length > 0 ? (
            <>
              {/* Collapsed by group: a 41-name roster in one column tells you
                  nothing about the balance of the committee, which is the first
                  thing a reader wants from it. */}
              <Accordion type="multiple" className={cn(committeeCardClassName, 'px-4')}>
                {rosterGroups.map(([groupName, members]) => (
                  <AccordionItem key={groupName} value={groupName} className="border-0">
                    <AccordionTrigger className="rounded-none px-0 py-3 text-base font-bold text-[#372554] hover:no-underline dark:text-[var(--pnrr-fg)]">
                      {/* Name and count are ONE flex item. As two, the trigger's
                          `justify-between` pushed each count to a position set
                          by its own group's name width, so the column of counts
                          landed ragged across 23px. The space is real text, not
                          a margin, because a flex container drops a
                          whitespace-only node and the accessible name read
                          "PSD(6)". */}
                      <span className="min-w-0 truncate">
                        {groupName} <span className="tabular-nums font-normal">({members.length})</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-0">
                      <ul>
                        {members.map((membership) => (
                          <RosterRow key={membership.membershipKey} membership={membership} />
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {hasUnassociatedRoster ? (
                <p className={committeeMutedTextClassName}>
                  Unele mandate nu sunt încă asociate unui profil.
                </p>
              ) : null}
            </>
          ) : null}
        </section>

        {/* Render what the server SENT. This used to be `isSenate ? notice : …`,
            which threw away every Senate committee's bills unread — the notice
            fired on chamber alone, so a committee served with 24 linked bills and
            2 meetings still rendered "we don't have them yet". The empty state is
            a property of the payload, not of the chamber. */}
        {committee.linkedBills.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={committeeSectionTitleClassName}>Proiecte de lege</h2>
              {/* The count says WHICH set it counts. A filtered view reporting
                  "din 208" would be counting bills that are not on screen, and
                  the loaded set is itself capped below the total. */}
              <span className={committeeMutedTextClassName}>
                {billFilterActive ? (
                  <>
                    <span className="tabular-nums">{matchedBills.length}</span>{' '}
                    din <span className="tabular-nums">{committee.linkedBills.length}</span>{' '}
                    proiecte încărcate
                  </>
                ) : (
                  <>
                    afișate <span className="tabular-nums">{visibleBills.length}</span>{' '}
                    din{' '}
                    <span className="tabular-nums">
                      {committee.linkedBillsTotal.toLocaleString('ro-RO')}
                    </span>
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#505a5f]"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={billQuery}
                  onChange={(event) => onBillQuery(event.target.value)}
                  placeholder="Caută după titlu sau număr…"
                  aria-label="Caută un proiect după titlu sau număr"
                  className={cn(committeeControlClassName, 'w-full pl-9')}
                />
              </div>
              <select
                value={billLocation}
                onChange={(event) => onBillLocation(event.target.value)}
                className={cn(committeeControlClassName, 'px-3 text-sm font-semibold sm:w-56')}
                aria-label="Filtru stare a proiectului"
              >
                <option value="all">Toate stările</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {BILL_LOCATION_LABELS[location] ?? location}
                  </option>
                ))}
              </select>
            </div>

            {matchedBills.length === 0 ? (
              <div className={cn(committeeCardClassName, 'px-5 py-8')}>
                <p className="text-base font-bold">Niciun proiect nu corespunde filtrelor</p>
                <p className={cn('mt-2', committeeMutedTextClassName)}>
                  Căutarea acoperă cele{' '}
                  <span className="tabular-nums">{committee.linkedBills.length}</span>{' '}
                  proiecte încărcate pentru această comisie.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {visibleBills.map((bill) => (
                  <li key={bill.billId}>
                    <LinkedBillRow bill={bill} />
                  </li>
                ))}
              </ul>
            )}
            {!showAllBills && matchedBills.length > BILLS_PREVIEW ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-none border-2 border-[#0b0c0c] text-base font-normal dark:border-[var(--pnrr-border)]"
                onClick={onShowAllBills}
              >
                Arată toate cele {matchedBills.length} proiecte
                {billFilterActive ? ' găsite' : ' încărcate'}
              </Button>
            ) : null}
            {/* OUR bound, said as ours. This used to read "Sursa returnează cel
                mult N" — blaming cdep.ro/senat.ro for a limit the API applies.
                Both numbers come from the payload, so state them plainly. */}
            {showAllBills && cappedByServer ? (
              <CommitteeNotice>
                Afișăm primele{' '}
                <span className="tabular-nums">{committee.linkedBills.length}</span>{' '}
                proiecte din cele{' '}
                <span className="tabular-nums">
                  {committee.linkedBillsTotal.toLocaleString('ro-RO')}
                </span>{' '}
                asociate acestei comisii.
                {/* No "the rest are on the official page": the payload does not
                    establish that. A Senate committee's sourceUrl is the shared
                    committee INDEX — the same reason the provenance link below
                    says "Lista comisiilor pe senat.ro" rather than naming the
                    committee's own page. Say what was cut, not where to find it. */}
              </CommitteeNotice>
            ) : null}
          </section>
        ) : (
          // A NEUTRAL empty state, and only when the payload is actually empty.
          // The old copy fired on `isSenate` and asserted "sub 5% sunt legate de
          // un proiect de lege" — a measurement of the document-link path alone.
          // Committee referrals are now served from the step-links as well, so
          // that claim is both false and chamber-specific; the honest statement
          // is that we found none, not why the reader should have expected none.
          <CommitteeNotice>
            Nu am găsit proiecte de lege asociate acestei comisii în datele sursă.
            Absența listei nu înseamnă o comisie fără activitate.
          </CommitteeNotice>
        )}

        <CommitteeDocumentsSection committeeKey={committee.committeeKey} isSenate={isSenate} />

        {/* The meetings figure is suppressed for a Senate zero (see the hero),
            which would otherwise leave a committee showing bills but silently
            no meetings — the same absent-vs-zero ambiguity this page just
            removed for bills. Say which one it is. */}
        {isSenate && committee.meetingsCount === 0 ? (
          <CommitteeNotice>
            Numărul de ședințe pentru această comisie nu este încă disponibil.
          </CommitteeNotice>
        ) : null}

        {/* Provenance at the foot, where a citation belongs. */}
        <div
          className={committeeNoticeClassName}
          style={{
            backgroundColor: COMMITTEE_NOTICE_BG,
            borderLeftColor: PARLIAMENT_RESOURCE_PURPLE,
          }}
        >
          <p>
            Sursă: {isSenate ? 'senat.ro' : 'cdep.ro'}. Componența, rolurile și
            legăturile cu proiectele provin din pagina oficială a camerei.
          </p>
          {isHttp(committee.sourceUrl) ? (
            <a
              href={committee.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#1d70b8] underline underline-offset-2"
            >
              {/* Senate committees all point at ONE index page, so promising
                  "the committee's page" would overstate where the link lands. */}
              {isSenate ? 'Lista comisiilor pe senat.ro' : 'Pagina oficială a comisiei'}
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
