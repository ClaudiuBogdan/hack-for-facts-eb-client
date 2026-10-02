import { useState } from 'react'
import { plural, t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { CtOffers } from '@/features/procurement/lib/contract-model'
import { namesList } from '@/features/procurement/lib/contract-text'
import { leiShort } from '@/features/procurement/lib/direct-purchase-text'
import { cn } from '@/lib/utils'
import type { ProcedureSheet, PsLot } from './procedure.model'
import { gapFigure, gapText, lotsCount } from './procedure.text'
import { SUBHEAD } from './procedure.sheet'

/**
 * „Concurența" — the competition first (`concurenta`): four figures (the
 * offers, the lots, the lots one firm alone offered for, the award against
 * the estimate), then each lot on one row — a mark per offer, filled when
 * admitted, faded when rejected, hollow when withdrawn — and its value
 * against its estimate on one bar.
 */

const PIP = 'inline-block size-2.5 shrink-0'
const PIPS_SHOWN = 12

function Pips({ offers }: { readonly offers: CtOffers }) {
  const admitted = offers.admitted ?? 0
  const rejected = (offers.unaccepted ?? 0) + (offers.nonconformed ?? 0)
  const withdrawn = offers.withdrawn ?? 0
  const pips = [...Array.from({ length: admitted }, () => 'admitted'), ...Array.from({ length: rejected }, () => 'rejected'), ...Array.from({ length: withdrawn }, () => 'withdrawn')]
  const shown = pips.slice(0, PIPS_SHOWN)
  return (
    <span className="flex flex-wrap items-center gap-1" aria-hidden="true">
      {shown.map((kind, index) => (
        <span key={index} className={cn(PIP, kind === 'admitted' ? 'bg-foreground' : kind === 'rejected' ? 'bg-muted-foreground/35' : 'border border-muted-foreground/70')} />
      ))}
      {pips.length > PIPS_SHOWN ? <span className="text-xs text-muted-foreground">+{pips.length - PIPS_SHOWN}</span> : null}
    </span>
  )
}

/** What the marks say, for a screen reader and on hover. */
function offersLabel(offers: CtOffers): string {
  const received = plural(offers.received, { one: 'o ofertă', few: '# oferte', other: '# de oferte' })
  const rejected = (offers.unaccepted ?? 0) + (offers.nonconformed ?? 0)
  const parts = [
    offers.admitted ? plural(offers.admitted, { one: '# admisă', few: '# admise', other: '# de admise' }) : null,
    rejected ? plural(rejected, { one: '# respinsă', few: '# respinse', other: '# de respinse' }) : null,
    offers.withdrawn ? plural(offers.withdrawn, { one: '# retrasă', few: '# retrase', other: '# de retrase' }) : null,
  ].filter(Boolean)
  const fates = parts.join(', ')
  return fates ? t`${received}: ${fates}` : received
}

/** The lot's value against its estimate: the estimate the track, the value its fill, both on the larger's scale. */
function EstimateBar({ lot }: { readonly lot: PsLot }) {
  if (lot.estimate === null || lot.value === null) return null
  const scale = Math.max(lot.estimate, lot.value)
  const over = lot.value > lot.estimate
  return (
    <span className="relative block h-2 w-full bg-muted" aria-hidden="true">
      <span className={cn('absolute inset-y-0 left-0', over ? 'bg-amber-600/80 dark:bg-amber-400/80' : 'bg-foreground/80')} style={{ width: `${(lot.value / scale) * 100}%` }} />
      <span className="absolute -inset-y-1 w-px bg-foreground" style={{ left: `${(lot.estimate / scale) * 100}%` }} />
    </span>
  )
}

function CompetitionRow({ lot, single }: { readonly lot: PsLot; readonly single: boolean }) {
  const cancelled = lot.status === 'cancelled'
  const firms = namesList([...new Set(lot.contracts.flatMap((contract) => contract.firms.map((firm) => firm.name)))])
  const gap = gapFigure(lot.estimate, lot.value)
  const label = lot.offers ? offersLabel(lot.offers) : null
  const lotEstimate = lot.estimate !== null ? leiShort(lot.estimate) : null
  return (
    <li className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 py-4 text-sm md:grid-cols-[minmax(0,1.4fr)_9rem_minmax(0,1fr)] md:items-center', cancelled && 'text-muted-foreground')}>
      <div className="min-w-0">
        {single ? null : <MonoLabel className="block tabular-nums text-muted-foreground">{t`lot ${lot.no}`}</MonoLabel>}
        <p className={cn('mt-1 truncate', cancelled ? 'text-muted-foreground' : 'text-foreground')} title={lot.title ?? undefined}>
          {lot.title ?? (single ? firms : t`Lotul ${lot.no}`)}
        </p>
        {!single || lot.title ? <p className="mt-0.5 truncate text-muted-foreground">{cancelled ? t`Anulat` : firms || t`fără câștigător publicat`}</p> : null}
      </div>
      <div className="justify-self-end md:justify-self-start" title={label ?? undefined}>
        {lot.offers ? (
          <>
            <Pips offers={lot.offers} />
            <span className="sr-only">{label}</span>
            <span className="mt-1 block text-xs tabular-nums text-muted-foreground md:hidden">{label}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{cancelled ? '—' : t`oferte nepublicate`}</span>
        )}
      </div>
      <div className="col-span-2 min-w-0 md:col-span-1">
        {cancelled ? null : (
          <>
            <EstimateBar lot={lot} />
            <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{lot.value !== null ? leiShort(lot.value) : '—'}</span>
              <span>
                {gap ? `${gap} · ` : ''}
                {lotEstimate ? t`estimat ${lotEstimate}` : t`fără estimare`}
              </span>
            </p>
          </>
        )}
      </div>
    </li>
  )
}

function Figure({ label, value, note }: { readonly label: string; readonly value: string; readonly note?: string | null }) {
  return (
    <div className="min-w-0 border-t pt-4">
      <MonoLabel className="block text-muted-foreground">{label}</MonoLabel>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">{value}</p>
      {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  )
}

export function ProcedureCompetition({ sheet, className, limit = 12 }: { readonly sheet: ProcedureSheet; readonly className?: string; readonly limit?: number }) {
  const [open, setOpen] = useState(false)
  if (sheet.kind !== 'award' || sheet.lots.length === 0) return null
  const offers = sheet.offers
  const awardedLots = sheet.lots.filter((lot) => lot.status === 'awarded').length
  const gap = gapText(sheet.estimate, sheet.awarded)
  const single = sheet.lots.length === 1
  const shown = open ? sheet.lots : sheet.lots.slice(0, limit)
  const all = sheet.lots.length
  const lotsNote = sheet.lotsCancelled > 0 ? plural(sheet.lotsCancelled, { one: 'unul anulat', few: '# anulate', other: '# anulate' }) : null
  const estimate = sheet.estimate !== null ? leiShort(sheet.estimate) : null
  const offersLots = offers && offers.lots > 1 ? lotsCount(offers.lots) : null
  return (
    <section className={className} aria-labelledby="procedure-competition">
      <h2 id="procedure-competition" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {t`Concurența`}
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        <Figure label={t`Oferte`} value={offers ? String(offers.received) : '—'} note={offersLots ? t`pe ${offersLots}` : null} />
        <Figure label={t`Loturi atribuite`} value={single ? '1' : `${awardedLots}/${all}`} note={lotsNote} />
        <Figure label={t`Cu o singură ofertă`} value={offers ? String(offers.single) : '—'} note={offers ? (offers.single === offers.lots ? t`toate` : null) : null} />
        <Figure label={t`Față de estimare`} value={gapFigure(sheet.estimate, sheet.awarded) ?? '—'} note={gap && estimate ? t`estimat ${estimate}` : null} />
      </div>
      <div className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h3 className={SUBHEAD}>{single ? t`Oferta câștigătoare și estimarea` : t`Lot cu lot`}</h3>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn(PIP, 'bg-foreground')} aria-hidden="true" />
              {t`admisă`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn(PIP, 'bg-muted-foreground/35')} aria-hidden="true" />
              {t`respinsă`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn(PIP, 'border border-muted-foreground/70')} aria-hidden="true" />
              {t`retrasă`}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-px bg-foreground" aria-hidden="true" />
              {t`estimarea`}
            </span>
          </p>
        </div>
        <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
          {shown.map((lot) => (
            <CompetitionRow key={lot.no} lot={lot} single={single} />
          ))}
        </ol>
        {all > limit ? (
          <button type="button" onClick={() => setOpen((value) => !value)} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0" aria-expanded={open}>
            {open ? t`Mai puține` : t`Toate cele ${all}`}
          </button>
        ) : null}
      </div>
    </section>
  )
}
