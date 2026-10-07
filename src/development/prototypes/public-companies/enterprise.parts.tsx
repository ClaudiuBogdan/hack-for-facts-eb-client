import { Fragment, type ReactNode } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { displayName, formatCount, formatDate, s1001ListDate } from '@/features/public-enterprises/lib/hub-format'
import { statusText } from '@/features/private-companies/lib/company-profile-text'
import type { CompanyProfileModel, StatusKind } from '@/features/private-companies/lib/company-profile-model'
import { cn } from '@/lib/utils'
import type { EnterpriseRead, SeapCounts } from './enterprise.data'
import { SEAP_SPAN } from './enterprise.data'
import {
  SAMPLES,
  amepipRuns,
  amepipYears,
  displayValue,
  isFunctioning,
  isPercentUnit,
  laneOf,
  rowValues,
  s1001State,
  shownKind,
  type ControlGroup,
  type ControlRow,
  type IndicatorTable,
} from './enterprise.model'
import { authorityText, groupLabel, kindLabel, levelLabel, peersText, s1001Word, sourceLabel } from './enterprise.text'

/**
 * The enterprise page prototype's parts: the sample picker, the head's
 * chips, the control rows, the status table, AMEPIP's tables and the public
 * money rows. Every value is shown with its source; none is merged.
 */

export const LIST = 'divide-y divide-border/70 border-y border-border/70'
const LINK = 'underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// ─────────────────────────────────────────────────────────── sample ──

/** The enterprise a variant draws: `?cui=` from the harness URL, Tursib by default. */
export function useEnterpriseCui(): string {
  const search = useSearch({ strict: false }) as { readonly cui?: unknown }
  const cui = typeof search.cui === 'string' || typeof search.cui === 'number' ? String(search.cui).trim() : ''
  return /^\d{2,10}$/u.test(cui) ? cui : '789401'
}

/** A link to another enterprise's page: in the prototype, the same variant with its CUI. */
export function EnterpriseLink({ cui, className, children }: { readonly cui: string; readonly className?: string; readonly children: ReactNode }) {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  return (
    <Link to="." search={{ ...search, cui }} hash="" className={className}>
      {children}
    </Link>
  )
}

/** A dev-only row to switch the enterprise, above each variant. */
export function SamplePicker() {
  const current = useEnterpriseCui()
  return (
    <div className="flex flex-wrap gap-1.5 border-b bg-muted/30 px-4 py-2 text-xs">
      {SAMPLES.map((sample) => (
        <EnterpriseLink
          key={sample.cui}
          cui={sample.cui}
          className={cn('rounded-sm border px-2 py-0.5', sample.cui === current ? 'border-foreground bg-foreground text-background' : 'bg-background')}
        >
          <span title={sample.note}>{sample.label}</span>
        </EnterpriseLink>
      ))}
    </div>
  )
}

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

/** One chip per source that says something about its status: never one merged status. */
export function StatusChips({ read, model }: { readonly read: EnterpriseRead; readonly model: CompanyProfileModel | null }) {
  const list = s1001State(read.profile)
  const years = amepipYears(read.profile)
  const last = years[years.length - 1] ?? null
  const listWord = s1001Word(list.raw)
  return (
    <ul className="flex flex-wrap gap-2">
      {list.listed ? (
        <Chip tone={list.raw?.toUpperCase() === 'ACTIV' ? 'bg-emerald-500' : 'bg-amber-500'}>{t`Lista ANAF: ${listWord}`}</Chip>
      ) : (
        <Chip tone="bg-muted-foreground">{t`Nu e în lista ANAF`}</Chip>
      )}
      {last && !isFunctioning(last.status) ? (
        <Chip tone="bg-amber-500" title={last.status ?? undefined}>
          {t`AMEPIP ${last.year}: ${last.status ?? t`fără stare`}`}
        </Chip>
      ) : null}
      {model ? (
        <Chip tone={TONE[model.status.kind]}>{t`Registrul comerțului: ${model.status.kind === 'conflict' ? t`stări diferite` : statusText(model).toLocaleLowerCase('ro-RO')}`}</Chip>
      ) : (
        <Chip tone="bg-muted-foreground">{t`Fără fișă de firmă`}</Chip>
      )}
      {model?.profile.fiscal.inactive ? (
        <li className="inline-flex items-center border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive">{t`Inactivă fiscal la ANAF`}</li>
      ) : null}
    </ul>
  )
}

// ────────────────────────────────────────────────────────── control ──

/** The authority's name: its budget page when it has one, plain text otherwise. */
function AuthorityName({ row, className }: { readonly row: ControlRow; readonly className?: string }) {
  const { name, borrowed } = authorityText(row)
  const body = (
    <>
      {name}
      {borrowed ? <span className="ml-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">{t`nume din buget`}</span> : null}
    </>
  )
  return row.authorityCui && row.hasBudget ? (
    <Link to="/entities/$cui" params={{ cui: row.authorityCui }} preload="intent" className={cn(LINK, className)}>
      {body}
    </Link>
  ) : (
    <span className={className}>{body}</span>
  )
}

