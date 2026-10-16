import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight, TriangleAlert, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { PrivateCompanyStatementPublisher } from '@/schemas/private-company'
import { count, moneyCell } from '../../lib/company-profile-format'
import type { CompanyProfileModel, StatementValues } from '../../lib/company-profile-model'
import {
  capitalised,
  longFormNotice,
  metricLabel,
  metricStatusLabel,
  netResultStatusLabel,
  otherBasisNotice,
  qualificationLede,
  statementPublisherLabel,
  statementStateLabel,
} from '../../lib/company-profile-text'
import { holdReasonText, yearsMatrix, type MatrixCell, type MatrixColumn, type MatrixGroup, type MatrixRowKey } from '../../lib/company-years-matrix'
import { exactDecimalText } from '../../lib/financial-qualification'
import { hubNumberLocale } from '../../lib/hub-format'
import { HubInfoNote } from '../hub/hub-info-note'
import { ProfileBand } from './company-profile-band'

const TITLE_ID = 'company-years-title'
const DETAIL_ID = 'company-years-detail'
/** A value the figures leave out, in the opened statement: readable, marked as its cell is in the table. */
const HELD_VALUE = 'font-medium text-foreground underline decoration-amber-500 decoration-dotted decoration-2 underline-offset-4'

/**
 * „Bilanțurile, an cu an": every value every statement published, as one
 * matrix — an indicator a row, a statement a column, newest first — the way
 * the NGO page lays out its statements. The indicator names stay pinned while
 * the years scroll, the years while the rows do. A cell is the value on its
 * scale, exact on a pointer and to assistive technology; a value the figures
 * leave out is faded and underlined, its reason beside it; an empty cell is a
 * line the statement does not have, a shaded column years with no statement.
 * A year's header opens that statement under the table: what stays out of the
 * figures and why, and where it was published. The admission policy and how
 * to read the cells sit behind the corner's info button.
 */
