import { Fragment, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useApprovedSeries,
  useApprovedTotals,
  useBudgetCatalog,
  useExecutionRelease,
} from '@/features/national-budget/page/hooks/use-national-budget-page'
import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import { compare, type Comparison } from '@/features/national-budget/page/model/comparability'
import { TOTAL_DESCRIPTORS, REVENUE_TOTAL_LABEL } from '@/features/national-budget/page/model/descriptors'
import { executionHeadline } from '@/features/national-budget/page/model/execution-lines'
import { cn } from '@/lib/utils'
import type {
  ApprovedSeriesPoint,
  ApprovedTotalCell,
  BudgetCatalog,
  BudgetEdition,
  CreditType,
  ExecutionRelease,
} from '@/schemas/national-budget-page'
import { AuthorityRanking, AuthoritySheet } from './page.authorities'
import { ChecksList, Verdict, executionOperand, planOperand, pointOperand } from './page.compare'
import { ExecutionLines, WithRelease, componentOf, executionFigures, releaseSourceLink } from './page.execution'
import {
  componentLabel,
  coverageLabel,
  creditLabel,
  editionLabel,
  editionVersion,
  formatExactLei,
  formatInUnit,
  formatInteger,
  formatPercent,
  formatSignedLei,
  fundLabel,
  measureLabel,
  measureShort,
  monthLabel,
  sentenceCase,
  tableUnit,
} from './page.format'
import {
  Band,
  BandSkeleton,
  CoverageBand,
  EditionSelect,
  ExternalLink,
  Eyebrow,
  Frame,
  Missing,
  MockStrip,
  Money,
  NotesMarker,
  OriginChip,
  ReleasePicker,
  Segmented,
  SourceLine,
  TargetYears,
} from './page.parts'
import { ApiPending, PageShell, PageSkeleton, ShareButton, pageNotes } from './page.shell'
import {
  creditTypeOf,
  editionOf,
  latestRelease,
  targetOf,
  usePageState,
  type CompareKey,
  type PageState,
  type Question,
  type SetPageState,
} from './page.state'

/**
 * Variant B — Questions and evidence. Investigation first: three questions as
 * the page's spine („Ce s-a aprobat?", „Ce s-a executat?", „Ce s-a
 * schimbat?"), each with its own controls, an answer table that shows where
 * every figure was printed, and a rail that states the basis of the answer.
 */
export function QuestionsVariant() {
  const { state, set } = usePageState()
  return (
    <PageShell demo={state.demo}>
      <MockStrip />
      {state.demo === 'loading' ? (
        <PageSkeleton />
      ) : (
        <Band label={t`catalogul datelor`} fallback={<PageSkeleton />}>
          <Questions state={state} set={set} />
        </Band>
      )}
    </PageShell>
  )
}

const QUESTIONS: readonly { readonly key: Question; readonly number: string; readonly label: () => string; readonly short: () => string }[] = [
  { key: 'approved', number: '1', label: () => t`Ce s-a aprobat?`, short: () => t`Aprobat` },
  { key: 'executed', number: '2', label: () => t`Ce s-a executat?`, short: () => t`Executat` },
  { key: 'changed', number: '3', label: () => t`Ce s-a schimbat?`, short: () => t`Schimbat` },
]

