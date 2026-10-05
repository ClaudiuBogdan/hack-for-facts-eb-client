import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, ChevronRight, FileSearch } from 'lucide-react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useAnafStateBudget,
  useApprovedSeries,
  useApprovedTotals,
  useAuthorities,
  useExecutionRelease,
} from '@/features/national-budget/page/hooks/use-national-budget-page'
import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import type { ApprovedTotalCell, BudgetCatalog, ExecutionFact } from '@/schemas/national-budget-page'
import { cn } from '@/lib/utils'
import {
  authorityName,
  fundName,
  gapText,
  lineLabel,
  billionsText,
  missingText,
  moneyText,
  monthText,
  percentText,
} from './budget.format'
import { anafRanking, headlineOf, lineRows } from './budget.model'
import { DraftMark, entityHref } from './budget.parts'
import { AXES, type AnalysisState } from './budget.state'
import { LEVELS, axisLabel, editionOfYear, releaseMonthOf } from './analize.view'

/**
 * The answer, as the procurement analytics page gives it: the tabs over the
 * table (the axis), the measure at the right, the level under them; then the
 * table of every number at once. A row that has lines under it opens them; a
 * row's evidence (the cell, the printed value, the file) is one icon away.
 */

/** The bar's controls: 44 px on a phone, 40 from a small screen up, as the analytics page's. */
const CONTROL_HEIGHT = '[&>button]:min-h-11 sm:[&>button]:min-h-10 sm:[&>button]:px-4'

export function AnswerBar({ state, onChange }: { readonly state: AnalysisState; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  const execution = state.tip === 'cheltuieli' || state.tip === 'venituri'
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label={t`După ce`} className="flex flex-wrap gap-x-4 gap-y-1 border-b">
          {AXES[state.tip].map((axis) => {
            const active = axis === state.dupa
            return (
              <button
                key={axis}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange({ dupa: axis })}
                className={cn('-mb-px border-b-2 px-0.5 pb-2 text-sm', active ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
              >
                {axisLabel(axis)}
              </button>
            )
          })}
        </div>
        {execution && state.buget === 'consolidat' ? (
          <IndicatorToggle<AnalysisState['masura']>
            label={t`Măsura`}
            value={state.masura}
            onChange={(masura) => onChange({ masura })}
            options={[
              { key: 'lei', label: t`Lei` },
              { key: 'pib', label: t`% din PIB` },
            ]}
            className={CONTROL_HEIGHT}
          />
        ) : state.tip === 'lege' && state.dupa !== 'ordonatori' ? (
          <IndicatorToggle<AnalysisState['linie']>
            label={t`Rândul`}
            value={state.linie}
            onChange={(linie) => onChange({ linie })}
            options={[
              { key: 'cheltuieli', label: t`Cheltuieli` },
              { key: 'venituri', label: t`Venituri` },
            ]}
            className={CONTROL_HEIGHT}
          />
        ) : null}
      </div>
      {execution && !state.rand ? (
        <IndicatorToggle<string>
          label={t`Nivelul`}
          value={String(state.nivel)}
          onChange={(level) => onChange({ nivel: Number(level) as AnalysisState['nivel'] })}
          options={LEVELS[state.tip === 'cheltuieli' ? 'cheltuieli' : 'venituri'].map((level) => ({ key: level.key, label: level.label() }))}
          className={cn(CONTROL_HEIGHT, 'self-start')}
        />
      ) : null}
    </div>
  )
}

function Unavailable({ children }: { readonly children: ReactNode }) {
  return <p className="py-8 text-sm text-muted-foreground">{children}</p>
}

/** A share drawn as the analytics page draws it: against the widest row, the percent beside. */
function ShareCell({ share, widest, muted = false }: { readonly share: number | null; readonly widest: number; readonly muted?: boolean }) {
  if (share === null) return null
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="block h-1.5 w-20 bg-muted/70">
        <span className={cn('block h-1.5', muted ? 'bg-amber-600/60' : 'bg-primary/75')} style={{ width: `${Math.max(Math.min((share / widest) * 100, 100), 1).toFixed(1)}%` }} />
      </span>
      <span className="w-12 text-right text-xs tabular-nums">{percentText(share, share < 0.1 ? 1 : 0)}</span>
    </span>
  )
}

function EvidenceIcon({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        onClick={(event) => event.stopPropagation()}
        className="inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-[color,opacity] hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={t`De unde vine: ${label}`}
      >
        <FileSearch className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,24rem)] text-xs" onClick={(event) => event.stopPropagation()}>
        {children}
      </PopoverContent>
    </Popover>
  )
}

