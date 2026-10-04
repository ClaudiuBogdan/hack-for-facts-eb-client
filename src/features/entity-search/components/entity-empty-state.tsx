import { Trans } from '@lingui/react/macro'
import { Search, SearchX } from 'lucide-react'
import type { EntitySearchDocType } from '@/schemas/entity-search'
import { cn } from '@/lib/utils'
import { getDocTypeMeta } from '../lib/doc-type-meta'
import type { EntitySearchIncompleteReason } from '../lib/entity-search-answer'

/**
 * `degraded` is deliberately distinct from `zero`. The server answered
 * successfully, but from its reduced outage path — so "no results" would be a
 * claim we cannot support: we did not look, and the user must not conclude the
 * entity does not exist (SEARCH_LAYER_REVIEW_2026-08-25.md D5).
 *
 * The shared-search contract (r2) adds three more answers that are not a zero:
 * `withheld` (the server refused the answer, or it was unreadable), `moved`
 * (the index generation or company scope changed while paging) and
 * `incomplete` (nothing shown, but more candidates follow, the company part is
 * not current, or later pages were read and no further page is offered: r4).
 */
type EmptyStateVariant =
  | 'initial'
  | 'zero'
  | 'degraded'
  | 'error'
  | 'invalid'
  | 'withheld'
  | 'moved'
  | 'incomplete'

type Props = {
  readonly variant: EmptyStateVariant
  readonly query?: string
  readonly selectedTypes?: readonly string[]
  /** `incomplete` only: why the empty answer is not a "no match". */
  readonly incompleteReason?: EntitySearchIncompleteReason
  readonly onSelectPopularType?: (docType: EntitySearchDocType) => void
  readonly onClearFilters?: () => void
  readonly onRetry?: () => void
}

function RetryButton({ onRetry }: { readonly onRetry?: () => void }) {
  return onRetry ? (
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none"
    >
      <Trans>Încearcă din nou</Trans>
    </button>
  ) : null
}

const POPULAR_DOC_TYPES = [
  'company',
  'organization',
  'legal_act',
  'member',
] as const satisfies readonly EntitySearchDocType[]

function EmptyStateIcon({ variant }: { readonly variant: EmptyStateVariant }) {
  const Icon = variant === 'initial' ? Search : SearchX
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        'mx-auto h-8 w-8',
        variant === 'error'
          ? 'text-[var(--pnrr-red)]'
          : 'text-[var(--pnrr-muted)]',
      )}
    />
  )
}

