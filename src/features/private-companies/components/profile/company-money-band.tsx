import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { supplierRecordsSearch } from '@/features/procurement/lib/home-links'
import { DIRECT_COMPARABLE_FROM } from '@/features/procurement/lib/home-model'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyPaymentGrain } from '@/schemas/private-company'
import { useSeapCutoff } from '../../hooks/use-seap-cutoff'
import type {
  CompanyContractsRead,
  CompanyDirectRead,
  CompanyProcurementRead,
  ProcurementAuthorityRow,
  ProcurementRecordRow,
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
      /** Reads the band again: a part that failed fails only its own tab. */
      readonly retry: () => void
    }

/** The flows SEAP names institutions for: only these have payers and categories to show. */
const SEAP_FLOWS = new Set(['procurement_contract', 'direct_acquisition'])

/**
 * „Contracte, achiziții și PNRR": the public records that name the company as
 * supplier or beneficiary, by the instrument each is (an award is not a
 * payment), per year, and — from SEAP — who buys, for what, and the newest
 * records. Commitments are said apart, never summed with payments; records
 * without an amount are counted, never summed as zero.
 */
export function CompanyMoneyBand({
  model,
  index,
  procurement,
  onGrain,
}: {
  readonly model: CompanyProfileModel
  /** The band's caption, when the page numbers its bands; none, and no offset beside the title for it. */
  readonly index?: string
  readonly procurement: ProcurementState
  readonly onGrain: (grain: CompanyPaymentGrain) => void
}) {
  const title = <Trans>Contracte, achiziții și PNRR</Trans>
  const { money } = model
  const seapGrains = procurement.status === 'ready' ? procurement.grains.length : 0
  // Nothing is said absent until the SEAP read has answered that it has nothing too: pending or failed is not none.
  if (money.receivedCount === 0 && money.commitments.count === 0 && procurement.status === 'ready' && seapGrains === 0) {
    return (
      <ProfileBand id="bani-publici" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} index={index ?? ''} title={title} />
        <NoPublicMoney className="mt-5" />
      </ProfileBand>
    )
  }
  if (money.receivedCount === 0 && money.commitments.count === 0 && procurement.status !== 'ready') {
    // No public money in the profile, and the SEAP read, which may list records the profile lacks, has not answered: its state alone.
    return (
      <ProfileBand id="bani-publici" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} index={index ?? ''} title={title} />
        <SeapDetail model={model} procurement={procurement} onGrain={onGrain} />
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
          <HubSectionHead titleId={TITLE_ID} index={index ?? ''} title={title} lede={moneyLede(model)} />
          <MoneyFlows model={model} className="mt-8" />
        </div>
        {charted ? (
          <div className={cn('min-w-0 lg:col-span-7', index && HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <p className="text-xs text-muted-foreground">
              <Trans>Pe an, după anul contractului sau al achiziției</Trans>
            </p>
            <MoneyChart model={model} className="mt-4" />
          </div>
        ) : null}
      </div>
      {expectsSeap ? <SeapDetail model={model} procurement={procurement} onGrain={onGrain} /> : null}
    </ProfileBand>
  )
}

/** No record: the absence in the data, said with the sources it covers — never as a verified zero. */
function NoPublicMoney({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Firma nu apare în datele de aici ca furnizor în contracte sau achiziții publice (SEAP) și nici ca beneficiar PNRR.</Trans>
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
              <span className="mt-1 block text-xs text-muted-foreground">
                {flowCount(flow.flowType, flow.count)}
                {flow.receipt ? null : <>, {t`nu plăți`}</>}
              </span>
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
      // PNRR payments and subcontracts, budget execution: named, not all called payments.
      label: t`PNRR și buget`,
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
        label={t`Înregistrări de bani publici pe an`}
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
          <p className="text-xs text-muted-foreground">
            <Trans>{openYear} e anul în curs: bara lui nu e un an întreg.</Trans>
          </p>
        ) : null}
        {undated.count > 0 ? (
          <p className="text-xs text-muted-foreground">
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
          </p>
        ) : null}
        {/* Commitments stay out of the bars: an obligation drawn on the payments' scale would flatten them. */}
        {commitments.total > 0 ? (
          <p className="text-xs text-muted-foreground">
            {plural(commitments.count, {
              one: `Fără angajamentul PNRR de ${moneyText(commitments.total)}: o obligație asumată, nu o plată.`,
              few: `Fără cele # angajamente PNRR, de ${moneyText(commitments.total)}: obligații asumate, nu plăți.`,
              other: `Fără cele # de angajamente PNRR, de ${moneyText(commitments.total)}: obligații asumate, nu plăți.`,
            })}
          </p>
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
  const { read, grains, grain, retry } = procurement
  if (!grain) {
    // Both parts answered, and neither has records for the company's code, though the profile counts some: said, not dropped.
    return (
      <p className="mt-14 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
        <Trans>Căutarea în SEAP după CUI-ul firmei nu a întors înregistrări, așa că cumpărătorii nu pot fi numiți aici.</Trans>
      </p>
    )
  }
  const toggle =
    grains.length > 1 ? (
      <IndicatorToggle label={t`Înregistrările SEAP`} options={grains.map((key) => ({ key, label: grainLabel(key) }))} value={grain} onChange={onGrain} />
    ) : (
      <span className="text-xs text-muted-foreground">{grainLabel(grain)}</span>
    )
  const part = grain === 'contracte' ? read.contracts : read.directAcquisitions
  if (part.status === 'failed') {
    // Only this tab's read failed: the other stands, and the retry reads the band again.
    return (
      <div className="mt-14">
        <div className="flex justify-end">
          <div className="w-full sm:w-fit">{toggle}</div>
        </div>
        <div className="mt-4">
          <HubLoadError onRetry={retry} />
        </div>
      </div>
    )
  }
  const cui = model.profile.cui
  if (grain === 'contracte') {
    const contracts = read.contracts.status === 'ready' ? read.contracts.value : null
    if (!contracts) return null
    return <ContractsDetail contracts={contracts} cui={cui} toggle={toggle} />
  }
  if (read.directAcquisitions.status !== 'ready') return null
  const direct = read.directAcquisitions.value
  return (
    <div className={cn('mt-14', BAND_GRID_CLASS)} data-reveal>
      <div className="min-w-0 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-xs text-muted-foreground">
            <Trans>Cine cumpără</Trans>
          </p>
          <div className="w-full sm:w-fit">{toggle}</div>
        </div>
        <PayerList direct={direct} className="mt-4" />
        <CoverageNote direct={direct} className="mt-3" />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <p className="text-xs text-muted-foreground">
          <Trans>Pentru ce</Trans>
        </p>
        <CategoryList direct={direct} className="mt-5" />
        <p className="mt-10 text-xs text-muted-foreground">
          <Trans>Cele mai recente</Trans>
        </p>
        <RecentRecords records={direct.recent} className="mt-4" />
        {cui ? <ProcurementLinks cui={cui} grain={grain} className="mt-3" /> : null}
      </div>
    </div>
  )
}

/**
 * The contract awards the company won, as the winner reads serve them: how
 * many, how many carry a value, the date the data runs to, and the newest.
 * No ranking of buyers or categories is served for a winner: the winner's
 * own list carries them.
 */
function ContractsDetail({ contracts, cui, toggle }: { readonly contracts: CompanyContractsRead; readonly cui: string | null; readonly toggle: ReactNode }) {
  const from = contracts.floor.slice(0, 4)
  const awards = plural(contracts.count, { one: '# contract atribuit', few: '# contracte atribuite', other: '# de contracte atribuite' })
  const parts = [
    t`Din ${from}, SEAP numește firma câștigătoare în ${awards}.`,
    contracts.withValue < contracts.count ? t`Valoarea e publicată pentru ${count(contracts.withValue)} din ${awards}.` : t`Toate au valoarea publicată.`,
    t`Date până la ${dateText(contracts.dataAsOf.slice(0, 10))}.`,
  ].filter((part): part is string => part !== null)
  return (
    <div className={cn('mt-14', BAND_GRID_CLASS)} data-reveal>
      <div className="min-w-0 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-xs text-muted-foreground">
            <Trans>Contracte atribuite</Trans>
          </p>
          <div className="w-full sm:w-fit">{toggle}</div>
        </div>
        <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-foreground">{parts.join(' ')}</p>
        <p className="mt-3 max-w-[60ch] text-xs text-muted-foreground">
          <Trans>Instituțiile care au atribuit contractele și categoriile lor sunt în lista contractelor atribuite firmei.</Trans>
        </p>
      </div>
      <div className="min-w-0 lg:col-span-5">
        <p className="text-xs text-muted-foreground">
          <Trans>Cele mai recente</Trans>
        </p>
        <RecentRecords records={contracts.recent} className="mt-4" />
        {cui ? <ProcurementLinks cui={cui} grain="contracte" className="mt-3" /> : null}
      </div>
    </div>
  )
}

const OUT_LINK_CLASS = 'inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline'

/**
 * Where the procurement pages take the company further: its contract awards
 * on the winner's list, or its direct purchases on the analytics page — from
 * the year that page compares from, said in the link — and the firm as the
 * state's supplier.
 */
function ProcurementLinks({ cui, grain, className }: { readonly cui: string; readonly grain: CompanyPaymentGrain; readonly className?: string }) {
  const from = DIRECT_COMPARABLE_FROM
  return (
    <div className={cn('flex flex-col items-start', className)}>
      {grain === 'contracte' ? (
        <Link to="/procurement/contract-awards/winners/$cui" params={{ cui }} className={OUT_LINK_CLASS}>
          <Trans>Contractele atribuite firmei →</Trans>
        </Link>
      ) : (
        <Link to="/procurement/analytics" search={supplierRecordsSearch(cui, null, 'direct')} className={OUT_LINK_CLASS}>
          <Trans>Achizițiile directe ale firmei din {from} →</Trans>
        </Link>
      )}
      <Link to="/procurement/suppliers/$cui" params={{ cui }} className={OUT_LINK_CLASS}>
        <Trans>Firma ca furnizor al statului →</Trans>
      </Link>
    </div>
  )
}

/**
 * A line under a ranking: the months of the company's own records — not the
 * source's coverage, which follows them as the month SEAP's data runs to —
 * how much of it carries a published value when both counts are known, and
 * what the ranking is by when it cannot be money.
 */
function CoverageNote({ direct, className }: { readonly direct: CompanyDirectRead; readonly className?: string }) {
  const grain: CompanyPaymentGrain = 'achizitii-directe'
  const through = useSeapCutoff().data?.direct ?? null
  const stats = direct.stats
  // The cutoff is SEAP's last month complete enough to read; a record in a thinner month after it would
  // put the company's newest month past „the data's end", so the date is said only when it is not.
  // The release's newest purchases count too: one listed after the cutoff month would sit beside an earlier „end".
  const newest = [stats.lastMonth, ...direct.recent.map((record) => record.date?.slice(0, 7) ?? null)].reduce<string | null>((latest, month) => (month !== null && (latest === null || month > latest) ? month : latest), null)
  const seapMonth = through && !(newest && newest > through) ? monthText(through) : null
  const window = stats.firstMonth && stats.lastMonth ? `${monthText(stats.firstMonth)} – ${monthText(stats.lastMonth)}` : null
  const lowerBound =
    stats.count !== null && stats.withValue !== null && stats.withValue < stats.count
      ? t`Valoarea e publicată pentru ${count(stats.withValue)} din ${grainCount(grain, stats.count)}, deci sumele sunt o limită de jos.`
      : null
  const ranking = stats.authoritiesRankedBy === 'count' ? t`Ordonate după numărul de înregistrări: prea puține au valoare publicată.` : null
  const parts = [
    window ? t`Înregistrările firmei în SEAP, ${window}.` : null,
    seapMonth ? t`Date SEAP până în ${seapMonth}.` : null,
    lowerBound,
    ranking,
  ].filter((part): part is string => part !== null)
  if (parts.length === 0) return null
  return <p className={cn('text-xs text-muted-foreground', className)}>{parts.join(' ')}</p>
}

/**
 * The institutions that paid most, as SEAP ranked them: by money when enough
 * of it is published, else by the number of records — the bars follow the
 * same measure, so a row with no published amount is never drawn as nothing.
 */
function PayerList({ direct, limit = 8, className }: { readonly direct: CompanyDirectRead; readonly limit?: number; readonly className?: string }) {
  const grain: CompanyPaymentGrain = 'achizitii-directe'
  const rows = direct.topAuthorities.slice(0, limit)
  if (rows.length === 0) return null
  const byValue = direct.stats.authoritiesRankedBy === 'value'
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
              <span className="mt-1.5 block text-xs tabular-nums text-muted-foreground">{grainCount(grain, row.count)}</span>
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

function CategoryList({ direct, className }: { readonly direct: CompanyDirectRead; readonly className?: string }) {
  const { i18n } = useLingui()
  const rows = direct.topCategories
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
    ? ({ to: '/procurement/contract-awards/$id', params: { id: record.id } } as const)
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
                {dateText(record.date)} · {record.grain === 'direct_acquisition' ? t`achiziție directă` : record.framework ? t`acord-cadru` : t`contract atribuit`}
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