function Questions({ state, set }: { readonly state: PageState; readonly set: SetPageState }) {
  const { data: catalog } = useBudgetCatalog()
  if (catalog.status === 'unavailable') return <ApiPending />
  const edition = editionOf(catalog, state.edition)
  const targetYear = targetOf(state, edition)
  const month = state.release ?? latestRelease(catalog)
  const notes = pageNotes({ catalog, edition, targetYear, month, state })

  return (
    <Tabs value={state.question} onValueChange={(value) => set({ question: value as Question })}>
      <header>
        <Frame className="pb-6 pt-8 sm:pt-12">
          <Eyebrow>{t`Buget · Național · Întrebări și dovezi`}</Eyebrow>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-[1.05] tracking-tighter sm:text-5xl">
            {t`Bugetul de stat, întrebare cu întrebare, cu dovada fiecărei cifre`}
          </h1>
        </Frame>
      </header>
      <div className="sticky top-0 z-20 border-y bg-background/95 backdrop-blur">
        <Frame className="flex items-center gap-2">
          <TabsList className="h-auto min-w-0 flex-1 justify-start gap-3 overflow-x-auto rounded-none bg-transparent p-0 sm:gap-8">
            {QUESTIONS.map((question) => (
              <TabsTrigger
                key={question.key}
                value={question.key}
                className="min-h-11 gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent px-0 py-3 text-sm text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{question.number}</span>
                <span className="sm:hidden">{question.short()}</span>
                <span className="hidden sm:inline">{question.label()}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <span className="flex shrink-0 items-center">
            <NotesMarker alerts={notes.alerts} facts={notes.facts} />
            <ShareButton className="hidden sm:inline-flex" />
          </span>
        </Frame>
      </div>

      <Frame className="py-8">
        <TabsContent value="approved" className="mt-0">
          <Approved catalog={catalog} edition={edition} targetYear={targetYear} state={state} set={set} />
        </TabsContent>
        <TabsContent value="executed" className="mt-0">
          <Executed catalog={catalog} month={month} state={state} set={set} />
        </TabsContent>
        <TabsContent value="changed" className="mt-0">
          <Changed catalog={catalog} edition={edition} targetYear={targetYear} state={state} set={set} />
        </TabsContent>
      </Frame>

      <Frame className="space-y-8 border-t py-8">
        <CoverageBand catalog={catalog} />
        <SourceLine
          items={[
            <ExternalLink key="law" href="https://data.gov.ro/dataset?q=bugetuldestat">
              {t`Legile bugetului 2019–2025, XML, data.gov.ro`}
            </ExternalLink>,
            <ExternalLink key="draft" href="https://mfinante.gov.ro/ro/acasa/transparenta/proiecte-acte-normative">
              {t`Proiectul 2026, Anexa 3, MF`}
            </ExternalLink>,
            <ReleaseSource key="release" month={month} />,
          ]}
          method={notes.facts}
        />
      </Frame>
    </Tabs>
  )
}

function ReleaseSource({ month }: { readonly month: string }) {
  const { data } = useExecutionRelease(month)
  if (data.status !== 'ok') return <span>{t`Buletinele execuției bugetare, MF`}</span>
  return releaseSourceLink(data)
}

/** The answer on the left, the basis of the answer in the rail (below it on a phone). */
function Answer({ controls, main, rail }: { readonly controls: ReactNode; readonly main: ReactNode; readonly rail: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">{controls}</div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-8">{main}</div>
        <aside className="space-y-5 border-t pt-6 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-label={t`Baza răspunsului`}>
          {rail}
        </aside>
      </div>
    </div>
  )
}

function RailFact({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}

// ── 1. Ce s-a aprobat? ──────────────────────────────────────────────────────

function Approved({
  catalog,
  edition,
  targetYear,
  state,
  set,
}: {
  readonly catalog: BudgetCatalog
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly state: PageState
  readonly set: SetPageState
}) {
  const creditType = creditTypeOf(state.credit)
  const authorityQuery = { edition, targetYear, creditType }
  return (
    <Answer
      controls={
        <>
          <EditionSelect catalog={catalog} value={edition.key} onChange={(key) => set({ edition: key, target: null, authority: null })} />
          <TargetYears edition={edition} value={targetYear} onChange={(year) => set({ target: year === edition.budgetYear ? null : year })} />
          <Segmented
            label={t`Tipul de credite`}
            size="sm"
            value={state.credit}
            onChange={(credit) => set({ credit })}
            options={[
              { value: 'budget', label: t`Credite bugetare` },
              { value: 'commitment', label: t`Credite de angajament` },
            ]}
          />
        </>
      }
      main={
        <>
          <Band label={t`totalurile legii`} fallback={<BandSkeleton rows={8} label={t`Se citesc totalurile`} />}>
            <ApprovedTable edition={edition} targetYear={targetYear} creditType={creditType} />
          </Band>
          <section aria-labelledby="who-title" className="space-y-3">
            <div>
              <h2 id="who-title" className="text-base font-semibold">
                {t`Și cui?`}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t`Ordonatorii principali ai bugetului de stat`} · {creditLabel(creditType)}
              </p>
            </div>
            <Band label={t`ordonatorii`} fallback={<BandSkeleton rows={10} label={t`Se citesc ordonatorii`} />}>
              <AuthorityRanking dense query={authorityQuery} search={state.q} onSearch={(q) => set({ q })} onOpen={(key) => set({ authority: key })} />
            </Band>
            <AuthoritySheet query={authorityQuery} authorityKey={state.authority} onClose={() => set({ authority: null })} />
          </section>
        </>
      }
      rail={
        <dl className="space-y-4">
          <RailFact label={t`Sursa`}>
            {editionLabel(edition)}, {editionVersion(edition)}
          </RailFact>
          <RailFact label={t`Ce înseamnă valoarea`}>{measureLabel(edition, targetYear)}</RailFact>
          {edition.counts ? (
            <RailFact label={t`Rânduri în ediție`}>
              <span className="tabular-nums">
                {t`${formatInteger(edition.counts.lines)}: ${formatInteger(edition.counts.approved)} aprobate, ${formatInteger(edition.counts.forecasts)} estimări`}
              </span>
            </RailFact>
          ) : (
            <RailFact label={t`Rânduri în ediție`}>{t`proiect extras din PDF, fără rânduri revizuite`}</RailFact>
          )}
          <RailFact label={t`Unitatea`}>{t`legea tipărește mii de lei; aici, lei (×1.000)`}</RailFact>
          <RailFact label={t`Cum citim un total`}>{t`din rândul de total tipărit, niciodată adunând rânduri: totalurile, subtotalurile și detaliile stau unele lângă altele`}</RailFact>
          <RailFact label={t`Credite`}>
            {t`Bugetare: cât se poate plăti în an. De angajament: cât se poate angaja, cu plăți și în anii următori. Nu se adună între ele.`}
          </RailFact>
        </dl>
      }
    />
  )
}

type ApprovedRow = { readonly key: string; readonly fund: string; readonly what: string; readonly cell: ApprovedTotalCell; readonly descriptor: string }

function descriptorText(cell: ApprovedTotalCell, fallback: string): string {
  if (cell.status !== 'ok') return fallback
  if (cell.origin === 'draft_static') return cell.descriptor
  const line = cell.line
  return line.rowRole === 'credit' ? `${line.label}, ${sentenceCase(line.context?.label ?? '')} (cap. ${line.codes.capitol})` : `${sentenceCase(line.label)} (cap. ${line.codes.capitol}.${line.codes.subcapitol})`
}

function ApprovedTable({ edition, targetYear, creditType }: { readonly edition: BudgetEdition; readonly targetYear: number; readonly creditType: CreditType }) {
  const { data } = useApprovedTotals({ edition: edition.key, targetYear, creditType })
  const [open, setOpen] = useState<string | null>(null)
  if (data.status !== 'ok') return <Missing reason={data.reason} />
  const rows: ApprovedRow[] = data.funds.flatMap((fund) => [
    { key: `${fund.fund}-revenue`, fund: fundLabel(fund.fund), what: t`Venituri`, cell: fund.revenue, descriptor: descriptorText(fund.revenue, sentenceCase(REVENUE_TOTAL_LABEL)) },
    {
      key: `${fund.fund}-credits`,
      fund: fundLabel(fund.fund),
      what: t`Cheltuieli`,
      cell: fund.credits,
      descriptor: descriptorText(fund.credits, `${sentenceCase(TOTAL_DESCRIPTORS[fund.fund].contextLabel)} (cap. ${TOTAL_DESCRIPTORS[fund.fund].capitol})`),
    },
  ])
  const state = data.funds.find((fund) => fund.fund === 'state_budget')
  const lei = (cell: ApprovedTotalCell | undefined) =>
    cell?.status === 'ok' ? approvedAmountToLei(cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei) : null
  const credits = lei(state?.credits)
  const revenue = lei(state?.revenue)
  const unit = tableUnit(rows.map((row) => lei(row.cell) ?? 0))
  return (
    <section aria-labelledby="approved-title" className="space-y-4">
      <h2 id="approved-title" className="text-xl font-semibold leading-snug sm:text-2xl">
        {measureLabel(edition, targetYear)}:{' '}
        {credits !== null ? (
          <>
            <Money lei={credits} /> <span className="font-normal text-muted-foreground">{t`cheltuieli`}</span>
          </>
        ) : (
          <span className="font-normal text-muted-foreground">{t`cheltuieli necunoscute în eșantion`}</span>
        )}
        {revenue !== null ? (
          <>
            {', '}
            <Money lei={revenue} /> <span className="font-normal text-muted-foreground">{t`venituri, la bugetul de stat`}</span>
          </>
        ) : null}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t`Totalurile tipărite ale legii, cu dovada`}</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-normal">{t`Bugetul`}</th>
              <th className="hidden py-1.5 pr-3 font-normal md:table-cell">{t`Rândul tipărit`}</th>
              <th className="py-1.5 pr-3 text-right font-normal">{unit.label}</th>
              <th className="hidden py-1.5 pr-3 text-right font-normal sm:table-cell">{t`Tipărit (mii lei)`}</th>
              <th className="py-1.5 font-normal">
                <span className="sr-only">{t`Dovada`}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const value = lei(row.cell)
              const isOpen = open === row.key
              const evidenceId = `evidence-${row.key}`
              return (
                <Fragment key={row.key}>
                  <tr className={cn('border-b', index % 2 === 1 && 'border-b-foreground/15')}>
                    <th scope="row" className="py-2 pr-3 text-left align-top font-normal">
                      {index % 2 === 0 ? <span className="font-medium">{row.fund}</span> : null}
                      <span className="block text-xs text-muted-foreground">{row.what}</span>
                      <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground md:hidden">{row.descriptor}</span>
                    </th>
                    <td className="hidden py-2 pr-3 align-top text-xs text-muted-foreground md:table-cell">{row.descriptor}</td>
                    <td className="py-2 pr-3 text-right align-top" title={value === null ? undefined : formatExactLei(value)}>
                      {value === null ? (
                        row.cell.status === 'unavailable' ? (
                          <Missing reason={row.cell.reason} className="justify-end text-xs" />
                        ) : (
                          <span className="text-xs text-destructive">{t`mai multe rânduri de total`}</span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          {row.cell.status === 'ok' ? <OriginChip origin={row.cell.origin} /> : null}
                          {formatInUnit(value, unit)}
                        </span>
                      )}
                    </td>
                    <td className="hidden py-2 pr-3 text-right align-top font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">
                      {row.cell.status === 'ok' && row.cell.origin === 'real_sample' ? row.cell.line.token : ''}
                    </td>
                    <td className="py-2 text-right align-top">
                      {row.cell.status === 'ok' ? (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={evidenceId}
                          onClick={() => setOpen(isOpen ? null : row.key)}
                          className="inline-flex min-h-11 items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground sm:min-h-0"
                        >
                          {t`Dovada`}
                          <ChevronRight className={cn('size-3.5 transition-transform motion-reduce:transition-none', isOpen && 'rotate-90')} aria-hidden="true" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {isOpen && row.cell.status === 'ok' ? (
                    <tr id={evidenceId} className="border-b bg-muted/30">
                      <td colSpan={5} className="px-3 py-3">
                        <Evidence cell={row.cell} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Evidence({ cell }: { readonly cell: Extract<ApprovedTotalCell, { status: 'ok' }> }) {
  if (cell.origin === 'draft_static') {
    return (
      <p className="text-xs text-muted-foreground">
        {t`Extras din PDF-urile Anexei 3 la proiectul din martie 2026 (23 martie 2026), nevalidat; fără fișier XML și fără amprentă.`}
      </p>
    )
  }
  const { line } = cell
  const facts: readonly [string, ReactNode][] = [
    [t`Anexa`, line.provenance.annex],
    [t`Formularul`, line.form],
    [t`Înregistrarea`, `#${line.provenance.recordIndex} · ${line.provenance.field}`],
    [t`Ce e`, `${line.rowRole === 'credit' ? t`rând de credite al rândului #${line.context?.recordIndex ?? '—'}` : t`rând descriptor`} · ${line.measure === 'approved' ? t`aprobat` : t`estimare`} ${line.measureYear}`],
    [t`Publicarea`, line.publication],
    [t`Fișierul`, <span key="file" className="break-all font-mono">{line.provenance.objectKey}</span>],
    [t`Versiunea`, <span key="version" className="break-all font-mono">{line.provenance.objectVersionId}</span>],
    [t`SHA-256`, <span key="sha" className="break-all font-mono">{line.provenance.contentSha256}</span>],
  ]
  return (
    <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]">
      {facts.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

// ── 2. Ce s-a executat? ─────────────────────────────────────────────────────

function Executed({
  catalog,
  month,
  state,
  set,
}: {
  readonly catalog: BudgetCatalog
  readonly month: string
  readonly state: PageState
  readonly set: SetPageState
}) {
  const [section, setSection] = useState<'expenditure' | 'revenue'>('expenditure')
  const component = componentOf(state.scope)
  const quick = catalog.releases.filter((release) => release.inSample).map((release) => release.periodEnd.slice(0, 7))
  return (
    <Answer
      controls={
        <>
          <ReleasePicker releases={catalog.releases} value={month} onChange={(value) => set({ release: value })} />
          <Segmented
            label={t`Buletine din eșantion`}
            size="sm"
            value={quick.includes(month) ? month : ''}
            onChange={(value) => set({ release: value })}
            options={quick.slice().reverse().map((value) => ({ value, label: coverageLabel(value) }))}
          />
          <Segmented
            label={t`Bugetul`}
            size="sm"
            value={state.scope}
            onChange={(scope) => set({ scope })}
            options={[
              { value: 'state', label: t`De stat` },
              { value: 'consolidated', label: t`General consolidat` },
            ]}
          />
        </>
      }
      main={
        <Band label={t`buletinul`} fallback={<BandSkeleton rows={10} label={t`Se citește buletinul`} />}>
          <WithRelease month={month}>
            {(release) => (
              <div className="space-y-5">
                <ExecutedHeadline release={release} component={component} />
                <Segmented
                  label={t`Secțiunea`}
                  size="sm"
                  value={section}
                  onChange={setSection}
                  options={[
                    { value: 'expenditure', label: t`Cheltuieli` },
                    { value: 'revenue', label: t`Venituri` },
                  ]}
                />
                <ExecutionLines
                  evidence
                  release={release}
                  component={component}
                  section={section}
                  foldBelow={2}
                  caption={section === 'revenue' ? t`Venituri încasate, cu celula din buletin` : t`Cheltuieli plătite, cu celula din buletin`}
                />
              </div>
            )}
          </WithRelease>
        </Band>
      }
      rail={
        <Band label={t`dovada buletinului`} fallback={<BandSkeleton rows={5} label={t`Se citește dovada`} />}>
          <ReleaseRail month={month} component={component} />
        </Band>
      }
    />
  )
}

function ExecutedHeadline({ release, component }: { readonly release: ExecutionRelease; readonly component: string }) {
  const figures = executionFigures(release, component)
  const [revenue, spent, balance] = figures
  return (
    <h2 className="text-xl font-semibold leading-snug sm:text-2xl">
      {coverageLabel(release.periodEnd.slice(0, 7))}, {componentLabel(component).toLowerCase()}:{' '}
      {spent.lei !== null ? (
        <>
          <Money lei={spent.lei} /> <span className="font-normal text-muted-foreground">{t`plătite`}</span>
        </>
      ) : null}
      {revenue.lei !== null ? (
        <>
          {', '}
          <Money lei={revenue.lei} /> <span className="font-normal text-muted-foreground">{t`încasate`}</span>
        </>
      ) : null}
      {balance.lei !== null ? (
        <>
          {', '}
          <span className="font-normal text-muted-foreground">{t`sold`}</span> <Money lei={balance.lei} />
          {balance.gdpPercent !== null ? <span className="font-normal text-muted-foreground"> ({t`${formatPercent(balance.gdpPercent, 2)} din PIB`})</span> : null}
        </>
      ) : null}
    </h2>
  )
}

function ReleaseRail({ month, component }: { readonly month: string; readonly component: string }) {
  const { data } = useExecutionRelease(month)
  if (data.status !== 'ok') {
    return (
      <dl className="space-y-4">
        <RailFact label={t`Buletinul`}>{monthLabel(month)}</RailFact>
        <RailFact label={t`Starea`}>{data.status === 'gap' ? t`nepublicat` : <Missing reason={data.reason} />}</RailFact>
      </dl>
    )
  }
  const sample = executionHeadline(data.facts, { component, section: 'expenditure' })?.amount ?? data.facts[0]
  return (
    <dl className="space-y-4">
      <RailFact label={t`Fișierul`}>{releaseSourceLink(data)}</RailFact>
      <RailFact label={t`Perioada acoperită`}>
        <span className="tabular-nums">
          {sample?.fiscalStart} – {sample?.fiscalEnd}
        </span>
        <span className="block text-xs text-muted-foreground">{t`cumulat de la 1 ianuarie; lunile nu se scad între ele peste goluri`}</span>
      </RailFact>
      <RailFact label={t`Starea`}>
        {sample?.executionStatus === 'actual' ? t`execuție efectivă` : t`estimare`} ·{' '}
        {sample?.finality === 'final' ? t`finală` : sample?.finality === 'operative' ? t`operativă` : t`finalitate nedeclarată`}
        <span className="block text-xs text-muted-foreground">{t`Decembrie înseamnă cumulat la decembrie, nu contul general de execuție.`}</span>
      </RailFact>
      <RailFact label={t`Unitatea`}>{t`lei, așa cum o declară faptul; procentele din PIB, ca fracție`}</RailFact>
      <RailFact label={t`Eliberarea`}>
        <span className="break-all font-mono text-xs">{data.releaseId}</span>
      </RailFact>
      <RailFact label={t`SHA-256 al fișierului`}>
        <span className="break-all font-mono text-xs">{data.originalSha256}</span>
      </RailFact>
    </dl>
  )
}

// ── 3. Ce s-a schimbat? ─────────────────────────────────────────────────────

const PRESETS: readonly { readonly key: CompareKey; readonly label: () => string }[] = [
  { key: 'forecasts', label: () => t`Același an, de la o lege la alta` },
  { key: 'approved-years', label: () => t`Aprobat, de la un an la altul` },
  { key: 'plan-execution', label: () => t`Plan față de execuție` },
  { key: 'release-periods', label: () => t`Execuție față de execuție` },
]

function Changed({
  catalog,
  edition,
  targetYear,
  state,
  set,
}: {
  readonly catalog: BudgetCatalog
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly state: PageState
  readonly set: SetPageState
}) {
  const [line, setLine] = useState<'credits' | 'revenue'>('credits')
  const years = [...new Set(catalog.editions.flatMap((item) => item.targetYears))].slice().sort((a, b) => a - b)
  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label={t`Ce comparăm`} className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {PRESETS.map((preset) => {
          const active = state.compare === preset.key
          return (
            <button
              key={preset.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set({ compare: preset.key })}
              className={cn('min-h-11 bg-background px-3 py-2.5 text-left text-sm transition-colors', active ? 'font-semibold text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}
            >
              {preset.label()}
            </button>
          )
        })}
      </div>
      {state.compare === 'forecasts' || state.compare === 'approved-years' ? (
        <div className="flex flex-wrap items-center gap-2">
          {state.compare === 'forecasts' ? (
            <Segmented label={t`Anul comparat`} size="sm" value={targetYear} onChange={(year) => set({ target: year })} options={years.filter((year) => year >= 2020 && year <= 2028).map((year) => ({ value: year, label: String(year) }))} />
          ) : null}
          <Segmented
            label={t`Ce comparăm`}
            size="sm"
            value={line}
            onChange={setLine}
            options={[
              { value: 'credits', label: t`Cheltuieli (credite bugetare)` },
              { value: 'revenue', label: t`Venituri` },
            ]}
          />
        </div>
      ) : null}
      <Band label={t`comparația`} fallback={<BandSkeleton rows={8} label={t`Se citește comparația`} />}>
        {state.compare === 'forecasts' ? (
          <ForecastHistory catalog={catalog} targetYear={state.target ?? targetYear} line={line} />
        ) : state.compare === 'approved-years' ? (
          <ApprovedYears line={line} />
        ) : state.compare === 'plan-execution' ? (
          <PlanVersusExecution catalog={catalog} edition={edition} targetYear={targetYear} />
        ) : (
          <ReleasePeriods catalog={catalog} />
        )}
      </Band>
    </div>
  )
}

/** A comparison table on the left, the checks of its pairs in the rail. */
function ComparisonLayout({ title, main, comparison }: { readonly title: ReactNode; readonly main: ReactNode; readonly comparison: Comparison | null }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-4">
        <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{title}</h2>
        {main}
      </div>
      <aside className="space-y-3 border-t pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-label={t`Baza comparației`}>
        <p className="text-sm font-semibold">{t`Baza comparației`}</p>
        {comparison ? (
          <>
            <Verdict comparison={comparison} />
            <ChecksList comparison={comparison} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t`Nu există o pereche de comparat.`}</p>
        )}
      </aside>
    </div>
  )
}

function ChangeCell({ comparison }: { readonly comparison: Comparison | null }) {
  if (!comparison) return <span className="text-xs text-muted-foreground">—</span>
  if (!comparison.difference) return <span className="text-xs text-amber-800 dark:text-amber-300">{t`nu se compară`}</span>
  return (
    <span className="tabular-nums">
      {formatSignedLei(comparison.difference.lei)}
      {comparison.difference.relative !== null ? (
        <span className="ml-2 text-xs text-muted-foreground">{formatPercent(comparison.difference.relative * 100, 1, true)}</span>
      ) : null}
    </span>
  )
}

function editionName(catalog: BudgetCatalog, point: ApprovedSeriesPoint): string {
  const edition = catalog.editions.find((item) => item.key === point.edition)
  return edition ? editionLabel(edition) : point.edition
}

function ForecastHistory({ catalog, targetYear, line }: { readonly catalog: BudgetCatalog; readonly targetYear: number; readonly line: 'credits' | 'revenue' }) {
  const { data } = useApprovedSeries({ fund: 'state_budget', line, creditType: 'budget_credits' })
  if (data.status !== 'ok') return <Missing reason={data.reason} />
  const points = data.points.filter((point) => point.measureYear === targetYear)
  const basis = line === 'credits' ? 'budget_credits' : 'revenue'
  const pairs = points.map((point, index) => (index === 0 ? null : compare(pointOperand(points[index - 1], 'state_budget', basis), pointOperand(point, 'state_budget', basis))))
  const last = pairs.slice(-1)[0] ?? null
  return (
    <ComparisonLayout
      comparison={last}
      title={
        points.length === 0
          ? t`Nicio lege din eșantion nu are o valoare pentru ${targetYear}.`
          : line === 'credits'
            ? t`Cheltuielile bugetului de stat pentru ${targetYear}, în ${points.length} legi`
            : t`Veniturile bugetului de stat pentru ${targetYear}, în ${points.length} legi`
      }
      main={
        points.length === 0 ? null : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t`Valoarea pentru ${targetYear} în fiecare lege`}</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-normal">{t`Legea`}</th>
                <th className="py-1.5 pr-3 font-normal">{t`Tipul`}</th>
                <th className="py-1.5 pr-3 text-right font-normal">{t`Valoarea`}</th>
                <th className="py-1.5 text-right font-normal">{t`Față de legea de dinainte`}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={point.edition} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    <span className="inline-flex items-center gap-1.5">
                      {editionName(catalog, point)}
                      <OriginChip origin={point.origin} />
                    </span>
                  </th>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {point.kind === 'forecast' ? t`estimare` : point.kind === 'proposed' ? t`propus` : t`aprobat`}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Money lei={approvedAmountToLei(point.amountThousandLei)} tabular />
                  </td>
                  <td className="py-2 text-right">{index === 0 ? <span className="text-xs text-muted-foreground">—</span> : <ChangeCell comparison={pairs[index]} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    />
  )
}

function ApprovedYears({ line }: { readonly line: 'credits' | 'revenue' }) {
  const { data } = useApprovedSeries({ fund: 'state_budget', line, creditType: 'budget_credits' })
  if (data.status !== 'ok') return <Missing reason={data.reason} />
  const own = data.points.filter((point) => point.kind !== 'forecast').slice().sort((a, b) => a.measureYear - b.measureYear)
  const basis = line === 'credits' ? 'budget_credits' : 'revenue'
  const pairs = own.map((point, index) => (index === 0 ? null : compare(pointOperand(own[index - 1], 'state_budget', basis), pointOperand(point, 'state_budget', basis))))
  const reviewedPairs = pairs.filter((pair, index) => pair && own[index].origin === 'real_sample')
  return (
    <ComparisonLayout
      comparison={reviewedPairs.slice(-1)[0] ?? null}
      title={line === 'credits' ? t`Cheltuielile aprobate ale bugetului de stat, an de an` : t`Veniturile aprobate ale bugetului de stat, an de an`}
      main={
        <table className="w-full text-sm">
          <caption className="sr-only">{t`Valoarea aprobată de fiecare lege pentru anul ei`}</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-normal">{t`Anul`}</th>
              <th className="py-1.5 pr-3 text-right font-normal">{t`Aprobat`}</th>
              <th className="py-1.5 text-right font-normal">{t`Față de anul de dinainte (nominal)`}</th>
            </tr>
          </thead>
          <tbody>
            {own.map((point, index) => (
              <tr key={point.edition} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    {point.measureYear}
                    {point.kind === 'proposed' ? <span className="text-xs text-muted-foreground">{t`propus`}</span> : null}
                    <OriginChip origin={point.origin} />
                  </span>
                </th>
                <td className="py-2 pr-3 text-right">
                  <Money lei={approvedAmountToLei(point.amountThousandLei)} tabular />
                </td>
                <td className="py-2 text-right">{index === 0 ? <span className="text-xs text-muted-foreground">—</span> : <ChangeCell comparison={pairs[index]} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  )
}

function PlanVersusExecution({ catalog, edition, targetYear }: { readonly catalog: BudgetCatalog; readonly edition: BudgetEdition; readonly targetYear: number }) {
  const december = `${targetYear}-12`
  const published = catalog.releases.find((release) => release.periodEnd.startsWith(december))
  const month = published?.status === 'selected' ? december : (catalog.releases.filter((release) => release.status === 'selected').slice(-1)[0]?.periodEnd.slice(0, 7) ?? december)
  const { data: totals } = useApprovedTotals({ edition: edition.key, targetYear, creditType: 'budget_credits' })
  const { data: release } = useExecutionRelease(month)
  const state = totals.status === 'ok' ? totals.funds.find((fund) => fund.fund === 'state_budget') : undefined
  const amount = (cell: ApprovedTotalCell | undefined) =>
    cell?.status === 'ok' ? (cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei) : null
  const credits = amount(state?.credits)
  const revenue = amount(state?.revenue)
  const spent = release.status === 'ok' ? executionHeadline(release.facts, { component: 'state_budget', section: 'expenditure' })?.amount ?? null : null
  const collected = release.status === 'ok' ? executionHeadline(release.facts, { component: 'state_budget', section: 'revenue' })?.amount ?? null : null
  const pairs = [
    {
      key: 'spending',
      label: t`Cheltuieli`,
      plan: credits,
      fact: spent,
      comparison: credits && spent ? compare(planOperand({ edition, targetYear, fund: 'state_budget', basis: 'budget_credits', amountThousandLei: credits }), executionOperand(spent)) : null,
    },
    {
      key: 'revenue',
      label: t`Venituri`,
      plan: revenue,
      fact: collected,
      comparison: revenue && collected ? compare(planOperand({ edition, targetYear, fund: 'state_budget', basis: 'revenue', amountThousandLei: revenue }), executionOperand(collected)) : null,
    },
  ]
  return (
    <ComparisonLayout
      comparison={pairs[0].comparison ?? pairs[1].comparison}
      title={t`${measureLabel(edition, targetYear)} față de execuția ${coverageLabel(month)}, bugetul de stat`}
      main={
        <table className="w-full text-sm">
          <caption className="sr-only">{t`Planul și execuția, puse alături fără să fie împărțite`}</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-normal" />
              <th className="py-1.5 pr-3 text-right font-normal">{t`Plan (${measureShort(edition, targetYear)})`}</th>
              <th className="py-1.5 pr-3 text-right font-normal">{t`Execuție`}</th>
              <th className="py-1.5 text-right font-normal">{t`Diferență`}</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.key} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  {pair.label}
                </th>
                <td className="py-2 pr-3 text-right">{pair.plan ? <Money lei={approvedAmountToLei(pair.plan)} tabular /> : <Missing reason="not_in_sample" className="justify-end text-xs" />}</td>
                <td className="py-2 pr-3 text-right">{pair.fact ? <Money lei={Number(pair.fact.value)} tabular /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="py-2 text-right">
                  <ChangeCell comparison={pair.comparison} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  )
}

function ReleasePeriods({ catalog }: { readonly catalog: BudgetCatalog }) {
  const months = catalog.releases.filter((release) => release.inSample).map((release) => release.periodEnd.slice(0, 7))
  const [earlier, later] = months
  const sameMonthBefore = later ? `${Number(later.slice(0, 4)) - 1}${later.slice(4)}` : null
  return (
    <ReleasePair
      earlier={earlier}
      later={later}
      sameMonthBefore={sameMonthBefore}
      catalog={catalog}
    />
  )
}

function ReleasePair({
  earlier,
  later,
  sameMonthBefore,
  catalog,
}: {
  readonly earlier: string
  readonly later: string
  readonly sameMonthBefore: string | null
  readonly catalog: BudgetCatalog
}) {
  const { data: a } = useExecutionRelease(earlier)
  const { data: b } = useExecutionRelease(later)
  const { data: before } = useExecutionRelease(sameMonthBefore ?? later)
  const spent = (release: typeof a) =>
    release.status === 'ok' ? executionHeadline(release.facts, { component: 'state_budget', section: 'expenditure' })?.amount ?? null : null
  const factA = spent(a)
  const factB = spent(b)
  const comparison = factA && factB ? compare(executionOperand(factA), executionOperand(factB)) : null
  const beforeEntry = sameMonthBefore ? catalog.releases.find((release) => release.periodEnd.startsWith(sameMonthBefore)) : undefined
  return (
    <ComparisonLayout
      comparison={comparison}
      title={t`Cheltuielile bugetului de stat: ${coverageLabel(later)} față de ${coverageLabel(earlier)}`}
      main={
        <div className="space-y-4">
          <table className="w-full text-sm">
            <caption className="sr-only">{t`Două buletine puse alături`}</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-normal">{t`Buletinul`}</th>
                <th className="py-1.5 pr-3 font-normal">{t`Acoperă`}</th>
                <th className="py-1.5 text-right font-normal">{t`Cheltuieli plătite`}</th>
              </tr>
            </thead>
            <tbody>
              {[factA, factB].map((fact, index) => (
                <tr key={index} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    {monthLabel(index === 0 ? earlier : later)}
                  </th>
                  <td className="py-2 pr-3 text-xs tabular-nums text-muted-foreground">{fact ? `${fact.fiscalStart} – ${fact.fiscalEnd}` : ''}</td>
                  <td className="py-2 text-right">{fact ? <Money lei={Number(fact.value)} tabular /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              ))}
              {sameMonthBefore ? (
                <tr>
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    {monthLabel(sameMonthBefore)}
                  </th>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{t`aceleași luni, cu un an înainte: perechea comparabilă`}</td>
                  <td className="py-2 text-right">
                    {before.status === 'ok' && spent(before) ? (
                      <Money lei={Number(spent(before)?.value)} tabular />
                    ) : before.status === 'ok' ? (
                      <span className="text-xs text-muted-foreground">{t`gol în sursă`}</span>
                    ) : before.status === 'gap' ? (
                      <span className="text-xs text-muted-foreground">{t`nepublicat`}</span>
                    ) : (
                      <Missing reason={before.reason} className="justify-end text-xs" />
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {beforeEntry?.status === 'selected' && before.status !== 'ok' ? (
            <p className="text-xs text-muted-foreground">
              {t`Comparația potrivită e ${coverageLabel(later)} față de ${coverageLabel(sameMonthBefore ?? later)}: buletinul e publicat în producție, dar nu e în eșantionul machetei.`}
            </p>
          ) : null}
        </div>
      }
    />
  )
}
