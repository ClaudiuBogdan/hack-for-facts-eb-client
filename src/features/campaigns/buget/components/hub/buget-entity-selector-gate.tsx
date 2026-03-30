import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useIsMobile } from '@/hooks/use-mobile'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { Analytics } from '@/lib/analytics'
import { useRecentEntities } from '@/hooks/useRecentEntities'
import { useUatCuiMap } from '../../hooks/use-uat-cui-map'
import type { CampaignLocale } from '../../types'
import { RecentUatBadges } from './recent-uat-badges'

const BugetEntityMapSelectorMap = lazy(() =>
  import('./buget-entity-map-selector-map').then((module) => ({
    default: module.BugetEntityMapSelectorMap,
  })),
)

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  languageQuery: _languageQuery,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  redirectUri: _redirectUri,
  onEntitySelected,
}: BugetEntitySelectorGateProps) {
  const isMobile = useIsMobile()
  const [hasMounted, setHasMounted] = useState(false)
  const { addRecentEntity } = useRecentEntities()

  // Map state
  const [pendingUatSelection, setPendingUatSelection] = useState<PendingUatSelection | null>(null)
  const [isResolvingSelection, setIsResolvingSelection] = useState(false)
  const { data: uatGeoJson, isLoading: isLoadingUatGeoJson, error: uatGeoJsonError } = useGeoJsonData('UAT')
  const { data: countyGeoJson, isLoading: isLoadingCountyGeoJson, error: countyGeoJsonError } = useGeoJsonData('County')
  const { data: uatCuiMap, isLoading: isLoadingUatCuiMap, error: uatCuiMapError } = useUatCuiMap()

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

  const isMapLoading = isLoadingUatGeoJson || isLoadingCountyGeoJson || isLoadingUatCuiMap
  const mapError = uatGeoJsonError || countyGeoJsonError || uatCuiMapError

  const mapPlaceholder = (
    <div className="flex h-[40vh] sm:h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" text={locale === 'en' ? 'Loading map...' : 'Se încarcă harta...'} />
    </div>
  )

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
      <div className="mt-12">
        <div className="mx-auto flex max-w-md items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-border/70" />
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            {mapSectionLabel}
          </p>
          <div className="h-px flex-1 bg-border/70" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50 h-[40vh] sm:h-[50vh] [&_.leaflet-container]:h-full!">
          {isMapLoading ? mapPlaceholder : null}

          {mapError ? (
            <div className="flex h-[40vh] sm:h-[50vh] flex-col items-center justify-center gap-3 text-sm text-red-600 dark:text-red-400">
              <p>
                {locale === 'en'
                  ? 'Failed to load the map.'
                  : 'Nu am putut încărca harta.'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {locale === 'en' ? 'Refresh page' : 'Reincarca pagina'}
              </Button>
            </div>
          ) : null}

          {!isMapLoading && !mapError && uatGeoJson && countyGeoJson ? (
            <ClientOnly fallback={mapPlaceholder}>
              <Suspense fallback={mapPlaceholder}>
                <BugetEntityMapSelectorMap
                  uatGeoJson={uatGeoJson}
                  countyGeoJson={countyGeoJson}
                  locale={locale}
                  onUatSelect={({ natcode, name }) => {
                    setPendingUatSelection({ natcode, name })
                  }}
                />
              </Suspense>
            </ClientOnly>
          ) : null}
        </div>
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
