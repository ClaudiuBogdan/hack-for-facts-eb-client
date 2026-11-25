import type { ReactNode } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { CompanyBalanceTrend } from '@/features/private-companies/components/profile/company-balance-trend'
import { companyFigures } from '@/features/private-companies/components/profile/company-figures'
import {
  CompanyKicker,
  CompanyProfileHead,
  CompanySentence,
  CopyCui,
  IdentifierLine,
  StatusChips,
  StatusNotice,
} from '@/features/private-companies/components/profile/company-profile-head'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { companyFactSearch } from '@/features/private-companies/lib/hub-analysis-links'
import { buildCompanyProfileModel, caenEdition, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { companySentenceFacts, headActivity, nameLength } from '@/features/private-companies/lib/company-profile-text'
import {
  anafNotFoundProfile,
  bankruptProfile,
  danteInternationalProfile,
  insolventProfile,
  pfaProfile,
  sparseBilantProfile,
  struckOffProfile,
} from '@/features/private-companies/mocks/fixtures'
import { HubFiguresBand } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type { PrivateCompanyProfile } from '@/schemas/private-company'

/**
 * The company page's head with less in it (owner, 25 November 2026: „Lighter
 * head"). Each variant is a head over the page's pinned bar and its four
 * figures, so the first screen shows what the head costs. The company is the
 * live API's (`?cui=`, OMV Petrom by default) or a fixture (`?fixture=dante,
 * anaf, sparse, struck, insolvent, pfa, bankrupt`) for the hard cases: no
 * statements, struck off, insolvent, a sole trader.
 *
 * What the head says today, each asked for by the owner on 13 October: the
 * way back with the county and the activity's division; the name; a sentence
 * of facts (legal form, place, the year ONRC recorded, the selected activity),
 * each a link; the status, VAT and ANAF chips; the CUI and the registry
 * number; and, beside them, the last five years with a statement on a chart.
 * Every variant keeps the name, the status chip and the status notice.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const FIXTURES: Readonly<Record<string, PrivateCompanyProfile>> = {
  dante: danteInternationalProfile,
  anaf: anafNotFoundProfile,
  sparse: sparseBilantProfile,
  struck: struckOffProfile,
  insolvent: insolventProfile,
  pfa: pfaProfile,
  bankrupt: bankruptProfile,
}

/** The landing's headline set, at the profile's sizes for a name's length. */
const HEADING: Record<ReturnType<typeof nameLength>, string> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}
const HEADLINE_CLASS = 'font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em]'

const SECTIONS = [
  { id: 'afacerea', label: 'Afacerea' },
  { id: 'bani-publici', label: 'Bani publici' },
  { id: 'activitati', label: 'Activități' },
  { id: 'an-cu-an', label: 'An cu an' },
  { id: 'registru', label: 'Registru' },
]

function useProtoModel(): { readonly model: CompanyProfileModel | null; readonly state: string } {
  const search = useSearch({ strict: false }) as { readonly cui?: unknown; readonly fixture?: unknown }
  const fixture = typeof search.fixture === 'string' ? FIXTURES[search.fixture] : undefined
  const cui = typeof search.cui === 'string' || typeof search.cui === 'number' ? String(search.cui) : '1590082'
  const live = usePrivateCompanyProfile(fixture ? '' : cui)
  const profile = fixture ?? live.data ?? null
  if (!profile) return { model: null, state: live.isError ? 'Profilul nu s-a încărcat.' : 'Se încarcă…' }
  return { model: buildCompanyProfileModel(profile), state: '' }
}

/** A head, then what follows it on the page: the pinned bar and the four figures. */
function Page({ head }: { readonly head: (model: CompanyProfileModel) => ReactNode }) {
  const { i18n } = useLingui()
  const { model, state } = useProtoModel()
  if (!model) return <p className="p-6 text-sm text-muted-foreground">{state}</p>
  const figures = companyFigures(model, { business: 'afacerea', money: 'bani-publici' })
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      {head(model)}
      <HomeSectionNav title={model.displayName} sections={SECTIONS} numbered={false} />
      {figures.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <HubFiguresBand facts={figures} locale={i18n.locale === 'en' ? 'en' : 'ro'} plain arrow />
          </RuledFrame>
        </section>
      ) : null}
      <div className="h-[60vh]" aria-hidden="true" />
    </div>
  )
}

