import { t } from '@lingui/core/macro'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HomeBand } from '@/features/procurement/components/home/home-chrome'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { PublicEnterprisePortfolioFilter, PublicEnterprisePortfolioSearch } from '@/schemas/public-enterprises'
import { activityCounts, countyCounts, filterRows, heldReasons, sortRows, type Disagreement, type DownLanes, type PortfolioRow } from '../../lib/authority-portfolio-model'
import { activityLabel, countyLabel, disagreementLede, heldNote, hiddenSortNote } from '../../lib/authority-portfolio-text'
import { cn } from '@/lib/utils'
import { displayName } from '../../lib/hub-format'
import { BandColumns, BandNote } from '../hub/hub-parts'
import { CountRows, DisagreementList, PortfolioTable } from './authority-parts'

/**
 * The portfolio's bands, one question each: the enterprises themselves (a
 * table, its order and filter in the address), where the two sources part,
 * what they do and where.
 */

type Search = Required<PublicEnterprisePortfolioSearch>

/** Every enterprise in one table, filtered by ANAF's list's word and sorted by any figure; why a value is held, under it. */
export function EnterprisesBand({
  index,
  rows,
  year,
  authorityCui,
  down,
  search,
  onSearch,
  locale,
}: {
  readonly index: string
  readonly rows: readonly PortfolioRow[]
  readonly year: number
  readonly authorityCui: string
  readonly down: DownLanes
  readonly search: Search
  readonly onSearch: (patch: Partial<Search>) => void
  readonly locale: string
}) {
  const count = (filter: PublicEnterprisePortfolioFilter) => filterRows(rows, filter, authorityCui, down).length
  // No counts: the panel beside the head says them. Each label its own message: a bare „Active" is another page's.
  // A choice with no rows is left out unless the address asked for it.
  const options = [
    { key: 'toate' as const, label: t({ message: 'Toate', context: 'portfolio rows by ANAF list' }) },
    { key: 'active' as const, label: t({ message: 'Active', context: 'portfolio rows by ANAF list' }) },
    { key: 'inactive' as const, label: t({ message: 'Inactive', context: 'portfolio rows by ANAF list' }) },
    { key: 'altele' as const, label: t({ message: 'Altele', context: 'portfolio rows by ANAF list' }) },
  ].filter((option) => option.key === 'toate' || count(option.key) > 0 || option.key === search.lista)
  const shown = sortRows(filterRows(rows, search.lista, authorityCui, down), search.ordine)
  // The headcount column shows from `sm`, the net result's from `lg`: below, an order by one of them says itself.
  const sortNote = hiddenSortNote(search.ordine, year)
  const reasons = heldReasons(shown, ['turnover', 'employees', 'net'])
  return (
    <HomeBand id="intreprinderi" labelledBy="authority-enterprises-title">
      <HubSectionHead
        titleId="authority-enterprises-title"
        index={index}
        title={t`Toate întreprinderile`}
        lede={t`Cuvântul listei ANAF, apoi cifrele admise din bilanțurile pe ${year}. Ce spun celelalte surse, când nu e „în funcțiune”, stă sub nume.`}
      />
      <div className="mt-8" data-reveal>
        {options.length > 2 ? (
          <IndicatorToggle label={t`După lista ANAF`} options={options} value={search.lista} onChange={(lista) => onSearch({ lista })} className="mb-4" />
        ) : null}
        {sortNote ? <p className={cn('mb-3 text-xs text-muted-foreground', search.ordine === 'salariati' ? 'sm:hidden' : 'lg:hidden')}>{sortNote}</p> : null}
        {shown.length > 0 ? (
          <PortfolioTable
            key={search.lista}
            rows={shown}
            sort={search.ordine}
            onSort={(ordine) => onSearch({ ordine })}
            year={year}
            authorityCui={authorityCui}
            down={down}
            caption={t`Întreprinderile autorității, cu cifrele din ${year}`}
            locale={locale}
          />
        ) : (
          <p className="border-y border-border/70 py-4 text-sm text-muted-foreground">{t`Niciuna.`}</p>
        )}
        {reasons.size > 0 ? <BandNote>{heldNote(reasons)}</BandNote> : null}
      </div>
    </HomeBand>
  )
}

export function SourcesBand({ index, parts, locale }: { readonly index: string; readonly parts: readonly Disagreement[]; readonly locale: string }) {
  return (
    <HomeBand id="surse" labelledBy="authority-sources-title">
      <BandColumns titleId="authority-sources-title" index={index} title={t`Unde sursele nu se potrivesc`} lede={disagreementLede(parts, locale)}>
        <DisagreementList parts={parts} />
      </BandColumns>
    </HomeBand>
  )
}

/** What they do, by main activity, and where their seats are, when they are in more than one county. */
export function PlacesBand({ index, rows, locale }: { readonly index: string; readonly rows: readonly PortfolioRow[]; readonly locale: string }) {
  const byCounty = countyCounts(rows)
  const only = byCounty.length === 1 ? byCounty[0]!.key : null
  const lede = only
    ? t`După activitatea principală din fișa ANAF. Toate au sediul în ${displayName(only)}.`
    : t`După activitatea principală din fișa ANAF și județul sediului, din registrul comerțului.`
  return (
    <HomeBand id="domenii" labelledBy="authority-places-title">
      <BandColumns titleId="authority-places-title" index={index} title={t`Ce fac și unde sunt`} lede={lede}>
        <MonoLabel className="block pb-2 text-muted-foreground">{t`Activitatea principală`}</MonoLabel>
        <CountRows counts={activityCounts(rows)} label={activityLabel} locale={locale} />
        {only ? null : (
          <>
            <MonoLabel className="mt-8 block pb-2 text-muted-foreground">{t`Județul sediului`}</MonoLabel>
            <CountRows counts={byCounty} label={countyLabel} locale={locale} />
          </>
        )}
      </BandColumns>
    </HomeBand>
  )
}
