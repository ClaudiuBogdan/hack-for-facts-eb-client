import { t } from '@lingui/core/macro'
import {
  PRIVATE_COMPANY_SORT_VALUES,
  type PrivateCompanySortValue,
} from '@/schemas/private-company-search'

type Props = {
  readonly value: PrivateCompanySortValue | undefined
  readonly onChange: (value: PrivateCompanySortValue | undefined) => void
}

function isSortValue(value: string): value is PrivateCompanySortValue {
  return (PRIVATE_COMPANY_SORT_VALUES as readonly string[]).includes(value)
}

/** Drives the `sort` search param, which the server maps onto `CompanySort`. */
export function CompanySortSelect({ value, onChange }: Props) {
  const labels: Record<PrivateCompanySortValue, string> = {
    name: t`Name (A-Z)`,
    'registration-date': t`Registration date`,
    cui: t`CUI`,
  }

  return (
    <select
      id="company-sort"
      aria-label={t`Sort companies`}
      data-testid="company-sort-select"
      value={value ?? ''}
      onChange={(event) =>
        onChange(isSortValue(event.target.value) ? event.target.value : undefined)
      }
      className="h-11 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]"
    >
      <option value="">{t`Relevance`}</option>
      {PRIVATE_COMPANY_SORT_VALUES.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  )
}
