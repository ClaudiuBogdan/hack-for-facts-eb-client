import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { MapPinned } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EntitySearchInput } from '@/components/entities/EntitySearch'
import { Analytics } from '@/lib/analytics'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import type { CampaignLocale } from '../../types'

type CampaignEntitySelectorGateProps = {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
  readonly onEntitySelected: (entityCui: string) => void
}

export function CampaignEntitySelectorGate({
  locale,
  languageQuery,
  onEntitySelected,
}: CampaignEntitySelectorGateProps) {
  useEffect(() => {
    Analytics.capture(Analytics.EVENTS.CampaignEntitySelectorOpened)
  }, [])

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
    <section className="mx-auto w-full max-w-4xl rounded-[40px] border border-border/50 bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 shadow-xl shadow-primary/5 sm:p-10 md:p-12 lg:max-w-3xl lg:min-h-[760px]">
      <div className="space-y-2 text-center">
        <h1 className="text-balance text-4xl font-black leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl">
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
          {description}
        </p>
      </div>

      <div className="mt-8 lg:mt-12">
        <EntitySearchInput
          placeholder={searchPlaceholder}
          selectionBehavior="callback-only"
          entitySearchFilter={{ isUat: true, excludeCounty: true }}
          onSelect={(entity) => {
            Analytics.capture(Analytics.EVENTS.CampaignEntitySelectedFromSearch, {
              source: 'search',
              entityCui: entity.cui,
            })
            onEntitySelected(entity.cui)
          }}
        />
      </div>

      <div className="mt-10 flex items-center gap-4 sm:gap-6">
        <div className="h-px flex-1 bg-border/70" />
        <p className="shrink-0 text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {separatorLabel}
        </p>
        <div className="h-px flex-1 bg-border/70" />
      </div>

      <div className="mt-10 flex justify-center">
        <Button asChild variant="outline" className="h-12 rounded-xl px-6 text-sm font-semibold sm:text-base">
          <Link
            to={`${CAMPAIGN_BASE_PATH}/cauta/harta` as '/'}
            search={languageQuery === 'en' ? { lang: 'en' } : {}}
          >
            <MapPinned className="mr-2 h-4 w-4" />
            {mapLabel}
          </Link>
        </Button>
      </div>
    </section>
  )
}
