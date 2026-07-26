import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  StyledMultiSelect,
  type StyledMultiSelectOption,
} from '@/components/ui/styled-multi-select'
import { cn } from '@/lib/utils'
import type { StenogramSpeakerFacet } from '../lib/stenogram-speaker-filter'
import { stenogramMutedTextClassName } from '../lib/stenogram-theme'

type Props = {
  /** Every speaker THIS sitting printed, already in Romanian order. */
  readonly facets: readonly StenogramSpeakerFacet[]
  readonly selected: readonly string[]
  readonly onChange: (values: string[]) => void
  readonly className?: string
}

const FILTER_LABEL_ID = 'stenogram-speaker-filter-label'

/**
 * Filter the reading to named speakers — the reader's one narrowing control.
 *
 * IT REPLACES FIND-IN-DOCUMENT, and it is a different kind of thing: search
 * marked words inside a complete document, this one REMOVES blocks. That is a
 * far stronger claim to make about an official record, so the control is
 * URL-backed (what you share is what you were reading), and the state it
 * produces is stated in words, counted against the whole sitting, and undoable
 * in one click — never a quiet subset that could be mistaken for the sitting.
 *
 * This component is the TOOLBAR only. What the resulting selection MEANS —
 * the counts, the omitted context and the way back to the whole sitting — is
 * `ParliamentStenogramFilterNotice`, which the reader keeps in its sticky left
 * lane so the claim stays beside the excerpt instead of scrolling away above
 * it. A control and a caveat have different lifetimes on screen; this is that
 * split, not a decomposition for its own sake.
 */
export function ParliamentStenogramSpeakerFilter({
  facets,
  selected,
  onChange,
  className,
}: Props) {
  const options = useMemo<StyledMultiSelectOption[]>(
    () =>
      facets.map((facet) => ({
        value: facet.speakerName,
        label: facet.speakerName,
        description:
          facet.interventionCount === 1
            ? t`1 luare de cuvânt`
            : t`${facet.interventionCount} luări de cuvânt`,
      })),
    [facets],
  )

  if (facets.length === 0) return null

  return (
    <div
      role="group"
      aria-labelledby={FILTER_LABEL_ID}
      className={cn(
        'flex flex-col gap-2 print:hidden sm:flex-row sm:items-end',
        className,
      )}
    >
      <div className="min-w-0 flex-1 sm:max-w-md">
        <p
          id={FILTER_LABEL_ID}
          className="mb-1 flex items-center gap-2 text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
        >
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          <Trans>Filtrează după vorbitor</Trans>
        </p>
        <StyledMultiSelect
          options={options}
          selected={selected}
          onChange={onChange}
          placeholder={t`Toți vorbitorii — stenograma integrală`}
        />
      </div>

      {selected.length > 0 ? null : (
        <p className={cn(stenogramMutedTextClassName, 'sm:pb-3')}>
          <Trans>Se afișează stenograma integrală a ședinței.</Trans>
        </p>
      )}
    </div>
  )
}
