import { Skeleton } from '@/components/ui/skeleton'
import {
  useParliamentGroup,
  useParliamentGroupMembers,
} from '../hooks/use-parliament-data'
import { getChamberLabel } from '../lib/formatting'
import { MemberListRow } from './member-list-row'
import {
  ParliamentBackLink,
  ParliamentPageFrame,
} from './parliament-page-frame'

type Props = {
  readonly groupId: string
}

/** Group detail at /parlament/grupuri/$groupId */
export function ParliamentGroupDetailPage({ groupId }: Props) {
  const { data: group, isLoading: groupLoading } = useParliamentGroup(groupId)
  const { data: members = [], isLoading: membersLoading } =
    useParliamentGroupMembers(groupId)

  if (groupLoading) {
    return (
      <ParliamentPageFrame>
        <Skeleton className="h-32 w-full rounded-none" />
      </ParliamentPageFrame>
    )
  }

  if (!group) {
    return (
      <ParliamentPageFrame>
        <ParliamentBackLink to="/parlament" search={{ tab: 'grupuri' }} label="Grupuri" />
        <p className="text-muted-foreground">Grupul parlamentar nu a fost găsit.</p>
      </ParliamentPageFrame>
    )
  }

  return (
    <ParliamentPageFrame className="space-y-8">
      <ParliamentBackLink to="/parlament" search={{ tab: 'grupuri' }} label="Grupuri" />

      <header className="border-b border-border pb-6">
        <h1
          className="font-black leading-tight tracking-tight"
          style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}
        >
          {group.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {getChamberLabel(group.chamber)} · {group.memberCount} membri
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Membri
        </h2>
        {membersLoading ? (
          <Skeleton className="h-48 w-full rounded-none" />
        ) : (
          <div>
            {members.map((m) => (
              <MemberListRow key={m.memberId} member={m} />
            ))}
          </div>
        )}
      </section>
    </ParliamentPageFrame>
  )
}
