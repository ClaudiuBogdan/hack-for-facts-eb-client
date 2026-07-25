import { Link } from '@tanstack/react-router'
import type { ParliamentMember } from '@/schemas/parliament'
import {
  formatMemberName,
  getChamberShortLabel,
} from '../lib/formatting'

type Props = {
  readonly member: ParliamentMember
}

/** Compact member row for directory lists */
export function MemberListRow({ member }: Props) {
  const name = formatMemberName(member.firstName, member.lastName)

  return (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId: member.memberId }}
      className="flex flex-col gap-1 border-b border-border py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-bold leading-tight">
          {name}
          {/*
            The directory lists MANDATE rows, not sitting members: a replaced or
            deceased member keeps a row (their votes stay attributed to it). Mark
            it, so "who represents my county" is not answered with a former seat.
          */}
          {member.isCurrent === false ? (
            <span className="rounded-none border border-border px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Mandat încheiat
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {member.groupName}
          {member.role ? ` · ${member.role}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-4 text-sm text-muted-foreground">
        <span>{member.judetName}</span>
        <span className="font-medium text-foreground">
          {getChamberShortLabel(member.chamber)}
        </span>
      </div>
    </Link>
  )
}
