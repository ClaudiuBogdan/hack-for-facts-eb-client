import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import { MiniBars } from './company-page.charts'
import { netResultOf, useCompanyPageModel, type CompanyPageModel } from './company-page.data'
import { count, moneyText } from './company-page.format'
import {
  ActivityGroups,
  BalanceSheet,
  CategoryList,
  CompanyKicker,
  ContextList,
  CopyCui,
  CoverageNote,
  FinancialChart,
  GrainToggle,
  MainActivity,
  MoneyChart,
  MoneyFlows,
  MoneyYearsMini,
  NoPublicMoney,
  NoStatements,
  PayerList,
  RecentRecords,
  RegistryFacts,
  SourcesLine,
  StatusChips,
  StatusNotice,
  SupplierLink,
  YearTable,
  companyFigures,
  companySentence,
  contextRows,
  effectiveGrain,
  financialLede,
  hasPublicMoney,
  moneyLede,
} from './company-page.parts'
import { useCompanyPageState } from './company-page.state'

/**
 * Variant `fisa` — a company sheet. The identity card stays in a rail beside
 * the reading on a wide screen: who the company is, its status, identifiers,
 * the section index (which follows the scroll) and the sources, a glance away
 * wherever the reader is. The main column opens on the figures the company
 * has, each with its history, then each section in full, tables included,
 * for the reader who has come to cite a figure. Below `lg` the rail is the
 * page's head and the index a row of links.
 */

const SECTIONS = [
  { id: 'pe-scurt', label: () => t`Pe scurt` },
  { id: 'finante', label: () => t`Finanțe` },
  { id: 'bani-publici', label: () => t`Bani publici` },
  { id: 'activitati', label: () => t`Activități` },
  { id: 'registru', label: () => t`Registru` },
] as const

const SECTION_IDS = SECTIONS.map((section) => section.id)

/** The section in view: the last one whose top has passed a line a third of the way down. */
function useSectionInView(ids: readonly string[]): string {
  const [current, setCurrent] = useState(ids[0] ?? '')
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight / 3
      let found = ids[0] ?? ''
      for (const id of ids) {
        const element = document.getElementById(`fisa-${id}`)
        if (element && element.getBoundingClientRect().top <= line) found = id
      }
      setCurrent(found)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ids])
  return current
}

