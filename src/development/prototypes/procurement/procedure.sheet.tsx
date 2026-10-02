import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { PartyName } from '@/features/procurement/components/direct-purchase/direct-purchase-head'
import { Clamp } from '@/features/procurement/components/direct-purchase/direct-purchase-receipt'
import { contractsCount, criterionText, frameworksCount, monthsCount, namesList, offersCount, offersFate, offersFrom } from '@/features/procurement/lib/contract-text'
import { dayLong, dayShort, labelText, leiExact, leiShort } from '@/features/procurement/lib/direct-purchase-text'
import { cn } from '@/lib/utils'
import { useRouteLabel } from './procedure.head'
import type { ProcedureSheet, PsContract, PsLot, PsNoticeRef } from './procedure.model'
import { gapFigure, gapText, lotsCount, noticeDelay, offersTotal, priceWeight, republishedNote, sameCriteria, signedWhen, statusLabel } from './procedure.text'

/**
 * The procedure, section by section (the contract page's sheet, §17.6): the
 * value against the institution's estimate with the facts under it and the
 * parties beside them; then — each only where it says something — the lots,
 * how the offers were scored, the calendar from the call to the award notice,
 * the contracts, the rows SEAP links here by mistake, the source.
 */

export const SUBHEAD = 'text-base font-semibold tracking-tight text-foreground sm:text-lg'
const LEDE = 'mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground'
const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const INLINE_LINK = 'underline decoration-border underline-offset-4 hover:decoration-foreground'

const raisedFirst = (text: string) => text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)

function ExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
    </a>
  )
}

/** Another notice of the procedure: its page when the API has its row, its number otherwise. */
export function NoticeLink({ notice, current }: { readonly notice: PsNoticeRef; readonly current: string }) {
  if (!notice.id || notice.id === current) return <span className="font-mono tabular-nums">{notice.no}</span>
  return (
    <Link to="/procurement/procedures/$id" params={{ id: notice.id }} className={cn('font-mono tabular-nums', INLINE_LINK)}>
      {notice.no}
    </Link>
  )
}

// ─────────────────────────────────────────────────── the value and facts ──

function figureSize(figure: string): string {
  if (figure.length <= 12) return 'text-5xl sm:text-6xl'
  if (figure.length <= 16) return 'text-4xl sm:text-6xl'
  return 'text-3xl min-[420px]:text-4xl sm:text-6xl'
}