function groupCaption(group: ControlGroup, locale: string): string {
  const first = group.rows[0]!
  const s1001 = group.rows.find((row) => row.source === 's1001')
  const kind = shownKind(first)
  const parts = [levelLabel(s1001?.level ?? first.level), kind ? kindLabel(kind) : null]
  if (s1001) parts.push(t`${s1001Word(s1001.statusInList)} în lista ANAF`)
  if (first.peers) parts.push(peersText(first.peers.total, locale))
  return parts.filter((part): part is string => part !== null).join(' · ')
}

/**
 * Each authority the sources name, the sources above it: two sources naming
 * the same CUI share one row; naming different ones, two rows. The name is
 * ANAF's list's where it gives one.
 */
export function ControlList({ groups, read, locale, compact = false }: { readonly groups: readonly ControlGroup[]; readonly read: EnterpriseRead; readonly locale: string; readonly compact?: boolean }) {
  const listDate = formatDate(s1001ListDate(laneOf(read.profile, 's1001')?.sourceUrl ?? null), locale)
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{read.profile?.isCurrentMember ? t`Nicio listă nu-i numește autoritatea.` : t`Nu mai apare în nicio listă.`}</p>
  }
  return (
    <ul className={LIST}>
      {groups.map((group) => (
        <li key={group.key} className={cn('px-1', compact ? 'py-2.5' : 'py-3.5')}>
          <MonoLabel className="block text-muted-foreground">
            {group.rows.map((row) => (row.source === 's1001' && listDate ? `${sourceLabel(row.source)} · ${listDate}` : sourceLabel(row.source))).join(' · ')}
          </MonoLabel>
          <AuthorityName row={group.rows[0]!} className={cn('mt-1.5 block font-medium text-foreground', compact ? 'text-sm' : 'text-base')} />
          <MonoLabel className="mt-1 block text-muted-foreground">{groupCaption(group, locale)}</MonoLabel>
        </li>
      ))}
    </ul>
  )
}

