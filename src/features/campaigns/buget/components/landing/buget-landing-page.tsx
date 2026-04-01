import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BarChart3, Heart, MapPin, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import mapPreview from '@/assets/images/map.png'
import chartPreview from '@/assets/images/chart.png'
import demoForumPreview from '@/assets/images/demo-forum.png'
const FUNKY_LOGO_URL =
  'https://funky.ong/wp-content/uploads/2024/03/Funky_RED_RGB-1.png'
import { Button } from '@/components/ui/button'
import { Analytics } from '@/lib/analytics'
import { CAMPAIGN_ENTITY_SELECTOR_PATH } from '../../constants'
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

type FaqItem = {
  readonly question: string
  readonly answer: string
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
      className="h-12 rounded-full bg-[#3565c4] px-8 text-base font-semibold hover:bg-[#2d57a8]"
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
  const storyItems: readonly LandingStoryItem[] =
    locale === 'en'
      ? [
          {
            stepNumber: 1,
            title: (
              <>
                Step 1: Find your local <strong>budget</strong> fast.
              </>
            ),
            description:
              'See in minutes how much money is planned for schools, roads, and local services.',
            icon: MapPin,
            image: mapPreview,
          },
          {
            stepNumber: 2,
            title: (
              <>
                Step 2: Identify the <strong>differences</strong>.
              </>
            ),
            description:
              'Compare this year with previous years and quickly identify the biggest shifts.',
            icon: BarChart3,
            image: chartPreview,
          },
          {
            stepNumber: 3,
            title: (
              <>
                Step 3: Turn data into <strong>arguments</strong>.
              </>
            ),
            description:
              'Leave with clear arguments you can use in public debates and official requests.',
            icon: Megaphone,
            image: demoForumPreview,
          },
        ]
      : [
          {
            stepNumber: 1,
            title: (
              <>
                Pasul 1: Găsești rapid <strong>bugetul</strong> localității
                tale.
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
                Pasul 2: Identifici <strong>diferențele</strong>.
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
                Pasul 3: Transformi datele în <strong>argumente</strong>.
              </>
            ),
            description:
              'Pleci cu întrebări clare pentru dezbateri publice, sesizări și dialog cu primăria.',
            icon: Megaphone,
            image: demoForumPreview,
          },
        ]

  const subtitle =
    locale === 'en'
      ? '60 days to learn how to read, understand, and act on your local budget. Free, step by step, no prior knowledge needed.'
      : '60 de zile în care înveți să citești, să înțelegi și să acționezi pe bugetul localității tale. Gratuit, pas cu pas, fără cunoștințe prealabile.'

  const ctaLabel =
    locale === 'en' ? 'Start the challenge' : 'Începe provocarea'

  const faqItems: readonly FaqItem[] =
    locale === 'en'
      ? [
          {
            question: 'Do I need to know anything about budgets to sign up?',
            answer:
              'Nothing. Just that public budgets are important for how your community works. You get support from the Funky Citizens team and access to a forum for any questions.',
          },
          {
            question: 'How much time does it take per week?',
            answer:
              'As much as you want. The challenges are independent. Do as many as you can, when you can. There is no mandatory progression.',
          },
          {
            question: 'What happens if I sign up after it has started?',
            answer:
              'You can participate anytime, but some stages have fixed deadlines. Signing up early gives you more options.',
          },
        ]
      : [
          {
            question:
              'Trebuie să știu ceva despre bugete ca să mă înscriu?',
            answer:
              'Nimic. Doar că bugetele publice sunt importante pentru funcționarea localității tale. Primești suport de la echipa Funky Citizens și acces la forum pentru orice întrebări ai.',
          },
          {
            question: 'Cât timp îmi ia pe săptămână?',
            answer:
              'Atât cât vrei. Provocările sunt independente. Faci câte poți, când poți. Nu există o progresie obligatorie.',
          },
          {
            question: 'Ce se întâmplă dacă mă înscriu după ce a început?',
            answer:
              'Poți participa oricând, dar unele etape au termen fix. Înscrierea devreme îți oferă mai multe opțiuni.',
          },
        ]

  return (
    <section className="mx-auto max-w-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 px-5 py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-[#ef2d00] underline decoration-[#ef2d00] decoration-2 underline-offset-4 sm:text-xl">
            #ProvocareCivică2026
          </span>
          <img
            src={FUNKY_LOGO_URL}
            alt="Funky Citizens"
            className="h-5 w-auto sm:h-6"
          />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.08]">
          {locale === 'en' ? (
            <>
              Eyes on{' '}
              <span className="whitespace-nowrap">Local Budgets!</span>
            </>
          ) : (
            <>
              Cu ochii pe{' '}
              <span className="whitespace-nowrap">bugetele locale!</span>
            </>
          )}
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
                <h2 className="flex items-start gap-3 text-xl font-medium tracking-tight text-foreground sm:text-2xl md:text-3xl">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-[#3565c4] sm:h-6 sm:w-6 md:h-7 md:w-7" aria-hidden="true" />
                  <span>{item.title}</span>
                </h2>
                <p className="max-w-md pl-8 text-base leading-relaxed text-muted-foreground sm:pl-9 sm:text-lg">
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
                ? 'Your local budget is public. We help you understand it.'
                : 'Bugetul localității tale e public. Noi te ajutăm să îl înțelegi.'}
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

      {/* FAQ Section */}
      <div className="mt-20 sm:mt-24">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-6 w-6 text-[#3565c4]" aria-hidden="true" />
          <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {locale === 'en'
              ? 'Frequently Asked Questions'
              : 'Întrebări frecvente'}
          </h3>
        </div>
        <div className="space-y-8">
          {faqItems.map((item) => (
            <div key={item.question} className="space-y-2">
              <h4 className="text-base font-bold text-foreground sm:text-lg">
                {item.question}
              </h4>
              <p className="text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
