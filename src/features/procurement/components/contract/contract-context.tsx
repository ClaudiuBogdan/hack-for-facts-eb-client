import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { contractContextGapOf, linkYearOf, type ContractSheet, type CtContext } from '../../lib/contract-model'
import { buyerYearText, directText, historyText, sellerYearText, yearFigures } from '../../lib/contract-text'
import { aboutText, contextYearText, dayShort, leiShort } from '../../lib/direct-purchase-text'
import { allYears, analyticsSearch } from '../../lib/home-links'
import { PartyName } from '../direct-purchase/direct-purchase-head'
import { CONTEXT_TINT } from '../direct-purchase/direct-purchase-style'

/**
 * The context band: what else passed between the institution and the firm,
 * set apart from the contract — its own tinted band after it, labelled
 * „Context". By count, never money (contract money is provisional, §12.1):
 * the pair's contracts and frameworks by year, the direct purchases between
 * them, each side's year, the contracts around this one, the two parties.
 */

const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const LABEL = 'block text-muted-foreground'

/**
 * The pair year by year: contracts and framework agreements as stacked
 * columns, the contract's year outlined, the year in progress dashed;
 * pointing at a year says its figures.
 */
function PairYears({ context, className }: { readonly context: CtContext; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const years = context.years ?? []
  const max = Math.max(1, ...years.map((year) => year.awards + year.frameworks))
  const shown = years.find((year) => year.year === (active ?? context.year)) ?? null
  // The year in progress, counted through its cutoff month: drawn dashed, labelled „2026 (până în mai)".
  const inProgress = (year: number) => year === context.inProgress?.year
  const shownYear = shown?.year ?? null
  const shownLabel =
    shownYear === null ? null : shownYear === context.year ? contextYearText(context) : context.inProgress && inProgress(shownYear) ? contextYearText(context.inProgress) : String(shownYear)
  const columns = { gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }
  if (years.length === 0) return null
  return (
    <figure className={className}>
      {/* Not a live region: each column's text says its figures, and a pointer passing over them is not news. */}
      <p className="min-h-10 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{shownLabel ?? contextYearText(context)}</span>
        {' · '}
        {shown ? yearFigures(shown) : t`nimic între ele`}
      </p>
      <ol className="mt-3 grid h-32 items-end gap-1.5" style={columns} onPointerLeave={() => setActive(null)}>
        {years.map((year) => {
          const total = year.awards + year.frameworks
          const isThis = year.year === context.year
          return (
            <li key={year.year} className="flex h-full flex-col justify-end" onPointerEnter={() => setActive(year.year)}>
              <span className="sr-only">
                {year.year}: {yearFigures(year)}
              </span>
              {total === 0 ? (
                <span aria-hidden="true" className={cn('block h-px w-full bg-border', inProgress(year.year) && 'outline-dashed outline-1 outline-offset-1 outline-primary')} />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex w-full flex-col justify-end',
                    isThis && 'outline outline-1 outline-offset-2 outline-foreground',
                    inProgress(year.year) && !isThis && 'outline-dashed outline-1 outline-offset-1 outline-primary',
                  )}
                  style={{ height: `${Math.max((total / max) * 100, 4)}%` }}
                >
                  {year.frameworks > 0 ? <span className="block w-full bg-primary/35" style={{ height: `${(year.frameworks / total) * 100}%` }} /> : null}
                  {year.awards > 0 ? <span className={cn('block w-full', active === year.year || isThis ? 'bg-primary' : 'bg-primary/75')} style={{ height: `${(year.awards / total) * 100}%` }} /> : null}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-2 grid gap-1.5" style={columns} aria-hidden="true">
        {years.map((year) => (
          <MonoLabel key={year.year} className={cn('text-center tabular-nums', year.year === context.year ? 'text-foreground' : 'text-muted-foreground')}>
            {`'${String(year.year).slice(2)}`}
          </MonoLabel>
        ))}
      </div>
      {years.some((year) => year.frameworks > 0) ? (
        <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-primary" aria-hidden="true" />
            <Trans>contracte</Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-primary/35" aria-hidden="true" />
            <Trans>acorduri-cadru</Trans>
          </span>
        </figcaption>
      ) : null}
    </figure>
  )
}

/** The contracts between the same two around this one, newest first; this one marked by a bar, not linked. */
function RecordsAround({ sheet, context }: { readonly sheet: ContractSheet; readonly context: CtContext }) {
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {context.around.map((other) => {
        const isThis = other.id === sheet.id
        const note = isThis ? t`acesta` : other.framework ? t`acord-cadru` : other.rows > 1 ? plural(other.rows, { one: '# valoare publicată', few: '# valori publicate', other: '# de valori publicate' }) : null
        const number = other.contractNo
        const title = other.title ?? (number ? (other.framework ? t`Acordul-cadru nr. ${number}` : t`Contractul nr. ${number}`) : t`Fără titlu în SEAP`)
        const row = cn('grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 pr-1', isThis ? 'border-l-2 border-primary pl-2.5' : 'pl-3')
        const body = (
          <>
            <MonoLabel className="pt-1 tabular-nums text-muted-foreground">{other.date ? dayShort(other.date) : '—'}</MonoLabel>
            <span className="min-w-0">
              <span className={cn('block truncate text-sm text-foreground', isThis && 'font-semibold')}>{title}</span>
              {note ? <MonoLabel className="mt-1 block text-muted-foreground">{note}</MonoLabel> : null}
            </span>
            <span className={cn('whitespace-nowrap text-right text-sm tabular-nums', other.accepted ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {other.value !== null ? leiShort(other.value) : '—'}
            </span>
          </>
        )
        return (
          <li key={other.id} aria-current={isThis ? 'page' : undefined}>
            {isThis ? (
              <div className={row}>{body}</div>
            ) : (
              <Link to="/procurement/contracts/$id" params={{ id: other.id }} className={cn(row, 'transition-colors hover:text-primary')}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** One side: its name, what it is, and the ways to its pages. */
function PartyBlock({ sheet, role }: { readonly sheet: ContractSheet; readonly role: 'authority' | 'supplier' }) {
  const year = linkYearOf(sheet)
  const party = role === 'authority' ? sheet.authority : sheet.supplier
  const about = role === 'authority' ? aboutText(party.identity) : null
  const search = year === undefined ? {} : { year }
  return (
    <div className="border-t pt-4">
      <MonoLabel className={LABEL}>{role === 'authority' ? t`Instituția` : t`Firma`}</MonoLabel>
      <p className="mt-3 text-base font-semibold leading-snug">
        <PartyName party={party} role={role} year={year} />
      </p>
      {about ? <p className="mt-1 text-sm text-muted-foreground">{about}</p> : null}
      {party.cui ? <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">CUI {party.cui}</p> : null}
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

function ContextBody({ sheet, context }: { readonly sheet: ContractSheet; readonly context: CtContext }) {
  const isFramework = sheet.kind === 'framework'
  const sentences = [historyText(context, isFramework), directText(context), buyerYearText(context), sellerYearText(context, isFramework)].filter((text): text is string => Boolean(text))
  const total = (context.years ?? []).reduce((sum, year) => sum + year.awards + year.frameworks, 0)
  // One contract in all between them: its chart and its list would only repeat the sentence that says so.
  const many = total > 1 || context.around.length > 1
  const records = context.records
  return (
    <>
      <div className={cn('mt-8 grid gap-10 lg:gap-12', many && 'lg:grid-cols-12')}>
        <div className={cn('min-w-0 space-y-3 text-base leading-relaxed text-muted-foreground', many ? 'lg:col-span-5' : 'max-w-[62ch]')}>
          {sentences.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
          {many && context.years ? (
            <>
              <MonoLabel className={cn(LABEL, 'pt-5')}>{t`Între ele, pe ani`}</MonoLabel>
              <PairYears context={context} className="mt-3" />
            </>
          ) : null}
        </div>
        {many && context.around.length > 1 ? (
          <div className="min-w-0 lg:col-span-7">
            <MonoLabel className={LABEL}>{t`În jurul acestui contract`}</MonoLabel>
            <div className="mt-3">
              <RecordsAround sheet={sheet} context={context} />
            </div>
            {sheet.authority.cui && sheet.supplier.cui && records !== null && records > context.around.length ? (
              <Link
                to="/procurement/analytics"
                // The sheet's own population, from 2019: the list above mixes the awards and the frameworks, the page answers one at a time.
                search={analyticsSearch({ tip: isFramework ? 'acorduri' : 'contracte', cumparator: sheet.authority.cui, furnizor: sheet.supplier.cui, perioada: allYears(), dupa: 'inregistrari' })}
                className={cn(OUT_LINK, 'mt-3 text-sm')}
              >
                {isFramework ? <Trans>Toate acordurile-cadru dintre ele</Trans> : <Trans>Toate contractele dintre ele</Trans>}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {context.partial ? <p className="mt-6 text-sm text-muted-foreground">{t`O parte din aceste cifre nu s-a putut citi acum; reîncarcă pagina pentru restul.`}</p> : null}
    </>
  )
}

/** Why there is no context to read, as the band says it. */
function ContextGap({ sheet }: { readonly sheet: ContractSheet }) {
  const gap = contractContextGapOf(sheet)
  if (!gap) return null
  return (
    <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
      {gap === 'no-cui' ? (
        <Trans>SEAP nu dă codul fiscal al uneia dintre părți, așa că celelalte contracte dintre ele nu se pot aduna.</Trans>
      ) : gap === 'no-date' ? (
        <Trans>SEAP nu publică data acestui contract, așa că pagina nu îl poate așeza printre celelalte dintre ele.</Trans>
      ) : (
        <Trans>Contractul e dinainte de 2019; pagina adună contractele dintre ele din 2019 încoace.</Trans>
      )}
    </p>
  )
}

/**
 * The band, in its states: reading, failed (with a retry), read — or, when
 * the contract has no context to read (no CUI for a side, no date, a year
 * before 2019), only the two parties, said why.
 */
export function ContractContextBand({
  sheet,
  context,
}: {
  readonly sheet: ContractSheet
  readonly context: { readonly data: CtContext | null | undefined; readonly isError: boolean; readonly retry: () => void }
}) {
  const year = linkYearOf(sheet)
  const authority = <PartyName party={sheet.authority} role="authority" year={year} />
  const supplier = <PartyName party={sheet.supplier} role="supplier" year={year} />
  const readable = contractContextGapOf(sheet) === null
  return (
    <section className={cn('border-y', CONTEXT_TINT)} aria-labelledby="contract-context">
      <RuledFrame className="py-12 sm:py-16">
        <MonoLabel className={LABEL}>{t`Context`}</MonoLabel>
        <h2 id="contract-context" className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          <Trans>Alte contracte între ele</Trans>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <Trans>
            Ce a mai atribuit {authority} firmei {supplier}, din 2019 încoace.
          </Trans>
        </p>
        {!readable ? (
          <ContextGap sheet={sheet} />
        ) : context.data ? (
          <ContextBody sheet={sheet} context={context.data} />
        ) : context.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={context.retry} />
          </div>
        ) : (
          <HubPending className="mt-8" rows={4} />
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-10">
          <PartyBlock sheet={sheet} role="authority" />
          <PartyBlock sheet={sheet} role="supplier" />
        </div>
      </RuledFrame>
    </section>
  )
}