/** The head's frame, as today: the lattice, the corner ticks, the crux on its bottom rule. */
function HeadFrame({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <section className="relative border-b" aria-labelledby="company-profile-title">
      <TwoLayerLattice idPrefix="company-profile-proto" />
      <RuledFrame className={cn('py-10 sm:py-12 lg:py-14', className)}>
        <CornerTicks />
        {children}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/**
 * Today's way back in plain text, not mono capitals (the hub's rule): the
 * companies hub, the county in the analysis, the selected class's division as
 * text.
 */
function PlainKicker({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { place } = model
  const { county } = place
  const activity = headActivity(model)
  const division = activity?.kind === 'selected' && activity.division && activity.revision ? { name: activity.division, code: activity.code.slice(0, 2), revision: activity.revision } : null
  return (
    <nav aria-label={t`Unde se află firma`} className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', className)}>
      <Link to="/companies" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <Trans>Firme</Trans>
      </Link>
      {place.countyCode && county ? (
        <>
          <span aria-hidden="true">/</span>
          <Link to="/companies/analytics" search={companyFactSearch({ county: { in: [place.countyCode] } })} className="hover:text-foreground">
            {county}
          </Link>
        </>
      ) : null}
      {division ? (
        <>
          <span aria-hidden="true">/</span>
          <span className="min-w-0 max-w-full truncate sm:max-w-[48ch]" title={`CAEN ${division.code}, ${caenEdition(division.revision)}`}>
            {division.name}
          </span>
        </>
      ) : null}
    </nav>
  )
}

// ─────────────────────────────────────────────── azi: the page as it is ──

export function HeadAzi() {
  return <Page head={(model) => <CompanyProfileHead model={model} />} />
}

// ─────────────────────── simplu: today's head, the landing's type only ──

/** Today's composition; only the kicker in plain text and the name set as the landing's headline. Nothing dropped. */
export function HeadSimplu() {
  return (
    <Page
      head={(model) => {
        const { recent } = model
        const trend = model.latest !== null && [...recent.turnover, ...recent.net.map((point) => point.value), ...recent.employees].some((value) => value !== null)
        return (
          <HeadFrame>
            <div className={cn('grid grid-cols-1 items-center gap-10', trend && 'lg:grid-cols-12 lg:gap-8')}>
              <div className={cn('min-w-0', trend && 'lg:col-span-7')}>
                <PlainKicker model={model} />
                <h1 id="company-profile-title" className={cn('mt-4', HEADLINE_CLASS, HEADING[nameLength(model.displayName)])}>
                  {model.displayName}
                </h1>
                <CompanySentence model={model} className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg" />
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <StatusChips model={model} explained />
                  <IdentifierLine model={model} />
                </div>
                <StatusNotice model={model} registryCaveats={false} className="mt-4 max-w-[60ch]" />
              </div>
              {trend ? <CompanyBalanceTrend model={model} className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8" /> : null}
            </div>
          </HeadFrame>
        )
      }}
    />
  )
}

// ─────────────────────────────── fara-grafic: no five-year chart ──

/**
 * The head without its five-year chart: the business band under it draws
 * every year on one chart, and the four figures give the newest. The rest
 * stays: the way back, the name, the sentence, the chips, the identifiers.
 */
export function HeadFaraGrafic() {
  return (
    <Page
      head={(model) => (
        <HeadFrame className="lg:py-12">
          <div className="max-w-4xl">
            <PlainKicker model={model} />
            <h1 id="company-profile-title" className={cn('mt-4', HEADLINE_CLASS, HEADING[nameLength(model.displayName)])}>
              {model.displayName}
            </h1>
            <CompanySentence model={model} className="mt-4 max-w-[64ch] text-base leading-relaxed text-muted-foreground sm:text-lg" />
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StatusChips model={model} explained />
              <IdentifierLine model={model} />
            </div>
            <StatusNotice model={model} registryCaveats={false} className="mt-4 max-w-[60ch]" />
          </div>
        </HeadFrame>
      )}
    />
  )
}

// ──────────────────────────────────── scurt: who it is, and its state ──

/**
 * Who the company is and its state, nothing a band below says again: the way
 * back to the hub, the name, its legal form and place in a line, the chips
 * and the CUI. Dropped: the chart (the business band), the year ONRC
 * recorded and the registry number (the registry band), the activity
 * sentence and the division (the activities band).
 */
export function HeadScurt() {
  return (
    <Page
      head={(model) => {
        const { form, where } = companySentenceFacts(model)
        const cui = model.profile.cui
        return (
          <HeadFrame className="py-8 sm:py-10 lg:py-10">
            <div className="max-w-4xl">
              <Link to="/companies" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                <Trans>Firme</Trans>
              </Link>
              <h1 id="company-profile-title" className={cn('mt-4', HEADLINE_CLASS, HEADING[nameLength(model.displayName)])}>
                {model.displayName}
              </h1>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">{where ? `${form} · ${where}` : form}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <StatusChips model={model} explained />
                {cui ? <CopyCui cui={cui} /> : null}
              </div>
              <StatusNotice model={model} registryCaveats={false} className="mt-4 max-w-[60ch]" />
            </div>
          </HeadFrame>
        )
      }}
    />
  )
}

// ──────────────────────────── grafic-mic: the chart kept, the rest lighter ──

/**
 * The chart kept beside a lighter left column: the name, the form and place
 * in a line, the chips and the CUI. The year ONRC recorded, the registry
 * number, the activity sentence and the division go to their bands.
 */
export function HeadGraficMic() {
  return (
    <Page
      head={(model) => {
        const { recent } = model
        const trend = model.latest !== null && [...recent.turnover, ...recent.net.map((point) => point.value), ...recent.employees].some((value) => value !== null)
        const { form, where } = companySentenceFacts(model)
        const cui = model.profile.cui
        return (
          <HeadFrame className="py-8 sm:py-10 lg:py-10">
            <div className={cn('grid grid-cols-1 items-center gap-8', trend && 'lg:grid-cols-12 lg:gap-8')}>
              <div className={cn('min-w-0', trend && 'lg:col-span-7')}>
                <Link to="/companies" className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  <Trans>Firme</Trans>
                </Link>
                <h1 id="company-profile-title" className={cn('mt-4', HEADLINE_CLASS, HEADING[nameLength(model.displayName)])}>
                  {model.displayName}
                </h1>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">{where ? `${form} · ${where}` : form}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <StatusChips model={model} explained />
                  {cui ? <CopyCui cui={cui} /> : null}
                </div>
                <StatusNotice model={model} registryCaveats={false} className="mt-4 max-w-[60ch]" />
              </div>
              {trend ? <CompanyBalanceTrend model={model} className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8" /> : null}
            </div>
          </HeadFrame>
        )
      }}
    />
  )
}

/** Today's kicker, for the comparison note. */
export { CompanyKicker }
