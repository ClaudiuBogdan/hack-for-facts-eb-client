import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { contextGapOf, isPurchase, linkYearOf, LISTED_FROM, purchasesSince, shareOf, type DirectPurchase, type DpContext, type DpYear } from '../../lib/direct-purchase-model'
import { aboutText, contextYearText, dayShort, directSalesCount, leiExact, leiShort, ordinalText, purchasesCount, shareText } from '../../lib/direct-purchase-text'
import { directPurchasesCount } from '../../lib/home-format'
import { DIRECT_COMPARABLE_FROM } from '../../lib/home-model'
import { PartyName } from './direct-purchase-head'
import { CONTEXT_TINT } from './direct-purchase-style'

/**
 * The context band: what else passed between the institution and the firm,
 * set apart from the purchase — its own tinted band after it, labelled
 * „Context". The pair's years, the institution's year and this firm's place
 * in it, the firm's year and this institution's place in it, the records
 * around this one and the two parties' pages.
 */

const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const LABEL = 'block text-muted-foreground'
const FIRST_YEAR = DIRECT_COMPARABLE_FROM

/**
 * The pair year by year from 2019 to the year in progress: lei as columns,
 * the purchase's year solid, the year in progress dashed; pointing at a year
 * says its figures. Not links: the explorer's list is one click away.
 */
function PairChart({ context, points, className }: { readonly context: DpContext; readonly points: readonly DpYear[]; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const byYear = new Map(points.map((point) => [point.year, point]))
  const lastYear = Math.max(context.last.year, context.year)
  const years = Array.from({ length: Math.max(0, lastYear - FIRST_YEAR + 1) }, (_, index) => FIRST_YEAR + index)
  const max = Math.max(1, ...years.map((year) => byYear.get(year)?.value ?? 0))
  const shown = active ?? context.year
  const point = byYear.get(shown)
  const inProgress = (year: number) => year === context.last.year && context.last.through !== null
  const shownText = inProgress(shown) ? contextYearText(context.last) : shown === context.year ? contextYearText(context) : String(shown)
  const columns = { gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }
  if (years.length === 0) return null
  return (
    <figure className={className}>
      {/* Not a live region: each column's text says its figures, and a pointer passing over them is not news. */}
      <p className="min-h-10 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{shownText}</span>
        {' · '}
        {point && point.count > 0 ? (
          <>
            {purchasesCount(point.count)}
            {point.value !== null ? `, ${leiExact(point.value)}` : ''}
          </>
        ) : (
          <Trans>nicio achiziție</Trans>
        )}
      </p>
      <ol className="mt-3 grid h-36 items-end gap-1.5" style={columns} onPointerLeave={() => setActive(null)}>
        {years.map((year) => {
          const value = byYear.get(year)?.value ?? 0
          const count = byYear.get(year)?.count ?? 0
          const isThis = year === context.year
          const partial = inProgress(year)
          return (
            <li key={year} className="flex h-full flex-col justify-end" onPointerEnter={() => setActive(year)}>
              <span className="sr-only">
                {year}: {count > 0 ? `${purchasesCount(count)}${value > 0 ? `, ${leiExact(value)}` : ''}` : t`nicio achiziție`}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'block w-full transition-colors',
                  isThis ? 'bg-primary' : active === year ? 'bg-primary/60' : 'bg-primary/30',
                  partial && 'outline-dashed outline-1 outline-offset-1 outline-primary',
                  partial && isThis && 'bg-primary/70',
                  value === 0 && 'h-px bg-border',
                )}
                style={value > 0 ? { height: `${Math.max((value / max) * 100, 3)}%` } : undefined}
              />
            </li>
          )
        })}
      </ol>
      <div className="mt-2 grid gap-1.5" style={columns} aria-hidden="true">
        {years.map((year) => (
          <MonoLabel key={year} className={cn('text-center tabular-nums', year === context.year ? 'text-foreground' : 'text-muted-foreground')}>
            {`'${String(year).slice(2)}`}
          </MonoLabel>
        ))}
      </div>
    </figure>
  )
}

