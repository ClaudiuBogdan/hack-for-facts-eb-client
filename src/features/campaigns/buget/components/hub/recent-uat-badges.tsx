import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Building2, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
import type { EntitySearchNode } from '@/schemas/entities'
import { useSuggestedUatSelections } from '../../hooks/use-suggested-uat-selections'
import type { CampaignLocale } from '../../types'

type RecentUatBadgesProps = {
  readonly locale: CampaignLocale
  readonly onSelect: (entityCui: string) => void
}

const UAT_ENTITY_TYPES = new Set([
  'admin_municipality',
  'admin_town_hall',
  'admin_commune_hall',
  'admin_sector_hall',
])

const MAX_BADGES = 5

export function RecentUatBadges({ locale, onSelect }: RecentUatBadgesProps) {
  const { recentEntities } = useRecentEntities()
  const {
    selectedSuggestionCuis,
    rememberSelectedSuggestion,
  } = useSuggestedUatSelections()
  const prefersReducedMotion = useReducedMotion()

  const recentUats = recentEntities.filter(
    (e) => e.entity_type && UAT_ENTITY_TYPES.has(e.entity_type),
  )

  const hasRecent = recentUats.length > 0

  const badges = useMemo(
    () =>
      prioritizeSelectedSuggestions(
        buildAvailableSuggestedUats(recentUats),
        selectedSuggestionCuis,
      ).slice(0, MAX_BADGES),
    [recentUats, selectedSuggestionCuis],
  )

  if (badges.length === 0) return null

  const sectionLabel = locale === 'en' ? 'Suggestions' : 'Sugestii'
  const SectionIcon = hasRecent ? Building2 : Landmark

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
        <SectionIcon className="h-3 w-3" />
        <span>{sectionLabel}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {badges.map((entity, index) => (
          <motion.div
            key={entity.cui}
            initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.04 }}
          >
            <button
              type="button"
              aria-label={formatEntityName(entity.name)}
              onClick={() => {
                rememberSelectedSuggestion(entity.cui)
                onSelect(entity.cui)
              }}
            >
              <Badge
                variant="outline"
                className="cursor-pointer rounded-2xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 shadow-sm transition duration-200 hover:shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                <span className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                  {formatEntityName(entity.name)}
                </span>
              </Badge>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function buildAvailableSuggestedUats(
  recentUats: readonly EntitySearchNode[],
): EntitySearchNode[] {
  const availableUatsByCui = new Map<string, EntitySearchNode>()

  for (const entity of [
    ...recentUats,
    ...PREDEFINED_ENTITIES.filter(
      (predefinedEntity) =>
        predefinedEntity.entity_type &&
        UAT_ENTITY_TYPES.has(predefinedEntity.entity_type),
    ),
  ]) {
    if (!availableUatsByCui.has(entity.cui)) {
      availableUatsByCui.set(entity.cui, entity)
    }
  }

  return Array.from(availableUatsByCui.values())
}

function prioritizeSelectedSuggestions(
  availableUats: readonly EntitySearchNode[],
  selectedSuggestionCuis: readonly string[],
): EntitySearchNode[] {
  const selectedSuggestionOrder = new Map(
    selectedSuggestionCuis.map((entityCui, index) => [entityCui, index]),
  )

  return [...availableUats].sort((leftEntity, rightEntity) => {
    const leftOrder = selectedSuggestionOrder.get(leftEntity.cui)
    const rightOrder = selectedSuggestionOrder.get(rightEntity.cui)

    if (leftOrder === undefined && rightOrder === undefined) {
      return 0
    }

    if (leftOrder === undefined) {
      return 1
    }

    if (rightOrder === undefined) {
      return -1
    }

    return leftOrder - rightOrder
  })
}

const abbreviations: Record<string, string> = {
  municipiul: 'mun.',
  judetul: 'jud.',
  ministerul: 'min.',
}

function formatEntityName(name: string) {
  return name
    .toLocaleLowerCase()
    .split(' ')
    .map((w) => abbreviations[w] ?? w)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
}