/** The other enterprises one authority has in the lists, by name, each to its page. */
export function PeerList({ row, limit = 8 }: { readonly row: ControlRow; readonly limit?: number }) {
  if (!row.peers || row.peers.others.length === 0) return null
  const shown = row.peers.others.slice(0, limit)
  const rest = row.peers.total - 1 - shown.length
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
      {shown.map((peer) => (
        <li key={peer.cui}>
          <EnterpriseLink cui={peer.cui} className={cn(LINK, 'text-foreground')}>
            {peer.name ? displayName(peer.name) : peer.cui}
          </EnterpriseLink>
        </li>
      ))}
      {rest > 0 ? <li className="text-muted-foreground">{t`și încă ${rest}`}</li> : null}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────── status ──

/** Each source's word on the enterprise's status, in its own row, with its date. */
export function StatusTable({ read, model, locale }: { readonly read: EnterpriseRead; readonly model: CompanyProfileModel | null; readonly locale: string }) {
  const list = s1001State(read.profile)
  const years = amepipYears(read.profile)
  const listDate = formatDate(s1001ListDate(laneOf(read.profile, 's1001')?.sourceUrl ?? null), locale)
  const amepipDate = formatDate(laneOf(read.profile, 'amepip')?.sourceLastModifiedAt ?? null, locale)
  const rows: { key: string; source: string; date: string | null; value: ReactNode }[] = [
    { key: 's1001', source: t`Lista ANAF`, date: listDate, value: list.listed ? s1001Word(list.raw) : <span className="text-muted-foreground">{t`nu e în listă`}</span> },
    {
      key: 'amepip',
      source: t`Registrul AMEPIP`,
      date: amepipDate,
      value:
        years.length > 0 ? (
          <ol className="space-y-1">
            {amepipRuns(years).map((run) => (
              <li key={run.from} className={cn(!isFunctioning(run.status) && 'text-amber-900 dark:text-amber-200')}>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{run.from === run.to ? run.from : `${run.from}–${run.to}`}</span>{' '}
                {run.status ?? t`fără stare`}
              </li>
            ))}
          </ol>
        ) : (
          <span className="text-muted-foreground">{t`niciun an în registru`}</span>
        ),
    },
    { key: 'onrc', source: t`Registrul comerțului`, date: null, value: model ? statusText(model) : <span className="text-muted-foreground">{t`fără fișă de firmă`}</span> },
    {
      key: 'anaf',
      source: t`ANAF, contribuabili inactivi`,
      date: null,
      value: !model || model.profile.fiscal.inactive === null ? <span className="text-muted-foreground">{t`nu se știe`}</span> : model.profile.fiscal.inactive ? t`declarată inactivă` : t`nu e declarată inactivă`,
    },
  ]
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t`Starea întreprinderii, după fiecare sursă`}</caption>
      <tbody className={LIST}>
        {rows.map((row) => (
          <tr key={row.key} className="align-top">
            <th scope="row" className="w-40 py-3 pr-4 text-left font-normal sm:w-56">
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

/** One of AMEPIP's sheets as written: KPI rows, year columns, the unit beside the name, an empty cell a dash. */
export function IndicatorTableView({ table, caption, locale, grouped = false }: { readonly table: IndicatorTable; readonly caption: string; readonly locale: string; readonly grouped?: boolean }) {
  let lastGroup: string | null = null
  return (
    <div className="overflow-x-auto">
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
        <tbody>
          {table.rows.map((row) => {
            const header = grouped && row.group !== lastGroup
            lastGroup = row.group
            return (
              <Fragment key={row.code}>
                {header ? (
                  <tr>
                    <th scope="colgroup" colSpan={table.years.length + 2} className="pb-1 pt-5 text-left">
                      <MonoLabel className="text-primary">{groupLabel(row.group)}</MonoLabel>
                    </th>
                  </tr>
                ) : null}
                <tr className="border-b border-border/60 align-top">
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-foreground">
                    {row.name}
                    <span className="ml-1.5 font-mono text-[0.625rem] text-muted-foreground">{row.code}</span>
                  </th>
                  <td className={cn('whitespace-nowrap py-2 pr-4 text-xs', isPercentUnit(row.unit) && !row.fraction ? 'text-amber-800 dark:text-amber-300' : 'text-muted-foreground')}>{row.unit ?? '—'}</td>
                  {rowValues(row, table.years).map((value, index) => (
                    <td key={table.years[index]} className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-foreground">
                      {value === null ? <span className="text-muted-foreground">—</span> : displayValue(row, value, locale)}
                    </td>
                  ))}
                </tr>
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── money ──

function CountRow({ label, value, locale }: { readonly label: string; readonly value: number | null; readonly locale: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4 px-1 py-2.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value === null ? '—' : formatCount(value, locale)}</span>
    </li>
  )
}

function PageLink({ children, to, cui }: { readonly children: ReactNode; readonly to: '/procurement/institutions/$cui' | '/procurement/suppliers/$cui' | '/companies/$cui'; readonly cui: string }) {
  return (
    <Link to={to} params={{ cui }} preload="intent" className={cn(LINK, 'mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground sm:min-h-0')}>
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

/** SEAP as buyer and as seller: counts only, each side to its own page. */
export function MoneyColumns({ cui, seap, locale }: { readonly cui: string; readonly seap: SeapCounts; readonly locale: string }) {
  const buys = (seap.buyerDirect ?? 0) + (seap.buyerAwards ?? 0) > 0
  const sells = (seap.sellerDirect ?? 0) + (seap.sellerAwards ?? 0) > 0
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <div>
        <MonoLabel className="block text-muted-foreground">{t`Cumpără, ${SEAP_SPAN.from}–${SEAP_SPAN.to}`}</MonoLabel>
        <ul className={cn(LIST, 'mt-3')}>
          <CountRow label={t`Achiziții directe`} value={seap.buyerDirect} locale={locale} />
          <CountRow label={t`Contracte atribuite prin proceduri`} value={seap.buyerAwards} locale={locale} />
        </ul>
        {buys ? <PageLink to="/procurement/institutions/$cui" cui={cui}>{t`Ce cumpără și de la cine`}</PageLink> : null}
      </div>
      <div>
        <MonoLabel className="block text-muted-foreground">{t`Vinde instituțiilor, ${SEAP_SPAN.from}–${SEAP_SPAN.to}`}</MonoLabel>
        <ul className={cn(LIST, 'mt-3')}>
          <CountRow label={t`Achiziții directe`} value={seap.sellerDirect} locale={locale} />
          <CountRow label={t`Contracte câștigate`} value={seap.sellerAwards} locale={locale} />
        </ul>
        {sells ? <PageLink to="/procurement/suppliers/$cui" cui={cui}>{t`Ce vinde și cui`}</PageLink> : null}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── head ──

/** The way back: the front door, then the enterprise's county as the company page names it. */
export function Kicker({ county }: { readonly county: string | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]">
      <Link to="/public-enterprises" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>{t`Întreprinderi publice`}</span>
      </Link>
      {county ? (
        <>
          <span aria-hidden="true">/</span>
          <span>{county}</span>
        </>
      ) : null}
    </MonoLabel>
  )
}

export function CompanyPageLink({ cui }: { readonly cui: string }) {
  return (
    <Link to="/companies/$cui" params={{ cui }} preload="intent" className={cn(LINK, 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground sm:min-h-0')}>
      {t`Pagina firmei`}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}
