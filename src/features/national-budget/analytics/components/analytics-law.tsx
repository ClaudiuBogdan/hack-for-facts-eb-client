import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { approvedTotalsOptions, useApprovedRecords, useApprovedTotals } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { activeEdges } from '@/features/national-budget/analytics/lib/analytics-classes'
import { creditTypeOf } from '@/features/national-budget/analytics/lib/analytics-data'
import { billionsText, moneyText } from '@/features/national-budget/analytics/lib/analytics-format'
import type { AdvancedState } from '@/features/national-budget/analytics/lib/analytics-state'
import { FUND_OF, LAW_FUNDS, SPENDING_CODE_OF, SPENDING_TOTAL_OF, SYNTHESIS_OF, TITLE_GROUPS, approvedStatusText, changeText, chapterLabel, fundLabel, lawText, sentenceCase, titleLabel } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactText, plotOf, thousandToLei } from '@/features/national-budget/analytics/lib/exact'
import { cn } from '@/lib/utils'
import type { BudgetApprovedCodes, BudgetApprovedEdition, BudgetApprovedRecord, BudgetApprovedTotalCell, BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { STICKY_HEAD, STICKY_HEAD_WIDE, ChangeCell, DocumentLink, EvidenceIcon, EvidenceList, ShareCell, Unavailable } from './analytics-parts'

/**
 * The law's answers: what each fund's law approves and forecasts, how the
 * plan for a year moved from law to law, the chapters and titles the law
 * prints, and what each principal authority receives. Every value is a
 * printed line of the law as published (named totals by their descriptor,
 * records as printed); none is summed. A missing value says why.
 */

type Change = (patch: Partial<AdvancedState>) => void

/** The target years an edition prints: its own year, then its forecasts. */
function slotYears(edition: BudgetApprovedEdition): readonly number[] {
  return [...new Set(edition.slots.map((slot) => slot.measureYear))].sort((a, b) => a - b)
}

const blank = (value: string | null | undefined) => !value || value.trim() === ''
const economicCode = (codes: BudgetApprovedCodes) => (codes.grupa ?? '').trim() || (codes.titlu ?? '').trim()
/** A chapter's own total row: every code below the chapter blank. */
const chapterLevel = (codes: BudgetApprovedCodes) => blank(codes.subcapitol) && blank(codes.paragraf) && economicCode(codes) === '' && blank(codes.articol) && blank(codes.alineat)
/** A title (or a group of titles) under a chapter: no article. */
const titleLevel = (codes: BudgetApprovedCodes) => blank(codes.subcapitol) && blank(codes.paragraf) && economicCode(codes) !== '' && blank(codes.articol) && blank(codes.alineat)
/** The spending totals' own codes (5000 „total general", 5001 the state budget, 5005 „cheltuieli total"): never ranked as a chapter. */
const totalCode = (capitol: string) => /^500\d$/u.test(capitol)

/** A record's value for a target year, in lei, exactly. */
function valueFor(
  record: BudgetApprovedRecord | undefined,
  year: number,
): { readonly exact: string | null; readonly lei: number | null; readonly token: string | null; readonly field: string | null } {
  const slot = record?.values.find((value) => value.measureYear === year)
  const exact = slot?.value ? thousandToLei(slot.value) : null
  return { exact, lei: plotOf(exact), token: slot?.token ?? null, field: slot?.field ?? null }
}

const leiOfCell = (cell: BudgetApprovedTotalCell | undefined) => plotOf(cell?.value)

// ────────────────────────────────────────────────────────── evidence ──

/** A chapter's or a title's code as the evidence names it: „cap. 6501", „titlu 10". */
const chapterCode = (chapter: string) => t({ message: `cap. ${chapter}`, comment: 'A budget chapter code in a value’s evidence' })
const titleCode = (title: string) => t({ message: `titlu ${title}`, comment: 'A budget title (economic) code in a value’s evidence' })

function TotalEvidence({ cell }: { readonly cell: BudgetApprovedTotalCell }) {
  if (cell.status !== 'AVAILABLE' || !cell.line) return <p className="text-muted-foreground">{approvedStatusText(cell.status)}</p>
  const codes = cell.descriptor?.codes
  return (
    <EvidenceList
      items={[
        [t`Rândul tipărit`, cell.descriptor ? sentenceCase(cell.descriptor.label) : '—'],
        codes ? [t`Codul`, <span key="code" className="font-mono">{chapterCode(codes.capitol)}</span>] : null,
        [t`Valoarea exactă`, cell.value ? <span className="font-mono">{`${exactText(cell.value, 0)} lei`}</span> : '—'],
        [t`Tipărit`, <span key="token" className="font-mono">{t`${cell.line.token} mii lei`}</span>],
        [t`Anexa`, cell.line.annex],
        [t`Câmpul`, <span key="field" className="font-mono">{`${cell.line.field} · #${cell.line.recordIndex}`}</span>],
        [t`Legea`, cell.edition.id],
        [t`Documentul`, <DocumentLink key="doc" url={cell.line.document.url} sha256={cell.line.document.sha256} />],
      ]}
    />
  )
}

function RecordEvidence({ record, year }: { readonly record: BudgetApprovedRecord; readonly year: number }) {
  const value = valueFor(record, year)
  const codes = record.codes
  return (
    <EvidenceList
      items={[
        [t`Rândul tipărit`, sentenceCase(record.contextLabel ?? record.label)],
        [
          t`Codul`,
          <span key="code" className="font-mono">
            {[chapterCode(codes.capitol), economicCode(codes) ? titleCode(economicCode(codes)) : null].filter(Boolean).join(' · ')}
          </span>,
        ],
        [t`Valoarea exactă`, value.exact ? <span className="font-mono">{`${exactText(value.exact, 0)} lei`}</span> : t`fără număr tipărit`],
        value.token ? [t`Tipărit`, <span key="token" className="font-mono">{t`${value.token} mii lei`}</span>] : null,
        [t`Anexa`, `${record.annex} · ${record.authority.name}`],
        value.field ? [t`Câmpul`, <span key="field" className="font-mono">{`${value.field} · #${record.recordIndex}`}</span>] : null,
        [t`Documentul`, <DocumentLink key="doc" url={record.document.url} sha256={record.document.sha256} />],
      ]}
    />
  )
}

function YearHead({ year, approved }: { readonly year: number; readonly approved: number }) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className={cn('tabular-nums', year === approved && 'font-semibold text-foreground')}>{year}</span>
      <span className="text-[0.6875rem] font-normal text-muted-foreground">{year === approved ? t`aprobat` : t`estimare`}</span>
    </span>
  )
}

