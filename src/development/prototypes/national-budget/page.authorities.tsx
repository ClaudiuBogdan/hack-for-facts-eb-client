import { useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuthorities, useAuthorityDetail } from '@/features/national-budget/page/hooks/use-national-budget-page'
import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import { cn } from '@/lib/utils'
import type { AuthorityRow, BudgetEdition, CreditType } from '@/schemas/national-budget-page'
import { creditLabel, formatExactLei, formatInUnit, formatPercent, measureLabel, sentenceCase, tableUnit } from './page.format'
import { Band, BandSkeleton, Missing, Money, OriginChip } from './page.parts'

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export type AuthorityQuery = {
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly creditType: CreditType
}

/** A row's code as the reader should take it: a law's source code, an invented one, or none. */
function CodeMark({ row }: { readonly row: AuthorityRow }) {
  if (row.code === null) return null
  return (
    <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground" title={row.origin === 'synthetic_demo' ? t`cod inventat` : t`codul ordonatorului din lege (nu e CUI)`}>
      {row.code}
    </span>
  )
}

/**
 * The authorities (ordonatori principali) ranked by their own total row, with
 * a search over names and codes. Each row opens its lines. A row's share is of
 * the edition's own total for the same descriptor, never of a sum of rows.
 */
export function AuthorityRanking({
  query,
  search,
  onSearch,
  onOpen,
  initialLimit = 10,
  dense = false,
}: {
  readonly query: AuthorityQuery
  readonly search: string
  readonly onSearch: (value: string) => void
  readonly onOpen: (key: string) => void
  readonly initialLimit?: number
  readonly dense?: boolean
}) {
  const { data } = useAuthorities({ edition: query.edition.key, targetYear: query.targetYear, creditType: query.creditType })
  const [expanded, setExpanded] = useState(false)
  if (data.status !== 'ok') return <Missing reason={data.reason} className="py-4" />

  const needle = fold(search.trim())
  const matches = needle === '' ? data.rows : data.rows.filter((row) => fold(`${row.name} ${row.code ?? ''}`).includes(needle))
  const shown = expanded || needle !== '' ? matches : matches.slice(0, initialLimit)
  const total = data.totalThousandLei === null ? null : approvedAmountToLei(data.totalThousandLei)
  const widest = Math.max(...data.rows.map((row) => approvedAmountToLei(row.amountThousandLei ?? '0')), 1)
  const synthetic = data.rows.filter((row) => row.origin === 'synthetic_demo').length
  const unit = tableUnit(data.rows.map((row) => approvedAmountToLei(row.amountThousandLei ?? '0')))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex w-full min-w-0 items-center sm:w-auto sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t`Caută un ordonator`}</span>
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t`Caută după nume sau cod`}
            className="h-11 rounded-none pl-9 sm:h-9"
          />
        </label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {needle === '' ? t`${data.rows.length} ordonatori principali` : t`${matches.length} din ${data.rows.length}`}
          {data.rows.length > 0 ? ` · ${unit.label}` : null}
        </span>
      </div>
      {synthetic > 0 ? (
        <p className="border-l-2 border-dashed border-foreground/40 pl-3 text-xs text-muted-foreground">
          {t`Lista completă a ediției vine cu API-ul. Până atunci, ${synthetic} rânduri au valori inventate (marcate „demo”); singurul rând real din eșantion e fără marcaj.`}
        </p>
      ) : null}
      {matches.length === 0 ? (
        <p className="flex flex-wrap items-center gap-2 py-6 text-sm text-muted-foreground">
          {data.rows.length === 0 ? t`Sursa nu are ordonatori pentru această selecție.` : t`Niciun ordonator nu se potrivește cu „${search}”.`}
          {search ? (
            <button type="button" onClick={() => onSearch('')} className="inline-flex min-h-11 items-center gap-1 text-foreground underline-offset-4 hover:underline sm:min-h-0">
              <X className="size-3.5" aria-hidden="true" />
              {t`Șterge căutarea`}
            </button>
          ) : null}
        </p>
      ) : (
        <ol className="divide-y border-y">
          {shown.map((row) => {
            const lei = row.amountThousandLei === null ? null : approvedAmountToLei(row.amountThousandLei)
            const rank = data.rows.indexOf(row) + 1
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onOpen(row.key)}
                  data-authority-key={row.key}
                  className={cn(
                    'group relative grid w-full grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 px-1 text-left hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none',
                    dense ? 'py-1.5' : 'py-2',
                  )}
                >
                  <span className="text-xs tabular-nums text-muted-foreground">{rank}</span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm">{row.name}</span>
                      <OriginChip origin={row.origin} />
                      <CodeMark row={row} />
                    </span>
                    {lei !== null ? (
                      <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                        <span
                          className={cn('block h-1', row.origin === 'synthetic_demo' ? 'bg-foreground/25' : row.origin === 'draft_static' ? 'bg-amber-600/60' : 'bg-primary')}
                          style={{ width: `${(lei / widest) * 100}%` }}
                        />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2 text-right">
                    {lei === null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <>
                        <span className="text-sm font-medium tabular-nums" title={formatExactLei(lei)}>
                          {formatInUnit(lei, unit)}
                        </span>
                        {total ? (
                          <span className="hidden w-14 text-xs tabular-nums text-muted-foreground sm:inline">
                            {lei / total < 0.0005 ? `<${formatPercent(0.1)}` : formatPercent((lei / total) * 100)}
                          </span>
                        ) : null}
                      </>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {needle === '' && matches.length > initialLimit ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0"
        >
          <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden="true" />
          {expanded ? t`Primii ${initialLimit}` : t`Toți cei ${matches.length}`}
        </button>
      ) : null}
    </div>
  )
}

function AuthorityLines({ query, authorityKey }: { readonly query: AuthorityQuery; readonly authorityKey: string }) {
  const { data } = useAuthorityDetail({
    edition: query.edition.key,
    targetYear: query.targetYear,
    creditType: query.creditType,
    authorityKey,
  })
  if (data.status !== 'ok') return <Missing reason={data.reason} />
  const total = approvedAmountToLei(data.lines.find((line) => line.level === 0)?.amountThousandLei ?? '0')
  const unit = tableUnit(data.lines.map((line) => approvedAmountToLei(line.amountThousandLei)))
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <OriginChip origin={data.authority.origin} />
          <span className="text-xs text-muted-foreground">
            {measureLabel(query.edition, query.targetYear)} · {creditLabel(query.creditType)}
          </span>
        </div>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          <Money lei={total} />
        </p>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">{t`Rândurile ordonatorului`}</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-1 pr-2 font-normal">{t`Cod`}</th>
            <th className="py-1 pr-2 font-normal">{t`Rând`}</th>
            <th className="py-1 text-right font-normal">{unit.label}</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line) => (
            <tr key={line.key} className={cn('border-b last:border-0', line.level === 0 && 'font-semibold')}>
              <td className="py-1.5 pr-2 align-top font-mono text-xs tabular-nums text-muted-foreground">{line.code}</td>
              <td className={cn('py-1.5 pr-2', line.level === 1 && 'pl-3', line.level === 2 && 'pl-6 text-muted-foreground')}>
                {sentenceCase(line.label)}
              </td>
              <td className="py-1.5 text-right align-top tabular-nums" title={formatExactLei(approvedAmountToLei(line.amountThousandLei))}>
                {formatInUnit(approvedAmountToLei(line.amountThousandLei), unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.complete ? (
        <p className="border-l-2 border-amber-600/60 pl-3 text-xs text-muted-foreground">
          {data.authority.origin === 'real_sample'
            ? t`Eșantionul are doar primele înregistrări ale anexei; restul rândurilor vin cu API-ul. Rândurile nu se adună: totalul, grupele și titlurile sunt tipărite separat.`
            : t`Defalcarea proiectului nu acoperă tot totalul ordonatorului; diferența nu e completată.`}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t`Rândurile nu se adună: totalul, grupele și titlurile sunt tipărite separat.`}</p>
      )}
      <div className="space-y-1 border-t pt-4">
        <p className="text-sm font-medium">{t`Execuția acestui ordonator`}</p>
        <Missing reason="no_identity_mapping" />
        <p className="text-xs text-muted-foreground">
          {t`Codul din lege identifică ordonatorul în lege, nu firma lui fiscală. Legătura cu execuția raportată la ANAF cere o tabelă de corespondență revizuită; nu o ghicim după nume.`}
        </p>
      </div>
    </div>
  )
}

export function AuthoritySheet({
  query,
  authorityKey,
  onClose,
}: {
  readonly query: AuthorityQuery
  readonly authorityKey: string | null
  readonly onClose: () => void
}) {
  // The sheet opens from the URL, not from a trigger, so focus is handed back to the row by hand.
  const closing = useRef<string | null>(null)
  return (
    <Sheet
      open={authorityKey !== null}
      onOpenChange={(open) => {
        if (open) return
        closing.current = authorityKey
        onClose()
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          const row = closing.current ? document.querySelector<HTMLElement>(`[data-authority-key="${CSS.escape(closing.current)}"]`) : null
          if (!row) return
          event.preventDefault()
          row.focus()
        }}
      >
        {authorityKey ? (
          <Band label={t`rândurile ordonatorului`} fallback={<BandSkeleton rows={8} label={t`Se citesc rândurile`} />}>
            <SheetHeaderFor query={query} authorityKey={authorityKey} />
            <div className="mt-4">
              <AuthorityLines query={query} authorityKey={authorityKey} />
            </div>
          </Band>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function SheetHeaderFor({ query, authorityKey }: { readonly query: AuthorityQuery; readonly authorityKey: string }) {
  const { data } = useAuthorities({ edition: query.edition.key, targetYear: query.targetYear, creditType: query.creditType })
  const row = data.status === 'ok' ? data.rows.find((item) => item.key === authorityKey) : undefined
  return (
    <SheetHeader className="pr-8 text-left">
      <SheetTitle className="text-xl">{row?.name ?? t`Ordonator`}</SheetTitle>
      <SheetDescription>
        {row?.code ? (row.origin === 'synthetic_demo' ? t`Cod inventat ${row.code}` : t`Cod în lege ${row.code}`) : t`Fără cod în sursă`}
      </SheetDescription>
    </SheetHeader>
  )
}