function ProcedureValue({ sheet }: { readonly sheet: ProcedureSheet }) {
  const vat = sheet.vatExcluded
  const call = sheet.kind === 'call'
  const value = call ? sheet.estimate : sheet.awarded
  const base = call ? t`Valoarea estimată` : sheet.framework ? t`Valoarea maximă a acordurilor-cadru` : t`Valoarea atribuită`
  const label = vat && value !== null ? t`${base}, fără TVA` : base
  const figure = value !== null ? leiExact(value) : '—'
  const notes: string[] = []
  if (!call) {
    const gap = gapText(sheet.estimate, sheet.awarded)
    const estimate = sheet.estimate !== null ? leiExact(sheet.estimate) : ''
    if (gap) notes.push(gapFigure(sheet.estimate, sheet.awarded) === '±0%' ? t`Cât a estimat instituția: ${estimate}.` : raisedFirst(t`${gap}: instituția estimase ${estimate}.`))
    if (sheet.lotsCancelled > 0) {
      const cancelled = lotsCount(sheet.lotsCancelled)
      notes.push(t`Pe loturile atribuite: ${cancelled} s-au anulat.`)
    }
    if (sheet.awarded === null) notes.push(t`SEAP nu publică o valoare verificată a procedurii.`)
  } else if (value === null) {
    notes.push(t`Anunțul nu are o valoare estimată.`)
  }
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">{label}</MonoLabel>
      <p className={cn('mt-3 font-semibold tabular-nums tracking-tight', figureSize(figure), value === null ? 'text-muted-foreground' : 'text-foreground')}>{figure}</p>
      {notes.map((note) => (
        <p key={note} className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          {note}
        </p>
      ))}
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

/** The lots' offers, said once: a single lot's in full, many lots' as a total and how many had one. */
function OffersFact({ sheet }: { readonly sheet: ProcedureSheet }) {
  const offers = sheet.offers
  if (!offers) return null
  const only = sheet.lots.find((lot) => lot.offers !== null && lot.status === 'awarded')
  if (offers.lots === 1 && only?.offers) {
    const fate = offersFate(only.offers)
    const from = offersFrom(only.offers)
    return (
      <Fact label={t`Oferte primite`}>
        {raisedFirst(offersCount(only.offers.received))}
        {fate ? <span className="mt-1 block text-muted-foreground">{fate}</span> : null}
        {from ? <span className="mt-1 block text-muted-foreground">{from}</span> : null}
      </Fact>
    )
  }
  const lots = lotsCount(offers.lots)
  const single = offers.single > 0 ? plural(offers.single, { one: 'un lot cu o singură ofertă', few: '# loturi cu o singură ofertă', other: '# de loturi cu o singură ofertă' }) : null
  return (
    <Fact label={t`Oferte primite`}>
      {raisedFirst(offersTotal(offers.received))}
      <span className="mt-1 block text-muted-foreground">{t`pe ${lots} atribuite`}</span>
      {single ? <span className="mt-1 block text-muted-foreground">{single}</span> : null}
    </Fact>
  )
}

function CriterionFact({ sheet }: { readonly sheet: ProcedureSheet }) {
  const lots = sheet.lots.filter((lot) => lot.criterion)
  const first = lots[0]
  if (!first?.criterion) return null
  const same = lots.every((lot) => lot.criterion === first.criterion)
  const weight = same && sameCriteria(lots) ? priceWeight(first) : null
  return (
    <Fact label={t`Criteriul de atribuire`}>
      {same ? raisedFirst(criterionText(first.criterion)) : t`Diferă de la lot la lot`}
      {weight !== null ? <span className="mt-1 block text-muted-foreground">{t`prețul cântărește ${weight}%`}</span> : null}
    </Fact>
  )
}

/** The lots' duration, when every lot runs as long. */
function durationOf(sheet: ProcedureSheet): number | null {
  const months = sheet.lots.map((lot) => lot.months).filter((value): value is number => value !== null)
  return months.length > 0 && months.every((value) => value === months[0]) ? months[0]! : null
}

/** How many facts the grid holds: one per cell `ProcedureFacts` renders, three to a row. */
function factsCount(sheet: ProcedureSheet): number {
  return [sheet.procedureType, sheet.unpublished || sheet.call, sheet.kind === 'award', sheet.awardNotice, sheet.offers, sheet.lots.some((lot) => lot.criterion), sheet.cpv, durationOf(sheet) !== null].filter(Boolean).length
}

function ProcedureFacts({ sheet, className }: { readonly sheet: ProcedureSheet; readonly className?: string }) {
  const route = useRouteLabel(sheet.procedureType)
  const category = sheet.cpv ? labelText(sheet.cpv.label) : null
  const duration = durationOf(sheet)
  const delay = noticeDelay(sheet)
  const tedNo = sheet.ted?.no ?? ''
  const call = sheet.call
  const callState = sheet.kind === 'award' && call?.status && call.status !== 'awarded' && call.status !== 'unknown' ? statusLabel(call.status) : null
  return (
    <dl className={cn('grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3', className)}>
      {route ? (
        <Fact label={t`Procedura`}>
          {route}
          {sheet.legislation ? <span className="mt-1 block text-muted-foreground">{sheet.legislation}</span> : null}
          {sheet.ted ? (
            <span className="mt-1 block text-muted-foreground">
              <Trans>
                publicată și în{' '}
                <a href={sheet.ted.url} target="_blank" rel="noreferrer" title={`TED ${tedNo}`} className={cn('whitespace-nowrap hover:text-foreground', INLINE_LINK)}>
                  Jurnalul UE
                </a>
              </Trans>
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> {t`(TED ${tedNo}, se deschide într-o filă nouă)`}</span>
            </span>
          ) : null}
        </Fact>
      ) : null}
      {sheet.unpublished ? (
        <Fact label={t`Anunțul de participare`}>
          {t`Niciunul`}
          <span className="mt-1 block text-muted-foreground">{t`negociere fără anunț prealabil: motivul, mai jos`}</span>
        </Fact>
      ) : call ? (
        <Fact label={t`Anunțul de participare`}>
          <NoticeLink notice={call} current={sheet.id} />
          {call.date ? <span className="mt-1 block text-muted-foreground">{dayLong(call.date)}</span> : null}
          {callState ? <span className="mt-1 block text-muted-foreground">{t`rândul lui în SEAP: ${callState}`}</span> : null}
        </Fact>
      ) : null}
      {sheet.kind === 'award' ? (
        <Fact label={sheet.framework ? t`Acordurile-cadru, încheiate` : sheet.contracts.length === 1 ? t`Contractul, încheiat` : t`Contractele, încheiate`}>{raisedFirst(signedWhen(sheet.contractsSpan))}</Fact>
      ) : null}
      {sheet.awardNotice ? (
        <Fact label={t`Anunțul de atribuire`}>
          {dayLong(sheet.awardNotice.first)}
          {delay ? <span className="mt-1 block text-muted-foreground">{delay}</span> : null}
          {sheet.awardNotice.republished > 0 ? <span className="mt-1 block text-muted-foreground">{republishedNote(sheet.awardNotice.republished, sheet.awardNotice.last)}</span> : null}
        </Fact>
      ) : null}
      <OffersFact sheet={sheet} />
      <CriterionFact sheet={sheet} />
      {sheet.cpv ? (
        <Fact label={t`Categoria`}>
          {category ?? t`Cod CPV`}
          <span className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground">CPV {sheet.cpv.code}</span>
        </Fact>
      ) : null}
      {duration !== null ? <Fact label={t`Durata`}>{raisedFirst(monthsCount(duration))}</Fact> : null}
    </dl>
  )
}

/** The buyer and the firms that won, beside the facts on a wide screen. */
function ProcedureParties({ sheet, className }: { readonly sheet: ProcedureSheet; readonly className?: string }) {
  const firms = [...new Map(sheet.contracts.flatMap((contract) => contract.firms).map((firm) => [firm.cui ?? firm.name, firm])).values()]
  const shown = firms.slice(0, 4)
  const more = firms.length - shown.length
  return (
    <dl className={cn('grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:row-span-full lg:grid-rows-subgrid lg:gap-y-6', className)}>
      <div className="min-w-0">
        <dt>
          <MonoLabel className="text-muted-foreground">{t`Cumpărătorul`}</MonoLabel>
        </dt>
        <dd className="mt-2 text-sm font-medium leading-snug">
          <PartyName party={sheet.authority} role="authority" year={sheet.year} />
          {sheet.authority.cui ? <span className="mt-1 block font-mono text-xs font-normal tabular-nums text-muted-foreground">CUI {sheet.authority.cui}</span> : null}
        </dd>
      </div>
      {/* From the facts' second row on (as `RecordParties` with `rows`). */}
      {firms.length > 0 ? (
        <div className="min-w-0 lg:row-start-2 lg:row-end-[-1]">
          <dt>
            <MonoLabel className="text-muted-foreground">{firms.length === 1 ? t`Câștigătorul` : t`Câștigătorii`}</MonoLabel>
          </dt>
          <dd className="mt-2 space-y-2 text-sm font-medium leading-snug">
            {shown.map((firm) => (
              <span key={firm.cui ?? firm.name} className="block">
                <PartyName party={firm} role="supplier" year={sheet.year} />
                {firm.sme ? <MonoLabel className="ml-2 text-muted-foreground">{t`IMM`}</MonoLabel> : null}
              </span>
            ))}
            {more > 0 ? <span className="block font-normal text-muted-foreground">{plural(more, { one: 'și încă o firmă', few: 'și încă # firme', other: 'și încă # de firme' })}</span> : null}
          </dd>
        </div>
      ) : null}
    </dl>
  )
}

// ──────────────────────────────────────────────────────────────── lots ──

function lotFirms(lot: PsLot): string {
  return namesList([...new Set(lot.contracts.flatMap((contract) => contract.firms.map((firm) => firm.name)))])
}

/** One lot: its number and title, who won it on how many offers; its value against its estimate. */
function LotRow({ lot }: { readonly lot: PsLot }) {
  const cancelled = lot.status === 'cancelled'
  const firms = lotFirms(lot)
  const offers = lot.offers ? offersCount(lot.offers.received) : null
  const fate = lot.offers ? offersFate(lot.offers) : null
  const gap = gapFigure(lot.estimate, lot.value)
  const estimate = lot.estimate !== null ? leiShort(lot.estimate) : null
  return (
    <li className={cn('grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 py-3.5 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,11rem)] sm:gap-x-6', cancelled && 'text-muted-foreground')}>
      <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{t`lot ${lot.no}`}</MonoLabel>
      <div className="min-w-0">
        <p className={cn('line-clamp-2', cancelled ? 'text-muted-foreground' : 'text-foreground')} title={lot.title ?? undefined}>
          {lot.title ?? t`Lotul ${lot.no}`}
        </p>
        <p className="mt-1 text-muted-foreground">
          {cancelled ? t`Anulat` : firms || t`fără câștigător publicat`}
          {!cancelled && offers ? ` · ${offers}${fate ? ` (${fate})` : ''}` : ''}
        </p>
      </div>
      <div className="col-start-2 mt-1 text-left sm:col-start-auto sm:mt-0 sm:text-right">
        <p className={cn('tabular-nums', cancelled || lot.value === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{cancelled ? '—' : lot.value !== null ? leiShort(lot.value) : '—'}</p>
        {estimate ? (
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {gap && !cancelled ? `${gap} · ` : ''}
            {t`estimat ${estimate}`}
          </p>
        ) : null}
      </div>
    </li>
  )
}

export function ProcedureLots({ sheet, className, limit = 8 }: { readonly sheet: ProcedureSheet; readonly className?: string; readonly limit?: number }) {
  const [open, setOpen] = useState(false)
  if (sheet.lotsTotal < 2) return null
  const shown = open ? sheet.lots : sheet.lots.slice(0, limit)
  const total = lotsCount(sheet.lotsTotal)
  const cancelledText = sheet.lotsCancelled > 0 ? plural(sheet.lotsCancelled, { one: 'unul s-a anulat', few: '# s-au anulat', other: '# s-au anulat' }) : null
  const all = sheet.lotsTotal
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{t`Loturile`}</h3>
      <p className={LEDE}>
        {cancelledText ? t`Procedura are ${total}; ${cancelledText}.` : t`Procedura are ${total}, toate atribuite.`}{' '}
        {sheet.framework ? t`Pe fiecare, valoarea e cea maximă a acordului-cadru.` : null}
      </p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {shown.map((lot) => (
          <LotRow key={lot.no} lot={lot} />
        ))}
      </ol>
      {sheet.lots.length > limit ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className={cn(OUT_LINK, 'mt-3 text-sm')} aria-expanded={open}>
          {open ? t`Mai puține` : t`Toate cele ${all}`}
        </button>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── criteria ──

/** How the offers were scored, when price was not all: the weights as one bar, then their names. */
export function ProcedureCriteria({ sheet, className }: { readonly sheet: ProcedureSheet; readonly className?: string }) {
  const lots = sheet.lots.filter((lot) => lot.criteria.length > 1)
  const first = lots[0]
  if (!first) return null
  const same = sameCriteria(lots)
  const total = first.criteria.reduce((sum, criterion) => sum + (criterion.weight ?? 0), 0) || 100
  const criteria = [...first.criteria].sort((a, b) => Number(b.price) - Number(a.price) || (b.weight ?? 0) - (a.weight ?? 0))
  const lotNo = first.no
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{t`Cum s-au punctat ofertele`}</h3>
      <p className={LEDE}>
        {sheet.lotsTotal > 1 ? (same ? t`La fel pe fiecare lot.` : t`Pe lotul ${lotNo}; celelalte loturi au alte ponderi.`) : null} {t`Din 100 de puncte:`}
      </p>
      <div className="mt-4 flex h-3 w-full gap-px overflow-hidden" aria-hidden="true">
        {criteria.map((criterion) => (
          <span key={criterion.name} className={criterion.price ? 'bg-foreground' : 'bg-muted-foreground/35'} style={{ width: `${((criterion.weight ?? 0) / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 divide-y divide-border/70 border-y border-border/70 text-sm">
        {criteria.map((criterion) => (
          <li key={criterion.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-2">
            <span className={cn('min-w-0', criterion.price ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              <span className={cn('mr-2 inline-block size-2.5 align-baseline', criterion.price ? 'bg-foreground' : 'bg-muted-foreground/35')} aria-hidden="true" />
              {raisedFirst(criterion.name.trim().toLocaleLowerCase('ro-RO'))}
            </span>
            <span className="tabular-nums text-foreground">{criterion.weight ?? '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── calendar ──

interface Step {
  readonly key: string
  readonly when: string | null
  readonly title: string
  readonly body: ReactNode
  readonly value: number | null
  readonly mark?: boolean
}

function stepsOf(sheet: ProcedureSheet): Step[] {
  const steps: Step[] = []
  const call = sheet.call
  if (call) {
    const estimate = call.estimate !== null ? leiExact(call.estimate) : null
    steps.push({
      key: 'call',
      when: call.date,
      title: t`Anunțul de participare, publicat`,
      body: (
        <>
          <NoticeLink notice={call} current={sheet.id} />
          {estimate ? <span className="block">{t`estimat la ${estimate}`}</span> : null}
        </>
      ),
      value: null,
      mark: sheet.kind === 'call',
    })
  }
  if (sheet.unpublished) {
    const named = sheet.reason?.names ?? null
    steps.push({
      key: 'no-call',
      when: sheet.contractsSpan?.from ?? null,
      title: t`Fără anunț de participare`,
      body: sheet.reason?.text ? (
        <figure>
          <figcaption>
            {t`Instituția a explicat așa`}
            {named ? (
              <>
                {' '}
                ({t`despre`} <NoticeLink notice={named} current={sheet.id} />
                {named.status ? `, ${statusLabel(named.status)}` : ''})
              </>
            ) : null}
            :
          </figcaption>
          <blockquote className="mt-1 border-l-2 border-border pl-3 text-foreground">
            <Clamp text={`„${sheet.reason.text}”`} lines={3} />
          </blockquote>
        </figure>
      ) : sheet.reason?.urgency ? (
        t`Motivul invocat: urgența.`
      ) : null,
      value: null,
    })
  }
  if (sheet.kind === 'award' && sheet.contractsSpan) {
    const span = sheet.contractsSpan
    const many = sheet.contracts.length > 1
    steps.push({
      key: 'signed',
      when: span.from,
      title: sheet.framework ? (many ? t`Primele acorduri-cadru, încheiate` : t`Acordul-cadru, încheiat`) : many ? t`Primul contract, încheiat` : t`Contractul, încheiat`,
      body: many ? null : <span className="block">{namesList(sheet.contracts[0]!.firms.map((firm) => firm.name))}</span>,
      value: many ? null : sheet.awarded,
      mark: true,
    })
    if (span.to !== span.from) {
      const count = sheet.framework ? frameworksCount(sheet.contracts.length) : contractsCount(sheet.contracts.length)
      steps.push({ key: 'signed-last', when: span.to, title: sheet.framework ? t`Ultimul acord-cadru, încheiat` : t`Ultimul contract, încheiat`, body: <span className="block">{t`${count} în total`}</span>, value: sheet.awarded })
    }
  }
  if (sheet.awardNotice) {
    const delay = noticeDelay(sheet)
    steps.push({
      key: 'award',
      when: sheet.awardNotice.first,
      title: t`Anunțul de atribuire, publicat`,
      body: (
        <>
          {sheet.noticeNo ? <span className="font-mono tabular-nums">{sheet.noticeNo}</span> : null}
          {delay ? <span className="block">{raisedFirst(delay)}</span> : null}
          {sheet.awardNotice.republished > 0 ? <span className="block">{raisedFirst(republishedNote(sheet.awardNotice.republished, sheet.awardNotice.last))}</span> : null}
        </>
      ),
      value: null,
    })
  }
  if (sheet.namedBy) {
    const named = sheet.namedBy
    const awarded = named.awarded !== null ? leiExact(named.awarded) : null
    steps.push({
      key: 'named-by',
      when: null,
      title: t`Între timp, o negociere fără anunț`,
      body: (
        <>
          <NoticeLink notice={named.notice} current={sheet.id} />
          {awarded ? <span className="block">{t`atribuită pentru ${awarded}`}</span> : null}
          {named.text ? (
            <blockquote className="mt-1 border-l-2 border-border pl-3 text-foreground">
              <Clamp text={`„${named.text}”`} lines={3} />
            </blockquote>
          ) : null}
        </>
      ),
      value: null,
    })
  }
  const order = (step: Step) => step.when ?? '9999'
  const sorted = steps.map((step, index) => ({ step, index })).sort((a, b) => order(a.step).localeCompare(order(b.step)) || a.index - b.index)
  const result = sorted.map(({ step }) => step)
  if (sheet.kind === 'call') result.push({ key: 'status', when: null, title: raisedFirst(statusLabel(sheet.status)), body: null, value: null })
  return result
}

/** „Calendarul": the procedure's notices and contracts in the order they happened. */
export function ProcedureCalendar({ sheet, className }: { readonly sheet: ProcedureSheet; readonly className?: string }) {
  const steps = stepsOf(sheet)
  if (steps.length < 2) return null
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{t`Calendarul procedurii`}</h3>
      <ol className="mt-6 border-l border-border pl-6">
        {steps.map((step) => (
          <li key={step.key} className="relative pb-7 last:pb-0">
            <span className={cn('absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-background', step.mark ? 'bg-primary' : 'bg-foreground')} aria-hidden="true" />
            <MonoLabel className="block tabular-nums text-muted-foreground">{step.when ? dayLong(step.when) : step.key === 'status' ? t`azi` : t`fără dată`}</MonoLabel>
            <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 text-sm font-semibold text-foreground">
              <span>{step.title}</span>
              {step.value !== null ? <span className="tabular-nums">{leiExact(step.value)}</span> : null}
            </p>
            {step.body ? <div className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{step.body}</div> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── contracts ──

function ContractRow({ contract }: { readonly contract: PsContract }) {
  const names = namesList(contract.firms.map((firm) => firm.name))
  const number = contract.no
  const lotList = contract.lots.join(', ')
  const lots = contract.lots.length > 0 ? (contract.lots.length === 1 ? t`lotul ${lotList}` : t`loturile ${lotList}`) : null
  const values = contract.values.length > 1 ? contract.values.map((value) => leiShort(value)).join(' · ') : null
  const body = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-foreground" title={names}>
          {names || t`fără firmă publicată`}
        </span>
        <MonoLabel className="mt-1 block text-muted-foreground">
          {number ? t`nr. ${number}` : t`fără număr`}
          {contract.date ? ` · ${dayShort(contract.date)}` : ''}
          {lots ? ` · ${lots}` : ''}
        </MonoLabel>
      </span>
      <span className={cn('text-right tabular-nums sm:whitespace-nowrap', contract.value === null ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
        {values ?? (contract.value !== null ? leiExact(contract.value) : '—')}
      </span>
    </>
  )
  return (
    <li>
      {contract.linkId ? (
        <Link to="/procurement/contracts/$id" params={{ id: contract.linkId }} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3 text-sm transition-colors hover:text-primary">
          {body}
        </Link>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3 text-sm">{body}</div>
      )}
    </li>
  )
}

export function ProcedureContracts({ sheet, className, limit = 6 }: { readonly sheet: ProcedureSheet; readonly className?: string; readonly limit?: number }) {
  const [open, setOpen] = useState(false)
  if (sheet.contracts.length === 0) return null
  const shown = open ? sheet.contracts : sheet.contracts.slice(0, limit)
  const all = sheet.contracts.length
  const count = sheet.framework ? frameworksCount(all) : contractsCount(all)
  const firms = plural(sheet.firmsCount, { one: 'o firmă', few: '# firme', other: '# de firme' })
  const counted = raisedFirst(count)
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{sheet.framework ? t`Acordurile-cadru` : all === 1 ? t`Contractul` : t`Contractele`}</h3>
      <p className={LEDE}>
        {sheet.contractsCapped ? t`Cel puțin ${count}, cu ${firms}: API-ul dă primele 50 de rânduri ale anunțului și niciun total.` : t`${counted}, cu ${firms}.`}{' '}
        {sheet.read === 'today' ? t`Un rând e o firmă: o asociere apare de atâtea ori câte firme are.` : null}
      </p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {shown.map((contract) => (
          <ContractRow key={contract.key} contract={contract} />
        ))}
      </ol>
      {all > limit ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className={cn(OUT_LINK, 'mt-3 text-sm')} aria-expanded={open}>
          {open ? t`Mai puține` : t`Toate cele ${all}`}
        </button>
      ) : null}
    </div>
  )
}

/** The call-offs the award notice reports on its frameworks: what the institution has bought under them, apart from the ceilings. */
export function ProcedureCallOffs({ sheet, className, limit = 4 }: { readonly sheet: ProcedureSheet; readonly className?: string; readonly limit?: number }) {
  const [open, setOpen] = useState(false)
  if (sheet.callOffs.length === 0) return null
  const shown = open ? sheet.callOffs : sheet.callOffs.slice(0, limit)
  const all = sheet.callOffs.length
  const count = plural(all, { one: 'un contract subsecvent', few: '# contracte subsecvente', other: '# de contracte subsecvente' })
  const values = sheet.callOffs.map((contract) => contract.value)
  const total = values.every((value) => value !== null) ? leiExact(values.reduce<number>((sum, value) => sum + (value ?? 0), 0)) : null
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{t`Contractele subsecvente`}</h3>
      <p className={LEDE}>
        {total ? t`Anunțul mai raportează ${count}, de ${total} în total: ce a cumpărat instituția prin acordurile-cadru, până la publicarea lui. Nu se adună la valoarea lor maximă.` : t`Anunțul mai raportează ${count}: ce a cumpărat instituția prin acordurile-cadru, până la publicarea lui.`}
      </p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {shown.map((contract) => (
          <ContractRow key={contract.key} contract={contract} />
        ))}
      </ol>
      {all > limit ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className={cn(OUT_LINK, 'mt-3 text-sm')} aria-expanded={open}>
          {open ? t`Mai puține` : t`Toate cele ${all}`}
        </button>
      ) : null}
    </div>
  )
}

/** Rows SEAP links to the notice that another institution signed: said, listed apart, counted nowhere. */
export function ProcedureForeign({ sheet, className }: { readonly sheet: ProcedureSheet; readonly className?: string }) {
  if (sheet.foreign.length === 0) return null
  const notice = sheet.noticeNo ?? ''
  const count = contractsCount(sheet.foreign.length)
  return (
    <div className={cn('border-l-2 border-amber-600/60 pl-4 dark:border-amber-400/60', className)}>
      <h3 className={SUBHEAD}>{t`Contracte legate greșit de acest anunț`}</h3>
      <p className={LEDE}>{t`SEAP leagă de anunțul nr. ${notice} ${count} ale altor instituții: le potrivește doar după număr, iar numerele vechi se repetă. Nu țin de această procedură și nu sunt numărate aici.`}</p>
      <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {sheet.foreign.map((row) => (
          <li key={row.id}>
            <Link to="/procurement/contracts/$id" params={{ id: row.id }} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3 text-sm text-muted-foreground transition-colors hover:text-primary">
              <span className="min-w-0">
                <span className="block truncate">{namesList([row.authority.name, row.supplier.name])}</span>
                <MonoLabel className="mt-1 block">
                  {row.no ? t`nr. ${row.no}` : t`fără număr`}
                  {row.date ? ` · ${dayShort(row.date)}` : ''}
                </MonoLabel>
              </span>
              <span className="tabular-nums">{row.value !== null ? leiShort(row.value) : '—'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProcedureSource({ sheet, className }: { readonly sheet: ProcedureSheet; readonly className?: string }) {
  const source = sheet.source
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      <Trans>Sursa:</Trans>{' '}
      {source.kind === 'notice' ? (
        <ExternalLink href={source.url}>{t`anunțul de atribuire pe e-licitatie.ro`}</ExternalLink>
      ) : (
        <>
          {t`rândul anunțului în raportul SEAP`}
          {source.file ? `, ${source.file}` : ''}
          {source.url ? (
            <>
              {' '}
              (<ExternalLink href={source.url}>{t`data.gov.ro`}</ExternalLink>)
            </>
          ) : null}
        </>
      )}
      .{sheet.vatExcluded ? ` ${t`Valorile anunțului sunt fără TVA.`}` : null}
    </p>
  )
}

// ───────────────────────────────────────────────────────────── the block ──

/** The value and facts, the parties beside them: the box every record page opens on. */
export function ProcedureBox({ sheet }: { readonly sheet: ProcedureSheet }) {
  return (
    <div className="mt-8 border-y py-7">
      <ProcedureValue sheet={sheet} />
      {/* The facts and the parties on the same rows (the contract page's box): the buyer level with the first row of facts. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:gap-x-12 lg:gap-y-6" style={{ gridTemplateRows: `repeat(${Math.max(2, Math.ceil(factsCount(sheet) / 3))}, auto)` }}>
        <ProcedureFacts sheet={sheet} className="mt-7 min-w-0 border-t pt-7 lg:row-span-full lg:grid-rows-subgrid" />
        <ProcedureParties sheet={sheet} className="mt-7 border-t pt-7 lg:grid-cols-1 lg:border-l lg:border-t-transparent lg:pl-12" />
      </div>
    </div>
  )
}

export function ProcedureBlock({ sheet, className, withLots = true }: { readonly sheet: ProcedureSheet; readonly className?: string; readonly withLots?: boolean }) {
  return (
    <section className={className} aria-labelledby="procedure-block">
      <h2 id="procedure-block" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {sheet.kind === 'call' ? <Trans>Ce s-a cerut</Trans> : <Trans>Ce s-a atribuit</Trans>}
      </h2>
      <ProcedureBox sheet={sheet} />
      <div className="max-w-4xl">
        {withLots ? <ProcedureLots sheet={sheet} className="mt-12" /> : null}
        <ProcedureCriteria sheet={sheet} className="mt-12" />
        <ProcedureCalendar sheet={sheet} className="mt-12" />
        <ProcedureContracts sheet={sheet} className="mt-12" />
        <ProcedureCallOffs sheet={sheet} className="mt-12" />
        <ProcedureForeign sheet={sheet} className="mt-12" />
        <ProcedureSource sheet={sheet} className="mt-10" />
      </div>
    </section>
  )
}
