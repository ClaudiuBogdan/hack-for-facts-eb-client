import { useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatNgoDate, formatNgoMoney, formatNgoShare } from '@/features/ngos/hub/ngo-format'
import { cn } from '@/lib/utils'
import type { NgoAvailability, NgoOrganization, NgoStatement } from '../api'
import { formatExact, isInferred, keyFigures, latestStatement, placeOf, statementRows, statusOf, type Amount, type StatementRow, type YearPoint } from '../model'
import { categoryLabel, identityText, statusLabel, useNumberLocale } from '../words'

/**
 * The NGO profile's parts, each reading `ngoOrganizationProfile` as the API
 * gives it: the head's words and chips, the money figures, the years chart,
 * the statement as filed, and what ANAF and the registry say — every read
 * dated, every missing section said as missing, never as a zero.
 */

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

const identityQuestion = (link: string) => t`${link}: cum a fost legat CUI-ul`

/** Registry status, VAT, fiscal inactivity (explained: it is not dissolution) and how the CUI was admitted. */
export function ProfileChips({ organization }: { readonly organization: NgoOrganization }) {
  const status = statusOf(organization)
  const fiscal = organization.fiscal.data
  const identity = identityText(organization.identity.method)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone={status === 'registered' ? 'ok' : 'closed'}>{statusLabel(status)}</Chip>
      {fiscal?.vatPayer ? <Chip>{t`Plătitoare de TVA`}</Chip> : null}
      {fiscal?.declaredFiscallyInactive ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="cursor-help" aria-label={t`Inactivă fiscal: ce înseamnă`}>
              <Chip tone="warn">{t`Inactivă fiscal`}</Chip>
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
          <button type="button" className="cursor-help" aria-label={identityQuestion(identity.short)}>
            <Chip tone={isInferred(organization.identity.method) ? 'warn' : 'plain'}>{identity.short}</Chip>
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
export function Identifiers({ organization }: { readonly organization: NgoOrganization }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      <MonoLabel className="text-muted-foreground">
        CUI <span className="text-foreground">{organization.cui}</span>
      </MonoLabel>
      {organization.registryNumber ? (
        <MonoLabel className="text-muted-foreground">
          <Trans>Nr. registru</Trans> <span className="text-foreground">{organization.registryNumber}</span>
        </MonoLabel>
      ) : null}
    </div>
  )
}

/** One sentence: what it is, where, its registry number and since when ANAF knows it. */
export function ProfileSentence({ organization }: { readonly organization: NgoOrganization }) {
  const category = categoryLabel(organization.category)
  const place = placeOf(organization)
  const registered = organization.anafRegistration.data?.registrationDate ? formatNgoDate(organization.anafRegistration.data.registrationDate) : null
  return (
    <>
      {place ? <Trans>{category} din {place}.</Trans> : <Trans>{category}.</Trans>}{' '}
      {registered ? <Trans>Înregistrată la ANAF din {registered}.</Trans> : null}
    </>
  )
}

// ───────────────────────────────────────────────────────── the chart ──

/** A year in words, for the readout and each column's name: its two figures, or that the platform has no statement. */
function yearText(point: YearPoint, money: (value: number | null) => string): string {
  const year = point.year
  if (!point.statement) return t`${year}: nicio situație pe platformă`
  const revenue = money(point.revenue)
  const expenses = money(point.expenses)
  return t`${year}: venituri ${revenue}, cheltuieli ${expenses}`
}

/**
 * Revenue and expenses per year as paired columns, a year without a
 * statement on the platform kept as a hatched gap — unknown, not zero — and
 * a filed year whose form has no total a hatched half. The first and last
 * revenues are written above; each year is a button reading its figures.
 * Compact (the head's), it is one image, its years said in its name.
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
  const bars = (point: YearPoint) =>
    point.statement ? (
      <>
        {!compact && ends.has(point.year) && active === null && point.revenue !== null ? (
          <span className="absolute -top-4 whitespace-nowrap text-[0.625rem] font-semibold tabular-nums text-foreground" aria-hidden="true">
            {formatNgoMoney(point.revenue).value}
          </span>
        ) : null}
        {[point.revenue, point.expenses].map((value, index) =>
          value === null ? (
            // No such total in that year's form: a mark, not a zero-height column.
            <span key={index} className="block h-3 w-1/2 border border-dashed border-muted-foreground/50" aria-hidden="true" />
          ) : (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'block w-1/2',
                index === 0 ? cn('bg-primary/70 transition-colors group-hover:bg-primary', active === point.year && 'bg-primary') : 'bg-foreground/25',
              )}
              style={{ height: `${((value / max) * 100).toFixed(1)}%` }}
            />
          ),
        )}
      </>
    ) : (
      <span className="block h-3 w-full border border-dashed border-muted-foreground/50 bg-muted/40" aria-hidden="true" />
    )
  const columns = 'flex items-end gap-1 border-b border-foreground/30 sm:gap-1.5'
  const cell = 'relative flex h-full min-w-0 flex-1 items-end justify-center gap-px'
  return (
    <figure>
      <figcaption className="sr-only">{t`Venituri și cheltuieli pe an`}</figcaption>
      {compact ? (
        // The head's: one image, its years said in its name — no stops a keyboard would land on for nothing.
        <div className={cn(columns, height)} role="img" aria-label={series.map((point) => yearText(point, text)).join('; ')}>
          {series.map((point) => (
            <span key={point.year} className={cell}>
              {bars(point)}
            </span>
          ))}
        </div>
      ) : (
        <>
          <p className="h-10 text-sm text-muted-foreground" aria-live="polite">
            {current ? yearText(current, text) : null}
          </p>
          <div className={cn(columns, height)} onPointerLeave={() => setActive(null)}>
            {series.map((point) => (
              <button
                key={point.year}
                type="button"
                className={cn('group outline-hidden focus-visible:ring-2 focus-visible:ring-ring', cell)}
                onPointerEnter={() => setActive(point.year)}
                onFocus={() => setActive(point.year)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(point.year)}
                aria-label={yearText(point, text)}
              >
                {bars(point)}
              </button>
            ))}
          </div>
        </>
      )}
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
          {series.some((point) => !point.statement || point.revenue === null || point.expenses === null) ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3 border border-dashed border-muted-foreground/50" aria-hidden="true" />
              {t`Fără cifră pe platformă`}
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
            <MonoLabel className="ml-2 text-muted-foreground">{row.codes.join('/')}</MonoLabel>
          </th>
          {/* A balance row has one value, at year end: the plan column stays empty, not dashed. */}
          <td className="py-2 pl-3 text-right text-sm text-muted-foreground max-sm:hidden">{columns ? <Exact amount={row.planned} /> : null}</td>
          <td className="py-2 pl-3 pr-1 text-right text-sm font-semibold text-foreground">
            <Exact amount={row.actual} />
            {/* On a phone the plan's column is hidden: a filed plan is read here instead. */}
            {columns && row.planned?.raw != null ? (
              <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                <Trans>prevăzut</Trans> <Exact amount={row.planned} />
              </span>
            ) : null}
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
export function StatementTable({ statement }: { readonly statement: NgoStatement }) {
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
                  <Trans>Realizat {year}</Trans>
                </MonoLabel>
              </th>
            </tr>
          </thead>
          {/* Each section says its own unit: money in lei, the staff in people. */}
          <SectionRows title={<Trans>Bilanț la 31 decembrie {year}, lei</Trans>} rows={rows.filter((row) => row.kind === 'balance')} columns={false} />
          <SectionRows title={<Trans>Venituri și cheltuieli, lei</Trans>} rows={rows.filter((row) => row.kind === 'result')} columns />
          <SectionRows title={<Trans>Personal, persoane</Trans>} rows={rows.filter((row) => row.kind === 'staff')} columns={false} />
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

const yearWithout = (year: number) => t`${year} — fără situație`

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
            {point.statement ? point.year : yearWithout(point.year)}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Revenue by source for one statement: one proportion bar, the rows under it. */
export function RevenueSources({ statement }: { readonly statement: NgoStatement }) {
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

function Unavailable({ availability }: { readonly availability: NgoAvailability }) {
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

/**
 * What ANAF says, in its two reads, each on its own and dated — the
 * registration, and the fiscal status (VAT, fiscal inactivity, the main
 * economic activity) — so one read missing never hides the other.
 */
export function AnafFacts({ organization }: { readonly organization: NgoOrganization }) {
  const registration = organization.anafRegistration
  const fiscal = organization.fiscal
  const yesNo = (value: boolean | null | undefined) => (value === true ? t`Da` : value === false ? t`Nu` : '—')
  const registrationRead = registration.data ? formatNgoDate(registration.data.queryDate) : null
  const fiscalRead = fiscal.data?.queryDate ? formatNgoDate(fiscal.data.queryDate) : null
  return (
    <div className="space-y-5">
      <div>
        <dl className="border-b border-border/60">
          <Fact term={<Trans>Înregistrare</Trans>}>
            {registration.availability === 'available' && registration.data ? (
              (registration.data.registrationStateText ?? '—')
            ) : (
              <Unavailable availability={registration.availability} />
            )}
          </Fact>
        </dl>
        {registrationRead ? (
          <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
            <Trans>Înregistrarea, citită la {registrationRead}</Trans>
          </MonoLabel>
        ) : null}
      </div>
      <div>
        <dl className="border-b border-border/60">
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
        {fiscalRead ? (
          <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
            <Trans>Situația fiscală, citită la {fiscalRead}</Trans>
          </MonoLabel>
        ) : null}
      </div>
    </div>
  )
}

/** The server's conflict codes, said as the fields they are: two registry observations of the organisation disagree on it. */
const CONFLICT: Readonly<Record<string, () => string>> = {
  name: () => t`numele`,
  court: () => t`instanța`,
  category: () => t`forma`,
  status: () => t`starea`,
  county: () => t`județul`,
  locality: () => t`localitatea`,
  sourceCui: () => t`CUI-ul declarat`,
  identity: () => t`legătura cu CUI-ul`,
  cui: () => t`CUI-ul`,
  purpose: () => t`scopul`,
}
const conflictLabel = (code: string) => CONFLICT[code]?.() ?? code

/** The registry entry: the name it holds, its status, the CUI's link to it and when the registry was read. */
export function RegistryFacts({ organization }: { readonly organization: NgoOrganization }) {
  const identity = identityText(organization.identity.method)
  const captured = formatNgoDate(organization.snapshot.capturedAt.slice(0, 10))
  return (
    <div>
      <dl className="border-b border-border/60">
        {organization.registryRecords.map((record) => (
          <Fact key={record.id} term={<Trans>Numele în registru</Trans>}>
            {record.nameWithheld ? <Trans>Nume nepublicat</Trans> : record.name}
          </Fact>
        ))}
        <Fact term={<Trans context="număr de registru">Număr</Trans>}>{organization.registryNumber ?? '—'}</Fact>
        <Fact term={<Trans>Stare</Trans>}>{statusLabel(statusOf(organization))}</Fact>
        <Fact term={<Trans>Forma</Trans>}>{categoryLabel(organization.category)}</Fact>
        <Fact term={<Trans>Legătura cu CUI-ul</Trans>}>
          {identity.short}
          <span className="block text-xs text-muted-foreground">{identity.long}</span>
        </Fact>
        {organization.conflicts.length > 0 ? (
          <Fact term={<Trans>Neconcordanțe</Trans>}>
            <ul className="list-disc pl-4">
              {organization.conflicts.map((conflict) => (
                <li key={conflict}>{conflictLabel(conflict)}</li>
              ))}
            </ul>
          </Fact>
        ) : null}
      </dl>
      <MonoLabel className="mt-3 block leading-relaxed text-muted-foreground">
        <Trans>Registrul național ONG, citit la {captured}</Trans>
        {organization.snapshot.refreshOverdue ? (
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
export function ProfileSources({ organization, statements }: { readonly organization: NgoOrganization; readonly statements: readonly NgoStatement[] }) {
  const captured = formatNgoDate(organization.snapshot.capturedAt.slice(0, 10))
  const statement = latestStatement(statements)
  // Either of ANAF's two reads dates it: they are loaded apart.
  const anafRead = organization.fiscal.data?.queryDate ?? organization.anafRegistration.data?.queryDate ?? null
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      <MonoLabel className="mr-3 text-foreground">
        <Trans>Surse</Trans>
      </MonoLabel>
      <a href={organization.snapshot.sourceUrl} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4">
        {t`Registrul național ONG`}
      </a>
      {`, ${captured}`}
      {' · '}
      {t`ANAF`}
      {anafRead ? `, ${formatNgoDate(anafRead)}` : ''}
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
