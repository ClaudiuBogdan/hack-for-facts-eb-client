import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { linkYearOf, shownDayOf, type DirectPurchase, type DpOther, type DpOutcome, type DpParty } from '../../lib/direct-purchase-model'
import { afterText, daysBetween, leiExact, outcomeLabel, refusalText, titleOf, titleRestText, whenText } from '../../lib/direct-purchase-text'
import { statusLook } from './direct-purchase-style'

/**
 * The direct purchase page's head: the way back and the code on the top row,
 * how it ended on one marked line, the title, and one sentence — who bought
 * from whom, for how much, when (or why it did not happen) — with the redo of
 * a refused offer under it.
 */

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
  longest: 'text-xl sm:text-3xl lg:text-4xl',
} as const

function headingSize(title: string): keyof typeof HEADING {
  return title.length <= 24 ? 'short' : title.length <= 48 ? 'medium' : title.length <= 96 ? 'long' : 'longest'
}

const NAME_LINK = 'font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground'

/** A party's name as a link to its procurement page; plain text when SEAP gave no CUI. */
export function PartyName({ party, role, year, className }: { readonly party: DpParty; readonly role: 'authority' | 'supplier'; readonly year: number | undefined; readonly className?: string }) {
  if (!party.cui) return <span className={className}>{party.name}</span>
  const search = year === undefined ? {} : { year }
  return role === 'authority' ? (
    <Link to="/procurement/institutions/$cui" params={{ cui: party.cui }} search={search} className={cn(NAME_LINK, className)}>
      {party.name}
    </Link>
  ) : (
    <Link to="/procurement/suppliers/$cui" params={{ cui: party.cui }} search={search} className={cn(NAME_LINK, className)}>
      {party.name}
    </Link>
  )
}

