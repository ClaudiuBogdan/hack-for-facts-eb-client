import { motion } from 'framer-motion'
import { Building2, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
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

  const recentUats = recentEntities.filter(
    (e) => e.entity_type && UAT_ENTITY_TYPES.has(e.entity_type),
  )

  const hasRecent = recentUats.length > 0

  const badges = hasRecent
    ? recentUats.slice(0, MAX_BADGES)
    : PREDEFINED_ENTITIES.filter(
        (e) => e.entity_type && UAT_ENTITY_TYPES.has(e.entity_type),
      ).slice(0, MAX_BADGES)

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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
          >
            <button type="button" onClick={() => onSelect(entity.cui)}>
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
