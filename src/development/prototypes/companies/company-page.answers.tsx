import { useRef } from 'react'
import type { ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { MiniBars } from './company-page.charts'
import { netResultOf, useCompanyPageModel, type CompanyPageModel } from './company-page.data'
import { count, marginText, moneyText, percent } from './company-page.format'
import {
  ActivityGroups,
  BalanceSheet,
  CategoryList,
  CompanyKicker,
  ContextList,
  CoverageNote,
  FinancialChart,
  GrainToggle,
  IdentifierLine,
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
  companySentence,
  contextRows,
  debtSentence,
  effectiveGrain,
  employeesSentence,
  flowLabel,
  hasPublicMoney,
  institutionName,
  moneyLede,
  nameLength,
  sizeClassLabel,
  topPayer,
} from './company-page.parts'
import { COMPANY_SECTIONS, useCompanyPageState, type CompanySection, type FinancialMeasure } from './company-page.state'

/**
 * Variant `intrebari` — the questions a reader brings, answered first. Each
 * answer is a sentence computed from the record with its evidence beside it,
 * and a question the record cannot answer is left out rather than answered
 * with a dash. Each opens the tab that holds its detail (`?sectiune=`, and
 * for a financial answer the chart's measure too). The detail is four tabs
 * rather than one long page, so the page stays short until the reader asks.
 */

interface Answer {
  readonly key: string
  readonly question: string
  readonly answer: ReactNode
  readonly evidence?: ReactNode
  readonly section: CompanySection
  readonly measure?: FinancialMeasure
  readonly tone?: 'warning'
}

function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)
}

/** „, cu 26,0% mai puțin decât în 2024", or „de 12 ori mai mult" past ten times; nothing when equal. */
function trendAgainst(before: number, now: number, year: number): string {
  if (now === before) return t`, la fel ca în ${year}`
  const ratio = now / before
  if (ratio >= 10) return t`, de ${formatHubNumber(ratio, { digits: ratio < 100 ? 1 : 0 })} ori mai mult decât în ${year}`
  return ratio > 1 ? t`, cu ${percent(ratio - 1)} mai mult decât în ${year}` : t`, cu ${percent(1 - ratio)} mai puțin decât în ${year}`
}