/** The status on one line above the title: its mark and its name — the sentence under the title says the rest. */
function StatusLine({ outcome, className }: { readonly outcome: DpOutcome; readonly className?: string }) {
  const { Icon, tone } = statusLook(outcome)
  return (
    <p className={cn('flex items-center gap-1.5', tone, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <MonoLabel>{outcomeLabel(outcome)}</MonoLabel>
    </p>
  )
}

/** A record's SEAP code, copied on a tap; `label` names it („Cod", „Anunț"). */
export function CopyCode({ code, label }: { readonly code: string; readonly label?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard?.writeText(code).then(() => setCopied(true), () => undefined)}
      className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
      aria-label={copied ? t`Cod copiat` : t`Copiază codul ${code}`}
    >
      <MonoLabel>{label ?? t`Cod`}</MonoLabel>
      <span className="font-mono tabular-nums text-foreground">{code}</span>
      {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
    </button>
  )
}

/** The way back; the record's kind beside it from a small screen up. */
function Kicker({ purchase }: { readonly purchase: DirectPurchase | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]">
      <Link to="/procurement" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Achiziții publice</Trans>
        </span>
      </Link>
      <span className="hidden items-center gap-2 sm:flex">
        <span aria-hidden="true">/</span>
        <span>{purchase?.family === 'notification' ? t`Achiziție directă, notificată` : t`Achiziție directă`}</span>
      </span>
    </MonoLabel>
  )
}

/** The money in the head's sentence: the value, or why there is none to show — SEAP's did not pass the checks, or SEAP published none. */
function moneyText(purchase: DirectPurchase): string {
  if (purchase.value !== null) {
    const amount = leiExact(purchase.value)
    return t`${amount} fără TVA`
  }
  return purchase.unverifiedValue !== null ? t`o valoare neverificată` : t`o valoare nepublicată`
}

/**
 * The one sentence under the title: who bought from whom, for how much and
 * when — or, for an attempt, what was asked (dated by the request) and why it
 * did not happen; for a record whose end SEAP does not say, that it does not.
 */
function HeadSentence({ purchase }: { readonly purchase: DirectPurchase }) {
  const year = linkYearOf(purchase)
  const when = whenText(shownDayOf(purchase))
  const authority = <PartyName party={purchase.authority} role="authority" year={year} />
  const supplier = <PartyName party={purchase.supplier} role="supplier" year={year} />
  const money = <strong className="font-semibold text-foreground">{moneyText(purchase)}</strong>
  const refusal = refusalText(purchase.outcome)
  if (refusal) {
    return (
      <Trans>
        {authority} a vrut să cumpere direct de la {supplier}, cu {money}, {when}. Achiziția nu s-a făcut: {refusal}
      </Trans>
    )
  }
  if (purchase.outcome.kind === 'unknown') {
    return (
      <Trans>
        {authority} a pornit o achiziție directă de la {supplier}, cu {money}, {when}. SEAP nu spune cum s-a încheiat.
      </Trans>
    )
  }
  if (purchase.family === 'notification') {
    return (
      <Trans>
        {authority} a cumpărat direct de la {supplier}, cu {money}, în afara catalogului electronic, și a notificat achiziția în SEAP {when}.
      </Trans>
    )
  }
  return (
    <Trans>
      {authority} a cumpărat direct de la {supplier}, cu {money}, {when}.
    </Trans>
  )
}

/**
 * Where a refused offer went next: the same purchase, done, a link away —
 * „în aceeași zi" when it is the day the head dates the attempt by, else its
 * date: a count of days from the attempt's end would read as from its request.
 */
function RedoLine({ purchase, redo }: { readonly purchase: DirectPurchase; readonly redo: DpOther }) {
  const day = shownDayOf(purchase)
  const when = day && redo.date && daysBetween(day, redo.date) === 0 ? afterText(0) : whenText(redo.date)
  const value = redo.value !== null ? leiExact(redo.value) : null
  return (
    <p className="mt-4 max-w-[60ch] border-l-2 border-emerald-700/60 pl-3 text-sm leading-relaxed text-foreground dark:border-emerald-300/60">
      <Link to="/procurement/direct-acquisitions/$id" params={{ id: redo.id }} className="font-medium underline underline-offset-4">
        {value ? <Trans>Refăcută {when}: aceeași achiziție, de la aceeași firmă, finalizată cu {value}.</Trans> : <Trans>Refăcută {when}: aceeași achiziție, de la aceeași firmă, finalizată.</Trans>}
      </Link>
    </p>
  )
}

function HeadFrame({ purchase, children }: { readonly purchase: DirectPurchase | null; readonly children: ReactNode }) {
  return (
    <RuledFrame className="py-10 sm:py-12 lg:py-14">
      <CornerTicks />
      <div className="flex items-center justify-between gap-4">
        <Kicker purchase={purchase} />
        {purchase?.code ? <CopyCode code={purchase.code} /> : null}
      </div>
      {children}
      {/* The crux on the head's bottom rule. */}
      <span className="absolute inset-x-0 top-full z-30 mt-px">
        <CruxMarks />
      </span>
    </RuledFrame>
  )
}

export function DirectPurchaseHead({ purchase, redo }: { readonly purchase: DirectPurchase; readonly redo: DpOther | null }) {
  const title = titleOf(purchase)
  const rest = titleRestText(purchase)
  return (
    <section className="relative border-b" aria-labelledby="direct-purchase-title">
      <TwoLayerLattice idPrefix="direct-purchase" />
      <HeadFrame purchase={purchase}>
        <StatusLine outcome={purchase.outcome} className="mt-6" />
        <h1 id="direct-purchase-title" className={cn('mt-3 max-w-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', HEADING[headingSize(title)])}>
          {title}
          {rest ? (
            <>
              {' '}
              <span className="mt-2 block text-[0.45em] font-semibold tracking-tight text-muted-foreground">{rest}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          <HeadSentence purchase={purchase} />
        </p>
        {redo ? <RedoLine purchase={purchase} redo={redo} /> : null}
      </HeadFrame>
    </section>
  )
}

/** The head with no purchase to name: the way back, and what the page has to say instead. */
export function DirectPurchaseHeadShell({ children }: { readonly children: ReactNode }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="direct-purchase" />
      <HeadFrame purchase={null}>{children}</HeadFrame>
    </section>
  )
}

/** The head before the purchase arrives (a client-side navigation): the way back and the shape of what comes. */
export function DirectPurchaseHeadPending({ children }: { readonly children?: ReactNode }) {
  return (
    <section className="relative border-b" aria-busy="true" aria-label={t`Se încarcă achiziția`}>
      <TwoLayerLattice idPrefix="direct-purchase" />
      <HeadFrame purchase={null}>
        <div className="mt-8 h-12 w-2/3 animate-pulse bg-muted/70 sm:h-16" aria-hidden="true" />
        <HubPending className="mt-6 max-w-xl" rows={2} />
        {children}
      </HeadFrame>
    </section>
  )
}
