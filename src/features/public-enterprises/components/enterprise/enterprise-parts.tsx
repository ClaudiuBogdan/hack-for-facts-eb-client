import { useId, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowUpRight } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { CompanyProfileModel, StatusKind } from '@/features/private-companies/lib/company-profile-model'
import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import { statusText } from '@/features/private-companies/lib/company-profile-text'
import { cn } from '@/lib/utils'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import {
  amepipFormYears,
  amepipRuns,
  amepipYears,
  displayValue,
  isFunctioning,
  isLaneDown,
  isPercentUnit,
  laneOf,
  s1001State,
  shownKind,
  valueIn,
  type ControlGroup,
  type ControlRow,
  type IndicatorGroupKey,
  type IndicatorRow,
  type IndicatorTable,
} from '../../lib/enterprise-model'
import { groupLabel, kindLabel, levelLabel, listDateText, originMark, peersText, s1001Word, shownName, sourceLabel, type ShownName } from '../../lib/enterprise-text'
import { hasPortfolio } from '../../lib/authority-portfolio-links'
import { displayName, formatDate } from '../../lib/hub-format'
import { TEXT_LINK } from './enterprise-links'

/**
 * The enterprise page's parts: the head's chips, the control rows, the
 * status table, AMEPIP's tables and board panel. Every value keeps its
 * source; none is merged with another source's.
 */

export const LIST = 'divide-y divide-border/70 border-y border-border/70'

// ──────────────────────────────────────────────────────────── links ──

// The way back and the links that leave live in a light file, so a route's eager not-found page can use them.
export { Kicker, OutLink, TEXT_LINK } from './enterprise-links'

// ──────────────────────────────────────────────────────────── chips ──

const TONE: Readonly<Record<StatusKind, string>> = {
  active: 'bg-emerald-500',
  insolvency: 'bg-amber-500',
  dissolution: 'bg-amber-500',
  'struck-off': 'bg-destructive',
  other: 'bg-muted-foreground',
  conflict: 'bg-amber-500',
  unqualified: 'bg-muted-foreground',
}

function Chip({ tone, children, title }: { readonly tone: string; readonly children: ReactNode; readonly title?: string }) {
  return (
    <li className="inline-flex max-w-full items-center gap-1.5 border px-2.5 py-1 text-xs text-foreground" title={title}>
      <span className={cn('size-1.5 shrink-0 rounded-full', tone)} aria-hidden="true" />
      <span className="truncate">{children}</span>
    </li>
  )
}

/** The trade registry's status in a chip: „stări diferite" rather than „stări diferite în registru" after its own name. */
function registryChipText(model: CompanyProfileModel): string {
  return model.status.kind === 'conflict' ? t`stări diferite` : statusText(model).toLocaleLowerCase('ro-RO')
}

/**
 * One chip per source that says something of the enterprise's status, never
 * one merged status: ANAF's list, AMEPIP's newest year when it is not „in
 * business", the trade registry (when the company record was read) and
 * ANAF's inactive taxpayers.
 */
export function StatusChips({ read, model, company }: { readonly read: PublicEnterpriseRead; readonly model: CompanyProfileModel | null; readonly company: 'ready' | 'none' | 'unread' }) {
  const list = s1001State(read.profile)
  const years = amepipYears(read.profile)
  const last = years[years.length - 1] ?? null
  const listWord = s1001Word(list.raw)
  return (
    <ul className="flex flex-wrap gap-2">
      {list.listed ? (
        <Chip tone={list.raw?.trim().toUpperCase() === 'ACTIV' ? 'bg-emerald-500' : 'bg-amber-500'}>{t`Lista ANAF: ${listWord}`}</Chip>
      ) : isLaneDown(read.profile, 's1001') ? (
        <Chip tone="bg-muted-foreground">{t`Lista ANAF nu e încărcată acum`}</Chip>
      ) : (
        <Chip tone="bg-muted-foreground">{t`Nu e în lista ANAF`}</Chip>
      )}
      {last && !isFunctioning(last.status) ? (
        <Chip tone="bg-amber-500" title={last.status ?? undefined}>
          {last.status ? t`AMEPIP ${last.year}: ${last.status}` : t`AMEPIP ${last.year}: fără stare`}
        </Chip>
      ) : null}
      {model ? <Chip tone={TONE[model.status.kind]}>{t`Registrul comerțului: ${registryChipText(model)}`}</Chip> : null}
      {company === 'none' ? <Chip tone="bg-muted-foreground">{t`Fără fișă de firmă`}</Chip> : null}
      {model?.profile.fiscal.inactive ? <li className="inline-flex items-center border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive">{t`Inactivă fiscal la ANAF`}</li> : null}
    </ul>
  )
}

