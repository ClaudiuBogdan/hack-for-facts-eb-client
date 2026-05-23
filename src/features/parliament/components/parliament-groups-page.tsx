import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentGroups } from '../hooks/use-parliament-data'
import { GroupListRow } from './group-list-row'

/** Groups tab content */
export function ParliamentGroupsContent() {
  const { data: groups = [], isLoading } = useParliamentGroups()

  const cameraGroups = groups.filter((g) => g.chamber === 'camera')
  const senatGroups = groups.filter((g) => g.chamber === 'senat')

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 border-b border-border pb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Camera Deputaților
        </h2>
        {cameraGroups.map((g) => (
          <GroupListRow key={g.groupId} group={g} />
        ))}
      </section>
      <section>
        <h2 className="mb-4 border-b border-border pb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Senat
        </h2>
        {senatGroups.map((g) => (
          <GroupListRow key={g.groupId} group={g} />
        ))}
      </section>
    </div>
  )
}
