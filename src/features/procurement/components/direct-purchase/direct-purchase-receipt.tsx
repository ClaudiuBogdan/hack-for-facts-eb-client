import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { byMoney, excludedLine, isAttempt, type DirectPurchase, type DpItem, type DpPeers } from '../../lib/direct-purchase-model'
import { catalogText, labelText, leiExact, lineShares, peersText, quantityText, receiptLede, reconciliationText, repeatsText, unitText } from '../../lib/direct-purchase-text'
import { percentText } from '../../lib/home-format'
import { CONTEXT_TINT } from './direct-purchase-style'

/**
 * The basket, as a receipt: every line with its quantity and price, largest
 * first, numbered as SEAP lists them; the total at the foot, and the gap when
 * the lines do not add up. What other institutions paid for the same product,
 * and how often this one bought it, sit under a line in the context tint:
 * they are not part of this purchase.
 */

/** A text that may run long: two or three lines, then the rest on demand. */
export function Clamp({ text, lines = 2, className }: { readonly text: string; readonly lines?: 2 | 3; readonly className?: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > (lines === 3 ? 220 : 140)
  return (
    <span className={cn('block', className)}>
      <span className={cn('block whitespace-pre-line', long && !open && (lines === 3 ? 'line-clamp-3' : 'line-clamp-2'))}>{text}</span>
      {long ? (
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="mt-1 text-xs font-medium text-foreground underline underline-offset-4">
          {open ? <Trans>mai puțin</Trans> : <Trans>tot textul</Trans>}
        </button>
      ) : null}
    </span>
  )
}

/**
 * Where this price sits among the same firm's prices to other institutions:
 * the range as a line, the median as a tick, this price as a dot. None when
 * every institution paid the same.
 */
function PriceRange({ price, peers }: { readonly price: number; readonly peers: DpPeers }) {
  if (peers.max <= peers.min) return null
  const at = (value: number) => `${(Math.min(Math.max((value - peers.min) / (peers.max - peers.min), 0), 1) * 100).toFixed(1)}%`
  return (
    <span className="relative mt-2 block h-3 w-40" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-muted-foreground/40" />
      <span className="absolute inset-y-0.5 w-px bg-muted-foreground/60" style={{ left: at(peers.median) }} />
      <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background" style={{ left: at(price) }} />
    </span>
  )
}

/** Context under one line, set apart by the tint and its label. */
function LineContext({ children }: { readonly children: ReactNode }) {
  return (
    <span className={cn('mt-3 block max-w-[70ch] px-3 py-2 text-xs leading-relaxed text-foreground', CONTEXT_TINT)}>
      <MonoLabel className="mb-1.5 block text-muted-foreground">{t`Context`}</MonoLabel>
      {children}
    </span>
  )
}

function QuantityLine({ item, cpvLabel }: { readonly item: DpItem; readonly cpvLabel: string | null }) {
  const unit = unitText(item.unit)
  // A unit with spaces („cutie x 20") reads as one thing in parentheses.
  const unitPart = unit ? (/\s/u.test(unit) ? ` (${unit})` : ` ${unit}`) : ''
  const label = labelText(item.cpvLabel)
  return (
    <span className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground">
      {item.quantity !== null ? `${quantityText(item.quantity)}${unitPart}` : '—'} × {item.unitPrice !== null ? leiExact(item.unitPrice) : '—'}
      {label && label !== cpvLabel ? <span className="font-sans"> · {label}</span> : null}
    </span>
  )
}

function ItemRow({
  item,
  share,
  year,
  cpvLabel,
  excluded,
}: {
  readonly item: DpItem
  readonly share: number | null
  readonly year: number | null
  readonly cpvLabel: string | null
  readonly excluded: boolean
}) {
  const catalog = catalogText(item)
  const repeats = year !== null ? repeatsText(item, year) : null
  const peers = item.peers && year !== null ? item.peers : null
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
      <MonoLabel className="pt-1 tabular-nums text-muted-foreground">{String(item.index + 1).padStart(2, '0')}</MonoLabel>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug text-foreground sm:text-base">{item.name}</span>
        <QuantityLine item={item} cpvLabel={cpvLabel} />
        {share !== null ? (
          <span className="mt-2 block h-1 max-w-xs bg-muted" aria-hidden="true">
            <span className="block h-1 bg-primary/70" style={{ width: `${Math.min(Math.max(share * 100, 0.8), 100).toFixed(1)}%` }} />
          </span>
        ) : null}
        {item.description ? <Clamp text={item.description} className="mt-2 max-w-[70ch] text-xs leading-relaxed text-muted-foreground" /> : null}
        {catalog ? <span className="mt-2 block text-xs text-foreground">{catalog}</span> : null}
        {excluded ? <span className="mt-2 block text-xs text-amber-800 dark:text-amber-300">{t`Rândul nu intră în valoarea achiziției.`}</span> : null}
        {(peers && year !== null) || repeats ? (
          <LineContext>
            {peers && year !== null ? (
              <span className="block">
                {peersText(item, peers, year)}
                {item.unitPrice !== null ? <PriceRange price={item.unitPrice} peers={peers} /> : null}
              </span>
            ) : null}
            {repeats ? <span className={cn('block', peers && 'mt-1.5')}>{repeats}</span> : null}
          </LineContext>
        ) : null}
      </span>
      <span className="text-right">
        <span className={cn('block whitespace-nowrap text-sm font-semibold tabular-nums sm:text-base', excluded ? 'text-muted-foreground line-through' : 'text-foreground')}>
          {item.line !== null ? leiExact(item.line) : '—'}
        </span>
        {share !== null ? <MonoLabel className="mt-1 block tabular-nums text-muted-foreground">{percentText(share, 0)}</MonoLabel> : null}
      </span>
    </li>
  )
}

export function DirectPurchaseReceipt({ purchase, year }: { readonly purchase: DirectPurchase; readonly year: number | null }) {
  const detail = purchase.detail
  if (!detail || detail.items.length === 0) return null
  const items = byMoney(detail.items)
  const excluded = excludedLine(purchase)
  // No shares when a line's money is unknown: they would be shares of a part.
  const shares = lineShares(purchase)
  const lede = receiptLede(purchase)
  const gap = reconciliationText(purchase)
  return (
    <div>
      {lede ? <p className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">{lede}</p> : null}
      <div className="mt-6 flex items-end justify-between gap-4 border-b pb-2">
        <MonoLabel className="text-muted-foreground">{items.length > 1 ? t`Produs · cantitate × preț, după valoare` : t`Produs · cantitate × preț`}</MonoLabel>
        <MonoLabel className="text-muted-foreground">{t`Total`}</MonoLabel>
      </div>
      <ol className="divide-y divide-border/70">
        {items.map((item) => (
          <ItemRow
            key={item.index}
            item={item}
            year={year}
            cpvLabel={labelText(purchase.cpv?.label ?? null)}
            excluded={item === excluded}
            share={shares?.get(item) ?? null}
          />
        ))}
      </ol>
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-foreground/80 pt-3">
        <span className="text-sm font-semibold text-foreground">{isAttempt(purchase.outcome) ? t`Oferta, fără TVA` : t`Total, fără TVA`}</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">{purchase.value !== null ? leiExact(purchase.value) : '—'}</span>
      </div>
      {gap ? <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-amber-800 dark:text-amber-300">{gap}</p> : null}
    </div>
  )
}
