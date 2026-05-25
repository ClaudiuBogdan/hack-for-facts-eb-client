import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
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
import { getParliamentGroupColorMap } from '../api/parliament-api'
import {
  formatMemberName,
  getChamberShortLabel,
} from '../lib/formatting'
import {
  parliamentTableContainerClassName,
  parliamentTableHeadClassName,
  parliamentTableHeaderRowClassName,
  parliamentTableRowClassName,
} from '../lib/table-theme'
import { MembersPagination } from './members-pagination'

type Props = {
  readonly page: ParliamentMembersList
  readonly search: ParliamentMembersSearch
  readonly onPageChange: (page: number) => void
  readonly onClearFilters: () => void
}

const groupColors = getParliamentGroupColorMap()

function MemberMobileCard({ member }: { readonly member: ParliamentMember }) {
  const name = formatMemberName(member.firstName, member.lastName)
  const groupColor = groupColors[member.groupId] ?? '#505a5f'

  return (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId: member.memberId }}
      className="block border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-4 transition-colors hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
    >
      <p className="font-black text-[var(--pnrr-fg)]">{name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--pnrr-muted)]">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 border border-black/10"
            style={{ backgroundColor: groupColor }}
            aria-hidden
          />
          {member.groupName}
        </span>
        <span>{member.judetName}</span>
        <span className="font-semibold text-[var(--pnrr-fg)]">
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
        className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-8"
        style={{ borderRadius: '6px' }}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] p-4">
            <Users className="h-8 w-8 text-[var(--pnrr-muted)]" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-black text-[var(--pnrr-fg)]">
            Niciun membru găsit
          </p>
          <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
            Modifică filtrele sau caută alt nume.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
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
              const groupColor = groupColors[member.groupId] ?? '#505a5f'

              return (
                <TableRow key={member.memberId} className={parliamentTableRowClassName}>
                  <TableCell className="px-4 py-3">
                    <Link
                      to="/parlament/membri/$memberId"
                      params={{ memberId: member.memberId }}
                      className="font-black text-[var(--pnrr-fg)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                    >
                      {name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-[var(--pnrr-fg)]">
                      <span
                        className="h-3 w-3 shrink-0 border border-black/10"
                        style={{ backgroundColor: groupColor }}
                        aria-hidden
                      />
                      {member.groupName}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[var(--pnrr-muted)]">
                    {member.judetName}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-semibold text-[var(--pnrr-fg)]">
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
