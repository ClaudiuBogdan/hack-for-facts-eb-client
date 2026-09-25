import { useId, useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { insTempoDatasetUrl } from '../../lib/ins-tempo'
import { statisticsTheme } from '../../lib/statistics-theme'
import { describeValueStatus } from '../../lib/value-status'
import { ValueStatusMarker } from '../value-status-legend'
import {
  DERIVED_GROUP_LABELS,
  denominatorLabel,
  derivedYearsLabel,
  formatDerived,
  formatDerivedCount,
  isBalance,
  type DerivedGroup,
  type DerivedResult,
  type DerivedRow,
  type DerivedScope,
} from '../../lib/territory-derived'
import { TerritoryDerivedTrend, type DerivedPlaces } from './territory-derived-trend'

export type { DerivedPlaces }

/**
 * Every indicator in ONE dropdown, shaped like the page's „Toți indicatorii,
 * pe domenii" band and open by default: the domains as sub-headings — not
 * dropdowns of their own — and one row per indicator read across: what it
 * measures, how the rate moved, the rate and its period, then the county and
 * Romania for the same period, each labelled under its figure the way the
 * period is under the value. A row opens onto how it is computed.
 */
export function TerritoryDerivedList({ rows, places }: { readonly rows: readonly DerivedRow[]; readonly places: DerivedPlaces }) {
  const { i18n } = useLingui()
  const groups = [...new Set(rows.map((row) => row.def.group))] as DerivedGroup[]
  return (
    // Open by default: the section sits under the page's other bands, where a
    // reader who scrolled this far came for the detail.
    <Accordion type="single" collapsible defaultValue="toti" className={cn(statisticsTheme.band, 'px-4')}>
      <AccordionItem value="toti" className="border-b-0">
        <AccordionTrigger className="py-3 text-sm hover:no-underline">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">
              <Trans>Toți indicatorii, cu județul și țara</Trans>
            </span>
            <span className="text-xs font-normal tabular-nums text-muted-foreground" aria-hidden="true">
              {rows.length}
            </span>
            <span className="sr-only">
              {plural(rows.length, { one: ', un indicator', few: ', # indicatori', other: ', # de indicatori' })}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-2">
          <p className="pb-2 text-xs text-muted-foreground">
            <Trans>
              Aceeași perioadă pentru {places.placeName}, județ și țară. Fiecare rând arată cum se calculează.
            </Trans>
          </p>
          {groups.map((group) => (
            <section key={group} aria-label={i18n._(DERIVED_GROUP_LABELS[group])}>
              <h4 className="-mx-4 border-y border-border/70 bg-muted/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {i18n._(DERIVED_GROUP_LABELS[group])}
              </h4>
              <ul className="-mx-4 divide-y divide-border/70">
                {rows
                  .filter((row) => row.def.group === group)
                  .map((row) => (
                    <DerivedLine key={row.def.id} row={row} places={places} />
                  ))}
              </ul>
            </section>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function DerivedLine({ row, places }: { readonly row: DerivedRow; readonly places: DerivedPlaces }) {
  const { i18n } = useLingui()
  const [open, setOpen] = useState(false)
  const receiptId = useId()
  const place = row.results.place
  const signed = isBalance(row.def)
  const label = i18n._(row.def.label)
  const reference = (scope: 'county' | 'country') => formatDerived(row.results[scope]?.value ?? null, { signed })
  const codes = [...new Set([...row.def.plus, ...(row.def.minus ?? [])].map((r) => r.code))].join(' · ')
  const countyReference = reference('county')
  const countryReference = reference('country')
  // The two reference columns: the county and Romania, or — where they are
  // no reference (green space) — the legal target in the first, the second
  // empty; the capital, whose county is itself, leaves the first empty.
  const norm = row.def.noReferences ? row.def.norm : undefined
  const columns = norm
    ? { county: formatDerived(norm.value), countyLabel: t`ținta legală`, country: '', countryLabel: '' }
    : {
        county: places.county ? (
          <>
            {countyReference}
            <ReferenceFlags result={row.results.county} />
          </>
        ) : (
          ''
        ),
        countyLabel: places.county ? (places.countyName ? t`jud. ${places.countyName}` : t`Județ`) : '',
        country: (
          <>
            {countryReference}
            <ReferenceFlags result={row.results.country} />
          </>
        ),
        countryLabel: t`România`,
      }

  return (
    <li>
      <div
        className={cn(
          'grid items-center gap-x-3 gap-y-0.5 px-4 py-2.5',
          "grid-cols-[minmax(0,1fr)_auto_2rem] [grid-template-areas:'name_value_action'_'meta_period_action'_'refs_spark_action']",
          "sm:grid-cols-[minmax(0,1fr)_6rem_7.5rem_5.5rem_5.5rem_2rem] sm:[grid-template-areas:'name_spark_value_county_country_action'_'meta_spark_period_countyl_countryl_action']",
        )}
      >
        <span className="min-w-0 text-sm font-medium text-foreground [grid-area:name]">{label}</span>
        <span className="min-w-0 truncate text-xs text-muted-foreground [grid-area:meta]">
          {i18n._(row.def.caption)}
          <span className="font-mono text-[11px]"> · {codes}</span>
        </span>
        <span className="flex items-center justify-end [grid-area:spark] sm:justify-center">
          <TerritoryDerivedTrend row={row} references={false} width={96} height={24} className="h-5 w-16 sm:h-6 sm:w-24" />
        </span>
        <span className="justify-self-end text-right text-sm font-semibold tabular-nums text-foreground [grid-area:value]">
          {place?.value == null ? (
            <span className="font-normal text-muted-foreground">—</span>
          ) : (
            <>
              {formatDerived(place.value, { signed })}{' '}
              <span className="text-xs font-normal text-muted-foreground">{i18n._(row.def.unit)}</span>
            </>
          )}
        </span>
        <span className="justify-self-end text-right text-xs tabular-nums text-muted-foreground [grid-area:period]">
          {place ? (place.value === null ? (place.missing ?? '—') : derivedYearsLabel(place)) : (row.missing ?? '—')}
          {place && place.value !== null ? <DerivedFlags result={place} /> : null}
        </span>
        {/* The references, from `sm`: each figure over its own label. */}
        <span className="hidden justify-self-end text-sm tabular-nums text-muted-foreground [grid-area:county] sm:block">
          {columns.county}
        </span>
        <span className="hidden justify-self-end text-sm tabular-nums text-muted-foreground [grid-area:country] sm:block">
          {columns.country}
        </span>
        <span className="hidden max-w-full justify-self-end truncate text-[11px] text-muted-foreground [grid-area:countyl] sm:block">
          {columns.countyLabel}
        </span>
        <span className="hidden justify-self-end text-[11px] text-muted-foreground [grid-area:countryl] sm:block">
          {columns.countryLabel}
        </span>
        {/* On a phone, one line under the rest. */}
        <span className="text-xs tabular-nums text-muted-foreground [grid-area:refs] sm:hidden">
          {norm ? (
            i18n._(norm.label)
          ) : places.county ? (
            <Trans>
              jud. {countyReference}
              <ReferenceFlags result={row.results.county} /> · RO {countryReference}
              <ReferenceFlags result={row.results.country} />
            </Trans>
          ) : (
            <Trans>
              RO {countryReference}
              <ReferenceFlags result={row.results.country} />
            </Trans>
          )}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={receiptId}
          aria-label={t`Cum se calculează: ${label}`}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-md text-muted-foreground transition-colors [grid-area:action] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      <div id={receiptId} hidden={!open} className="overflow-x-auto border-t border-border/50 bg-muted/20 px-4 py-3">
        {open ? <DerivedReceipt row={row} places={places} /> : null}
      </div>
    </li>
  )
}

/**
 * The flags INS put on a reference's inputs, as the page's superscript
 * markers (`ValueStatusMarker`, explained by the section's legend): a
 * provisional county or Romania is no settled reference.
 */
export function ReferenceFlags({ result }: { readonly result: DerivedResult | null | undefined }) {
  if (!result || result.value === null || result.flags.length === 0) return null
  return (
    <>
      {result.flags.map((flag) => (
        <ValueStatusMarker key={flag} status={flag} />
      ))}
    </>
  )
}

/**
 * The words a figure carries besides itself: few events, the flags INS put
 * on its inputs (a provisional input makes a provisional figure), zeros INS
 * did not publish.
 */
export function DerivedFlags({ result }: { readonly result: DerivedResult }) {
  return (
    <>
      {result.small ? (
        <span className="block">
          <span className="rounded-sm bg-amber-500/10 px-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            <Trans>Număr mic de evenimente</Trans>
          </span>
        </span>
      ) : null}
      {result.flags.length > 0 ? (
        <span className="block text-[11px] text-amber-800 dark:text-amber-300">
          {t`calculat din ${result.flags.map(describeValueStatus).join(', ')}`}
        </span>
      ) : null}
      {result.imputedYears > 0 ? (
        <span className="block text-[11px] text-muted-foreground">
          {plural(result.imputedYears, {
            one: 'un an fără valoare publicată, socotit zero',
            few: '# ani fără valoare publicată, socotiți zero',
            other: '# de ani fără valoare publicată, socotiți zero',
          })}
        </span>
      ) : null}
    </>
  )
}


/**
 * How a figure is computed: the formula, the cells it reads for the place,
 * its county and Romania, the population it divides by, the last year alone
 * for a window figure, the caveats, and the way back to each INS matrix.
 */
function DerivedReceipt({ row, places }: { readonly row: DerivedRow; readonly places: DerivedPlaces }) {
  const { i18n } = useLingui()
  const place = row.results.place
  const signed = isBalance(row.def)
  const scopeName = (scope: DerivedScope) =>
    scope === 'place' ? places.placeName : scope === 'county' ? (places.countyName ?? t`Județ`) : t`România`
  const inputs = [...row.def.plus, ...(row.def.minus ?? [])]
  const denominatorCode =
    row.def.denominator.kind === 'population-jul'
      ? 'POP108D'
      : row.def.denominator.kind === 'population-jan-next'
        ? 'POP107D'
        : row.def.denominator.read.code
  const codes = [...new Set([...inputs.map((r) => r.code), denominatorCode])]
  const years = place ? derivedYearsLabel(place) : ''
  const scopes: readonly DerivedScope[] = places.county ? ['place', 'county', 'country'] : ['place', 'country']
  // A year alone may have too few events for a rate: the reason, not a bare dash.
  const single = (result: DerivedResult | null) =>
    result?.value == null && result?.missing ? `— (${result.missing})` : formatDerived(result?.value ?? null, { signed })
  const singleReference = (result: DerivedResult | null) => (
    <>
      {single(result)}
      <ReferenceFlags result={result} />
    </>
  )

  return (
    <div className="space-y-3 text-xs text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">
          <Trans>Formula:</Trans>
        </span>{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{i18n._(row.def.formula)}</code>
        {place?.pooled ? (
          <>
            {' — '}
            <Trans>o rată anuală pe trei ani: suma evenimentelor împărțită la suma populațiilor.</Trans>
          </>
        ) : null}
      </p>
      <table className="w-full max-w-xl text-left tabular-nums">
        <caption className="sr-only">
          <Trans>Intrările calculului</Trans>
        </caption>
        <thead>
          <tr className="border-b border-border/70">
            <th scope="col" className="py-1 pr-3 font-medium">
              <Trans>Intrări, {years}</Trans>
            </th>
            {scopes.map((scope) => (
              <th key={scope} scope="col" className="py-1 pr-3 text-right font-medium">
                {scopeName(scope)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inputs.map((input, index) => (
            <tr key={`${input.code}-${index}`} className="border-b border-border/40">
              <th scope="row" className="py-1 pr-3 font-normal">
                {i18n._(row.def.parts[index]!)} ({input.code})
              </th>
              {scopes.map((scope) => {
                const value = row.results[scope]?.parts[index]
                return (
                  <td key={scope} className="py-1 pr-3 text-right">
                    {value === undefined ? '—' : formatDerivedCount(value)}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-1 pr-3 font-normal">
              {place ? denominatorLabel(row.def, place) : null}
            </th>
            {scopes.map((scope) => {
              const value = row.results[scope]?.denominatorValue
              return (
                <td key={scope} className="py-1 pr-3 text-right">
                  {value == null ? '—' : formatDerivedCount(value)}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
      {row.lastYear && row.year !== null ? (
        <div>
          <p>
            {places.county ? (
              <Trans>
                Doar {row.year}: {places.placeName} {single(row.lastYear.place)}, județul{' '}
                {singleReference(row.lastYear.county)}, România {singleReference(row.lastYear.country)}. Fereastra de
                trei ani netezește anii mici și întârzie o schimbare rapidă.
              </Trans>
            ) : (
              <Trans>
                Doar {row.year}: {places.placeName} {single(row.lastYear.place)}, România{' '}
                {singleReference(row.lastYear.country)}. Fereastra de trei ani netezește anii mici și întârzie o
                schimbare rapidă.
              </Trans>
            )}
          </p>
          {/* A year alone has a third of the events: its own flags, not the window's. */}
          {row.lastYear.place && row.lastYear.place.value !== null ? <DerivedFlags result={row.lastYear.place} /> : null}
        </div>
      ) : null}
      <p>{i18n._(row.def.caveat)}</p>
      {row.def.noReferences ? <p>{i18n._(row.def.noReferences)}</p> : null}
      {place && place.imputedYears > 0 ? (
        <p>
          <Trans>INS nu publică zerourile acestui tabel: anii fără valoare sunt socotiți zero.</Trans>
        </p>
      ) : null}
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        {codes.map((code) => (
          <a
            key={code}
            href={insTempoDatasetUrl(code, i18n.locale)}
            target="_blank"
            rel="noreferrer"
            aria-label={t`Matricea ${code} pe INS Tempo (se deschide într-un tab nou)`}
            className="inline-flex items-center gap-1 rounded-sm py-1 font-mono underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {code}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ))}
      </p>
    </div>
  )
}