function PopularTypeButtons({
  selectedTypes,
  onSelectPopularType,
}: {
  readonly selectedTypes: readonly string[]
  readonly onSelectPopularType: (docType: EntitySearchDocType) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">
      {POPULAR_DOC_TYPES.map((docType) => {
        const meta = getDocTypeMeta(docType)
        const Icon = meta.Icon
        const selected = selectedTypes.includes(docType)

        return (
          <button
            key={docType}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelectPopularType(docType)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 border-2 border-[var(--pnrr-border)] px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none',
              selected
                ? 'border-[var(--pnrr-fg)] bg-[var(--pnrr-fg)] text-[var(--pnrr-card)]'
                : 'bg-[var(--pnrr-card)] text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-hover)]',
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

export function EntityEmptyState({
  variant,
  query = '',
  selectedTypes = [],
  incompleteReason = 'not-current',
  onSelectPopularType,
  onClearFilters,
  onRetry,
}: Props) {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cn(
        'space-y-3 border-2 bg-[var(--pnrr-card)] px-6 py-12 text-center',
        variant === 'error'
          ? 'border-[var(--pnrr-red)] bg-[var(--pnrr-red)]/5 text-[var(--pnrr-red)]'
          : 'border-[var(--pnrr-border)] text-[var(--pnrr-muted)]',
      )}
    >
      <EmptyStateIcon variant={variant} />

      {variant === 'initial' ? (
        <>
          <p className="mx-auto max-w-xl text-base leading-relaxed">
            <Trans>
              Începe să cauți pentru a explora firme, instituții, legi,
              contracte și proiecte PNRR.
            </Trans>
          </p>
          {onSelectPopularType ? (
            <PopularTypeButtons
              selectedTypes={selectedTypes}
              onSelectPopularType={onSelectPopularType}
            />
          ) : null}
        </>
      ) : null}

      {variant === 'invalid' ? <p><Trans>Scurtează căutarea la cel mult 10 cuvinte și verifică ghilimelele.</Trans></p> : null}

      {variant === 'zero' ? (
        <>
          <p className="text-base font-semibold text-[var(--pnrr-fg)]">
            <Trans>Niciun rezultat pentru "{query}".</Trans>
          </p>
          <p className="text-sm">
            <Trans>
              Încearcă un termen mai scurt sau elimină un filtru.
            </Trans>
          </p>
          {onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-2 border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none"
            >
              <Trans>Clear filters</Trans>
            </button>
          ) : null}
        </>
      ) : null}

      {variant === 'degraded' ? (
        <>
          <p className="text-base font-semibold text-[var(--pnrr-fg)]">
            <Trans>Căutarea este momentan limitată.</Trans>
          </p>
          <p className="mx-auto max-w-xl text-sm">
            <Trans>
              Motorul de căutare este indisponibil, așa că "{query}" nu a putut
              fi căutat. Asta nu înseamnă că nu există rezultate. Momentan
              funcționează doar căutarea după cod fiscal exact.
            </Trans>
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none"
            >
              <Trans>Încearcă din nou</Trans>
            </button>
          ) : null}
        </>
      ) : null}

      {variant === 'withheld' ? (
        <>
          <p className="text-base font-semibold text-[var(--pnrr-fg)]">
            <Trans>Răspunsul căutării a fost reținut.</Trans>
          </p>
          <p className="mx-auto max-w-xl text-sm">
            <Trans>
              Serverul nu a putut confirma acum rezultatele pentru "{query}", așa
              că nu le afișăm. Asta nu înseamnă că nu există rezultate.
            </Trans>
          </p>
          <RetryButton onRetry={onRetry} />
        </>
      ) : null}

      {variant === 'moved' ? (
        <>
          <p className="text-base font-semibold text-[var(--pnrr-fg)]">
            <Trans>Căutarea s-a schimbat între pagini.</Trans>
          </p>
          <p className="mx-auto max-w-xl text-sm">
            <Trans>
              Indexul de căutare sau datele firmelor s-au schimbat, așa că
              paginile încărcate nu mai pot fi arătate împreună. Reia căutarea
              pentru "{query}" de la prima pagină.
            </Trans>
          </p>
          <RetryButton onRetry={onRetry} />
        </>
      ) : null}

      {variant === 'incomplete' ? (
        <>
          <p className="text-base font-semibold text-[var(--pnrr-fg)]">
            <Trans>Nu putem spune că nu există rezultate pentru "{query}".</Trans>
          </p>
          {incompleteReason === 'more' ? (
            <p className="mx-auto max-w-xl text-sm">
              <Trans>
                Pagina aceasta nu are rezultate afișabile, dar căutarea are o
                pagină următoare.
              </Trans>
            </p>
          ) : incompleteReason === 'no-further-page' ? (
            <p className="mx-auto max-w-xl text-sm">
              <Trans>
                Paginile încărcate nu au rezultate afișabile, iar aici nu există
                o pagină următoare pentru această căutare. Asta nu înseamnă că
                nu există rezultate.
              </Trans>
            </p>
          ) : (
            <>
              <p className="mx-auto max-w-xl text-sm">
                <Trans>
                  Partea de firme a căutării nu este la zi, așa că lipsa
                  rezultatelor nu este un răspuns. Încearcă din nou mai târziu.
                </Trans>
              </p>
              <RetryButton onRetry={onRetry} />
            </>
          )}
        </>
      ) : null}

      {variant === 'error' ? (
        <>
          <p className="mx-auto max-w-xl text-base">
            <Trans>
              Căutarea nu a putut fi realizată. Încearcă din nou.
            </Trans>
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 border-2 border-[var(--pnrr-red)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-red)] transition-colors hover:bg-[var(--pnrr-red)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] motion-reduce:transition-none"
            >
              <Trans>Încearcă din nou</Trans>
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