// ───────────────────────────────────────────────────────────── funds ──

export function FundsAnswer({ state, edition }: { readonly state: AdvancedState; readonly edition: BudgetApprovedEdition }) {
  const cells = useApprovedTotals({
    totals: ['REVENUE_TOTAL', 'EXPENDITURE_5001_STATE_BUDGET', 'EXPENDITURE_5000_TOTAL_GENERAL'],
    editionIds: [edition.id],
    creditTypes: [creditTypeOf(state)],
  })
  const years = slotYears(edition)
  const revenue = state.linie === 'venituri'
  const cellOf = (fund: (typeof LAW_FUNDS)[number], year: number) =>
    cells.find((cell) => cell.fund === FUND_OF[fund] && cell.measureYear === year && cell.total === (revenue ? 'REVENUE_TOTAL' : SPENDING_TOTAL_OF[fund]))
  return (
    <div>
      <div className="overflow-x-auto lg:overflow-visible">
        <Table className="min-w-[36rem]" containerClassName="lg:overflow-visible">
          <TableHeader className={STICKY_HEAD_WIDE}>
            <TableRow>
              <TableHead>{revenue ? t`Venituri prevăzute` : creditTypeOf(state) === 'BUDGET_CREDITS' ? t`Credite bugetare` : t`Credite de angajament`}</TableHead>
              {years.map((year) => (
                <TableHead key={year} className="text-right">
                  <YearHead year={year} approved={edition.budgetYear} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {LAW_FUNDS.map((fund) => (
              <TableRow key={fund} className="group">
                <TableCell>
                  <span className="flex items-center gap-1">
                    {fundLabel(fund)}
                    {cellOf(fund, edition.budgetYear) ? <EvidenceIcon label={fundLabel(fund)}>{() => <TotalEvidence cell={cellOf(fund, edition.budgetYear)!} />}</EvidenceIcon> : null}
                  </span>
                </TableCell>
                {years.map((year) => {
                  const cell = cellOf(fund, year)
                  return (
                    <TableCell
                      key={year}
                      className={cn('whitespace-nowrap text-right tabular-nums', year === edition.budgetYear ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                      title={cell?.value ? `${exactText(cell.value, 0)} lei` : cell ? approvedStatusText(cell.status) : undefined}
                    >
                      {cell?.value ? moneyText(cell.value) : <span className="text-xs font-normal">{cell ? approvedStatusText(cell.status) : '—'}</span>}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 max-w-[72ch] text-xs text-muted-foreground">
        {revenue
          ? t`Rândul „Venituri – total" al fiecărui buget. Patru bugete separate: nu se adună (transferurile dintre ele s-ar număra de două ori).`
          : t`Bugetul de stat: rândul 5001; celelalte: „Total general" (5000). Patru bugete separate, care nu se adună. Estimările sunt ale acestei legi.`}
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────── law after law ──

export function EditionsAnswer({ state, catalog, lawYear, onChange }: { readonly state: AdvancedState; readonly catalog: BudgetNationalCatalog; readonly lawYear: number; readonly onChange: Change }) {
  const total = state.linie === 'venituri' ? 'REVENUE_TOTAL' : SPENDING_TOTAL_OF[state.fond]
  const cells = useApprovedTotals({ totals: [total], funds: [FUND_OF[state.fond]], creditTypes: [creditTypeOf(state)] })
  const editions = [...catalog.approved.editions].sort((a, b) => a.budgetYear - b.budgetYear)
  const years = [...new Set(cells.map((cell) => cell.measureYear))].sort((a, b) => a - b)
  const at = (editionYear: number, year: number) => cells.find((cell) => cell.edition.budgetYear === editionYear && cell.measureYear === year)
  if (cells.length === 0) return <Unavailable>{t`Nicio lege nu tipărește acest total.`}</Unavailable>
  return (
    <div>
      <div className="overflow-x-auto lg:overflow-visible" tabIndex={0} role="region" aria-label={t`Legile și anii lor`}>
        <Table className="min-w-[44rem]" containerClassName="lg:overflow-visible">
          <TableHeader className={STICKY_HEAD_WIDE}>
            <TableRow>
              <TableHead className="whitespace-nowrap">{t`Legea · mld. lei`}</TableHead>
              {years.map((year) => (
                <TableHead key={year} className={cn('text-right tabular-nums', year === lawYear && 'font-semibold text-foreground', activeEdges(false, year === lawYear))}>
                  {year}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((edition) => (
              <TableRow key={edition.id} className={cn(edition.budgetYear === lawYear && 'bg-muted/40')}>
                <TableCell className={cn('whitespace-nowrap', activeEdges(edition.budgetYear === lawYear, false))}>
                  <button type="button" onClick={() => onChange({ an: edition.budgetYear })} className="hover:underline">
                    {lawText(edition.budgetYear)}
                  </button>
                </TableCell>
                {years.map((year) => {
                  const cell = at(edition.budgetYear, year)
                  const earlier = at(edition.budgetYear - 1, year)
                  const moved = changeText(cell?.value ?? null, earlier?.value ?? null)
                  return (
                    <TableCell
                      key={year}
                      className={cn(
                        'text-right tabular-nums',
                        cell?.measure === 'APPROVED' ? 'font-semibold text-foreground' : 'text-muted-foreground',
                        year === lawYear && 'bg-muted/40',
                        activeEdges(edition.budgetYear === lawYear, year === lawYear),
                      )}
                      title={
                        cell?.value
                          ? [
                              t({
                                message: `${lawText(edition.budgetYear)}, ${cell.measure === 'APPROVED' ? t`aprobat` : t`estimare`} pentru ${year}: ${exactText(cell.value, 0)} lei`,
                                comment: 'A cell of the law after law table: the law, approved or estimate, the year it is for, the amount',
                              }),
                              moved ? t`${moved} față de ${lawText(edition.budgetYear - 1)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          : undefined
                      }
                    >
                      {cell?.value ? billionsText(cell.value) : cell ? <span title={approvedStatusText(cell.status)}>·</span> : ''}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 max-w-[72ch] text-xs text-muted-foreground">
        {t`${fundLabel(state.fond)}, ${state.linie === 'venituri' ? t`venituri` : t`cheltuieli`}. Îngroșat: ce a aprobat fiecare lege pentru anul ei; la dreapta, estimările ei pentru anii următori. O coloană arată cum s-a schimbat planul pentru acel an, de la o lege la alta. Legile inițiale, fără rectificări.`}
        {editions
          .filter((edition) => cells.some((cell) => cell.edition.budgetYear === edition.budgetYear) && !cells.some((cell) => cell.edition.budgetYear === edition.budgetYear && cell.value !== null))
          .map((edition) => {
            const status = cells.find((cell) => cell.edition.budgetYear === edition.budgetYear)!.status
            return ` ${t`${lawText(edition.budgetYear)}: ${approvedStatusText(status)}.`}`
          })
          .join('')}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── chapters ──

type LawLine = {
  readonly key: string
  readonly label: string
  readonly record: BudgetApprovedRecord
  readonly group?: boolean
  readonly opens?: boolean
}

/** The law's lines as an analytics table: the approved year bold with its share, the law's forecasts beside. */
function LawLinesTable({
  lines,
  total,
  years,
  approvedYear,
  head,
  onOpen,
  note,
  ranked = true,
}: {
  readonly lines: readonly LawLine[]
  readonly total: BudgetApprovedRecord | undefined
  readonly years: readonly number[]
  readonly approvedYear: number
  readonly head: string
  readonly onOpen?: (line: LawLine) => void
  readonly note: ReactNode
  readonly ranked?: boolean
}) {
  const totalLei = valueFor(total, approvedYear).lei
  const totalExact = valueFor(total, approvedYear).exact
  const ahead = years.filter((year) => year > approvedYear)
  const share = (record: BudgetApprovedRecord) => {
    const lei = valueFor(record, approvedYear).lei
    return lei !== null && totalLei ? lei / totalLei : null
  }
  const widest = Math.max(0.0001, ...lines.filter((line) => !line.group).map((line) => Math.abs(share(line.record) ?? 0)))
  let rank = 0
  return (
    <div>
      <Table containerClassName="overflow-visible">
        <TableHeader className={STICKY_HEAD}>
          <TableRow>
            <TableHead className="w-8 text-right">{ranked ? '#' : <span className="sr-only">{t`Ordinea legii`}</span>}</TableHead>
            <TableHead>{head}</TableHead>
            <TableHead className="text-right">
              <YearHead year={approvedYear} approved={approvedYear} />
            </TableHead>
            <TableHead className="hidden w-32 text-right sm:table-cell">{t`Cota`}</TableHead>
            {ahead.map((year, index) => (
              <TableHead key={year} className={cn('text-right', index === 0 ? 'hidden md:table-cell' : 'hidden lg:table-cell')}>
                <YearHead year={year} approved={approvedYear} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const now = valueFor(line.record, approvedYear)
            if (!line.group) rank += 1
            return (
              <TableRow key={line.key} className={cn('group', line.opens && 'cursor-pointer', line.group && 'hover:bg-transparent')} onClick={line.opens && onOpen ? () => onOpen(line) : undefined}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{ranked && !line.group ? rank : ''}</TableCell>
                <TableCell className={cn('max-w-[11rem] sm:max-w-md', line.group && 'pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground')}>
                  <span className="flex items-center gap-1">
                    {line.opens && onOpen ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpen(line)
                        }}
                        className="truncate text-left hover:underline"
                        title={line.label}
                      >
                        {line.label}
                      </button>
                    ) : (
                      <span className="truncate" title={line.label}>
                        {line.label}
                      </span>
                    )}
                    {line.opens ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                    {line.group ? null : <EvidenceIcon label={line.label}>{() => <RecordEvidence record={line.record} year={approvedYear} />}</EvidenceIcon>}
                  </span>
                </TableCell>
                <TableCell
                  className={cn('whitespace-nowrap text-right tabular-nums', line.group ? 'pt-4 text-xs text-muted-foreground' : 'font-semibold text-foreground')}
                  title={now.exact ? `${exactText(now.exact, 0)} lei` : undefined}
                >
                  {now.exact ? moneyText(now.exact) : '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {line.group ? null : <ShareCell part={valueFor(line.record, approvedYear).exact} whole={valueFor(total, approvedYear).exact} widest={widest} />}
                </TableCell>
                {ahead.map((year, index) => {
                  const value = valueFor(line.record, year)
                  return (
                    <TableCell
                      key={year}
                      className={cn('whitespace-nowrap text-right tabular-nums text-muted-foreground', index === 0 ? 'hidden md:table-cell' : 'hidden lg:table-cell', line.group && 'pt-4 text-xs')}
                      title={value.exact ? `${exactText(value.exact, 0)} lei` : undefined}
                    >
                      {value.exact ? moneyText(value.exact) : '—'}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
          {total ? (
            <TableRow className="text-muted-foreground hover:bg-transparent">
              <TableCell />
              <TableCell>{t`Total`}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-foreground">{totalExact ? moneyText(totalExact) : '—'}</TableCell>
              <TableCell className="hidden sm:table-cell" />
              {ahead.map((year, index) => {
                const value = valueFor(total, year)
                return (
                  <TableCell key={year} className={cn('whitespace-nowrap text-right tabular-nums', index === 0 ? 'hidden md:table-cell' : 'hidden lg:table-cell')}>
                    {value.exact ? moneyText(value.exact) : '—'}
                  </TableCell>
                )
              })}
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </div>
  )
}

const byApproved = (year: number) => (a: LawLine, b: LawLine) => (valueFor(b.record, year).lei ?? -Infinity) - (valueFor(a.record, year).lei ?? -Infinity)

/** Titles under their groups (current, capital, financial operations), in the law's order, each group's titles by size. */
function titleLines(records: readonly BudgetApprovedRecord[], year: number): readonly LawLine[] {
  const out: LawLine[] = []
  let block: LawLine[] = []
  const flush = () => {
    out.push(...block.sort(byApproved(year)))
    block = []
  }
  for (const record of records) {
    const code = economicCode(record.codes)
    const line = { key: `${record.codes.capitol}-${code}`, label: titleLabel(code, record.contextLabel), record }
    if (TITLE_GROUPS.has(code)) {
      flush()
      out.push({ ...line, group: true })
    } else block.push(line)
  }
  flush()
  return out
}

export function ChaptersAnswer({ state, edition, onChange }: { readonly state: AdvancedState; readonly edition: BudgetApprovedEdition; readonly onChange: Change }) {
  const spending = state.linie === 'cheltuieli'
  // One chapter (a chapter opened, or the total's own titles) is read alone: a page, not the law's ~500 rows in five.
  const only = spending ? (state.rand ?? (state.clasificare === 'titluri' ? SPENDING_CODE_OF[state.fond] : null)) : null
  const { rows, truncated } = useApprovedRecords({
    editionId: edition.id,
    form: SYNTHESIS_OF[state.fond],
    rowRoles: [spending ? 'CREDIT' : 'DESCRIPTOR'],
    ...(spending ? { creditTypes: [creditTypeOf(state)] } : {}),
    ...(only ? { capitols: [only] } : {}),
  })
  const years = slotYears(edition)
  const year = edition.budgetYear
  const cut = truncated ? <span className="block text-amber-700 dark:text-amber-400">{t`Lista e tăiată la 4.000 de rânduri.`}</span> : null
  if (!spending) {
    const total = rows.find((record) => record.codes.capitol === '0001' && blank(record.codes.paragraf))
    const deficit = rows.find((record) => record.codes.capitol === '9901' && blank(record.codes.subcapitol))
    const lines = rows
      .filter((record) => blank(record.codes.subcapitol) && blank(record.codes.paragraf) && record.codes.capitol >= '0100' && record.codes.capitol < '5000')
      .map((record) => ({ key: record.codes.capitol, label: chapterLabel(record.codes.capitol, record.label), record }))
      .sort(byApproved(year))
    if (lines.length === 0) return <Unavailable>{t`Legea nu are rânduri de venituri pe capitole în această anexă.`}</Unavailable>
    const deficitLei = valueFor(deficit, year)
    return (
      <LawLinesTable
        lines={lines}
        total={total}
        years={years}
        approvedYear={year}
        head={t`Capitolul de venituri`}
        note={
          <>
            {deficitLei.exact
              ? t`Legea tipărește și rândul „Deficit" (9901): ${moneyText(deficitLei.exact)}, care închide veniturile la nivelul cheltuielilor; nu e un venit, deci nu e în listă. `
              : ''}
            {t`Rândurile cu „se scad" sunt sumele date bugetelor locale.`}
            {cut}
          </>
        }
      />
    )
  }
  const code = SPENDING_CODE_OF[state.fond]
  const total = rows.find((record) => record.codes.capitol === code && chapterLevel(record.codes))
  const drilled = state.rand && rows.some((record) => record.codes.capitol === state.rand && chapterLevel(record.codes)) ? state.rand : null
  if (drilled) {
    const chapter = rows.find((record) => record.codes.capitol === drilled && chapterLevel(record.codes))
    return (
      <div>
        <LawLinesTable
          lines={titleLines(
            rows.filter((record) => record.codes.capitol === drilled && titleLevel(record.codes)),
            year,
          )}
          total={chapter}
          years={years}
          approvedYear={year}
          head={t`${chapterLabel(drilled, chapter?.contextLabel ?? null)}: pe titluri`}
          note={t`Titlurile capitolului, sub grupele lor; cota, din totalul capitolului.`}
          ranked={false}
        />
      </div>
    )
  }
  if (state.clasificare === 'titluri') {
    return (
      <LawLinesTable
        lines={titleLines(
          rows.filter((record) => record.codes.capitol === code && titleLevel(record.codes)),
          year,
        )}
        total={total}
        years={years}
        approvedYear={year}
        head={t`Titlul de cheltuieli`}
        ranked={false}
        note={
          <>
            {t`Clasificația economică: ce fel de cheltuieli (salarii, bunuri, transferuri, investiții), sub grupele lor. Cota, din total.`}
            {cut}
          </>
        }
      />
    )
  }
  const lines = rows
    .filter((record) => chapterLevel(record.codes) && !totalCode(record.codes.capitol) && !record.codes.capitol.endsWith('00'))
    .map((record) => ({ key: record.codes.capitol, label: chapterLabel(record.codes.capitol, record.contextLabel), record, opens: true }))
    .sort(byApproved(year))
  if (lines.length === 0) return <Unavailable>{t`Legea nu are capitole de cheltuieli în această anexă.`}</Unavailable>
  return (
    <LawLinesTable
      lines={lines}
      total={total}
      years={years}
      approvedYear={year}
      head={t`Capitolul (domeniul)`}
      onOpen={(line) => onChange({ rand: line.key })}
      note={
        <>
          {t`Clasificația funcțională: pentru ce (învățământ, sănătate, apărare). Capitolele acoperă totalul; un capitol se deschide pe titluri.`}
          {cut}
        </>
      }
    />
  )
}

// ──────────────────────────────────────────────────────── authorities ──

export function AuthoritiesAnswer({
  state,
  catalog,
  edition,
  onChange,
}: {
  readonly state: AdvancedState
  readonly catalog: BudgetNationalCatalog
  readonly edition: BudgetApprovedEdition
  readonly onChange: Change
}) {
  const client = useQueryClient()
  const snapshot = catalog.snapshots.approved
  const credit = creditTypeOf(state)
  const year = edition.budgetYear
  const [{ data: approved }, { data: ahead }, { data: totals }] = useSuspenseQueries({
    queries: [
      approvedTotalsOptions(client, snapshot, { totals: ['AUTHORITY_EXPENDITURE_5001'], editionIds: [edition.id], creditTypes: [credit], measures: ['APPROVED'] }),
      approvedTotalsOptions(client, snapshot, { totals: ['AUTHORITY_EXPENDITURE_5001'], editionIds: [edition.id], creditTypes: [credit], measureYears: [year + 1] }),
      approvedTotalsOptions(client, snapshot, { totals: ['EXPENDITURE_5001_STATE_BUDGET'], editionIds: [edition.id], creditTypes: [credit], measureYears: [year, year + 1] }),
    ],
  })
  if (state.rand && approved.some((cell) => cell.authority?.code === state.rand)) {
    return <AuthorityDetail state={state} edition={edition} code={state.rand} name={approved.find((cell) => cell.authority?.code === state.rand)?.authority?.name ?? state.rand} onChange={onChange} />
  }
  // The figures' own read (this year and the next): one key, one request.
  const totalCell = totals.find((cell) => cell.measureYear === year)
  const total = leiOfCell(totalCell)
  const rows = approved
    .filter((cell) => cell.authority)
    .map((cell) => {
      const next = ahead.find((item) => item.authority?.code === cell.authority?.code)
      return { cell, lei: leiOfCell(cell), next: leiOfCell(next), nextExact: next?.value ?? null }
    })
    .sort((a, b) => (b.lei ?? -Infinity) - (a.lei ?? -Infinity))
  if (rows.length === 0) return <Unavailable>{t`Legea pe ${year} nu are anexa ordonatorilor în date.`}</Unavailable>
  const widest = Math.max(0.0001, ...rows.map((row) => (row.lei !== null && total ? row.lei / total : 0)))
  return (
    <div>
      <Table containerClassName="overflow-visible">
        <TableHeader className={STICKY_HEAD}>
          <TableRow>
            <TableHead className="w-8 text-right">#</TableHead>
            <TableHead>
              <span className="sr-only">{t`Ordonatorul principal`}</span>
            </TableHead>
            <TableHead className="text-right">
              <YearHead year={year} approved={year} />
            </TableHead>
            <TableHead className="hidden w-32 text-right sm:table-cell">{t`Cota`}</TableHead>
            <TableHead className="hidden text-right md:table-cell">
              <YearHead year={year + 1} approved={year} />
            </TableHead>
            <TableHead className="hidden whitespace-nowrap text-right lg:table-cell">{t`Estimare față de aprobat`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const name = row.cell.authority!.name
            return (
              <TableRow key={row.cell.authority!.code} className="group cursor-pointer" onClick={() => onChange({ rand: row.cell.authority!.code })}>
                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="max-w-[11rem] sm:max-w-md">
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onChange({ rand: row.cell.authority!.code })
                      }}
                      className="truncate text-left hover:underline"
                      title={t`${name} · codul ${row.cell.authority!.code} din lege (nu e CUI)`}
                    >
                      {name}
                    </button>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <EvidenceIcon label={name}>{() => <TotalEvidence cell={row.cell} />}</EvidenceIcon>
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums" title={row.cell.value ? `${exactText(row.cell.value, 0)} lei` : approvedStatusText(row.cell.status)}>
                  {row.cell.value ? moneyText(row.cell.value) : '—'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <ShareCell part={row.cell.value} whole={totalCell?.value ?? null} widest={widest} />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground md:table-cell">{row.nextExact ? moneyText(row.nextExact) : '—'}</TableCell>
                <TableCell className="hidden text-right lg:table-cell">
                  <ChangeCell text={changeText(row.nextExact, row.cell.value)} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="mt-2 max-w-[72ch] text-xs text-muted-foreground">
        {t`Rândul 5001 al fiecărui ordonator principal din anexa 3 a legii pe ${year}; cota, din totalul bugetului de stat (${totalCell?.value ? moneyText(totalCell.value) : '—'}). Un ordonator se deschide pe domenii și titluri. Codul din lege nu e CUI-ul instituției și se poate schimba de la o lege la alta: ordonatorii nu se urmăresc peste ani după cod.`}
      </p>
    </div>
  )
}

function AuthorityDetail({
  state,
  edition,
  code,
  name,
  onChange,
}: {
  readonly state: AdvancedState
  readonly edition: BudgetApprovedEdition
  readonly code: string
  readonly name: string
  readonly onChange: Change
}) {
  const { rows } = useApprovedRecords({ editionId: edition.id, form: 'STATE_BUDGET_AUTHORITY_DETAIL', authorityCode: code, rowRoles: ['CREDIT'], creditTypes: [creditTypeOf(state)] })
  const years = slotYears(edition)
  const year = edition.budgetYear
  const total = rows.find((record) => record.codes.capitol === '5001' && chapterLevel(record.codes))
  const chapters = rows
    .filter((record) => chapterLevel(record.codes) && !totalCode(record.codes.capitol) && !record.codes.capitol.endsWith('00'))
    .map((record) => ({ key: record.codes.capitol, label: chapterLabel(record.codes.capitol, record.contextLabel), record }))
    .sort(byApproved(year))
  const titles = titleLines(
    rows.filter((record) => record.codes.capitol === '5001' && titleLevel(record.codes)),
    year,
  )
  const back = (
    <button type="button" onClick={() => onChange({ rand: null })} className="font-medium text-foreground underline-offset-4 hover:underline">
      {t`Toți ordonatorii`}
    </button>
  )
  if (!total) return <Unavailable>{t`Anexa lui ${name} nu are rândul de total în date.`}</Unavailable>
  return (
    <div className="space-y-12">
      <LawLinesTable
        lines={chapters}
        total={total}
        years={years}
        approvedYear={year}
        head={t`Pe domenii (capitole)`}
        note={
          <span className="flex flex-wrap justify-between gap-2">
            <span>{t`Pentru ce cheltuie ${name}; cota, din totalul lui.`}</span>
            {back}
          </span>
        }
      />
      <LawLinesTable lines={titles} total={total} years={years} approvedYear={year} head={t`Pe tipuri (titluri)`} ranked={false} note={t`Ce fel de cheltuieli, sub grupele lor.`} />
    </div>
  )
}
