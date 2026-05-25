import type {
  ParliamentChamberComposition,
  ParliamentGroup,
} from '@/schemas/parliament'
import { PartyLegendCard } from './party-legend-card'

type Props = {
  readonly composition: ParliamentChamberComposition
}

function getGroupCounts(
  composition: ParliamentChamberComposition,
): Map<string, { readonly active: number; readonly total: number }> {
  const counts = new Map<string, { active: number; total: number }>()

  for (const seat of composition.seats) {
    const current = counts.get(seat.groupId) ?? { active: 0, total: 0 }
    counts.set(seat.groupId, {
      active: current.active + (seat.isActive ? 1 : 0),
      total: current.total + 1,
    })
  }

  return counts
}

/** Responsive grid of party legend cards */
export function PartyLegendGrid({ composition }: Props) {
  if (composition.groups.length === 0) {
    return null
  }

  const countsByGroup = getGroupCounts(composition)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {composition.groups.map((group: ParliamentGroup) => {
        const counts = countsByGroup.get(group.groupId) ?? {
          active: 0,
          total: group.memberCount,
        }

        return (
          <PartyLegendCard
            key={group.groupId}
            group={group}
            activeCount={counts.active}
            totalCount={counts.total}
            hasActiveFilters={composition.hasActiveFilters}
          />
        )
      })}
    </div>
  )
}