/** The pair since 2019 in one sentence — every year to the year in progress, as the band's description says; none when the years were not read. */
function PairHistory({ purchase, context }: { readonly purchase: DirectPurchase; readonly context: DpContext }) {
  const history = purchasesSince(context)
  if (!history) return null
  const { count, since } = history
  const total = directPurchasesCount(count)
  return (
    <p>
      {count === 0 ? (
        <Trans>Din 2019 încoace, nicio achiziție directă între ele nu s-a finalizat.</Trans>
      ) : count === 1 && isPurchase(purchase.outcome) ? (
        <Trans>Din 2019 încoace, e singura achiziție directă între ele.</Trans>
      ) : count === 1 ? (
        <Trans>Din 2019 încoace, între ele s-a finalizat o singură achiziție directă, în {since}.</Trans>
      ) : (
        <Trans>
          Din 2019 încoace, au fost {total} între ele; prima, în {since}.
        </Trans>
      )}
    </p>
  )
}

/**
 * The pair in the purchase's year, from each side: how much of the
 * institution's direct-purchase money the firm took and its place, how much
 * of the firm's direct sales the institution made and its place. A side
 * whose read failed says nothing. The band's description names the two, so
 * these sentences do not.
 */
function PairYear({ context }: { readonly context: DpContext }) {
  const { pair, buyer, seller } = context
  if (!pair || pair.count === 0) return null
  const yearText = contextYearText(context)
  const buyerShare = buyer ? shareOf(pair.value, buyer.value) : null
  const sellerShare = seller ? shareOf(pair.value, seller.value) : null
  const buyerPart = buyerShare !== null ? shareText(buyerShare) : null
  const sellerPart = sellerShare !== null ? shareText(sellerShare) : null
  const firmPlace = buyer?.rank ? ordinalText(buyer.rank) : null
  const institutionPlace = seller?.rank ? ordinalText(seller.rank) : null
  const sellers = buyer ? (buyer.more ? t`peste ${buyer.sellers}` : String(buyer.sellers)) : null
  const clients = seller ? (seller.more ? t`peste ${seller.clients}` : String(seller.clients)) : null
  return (
    <>
      {buyer && buyerPart && firmPlace ? (
        <p className="mt-3">
          {buyer.sellers === 1 && !buyer.more ? (
            <Trans>În {yearText}, e singura firmă de la care instituția a cumpărat direct.</Trans>
          ) : (
            <Trans>
              În {yearText}, firma e {firmPlace} furnizor al instituției din {sellers}, cu {buyerPart} din banii achizițiilor ei directe.
            </Trans>
          )}
        </p>
      ) : null}
      {seller && sellerPart ? (
        <p className="mt-3">
          {institutionPlace ? (
            <Trans>
              Pentru firmă, instituția e {institutionPlace} client din {clients}: {sellerPart} din vânzările ei directe.
            </Trans>
          ) : (
            <Trans>
              Pentru firmă, instituția e unul dintre {clients} de clienți: {sellerPart} din vânzările ei directe.
            </Trans>
          )}
        </p>
      ) : null}
    </>
  )
}

/**
 * The records between the same two around this one, newest first — a refused
 * offer and its redo on the same day, a basket split by product, a weekly
 * order — shown, never judged. This one is marked by a bar, not linked.
 */
