import type { CSSProperties, ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { isAttempt, isPurchase, linkYearOf, shownDayOf, type DirectPurchase } from '../../lib/direct-purchase-model'
import {
  afterText,
  alsoInText,
  basketCount,
  contractTypeText,
  dayLong,
  daysBetween,
  labelText,
  leiExact,
  outcomeDetailText,
  outcomeLabel,
  reasonText,
} from '../../lib/direct-purchase-text'
import { statusLook } from './direct-purchase-style'
import { Clamp, DirectPurchaseReceipt } from './direct-purchase-receipt'
import { RecordParties } from './record-parties'

/**
 * Everything about the purchase itself, in reading order: what was bought
 * (the institution's words, then the value beside its facts, then the
 * lines), how it was done, delivery and payment, and where it comes from.
 * Nothing here is about the two parties beyond this purchase: that is the
 * context band's.
 */

const SUBHEAD = 'text-base font-semibold tracking-tight text-foreground sm:text-lg'
const SOURCE_LINK = 'font-medium text-foreground underline-offset-4 hover:underline'

/** An outbound link, said to open in a new tab. */
function OutLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={SOURCE_LINK}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
    </a>
  )
}

// ─────────────────────────────────────────────────────── the description ──

/**
 * What was bought, in the institution's own words, introduced as such — the
 * answer to the section's heading. Left out when it only repeats the title;
 * said to be withheld when it carried a person's contact details.
 */
function PurchaseDescription({ purchase, className }: { readonly purchase: DirectPurchase; readonly className?: string }) {
  const detail = purchase.detail
  if (!detail) return null
  if (detail.redacted) {
    return (
      <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
        <Trans>Textul scris de instituție (descrierea, livrarea și plata) nu e afișat: conține datele de contact ale unei persoane. Produsele și prețurile sunt publice.</Trans>
      </p>
    )
  }
  const description = detail.description
  if (!description || description.toLocaleLowerCase('ro-RO') === (purchase.title ?? '').toLocaleLowerCase('ro-RO')) return null
  return (
    <figure className={className}>
      <figcaption className="text-sm text-muted-foreground">{t`Instituția a descris achiziția așa:`}</figcaption>
      <blockquote className="mt-2 max-w-[60ch] text-lg leading-relaxed text-foreground sm:text-xl">
        <Clamp text={`„${description}”`} lines={3} />
      </blockquote>
    </figure>
  )
}

// ──────────────────────────────────────────────── the value and the facts ──

/**
 * The value, the page's largest figure; an offer that was never a purchase is
 * struck; an unchecked value is said, not shown as one; a record whose end
 * SEAP does not say shows SEAP's value, unmarked.
 */
/**
 * The figure's size from `md`, where the value has a column of its own beside the facts: as large as its column holds it, at most
 * 3rem — a figure of any length, in a column as narrow as the parties leave it, never runs into the facts. Its digits are
 * tabular, about 0.55em each with the unit (measured: „3.516.088,80 lei" fills 0.52em a character).
 */
const figureFit = (figure: string) => ({ '--figure-fit': `${(100 / (figure.length * 0.55)).toFixed(2)}cqw` }) as CSSProperties

function PurchaseValue({ purchase }: { readonly purchase: DirectPurchase }) {
  const done = isPurchase(purchase.outcome)
  const attempt = isAttempt(purchase.outcome)
  const unverified = purchase.unverifiedValue !== null ? leiExact(purchase.unverifiedValue) : null
  const figure = purchase.value !== null ? leiExact(purchase.value) : '—'
  return (
    <div className="@container min-w-0">
      <MonoLabel className="block text-muted-foreground">{done ? t`Valoarea, fără TVA` : attempt ? t`Oferta, fără TVA` : t`Valoarea din SEAP, fără TVA`}</MonoLabel>
      <p
        className={cn(
          'mt-3 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl md:text-[length:min(3rem,var(--figure-fit))]',
          attempt && 'text-muted-foreground line-through decoration-2',
        )}
        style={figureFit(figure)}
      >
        {figure}
      </p>
      {attempt ? <p className="mt-2 text-sm text-muted-foreground">{t`Nu s-a plătit: achiziția nu s-a făcut.`}</p> : null}
      {done && unverified ? <p className="mt-2 max-w-[40ch] text-sm text-muted-foreground">{t`SEAP publică ${unverified}, dar valoarea nu a trecut verificările platformei.`}</p> : null}
    </div>
  )
}

function Fact({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt>
        <MonoLabel className="text-muted-foreground">{label}</MonoLabel>
      </dt>
      <dd className="mt-2 text-sm leading-snug text-foreground">{children}</dd>
    </div>
  )
}

