import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useInView } from 'react-intersection-observer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EntitySearchInput } from '@/components/entities/EntitySearch'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-mobile'
import { Analytics } from '@/lib/analytics'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import { FUNKY_CAMPAIGN_KEY } from '@/features/notifications/campaign-notification-keys'
import { useSubscriptionStats } from '../../hooks/use-subscription-stats'
import { useUatCuiMap } from '../../hooks/use-uat-cui-map'
import type { CampaignLocale } from '../../types'
import { normalizeSirutaCode } from '../../utils/normalize-siruta-code'
import { CampaignParticipantsMap } from './campaign-participants-map'
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
  readonly redirectUri?: string
  readonly onEntitySelected: (entity: EntitySelection) => void
}

type PendingUatSelection = {
  readonly natcode: string
  readonly name: string
}

function formatCityHallLabel(label: string, locale: CampaignLocale): string {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) {
    return locale === 'en' ? 'City Hall' : 'Primăria'
  }

  const lowerLabel = trimmedLabel.toLowerCase()
  const hasRomanianPrefix = lowerLabel.startsWith('primăria ') || lowerLabel.startsWith('primaria ')
  const hasEnglishPrefix = lowerLabel.startsWith('city hall ')

  if (locale === 'en') {
    if (hasEnglishPrefix) return trimmedLabel
    if (hasRomanianPrefix) {
      const strippedLabel = lowerLabel.startsWith('primăria ')
        ? trimmedLabel.slice('primăria '.length)
        : trimmedLabel.slice('primaria '.length)
      return `City Hall ${strippedLabel}`
    }
    return `City Hall ${trimmedLabel}`
  }

  if (lowerLabel.startsWith('primăria ')) return trimmedLabel
  if (lowerLabel.startsWith('primaria ')) {
    return `Primăria ${trimmedLabel.slice('primaria '.length)}`
  }
  if (hasEnglishPrefix) {
    return `Primăria ${trimmedLabel.slice('city hall '.length)}`
  }
  return `Primăria ${trimmedLabel}`
}

