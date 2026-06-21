import { t } from '@lingui/core/macro'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { cn } from '@/lib/utils'
import { EntityResultRow } from './entity-result-row'

type Props = {
  readonly hits: readonly EntitySearchHit[]
  readonly listboxId: string
  readonly activeIndex: number
  readonly isFetching: boolean
  readonly isPlaceholderData: boolean
  readonly getOptionId: (index: number) => string
  readonly setRowRef: (index: number, node: HTMLLIElement | null) => void
  readonly setActionRef: (index: number, node: HTMLAnchorElement | null) => void
}

export function EntitySearchResults({
  hits,
  listboxId,
  activeIndex,
  isFetching,
  isPlaceholderData,
  getOptionId,
  setRowRef,
  setActionRef,
}: Props) {
  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label={t`Rezultate căutare`}
      aria-multiselectable={false}
      aria-busy={isFetching}
      className={cn(
        'divide-y-2 divide-[var(--pnrr-border)] border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] transition-opacity motion-reduce:transition-none',
        isFetching && isPlaceholderData && 'pointer-events-none opacity-60',
      )}
    >
      {hits.map((hit, index) => (
        <EntityResultRow
          key={`${hit.docType}:${hit.id}`}
          hit={hit}
          id={getOptionId(index)}
          active={index === activeIndex}
          rowRef={(node) => setRowRef(index, node)}
          actionRef={(node) => setActionRef(index, node)}
        />
      ))}
    </ul>
  )
}
