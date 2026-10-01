import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatNgoChange, formatNgoDate, formatNgoMoney, formatNgoShare } from '@/features/ngos/hub/ngo-format'
import { cn } from '@/lib/utils'
import { PROFILE_FIXTURES } from './profile.fixtures'
import {
  countyOf,
  displayNgoName,
  formatExact,
  isInferred,
  keyFigures,
  latestStatement,
  localityOf,
  resultOf,
  statementRows,
  statusOf,
  yearSeries,
  type Amount,
  type RegistryStatus,
  type StatementRow,
  type YearPoint,
} from './profile.model'
import type { IdentityMethod, RawProfile, RawStatement } from './profile.types'

// ─────────────────────────────────────────────────────── the fixture ──

/** The fixture a variant draws: `?cui=` from the harness URL, Funky Citizens by default. */
export function useFixture(): RawProfile {
  const search = useSearch({ strict: false }) as { readonly cui?: unknown }
  const cui = typeof search.cui === 'string' || typeof search.cui === 'number' ? String(search.cui) : '30339344'
  return PROFILE_FIXTURES.find((profile) => profile.cui === cui) ?? PROFILE_FIXTURES[1]!
}

/** A dev-only row to switch the fixture, above each variant. */
export function FixturePicker() {
  const current = useFixture()
  const search = useSearch({ strict: false }) as Record<string, unknown>
  return (
    <div className="flex flex-wrap gap-1.5 border-b bg-muted/30 px-4 py-2 text-xs">
      {PROFILE_FIXTURES.map((profile) => (
        <Link
          key={profile.cui}
          to="."
          search={{ ...search, cui: profile.cui }}
          className={cn('rounded-sm border px-2 py-0.5', profile.cui === current.cui ? 'border-foreground bg-foreground text-background' : 'bg-background')}
        >
          {displayNgoName(profile.name).slice(0, 28)}
        </Link>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────── the words ──

export function useNumberLocale(): 'ro' | 'en' {
  const { i18n } = useLingui()
  return i18n.locale === 'en' ? 'en' : 'ro'
}

const CATEGORY: Readonly<Record<string, () => string>> = {
  association: () => t`Asociație`,
  foundation: () => t`Fundație`,
  federation: () => t`Federație`,
  religious_association: () => t`Asociație religioasă`,
  foreign_legal_person: () => t`Persoană juridică străină`,
}

export function categoryLabel(category: string | null): string {
  return (category && CATEGORY[category]?.()) ?? t`Organizație`
}

const STATUS: Readonly<Record<RegistryStatus, () => string>> = {
  registered: () => t`Înregistrată`,
  dissolved: () => t`Dizolvată`,
  inLiquidation: () => t`În lichidare`,
  deregistered: () => t`Radiată`,
  unknown: () => t`Stare necunoscută`,
}

export function statusLabel(status: RegistryStatus): string {
  return STATUS[status]()
}

const IDENTITY: Readonly<Record<IdentityMethod, () => { readonly short: string; readonly long: string }>> = {
  registry_cui: () => ({ short: t`CUI declarat în registru`, long: t`Registrul național ONG declară acest CUI pentru organizație.` }),
  registry_cui_fiscal_agreement: () => ({
    short: t`CUI declarat în registru, confirmat de ANAF`,
    long: t`Registrul declară acest CUI, iar la ANAF CUI-ul poartă același nume.`,
  }),
  fiscal_exact_name_county: () => ({
    short: t`CUI dedus din nume și județ`,
    long: t`Registrul nu declară un CUI. La ANAF, un singur CUI are exact numele și județul organizației; platforma l-a legat de ea.`,
  }),
  document_registration_bridge: () => ({
    short: t`CUI legat printr-un document publicat`,
    long: t`Registrul nu declară un CUI; un document publicat leagă înregistrarea din registru de acest CUI.`,
  }),
}

export function identityText(method: IdentityMethod) {
  return IDENTITY[method]()
}

export function placeOf(profile: RawProfile): string | null {
  const county = countyOf(profile.county)
  const town = localityOf(profile.locality)
  if (!town) return county?.name ?? null
  if (!county || town.normalize('NFD').replace(/\p{Diacritic}/gu, '') === county.name.normalize('NFD').replace(/\p{Diacritic}/gu, '')) return county?.name ?? town
  return `${town}, ${county.name}`
}

// ─────────────────────────────────────────────────────────── the money ──

/** A short money figure („85,4 mil." and „lei" a step quieter), or a dash for a blank cell. */
export function Money({ amount, className }: { readonly amount: number | null; readonly className?: string }) {
  if (amount === null) return <span className={cn('text-muted-foreground', className)}>—</span>
  const money = formatNgoMoney(amount)
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {money.value}
      <span className="ml-1 font-normal text-muted-foreground">{money.unit}</span>
    </span>
  )
}

/** A filed value exactly as filed, grouped; a blank cell a dash, a reported zero a zero. */
export function Exact({ amount, className }: { readonly amount: Amount | null; readonly className?: string }) {
  const locale = useNumberLocale()
  if (!amount || amount.raw === null) return <span className={cn('text-muted-foreground', className)}>—</span>
  return <span className={cn('whitespace-nowrap tabular-nums', className)}>{formatExact(amount.raw, locale)}</span>
}

// ─────────────────────────────────────────────────────────── the chips ──

function Chip({ tone = 'plain', children }: { readonly tone?: 'plain' | 'ok' | 'warn' | 'closed'; readonly children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 border px-2.5 text-xs',
        tone === 'ok' && 'text-foreground',
        tone === 'warn' && 'border-amber-700/40 text-amber-800 dark:border-amber-300/40 dark:text-amber-300',
        tone === 'closed' && 'border-foreground/30 text-foreground',
        tone === 'plain' && 'text-muted-foreground',
      )}
    >
      {tone === 'ok' ? <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" /> : null}
      {tone === 'closed' ? <span className="size-1.5 rounded-full bg-foreground/50" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

/** Registry status, VAT, fiscal inactivity (explained: it is not dissolution) and how the CUI was admitted. */
export function ProfileChips({ profile }: { readonly profile: RawProfile }) {
  const status = statusOf(profile)
  const fiscal = profile.fiscal.data
  const identity = identityText(profile.identity.method)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone={status === 'registered' ? 'ok' : 'closed'}>{statusLabel(status)}</Chip>
      {fiscal?.vatPayer ? <Chip>{t`Plătitoare de TVA`}</Chip> : null}
      {fiscal?.declaredFiscallyInactive ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="cursor-help">
              <Chip tone="warn">
                {t`Inactivă fiscal`}
                <span className="sr-only">{t`: ce înseamnă`}</span>
              </Chip>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs leading-relaxed">
            <Trans>
              ANAF a declarat-o inactivă fiscal (nu și-a depus declarațiile sau nu e găsită la sediu). Nu înseamnă că a fost dizolvată: starea în
              registru e separată.
            </Trans>
          </PopoverContent>
        </Popover>
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="cursor-help">
            <Chip tone={isInferred(profile.identity.method) ? 'warn' : 'plain'}>
              {identity.short}
              <span className="sr-only">{t`: cum a fost legat`}</span>
            </Chip>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-xs leading-relaxed">
          {identity.long} <Trans>Nicio metodă nu e o verificare juridică.</Trans>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** CUI and registry number, the two identifiers a reader copies. */
export function Identifiers({ profile }: { readonly profile: RawProfile }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      <MonoLabel className="text-muted-foreground">
        CUI <span className="text-foreground">{profile.cui}</span>
      </MonoLabel>
      {profile.registryNumber ? (
        <MonoLabel className="text-muted-foreground">
          <Trans>Nr. registru</Trans> <span className="text-foreground">{profile.registryNumber}</span>
        </MonoLabel>
      ) : null}
    </div>
  )
}

/** One sentence: what it is, where, its registry number and since when ANAF knows it. */
export function ProfileSentence({ profile }: { readonly profile: RawProfile }) {
  const category = categoryLabel(profile.category)
  const place = placeOf(profile)
  const registered = profile.anafRegistration.data?.registrationDate ? formatNgoDate(profile.anafRegistration.data.registrationDate) : null
  return (
    <>
      {place ? <Trans>{category} din {place}.</Trans> : <Trans>{category}.</Trans>}{' '}
      {registered ? <Trans>Înregistrată la ANAF din {registered}.</Trans> : null}
    </>
  )
}

// ──────────────────────────────────────────────────────── the figures ──

export interface ProfileFacts {
  readonly year: number
  readonly revenue: number | null
  readonly expenses: number | null
  readonly result: number | null
  readonly change: string | null
  readonly previousYear: number
  readonly previousFiled: boolean
  readonly filed: number
  readonly span: readonly [number, number] | null
}

export function profileFacts(profile: RawProfile): ProfileFacts | null {
  const statement = latestStatement(profile)
  if (!statement) return null
  const figures = keyFigures(statement)
  const series = yearSeries(profile)
  const previous = series.find((point) => point.year === statement.fiscalYear - 1)
  return {
    year: statement.fiscalYear,
    revenue: figures.revenue?.value ?? null,
    expenses: figures.expenses?.value ?? null,
    result: resultOf(statement),
    change: figures.revenue?.value != null ? formatNgoChange(previous?.revenue ?? null, figures.revenue.value) : null,
    previousYear: statement.fiscalYear - 1,
    previousFiled: Boolean(previous?.statement),
    filed: profile.financials.statements.length,
    span: series.length > 0 ? [series[0]!.year, series[series.length - 1]!.year] : null,
  }
}

// ───────────────────────────────────────────────────────── the chart ──

/**
 * Revenue and expenses per year as paired columns, a year without a
 * statement kept as a hatched gap — unknown, not zero. The first and last
 * revenues are written above; each year is a button reading its figures.
 */
export function YearsChart({ series, height = 'h-56', compact = false }: { readonly series: readonly YearPoint[]; readonly height?: string; readonly compact?: boolean }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...series.flatMap((point) => [point.revenue ?? 0, point.expenses ?? 0]))
  const current = series.find((point) => point.year === active) ?? null
  const filed = series.filter((point) => point.statement)
  const ends = new Set([filed[0]?.year, filed[filed.length - 1]?.year])
  const text = (value: number | null) => {
    if (value === null) return '—'
    const money = formatNgoMoney(value)
    return `${money.value} ${money.unit}`
  }
  return (
    <figure>
      <figcaption className="sr-only">{t`Venituri și cheltuieli pe an`}</figcaption>
      {compact ? null : (
        <p className="h-10 text-sm text-muted-foreground" aria-live="polite">
          {current ? (
            current.statement ? (
              <>
                <span className="font-semibold text-foreground">{current.year}</span>: {t`venituri`}{' '}
                <span className="tabular-nums text-foreground">{text(current.revenue)}</span>, {t`cheltuieli`}{' '}
                <span className="tabular-nums text-foreground">{text(current.expenses)}</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{current.year}</span>: {t`nicio situație în fișierele publicate`}
              </>
            )
          ) : null}
        </p>
      )}
      <div className={cn('flex items-end gap-1 border-b border-foreground/30 sm:gap-1.5', height)} onPointerLeave={() => setActive(null)}>
        {series.map((point) => {
          const label = point.statement
            ? `${point.year}: ${t`venituri`} ${text(point.revenue)}, ${t`cheltuieli`} ${text(point.expenses)}`
            : `${point.year}: ${t`nicio situație în fișierele publicate`}`
          return (
            <button
              key={point.year}
              type="button"
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-px outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onPointerEnter={() => setActive(point.year)}
              onFocus={() => setActive(point.year)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(point.year)}
              aria-label={label}
            >
              {point.statement ? (
                <>
                  {!compact && ends.has(point.year) && active === null && point.revenue !== null ? (
                    <span className="absolute -top-4 whitespace-nowrap text-[0.625rem] font-semibold tabular-nums text-foreground" aria-hidden="true">
                      {formatNgoMoney(point.revenue).value}
                    </span>
                  ) : null}
                  <span
                    className={cn('block w-1/2 bg-primary/70 transition-colors group-hover:bg-primary', active === point.year && 'bg-primary')}
                    style={{ height: `${(((point.revenue ?? 0) / max) * 100).toFixed(1)}%` }}
                  />
                  <span className="block w-1/2 bg-foreground/25" style={{ height: `${(((point.expenses ?? 0) / max) * 100).toFixed(1)}%` }} />
                </>
              ) : (
                <span className="block h-3 w-full border border-dashed border-muted-foreground/50 bg-muted/40" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1 sm:gap-1.5" aria-hidden="true">
        {series.map((point, index) => (
          <MonoLabel
            key={point.year}
            className={cn(
              'min-w-0 flex-1 text-center tabular-nums text-muted-foreground',
              series.length > 10 && index % 2 === 1 && index !== series.length - 1 && 'invisible',
            )}
          >
            {String(point.year).slice(2)}
          </MonoLabel>
        ))}
      </div>
      {compact ? null : (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-primary/70" aria-hidden="true" />
            {t`Venituri totale`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-foreground/25" aria-hidden="true" />
            {t`Cheltuieli totale`}
          </span>
          {series.some((point) => !point.statement) ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 border border-dashed border-muted-foreground/50" aria-hidden="true" />
              {t`Fără situație publicată`}
            </span>
          ) : null}
        </div>
      )}
    </figure>
  )
}

// ────────────────────────────────────────────────────── the statement ──

function SectionRows({ title, rows, columns }: { readonly title: ReactNode; readonly rows: readonly StatementRow[]; readonly columns: boolean }) {
  if (rows.length === 0) return null
  return (
    <tbody className="border-b border-border/70">
      <tr>
        <th scope="rowgroup" colSpan={3} className="pb-2 pt-6 text-left font-normal">
          <MonoLabel className="text-primary">{title}</MonoLabel>
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.codes.join('-')} className="border-t border-border/60">
          <th scope="row" className="py-2 pl-1 pr-3 text-left text-sm font-normal text-foreground">
            {row.base}
            <MonoLabel className="ml-2 text-muted-foreground/70">{row.codes.join('/')}</MonoLabel>
          </th>
          {/* A balance row has one value, at year end: the plan column stays empty, not dashed. */}
          <td className="py-2 pl-3 text-right text-sm text-muted-foreground max-sm:hidden">{columns ? <Exact amount={row.planned} /> : null}</td>
          <td className="py-2 pl-3 pr-1 text-right text-sm font-semibold text-foreground">
            <Exact amount={row.actual} />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

/**
 * One statement as filed: every row under its own year's label (the column's
 * stale date dropped, the year taken from the statement), each value exact —
 * a blank cell a dash, a reported zero a zero — with the file and its
 * dictionary linked.
 */
export function StatementTable({ statement }: { readonly statement: RawStatement }) {
  const rows = statementRows(statement)
  const year = statement.fiscalYear
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70">
              <th scope="col" className="pb-2 pl-1 text-left font-normal">
                <MonoLabel className="text-muted-foreground">
                  <Trans>Rândul din formular</Trans>
                </MonoLabel>
              </th>
              {/* The plan is rarely filled: on a phone the actual column keeps the width. */}
              <th scope="col" className="w-36 pb-2 pl-3 text-right font-normal max-sm:hidden">
                <MonoLabel className="text-muted-foreground">
                  <Trans>Prevederi anuale</Trans>
                </MonoLabel>
              </th>
              <th scope="col" className="w-28 pb-2 pl-3 pr-1 text-right font-normal sm:w-36">
                <MonoLabel className="text-muted-foreground">
                  <Trans>Realizat {year}, lei</Trans>
                </MonoLabel>
              </th>
            </tr>
          </thead>
          <SectionRows title={<Trans>Bilanț la 31 decembrie {year}</Trans>} rows={rows.filter((row) => row.kind === 'balance')} columns={false} />
          <SectionRows title={<Trans>Venituri și cheltuieli</Trans>} rows={rows.filter((row) => row.kind === 'result')} columns />
          <SectionRows title={<Trans>Personal</Trans>} rows={rows.filter((row) => row.kind === 'staff')} columns={false} />
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        <Trans>
          Etichetele sunt ale dicționarului Ministerului Finanțelor din acel an. „—" e o celulă goală în sursă; 0 e un zero raportat.
        </Trans>{' '}
        <a href={statement.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
          {t`Fișierul ${year}`}
        </a>
        {' · '}
        <a href={statement.dictionaryUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
          {t`Dicționarul`}
        </a>
      </p>
    </div>
  )
}

/** The statements' years, newest first, as a select; years with no statement are named but cannot be chosen. */
export function YearSelect({ series, value, onChange }: { readonly series: readonly YearPoint[]; readonly value: number; readonly onChange: (year: number) => void }) {
  return (
    <label className="inline-flex items-center gap-3">
      <MonoLabel className="text-muted-foreground">
        <Trans>Anul</Trans>
      </MonoLabel>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-10 border bg-background px-3 text-sm font-semibold text-foreground"
      >
        {[...series].reverse().map((point) => (
          <option key={point.year} value={point.year} disabled={!point.statement}>
            {point.statement ? point.year : t`${point.year} — fără situație`}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Revenue by source for one statement: one proportion bar, the rows under it. */
export function RevenueSources({ statement }: { readonly statement: RawStatement }) {
  const figures = keyFigures(statement)
  const total = figures.revenue?.value ?? null
  const rows = [
    { key: 'nonProfit', label: t`Activități fără scop patrimonial`, amount: figures.nonProfit, fill: 'bg-primary' },
    { key: 'economic', label: t`Activități economice`, amount: figures.economic, fill: 'bg-foreground/45' },
    { key: 'special', label: t`Activități cu destinație specială`, amount: figures.special, fill: 'bg-foreground/20' },
  ]
  const share = (amount: Amount | null) => (total && amount?.value ? amount.value / total : 0)
  return (
    <div>
      {total ? (
        <div className="flex h-2.5 gap-px" aria-hidden="true">
          {rows.map((row) => (
            <span key={row.key} className={row.fill} style={{ width: `${(share(row.amount) * 100).toFixed(2)}%` }} />
          ))}
        </div>
      ) : null}
      <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {rows.map((row) => (
          <li key={row.key} className="grid min-h-11 grid-cols-[auto_1fr_auto_3.25rem] items-center gap-x-3 py-1.5">
            <span className={cn('ml-1 size-2.5 rounded-[2px]', row.fill)} aria-hidden="true" />
            <span className="text-sm text-foreground">{row.label}</span>
            <Money amount={row.amount?.value ?? null} className="text-sm font-semibold text-foreground" />
            <span className="pr-1 text-right text-xs tabular-nums text-muted-foreground">{total && row.amount?.value != null ? formatNgoShare(share(row.amount)) : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ────────────────────────────────────────────────── ANAF and registry ──

function Unavailable({ availability }: { readonly availability: 'not_loaded' | 'not_released' | 'available' }) {
  return (
    <p className="text-sm text-muted-foreground">
      {availability === 'not_released' ? <Trans>Nepublicat.</Trans> : <Trans>Date indisponibile.</Trans>}{' '}
      <Trans>Lipsa lor nu spune nimic despre organizație.</Trans>
    </p>
  )
}

function Fact({ term, children }: { readonly term: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-4 border-t border-border/60 py-2.5">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

/** What ANAF says, each read dated: registration, VAT, fiscal inactivity, the main economic activity. */
export function AnafFacts({ profile }: { readonly profile: RawProfile }) {
  const registration = profile.anafRegistration
  const fiscal = profile.fiscal
  const yesNo = (value: boolean | null | undefined) => (value === true ? t`Da` : value === false ? t`Nu` : '—')
  return (
    <div>
      {registration.availability === 'available' && registration.data ? (
        <dl className="border-b border-border/60">
          <Fact term={<Trans>Înregistrare</Trans>}>{registration.data.registrationStateText ?? '—'}</Fact>
          {fiscal.availability === 'available' && fiscal.data ? (
            <>
              <Fact term={<Trans>Plătitoare de TVA</Trans>}>{yesNo(fiscal.data.vatPayer)}</Fact>
              <Fact term={<Trans>Inactivă fiscal</Trans>}>
                {yesNo(fiscal.data.declaredFiscallyInactive)}
                {fiscal.data.declaredFiscallyInactive ? (
                  <span className="block text-xs text-muted-foreground">
                    <Trans>Nu înseamnă dizolvare: starea din registru e separată.</Trans>
                  </span>
                ) : null}
              </Fact>
              <Fact term={<Trans>Activitate economică principală</Trans>}>{fiscal.data.mainCaenCode ? `CAEN ${fiscal.data.mainCaenCode}` : '—'}</Fact>
            </>
          ) : (
            <Fact term={<Trans>Situația fiscală</Trans>}>
              <Unavailable availability={fiscal.availability} />
            </Fact>
          )}
        </dl>
      ) : (
        <Unavailable availability={registration.availability} />
      )}
      <MonoLabel className="mt-3 block text-muted-foreground">
        {fiscal.data?.queryDate ? <Trans>ANAF, citit la {formatNgoDate(fiscal.data.queryDate)}</Trans> : <Trans>ANAF</Trans>}
      </MonoLabel>
    </div>
  )
}

/** The registry entry: the name it holds, its status, the CUI's link to it and when the registry was read. */
export function RegistryFacts({ profile }: { readonly profile: RawProfile }) {
  const identity = identityText(profile.identity.method)
  const captured = formatNgoDate(profile.snapshot.capturedAt.slice(0, 10))
  return (
    <div>
      <dl className="border-b border-border/60">
        {profile.registryRecords.map((record) => (
          <Fact key={record.id} term={<Trans>Numele în registru</Trans>}>
            {record.nameWithheld ? <Trans>Nume nepublicat</Trans> : record.name}
          </Fact>
        ))}
        <Fact term={<Trans context="număr de registru">Număr</Trans>}>{profile.registryNumber ?? '—'}</Fact>
        <Fact term={<Trans>Stare</Trans>}>{statusLabel(statusOf(profile))}</Fact>
        <Fact term={<Trans>Forma</Trans>}>{categoryLabel(profile.category)}</Fact>
        <Fact term={<Trans>Legătura cu CUI-ul</Trans>}>
          {identity.short}
          <span className="block text-xs text-muted-foreground">{identity.long}</span>
        </Fact>
        {profile.conflicts.length > 0 ? (
          <Fact term={<Trans>Neconcordanțe</Trans>}>
            <ul className="list-disc pl-4">
              {profile.conflicts.map((conflict) => (
                <li key={conflict}>{conflict}</li>
              ))}
            </ul>
          </Fact>
        ) : null}
      </dl>
      <MonoLabel className="mt-3 block text-muted-foreground">
        <Trans>Registrul național ONG, citit la {captured}</Trans>
        {profile.snapshot.refreshOverdue ? (
          <span className="text-amber-800 dark:text-amber-300">
            {' · '}
            <Trans>actualizare întârziată</Trans>
          </span>
        ) : null}
      </MonoLabel>
    </div>
  )
}

/** The page's sources, once: the registry, ANAF and the statements, each with its date. */
export function ProfileSources({ profile }: { readonly profile: RawProfile }) {
  const captured = formatNgoDate(profile.snapshot.capturedAt.slice(0, 10))
  const statement = latestStatement(profile)
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      <MonoLabel className="mr-3 text-foreground">
        <Trans>Surse</Trans>
      </MonoLabel>
      <a href={profile.snapshot.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
        {t`Registrul național ONG`}
      </a>
      {`, ${captured}`}
      {' · '}
      {t`ANAF`}
      {profile.fiscal.data?.queryDate ? `, ${formatNgoDate(profile.fiscal.data.queryDate)}` : ''}
      {statement ? (
        <>
          {' · '}
          <a href={statement.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
            {t`Situațiile financiare, Ministerul Finanțelor`}
          </a>
        </>
      ) : null}
    </p>
  )
}

export { displayNgoName, keyFigures, latestStatement, yearSeries }
export type { YearPoint }
