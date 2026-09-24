import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyPaymentGrain } from '@/schemas/private-company'
import {
  grainAuthorities,
  grainCategories,
  grainStats,
  type CompanyProcurementRead,
  type ProcurementAuthorityRow,
  type ProcurementRecordRow,
} from '../../lib/company-procurement-read'
import { count, dateText, moneyCell, moneyText, moneyTick, monthText, percent } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import {
  capitalised,
  flowCount,
  flowLabel,
  grainCount,
  grainLabel,
  institutionName,
  moneyLede,
  unvaluedNote,
} from '../../lib/company-profile-text'
import { BAND_GRID_CLASS, ProfileBand, ROW_LINK_CLASS } from './company-profile-band'
import { YearBars, type BarSeries } from './company-year-charts'

const TITLE_ID = 'company-money-title'

/**
 * The SEAP read as the band sees it. It loads after the page, so the names
 * behind the money (who pays, for what, the newest records) have a pending
 * and a failed state of their own; the sums above them come with the profile.
 */
export type ProcurementState =
  | { readonly status: 'pending' }
  | { readonly status: 'failed'; readonly retry: () => void }
  | {
      readonly status: 'ready'
      readonly read: CompanyProcurementRead
      readonly grains: readonly CompanyPaymentGrain[]
      /** The grain shown: the URL's when the company has records in it, else the first it has. */
      readonly grain: CompanyPaymentGrain | null
    }

/** The flows SEAP names institutions for: only these have payers and categories to show. */
const SEAP_FLOWS = new Set(['procurement_contract', 'direct_acquisition'])

/**
 * „Ce a primit de la stat": the public money the company received, by the
 * instrument that carried it, per year, and — from SEAP — who paid, for what,
 * and the newest records. Commitments are said apart, never summed with
 * payments; records without an amount are counted, never summed as zero.
 */
export function CompanyMoneyBand({
  model,
  index,
  procurement,
  onGrain,
}: {
  readonly model: CompanyProfileModel
  readonly index: string
  readonly procurement: ProcurementState
  readonly onGrain: (grain: CompanyPaymentGrain) => void
}) {
  const title = <Trans>Ce a primit de la stat</Trans>
  const { money } = model
  const seapGrains = procurement.status === 'ready' ? procurement.grains.length : 0
  if (money.receivedCount === 0 && money.commitments.count === 0 && seapGrains === 0) {
    return (
      <ProfileBand id="bani-publici" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} index={index} title={title} />
        <NoPublicMoney className="mt-5" />
      </ProfileBand>
    )
  }
  // The profile says whether SEAP has records; the slice says whose they are. Wait for it only when there are some.
  const expectsSeap = money.flows.some((flow) => SEAP_FLOWS.has(flow.flowType) && flow.count > 0) || seapGrains > 0
  // A chart of years where nothing carries an amount would be an axis around zero.
  const charted = money.byYear.some((year) => year.contracts !== 0 || year.direct !== 0 || year.other !== 0)
  return (
    <ProfileBand id="bani-publici" titleId={TITLE_ID}>
      <div className={BAND_GRID_CLASS}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead titleId={TITLE_ID} index={index} title={title} lede={moneyLede(model)} />
          <MoneyFlows model={model} className="mt-8" />
        </div>
        {charted ? (
          <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <MonoLabel className="block text-muted-foreground">
              <Trans>Pe an, după anul contractului sau al achiziției</Trans>
            </MonoLabel>
            <MoneyChart model={model} className="mt-4" />
          </div>
        ) : null}
      </div>
      {expectsSeap ? <SeapDetail model={model} procurement={procurement} onGrain={onGrain} /> : null}
    </ProfileBand>
  )
}

/** No public money: the absence is a finding, said in a line with the sources it covers. */
function NoPublicMoney({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Niciun contract și nicio plată din bani publici: firma nu apare ca furnizor în achizițiile publice (SEAP) și nici ca beneficiar PNRR.</Trans>
    </p>
  )
}

type MoneyBucket = 'contracts' | 'direct' | 'other' | 'commitment'

function flowBucket(flowType: string): MoneyBucket {
  if (flowType === 'procurement_contract') return 'contracts'
  if (flowType === 'direct_acquisition') return 'direct'
  if (flowType === 'pnrr_commitment') return 'commitment'
  return 'other'
}

