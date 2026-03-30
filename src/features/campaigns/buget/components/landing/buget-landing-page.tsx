import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BarChart3, MapPin, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import mapPreview from '@/assets/images/map.png'
import chartPreview from '@/assets/images/chart.png'
import entityAnalyticsPreview from '@/assets/images/entity-analytics.png'
import { Button } from '@/components/ui/button'
import { Analytics } from '@/lib/analytics'
import { CAMPAIGN_ENTITY_SELECTOR_PATH } from '../../constants'
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

function CtaButton({
  locale,
  ctaLabel,
  source,
}: {
  readonly locale: CampaignLocale
  readonly ctaLabel: string
  readonly source: string
}) {
  return (
    <Button
      asChild
      size="lg"
      className="h-12 rounded-full px-8 text-base font-semibold"
    >
      <Link
        to={CAMPAIGN_ENTITY_SELECTOR_PATH as '/'}
        search={locale === 'en' ? { lang: 'en' } : {}}
        onClick={() => {
          Analytics.capture(
            Analytics.EVENTS.CampaignLandingCtaToSearchClicked,
            { source },
          )
        }}
      >
        {ctaLabel}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  )
}

export function BugetLandingPage({ locale }: BugetLandingPageProps) {
  const campaign = getCampaignDefinition()

  const storyItems: readonly LandingStoryItem[] =
    locale === 'en'
      ? [
          {
            stepNumber: 1,
            title: 'Find your local budget fast',
            description:
              'See in minutes how much money is planned for schools, roads, and local services.',
            icon: MapPin,
            image: mapPreview,
          },
          {
            stepNumber: 2,
            title: 'Identify the differences',
            description:
              'Compare this year with previous years and quickly identify the biggest shifts.',
            icon: BarChart3,
            image: chartPreview,
          },
          {
            stepNumber: 3,
            title: 'Turn data into arguments',
            description:
              'Leave with clear arguments you can use in public debates and official requests.',
            icon: Megaphone,
            image: entityAnalyticsPreview,
          },
        ]
      : [
          {
            stepNumber: 1,
            title: (
              <>
                Găsești rapid <strong>bugetul</strong> localității tale
              </>
            ),
            description:
              'Vezi în câteva minute câți bani merg spre școli, străzi și servicii locale.',
            icon: MapPin,
            image: mapPreview,
          },
          {
            stepNumber: 2,
            title: (
              <>
                Identifici <strong>diferențele</strong>
              </>
            ),
            description:
              'Compari anii și identifici rapid diferențele care contează pentru comunitatea ta.',
            icon: BarChart3,
            image: chartPreview,
          },
          {
            stepNumber: 3,
            title: (
              <>
                Transformi datele în <strong>argumente</strong>
              </>
            ),
            description:
              'Pleci cu întrebări clare pentru dezbateri publice, sesizări și dialog cu primăria.',
            icon: Megaphone,
            image: entityAnalyticsPreview,
          },
        ]

  const subtitle =
    locale === 'en'
      ? 'A short civic quest: from "where does the money go?" to "what can I actually do?"'
      : 'O misiune civică scurtă: de la "unde merg banii" la "ce pot face concret".'

  const ctaLabel =
    locale === 'en' ? 'Start the challenge' : 'Începe provocarea'

  return (
    <section className="mx-auto max-w-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 px-5 py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <div className="space-y-5">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.08]">
          {getCampaignText(campaign.title, locale)}
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        <div className="pt-1">
          <CtaButton locale={locale} ctaLabel={ctaLabel} source="landing" />
        </div>
      </div>

      {/* Steps */}
      <div className="mt-20 space-y-16 sm:mt-24 sm:space-y-20">
        {storyItems.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.stepNumber} className="space-y-5">
              <div className="space-y-3">
                <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight text-foreground sm:text-3xl [&_strong]:font-bold">
                  <Icon className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" aria-hidden="true" />
                  {item.title}
                </h2>
                <p className="max-w-md pl-9 text-base leading-relaxed text-muted-foreground sm:pl-10 sm:text-lg">
                  {item.description}
                </p>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/40 bg-secondary shadow-md shadow-black/5">
                <img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  width={1200}
                  height={630}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover object-top"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-20 sm:mt-24">
        <div className="-mx-5 rounded-3xl bg-secondary/60 px-6 py-10 sm:px-10 sm:py-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {locale === 'en'
                ? 'Ready to start?'
                : 'Pregătit să începi?'}
            </h3>
            <p className="max-w-md text-base text-muted-foreground sm:text-lg">
              {locale === 'en'
                ? 'Pick your city hall and follow the guided steps. It only takes a few minutes.'
                : 'Alege primăria ta și urmează pașii ghidați. Durează doar câteva minute.'}
            </p>
            <div className="pt-2">
              <CtaButton
                locale={locale}
                ctaLabel={ctaLabel}
                source="landing-bottom"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
