import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import { useParliamentMembers } from '../hooks/use-parliament-data'
import { FindRepDialog } from './find-rep-dialog'
import { MemberListRow } from './member-list-row'
import { MembersFilters } from './members-filters'

type Props = {
  readonly search: ParliamentMembersSearch
  readonly findOpen: boolean
  readonly onFindOpenChange: (open: boolean) => void
}

/** Members directory tab content */
export function ParliamentMembersContent({
  search,
  findOpen,
  onFindOpenChange,
}: Props) {
  const navigate = useNavigate({ from: '/parlament/' })
  const { data, isLoading } = useParliamentMembers(search)

  useEffect(() => {
    if (search.find === '1' || search.find === 1) {
      onFindOpenChange(true)
    }
  }, [search.find, onFindOpenChange])

  const handleSearchChange = (next: ParliamentMembersSearch) => {
    void navigate({
      search: {
        ...next,
        tab: 'membri',
        find: undefined,
      },
      replace: true,
    })
  }

  return (
    <>
      <MembersFilters search={search} onSearchChange={handleSearchChange} />

      <div className="mt-6">
        {data ? (
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            {data.total} rezultate
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-none" />
            ))}
          </div>
        ) : data && data.members.length > 0 ? (
          <div>
            {data.members.map((member) => (
              <MemberListRow key={member.memberId} member={member} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            Niciun membru nu corespunde căutării.
          </p>
        )}
      </div>

      <FindRepDialog open={findOpen} onOpenChange={onFindOpenChange} />
    </>
  )
}
