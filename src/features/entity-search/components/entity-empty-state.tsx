import { Trans } from '@lingui/react/macro'
import { Search, SearchX } from 'lucide-react'
import type { EntitySearchDocType } from '@/schemas/entity-search'
import { cn } from '@/lib/utils'
import { DOC_TYPE_META } from '../lib/doc-type-meta'

type EmptyStateVariant = 'initial' | 'zero' | 'error'

type Props = {
  readonly variant: EmptyStateVariant
  readonly query?: string
  readonly selectedTypes?: readonly string[]
  readonly onSelectPopularType?: (docType: EntitySearchDocType) => void
  readonly onClearFilters?: () => void
  readonly onRetry?: () => void
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
        const meta = DOC_TYPE_META[docType]
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
