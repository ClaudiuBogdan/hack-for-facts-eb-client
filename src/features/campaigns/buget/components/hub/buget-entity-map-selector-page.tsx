import { useCallback, useEffect, useState } from 'react'
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
import { FUNKY_CAMPAIGN_KEY } from '@/features/notifications/campaign-notification-keys'
import { Analytics } from '@/lib/analytics'
import { SubscriptionCounter } from '../stats/subscription-counter'
import { CampaignParticipantsMap } from './campaign-participants-map'
import {
  CAMPAIGN_ENTITY_SELECTOR_PATH,
} from '../../constants'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import { useSubscriptionStats } from '../../hooks/use-subscription-stats'
import { useUatCuiMap } from '../../hooks/use-uat-cui-map'
import type { CampaignLocale } from '../../types'
import {
  buildSelectorSearchState,
  resolveEntitySelectionNavigationTarget,
} from '../../utils/entity-selector-navigation'

type BugetEntityMapSelectorPageProps = {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
  readonly redirectUri?: string
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

export function BugetEntityMapSelectorPage({
  locale,
  languageQuery,
  redirectUri,
}: BugetEntityMapSelectorPageProps) {
  const navigate = useNavigate({ from: '/primarie/harta/' })
  const { setSelectedEntity } = useCampaignProgress()
  const [pendingUatSelection, setPendingUatSelection] = useState<PendingUatSelection | null>(null)
  const [isResolvingSelection, setIsResolvingSelection] = useState(false)
  const {
    total: totalSubscriptions,
    isLoading: isSubscriptionStatsLoading,
    isError: isSubscriptionStatsError,
  } = useSubscriptionStats(FUNKY_CAMPAIGN_KEY)
  const { data: uatCuiMap } = useUatCuiMap()

  useEffect(() => {
    Analytics.capture(Analytics.EVENTS.CampaignEntityMapSelectorOpened)
  }, [])

  const handleConfirmUatSelection = useCallback(
    async (selection: PendingUatSelection) => {
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

      const navigationTarget = resolveEntitySelectionNavigationTarget({
        entityCui,
        languageQuery,
        redirectUri,
      })

      setSelectedEntity({ entityCui })
      setIsResolvingSelection(true)

      try {
        await navigate({
          to: navigationTarget.to as '/',
          search: navigationTarget.search,
          replace: true,
        })
        setPendingUatSelection(null)
      } catch {
        setPendingUatSelection(null)
      } finally {
        setIsResolvingSelection(false)
      }
    },
    [languageQuery, locale, navigate, redirectUri, setSelectedEntity, uatCuiMap],
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
      ? 'Click the UAT area you are interested in. You can zoom in and move the map using the +/- buttons from the top left corner.'
      : 'Dă click pe UAT-ul care te interesează. Poți mări și muta harta folosind butoanele +/- din colțul din stânga sus.'
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
  const selectedEntityDialogLabel = formatCityHallLabel(selectedUatName, locale)

  return (
    <section className="mx-auto max-w-5xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0 self-start">
          <Link
            to={CAMPAIGN_ENTITY_SELECTOR_PATH as '/'}
            search={buildSelectorSearchState({
              languageQuery,
              redirectUri,
            })}
          >
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
          {locale === 'en' ? 'Campaign reach' : 'Participare în campanie'}
        </p>
        {isSubscriptionStatsError ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {locale === 'en'
              ? 'Subscription stats are temporarily unavailable.'
              : 'Statisticile de abonare sunt temporar indisponibile.'}
          </p>
        ) : (
          <div className="mt-3">
            <SubscriptionCounter
              count={totalSubscriptions}
              label={locale === 'en' ? 'campaign subscribers' : 'abonați în campanie'}
              isLoading={isSubscriptionStatsLoading}
            />
          </div>
        )}
      </div>

      <CampaignParticipantsMap
        locale={locale}
        mapHeightClassName="h-[calc(100svh-10rem)] sm:h-[70vh]"
        onUatSelect={requestUatSelectionConfirmation}
      />

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
                void handleConfirmUatSelection(pendingUatSelection)
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
