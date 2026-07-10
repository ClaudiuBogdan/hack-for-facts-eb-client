import { X } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PrivateCompanyDirectorySearchState } from '@/schemas/private-company-search'
import {
  buildCompanyDirectoryChips,
  type CompanyDirectoryChip,
  type CompanyDirectoryFilterPatch,
} from '../../lib/company-directory-filter'

type Props = {
  readonly search: PrivateCompanyDirectorySearchState
  readonly onChange: (patch: CompanyDirectoryFilterPatch) => void
  readonly onClearAll: () => void
}

/**
 * County, status and legal-form chips show the ONRC value verbatim; the range
 * and switch chips need real copy, so they are rendered here rather than in the
 * pure chip builder.
 */
function chipLabel(
  chip: CompanyDirectoryChip,
  search: PrivateCompanyDirectorySearchState,
): string {
  if (chip.label !== null) return chip.label
  switch (chip.field) {
    case 'vat':
      return chip.value === true ? t`VAT payer` : t`Not a VAT payer`
    case 'inactive':
      return chip.value === true ? t`Fiscally inactive` : t`Fiscally active`
    case 'registrationDate': {
      // The chip only exists when at least one bound is set.
      const { regFrom, regTo } = search
      if (regFrom && regTo) return t`Registered ${regFrom} – ${regTo}`
      if (regFrom) return t`Registered after ${regFrom}`
      return t`Registered before ${regTo ?? ''}`
    }
    default:
      return ''
  }
}

/** One removable chip per active filter value, plus a "clear all" escape. */
export function CompanyActiveFilters({ search, onChange, onClearAll }: Props) {
  const chips = buildCompanyDirectoryChips(search)
  if (chips.length === 0) return null

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="company-active-filters"
    >
      {chips.map((chip) => {
        const label = chipLabel(chip, search)
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.patch)}
            aria-label={t`Remove filter ${label}`}
            data-testid={`company-filter-chip-${chip.key}`}
            className="inline-flex items-center gap-1.5 rounded-none border-2 border-[#b1b4b6] bg-white px-2.5 py-1 text-xs font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]"
          >
            <span>{label}</span>
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        )
      })}
      <button
        type="button"
        onClick={onClearAll}
        className="px-1 text-xs font-semibold text-[#505a5f] underline hover:text-[#0b0c0c] dark:text-[var(--pnrr-muted)] dark:hover:text-[var(--pnrr-fg)]"
        data-testid="company-clear-all-filters"
      >
        <Trans>Clear all</Trans>
      </button>
    </div>
  )
}