const BUCKET_SWATCH: Record<MoneyBucket, string> = {
  contracts: 'bg-primary',
  direct: 'bg-sky-400 dark:bg-sky-300',
  other: 'bg-violet-400 dark:bg-violet-300',
  commitment: 'border border-dashed border-primary bg-primary/10',
}

/** Every instrument side by side, never added up across kinds; a commitment says it is not a payment. */
function MoneyFlows({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const rows = model.money.flows.filter((flow) => flow.count > 0)
  if (rows.length === 0) return null
  return (
    <dl className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((flow) => (
        <div key={flow.flowType} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-3">
          <dt className="flex min-w-0 items-center gap-2 text-sm text-foreground">
            <span className={cn('size-2.5 shrink-0 rounded-[2px]', BUCKET_SWATCH[flowBucket(flow.flowType)])} aria-hidden="true" />
            <span className="min-w-0">
              {flowLabel(flow.flowType)}
              <MonoLabel className="mt-1 block text-muted-foreground">
                {flowCount(flow.flowType, flow.count)}
                {flow.receipt ? null : <>, {t`nu plăți`}</>}
              </MonoLabel>
            </span>
          </dt>
          <dd className={cn('text-right tabular-nums', flow.total === null ? 'text-sm text-muted-foreground' : 'text-base font-semibold text-foreground')}>
            {flow.total === null ? t`valoare nepublicată` : moneyText(flow.total)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function MoneyChart({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { byYear, commitments, undated, openYear } = model.money
  // A year with no payment of a kind has no bar of that kind, not a zero one.
  const series: BarSeries[] = [
    {
      key: 'contracts',
      label: flowLabel('procurement_contract'),
      values: byYear.map((year) => year.contracts || null),
      fill: 'fill-primary',
      swatch: BUCKET_SWATCH.contracts,
    },
    {
      key: 'direct',
      label: flowLabel('direct_acquisition'),
      values: byYear.map((year) => year.direct || null),
      fill: 'fill-sky-400 dark:fill-sky-300',
      swatch: BUCKET_SWATCH.direct,
    },
    {
      key: 'other',
      label: t`Alte plăți publice (PNRR, buget)`,
      values: byYear.map((year) => year.other || null),
      fill: 'fill-violet-400 dark:fill-violet-300',
      swatch: BUCKET_SWATCH.other,
    },
  ]
  return (
    <div className={className}>
      <YearBars
        years={byYear.map((year) => year.year)}
        series={series}
        format={moneyTick}
        label={t`Contracte și plăți publice pe an`}
        emptyLabel={(index) => {
          const year = byYear[index]
          return year && year.unvalued > 0 ? capitalised(unvaluedNote(year.unvalued)) : t`Nicio înregistrare în acest an`
        }}
        note={(index) => {
          const year = byYear[index]
          if (!year) return null
          const parts = [
            year.year === openYear ? t`anul în curs` : null,
            year.unvalued > 0 && year.count > year.unvalued ? t`și ${unvaluedNote(year.unvalued)}` : null,
          ].filter((part): part is string => part !== null)
          return parts.length > 0 ? { text: parts.join('; '), quiet: year.year === openYear } : null
        }}
        shadeEmpty={false}
      />
      <div className="mt-4 space-y-1.5">
        {openYear !== null ? (
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            <Trans>{openYear} e anul în curs: bara lui nu e un an întreg.</Trans>
          </MonoLabel>
        ) : null}
        {undated.count > 0 ? (
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            {undated.count > undated.unvalued
              ? plural(undated.count, {
                  one: `Nu apare pe grafic o înregistrare fără an în sursă (${moneyText(undated.total)}).`,
                  few: `Nu apar pe grafic # înregistrări fără an în sursă (${moneyText(undated.total)}).`,
                  other: `Nu apar pe grafic # de înregistrări fără an în sursă (${moneyText(undated.total)}).`,
                })
              : plural(undated.count, {
                  one: 'Nu apare pe grafic o înregistrare fără an și fără valoare publicată.',
                  few: 'Nu apar pe grafic # înregistrări fără an și fără valoare publicată.',
                  other: 'Nu apar pe grafic # de înregistrări fără an și fără valoare publicată.',
                })}
          </MonoLabel>
        ) : null}
        {/* Commitments stay out of the bars: an obligation drawn on the payments' scale would flatten them. */}
        {commitments.total > 0 ? (
          <MonoLabel className="block leading-relaxed text-muted-foreground">
            {plural(commitments.count, {
              one: `Fără angajamentul PNRR de ${moneyText(commitments.total)}: o obligație asumată, nu o plată.`,
              few: `Fără cele # angajamente PNRR, de ${moneyText(commitments.total)}: obligații asumate, nu plăți.`,
              other: `Fără cele # de angajamente PNRR, de ${moneyText(commitments.total)}: obligații asumate, nu plăți.`,
            })}
          </MonoLabel>
        ) : null}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────── from SEAP ──

function SeapDetail({
  model,
  procurement,
  onGrain,
}: {
  readonly model: CompanyProfileModel
  readonly procurement: ProcurementState
  readonly onGrain: (grain: CompanyPaymentGrain) => void
}) {
  if (procurement.status === 'pending') {
    return (
      <div className="mt-14" role="status" aria-label={t`Se încarcă înregistrările din SEAP`}>
        <HubPending rows={6} />
      </div>
    )
  }
  if (procurement.status === 'failed') {
    return (
      <div className="mt-14">
        <HubLoadError onRetry={procurement.retry} />
      </div>
    )
  }
  const { read, grains, grain } = procurement
  if (!grain) {
    // The profile counts SEAP records the supplier read did not return: say so rather than drop the section.
    return (
      <p className="mt-14 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
        <Trans>Căutarea în SEAP după CUI-ul firmei nu a întors înregistrări, așa că plătitorii nu pot fi numiți aici.</Trans>
      </p>
    )
  }
  return (
    <div className={cn('mt-14', BAND_GRID_CLASS)} data-reveal>
      <div className="min-w-0 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <MonoLabel className="text-primary">
            <Trans>Cine plătește</Trans>
          </MonoLabel>
          <div className="w-full sm:w-fit">
            {grains.length > 1 ? (
              <IndicatorToggle
                label={t`Înregistrările SEAP`}
                options={grains.map((key) => ({ key, label: grainLabel(key) }))}
                value={grain}
                onChange={onGrain}
              />
            ) : (
              <MonoLabel className="text-muted-foreground">{grainLabel(grain)}</MonoLabel>
            )}
          </div>
        </div>
        <PayerList read={read} grain={grain} className="mt-4" />
        <CoverageNote read={read} grain={grain} className="mt-3" />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <MonoLabel className="block text-primary">
          <Trans>Pentru ce</Trans>
        </MonoLabel>
        <CategoryList read={read} grain={grain} className="mt-5" />
        <MonoLabel className="mt-10 block text-primary">
          <Trans>Cele mai recente</Trans>
        </MonoLabel>
        <RecentRecords records={read.recent} className="mt-4" />
        {model.profile.cui ? (
          <Link
            to="/procurement/suppliers/$cui"
            params={{ cui: model.profile.cui }}
            className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            <Trans>Toate contractele și achizițiile →</Trans>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/**
 * A line under a ranking: the months of the company's own records — not the
 * source's coverage — how much of it carries a published value when both
 * counts are known, and what the ranking is by when it cannot be money.
 */
function CoverageNote({ read, grain, className }: { readonly read: CompanyProcurementRead; readonly grain: CompanyPaymentGrain; readonly className?: string }) {
  const stats = grainStats(read, grain)
  const window = stats.firstMonth && stats.lastMonth ? `${monthText(stats.firstMonth)} – ${monthText(stats.lastMonth)}` : null
  const lowerBound =
    stats.count !== null && stats.withValue !== null && stats.withValue < stats.count
      ? t`Valoarea e publicată pentru ${count(stats.withValue)} din ${grainCount(grain, stats.count)}, deci sumele sunt o limită de jos.`
      : null
  const ranking = stats.authoritiesRankedBy === 'count' ? t`Ordonate după numărul de înregistrări: prea puține au valoare publicată.` : null
  const parts = [window ? t`Înregistrările firmei în SEAP, ${window}.` : null, lowerBound, ranking].filter((part): part is string => part !== null)
  if (parts.length === 0) return null
  return <MonoLabel className={cn('block leading-relaxed text-muted-foreground', className)}>{parts.join(' ')}</MonoLabel>
}

/**
 * The institutions that paid most, as SEAP ranked them: by money when enough
 * of it is published, else by the number of records — the bars follow the
 * same measure, so a row with no published amount is never drawn as nothing.
 */
function PayerList({
  read,
  grain,
  limit = 8,
  className,
}: {
  readonly read: CompanyProcurementRead
  readonly grain: CompanyPaymentGrain
  readonly limit?: number
  readonly className?: string
}) {
  const rows = grainAuthorities(read, grain).slice(0, limit)
  if (rows.length === 0) return null
  const byValue = grainStats(read, grain).authoritiesRankedBy === 'value'
  const measure = (row: ProcurementAuthorityRow) => (byValue ? (row.amountRon ?? 0) : row.count)
  const max = Math.max(...rows.map(measure), 1)
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((row, position) => {
        const content = (
          <>
            <MonoLabel className="pl-1 pt-1 tabular-nums text-muted-foreground">{String(position + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm leading-snug text-foreground">{institutionName(row.name, row.cui)}</span>
              <span className="mt-1.5 block h-1.5 bg-muted/70" aria-hidden="true">
                <span
                  className="block h-full bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ width: `${Math.max(0.8, (measure(row) / max) * 100).toFixed(1)}%` }}
                />
              </span>
              <MonoLabel className="mt-1.5 block tabular-nums text-muted-foreground">{grainCount(grain, row.count)}</MonoLabel>
            </span>
            <span className="self-start text-right text-sm font-semibold tabular-nums text-foreground">
              {row.amountRon === null ? '—' : moneyCell(row.amountRon)}
            </span>
          </>
        )
        const rowClass = 'group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5'
        return (
          <li key={row.cui ?? `unnamed-${position}`}>
            {row.cui ? (
              <Link to="/procurement/institutions/$cui" params={{ cui: row.cui }} className={cn(rowClass, ROW_LINK_CLASS)}>
                {content}
              </Link>
            ) : (
              <div className={rowClass}>{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function CategoryList({ read, grain, className }: { readonly read: CompanyProcurementRead; readonly grain: CompanyPaymentGrain; readonly className?: string }) {
  const { i18n } = useLingui()
  const rows = grainCategories(read, grain)
  if (rows.length === 0) return null
  const english = i18n.locale === 'en'
  return (
    <ul className={cn('space-y-3', className)}>
      {rows.slice(0, 5).map((row) => (
        <li key={row.code ?? 'unknown'}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-foreground">{(english ? row.labelEn ?? row.labelRo : row.labelRo ?? row.labelEn) ?? t`Fără categorie CPV`}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{row.share === null ? '—' : percent(row.share)}</span>
          </div>
          <span className="mt-1.5 block h-1 bg-muted" aria-hidden="true">
            <span className="block h-full bg-primary/70" style={{ width: `${Math.max((row.share ?? 0) * 100, 0.8).toFixed(1)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function recordLink(record: ProcurementRecordRow) {
  return record.grain === 'contract'
    ? ({ to: '/procurement/contracts/$id', params: { id: record.id } } as const)
    : ({ to: '/procurement/direct-acquisitions/$id', params: { id: record.id } } as const)
}

function RecentRecords({ records, limit = 5, className }: { readonly records: readonly ProcurementRecordRow[]; readonly limit?: number; readonly className?: string }) {
  const shown = records.slice(0, limit)
  if (shown.length === 0) return null
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {shown.map((record) => (
        <li key={`${record.grain}-${record.id}`}>
          <Link {...recordLink(record)} className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3', ROW_LINK_CLASS)}>
            <span className="min-w-0">
              <MonoLabel className="block text-muted-foreground">
                {dateText(record.date)} · {record.grain === 'contract' ? t`contract` : t`achiziție directă`}
              </MonoLabel>
              <span className="mt-1.5 block text-sm text-foreground sm:truncate">{record.title || t`Fără titlu publicat`}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground sm:truncate">{institutionName(record.authority.name, record.authority.cui)}</span>
            </span>
            <span className="self-center text-right text-sm font-semibold tabular-nums text-foreground">
              {record.valueRon === null ? '—' : moneyCell(record.valueRon)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