/** How it ended, in a word with its mark, and in a line under it: who accepted, who refused and why, or where SEAP has it from. */
function StatusText({ purchase }: { readonly purchase: DirectPurchase }) {
  const { outcome } = purchase
  const { Icon, tone } = statusLook(outcome)
  const detail = outcomeDetailText(outcome, purchase.family)
  return (
    <>
      <span className={cn('inline-flex items-center gap-1.5 font-semibold', outcome.kind === 'reported' || outcome.kind === 'unknown' ? 'text-foreground' : tone)}>
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {outcomeLabel(outcome)}
      </span>
      {detail ? <span className="mt-1 block text-muted-foreground">{detail}</span> : null}
    </>
  )
}

/**
 * The purchase's facts in one labelled grid: how it ended, when, the basket,
 * the category — and, only where they exist, the EU money and the
 * institution's estimate.
 */
/** The other date under the one the facts date the record by: an attempt's end, a purchase's start — only in their order (SEAP has a few ends before their start). */
function otherDateText(purchase: DirectPurchase, day: string): string | null {
  if (isAttempt(purchase.outcome)) {
    if (!purchase.finalized || purchase.finalized <= day) return null
    const ended = dayLong(purchase.finalized)
    return t`anulată pe ${ended}`
  }
  if (!purchase.published || purchase.published >= day) return null
  const started = dayLong(purchase.published)
  return t`pornită pe ${started}`
}

function PurchaseFacts({ purchase, className }: { readonly purchase: DirectPurchase; readonly className?: string }) {
  const detail = purchase.detail
  const day = shownDayOf(purchase)
  const items = detail?.items.length ?? 0
  const kind = contractTypeText(detail?.contractType ?? null)
  const other = day ? otherDateText(purchase, day) : null
  return (
    <dl className={cn('grid grid-cols-2 gap-x-8 gap-y-5', className)}>
      <Fact label={t`Starea`}>
        <StatusText purchase={purchase} />
      </Fact>
      {day ? (
        <Fact label={isAttempt(purchase.outcome) ? t`Data cererii` : t({ message: 'Data', context: 'day' })}>
          {dayLong(day)}
          {other ? <span className="mt-1 block text-muted-foreground">{other}</span> : null}
        </Fact>
      ) : null}
      <Fact label={t`Coșul`}>
        {items > 0 ? basketCount(items, detail?.contractType ?? null) : purchase.family === 'catalog' ? t`lista nu e încă preluată` : t`fără listă de produse în SEAP`}
        {kind ? <span className="mt-1 block text-muted-foreground">{kind}</span> : null}
      </Fact>
      {purchase.cpv ? (
        <Fact label={t`Categoria`}>
          {labelText(purchase.cpv.label) ?? t`Cod CPV`}
          <span className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground">CPV {purchase.cpv.code}</span>
        </Fact>
      ) : null}
      {detail?.euFund ? <Fact label={t`Finanțarea`}>{detail.euFund}</Fact> : null}
      {purchase.estimate !== null ? <Fact label={t`Estimarea instituției`}>{leiExact(purchase.estimate)}</Fact> : null}
    </dl>
  )
}

// ───────────────────────────────────────────── when there are no lines ──

/**
 * Where the lines would be, when there are none to show — four different
 * absences, each said as what it is: a family SEAP publishes as one row, a
 * page the platform has not read yet, a read that failed just now.
 */
