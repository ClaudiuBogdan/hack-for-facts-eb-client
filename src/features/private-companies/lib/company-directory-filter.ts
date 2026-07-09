/**
 * Pure helpers for the /companies/search filter UI: how many facets are active
 * (for the "Filtre" badge) and one removable chip per selected value. Params in,
 * plain data out — no React, no network — so both are unit-testable.
 *
 * `q` and `sort` are not filters: they have their own controls and survive
 * "Șterge tot".
 */
import {
  PRIVATE_COMPANY_STATUS_OPTIONS,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'

/** A patch merged into the search state and committed to the URL. */
export type CompanyDirectoryFilterPatch = Partial<PrivateCompanyDirectorySearchState>

export type CompanyDirectoryChip = {
  readonly key: string
  readonly label: string
  readonly patch: CompanyDirectoryFilterPatch
}

const STATUS_LABEL_BY_CODE = new Map<string, string>(
  PRIVATE_COMPANY_STATUS_OPTIONS.map((option) => [option.code, option.label]),
)

function nonEmpty(values: readonly string[] | undefined): readonly string[] {
  return values && values.length > 0 ? values : []
}

/**
 * The registration-date range counts as ONE filter even when both bounds are
 * set, matching how the sheet presents it (a single "Data înregistrării"
 * section).
 */
export function countActiveCompanyDirectoryFilters(
  state: PrivateCompanyDirectorySearchState,
): number {
  let count = 0
  count += nonEmpty(state.county).length
  count += nonEmpty(state.status).length
  count += nonEmpty(state.legalForm).length
  if (state.caen && state.caen.trim().length > 0) count += 1
  if (state.regFrom || state.regTo) count += 1
  if (typeof state.vat === 'boolean') count += 1
  if (typeof state.inactive === 'boolean') count += 1
  return count
}

/** Remove one value from a multi-select, collapsing the empty case to `undefined`. */
function withoutValue(
  values: readonly string[] | undefined,
  value: string,
): string[] | undefined {
  const next = nonEmpty(values).filter((item) => item !== value)
  return next.length > 0 ? next : undefined
}

/**
 * One chip per active filter *value* — removing a single county leaves the other
 * counties in place. The date range collapses into a single chip that clears
 * both bounds.
 */
export function buildCompanyDirectoryChips(
  state: PrivateCompanyDirectorySearchState,
): CompanyDirectoryChip[] {
  const chips: CompanyDirectoryChip[] = []

  for (const county of nonEmpty(state.county)) {
    chips.push({
      key: `county:${county}`,
      label: county,
      patch: { county: withoutValue(state.county, county) },
    })
  }

  for (const code of nonEmpty(state.status)) {
    chips.push({
      key: `status:${code}`,
      label: STATUS_LABEL_BY_CODE.get(code) ?? code,
      patch: { status: withoutValue(state.status, code) },
    })
  }

  for (const form of nonEmpty(state.legalForm)) {
    chips.push({
      key: `legalForm:${form}`,
      label: form,
      patch: { legalForm: withoutValue(state.legalForm, form) },
    })
  }

  if (state.caen && state.caen.trim().length > 0) {
    chips.push({
      key: `caen:${state.caen}`,
      label: `CAEN ${state.caen.trim()}`,
      patch: { caen: undefined },
    })
  }

  if (state.regFrom || state.regTo) {
    chips.push({
      key: 'registrationDate',
      label: registrationDateChipLabel(state.regFrom, state.regTo),
      patch: { regFrom: undefined, regTo: undefined },
    })
  }

  if (typeof state.vat === 'boolean') {
    chips.push({
      key: 'vat',
      label: state.vat ? 'Plătitor TVA' : 'Neplătitor TVA',
      patch: { vat: undefined },
    })
  }

  if (typeof state.inactive === 'boolean') {
    chips.push({
      key: 'inactive',
      label: state.inactive ? 'Declarat inactiv fiscal' : 'Activ fiscal',
      patch: { inactive: undefined },
    })
  }

  return chips
}

function registrationDateChipLabel(
  from: string | undefined,
  to: string | undefined,
): string {
  if (from && to) return `Înregistrare ${from} – ${to}`
  if (from) return `Înregistrare după ${from}`
  return `Înregistrare până la ${to}`
}

/** "Șterge tot": drop every facet, keep the free-text query and the sort. */
export function clearCompanyDirectoryFilters(
  state: PrivateCompanyDirectorySearchState,
): PrivateCompanyDirectorySearchState {
  return { q: state.q, sort: state.sort }
}