export function CompanyYearsBand({ model, index, last = false }: { readonly model: CompanyProfileModel; readonly index: string; readonly last?: boolean }) {
  const [chosen, setChosen] = useState<number | null>(null)
  const { statements } = model.qualification
  if (statements.length === 0) return null
  const locale = hubNumberLocale() === 'ro-RO' ? 'ro' : 'en'
  const matrix = yearsMatrix(statements)
  const open = statements.find((statement) => statement.year === chosen) ?? null
  const groups = (['results', 'balance', 'staff'] as const)
    .map((group) => ({ group, rows: matrix.rows.filter((row) => row.spec.group === group) }))
    .filter((entry) => entry.rows.length > 0)
  const lede = qualificationLede(model)
  const otherBasis = otherBasisNotice(model)
  /** Closed from its own button: focus goes back to the year that opened it, scrolled into view if it is not. */
  const close = () => {
    const year = chosen
    setChosen(null)
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`button[data-statement-year="${String(year)}"]`)?.focus())
  }

  return (
    <ProfileBand id="an-cu-an" titleId={TITLE_ID} last={last}>
      <HubSectionHead titleId={TITLE_ID} index={index} title={<Trans>Bilanțurile, an cu an</Trans>} />
      <div
        role="region"
        aria-label={t`Tabelul bilanțurilor`}
        // Scrolled by a keyboard too: the region takes focus.
        tabIndex={0}
        className="mt-8 max-h-[calc(100svh-6rem)] overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-reveal
      >
        {/* As wide as its columns: four years sit beside their names, thirteen scroll. */}
        <table className="w-max border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{t`Valorile publicate în bilanțuri, pe ani`}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-3 border-b border-border/70 bg-background pb-2 pr-3 text-left align-bottom font-normal">
                <span className="inline-flex items-center gap-1">
                  <MonoLabel className="text-muted-foreground">
                    <Trans>Sume în lei</Trans>
                  </MonoLabel>
                  <HubInfoNote label={t`Despre aceste valori`}>
                    {lede ? <p>{lede}</p> : null}
                    {otherBasis ? <p>{otherBasis}</p> : null}
                    <p>
                      <Trans>
                        O valoare estompată și subliniată e publicată de sursă, dar nu intră în cifrele paginii; motivul apare în dreptul ei și sub
                        tabel, la anul ei. O celulă goală: nicio valoare disponibilă aici pentru rând în acel an. O coloană umbrită: ani fără
                        valori disponibile aici — nu neapărat ani fără bilanț.
                      </Trans>
                    </p>
                  </HubInfoNote>
                </span>
              </th>
              {matrix.columns.map((column) => (
                <YearHeader key={columnKey(column)} column={column} chosen={chosen} onChoose={(year) => setChosen((current) => (current === year ? null : year))} />
              ))}
            </tr>
          </thead>
          {groups.map(({ group, rows }) => (
            <tbody key={group}>
              <tr>
                <th scope="rowgroup" className="sticky left-0 z-1 bg-background pb-1.5 pr-3 pt-5 text-left font-normal">
                  <MonoLabel className="text-primary">{groupLabel(group)}</MonoLabel>
                </th>
                <td colSpan={matrix.columns.length} />
              </tr>
              {rows.map((row) => (
                <tr key={row.spec.key}>
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-1 w-36 min-w-36 border-b border-border/60 bg-background py-1.5 pr-3 text-left font-normal leading-snug sm:w-56 sm:min-w-56',
                      row.spec.strong ? 'text-foreground' : 'text-muted-foreground',
                      row.spec.indent && 'pl-4',
                    )}
                  >
                    {rowLabel(row.spec.key)}
                  </th>
                  {row.cells.map((cell, position) => {
                    const column = matrix.columns[position]!
                    return (
                      <ValueCell
                        key={columnKey(column)}
                        cell={cell}
                        column={column}
                        rowKey={row.spec.key}
                        strong={row.spec.strong === true}
                        chosen={column.kind === 'statement' && column.statement.year === chosen}
                        locale={locale}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {open ? <StatementDetail statement={open} locale={locale} onClose={close} className="mt-6" /> : null}
      <LongFormStatements model={model} className="mt-8" />
    </ProfileBand>
  )
}

/**
 * Statements under the CUI that the source holds only in long format: each
 * year with its publisher, the class it filed under as recorded and its file,
 * never a value. The file is the one the statement was read from; a statement
 * assembled from several copies has others. Nothing when none is known, nor
 * when this API cannot say (unknown is not „none").
 */
export function LongFormStatements({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const notice = longFormNotice(model)
  if (notice === null || model.longForm === null) return null
  return (
    <section aria-label={t`Bilanțuri doar în format lung`} className={cn('max-w-3xl text-sm', className)}>
      <MonoLabel className="block text-muted-foreground">
        <Trans>Doar în format lung, fără valori aici</Trans>
      </MonoLabel>
      <p className="mt-2 leading-relaxed text-muted-foreground">{notice}</p>
      <ul className="mt-3 divide-y divide-border/60 border-y border-border/60">
        {model.longForm.map((statement) => {
          const year = statement.fiscalYear
          const filerClass = statement.filerClass
          return (
            <li key={`${year}-${statement.sourceSnapshotId}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5">
              <span className="font-mono text-xs tabular-nums text-foreground">
                {year} · {publisherShort(statement.publisher)}
                {filerClass ? <> · {t`clasa ${filerClass}`}</> : null}
              </span>
              {statement.resourceUrl ? (
                <a
                  href={statement.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t`Fișierul bilanțului pe ${year}, pe data.gov.ro`}
                  className="inline-flex min-h-11 items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0"
                >
                  <Trans>Fișierul pe data.gov.ro</Trans>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        <Trans>Fișierul e cel din care a fost citit bilanțul; un bilanț poate apărea și în alte fișiere.</Trans>
      </p>
    </section>
  )
}

function columnKey(column: MatrixColumn): string {
  return column.kind === 'gap' ? `gap-${column.from}` : String(column.statement.year)
}

function groupLabel(group: MatrixGroup): string {
  if (group === 'results') return t`Rezultate`
  if (group === 'balance') return t({ message: 'Bilanț', context: 'the balance sheet lines of a statement' })
  return t`Personal`
}

function rowLabel(key: MatrixRowKey): string {
  return key === 'net_result' ? t`Rezultat net calculat` : metricLabel(key)
}

function publisherShort(publisher: PrivateCompanyStatementPublisher | null): string {
  if (publisher === 'anaf') return t`ANAF`
  if (publisher === 'mfp') return t`MF`
  return '—'
}

function YearHeader({ column, chosen, onChoose }: { readonly column: MatrixColumn; readonly chosen: number | null; readonly onChoose: (year: number) => void }) {
  if (column.kind === 'gap') {
    const range = `${column.from}–${column.to}`
    return (
      <th scope="col" className="sticky top-0 z-2 border-b border-border/70 bg-muted px-2 pb-2 text-center align-bottom font-normal">
        <MonoLabel className="flex flex-col items-center gap-0.5 text-muted-foreground" aria-hidden="true">
          <span>{column.from}–</span>
          <span>{column.to}</span>
        </MonoLabel>
        <span className="sr-only">{t`${range}: nicio valoare disponibilă aici`}</span>
      </th>
    )
  }
  const { statement, flagged } = column
  const year = statement.year
  const isChosen = chosen === year
  return (
    <th scope="col" className={cn('sticky top-0 z-2 border-b border-border/70 px-2 pb-2 text-right align-bottom font-normal', isChosen ? 'bg-muted' : 'bg-background')}>
      <button
        type="button"
        onClick={() => onChoose(year)}
        data-statement-year={year}
        aria-expanded={isChosen}
        aria-controls={isChosen ? DETAIL_ID : undefined}
        aria-label={flagged ? t`Bilanțul pe ${year}, de verificat` : t`Bilanțul pe ${year}`}
        className={cn(
          'inline-flex min-h-9 flex-col items-end justify-end gap-0.5 font-mono text-xs tabular-nums underline-offset-4 hover:underline',
          isChosen ? 'font-bold text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="inline-flex items-center gap-1">
          {flagged ? <TriangleAlert className="size-3 text-amber-700 dark:text-amber-300" aria-hidden="true" /> : null}
          {year}
        </span>
        <span className="text-[10px] font-normal tracking-wider text-muted-foreground">{publisherShort(statement.publisher)}</span>
      </button>
    </th>
  )
}

/** Why a value is not in the figures, in a phrase; null when it is. */
function reasonOf(cell: MatrixCell, statement: StatementValues): string | null {
  if (cell.kind === 'absent') return null
  if (cell.kind === 'held') return netResultStatusLabel(cell.status)
  if (cell.counted) return null
  // A whole statement out of the figures: its state says why, for every value in it.
  if (statement.notAssessed !== null || statement.otherBasis) return statementStateLabel(statement)
  return metricStatusLabel(cell.status)
}

function exactText(original: string, rowKey: MatrixRowKey, locale: 'ro' | 'en'): string {
  const exact = exactDecimalText(original, locale)
  return rowKey === 'employees' ? exact : t`${exact} lei`
}

function ValueCell({
  cell,
  column,
  rowKey,
  strong,
  chosen,
  locale,
}: {
  readonly cell: MatrixCell
  readonly column: MatrixColumn
  readonly rowKey: MatrixRowKey
  readonly strong: boolean
  readonly chosen: boolean
  readonly locale: 'ro' | 'en'
}) {
  const base = cn('whitespace-nowrap border-b border-border/60 px-2 py-1.5 text-right tabular-nums', chosen && 'bg-muted/50')
  if (column.kind === 'gap') return <td className={cn(base, 'bg-muted/40')} />
  if (cell.kind === 'absent') {
    return (
      <td className={base}>
        <span className="sr-only">{t`nicio valoare disponibilă aici în acest an`}</span>
      </td>
    )
  }
  const reason = reasonOf(cell, column.statement)
  const left = 'text-muted-foreground/80 underline decoration-amber-500 decoration-dotted decoration-2 underline-offset-4'
  if (cell.kind === 'held') {
    return (
      <td className={base} title={reason ?? undefined}>
        <span aria-hidden="true" className={left}>
          —
        </span>
        <span className="sr-only">{reason}</span>
      </td>
    )
  }
  const exact = exactText(cell.original, rowKey, locale)
  const scaled = cell.number === null ? exact : rowKey === 'employees' ? count(cell.number) : moneyCell(cell.number)
  return (
    <td
      className={cn(
        base,
        reason ? null : strong ? 'font-semibold text-foreground' : 'text-foreground/80',
        // A loss, negative equity: red as on the rest of the page.
        reason === null && cell.number !== null && cell.number < 0 && 'text-destructive',
      )}
      title={reason ? `${exact} · ${reason}` : exact}
    >
      <span aria-hidden="true" className={reason ? left : undefined}>
        {scaled}
      </span>
      <span className="sr-only">{reason ? `${exact}, ${reason}` : exact}</span>
    </td>
  )
}

/**
 * One statement, opened from its year. Its year and publisher head it, with
 * the statement as published and a close button on the same line (the link
 * comes after the rows in reading order, and shows there on a phone); its
 * state in a line, the derived net included; a reviewer's reason in words, the recorded one beside it. Then
 * every value that stays out of the figures and the held derived net, ruled
 * like the table's rows: the exact text, marked as in the table, and why. A
 * statement held whole says why once, in its state, not on every line.
 */
/**
 * A statement MFP published split across files (CQA-14): every file line that
 * supplied cells, anchor first, with the indicators it gave, so each value can
 * be checked in its own file. The names are the statement's own.
 */
function ContributingFiles({ lines }: { readonly lines: NonNullable<NonNullable<StatementValues['source']>['contributingSources']> }) {
  return (
    <div className="col-span-2 mt-2 text-xs text-muted-foreground sm:col-span-3">
      <p>
        <Trans>Valorile acestui an provin din {lines.length} fișiere MF publicate separat; fiecare indicator se verifică în fișierul lui:</Trans>
      </p>
      <ul className="mt-1 space-y-1">
        {lines.map((line, index) => {
          const ordinal = index + 1
          const row = line.rowNumber ? t`rândul ${line.rowNumber}` : t`rând neînregistrat`
          return (
            <li key={`${String(ordinal)}:${line.rowNumber ?? ''}`}>
              {line.url ? (
                <a href={line.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-foreground hover:underline">
                  {t`Fișierul ${ordinal} pe data.gov.ro`}
                </a>
              ) : (
                t`Fișierul ${ordinal}`
              )}{' '}
              ({row}): {line.indicators.map((indicator) => indicator.name ?? indicator.code).join('; ')}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StatementDetail({
  statement,
  locale,
  onClose,
  className,
}: {
  readonly statement: StatementValues
  readonly locale: 'ro' | 'en'
  readonly onClose: () => void
  readonly className?: string
}) {
  const whole = statement.notAssessed !== null || statement.otherBasis
  const kept = statement.values.filter((value) => whole || value.status !== 'reported')
  const net = statement.netResult && statement.netResult.status !== 'missing' && statement.netResult.status !== 'reported' ? statement.netResult : null
  const { source, year } = statement
  return (
    <section
      id={DETAIL_ID}
      aria-label={t`Bilanțul pe ${year}`}
      className={cn('grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-l-2 border-border pl-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto]', className)}
    >
      <div className="min-w-0">
        <MonoLabel className="block text-primary">
          <Trans>Bilanțul pe {year}</Trans> · {statementPublisherLabel(statement.publisher)}
        </MonoLabel>
        <p className="mt-1.5 font-medium text-foreground">{capitalised(statementStateLabel(statement))}</p>
        {statement.holdReason ? (
          <p className="mt-1 text-muted-foreground">
            {holdReasonText(statement.holdReason)}{' '}
            <span className="font-mono text-xs text-muted-foreground/80">
              <Trans>Motivul înregistrat: {statement.holdReason}</Trans>
            </span>
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t`Închide bilanțul pe ${year}`}
        className="-mr-2 inline-flex size-11 items-center justify-center text-muted-foreground hover:text-foreground sm:col-start-3 sm:-mr-1 sm:size-9"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      {kept.length > 0 || net ? (
        // Three tracks whatever the state: held whole, the reasons' track stays empty and the values stay by their names.
        <dl className="col-span-2 mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 border-t border-border/60 sm:col-span-3 sm:grid-cols-[minmax(0,14rem)_auto_minmax(0,1fr)]">
          {kept.map((value) => (
            <div key={value.metric} className="col-span-full grid grid-cols-subgrid items-baseline gap-y-0.5 border-b border-border/60 py-1.5">
              <dt className="text-foreground">{metricLabel(value.metric)}</dt>
              <dd className="text-right tabular-nums">
                <span className={HELD_VALUE}>{exactText(value.original, value.metric, locale)}</span>
              </dd>
              {whole ? null : <dd className="col-span-full text-muted-foreground sm:col-span-1">{metricStatusLabel(value.status)}</dd>}
            </div>
          ))}
          {net ? (
            <div className="col-span-full grid grid-cols-subgrid items-baseline gap-y-0.5 border-b border-border/60 py-1.5">
              <dt className="text-foreground">
                <Trans>Rezultat net calculat</Trans>
              </dt>
              <dd className="text-right tabular-nums text-muted-foreground">—</dd>
              <dd className="col-span-full text-muted-foreground sm:col-span-1">{netResultStatusLabel(net.status)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {statement.values.length === 0 ? (
        <p className="col-span-2 mt-1 text-muted-foreground sm:col-span-3">
          <Trans>Nicio valoare a bilanțului nu e disponibilă aici.</Trans>
        </p>
      ) : null}
      {source?.url ? (
        // After the rows in reading order (a phone shows it there); beside the year from `sm`.
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 mt-3 inline-flex min-h-11 items-center gap-1 justify-self-start text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0 sm:min-h-9"
        >
          {source.urlKind === 'mfp_resource' ? <Trans>Fișierul pe data.gov.ro</Trans> : <Trans>Interoghează ANAF pentru {year}</Trans>}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      ) : null}
      {source?.contributingSources && source.contributingSources.length > 1 ? <ContributingFiles lines={source.contributingSources} /> : null}
      {source?.url && source.urlKind === 'anaf_statement' ? (
        // ANAF's link asks it again for this CUI and year: today's answer, not the copy read here.
        <p className="col-span-2 mt-2 text-xs text-muted-foreground sm:col-span-3">
          <Trans>Legătura îi cere acum ANAF-ului bilanțul pe {year} al acestui CUI; ANAF răspunde cu datele de azi, care pot diferi de cele preluate aici.</Trans>
        </p>
      ) : null}
    </section>
  )
}