function NoLines({ purchase }: { readonly purchase: DirectPurchase }) {
  const page = purchase.source.kind === 'page' ? purchase.source.url : null
  let text: ReactNode
  if (purchase.family === 'notification') {
    text = (
      <Trans>
        Achiziția a fost făcută în afara catalogului electronic, iar instituția a notificat-o în SEAP. O notificare are doar furnizorul, obiectul, codul CPV și valoarea: fără listă de
        produse, fără condiții de livrare sau plată.
      </Trans>
    )
  } else if (purchase.family === 'export') {
    text = (
      <Trans>
        SEAP are această achiziție în raportul trimestrial al achizițiilor directe, dar pagina ei din catalogul electronic nu e printre cele citite de Transparenta. Raportul are doar
        furnizorul, obiectul, codul CPV și valoarea: fără listă de produse, fără condiții.
      </Trans>
    )
  } else if (purchase.availability === 'TEMPORARILY_UNAVAILABLE') {
    text = <Trans>Transparenta nu poate citi acum lista de produse și condițiile acestei achiziții.</Trans>
  } else {
    text = <Trans>SEAP publică și lista de produse, pașii și condițiile acestei achiziții, dar Transparenta nu le-a preluat încă.</Trans>
  }
  return (
    <div className="max-w-[70ch] space-y-3 text-base leading-relaxed text-muted-foreground">
      <p>{text}</p>
      {page && purchase.family === 'catalog' ? (
        <p className="text-sm">
          <OutLink href={page}>{t`Vezi-le pe pagina achiziției din SEAP`}</OutLink>
        </p>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────── steps, terms, source ──

interface Step {
  readonly key: string
  readonly who: string
  readonly what: string
  readonly at: string | null
  readonly state: 'done' | 'failed' | 'not-reached'
  readonly reason: string | null
}

/**
 * The catalogue's three moves: the institution starts, the firm accepts its
 * conditions, the institution accepts the offer. For a record whose outcome
 * the page cannot read (its reasons withheld, or its end unsaid), each side
 * only answered, or has no answer in SEAP — never „accepted".
 */
function stepsOf(purchase: DirectPurchase): readonly Step[] {
  const detail = purchase.detail
  if (!detail) return []
  const { outcome } = purchase
  const start: Step = { key: 'start', who: t`Instituția`, what: t`a pornit achiziția din catalogul firmei`, at: purchase.published, state: 'done', reason: null }
  if (outcome.kind === 'stopped' || outcome.kind === 'unknown') {
    const answered = (key: string, at: string | null): Step => ({
      key,
      who: key === 'firm' ? t`Firma` : t`Instituția`,
      what: at ? t`a răspuns` : t`fără răspuns în SEAP`,
      at,
      state: at ? 'done' : 'not-reached',
      reason: null,
    })
    return [start, answered('firm', detail.firm.at), answered('institution', detail.institution.at)]
  }
  const firmFailed = outcome.kind === 'firm-refused' || outcome.kind === 'firm-late'
  const firm: Step = {
    key: 'firm',
    who: t`Firma`,
    what: outcome.kind === 'firm-refused' ? t`a refuzat condițiile` : outcome.kind === 'firm-late' ? t`nu a răspuns la timp` : t`a acceptat condițiile`,
    at: detail.firm.at ?? (outcome.kind === 'firm-late' ? detail.firm.deadline : null),
    state: firmFailed ? 'failed' : 'done',
    reason: outcome.kind === 'firm-refused' && outcome.reason ? reasonText(outcome.reason) : null,
  }
  const institutionFailed = outcome.kind === 'institution-refused' || outcome.kind === 'institution-late'
  const institution: Step = firmFailed
    ? { key: 'institution', who: t`Instituția`, what: t`nu a mai ajuns la ofertă`, at: null, state: 'not-reached', reason: null }
    : {
        key: 'institution',
        who: t`Instituția`,
        what: outcome.kind === 'institution-refused' ? t`a refuzat oferta` : outcome.kind === 'institution-late' ? t`nu a acceptat oferta la timp` : t`a acceptat oferta`,
        at: detail.institution.at ?? (outcome.kind === 'institution-late' ? detail.institution.deadline : null),
        state: institutionFailed ? 'failed' : 'done',
        reason: outcome.kind === 'institution-refused' && outcome.reason ? reasonText(outcome.reason) : null,
      }
  return [start, firm, institution]
}

/** The steps as a line of three: who, what, when — and how long after the start. */
function Steps({ purchase, className }: { readonly purchase: DirectPurchase; readonly className?: string }) {
  const steps = stepsOf(purchase)
  const start = purchase.published
  return (
    <ol className={cn('grid gap-6 sm:grid-cols-3 sm:gap-4', className)}>
      {steps.map((step, index) => (
        <li
          key={step.key}
          className={cn('border-t-2 pt-4', step.state === 'failed' ? 'border-amber-600' : step.state === 'not-reached' ? 'border-dashed border-border' : 'border-foreground/80')}
        >
          <MonoLabel className="block tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, '0')}
            {step.at ? ` · ${dayLong(step.at)}` : ''}
          </MonoLabel>
          <p className={cn('mt-2 text-sm leading-snug', step.state === 'not-reached' ? 'text-muted-foreground' : 'text-foreground')}>
            <span className="font-semibold">{step.who}</span> {step.what}
            {step.reason ? <>: {step.reason}</> : null}
          </p>
          {step.at && start && index > 0 ? <p className="mt-1 text-xs text-muted-foreground">{afterText(daysBetween(start, step.at))}</p> : null}
        </li>
      ))}
    </ol>
  )
}

/** A record SEAP publishes as one row: its dates in one sentence — an attempt's second date is its end, not a finalisation. */
function RowDates({ purchase, className }: { readonly purchase: DirectPurchase; readonly className?: string }) {
  const { published, finalized } = purchase
  if (published && finalized && published !== finalized) {
    const from = dayLong(published)
    const to = dayLong(finalized)
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {isAttempt(purchase.outcome) ? t`Publicată în SEAP pe ${from}, anulată pe ${to}.` : t`Publicată în SEAP pe ${from}, finalizată pe ${to}.`}
      </p>
    )
  }
  const day = finalized ?? published
  if (!day) return null
  const on = dayLong(day)
  return <p className={cn('text-sm text-muted-foreground', className)}>{t`Data din SEAP: ${on}.`}</p>
}

/** What the institution wrote about delivery and payment, as it wrote it. */
function Terms({ purchase, className }: { readonly purchase: DirectPurchase; readonly className?: string }) {
  const detail = purchase.detail
  if (!detail) return null
  const rows: { readonly key: string; readonly label: string; readonly value: string }[] = []
  if (detail.delivery) rows.push({ key: 'delivery', label: t`Livrarea`, value: detail.delivery })
  if (detail.payment) rows.push({ key: 'payment', label: t`Plata`, value: detail.payment })
  if (detail.documents > 0) {
    const documents = detail.documents
    rows.push({ key: 'documents', label: t`Documente`, value: t`${documents} pe pagina din SEAP` })
  }
  if (rows.length === 0) return null
  return (
    <dl className={cn('divide-y divide-border/70 border-y border-border/70', className)}>
      {rows.map((row) => (
        <div key={row.key} className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
          <dt>
            <MonoLabel className="text-muted-foreground">{row.label}</MonoLabel>
          </dt>
          <dd className="text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Where the record comes from, once for the page: its SEAP page, or the export file — and the other sources that publish it again. */
function SourceLine({ purchase, className }: { readonly purchase: DirectPurchase; readonly className?: string }) {
  const { source, code } = purchase
  const also = alsoInText(purchase.alsoIn)
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      <Trans>Sursa:</Trans>{' '}
      {source.kind === 'page' ? (
        <>
          <OutLink href={source.url}>{t`pagina achiziției pe e-licitatie.ro`}</OutLink>
          {code ? <>, {t`cod ${code}`}</> : null}.
        </>
      ) : source.kind === 'export' ? (
        <>
          {purchase.family === 'notification' ? t`notificările de atribuire SEAP` : t`raportul SEAP al achizițiilor directe`}
          {source.file ? `, ${source.file}` : ''} (<OutLink href={source.url}>{t`data.gov.ro, XLSX`}</OutLink>)
          {code ? <>, {t`cod ${code}`}</> : null}.
        </>
      ) : (
        <>
          {t`SEAP`}
          {code ? <>, {t`cod ${code}`}</> : null}.
        </>
      )}{' '}
      {also ? <>{also} </> : null}
      <Trans>Valorile sunt fără TVA.</Trans>
    </p>
  )
}

// ──────────────────────────────────────────────────────────── the block ──

export function DirectPurchaseBlock({ purchase, year, className }: { readonly purchase: DirectPurchase; readonly year: number | null; readonly className?: string }) {
  const detail = purchase.detail
  const hasLines = (detail?.items.length ?? 0) > 0
  return (
    <section className={className} aria-labelledby="direct-purchase-what">
      <h2 id="direct-purchase-what" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        <Trans>Ce s-a cumpărat</Trans>
      </h2>
      <PurchaseDescription purchase={purchase} className="mt-4" />
      {/* The value, its facts, and the two parties as the last column: across the frame, the reading below at its own width. */}
      <div className="mt-8 grid gap-x-12 gap-y-8 border-y py-7 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)_minmax(0,3fr)]">
        <PurchaseValue purchase={purchase} />
        <PurchaseFacts purchase={purchase} className="self-center" />
        <RecordParties
          authority={purchase.authority}
          supplier={purchase.supplier}
          year={linkYearOf(purchase)}
          className="border-t pt-7 md:col-span-2 lg:col-span-1 lg:grid-cols-1 lg:self-center lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0"
        />
      </div>
      <div className="max-w-4xl">
        <div className="mt-10">{hasLines ? <DirectPurchaseReceipt purchase={purchase} year={year} /> : <NoLines purchase={purchase} />}</div>
        {detail ? (
          <>
            <h3 className={cn(SUBHEAD, 'mt-14')}>
              <Trans>Cum s-a făcut</Trans>
            </h3>
            <Steps purchase={purchase} className="mt-5" />
            {detail.delivery || detail.payment || detail.documents > 0 ? (
              <>
                <h3 className={cn(SUBHEAD, 'mt-12')}>
                  <Trans>Livrarea și plata</Trans>
                </h3>
                <Terms purchase={purchase} className="mt-4" />
              </>
            ) : null}
          </>
        ) : (
          <RowDates purchase={purchase} className="mt-8" />
        )}
        <SourceLine purchase={purchase} className="mt-8" />
      </div>
    </section>
  )
}
