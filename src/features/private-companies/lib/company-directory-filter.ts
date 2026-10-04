/**
 * Pure helpers for the /companies/search filter UI: how many facets are active
 * (for the "Filtre" badge) and one removable chip per selected value. Params in,
 * plain data out — no React, no i18n — so both are unit-testable.
 *
 * A chip carries the raw `field`/`value` rather than a rendered label: a county
 * code shows its canonical name, a status code this application's presentation
 * name, legal forms display as-is, an exact CAEN selector its revision and
 * code (an invalid one is flagged, never dropped), while the date range and
 * the two fiscal switches need translated copy that only the component can
 * produce.
 *
 * `q` and `sort` are not filters: they have their own controls and survive
 * "clear all".
 */
import {
  PRIVATE_COMPANY_STATUS_OPTIONS,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'
import { parseCaenSelector } from './company-caen-selector'
import { countyName } from './hub-counties'

/** A patch merged into the search state and committed to the URL. */
export type CompanyDirectoryFilterPatch = Partial<PrivateCompanyDirectorySearchState>

export type CompanyDirectoryChipField =
  | 'county'
  | 'status'
  | 'legalForm'
  | 'caen'
  | 'onrcCaen'
  | 'registrationDate'
  | 'vat'
  | 'inactive'

export type CompanyDirectoryChip = {
  readonly key: string
  readonly field: CompanyDirectoryChipField
  /** Display label where the value has one; `null` for synthetic facets. */
  readonly label: string | null
  readonly value: string | boolean | null
  readonly patch: CompanyDirectoryFilterPatch
  /** A URL value the API cannot read (a malformed exact CAEN selector): shown, flagged, never sent. */
  readonly invalid?: boolean
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
  count += nonEmpty(state.onrcCaen).length
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
      field: 'county',
      // A code (`CJ`) by its canonical name; a name from an older link as written.
      label: countyName(county),
      value: county,
      patch: { county: withoutValue(state.county, county) },
    })
  }

  for (const code of nonEmpty(state.status)) {
    chips.push({
      key: `status:${code}`,
      field: 'status',
      label: STATUS_LABEL_BY_CODE.get(code) ?? code,
      value: code,
      patch: { status: withoutValue(state.status, code) },
    })
  }

  for (const form of nonEmpty(state.legalForm)) {
    chips.push({
      key: `legalForm:${form}`,
      field: 'legalForm',
      label: form,
      value: form,
      patch: { legalForm: withoutValue(state.legalForm, form) },
    })
  }

  if (state.caen && state.caen.trim().length > 0) {
    const caen = state.caen.trim()
    chips.push({
      key: `caen:${caen}`,
      field: 'caen',
      label: `CAEN ${caen}`,
      value: caen,
      patch: { caen: undefined },
    })
  }

  for (const value of nonEmpty(state.onrcCaen)) {
    const selector = parseCaenSelector(value)
    chips.push({
      key: `onrcCaen:${value}`,
      field: 'onrcCaen',
      label: selector ? `CAEN ${selector.code} · ${selector.revision.replace(/^rev/u, 'Rev.')}` : value,
      value,
      patch: { onrcCaen: withoutValue(state.onrcCaen, value) },
      ...(selector ? {} : { invalid: true }),
    })
  }

  if (state.regFrom || state.regTo) {
    chips.push({
      key: 'registrationDate',
      field: 'registrationDate',
      label: null,
      value: null,
      patch: { regFrom: undefined, regTo: undefined },
    })
  }

  if (typeof state.vat === 'boolean') {
    chips.push({
      key: 'vat',
      field: 'vat',
      label: null,
      value: state.vat,
      patch: { vat: undefined },
    })
  }

  if (typeof state.inactive === 'boolean') {
    chips.push({
      key: 'inactive',
      field: 'inactive',
      label: null,
      value: state.inactive,
      patch: { inactive: undefined },
    })
  }

  return chips
}

/** "Clear all": drop every facet, keep the free-text query and the sort. */
export function clearCompanyDirectoryFilters(
  state: PrivateCompanyDirectorySearchState,
): PrivateCompanyDirectorySearchState {
  return { q: state.q, sort: state.sort }
}
