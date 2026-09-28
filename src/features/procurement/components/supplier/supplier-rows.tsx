import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { contractsCount, countText, dayText, directPurchasesCount, moneyText, percentText } from '../../lib/home-format'
import type { RecentRecord } from '../../lib/home-model'
import { clientName, type ClientRanking, type Partner, type SupplierProfile } from '../../lib/supplier-model'

/**
 * A firm's page's own lists, in the buyer page's row rhythm: the name on the
 * left with what it counts under it, the figure alone on the right. The
 * counties and the procedures are the profile rows the two pages share.
 */

const LIST = 'divide-y divide-border/70 border-y border-border/70'
const ROW = 'group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1'
const ROW_LINK = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40'

function Bar({ fraction }: { readonly fraction: number | null }) {
  if (fraction === null) return null
  return (
    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
      <span
        className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary"
        style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }}
      />
    </span>
  )
}

/**
 * The institutions that bought from the firm, each opening its page on the
 * year. A direct-purchase row also says what the firm was to the institution:
 * its share of the institution's own direct purchases in the year, and
 * whether it was the institution's largest direct supplier — the relationship
 * read from both sides.
 */
export function ClientRows({
  profile,
  ranking,
  grain,
  limit = 8,
  className,
}: {
  readonly profile: SupplierProfile
  readonly ranking: ClientRanking
  readonly grain: 'direct' | 'contract'
  readonly limit?: number
  readonly className?: string
}) {
  const rows = ranking.rows.slice(0, limit)
  const measure = (row: (typeof rows)[number]) => (ranking.rankedBy === 'value' ? row.value : row.count)
  const top = Math.max(...rows.map((row) => measure(row) ?? 0), 1)
  return (
    <ol className={cn(LIST, className)}>
      {rows.map((row, index) => {
        const weight = grain === 'direct' ? profile.weights.get(row.cui) : undefined
        const counted = grain === 'direct' ? directPurchasesCount(row.count) : contractsCount(row.count)
        const theirs =
          weight?.share != null
            ? weight.first
              ? t`cel mai mare furnizor direct al ei: ${percentText(weight.share, 0)} din achizițiile ei`
              : t`${percentText(weight.share, 0)} din achizițiile ei directe`
            : null
        const measured = measure(row)
        return (
          <li key={row.cui}>
            {/* The buyer page describes complete years only: the year in progress opens its last. */}
            <Link to="/procurement/institutions/$cui" params={{ cui: row.cui }} search={{ year: Math.min(profile.year, profile.latest) }} className={cn(ROW, ROW_LINK, 'py-2.5')}>
              <span className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
                <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm leading-snug text-foreground">{clientName(profile, row.cui)}</span>
                  <Bar fraction={measured === null ? null : measured / top} />
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {[ranking.rankedBy === 'value' ? counted : row.share !== null ? percentText(row.share, 0) : null, theirs].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </span>
              <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
                {ranking.rankedBy === 'value' ? (row.value === null ? '—' : moneyText(row.value)) : countText(row.count)}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

/** The firms the page's firm won contracts with, by the number of contracts together; each opens its own page on the year. */
export function PartnerRows({ partners, year, className }: { readonly partners: readonly Partner[]; readonly year: number; readonly className?: string }) {
  const top = Math.max(1, ...partners.map((partner) => partner.contracts))
  return (
    <ol className={cn(LIST, className)}>
      {partners.slice(0, 10).map((partner) => {
        const body = (
          <>
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">{partner.name}</span>
              <Bar fraction={partner.contracts / top} />
              <span className="mt-1 block truncate text-xs text-muted-foreground">{partner.buyers.slice(0, 2).join(' · ')}</span>
            </span>
            <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">{contractsCount(partner.contracts)}</span>
          </>
        )
        return (
          <li key={partner.key}>
            {/* A firm with no CUI (a foreign one) has no page to open. */}
            {partner.cui ? (
              <Link to="/procurement/suppliers/$cui" params={{ cui: partner.cui }} search={{ year }} className={cn(ROW, ROW_LINK, 'py-2.5')}>
                {body}
              </Link>
            ) : (
              <div className={cn(ROW, 'py-2.5')}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The largest records, one per row, the whole row the record's link: what was
 * bought, from whom, and — for a contract won in a consortium — with whom. The
 * firm itself is never named: the page is its.
 */
export function RecordList({
  records,
  cui,
  fallbackTitle,
  className,
}: {
  readonly records: readonly RecentRecord[]
  readonly cui: string
  /** What a record with no title is called: its category. */
  readonly fallbackTitle: (record: RecentRecord) => string | null
  readonly className?: string
}) {
  return (
    <ol className={cn(LIST, className)}>
      {records.map((record) => {
        const partners = record.winners.filter((winner) => winner.cui !== cui).map((winner) => winner.name)
        const title = record.title ?? fallbackTitle(record) ?? t`Fără titlu publicat`
        const body = (
          <>
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:underline group-hover:underline-offset-4">{title}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                <span className="sr-only">{t`Cumpărător:`} </span>
                {record.buyer.name}
              </span>
              {partners.length > 0 ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{t`cu ${partners.join(', ')}`}</span> : null}
            </span>
            <span className="text-right">
              <span className="block whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">{moneyText(record.value)}</span>
              <MonoLabel className="block whitespace-nowrap text-muted-foreground">{record.date ? dayText(record.date) : ''}</MonoLabel>
            </span>
          </>
        )
        return (
          <li key={`${record.grain}:${record.id}`}>
            {record.grain === 'contract' ? (
              <Link to="/procurement/contracts/$id" params={{ id: record.id }} className={cn(ROW, ROW_LINK, 'py-3')}>
                {body}
              </Link>
            ) : (
              <Link to="/procurement/direct-acquisitions/$id" params={{ id: record.id }} className={cn(ROW, ROW_LINK, 'py-3')}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}
