import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MapPinned } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntitySearchInput } from '@/components/entities/EntitySearch'
import { useIsMobile } from '@/hooks/use-mobile'
import { Analytics } from '@/lib/analytics'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import {
  CAMPAIGN_ENTITY_SELECTOR_MAP_PATH,
} from '../../constants'
import type { CampaignLocale } from '../../types'
import { RecentUatBadges } from './recent-uat-badges'

export type EntitySelection = {
  readonly cui: string
  readonly name: string
  readonly entityType?: string | null
  readonly countyName?: string | null
}

type BugetEntitySelectorGateProps = {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
  readonly onEntitySelected: (entity: EntitySelection) => void
}

export function BugetEntitySelectorGate({
  locale,
  languageQuery,
  onEntitySelected,
}: BugetEntitySelectorGateProps) {
  const isMobile = useIsMobile()
  const [hasMounted, setHasMounted] = useState(false)
  const { addRecentEntity } = useRecentEntities()

  useEffect(() => {
    Analytics.capture(Analytics.EVENTS.CampaignEntitySelectorOpened)
  }, [])

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const handleSelect = useCallback(
    (entity: EntitySelection) => {
      addRecentEntity({
        cui: entity.cui,
        name: entity.name,
        entity_type: entity.entityType,
        is_uat: true,
      })
      Analytics.capture(Analytics.EVENTS.CampaignEntitySelectedFromSearch, {
        source: 'search',
        entityCui: entity.cui,
      })
      onEntitySelected(entity)
    },
    [addRecentEntity, onEntitySelected],
  )

  const handleBadgeSelect = useCallback(
    (entityCui: string) => {
      Analytics.capture(Analytics.EVENTS.CampaignEntitySelectedFromSearch, {
        source: 'recent-badge',
        entityCui,
      })
      // Badges don't carry name/type — pass CUI only
      onEntitySelected({ cui: entityCui, name: '' })
    },
    [onEntitySelected],
  )

  const title =
    locale === 'en' ? 'Find your city hall first' : 'Alege mai întâi primăria ta'
  const description =
    locale === 'en'
      ? 'Start by selecting your local administration. You can search by name or pick directly from the map.'
      : 'Începe prin selectarea administrației tale locale. Poți căuta după nume sau alege direct din hartă.'
  const mapLabel =
    locale === 'en' ? 'Choose from map' : 'Alege de pe hartă'
  const separatorLabel = locale === 'en' ? 'or' : 'sau'
  const searchPlaceholder =
    locale === 'en'
      ? 'Search city hall by name or CUI...'
      : 'Caută primăria după nume sau CUI...'

  return (
    <section className="flex min-h-[calc(100svh-8rem)] flex-col items-center px-4 pt-12 sm:px-6 sm:pt-[15vh]">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
            {description}
          </p>
        </div>

        <div className="space-y-4">
          <EntitySearchInput
            placeholder={searchPlaceholder}
            selectionBehavior="callback-only"
            entitySearchFilter={{ isUat: true, excludeCounty: true }}
            autoFocus={hasMounted && !isMobile}
            onSelect={(entity) =>
              handleSelect({
                cui: entity.cui,
                name: entity.name,
                entityType: entity.entity_type,
                countyName: entity.uat?.county_name,
              })
            }
          />

          <RecentUatBadges locale={locale} onSelect={handleBadgeSelect} />
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border/70" />
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            {separatorLabel}
          </p>
          <div className="h-px flex-1 bg-border/70" />
        </div>

        <div className="flex justify-center">
          <Button asChild variant="outline" className="h-11 rounded-xl px-5 text-sm font-semibold">
            <Link
              to={CAMPAIGN_ENTITY_SELECTOR_MAP_PATH as '/'}
              search={languageQuery === 'en' ? { lang: 'en' } : {}}
            >
              <MapPinned className="mr-2 h-4 w-4" />
              {mapLabel}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
