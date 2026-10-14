import { Fragment, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { TriangleAlert } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { PrivateCompanyStatementPublisher } from '@/schemas/private-company'
import { count, moneyCell } from '../../lib/company-profile-format'
import type { CompanyProfileModel, StatementValues } from '../../lib/company-profile-model'
import {
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
      {open ? <StatementDetail statement={open} locale={locale} className="mt-6" /> : null}
    </ProfileBand>
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
 * One statement, opened from its year: who published it, its state, every
 * value that stays out of the figures with its exact text and reason, a
 * reviewer's reason in words (as recorded beside it), and the statement as
 * published.
 */
function StatementDetail({ statement, locale, className }: { readonly statement: StatementValues; readonly locale: 'ro' | 'en'; readonly className?: string }) {
  const whole = statement.notAssessed !== null || statement.otherBasis
  const kept = statement.values
    .filter((value) => whole || value.status !== 'reported')
    .map((value) => ({ ...value, reason: whole ? statementStateLabel(statement) : metricStatusLabel(value.status) }))
  const net = statement.netResult && statement.netResult.status !== 'missing' && statement.netResult.status !== 'reported' ? statement.netResult : null
  // One reason for every value (a statement held whole): said once, above them, not on each line.
  const shared = kept.length > 1 && kept.every((value) => value.reason === kept[0]!.reason) ? kept[0]!.reason : null
  const { source, year } = statement
  return (
    <section id={DETAIL_ID} aria-label={t`Bilanțul pe ${year}`} className={cn('max-w-[72ch] border-l-2 border-primary/40 pl-4 text-sm leading-relaxed', className)}>
      <MonoLabel className="block text-primary">
        <Trans>Bilanțul pe {year}</Trans> · {statementPublisherLabel(statement.publisher)}
      </MonoLabel>
      <p className="mt-2 text-foreground">
        {statementStateLabel(statement)}
        {shared && shared !== statementStateLabel(statement) ? <span className="text-muted-foreground">: {shared}</span> : null}
      </p>
      {statement.holdReason ? (
        <p className="mt-1 text-muted-foreground">
          {holdReasonText(statement.holdReason)}{' '}
          <span className="font-mono text-xs text-muted-foreground/80">
            <Trans>Motivul înregistrat: {statement.holdReason}</Trans>
          </span>
        </p>
      ) : null}
      {kept.length > 0 || net ? (
        <dl
          className={cn(
            'mt-3 grid gap-x-4 gap-y-1.5',
            shared ? 'grid-cols-[minmax(0,14rem)_auto]' : 'grid-cols-[minmax(0,auto)_auto] sm:grid-cols-[minmax(0,14rem)_auto_minmax(0,1fr)]',
          )}
        >
          {kept.map((value) => (
            <Fragment key={value.metric}>
              <dt className="text-foreground">{metricLabel(value.metric)}</dt>
              <dd className="text-right font-semibold tabular-nums text-foreground">{exactText(value.original, value.metric, locale)}</dd>
              {shared ? null : <dd className="col-span-2 -mt-1 text-muted-foreground sm:col-span-1 sm:mt-0">{value.reason}</dd>}
            </Fragment>
          ))}
          {net ? (
            <>
              <dt className="text-foreground">
                <Trans>Rezultat net calculat</Trans>
              </dt>
              <dd className="text-right tabular-nums text-muted-foreground">—</dd>
              <dd className={cn('-mt-1 text-muted-foreground sm:mt-0', shared ? 'col-span-2' : 'col-span-2 sm:col-span-1')}>{netResultStatusLabel(net.status)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {statement.values.length === 0 ? (
        <p className="mt-1 text-muted-foreground">
          <Trans>Nicio valoare a bilanțului nu e disponibilă aici.</Trans>
        </p>
      ) : null}
      {source?.url ? (
        <p className="mt-3">
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {source.urlKind === 'mfp_resource' ? (
              <Trans>Fișierul publicat de Ministerul Finanțelor pe data.gov.ro, {year}</Trans>
            ) : (
              <Trans>Bilanțul publicat de ANAF, {year}</Trans>
            )}
          </a>
        </p>
      ) : null}
    </section>
  )
}
