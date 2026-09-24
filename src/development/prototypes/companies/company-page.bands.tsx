import { useEffect, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { useCompanyPageModel } from './company-page.data'
import {
  ActivityGroups,
  BalanceSheet,
  BalanceTrend,
  CategoryList,
  CompanyKicker,
  CoverageNote,
  EconomyContext,
  FiguresBand,
  FinancialChart,
  GrainToggle,
  IdentifierLine,
  MainActivity,
  MoneyChart,
  MoneyFlows,
  NoPublicMoney,
  NoStatements,
  PayerList,
  RecentRecords,
  RegistryFacts,
  SourcesLine,
  StatusChips,
  StatusNotice,
  SupplierLink,
  companyFigures,
  companySentence,
  debtSentence,
  economyLede,
  effectiveGrain,
  financialLede,
  hasEconomyContext,
  hasPublicMoney,
  moneyLede,
  nameLength,
} from './company-page.parts'
import { useCompanyPageState } from './company-page.state'

/**
 * Variant `benzi` — the company in the `/companies` hub's rhythm: a compact
 * head that says who it is, its status and identifiers, and beside it the
 * last five years with a statement — turnover, net result and people on one
 * chart, every value in the table under it; the figures band with the newest
 * values; then one numbered band per question. Where the company stands in
 * its sector, county and country is context, not the company: its own band
 * sits near the end, and only when a share reaches 1%. A thin bar pins under
 * the head with the name and the bands.
 */

const SECTIONS = [
  { id: 'afacerea', label: () => t`Afacerea` },
  { id: 'bani-publici', label: () => t`Bani publici` },
  { id: 'activitati', label: () => t`Activități` },
  { id: 'economie', label: () => t`În economie` },
  { id: 'registru', label: () => t`Registru` },
] as const

const HEADING: Record<ReturnType<typeof nameLength>, string> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

export function CompanyPageBands() {
  const { state, setMeasure, setGrain } = useCompanyPageState()
  const model = useCompanyPageModel(state.company)
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, (block, delay) => countUpWithin(block, delay))
  // The count-up driver is module state: an unmount mid-flight would leave it ticking.
  useEffect(() => () => stopCounting(), [])

  const trends = model.latest !== null && model.recent.years.length > 0
  const figures = companyFigures(model, { business: '#afacerea', money: '#bani-publici' })
  const economy = hasEconomyContext(model)
  const sections = SECTIONS.filter((section) => section.id !== 'economie' || economy)
  const grain = effectiveGrain(model, state.grain)
  const debt = debtSentence(model)

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="company-bands" />
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <CornerTicks />
          <div className={cn('grid grid-cols-1 items-center gap-10', trends && 'lg:grid-cols-12 lg:gap-8')}>
            <div className={cn('min-w-0', trends && 'lg:col-span-7')}>
              <CompanyKicker model={model} />
              <h1 className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[nameLength(model.displayName)])}>{model.displayName}</h1>
              <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{companySentence(model)}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <StatusChips model={model} />
                <IdentifierLine model={model} />
              </div>
              <StatusNotice model={model} className="mt-4 max-w-[60ch]" />
            </div>
            {trends ? <BalanceTrend model={model} className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8" /> : null}
          </div>
        </RuledFrame>
      </section>

      <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
          <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-72">{model.displayName}</span>
          <ol className="flex shrink-0 gap-4 sm:gap-5 md:ml-auto">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <MonoLabel className="text-primary">{String(index + 1).padStart(2, '0')}</MonoLabel>
                  {section.label()}
                </a>
              </li>
            ))}
          </ol>
        </RuledFrame>
      </nav>

      {figures.length > 0 ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <CruxMarks />
            <FiguresBand figures={figures} />
          </RuledFrame>
        </section>
      ) : null}

      <section id="afacerea" className="scroll-mt-14 border-b" aria-labelledby="company-bands-business">
        <RuledFrame className="py-12 sm:py-16">
          {model.latest ? (
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 lg:col-span-7">
                <HubSectionHead titleId="company-bands-business" index={t`01 / Afacerea`} title={<Trans>Cum merge afacerea</Trans>} lede={financialLede(model)} />
                <div className="mt-8" data-reveal>
                  <FinancialChart model={model} measure={state.measure} onMeasure={setMeasure} />
                </div>
              </div>
              <div className={cn('min-w-0 lg:col-span-5', HUB_BESIDE_TITLE_CLASS)} data-reveal>
                <BalanceSheet model={model} />
                {debt ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{debt}</p> : null}
              </div>
            </div>
          ) : (
            <>
              <HubSectionHead titleId="company-bands-business" index={t`01 / Afacerea`} title={<Trans>Cum merge afacerea</Trans>} />
              <NoStatements className="mt-5" />
            </>
          )}
        </RuledFrame>
      </section>

      <section id="bani-publici" className="scroll-mt-14 border-b" aria-labelledby="company-bands-money">
        <RuledFrame className="py-12 sm:py-16">
          {hasPublicMoney(model) ? (
            <>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
                <div className="min-w-0 lg:col-span-5">
                  <HubSectionHead titleId="company-bands-money" index={t`02 / Bani publici`} title={<Trans>Ce a primit de la stat</Trans>} lede={moneyLede(model)} />
                  <MoneyFlows model={model} className="mt-8" />
                </div>
                {model.money.byYear.length > 0 ? (
                  <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
                    <MonoLabel className="block text-muted-foreground">
                      <Trans>Pe an, după anul contractului sau al achiziției</Trans>
                    </MonoLabel>
                    <MoneyChart model={model} className="mt-4" />
                  </div>
                ) : null}
              </div>

              {grain ? (
                <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8" data-reveal>
                  <div className="min-w-0 lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                      <MonoLabel className="text-primary">
                        <Trans>Cine plătește</Trans>
                      </MonoLabel>
                      <div className="w-full sm:w-fit">
                        <GrainToggle model={model} grain={grain} onGrain={(value) => setGrain(value, model.defaultGrain)} />
                      </div>
                    </div>
                    <PayerList model={model} grain={grain} className="mt-4" />
                    <CoverageNote model={model} grain={grain} className="mt-3" />
                  </div>
                  <div className="min-w-0 lg:col-span-5">
                    <MonoLabel className="block text-primary">
                      <Trans>Pentru ce</Trans>
                    </MonoLabel>
                    <CategoryList model={model} grain={grain} className="mt-5" />
                    <MonoLabel className="mt-10 block text-primary">
                      <Trans>Cele mai recente</Trans>
                    </MonoLabel>
                    <RecentRecords model={model} limit={5} className="mt-4" />
                    <SupplierLink model={model} className="mt-3" />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <HubSectionHead titleId="company-bands-money" index={t`02 / Bani publici`} title={<Trans>Ce a primit de la stat</Trans>} />
              <NoPublicMoney className="mt-5" />
            </>
          )}
        </RuledFrame>
      </section>

      <section id="activitati" className="scroll-mt-14 border-b" aria-labelledby="company-bands-activities">
        <RuledFrame className="py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-5">
              <HubSectionHead titleId="company-bands-activities" index={t`03 / Activități`} title={<Trans>Ce face firma</Trans>} />
              <MainActivity model={model} className="mt-8" />
            </div>
            {model.activities.total > 0 ? (
              <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
                <MonoLabel className="block text-muted-foreground">
                  <Trans>Activitățile autorizate, pe domenii</Trans>
                </MonoLabel>
                <ActivityGroups model={model} className="mt-4" />
              </div>
            ) : null}
          </div>
        </RuledFrame>
      </section>

      {economy ? (
        <section id="economie" className="scroll-mt-14 border-b" aria-labelledby="company-bands-economy">
          <RuledFrame className="py-12 sm:py-16">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="min-w-0 lg:col-span-5">
                <HubSectionHead titleId="company-bands-economy" index={t`04 / În economie`} title={<Trans>Cât cântărește în economie</Trans>} lede={economyLede(model)} />
              </div>
              <EconomyContext model={model} className={cn('min-w-0 lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} />
            </div>
          </RuledFrame>
        </section>
      ) : null}

      <section id="registru" className="scroll-mt-14" aria-labelledby="company-bands-registry">
        <RuledFrame className="py-12 sm:py-16">
          <HubSectionHead titleId="company-bands-registry" index={economy ? t`05 / Registru` : t`04 / Registru`} title={<Trans>Datele din registru</Trans>} />
          <RegistryFacts model={model} className="mt-8" />
          <SourcesLine model={model} className="mt-6" />
        </RuledFrame>
      </section>
    </div>
  )
}