// ────────────────────────────────────────────────────────── control ──

/** An authority's name: its budget page when it has one; a name its source did not give says where it came from; a bare CUI is muted. */
function AuthorityName({ row, shown, linked, className }: { readonly row: ControlRow; readonly shown: ShownName; readonly linked: boolean; readonly className?: string }) {
  const mark = originMark(shown)
  const body = (
    <>
      <span className={cn(shown.origin === 'none' && 'font-normal text-muted-foreground')}>{shown.name}</span>
      {mark ? <span className="ml-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">{mark}</span> : null}
    </>
  )
  return linked && row.authorityCui && row.hasBudget ? (
    <Link to="/entities/$cui" params={{ cui: row.authorityCui }} preload="intent" className={cn(TEXT_LINK, 'min-h-11 sm:min-h-0', className)}>
      {body}
    </Link>
  ) : (
    <span className={className}>{body}</span>
  )
}

/** Level, the local authority's kind, how many enterprises the lists give it. The enterprise's status in the list is the chips' and the status band's. */
function groupCaption(group: ControlGroup, locale: string): string {
  const first = group.rows[0]!
  const s1001 = group.rows.find((row) => row.source === 's1001')
  const kind = shownKind(first)
  const parts = [levelLabel(s1001?.level ?? first.level), kind ? kindLabel(kind) : null, first.peers ? peersText(first.peers.total, locale) : null]
  return parts.filter((part): part is string => part !== null).join(' · ')
}

const NAME_CLASS = 'mt-1.5 flex items-center text-base font-medium text-foreground sm:block'

/**
 * Each authority the sources name: two sources naming the same CUI share one
 * row, each source above it; when they spell it differently, each spelling
 * under its own source. Naming different CUIs, two rows.
 */
