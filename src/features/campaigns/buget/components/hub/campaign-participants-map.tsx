import { lazy, Suspense, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { FUNKY_CAMPAIGN_KEY } from '@/features/notifications/campaign-notification-keys'
import { useSubscriptionStats } from '../../hooks/use-subscription-stats'
import type { CampaignLocale } from '../../types'
import { normalizeSirutaCode } from '../../utils/normalize-siruta-code'
import { buildSubscriptionLegendBins } from '../../utils/subscription-scale'

const BugetEntityMapSelectorMap = lazy(() =>
  import('./buget-entity-map-selector-map').then((module) => ({
    default: module.BugetEntityMapSelectorMap,
  })),
)

type CampaignParticipantsMapProps = {
  readonly locale: CampaignLocale
  readonly onUatSelect: (input: { natcode: string; name: string }) => void
  readonly shouldHighlightSubscriptions?: boolean
  readonly shouldLoad?: boolean
  readonly className?: string
  readonly mapHeightClassName?: string
}

export function CampaignParticipantsMap({
  locale,
  onUatSelect,
  shouldHighlightSubscriptions = true,
  shouldLoad = true,
  className,
  mapHeightClassName = 'h-[40vh] sm:h-[50vh]',
}: CampaignParticipantsMapProps) {
  const {
    total: totalSubscriptions,
    perUat,
    isLoading: isSubscriptionStatsLoading,
    isError: isSubscriptionStatsError,
  } = useSubscriptionStats(FUNKY_CAMPAIGN_KEY, {
    enabled: shouldLoad,
  })
  const {
    data: uatGeoJson,
    isLoading: isLoadingUatGeoJson,
    error: uatGeoJsonError,
  } = useGeoJsonData('UAT', { enabled: shouldLoad })
  const {
    data: countyGeoJson,
    isLoading: isLoadingCountyGeoJson,
    error: countyGeoJsonError,
  } = useGeoJsonData('County', { enabled: shouldLoad })

  const subscriptionCountByNatcode = useMemo(() => {
    return new Map(
      perUat.map((entry) => [normalizeSirutaCode(entry.sirutaCode), entry.count]),
    )
  }, [perUat])

  const subscriptionLegendBins = useMemo(
    () => buildSubscriptionLegendBins(perUat.map((entry) => entry.count)),
    [perUat],
  )

  const isMapLoading = shouldLoad && (isLoadingUatGeoJson || isLoadingCountyGeoJson)
  const mapError = uatGeoJsonError || countyGeoJsonError

  const mapPlaceholder = (
    <div className={cn('flex items-center justify-center', mapHeightClassName)}>
      <LoadingSpinner size="lg" text={locale === 'en' ? 'Loading map...' : 'Se încarcă harta...'} />
    </div>
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/50 [&_.leaflet-container]:h-full!',
        mapHeightClassName,
        className,
      )}
    >
      {isMapLoading ? mapPlaceholder : null}

      {mapError ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 text-sm text-red-600 dark:text-red-400',
            mapHeightClassName,
          )}
        >
          <p>
            {locale === 'en'
              ? 'Failed to load the participant map.'
              : 'Nu am putut încărca harta participanților.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            {locale === 'en' ? 'Refresh page' : 'Reîncarcă pagina'}
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
              onUatSelect={onUatSelect}
              highlightSubscriptions={
                shouldHighlightSubscriptions &&
                !isSubscriptionStatsError
              }
              totalParticipants={
                !isSubscriptionStatsLoading && !isSubscriptionStatsError
                  ? totalSubscriptions
                  : undefined
              }
              subscriptionCountsByNatcode={subscriptionCountByNatcode}
              subscriptionLegendBins={subscriptionLegendBins}
            />
          </Suspense>
        </ClientOnly>
      ) : null}
    </div>
  )
}