export function BugetEntitySelectorGate({
  locale,
  languageQuery: _languageQuery,
  redirectUri: _redirectUri,
  onEntitySelected,
}: BugetEntitySelectorGateProps) {
  const isMobile = useIsMobile()
  const [hasMounted, setHasMounted] = useState(false)
  const { addRecentEntity } = useRecentEntities()
  const { ref: mapSectionRef, inView: isMapSectionInView } = useInView({
    triggerOnce: true,
    threshold: 0.15,
  })
  const {
    perUat,
    isLoading: isSubscriptionStatsLoading,
    isError: isSubscriptionStatsError,
  } = useSubscriptionStats(FUNKY_CAMPAIGN_KEY)

  // Map state
  const [pendingUatSelection, setPendingUatSelection] = useState<PendingUatSelection | null>(null)
  const [isResolvingSelection, setIsResolvingSelection] = useState(false)
  const {
    data: uatCuiMap,
    isLoading: isUatCuiMapLoading,
    isError: isUatCuiMapError,
  } = useUatCuiMap()

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
      onEntitySelected({ cui: entityCui, name: '' })
    },
    [onEntitySelected],
  )

  const handleConfirmUatSelection = useCallback(
    (selection: PendingUatSelection) => {
      const { natcode, name } = selection
      const entityCui = uatCuiMap?.natcodeToCuiMap.get(natcode)
      if (!entityCui) {
        toast.warning(
          locale === 'en'
            ? `Could not map ${name || 'this locality'} to an entity yet.`
            : `Nu am găsit încă maparea pentru ${name || 'această localitate'}.`,
        )
        setPendingUatSelection(null)
        return
      }

      Analytics.capture(Analytics.EVENTS.CampaignEntitySelectedFromMap, {
        source: 'map',
        natcode,
        entityCui,
      })

      setIsResolvingSelection(true)
      setPendingUatSelection(null)
      onEntitySelected({ cui: entityCui, name })
      setIsResolvingSelection(false)
    },
    [locale, onEntitySelected, uatCuiMap],
  )

  const title =
    locale === 'en' ? 'Find your city hall first' : 'Alege mai întâi primăria ta'
  const description =
    locale === 'en'
      ? 'Start by selecting your local administration. You can search by name or pick directly from the map.'
      : 'Începe prin selectarea administrației tale locale. Poți căuta după nume sau alege direct din hartă.'
  const searchPlaceholder =
    locale === 'en'
      ? 'Search city hall by name or CUI...'
      : 'Caută primăria după nume sau CUI...'
  const mapSectionLabel =
    locale === 'en' ? 'or choose from the map' : 'sau alege de pe hartă'
  const confirmDialogTitle =
    locale === 'en' ? 'Select this city hall?' : 'Selectezi această primărie?'
  const confirmButtonLabel =
    locale === 'en' ? 'Select city hall' : 'Selectează primăria'
  const cancelButtonLabel = locale === 'en' ? 'Cancel' : 'Anulează'
  const selectedUatName = pendingUatSelection?.name || pendingUatSelection?.natcode || ''
  const selectedEntityDialogLabel = formatCityHallLabel(selectedUatName, locale)

  const subscriptionCountByEntityCui = useMemo(() => {
    if (!uatCuiMap) {
      return new Map<string, number>()
    }

    const countBySirutaCode = new Map(
      perUat.map((entry) => [normalizeSirutaCode(entry.sirutaCode), entry.count]),
    )
    const next = new Map<string, number>()

    for (const [cui, natcode] of uatCuiMap.cuiToNatcodeMap.entries()) {
      next.set(cui, countBySirutaCode.get(normalizeSirutaCode(natcode)) ?? 0)
    }

    return next
  }, [perUat, uatCuiMap])

  const renderSearchResultTrailing = useCallback((entity: EntitySelection) => {
    if (isSubscriptionStatsLoading || isUatCuiMapLoading) {
      return <Skeleton className="h-6 w-12 rounded-full" />
    }

    if (isSubscriptionStatsError || isUatCuiMapError) {
      return (
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          --
        </span>
      )
    }

    const count = subscriptionCountByEntityCui.get(entity.cui) ?? 0
    const srLabel =
      locale === 'en'
        ? `${count.toLocaleString('en-US')} participants`
        : `${count.toLocaleString('ro-RO')} participanți`

    return (
      <span className="inline-flex items-center justify-center rounded-full bg-[#ef2d00]/10 px-2.5 py-1 text-xs font-semibold text-[#c91d00]">
        <span aria-hidden="true">
          {count.toLocaleString(locale === 'en' ? 'en-US' : 'ro-RO')}
        </span>
        <span className="sr-only">{srLabel}</span>
      </span>
    )
  }, [
    isSubscriptionStatsError,
    isSubscriptionStatsLoading,
    isUatCuiMapError,
    isUatCuiMapLoading,
    locale,
    subscriptionCountByEntityCui,
  ])

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-8 pt-10 sm:px-6 sm:pt-[10vh]">
      {/* Search section */}
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        <div className="space-y-4">
          <EntitySearchInput
            placeholder={searchPlaceholder}
            selectionBehavior="callback-only"
            entitySearchFilter={{ isUat: true, excludeCounty: true }}
            autoFocus={hasMounted && !isMobile}
            renderResultTrailing={(entity) =>
              renderSearchResultTrailing({
                cui: entity.cui,
                name: entity.name,
                entityType: entity.entity_type,
                countyName: entity.uat?.county_name,
              })
            }
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
      </div>

      {/* Map section */}
      <div ref={mapSectionRef} className="mt-12">
        <div className="mx-auto flex max-w-md items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-border/70" />
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            {mapSectionLabel}
          </p>
          <div className="h-px flex-1 bg-border/70" />
        </div>

        <CampaignParticipantsMap
          locale={locale}
          mapHeightClassName="h-[40vh] sm:h-[50vh]"
          shouldHighlightSubscriptions={isMapSectionInView}
          onUatSelect={({ natcode, name }) => {
            setPendingUatSelection({ natcode, name })
          }}
        />
      </div>

      {/* Confirmation dialog */}
      <Dialog
        open={Boolean(pendingUatSelection)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isResolvingSelection) {
            setPendingUatSelection(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialogTitle}</DialogTitle>
            <DialogDescription className="sr-only">{selectedEntityDialogLabel}</DialogDescription>
            <p className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {selectedEntityDialogLabel}
            </p>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isResolvingSelection}
              onClick={() => {
                setPendingUatSelection(null)
              }}
            >
              {cancelButtonLabel}
            </Button>
            <Button
              type="button"
              disabled={isResolvingSelection}
              onClick={() => {
                if (!pendingUatSelection) return
                handleConfirmUatSelection(pendingUatSelection)
              }}
            >
              {confirmButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
