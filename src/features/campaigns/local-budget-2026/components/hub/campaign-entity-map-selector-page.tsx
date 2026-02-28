import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
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
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { Analytics } from '@/lib/analytics'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import { useUatCuiMap } from '../../hooks/use-uat-cui-map'
import type { CampaignLocale } from '../../types'

const CampaignEntityMapSelectorMap = lazy(() =>
  import('./campaign-entity-map-selector-map').then((module) => ({
    default: module.CampaignEntityMapSelectorMap,
  })),
)

type CampaignEntityMapSelectorPageProps = {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
}

type PendingUatSelection = {
  readonly natcode: string
  readonly name: string
}

function getPrincipalSearch(languageQuery: CampaignLocale | undefined, entityCui?: string) {
  return {
    ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
    ...(entityCui ? { entityCui } : {}),
  }
}

export function CampaignEntityMapSelectorPage({
  locale,
  languageQuery,
}: CampaignEntityMapSelectorPageProps) {
  const navigate = useNavigate({ from: '/bugete-locale-2026/cauta/harta/' })
  const [pendingUatSelection, setPendingUatSelection] = useState<PendingUatSelection | null>(null)
  const {
    data: uatGeoJson,
    isLoading: isLoadingUatGeoJson,
    error: uatGeoJsonError,
  } = useGeoJsonData('UAT')
  const {
    data: countyGeoJson,
    isLoading: isLoadingCountyGeoJson,
    error: countyGeoJsonError,
  } = useGeoJsonData('County')
  const { data: uatCuiMap, isLoading: isLoadingUatCuiMap, error: uatCuiMapError } = useUatCuiMap()

  useEffect(() => {
    Analytics.capture(Analytics.EVENTS.CampaignEntityMapSelectorOpened)
  }, [])

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

      void navigate({
        to: `${CAMPAIGN_BASE_PATH}/principal` as '/',
        search: getPrincipalSearch(languageQuery, entityCui),
        replace: true,
      })
      setPendingUatSelection(null)
    },
    [languageQuery, locale, navigate, uatCuiMap],
  )

  const requestUatSelectionConfirmation = useCallback(
    ({ natcode, name }: PendingUatSelection) => {
      setPendingUatSelection({
        natcode,
        name,
      })
    },
    [],
  )

  const title =
    locale === 'en'
      ? 'Pick your city hall directly from the map'
      : 'Alege primăria direct de pe hartă'
  const description =
    locale === 'en'
      ? 'Click the UAT area you are interested in. County borders are highlighted for orientation.'
      : 'Dă click pe UAT-ul care te interesează. Granițele județelor sunt evidențiate pentru orientare.'
  const backLabel =
    locale === 'en'
      ? 'Back to search'
      : 'Înapoi la căutare'
  const confirmDialogTitle =
    locale === 'en'
      ? 'Select this city hall?'
      : 'Selectezi această primărie?'
  const confirmButtonLabel =
    locale === 'en'
      ? 'Select city hall'
      : 'Selectează primăria'
  const cancelButtonLabel = locale === 'en' ? 'Cancel' : 'Anulează'
  const selectedUatName = pendingUatSelection?.name || pendingUatSelection?.natcode || ''
  const selectedEntityDialogLabel = selectedUatName.toLowerCase().startsWith('primaria ')
    ? selectedUatName
    : `Primăria ${selectedUatName}`

  const isLoading = isLoadingUatGeoJson || isLoadingCountyGeoJson || isLoadingUatCuiMap
  const error = uatGeoJsonError || countyGeoJsonError || uatCuiMapError

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 sm:text-base">{description}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link
            to={`${CAMPAIGN_BASE_PATH}/cauta` as '/'}
            search={languageQuery === 'en' ? { lang: 'en' } : {}}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
        {isLoading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <LoadingSpinner size="lg" text={locale === 'en' ? 'Loading map...' : 'Se încarcă harta...'} />
          </div>
        ) : null}

        {error ? (
          <div className="flex h-[70vh] items-center justify-center text-sm text-red-600 dark:text-red-400">
            {locale === 'en'
              ? 'Failed to load the selector map. Please refresh the page.'
              : 'Nu am putut încărca harta de selecție. Reîncarcă pagina.'}
          </div>
        ) : null}

        {!isLoading && !error && uatGeoJson && countyGeoJson ? (
          <ClientOnly
            fallback={
              <div className="flex h-[70vh] items-center justify-center">
                <LoadingSpinner size="lg" text={locale === 'en' ? 'Loading map...' : 'Se încarcă harta...'} />
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex h-[70vh] items-center justify-center">
                  <LoadingSpinner size="lg" text={locale === 'en' ? 'Loading map...' : 'Se încarcă harta...'} />
                </div>
              }
            >
              <CampaignEntityMapSelectorMap
                uatGeoJson={uatGeoJson}
                countyGeoJson={countyGeoJson}
                onUatSelect={requestUatSelectionConfirmation}
              />
            </Suspense>
          </ClientOnly>
        ) : null}
      </div>

      <Dialog
        open={Boolean(pendingUatSelection)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
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
              onClick={() => {
                setPendingUatSelection(null)
              }}
            >
              {cancelButtonLabel}
            </Button>
            <Button
              type="button"
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