export function CompanyPageSheet() {
  const { state, setMeasure, setGrain } = useCompanyPageState()
  const model = useCompanyPageModel(state.company)
  const current = useSectionInView(SECTION_IDS)
  const grain = effectiveGrain(model, state.grain)
  const lede = financialLede(model)

  return (
    <div className="relative w-full bg-background">
      <RuledFrame className="py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-10">
          <aside className="min-w-0 lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
            <CompanyKicker model={model} />
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">{model.displayName}</h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{companySentence(model)}</p>
            <StatusChips model={model} className="mt-5" />
            <StatusNotice model={model} className="mt-4" />
            <IdentityCard model={model} className="mt-6" />
            <nav aria-label={t`Secțiunile paginii`} className="mt-6">
              <ol className="flex flex-wrap gap-x-4 gap-y-1 lg:block lg:space-y-0.5 lg:border-l">
                {SECTIONS.map((section) => {
                  const active = current === section.id
                  return (
                    <li key={section.id}>
                      <a
                        href={`#fisa-${section.id}`}
                        aria-current={active ? 'location' : undefined}
                        className={cn(
                          'inline-flex min-h-9 items-center text-sm transition-colors lg:-ml-px lg:flex lg:border-l-2 lg:pl-4',
                          active ? 'font-semibold text-foreground lg:border-primary' : 'text-muted-foreground hover:text-foreground lg:border-transparent',
                        )}
                      >
                        {section.label()}
                      </a>
                    </li>
                  )
                })}
              </ol>
            </nav>
            <SourcesLine model={model} className="mt-6 hidden lg:block" />
          </aside>

          <div className="min-w-0 space-y-16 lg:col-span-8">
            <SheetSection id="pe-scurt" title={<Trans>Pe scurt</Trans>}>
              <GlanceTiles model={model} />
              {contextRows(model).length > 0 ? (
                <div className="mt-8 border-t pt-6">
                  <MonoLabel className="block text-muted-foreground">
                    <Trans>În economia României, {model.context.year}</Trans>
                  </MonoLabel>
                  <ContextList model={model} className="mt-4 max-w-xl" compact />
                </div>
              ) : null}
            </SheetSection>

            <SheetSection id="finante" title={<Trans>Finanțe</Trans>}>
              {model.latest ? (
                <>
                  {lede ? <p className="mb-6 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{lede}</p> : null}
                  <FinancialChart model={model} measure={state.measure} onMeasure={setMeasure} chartClassName="h-52 sm:h-64" />
                  <MonoLabel className="mt-10 block text-muted-foreground">
                    <Trans>Toți anii</Trans>
                  </MonoLabel>
                  <YearTable model={model} className="mt-3" />
                  <BalanceSheet model={model} className="mt-10 max-w-xl" />
                </>
              ) : (
                <NoStatements />
              )}
            </SheetSection>

            <SheetSection id="bani-publici" title={<Trans>Bani publici</Trans>}>
              {hasPublicMoney(model) ? (
                <>
                  {moneyLede(model) ? <p className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">{moneyLede(model)}</p> : null}
                  <MoneyChart model={model} className="mt-6" chartClassName="h-48 sm:h-56" />
                  <MoneyFlows model={model} className="mt-8" />
                  {grain ? (
                    <>
                      <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <MonoLabel className="text-primary">
                          <Trans>Cine plătește și pentru ce</Trans>
                        </MonoLabel>
                        <div className="w-full sm:w-fit">
                          <GrainToggle model={model} grain={grain} onGrain={(value) => setGrain(value, model.defaultGrain)} />
                        </div>
                      </div>
                      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                        <PayerList model={model} grain={grain} limit={6} />
                        <CategoryList model={model} grain={grain} />
                      </div>
                      <CoverageNote model={model} grain={grain} className="mt-3" />
                      <MonoLabel className="mt-10 block text-primary">
                        <Trans>Cele mai recente</Trans>
                      </MonoLabel>
                      <RecentRecords model={model} limit={6} className="mt-4" />
                      <SupplierLink model={model} className="mt-3" />
                    </>
                  ) : null}
                </>
              ) : (
                <NoPublicMoney />
              )}
            </SheetSection>

            <SheetSection id="activitati" title={<Trans>Activități</Trans>}>
              <MainActivity model={model} />
              <ActivityGroups model={model} className="mt-8" />
            </SheetSection>

            <SheetSection id="registru" title={<Trans>Registru</Trans>}>
              <RegistryFacts model={model} columns={1} />
              <SourcesLine model={model} className="mt-6 lg:hidden" />
            </SheetSection>
          </div>
        </div>
      </RuledFrame>
    </div>
  )
}

function SheetSection({ id, title, children }: { readonly id: string; readonly title: ReactNode; readonly children: ReactNode }) {
  return (
    <section id={`fisa-${id}`} className="scroll-mt-6" aria-labelledby={`fisa-${id}-title`}>
      <h2 id={`fisa-${id}-title`} className="border-b pb-3 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

/** Identifiers, place and dates: what a reader copies into an article or a request. */
function IdentityCard({ model, className }: { readonly model: CompanyPageModel; readonly className?: string }) {
  const { profile, place } = model
  const rows: { readonly term: string; readonly detail: ReactNode }[] = [
    ...(profile.cui ? [{ term: t`CUI`, detail: <CopyCui cui={profile.cui} bare /> }] : []),
    ...(profile.codInmatriculare ? [{ term: t`Nr. registru`, detail: <span className="font-mono text-xs">{profile.codInmatriculare}</span> }] : []),
    ...(model.foundedYear ? [{ term: t`Înființată`, detail: String(model.foundedYear) }] : []),
    ...(place.label ? [{ term: t`Sediu`, detail: place.label }] : []),
    ...(profile.euBranches.length > 0 ? [{ term: t`Sucursale UE`, detail: profile.euBranches.map((branch) => branch.country).join(', ') }] : []),
  ]
  return (
    <dl className={cn('border-y', className)}>
      {rows.map((row) => (
        <div key={row.term} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-border/60 py-2 last:border-b-0">
          <dt>
            <MonoLabel className="text-muted-foreground">{row.term}</MonoLabel>
          </dt>
          <dd className="min-w-0 text-sm text-foreground">{row.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The figures the company has, each with its history in bars; nothing for a figure it lacks. */
function GlanceTiles({ model }: { readonly model: CompanyPageModel }) {
  const figures = companyFigures(model, { business: '#fisa-finante', money: '#fisa-bani-publici' })
  const history: Record<string, readonly (number | null)[] | 'money'> = {
    turnover: model.series.turnover.map((point) => point.value),
    net: model.series.netResult.map((point) => point.value),
    employees: model.series.employees.map((point) => point.value),
    public: 'money',
  }
  const text = (key: string): string => {
    const latest = model.latest
    if (key === 'public') return moneyText(model.money.received)
    if (!latest) return '—'
    if (key === 'turnover' && latest.turnover !== null) return moneyText(latest.turnover)
    if (key === 'net') {
      const net = netResultOf(latest)
      return net === null ? '—' : moneyText(Math.abs(net))
    }
    if (key === 'employees' && latest.employees !== null) return count(latest.employees)
    return '—'
  }
  if (figures.length === 0) {
    return model.latest ? null : <NoStatements />
  }
  return (
    <ul className="grid gap-px border bg-border/70 sm:grid-cols-2">
      {figures.map((figure) => {
        const bars = history[figure.key]
        return (
          <li key={figure.key} className="bg-background">
            <a href={figure.href} className="flex h-full flex-col gap-3 p-5 transition-colors hover:bg-muted/40">
              <MonoLabel className="text-muted-foreground">{figure.label}</MonoLabel>
              <span className="flex items-end justify-between gap-4">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{text(figure.key)}</span>
                {bars === 'money' ? <MoneyYearsMini model={model} className="w-24" /> : bars ? <MiniBars values={bars} className="w-24" /> : null}
              </span>
              {figure.note ? <span className="text-sm text-muted-foreground">{figure.note}</span> : null}
            </a>
          </li>
        )
      })}
      {!model.latest ? (
        <li className="bg-background p-5">
          <NoStatements />
        </li>
      ) : null}
    </ul>
  )
}
