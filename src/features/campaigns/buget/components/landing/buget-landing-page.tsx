import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BarChart3, MapPin, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import mapPreview from '@/assets/images/map.png'
import chartPreview from '@/assets/images/chart.png'
import entityAnalyticsPreview from '@/assets/images/entity-analytics.png'
import { Button } from '@/components/ui/button'
import { Analytics } from '@/lib/analytics'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import { getCampaignDefinition, getCampaignText } from '../../hooks/use-campaign-content'
import type { CampaignLocale } from '../../types'

type BugetLandingPageProps = {
  readonly locale: CampaignLocale
}

type LandingStoryItem = {
  readonly stepNumber: number
  readonly title: ReactNode
  readonly description: string
  readonly icon: LucideIcon
  readonly image: string
}

export function BugetLandingPage({ locale }: BugetLandingPageProps) {
  const campaign = getCampaignDefinition()

  const storyItems: readonly LandingStoryItem[] =
    locale === 'en'
      ? [
          {
            stepNumber: 1,
            title: 'Find your local budget fast',
            description: 'See in minutes how much money is planned for schools, roads, and local services.',
            icon: MapPin,
            image: mapPreview,
          },
          {
            stepNumber: 2,
            title: 'Identify the differences',
            description: 'Compare this year with previous years and quickly identify the biggest shifts.',
            icon: BarChart3,
            image: chartPreview,
          },
          {
            stepNumber: 3,
            title: 'Turn data into arguments',
            description: 'Leave with clear arguments you can use in public debates and official requests.',
            icon: Megaphone,
            image: entityAnalyticsPreview,
          },
        ]
      : [
          {
            stepNumber: 1,
            title: (
              <>
                Găsești rapid <span className="font-black">bugetul</span> localității tale
              </>
            ),
            description: 'Vezi în câteva minute câți bani merg spre școli, străzi și servicii locale.',
            icon: MapPin,
            image: mapPreview,
          },
          {
            stepNumber: 2,
            title: (
              <>
                Identifici <span className="font-black">diferențele</span>
              </>
            ),
            description: 'Compari anii și identifici rapid diferențele care contează pentru comunitatea ta.',
            icon: BarChart3,
            image: chartPreview,
          },
          {
            stepNumber: 3,
            title: (
              <>
                Transformi datele în <span className="font-black">argumente</span>
              </>
            ),
            description: 'Pleci cu întrebări clare pentru dezbateri publice, sesizări și dialog cu primăria.',
            icon: Megaphone,
            image: entityAnalyticsPreview,
          },
        ]

  const paragraph =
    locale === 'en'
      ? 'Follow a short quest from “Where does the money go?” to “What can I do next?”.'
      : 'Parcurgi o misiune scurtă: de la „unde merg banii” la „ce pot face concret mai departe”.'

  const ctaLabel = locale === 'en' ? 'Start the challenge' : 'Începe provocarea'

  return (
    <section className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-700 px-2 py-2 sm:px-4 sm:py-4 lg:max-w-3xl">
      <div className="rounded-[40px] border border-border/40 bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 shadow-xl shadow-primary/5 sm:p-10 md:p-12">
        <div className="space-y-5 text-center">
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {getCampaignText(campaign.title, locale)}
          </h1>
          <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
            {paragraph}
          </p>
        </div>

        <div className="mt-8 space-y-4 text-center">
          <ul className="mx-auto w-full max-w-3xl space-y-3">
            {storyItems.map((item) => {
              const Icon = item.icon
              return (
                <li
                  key={item.stepNumber}
                  className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/90 shadow-sm"
                >
                  <div className="absolute inset-0 z-0">
                    <img
                      src={item.image}
                      alt=""
                      aria-hidden="true"
                      width={1200}
                      height={630}
                      loading="lazy"
                      className="absolute right-0 top-1/2 h-[160%] w-auto max-w-none -translate-y-1/2 translate-x-[28%] object-cover opacity-38 blur-[0.01px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background from-[0%] via-background/95 via-[58%] to-transparent to-[90%] dark:from-zinc-950 dark:via-zinc-950/92 dark:to-transparent" />
                  </div>

                  <div className="relative z-10 flex min-h-[160px] items-center justify-start p-5 sm:p-7">
                    <div className="flex w-full items-start gap-4 sm:gap-5">
                      <span className="relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-white ring-1 ring-blue-100/40 shadow-sm dark:bg-blue-900 dark:text-white dark:ring-blue-100/35">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-zinc-400 bg-white px-1 text-[10px] font-black text-zinc-950 shadow-sm dark:border-zinc-700">
                          {item.stepNumber}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1 space-y-2 text-left sm:pr-4">
                        <p className="text-xl font-semibold leading-tight text-foreground md:whitespace-nowrap sm:text-2xl">
                          {item.title}
                        </p>
                        <p className="max-w-[46ch] text-base leading-relaxed text-muted-foreground sm:text-lg lg:max-w-[36ch]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            asChild
            size="lg"
            className="group h-16 w-full max-w-md rounded-2xl border border-blue-200/20 bg-gradient-to-r from-blue-700 via-blue-800 to-blue-950 px-7 text-lg font-black tracking-tight text-white shadow-[0_18px_34px_-14px_rgba(30,58,138,0.9)] transition-[transform,box-shadow,filter] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_24px_42px_-12px_rgba(30,58,138,0.95)] focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:h-[4.25rem] sm:w-auto sm:min-w-[340px] sm:px-10 sm:text-xl"
          >
            <Link
              to={`${CAMPAIGN_BASE_PATH}/cauta` as '/'}
              search={locale === 'en' ? { lang: 'en' } : {}}
              onClick={() => {
                Analytics.capture(Analytics.EVENTS.CampaignLandingCtaToSearchClicked, {
                  source: 'landing',
                })
              }}
            >
              {ctaLabel}
              <span className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30 sm:h-9 sm:w-9">
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5 sm:h-5 sm:w-5" aria-hidden="true" />
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