function RecordsAround({ purchase, context, className }: { readonly purchase: DirectPurchase; readonly context: DpContext; readonly className?: string }) {
  const { authority, supplier } = purchase
  const { records } = context
  // The explorer lists the purchases, not the cancelled: the link counts what it opens on.
  const listed = context.others.filter((other) => other.done).length
  const all = records ? purchasesCount(records.count) : null
  if (context.others.length === 0) return null
  return (
    <div className={className}>
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {context.others.map((other) => {
          const isThis = other.id === purchase.id
          const title = other.title ?? t`Fără titlu în SEAP`
          const note = isThis ? t`aceasta` : !other.done ? t`nefinalizată` : null
          const row = cn('grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 pr-1', isThis ? 'border-l-2 border-primary pl-2.5' : 'pl-3')
          const body = (
            <>
              <MonoLabel className="pt-1 tabular-nums text-muted-foreground">{other.date ? dayShort(other.date) : '—'}</MonoLabel>
              <span className="min-w-0">
                <span className={cn('block truncate text-sm', isThis ? 'font-semibold text-foreground' : 'text-foreground')}>{title}</span>
                {note ? <MonoLabel className="mt-1 block text-muted-foreground">{note}</MonoLabel> : null}
              </span>
              <span className={cn('whitespace-nowrap text-right text-sm tabular-nums', other.done ? 'font-semibold text-foreground' : 'text-muted-foreground line-through')}>
                {other.value !== null ? leiExact(other.value) : '—'}
              </span>
            </>
          )
          return (
            <li key={other.id} aria-current={isThis ? 'page' : undefined}>
              {isThis ? (
                <div className={row}>{body}</div>
              ) : (
                <Link to="/procurement/direct-acquisitions/$id" params={{ id: other.id }} className={cn(row, 'transition-colors hover:text-primary')}>
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
      {authority.cui && supplier.cui && records && (records.estimated || records.count > listed) ? (
        <Link
          to="/procurement/search"
          search={{ view: 'list', grain: 'direct_acquisitions', authority_cui: authority.cui, supplier_cui: supplier.cui, dateFrom: LISTED_FROM }}
          className={cn(OUT_LINK, 'mt-3 text-sm')}
        >
          {records.estimated ? <Trans>Toate achizițiile dintre ele</Trans> : <Trans>Toate cele {all} dintre ele</Trans>}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  )
}

/** A side's year in one sentence: „În 2026 (până în mai): 142 de achiziții directe, 1,76 mil. lei."; none when its read failed. */
function partyYearText(role: 'authority' | 'supplier', context: DpContext, yearText: string): string | null {
  if (role === 'authority') {
    if (!context.buyer) return null
    const count = directPurchasesCount(context.buyer.count)
    if (context.buyer.value === null) return t`În ${yearText}: ${count}.`
    const money = leiShort(context.buyer.value)
    return t`În ${yearText}: ${count}, ${money}.`
  }
  if (!context.seller) return null
  const count = directSalesCount(context.seller.count)
  if (context.seller.value === null) return t`În ${yearText}: ${count} către instituții.`
  const money = leiShort(context.seller.value)
  return t`În ${yearText}: ${count} către instituții, ${money}.`
}

/** One side: its name, what it is, its year, and the ways to its pages. */
function PartyBlock({ purchase, context, role }: { readonly purchase: DirectPurchase; readonly context: DpContext | null; readonly role: 'authority' | 'supplier' }) {
  const year = linkYearOf(purchase)
  const party = role === 'authority' ? purchase.authority : purchase.supplier
  const yearText = context ? contextYearText(context) : null
  const yearLine = context && yearText ? partyYearText(role, context, yearText) : null
  const about = role === 'authority' ? aboutText(party.identity) : null
  const search = year === undefined ? {} : { year }
  return (
    <div className="border-t pt-4">
      <MonoLabel className="block text-muted-foreground">{role === 'authority' ? t`Instituția` : t`Firma`}</MonoLabel>
      <p className="mt-3 text-base font-semibold leading-snug">
        <PartyName party={party} role={role} year={year} />
      </p>
      {about ? <p className="mt-1 text-sm text-muted-foreground">{about}</p> : null}
      {party.cui ? <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">CUI {party.cui}</p> : null}
      {yearLine ? <p className="mt-3 text-sm text-muted-foreground">{yearLine}</p> : null}
      {party.cui ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {role === 'authority' ? (
            <>
              <Link to="/procurement/institutions/$cui" params={{ cui: party.cui }} search={search} className={OUT_LINK}>
                <Trans>Achizițiile instituției</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              {party.hasBudget ? (
                <Link to="/entities/$cui" params={{ cui: party.cui }} className={OUT_LINK}>
                  <Trans>Bugetul</Trans>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link to="/procurement/suppliers/$cui" params={{ cui: party.cui }} search={search} className={OUT_LINK}>
                <Trans>Vânzările firmei</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link to="/companies/$cui" params={{ cui: party.cui }} className={OUT_LINK}>
                <Trans>Firma</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** The band's opening: the label, the title, and whose purchases it holds. */
function ContextIntro({ purchase }: { readonly purchase: DirectPurchase }) {
  const year = linkYearOf(purchase)
  const authority = <PartyName party={purchase.authority} role="authority" year={year} />
  const supplier = <PartyName party={purchase.supplier} role="supplier" year={year} />
  return (
    <div>
      <MonoLabel className={LABEL}>{t`Context`}</MonoLabel>
      <h2 id="direct-purchase-context" className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        <Trans>Alte achiziții între ele</Trans>
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <Trans>
          Ce a mai cumpărat {authority} de la {supplier}, din 2019 încoace.
        </Trans>
      </p>
    </div>
  )
}

function ContextBody({ purchase, context }: { readonly purchase: DirectPurchase; readonly context: DpContext }) {
  return (
    <>
      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-5">
          <div className="text-base leading-relaxed text-muted-foreground">
            <PairHistory purchase={purchase} context={context} />
            <PairYear context={context} />
          </div>
          {context.years ? (
            <>
              <MonoLabel className={cn(LABEL, 'mt-8')}>{t`Între ele, pe ani, lei`}</MonoLabel>
              <PairChart context={context} points={context.years} className="mt-3" />
            </>
          ) : null}
        </div>
        <div className="min-w-0 lg:col-span-7">
          {context.others.length > 0 ? (
            <>
              <MonoLabel className={LABEL}>{t`În jurul acestei achiziții`}</MonoLabel>
              <RecordsAround purchase={purchase} context={context} className="mt-3" />
            </>
          ) : null}
        </div>
      </div>
      {context.partial ? <p className="mt-6 text-sm text-muted-foreground">{t`O parte din aceste cifre nu s-a putut citi acum; reîncarcă pagina pentru restul.`}</p> : null}
    </>
  )
}

/** Why there is no context to read, as the band says it. */
function ContextGap({ purchase }: { readonly purchase: DirectPurchase }) {
  const gap = contextGapOf(purchase)
  if (!gap) return null
  return (
    <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
      {gap === 'no-cui' ? (
        <Trans>SEAP nu dă codul fiscal al uneia dintre părți, așa că celelalte achiziții dintre ele nu se pot aduna.</Trans>
      ) : gap === 'no-date' ? (
        <Trans>SEAP nu publică data acestei achiziții, așa că pagina nu o poate așeza printre celelalte dintre ele.</Trans>
      ) : (
        <Trans>Achiziția e dinainte de 2019, iar datele SEAP de atunci nu despart achizițiile făcute de ofertele refuzate, așa că pagina nu le adună.</Trans>
      )}
    </p>
  )
}

/**
 * The band, in its states: reading, failed (with a retry), read — or, when
 * the purchase has no context to read (no CUI for a side, no date, a year
 * before 2019), only the two parties, said why.
 */
export function DirectPurchaseContextBand({
  purchase,
  context,
}: {
  readonly purchase: DirectPurchase
  readonly context: { readonly data: DpContext | null | undefined; readonly isError: boolean; readonly retry: () => void }
}) {
  const readable = contextGapOf(purchase) === null
  return (
    <section className={cn('border-y', CONTEXT_TINT)} aria-labelledby="direct-purchase-context">
      <RuledFrame className="py-12 sm:py-16">
        <ContextIntro purchase={purchase} />
        {!readable ? (
          <ContextGap purchase={purchase} />
        ) : context.data ? (
          <ContextBody purchase={purchase} context={context.data} />
        ) : context.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={context.retry} />
          </div>
        ) : (
          <HubPending className="mt-8" rows={4} />
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-10">
          <PartyBlock purchase={purchase} context={context.data ?? null} role="authority" />
          <PartyBlock purchase={purchase} context={context.data ?? null} role="supplier" />
        </div>
      </RuledFrame>
    </section>
  )
}
