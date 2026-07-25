/**
 * Under-map reconciliation panel (geo/disclosure wave, user decision
 * 2026-07-25): the map paints ONLY the named territories, so a reader
 * comparing the buyer and supplier maps could conclude suppliers received
 * half of what buyers spent. This panel makes the maps reconcile in front
 * of the reader: named + no-known-geography (+ consortium-withheld whenever
 * the server withheld it) = the scope total. Buckets the map DROPS (kind
 * 'other' / 'unknown' at regionBucketsFromBreakdown) are re-read here from
 * the same facet block — nothing is refetched.
 */
import { Trans } from '@lingui/react/macro'

import { formatFlowCount, formatRon } from '../lib/formatting'

import type { RawProcurementBreakdownBucket } from '../api/graphql/procurement-queries'

type Props = {
  readonly buckets: readonly RawProcurementBreakdownBucket[]
  /**
   * Consortium money withheld from per-bucket totals in this scope. The
   * FIELD signals the server elected supplier money for this breakdown
   * (any supplier-scoped request — even a buyerRegion paint under a
   * supplier filter; codex finding 2) — null on attributed reads and when
   * the server suppressed the number (entity scopes, value bounds).
   */
  readonly withheldRon: string | null
  readonly mapParty: 'buyer' | 'supplier'
  readonly measure: 'value_awarded' | 'record_count'
}

type Line = {
  readonly amount: number
  readonly count: number
  readonly hasAmount: boolean
}

const EMPTY_LINE: Line = { amount: 0, count: 0, hasAmount: false }

function addBucket(line: Line, bucket: RawProcurementBreakdownBucket): Line {
  const raw = bucket.valueSum ?? bucket.valueAwardedSum
  const amount = raw !== null ? Number(raw) : null
  const count = bucket.recordCount !== null ? Number(bucket.recordCount) : 0
  return {
    amount:
      line.amount + (amount !== null && Number.isFinite(amount) ? amount : 0),
    count: line.count + (Number.isFinite(count) ? count : 0),
    hasAmount: line.hasAmount || (amount !== null && Number.isFinite(amount)),
  }
}

/** EXACTLY the map's paint predicate (procurement-map-series.ts) — the
 * "painted" line must never include buckets the map does not paint. */
const isPainted = (bucket: RawProcurementBreakdownBucket): boolean =>
  (bucket.kind === 'value' || bucket.kind === 'top') &&
  bucket.key !== null &&
  bucket.key.trim() !== ''

export function ProcurementMapReconciliationPanel({
  buckets,
  withheldRon,
  mapParty,
  measure,
}: Props) {
  let named = EMPTY_LINE
  let other = EMPTY_LINE
  let unknown = EMPTY_LINE
  for (const bucket of buckets) {
    // 'value'/'top' with a real key are the painted territories; 'unknown'
    // is the no-geography bucket the server ALWAYS serves and the map never
    // paints; EVERYTHING else (the beyond-topN 'other' remainder, blank keys,
    // future keyed kinds) folds into "other" so the total stays complete.
    if (isPainted(bucket)) named = addBucket(named, bucket)
    else if (bucket.kind === 'unknown') unknown = addBucket(unknown, bucket)
    else other = addBucket(other, bucket)
  }

  const money = measure === 'value_awarded'
  // The field itself is the signal — never mapParty (a buyer paint under a
  // supplier filter reads supplier money and withholds too).
  const withheld = money && withheldRon !== null ? Number(withheldRon) : null
  const showWithheld =
    withheld !== null && Number.isFinite(withheld) && withheld > 0

  // Money mode with NO observed money anywhere (a served/degraded scope can
  // carry counts with all-null bucket money): the total is UNOBSERVED, not
  // zero (codex finding 1).
  const anyMoney =
    named.hasAmount || other.hasAmount || unknown.hasAmount || showWithheld
  const total = money
    ? named.amount +
      other.amount +
      unknown.amount +
      (showWithheld ? withheld : 0)
    : named.count + other.count + unknown.count

  const fmt = (line: Line) =>
    money
      ? line.hasAmount
        ? formatRon(String(Math.round(line.amount)), 'compact')
        : '—'
      : formatFlowCount(String(line.count))

  const hasAnything =
    named.count > 0 || other.count > 0 || unknown.count > 0 || showWithheld
  if (!hasAnything) return null

  const row = 'flex items-baseline justify-between gap-4'
  const label = 'text-[var(--pnrr-muted)]'
  const value = 'tabular-nums font-semibold text-[var(--pnrr-fg)]'

  return (
    <aside className="space-y-1.5 border-l-4 border-[var(--pnrr-border)] py-2 pl-4 pr-3 text-sm leading-6">
      <p className="font-semibold text-[var(--pnrr-fg)]">
        {money ? (
          <Trans>Where is all the money on this map?</Trans>
        ) : (
          <Trans>Where are all the records on this map?</Trans>
        )}
      </p>
      <div className={row}>
        <span className={label}>
          <Trans>Painted on the map (named territories)</Trans>
        </span>
        <span className={value}>{fmt(named)}</span>
      </div>
      {other.count > 0 ? (
        <div className={row}>
          <span className={label}>
            <Trans>Territories beyond the map&apos;s top list</Trans>
          </span>
          <span className={value}>{fmt(other)}</span>
        </div>
      ) : null}
      {unknown.count > 0 ? (
        <div className={row}>
          <span className={label}>
            {mapParty === 'supplier' ? (
              <Trans>No known supplier location</Trans>
            ) : (
              <Trans>No known buyer location</Trans>
            )}
          </span>
          <span className={value}>{fmt(unknown)}</span>
        </div>
      ) : null}
      {showWithheld ? (
        <div className={row}>
          <span className={label}>
            <Trans>
              Consortium awards — not attributable to individual suppliers
            </Trans>
          </span>
          <span className={value}>
            {formatRon(String(Math.round(withheld)), 'compact')}
          </span>
        </div>
      ) : null}
      <div className={`${row} border-t border-[var(--pnrr-border)] pt-1.5`}>
        <span className="font-semibold text-[var(--pnrr-fg)]">
          <Trans>Total under the current filters</Trans>
        </span>
        <span className={value}>
          {money
            ? anyMoney
              ? formatRon(String(Math.round(total)), 'compact')
              : '—'
            : formatFlowCount(String(total))}
        </span>
      </div>
      {mapParty === 'buyer' ? (
        <p className="pt-1 text-xs leading-5 text-[var(--pnrr-muted)]">
          <Trans>
            Buyer locations include registered head offices: national companies
            (e.g. CNIR, CFR) are counted in the county of their headquarters,
            not where the money is spent.
          </Trans>
        </p>
      ) : null}
      {showWithheld ? (
        <p className="pt-1 text-xs leading-5 text-[var(--pnrr-muted)]">
          <Trans>
            Multi-member consortium awards publish no internal split, so their
            money is disclosed here as a lump sum and never assigned to any
            supplier or territory.
          </Trans>
        </p>
      ) : null}
    </aside>
  )
}
