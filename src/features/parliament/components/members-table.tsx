import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  ParliamentMember,
  ParliamentMembersList,
  ParliamentMembersSearch,
} from '@/schemas/parliament'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getParliamentGroupColorMap } from '../api/parliament-api-sync'
import { PARLIAMENT_GROUP_FALLBACK_COLOR } from '../lib/group-colors'
import {
  formatMemberName,
  getChamberShortLabel,
} from '../lib/formatting'
import {
  parliamentTableContainerClassName,
  parliamentTableHeadClassName,
  parliamentTableHeaderRowClassName,
  parliamentTableRowClassName,
  DEFAULT_MEMBERS_PAGE_SIZE,
} from '../lib/table-theme'
import { MembersPagination } from './members-pagination'

type Props = {
  readonly page: ParliamentMembersList
  readonly search: ParliamentMembersSearch
  readonly onPageChange: (page: number) => void
  readonly onClearFilters: () => void
}

const groupColors = getParliamentGroupColorMap()

type SkeletonProps = {
  readonly rowCount?: number
}

/** Loading placeholder matching the members table layout and row count. */
export function MembersTableSkeleton({
  rowCount = DEFAULT_MEMBERS_PAGE_SIZE,
}: SkeletonProps) {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Se încarcă lista de membri"
    >
      <div className={parliamentTableContainerClassName}>
        <Table>
          <TableHeader>
            <TableRow className={parliamentTableHeaderRowClassName}>
              <TableHead scope="col" className={cn(parliamentTableHeadClassName, 'w-[240px]')}>
                Nume
              </TableHead>
              <TableHead scope="col" className={parliamentTableHeadClassName}>
                Grup
              </TableHead>
              <TableHead scope="col" className={parliamentTableHeadClassName}>
                Județ
              </TableHead>
              <TableHead scope="col" className={parliamentTableHeadClassName}>
                Cameră
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <TableRow key={index} className={parliamentTableRowClassName}>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-40 rounded-none" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-28 rounded-none" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-24 rounded-none" />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-none" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={index}
            className="border-2 border-parliament-border-strong bg-parliament-card p-4"
          >
            <Skeleton className="h-5 w-48 rounded-none" />
            <Skeleton className="mt-2 h-4 w-full max-w-xs rounded-none" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-5 w-32 rounded-none" />
        <Skeleton className="hidden h-8 w-72 rounded-none sm:block" />
      </div>
    </div>
  )
}

/**
 * SC-1: the directory lists MANDATE rows. A replaced or deceased member keeps a
 * row (their votes stay attributed to it), so an unmarked list answers "who
 * represents my county" with a seat that no longer exists.
 */
function EndedMandateBadge({ member }: { readonly member: ParliamentMember }) {
  if (member.isCurrent !== false) return null
  return (
    <span className="ml-2 inline-block whitespace-nowrap border border-parliament-border-strong px-1.5 py-0.5 align-middle text-[0.6875rem] font-semibold uppercase tracking-wide text-parliament-frame-muted">
      Mandat încheiat
    </span>
  )
}

function MemberMobileCard({ member }: { readonly member: ParliamentMember }) {
  const name = formatMemberName(member.firstName, member.lastName)
  const groupColor = groupColors[member.groupId] ?? PARLIAMENT_GROUP_FALLBACK_COLOR

  return (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId: member.memberId }}
      className="block border-2 border-parliament-border-strong bg-parliament-card p-4 transition-colors hover:bg-parliament-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus"
    >
      <p className="font-black text-parliament-frame-fg">
        {name}
        <EndedMandateBadge member={member} />
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-parliament-frame-muted">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 border border-parliament-ink/10"
            style={{ backgroundColor: groupColor }}
            aria-hidden
          />
          {member.groupName}
        </span>
        <span>{member.judetName}</span>
        <span className="font-semibold text-parliament-frame-fg">
          {getChamberShortLabel(member.chamber)}
        </span>
      </div>
    </Link>
  )
}

/** PNRR-style paginated members directory table */
export function MembersTable({
  page,
  search: _search,
  onPageChange,
  onClearFilters,
}: Props) {
  if (page.total === 0) {
    return (
      <div
        className="border-2 border-parliament-border-strong bg-parliament-card p-8"
        style={{ borderRadius: '6px' }}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="border-2 border-parliament-border-strong bg-parliament-page p-4">
            <Users className="h-8 w-8 text-parliament-frame-muted" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-black text-parliament-frame-fg">
            Niciun membru găsit
          </p>
          <p className="mt-1 text-sm text-parliament-frame-muted">
            Modifică filtrele sau caută alt nume.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 border-2 border-parliament-border-strong bg-parliament-page px-4 py-2 text-sm font-bold uppercase tracking-wide text-parliament-frame-fg transition-colors hover:bg-parliament-frame-fg hover:text-parliament-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus"
          >
            Șterge toate filtrele
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={parliamentTableContainerClassName}>
        <Table>
          <TableHeader>
            <TableRow className={parliamentTableHeaderRowClassName}>
              <TableHead scope="col" className={cn(parliamentTableHeadClassName, 'w-[240px]')}>
                Nume
              </TableHead>
              <TableHead scope="col" className={parliamentTableHeadClassName}>
                Grup
              </TableHead>
              <TableHead scope="col" className={parliamentTableHeadClassName}>
                Județ
              </TableHead>
              <TableHead scope="col" className={parliamentTableHeadClassName}>
                Cameră
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.members.map((member) => {
              const name = formatMemberName(member.firstName, member.lastName)
              const groupColor = groupColors[member.groupId] ?? PARLIAMENT_GROUP_FALLBACK_COLOR

              return (
                <TableRow key={member.memberId} className={parliamentTableRowClassName}>
                  <TableCell className="px-4 py-3">
                    <Link
                      to="/parlament/membri/$memberId"
                      params={{ memberId: member.memberId }}
                      className="font-black text-parliament-frame-fg underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus"
                    >
                      {name}
                    </Link>
                    <EndedMandateBadge member={member} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-parliament-frame-fg">
                      <span
                        className="h-3 w-3 shrink-0 border border-parliament-ink/10"
                        style={{ backgroundColor: groupColor }}
                        aria-hidden
                      />
                      {member.groupName}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-parliament-frame-muted">
                    {member.judetName}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-semibold text-parliament-frame-fg">
                    {getChamberShortLabel(member.chamber)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {page.members.map((member) => (
          <MemberMobileCard key={member.memberId} member={member} />
        ))}
      </div>

      <MembersPagination
        page={page.page}
        totalPages={page.totalPages}
        total={page.total}
        onPageChange={onPageChange}
      />
    </div>
  )
}