export function ControlList({ groups, read, locale }: { readonly groups: readonly ControlGroup[]; readonly read: PublicEnterpriseRead; readonly locale: string }) {
  const listDate = listDateText(read, locale)
  const label = (row: ControlRow) => (row.source === 's1001' && listDate ? `${sourceLabel(row.source)} · ${listDate}` : sourceLabel(row.source))
  return (
    <ul className={LIST}>
      {groups.map((group) => {
        const spellings = new Set(group.rows.flatMap((row) => (row.name ? [displayName(row.name)] : [])))
        // One heading for the sources only when each gives the same spelling: a source that gave none, or another, gets its own line.
        // When no source gave a name, one heading and the credited fallback (the budget record's name, or the CUI), said once.
        const apart = group.rows.length > 1 && spellings.size > 0 && (spellings.size > 1 || group.rows.some((row) => !row.name))
        // The budget page is linked from the line that carries a name.
        const linkedKey = group.rows.find((row) => row.name)?.key ?? group.rows[0]!.key
        return (
          <li key={group.key} className="px-1 py-3.5">
            {apart ? (
              group.rows.map((row, index) => (
                <div key={row.key} className={cn(index > 0 && 'mt-2')}>
                  <MonoLabel className="block text-muted-foreground">{label(row)}</MonoLabel>
                  {row.name ? (
                    <AuthorityName row={row} shown={shownName(row, [])} linked={row.key === linkedKey} className={NAME_CLASS} />
                  ) : (
                    <span className={cn(NAME_CLASS, 'font-normal text-muted-foreground')}>{t`fără nume în această sursă`}</span>
                  )}
                </div>
              ))
            ) : (
              <>
                <MonoLabel className="block text-muted-foreground">{group.rows.map(label).join(' · ')}</MonoLabel>
                <AuthorityName row={group.rows[0]!} shown={shownName(group.rows[0]!, group.rows)} linked className={NAME_CLASS} />
              </>
            )}
            <MonoLabel className="mt-1 block text-muted-foreground">{groupCaption(group, locale)}</MonoLabel>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The authority's other enterprises, as the live lists give them, then its
 * portfolio: every one with its status and figures. The portfolio is linked
 * only when the snapshot holds it (a link to any other would answer 404) and
 * the authority has more than this one, or the lists could not be read.
 */
export function PeerList({ row, limit = 8 }: { readonly row: ControlRow; readonly limit?: number }) {
  const others = row.peers?.others ?? []
  const portfolio = hasPortfolio(row.authorityCui) && (row.peers === null || row.peers.total > 1) ? row.authorityCui : null
  if (others.length === 0 && !portfolio) return null
  const shown = others.slice(0, limit)
  const rest = row.peers ? others.length - shown.length + Math.max(row.peers.total - 1 - others.length, 0) : 0
  return (
    <div className="mt-3">
      {shown.length > 0 ? (
        <>
          <MonoLabel className="block text-muted-foreground">{t`Aceeași autoritate mai are`}</MonoLabel>
          <ul className="mt-1 flex flex-wrap gap-x-4 text-sm sm:mt-2 sm:gap-y-1.5">
            {shown.map((peer) => (
              <li key={peer.cui}>
                <Link to="/public-enterprises/$cui" params={{ cui: peer.cui }} preload="intent" className={cn(TEXT_LINK, 'inline-flex min-h-11 items-center text-foreground sm:min-h-0')}>
                  {peer.name ? displayName(peer.name) : <span className="text-muted-foreground">{t`Întreprinderea cu CUI ${peer.cui}`}</span>}
                </Link>
              </li>
            ))}
            {rest > 0 ? <li className="inline-flex min-h-11 items-center text-muted-foreground sm:min-h-0">{t`și încă ${rest}`}</li> : null}
          </ul>
        </>
      ) : null}
      {portfolio ? (
        <Link
          to="/public-enterprises/authorities/$cui"
          params={{ cui: portfolio }}
          preload="intent"
          className={cn(TEXT_LINK, 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground sm:mt-2 sm:min-h-0')}
        >
          {t`Toate întreprinderile autorității, cu starea și cifrele lor`}
          <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────── status ──

/** Each source's word on the enterprise's status, in its own row, with its date. */
export function StatusTable({
  read,
  model,
  company,
  locale,
}: {
  readonly read: PublicEnterpriseRead
  readonly model: CompanyProfileModel | null
  readonly company: 'ready' | 'none' | 'unread'
  readonly locale: string
}) {
  const list = s1001State(read.profile)
  const years = amepipYears(read.profile)
  const formYears = amepipFormYears(read.profile)
  const amepipDate = formatDate(laneOf(read.profile, 'amepip')?.sourceLastModifiedAt ?? null, locale)
  const muted = (text: string) => <span className="text-muted-foreground">{text}</span>
  const registry = model ? statusText(model) : company === 'none' ? muted(t`fără fișă de firmă`) : muted(t`nu s-a putut citi acum`)
  const fiscal = !model
    ? muted(company === 'none' ? t`fără fișă de firmă` : t`nu s-a putut citi acum`)
    : model.profile.fiscal.inactive === null
      ? muted(t`nu se știe`)
      : model.profile.fiscal.inactive
        ? t`declarată inactivă`
        : t`nu e declarată inactivă`
  const rows: readonly {
    readonly key: string
    readonly source: string
    readonly date: string | null
    readonly value: ReactNode
  }[] = [
    {
      key: 's1001',
      source: t`Lista ANAF`,
      date: listDateText(read, locale),
      value: list.listed ? s1001Word(list.raw) : isLaneDown(read.profile, 's1001') ? muted(t`lista nu e încărcată acum`) : muted(t`nu e în listă`),
    },
    {
      key: 'amepip',
      source: t`Registrul AMEPIP`,
      date: amepipDate,
      value:
        isLaneDown(read.profile, 'amepip') && years.length === 0 ? (
          muted(t`registrul nu e încărcat acum`)
        ) : years.length > 0 ? (
          <ol className="space-y-1">
            {amepipRuns(years).map((run) => (
              <li key={run.from} className={cn(!isFunctioning(run.status) && 'text-amber-900 dark:text-amber-200')}>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{run.from === run.to ? run.from : `${run.from}–${run.to}`}</span> {run.status ?? t`fără stare`}
              </li>
            ))}
          </ol>
        ) : formYears.length > 0 ? (
          muted(t`nicio stare în registru; formular pe ${yearRanges(formYears)}`)
        ) : (
          muted(t`niciun an în registru`)
        ),
    },
    {
      key: 'onrc',
      source: t`Registrul comerțului`,
      date: null,
      value: registry,
    },
    {
      key: 'anaf',
      source: t`ANAF, contribuabili inactivi`,
      date: null,
      value: fiscal,
    },
  ]
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t`Starea întreprinderii, după fiecare sursă`}</caption>
      <tbody className={LIST}>
        {rows.map((row) => (
          <tr key={row.key} className="align-top">
            <th scope="row" className="w-36 py-3 pr-4 text-left font-normal sm:w-56">
              <span className="block text-foreground">{row.source}</span>
              {row.date ? <MonoLabel className="mt-0.5 block text-muted-foreground">{row.date}</MonoLabel> : null}
            </th>
            <td className="py-3 text-foreground">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─────────────────────────────────────────────────────── indicators ──

/**
 * A unit as AMEPIP writes it. A „%" whose scale was not checked is amber, and
 * says so in words too (a title, and text for a screen reader), not by colour
 * alone.
 */
function Unit({ row }: { readonly row: IndicatorRow }) {
  const unchecked = isPercentUnit(row.unit) && !row.fraction
  if (!unchecked) return <>{row.unit ?? '—'}</>
  const why = t`scara nu e spusă de sursă`
  return (
    <span className="text-amber-800 dark:text-amber-300" title={why}>
      {row.unit}
      <span className="sr-only"> ({why})</span>
    </span>
  )
}

/** The rows by their group, in the table's order: the form's sections. */
function groupsOf(rows: readonly IndicatorRow[]): readonly {
  readonly group: IndicatorGroupKey
  readonly rows: readonly IndicatorRow[]
}[] {
  const groups: { group: IndicatorGroupKey; rows: IndicatorRow[] }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.group === row.group) last.rows.push(row)
    else groups.push({ group: row.group, rows: [row] })
  }
  return groups
}

/** One of AMEPIP's sheets: KPI rows, year columns, the unit beside the name; an empty cell is a dash. */
export function IndicatorTableView({
  table,
  title,
  caption,
  locale,
  grouped = false,
}: {
  readonly table: IndicatorTable
  /** The visible title above the table: the scroll box's name. */
  readonly title: string
  /** The table's own caption, for a screen reader's table navigation. */
  readonly caption: string
  readonly locale: string
  readonly grouped?: boolean
}) {
  const titleId = useId()
  return (
    <>
      <MonoLabel id={titleId} className="block text-muted-foreground">
        {title}
      </MonoLabel>
      {/* A wide table scrolls in its own box on a phone: the box takes the focus, so a keyboard can scroll it; its name is the title above. */}
      <div className="mt-3 overflow-x-auto" role="region" aria-labelledby={titleId} tabIndex={0}>
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 pr-4 text-left">
                <MonoLabel className="text-muted-foreground">{t`Indicator`}</MonoLabel>
              </th>
              <th scope="col" className="py-2 pr-4 text-left">
                <MonoLabel className="text-muted-foreground">{t`Unitate`}</MonoLabel>
              </th>
              {table.years.map((year) => (
                <th key={year} scope="col" className="py-2 pl-3 text-right">
                  <MonoLabel className="tabular-nums text-muted-foreground">{year}</MonoLabel>
                </th>
              ))}
            </tr>
          </thead>
          {(grouped ? groupsOf(table.rows) : [{ group: null, rows: table.rows }]).map(({ group, rows }) => (
            <tbody key={group ?? 'all'}>
              {group ? (
                <tr>
                  <th scope="rowgroup" colSpan={table.years.length + 2} className="pb-1 pt-5 text-left">
                    <MonoLabel className="text-primary">{groupLabel(group)}</MonoLabel>
                  </th>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.code} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-foreground">
                    {row.name}
                    <span className="ml-1.5 font-mono text-[0.625rem] text-muted-foreground">{row.code}</span>
                  </th>
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-muted-foreground">
                    <Unit row={row} />
                  </td>
                  {table.years.map((year) => {
                    const value = valueIn(row, year)
                    return (
                      <td key={year} className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-foreground">
                        {value === null ? <span className="text-muted-foreground">—</span> : displayValue(row, value, locale)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  )
}

/** A few of one year's answers, each with its unit, as the table writes them. */
export function IndicatorFacts({ rows, year, locale }: { readonly rows: readonly IndicatorRow[]; readonly year: number; readonly locale: string }) {
  return (
    <dl className={LIST}>
      {rows.map((row) => {
        const value = valueIn(row, year)
        return (
          <div key={row.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 px-1 py-2.5">
            <dt className="text-sm text-foreground">{row.name}</dt>
            <dd className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
              {value === null ? <span className="font-normal text-muted-foreground">—</span> : displayValue(row, value, locale)}
              {value !== null && row.unit ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  <Unit row={row} />
                </span>
              ) : null}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
