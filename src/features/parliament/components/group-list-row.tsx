import { Link } from '@tanstack/react-router'
import type { ParliamentGroup } from '@/schemas/parliament'
import { getChamberLabel } from '../lib/formatting'

type Props = {
  readonly group: ParliamentGroup
}

/** Compact group row for directory lists */
export function GroupListRow({ group }: Props) {
  return (
    <Link
      to="/parlament/grupuri/$groupId"
      params={{ groupId: group.groupId }}
      className="flex items-center justify-between gap-4 border-b border-border py-4 transition-colors hover:bg-muted/30"
    >
      <div className="min-w-0">
        <p className="font-bold leading-tight">
          {group.shortName ?? group.name}
        </p>
        {group.shortName ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {group.name}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-sm">
        <span className="font-black tabular-nums">{group.memberCount}</span>
        <span className="text-muted-foreground">
          {getChamberLabel(group.chamber)}
        </span>
      </div>
    </Link>
  )
}