/** What the counted records are, named by the kinds the company has („achiziții directe", „contracte și plăți PNRR"). */
function receiptKinds(flowTypes: readonly string[]): string {
  const names = [...new Set(flowTypes.map((flowType) => flowLabel(flowType).toLocaleLowerCase('ro-RO')))]
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} ${t`și`} ${names[names.length - 1]}`
}

function answers(model: CompanyPageModel): readonly Answer[] {
  const { latest, previous, money, mainActivity, activities, status, lossYears, span, missingYears } = model
  const list: Answer[] = []

  if (mainActivity) {
    list.push({
      key: 'what',
      question: t`Ce face?`,
      answer: mainActivity.label,
      // The main activity is one of the authorised ones only when the registry lists it in the same revision.
      evidence:
        activities.mainListed && activities.total > 1 ? (
          <span className="text-sm text-muted-foreground">
            {plural(activities.total - 1, { one: 'Și încă o activitate autorizată', few: 'Și alte # activități autorizate', other: 'Și alte # de activități autorizate' })}
          </span>
        ) : !activities.mainListed && activities.total > 0 ? (
          <span className="text-sm text-muted-foreground">
            {plural(activities.total, { one: 'O activitate autorizată în registru', few: '# activități autorizate în registru', other: '# de activități autorizate în registru' })}
          </span>
        ) : null,
      section: 'activitati',
    })
  }

  // The registry's own word only when it says more than the answer („faliment").
  const detail = status.label && !/^insolven|^dizolv/iu.test(status.label) ? status.label : null
  list.push({
    key: 'status',
    question: t`Mai e în funcțiune?`,
    answer:
      status.kind === 'active' ? t`Da.`
      : status.kind === 'struck-off' ? t`Nu: radiată din registrul comerțului.`
      : status.kind === 'insolvency' ? (detail ? t`Nu: în insolvență (${detail}).` : t`Nu: în insolvență.`)
      : status.kind === 'dissolution' ? (detail ? t`Nu: în dizolvare sau lichidare (${detail}).` : t`Nu: în dizolvare sau lichidare.`)
      : capitalise(status.label ?? t`Stare necunoscută`),
    evidence: model.foundedYear ? <span className="text-sm text-muted-foreground">{t`Înregistrată în ${model.foundedYear}`}</span> : null,
    section: 'registru',
    tone: status.kind === 'active' ? undefined : 'warning',
  })

  if (latest && model.sizeClass) {
    list.push({
      key: 'size',
      question: t`Cât de mare e?`,
      answer: `${capitalise(sizeClassLabel(model.sizeClass))}.`,
      evidence:
        latest.turnover !== null ? (
          <Evidence figure={moneyText(latest.turnover)} note={t`cifra de afaceri, ${latest.fiscalYear}`}>
            <MiniBars values={model.series.turnover.map((point) => point.value)} className="w-28" />
          </Evidence>
        ) : null,
      section: 'finante',
      measure: 'cifra-de-afaceri',
    })
  }

  const net = latest ? netResultOf(latest) : null
  if (latest && net !== null) {
    const before = previous ? netResultOf(previous) : null
    // A trend only between two results of the same sign; a sign change is said by the answer itself.
    const same = before !== null && net !== 0 && before !== 0 && Math.sign(before) === Math.sign(net)
    const trend = same && previous ? trendAgainst(Math.abs(before), Math.abs(net), previous.fiscalYear) : ''
    const filed = span.length - missingYears.length
    const history =
      lossYears >= 3
        ? ` ${plural(lossYears, { one: `Pe pierdere un an din ${filed}.`, few: `Pe pierdere # ani din ${filed}.`, other: `Pe pierdere # de ani din ${filed}.` })}`
        : ''
    list.push({
      key: 'profit',
      question: t`Are profit?`,
      answer:
        net > 0
          ? `${t`Da: ${moneyText(net)} profit net în ${latest.fiscalYear}${trend}.`}${history}`
          : net < 0
            ? `${t`Nu: pierdere netă de ${moneyText(-net)} în ${latest.fiscalYear}${trend}.`}${history}`
            : `${t`La zero: nici profit, nici pierdere în ${latest.fiscalYear}.`}${history}`,
      evidence: (
        <Evidence figure={model.margin !== null ? marginText(model.margin) : '—'} note={t`marja netă, ${latest.fiscalYear}`}>
          <MiniBars values={model.series.netResult.map((point) => point.value)} className="w-28" />
        </Evidence>
      ),
      section: 'finante',
      measure: 'profit',
      tone: net < 0 ? 'warning' : undefined,
    })
  }

  const staff = employeesSentence(model)
  if (staff && latest?.employees !== null && latest?.employees !== undefined) {
    list.push({
      key: 'people',
      question: t`Câți oameni lucrează aici?`,
      answer: staff,
      evidence: (
        <Evidence figure={count(latest.employees)} note={t`salariați, ${latest.fiscalYear}`}>
          <MiniBars values={model.series.employees.map((point) => point.value)} className="w-28" />
        </Evidence>
      ),
      section: 'finante',
      measure: 'salariati',
    })
  }

  const receipts = money.flows.filter((flow) => flow.receipt && flow.count > 0)
  const period = money.undated.count === 0 && money.firstYear !== null ? (money.firstYear === money.lastYear ? t` în ${money.firstYear}` : t` din ${money.firstYear} încoace`) : ''
  list.push({
    key: 'public',
    question: t`Primește bani publici?`,
    answer:
      money.received > 0 ? t`Da: ${moneyText(money.received)}${period}.`
      : money.receivedCount > 0 || model.grains.length > 0 ? t`Da, dar fără valoare publicată.`
      : money.commitments.count > 0 ? t`Nicio plată, dar angajamente PNRR de ${moneyText(money.commitments.total)}.`
      : t`Nu apare în achizițiile publice și nici în PNRR.`,
    evidence:
      receipts.length > 0 ? (
        <Evidence figure={count(money.receivedCount)} note={receiptKinds(receipts.map((flow) => flow.flowType))}>
          <MoneyYearsMini model={model} className="w-28" />
        </Evidence>
      ) : null,
    section: 'bani-publici',
  })

  const payer = topPayer(model)
  if (payer && payer.row.amountRon !== null) {
    list.push({
      key: 'payer',
      question: t`Cine îi plătește cel mai mult?`,
      answer: institutionName(payer.row.name, payer.row.cui),
      evidence: (
        <Evidence
          figure={moneyText(payer.row.amountRon)}
          note={[
            payer.grain === 'contracte' ? t`în contracte SEAP` : t`în achiziții directe SEAP`,
            payer.window,
            // A share of the SEAP window's published values, said as such: not of the page's all-time total.
            payer.row.share !== null ? t`${percent(payer.row.share)} din valoarea lor publicată` : null,
          ]
            .filter(Boolean)
            .join(', ')}
        />
      ),
      section: 'bani-publici',
    })
  }

  const debt = debtSentence(model)
  if (latest && debt) {
    list.push({ key: 'debt', question: t`Cât datorează?`, answer: debt, section: 'finante' })
  }

  if (!latest) {
    list.push({ key: 'statements', question: t`Ce arată bilanțurile?`, answer: t`Niciun bilanț publicat la ANAF.`, section: 'finante', tone: 'warning' })
  }
  return list
}

function Evidence({ figure, note, children }: { readonly figure: string; readonly note: string; readonly children?: ReactNode }) {
  return (
    <span className="flex items-end justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-lg font-semibold tabular-nums tracking-tight text-foreground">{figure}</span>
        <MonoLabel className="mt-1 block leading-relaxed text-muted-foreground">{note}</MonoLabel>
      </span>
      {children}
    </span>
  )
}

/**
 * The empty cells that complete the last row at two columns (`sm`) and at
 * four (`lg`); each is shown only at the widths whose row it completes.
 */
function gridFillers(count: number): readonly string[] {
  const small = count % 2
  const large = (4 - (count % 4)) % 4
  return Array.from({ length: Math.max(small, large) }, (_, index) =>
    cn('hidden bg-background', index < small ? 'sm:block' : 'sm:hidden', index < large ? 'lg:block' : 'lg:hidden'),
  )
}

function sectionLabel(section: CompanySection): string {
  switch (section) {
    case 'finante':
      return t`Finanțe`
    case 'bani-publici':
      return t`Bani publici`
    case 'activitati':
      return t`Activități`
    case 'registru':
      return t`Registru`
  }
}

const HEADING: Record<ReturnType<typeof nameLength>, string> = {
  short: 'text-4xl sm:text-5xl lg:text-6xl',
  medium: 'text-3xl sm:text-4xl lg:text-5xl',
  long: 'text-2xl sm:text-3xl lg:text-4xl',
}

export function CompanyPageAnswers() {
  const { state, setMeasure, setGrain, setSection, openSection } = useCompanyPageState()
  const model = useCompanyPageModel(state.company)
  const tabsRef = useRef<HTMLDivElement>(null)
  const grain = effectiveGrain(model, state.grain)
  const list = answers(model)
  // Blank cells that close the last row, so the grid's hairline gaps never show as a grey block.
  const fillers = gridFillers(list.length)

  const open = (answer: Answer) => {
    openSection(answer.section, answer.measure)
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <section className="relative border-b">
        <TwoLayerLattice idPrefix="company-answers" />
        <RuledFrame className="py-10 sm:py-12">
          <CornerTicks />
          <CompanyKicker model={model} />
          <h1 className={cn('mt-4 max-w-4xl font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[nameLength(model.displayName)])}>{model.displayName}</h1>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{companySentence(model)}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <StatusChips model={model} />
            <IdentifierLine model={model} />
          </div>
          <StatusNotice model={model} className="mt-4 max-w-[62ch]" />
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-labelledby="company-answers-title">
        <RuledFrame className="py-10 sm:py-12">
          <MonoLabel id="company-answers-title" className="block text-primary">
            <Trans>Pe scurt</Trans>
          </MonoLabel>
          <ul className="mt-5 grid gap-px border bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((answer) => (
              <li key={answer.key} className="bg-background">
                <button
                  type="button"
                  onClick={() => open(answer)}
                  className="group flex h-full w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <MonoLabel className={cn(answer.tone === 'warning' ? 'text-destructive' : 'text-muted-foreground')}>{answer.question}</MonoLabel>
                  <span className="text-base font-semibold leading-snug text-foreground">{answer.answer}</span>
                  {answer.evidence ? <span className="mt-auto block">{answer.evidence}</span> : null}
                  <span className={cn('text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary', !answer.evidence && 'mt-auto')}>
                    {sectionLabel(answer.section)} →
                  </span>
                </button>
              </li>
            ))}
            {fillers.map((className, index) => (
              <li key={`filler-${index}`} aria-hidden="true" className={className} />
            ))}
          </ul>
        </RuledFrame>
      </section>

      <div ref={tabsRef} className="scroll-mt-2">
        <div className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <RuledFrame className="py-0">
            <div role="tablist" aria-label={t`Detalii despre firmă`} className="flex gap-6 overflow-x-auto">
              {COMPANY_SECTIONS.map((section) => {
                const selected = state.section === section
                return (
                  <button
                    key={section}
                    type="button"
                    role="tab"
                    id={`company-answers-tab-${section}`}
                    aria-selected={selected}
                    aria-controls={`company-answers-panel-${section}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setSection(section)}
                    onKeyDown={(event) => {
                      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                      event.preventDefault()
                      const index = COMPANY_SECTIONS.indexOf(section)
                      const next = COMPANY_SECTIONS[(index + (event.key === 'ArrowRight' ? 1 : -1) + COMPANY_SECTIONS.length) % COMPANY_SECTIONS.length]
                      if (!next) return
                      setSection(next)
                      document.getElementById(`company-answers-tab-${next}`)?.focus()
                    }}
                    className={cn(
                      'relative inline-flex min-h-12 shrink-0 items-center text-sm transition-colors',
                      selected ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {sectionLabel(section)}
                    <span className={cn('absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-opacity', selected ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </RuledFrame>
        </div>

        <RuledFrame className="py-10 sm:py-14">
          <div role="tabpanel" id={`company-answers-panel-${state.section}`} aria-labelledby={`company-answers-tab-${state.section}`}>
            {state.section === 'finante' ? (
              model.latest ? (
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
                  <div className="min-w-0 lg:col-span-7">
                    <FinancialChart model={model} measure={state.measure} onMeasure={setMeasure} />
                    <MonoLabel className="mt-12 block text-muted-foreground">
                      <Trans>Toți anii</Trans>
                    </MonoLabel>
                    <YearTable model={model} className="mt-3" />
                  </div>
                  <div className="min-w-0 lg:col-span-5">
                    <BalanceSheet model={model} />
                    {contextRows(model).length > 0 ? (
                      <>
                        <MonoLabel className="mt-12 block text-primary">
                          <Trans>În economia României, {model.context.year}</Trans>
                        </MonoLabel>
                        <ContextList model={model} className="mt-5" compact />
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <NoStatements />
              )
            ) : state.section === 'bani-publici' ? (
              hasPublicMoney(model) ? (
                <div>
                  <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
                    <div className="min-w-0 lg:col-span-5">
                      {moneyLede(model) ? <p className="text-lg leading-relaxed text-foreground">{moneyLede(model)}</p> : null}
                      <MoneyFlows model={model} className="mt-6" />
                    </div>
                    <div className="min-w-0 lg:col-span-7">
                      <MoneyChart model={model} />
                    </div>
                  </div>
                  {grain ? (
                    <>
                      <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <MonoLabel className="text-primary">
                          <Trans>Cine plătește și pentru ce</Trans>
                        </MonoLabel>
                        <div className="w-full sm:w-fit">
                          <GrainToggle model={model} grain={grain} onGrain={(value) => setGrain(value, model.defaultGrain)} />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
                        <div className="min-w-0 lg:col-span-7">
                          <PayerList model={model} grain={grain} />
                          <CoverageNote model={model} grain={grain} className="mt-3" />
                        </div>
                        <div className="min-w-0 lg:col-span-5">
                          <CategoryList model={model} grain={grain} />
                          <MonoLabel className="mt-10 block text-primary">
                            <Trans>Cele mai recente</Trans>
                          </MonoLabel>
                          <RecentRecords model={model} limit={5} className="mt-4" />
                          <SupplierLink model={model} className="mt-3" />
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <NoPublicMoney />
              )
            ) : state.section === 'activitati' ? (
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
                <MainActivity model={model} className="lg:col-span-5" />
                <ActivityGroups model={model} className="min-w-0 lg:col-span-7" />
              </div>
            ) : (
              <div>
                <RegistryFacts model={model} />
                <SourcesLine model={model} className="mt-6" />
              </div>
            )}
          </div>
        </RuledFrame>
      </div>
    </div>
  )
}