function EvidenceList({ items }: { readonly items: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
      {items.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function factEvidence(fact: ExecutionFact): readonly (readonly [string, ReactNode])[] {
  const file = fact.sourceUrl.split('/').pop() ?? fact.sourceUrl
  return [
    [t`Rândul sursei`, fact.lineItem],
    [t`Celula`, <span key="cell" className="font-mono">{fact.observationKey.split('!')[1]}</span>],
    [t`Tipărit`, <span key="token" className="font-mono">{t`${fact.sourceToken} mii lei`}</span>],
    [t`Acoperă`, `${fact.fiscalStart ?? '—'} – ${fact.fiscalEnd ?? '—'}`],
    [t`Starea`, `${fact.executionStatus === 'actual' ? t`execuție efectivă` : t`estimare`} · ${fact.finality === 'final' ? t`finală` : t`finalitate nedeclarată`}`],
    [
      t`Fișierul`,
      <a key="file" href={fact.sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
        {file} ↗
      </a>,
    ],
    [t`SHA-256`, <span key="sha" className="break-all font-mono">{fact.originalSha256}</span>],
  ]
}

// ─────────────────────────────────────────────────── the bulletin's lines ──

export function LinesTable({ state, catalog, onChange }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  const month = releaseMonthOf(catalog, state.an)
  if (!month) return <Unavailable>{t`Nu există buletin pentru ${state.an} în date.`}</Unavailable>
  return <LinesFor state={state} month={month} onChange={onChange} />
}

function LinesFor({ state, month, onChange }: { readonly state: AnalysisState; readonly month: string; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  const { data: release } = useExecutionRelease(month)
  const section = state.tip === 'cheltuieli' ? 'expenditure' : 'revenue'
  if (release.status === 'gap') return <Unavailable>{t`Buletinul pentru ${monthText(month)} nu e publicat: ${gapText(release.reason)}.`}</Unavailable>
  if (release.status === 'unavailable') return <Unavailable>{t`Buletinul pentru ${monthText(month)}: ${missingText(release.reason)}.`}</Unavailable>
  const rows = lineRows(release, { scope: state.buget, section, depth: state.rand ? 4 : state.nivel, under: state.rand })
  if (rows.length === 0) return <Unavailable>{t`Buletinul nu are rânduri pentru această selecție.`}</Unavailable>
  // An opened line's rows are not summed into a total here: the line's own printed value is the total, and this sample carries no such row.
  const total = state.rand ? null : (headlineOf(release, state.buget, section)?.lei ?? null)
  const byGdp = state.masura === 'pib' && state.buget === 'consolidat'
  const showGdp = rows.some((row) => row.gdpPercent !== null)
  const widest = Math.max(0.0001, ...rows.map((row) => row.share ?? 0))
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>
              <span className="sr-only">{t`Rândul`}</span>
            </TableHead>
            <TableHead className={cn('text-right', byGdp && 'hidden sm:table-cell', !byGdp && 'font-semibold text-foreground')}>{t`Lei`}</TableHead>
            {showGdp ? <TableHead className={cn('text-right', !byGdp && 'hidden sm:table-cell', byGdp && 'font-semibold text-foreground')}>{t`% din PIB`}</TableHead> : null}
            <TableHead className="hidden w-36 text-right sm:table-cell">{t`Cota`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.lineItem} className={cn('group', row.opens && 'cursor-pointer')} onClick={row.opens ? () => onChange({ rand: row.lineItem }) : undefined}>
              <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="max-w-[12rem] sm:max-w-md">
                <span className="flex items-center gap-1.5">
                  {row.opens ? (
                    <button type="button" onClick={() => onChange({ rand: row.lineItem })} className="truncate text-left hover:underline" title={t`Ce cuprinde`}>
                      {lineLabel(row.lineItem)}
                    </button>
                  ) : (
                    <span className="truncate" title={row.lineItem}>
                      {lineLabel(row.lineItem)}
                    </span>
                  )}
                  {row.opens ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                  <EvidenceIcon label={lineLabel(row.lineItem)}>
                    <EvidenceList items={factEvidence(row.fact)} />
                  </EvidenceIcon>
                </span>
              </TableCell>
              <TableCell className={cn('text-right tabular-nums', byGdp && 'hidden sm:table-cell', row.lei === null && 'text-muted-foreground')}>
                {row.lei === null ? t`gol în sursă` : moneyText(row.lei)}
              </TableCell>
              {showGdp ? (
                <TableCell className={cn('text-right tabular-nums', !byGdp && 'hidden sm:table-cell')}>{row.gdpPercent !== null ? percentText(row.gdpPercent / 100, 2) : '—'}</TableCell>
              ) : null}
              <TableCell className="hidden sm:table-cell">
                <ShareCell share={row.share} widest={widest} />
              </TableCell>
            </TableRow>
          ))}
          {total !== null ? (
            <TableRow className="text-muted-foreground hover:bg-transparent">
              <TableCell />
              <TableCell>{state.rand ? t`Total ${lineLabel(state.rand).toLocaleLowerCase('ro-RO')}` : t`Total`}</TableCell>
              <TableCell className={cn('text-right font-semibold tabular-nums text-foreground', byGdp && 'hidden sm:table-cell')}>{moneyText(total)}</TableCell>
              {showGdp ? <TableCell className={cn(!byGdp && 'hidden sm:table-cell')} /> : null}
              <TableCell className="hidden sm:table-cell" />
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>{state.rand ? t`Rândurile liniei deschise, cum le tipărește buletinul; o grupă se deschide cu un clic.` : t`Rândurile se adună la total; o grupă se deschide cu un clic.`}</span>
        {state.rand ? (
          <button type="button" onClick={() => onChange({ rand: null })} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`Înapoi la toate rândurile`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── the law ──

function lawCellText(cell: ApprovedTotalCell | undefined): string {
  if (!cell) return '—'
  if (cell.status === 'ok') return moneyText(approvedAmountToLei(cell.origin === 'real_sample' ? cell.line.amountThousandLei : cell.amountThousandLei))
  if (cell.status === 'ambiguous') return t`mai multe rânduri de total`
  return '—'
}

function lawEvidence(cell: ApprovedTotalCell): ReactNode {
  if (cell.status === 'unavailable') return <p className="text-muted-foreground">{missingText(cell.reason)}</p>
  if (cell.status === 'ambiguous') return <p className="text-muted-foreground">{t`${cell.count} rânduri potrivesc totalul: nu le adunăm.`}</p>
  if (cell.origin === 'draft_static') return <p className="text-muted-foreground">{t`Extras din PDF-urile Anexei 3 la proiectul din martie 2026; nevalidat, fără fișier XML.`}</p>
  const { line } = cell
  return (
    <EvidenceList
      items={[
        [t`Rândul tipărit`, `${line.rowRole === 'credit' ? `${line.label}, ` : ''}${line.context?.label ?? line.label}`],
        [t`Codul`, <span key="code" className="font-mono">{`cap. ${line.codes.capitol}${line.codes.subcapitol ? `.${line.codes.subcapitol}` : ''}`}</span>],
        [t`Tipărit`, <span key="token" className="font-mono">{t`${line.token} mii lei`}</span>],
        [t`Anexa`, line.provenance.annex],
        [t`Înregistrarea`, `#${line.provenance.recordIndex} · ${line.provenance.field}`],
        [t`Publicarea`, t`legea pe ${line.budgetYear}, trimisă la Monitorul Oficial`],
        [t`Fișierul`, <span key="file" className="break-all font-mono">{line.provenance.objectKey}</span>],
        [t`SHA-256`, <span key="sha" className="break-all font-mono">{line.provenance.contentSha256}</span>],
      ]}
    />
  )
}

export function LawFundsTable({ state, catalog }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog }) {
  const edition = editionOfYear(catalog, state.an)
  if (!edition) return <Unavailable>{t`Legea bugetului pe ${state.an} nu e încă în date.`}</Unavailable>
  return <LawFunds state={state} editionKey={edition.key} draft={edition.status === 'draft'} />
}

function LawFunds({ state, editionKey, draft }: { readonly state: AnalysisState; readonly editionKey: string; readonly draft: boolean }) {
  const { data } = useApprovedTotals({ edition: editionKey, targetYear: state.an, creditType: state.credite === 'bugetare' ? 'budget_credits' : 'commitment_credits' })
  if (data.status !== 'ok') return <Unavailable>{missingText(data.reason)}</Unavailable>
  const creditsHead = state.credite === 'bugetare' ? t`Credite bugetare` : t`Credite de angajament`
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>
              <span className="sr-only">{t`Bugetul`}</span>
              {draft ? <DraftMark /> : null}
            </TableHead>
            <TableHead className={cn('text-right', state.linie === 'venituri' && 'font-semibold text-foreground')}>{t`Venituri`}</TableHead>
            <TableHead className={cn('text-right', state.linie === 'cheltuieli' && 'font-semibold text-foreground')}>{creditsHead}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.funds.map((fund, index) => (
            <TableRow key={fund.fund} className="group">
              <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  {fundName(fund.fund)}
                  <EvidenceIcon label={fundName(fund.fund)}>
                    <div className="space-y-3">
                      <div>
                        <MonoLabel className="block text-muted-foreground">{t`Venituri`}</MonoLabel>
                        <div className="mt-1.5">{lawEvidence(fund.revenue)}</div>
                      </div>
                      <div>
                        <MonoLabel className="block text-muted-foreground">{creditsHead}</MonoLabel>
                        <div className="mt-1.5">{lawEvidence(fund.credits)}</div>
                      </div>
                    </div>
                  </EvidenceIcon>
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums" title={fund.revenue.status === 'unavailable' ? missingText(fund.revenue.reason) : undefined}>
                {lawCellText(fund.revenue)}
              </TableCell>
              <TableCell className="text-right tabular-nums" title={fund.credits.status === 'unavailable' ? missingText(fund.credits.reason) : undefined}>
                {lawCellText(fund.credits)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-muted-foreground">
        {t`Fiecare valoare e rândul de total tipărit al bugetului; patru bugete separate, care nu se adună. „—": valoarea nu e în eșantion sau nu e tipărită (pictograma spune care).`}
      </p>
    </div>
  )
}

/** Every law's plan for every year it covers: one row per law, its own year bold, its forecasts beside; a law is never merged into another. */
export function LawMatrix({ state, catalog }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog }) {
  const { data } = useApprovedSeries({ fund: 'state_budget', line: state.linie === 'cheltuieli' ? 'credits' : 'revenue', creditType: 'budget_credits' })
  if (data.status !== 'ok') return <Unavailable>{missingText(data.reason)}</Unavailable>
  if (data.points.length === 0) return <Unavailable>{t`Nicio lege nu are valori pentru acest rând.`}</Unavailable>
  const years = [...new Set(data.points.map((point) => point.measureYear))].sort((a, b) => a - b)
  const editions = catalog.editions.filter((edition) => data.points.some((point) => point.edition === edition.key))
  return (
    <div>
      <div className="overflow-x-auto">
        <Table className="min-w-[38rem]">
          <TableHeader>
            <TableRow>
              <TableHead>{t`Legea · mld. lei`}</TableHead>
              {years.map((year) => (
                <TableHead key={year} className={cn('text-right tabular-nums', year === state.an && 'font-semibold text-foreground')}>
                  {year}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((edition) => (
              <TableRow key={edition.key}>
                <TableCell className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {edition.status === 'draft' ? t`Proiectul ${edition.budgetYear}` : t`Legea ${edition.budgetYear}`}
                    {edition.status === 'draft' ? <DraftMark /> : null}
                  </span>
                </TableCell>
                {years.map((year) => {
                  const point = data.points.find((item) => item.edition === edition.key && item.measureYear === year)
                  return (
                    <TableCell
                      key={year}
                      className={cn('text-right tabular-nums', point?.kind !== 'forecast' && point ? 'font-semibold text-foreground' : 'text-muted-foreground', year === state.an && 'bg-muted/40')}
                      title={point ? `${point.kind === 'forecast' ? t`estimare pentru ${year}` : point.kind === 'proposed' ? t`propus pentru ${year}` : t`aprobat pentru ${year}`}: ${moneyText(approvedAmountToLei(point.amountThousandLei))}` : undefined}
                    >
                      {point ? billionsText(approvedAmountToLei(point.amountThousandLei)) : ''}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {state.linie === 'cheltuieli'
          ? t`Bugetul de stat, credite bugetare, în lei. Îngroșat: ce a aprobat legea pentru anul ei; în rest, estimările ei pentru anii următori. Coloana ${state.an}: cum s-a schimbat planul pentru acel an, de la o lege la alta.`
          : t`Bugetul de stat, venituri, în lei. Îngroșat: ce a prevăzut legea pentru anul ei; în rest, estimările ei. Coloana ${state.an}: cum s-a schimbat planul pentru acel an.`}
      </p>
    </div>
  )
}

export function LawAuthorities({ state, catalog, onChange }: { readonly state: AnalysisState; readonly catalog: BudgetCatalog; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  const edition = editionOfYear(catalog, state.an)
  if (!edition) return <Unavailable>{t`Legea bugetului pe ${state.an} nu e încă în date.`}</Unavailable>
  return <LawAuthoritiesFor state={state} editionKey={edition.key} draft={edition.status === 'draft'} onChange={onChange} />
}

function LawAuthoritiesFor({ state, editionKey, draft, onChange }: { readonly state: AnalysisState; readonly editionKey: string; readonly draft: boolean; readonly onChange: (patch: Partial<AnalysisState>) => void }) {
  const { data } = useAuthorities({ edition: editionKey, targetYear: state.an, creditType: 'budget_credits' })
  // The reviewed laws' authority lists are in production, not in this sample: said, with the way to what is real (the ANAF payments).
  if (!draft || data.status !== 'ok') {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        <p>{data.status === 'ok' ? missingText('not_in_sample') : missingText(data.reason)}</p>
        <button type="button" onClick={() => onChange({ tip: 'ministere', dupa: 'platit' })} className="mt-2 font-medium text-foreground underline-offset-4 hover:underline">
          {t`Vezi ce au plătit ordonatorii în ${state.an} (ANAF)`}
        </button>
      </div>
    )
  }
  const total = data.totalThousandLei ? approvedAmountToLei(data.totalThousandLei) : null
  const rows = data.rows.filter((row) => row.amountThousandLei !== null)
  const widest = Math.max(0.0001, ...rows.map((row) => (total ? approvedAmountToLei(row.amountThousandLei!) / total : 0)))
  return (
    <AuthorityTable
      head={<DraftMark />}
      muted
      rows={rows.map((row) => {
        const lei = approvedAmountToLei(row.amountThousandLei!)
        return { key: row.key, name: row.name, title: row.name, lei, share: total ? lei / total : null, href: null }
      })}
      widest={widest}
      note={t`Creditele bugetare propuse fiecărui ordonator principal în proiectul pe 2026 (martie), nevalidat. O listă proprie: nu se leagă de plățile ANAF.`}
    />
  )
}

// ─────────────────────────────────────────────────────────── ministries ──

type AuthorityRowView = { readonly key: string; readonly name: string; readonly title: string; readonly lei: number; readonly share: number | null; readonly href: string | null }

const AUTHORITY_ROWS = 25

function AuthorityTable({ rows, widest, head, note, muted = false }: { readonly rows: readonly AuthorityRowView[]; readonly widest: number; readonly head?: ReactNode; readonly note: string; readonly muted?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? rows : rows.slice(0, AUTHORITY_ROWS)
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>
              <span className="sr-only">{t`Ordonatorul`}</span>
              {head}
            </TableHead>
            <TableHead className="text-right font-semibold text-foreground">{t`Lei`}</TableHead>
            <TableHead className="hidden w-36 text-right sm:table-cell">{t`Cota`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row, index) => (
            <TableRow key={row.key}>
              <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="max-w-[12rem] sm:max-w-md">
                <span className="flex items-center gap-1.5">
                  <span className="truncate" title={row.title}>
                    {row.name}
                  </span>
                  {row.href ? (
                    <a href={row.href} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={t`Pagina ${row.name}`}>
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{moneyText(row.lei)}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <ShareCell share={row.share} widest={widest} muted={muted} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>{note}</span>
        {rows.length > AUTHORITY_ROWS ? (
          <button type="button" onClick={() => setExpanded(!expanded)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {expanded ? t`Primii ${AUTHORITY_ROWS}` : t`Toți cei ${rows.length}`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function MinistriesTable({ state }: { readonly state: AnalysisState }) {
  const { data } = useAnafStateBudget()
  if (data.status !== 'ok') return <Unavailable>{missingText(data.reason)}</Unavailable>
  const ranking = anafRanking(data, state.an)
  if (!ranking || ranking.rows.length === 0) return <Unavailable>{t`Nicio plată raportată la ANAF pentru ${state.an}.`}</Unavailable>
  const widest = Math.max(0.0001, ...ranking.rows.map((row) => row.share))
  return (
    <AuthorityTable
      rows={ranking.rows.map((row) => ({ key: row.cui, name: authorityName(row.name), title: `${row.name} · CUI ${row.cui}`, lei: row.lei, share: row.share, href: entityHref(row.cui) }))}
      widest={widest}
      note={
        ranking.throughMonth.endsWith('-12')
          ? t`Plățile din bugetul de stat ale ordonatorilor principali, raportate la ANAF, ${state.an}. Cota, din toate plățile bugetului de stat.`
          : t`Plățile din bugetul de stat ale ordonatorilor principali, raportate la ANAF, ianuarie–${monthText(ranking.throughMonth)}. Cota, din toate plățile bugetului de stat.`
      }
    />
  )
}
