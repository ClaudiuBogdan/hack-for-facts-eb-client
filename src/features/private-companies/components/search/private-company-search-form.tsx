import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useEffect, useState, type FormEvent } from 'react'
import {
  PRIVATE_COMPANY_STATUS_OPTIONS,
  type PrivateCompanyCountyFacet,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'

type Props = {
  readonly initialState: PrivateCompanyDirectorySearchState
  readonly counties: ReadonlyArray<PrivateCompanyCountyFacet>
  readonly onSubmit: (next: PrivateCompanyDirectorySearchState) => void
}

const inputClassName =
  'w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-2.5 text-base text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pnrr-blue)]'

const labelClassName =
  'block text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]'

export function PrivateCompanySearchForm({
  initialState,
  counties,
  onSubmit,
}: Props) {
  const [q, setQ] = useState(initialState.q ?? '')
  const [county, setCounty] = useState(initialState.county ?? '')
  const [status, setStatus] = useState(initialState.status ?? '')
  const [caen, setCaen] = useState(initialState.caen ?? '')

  // Keep the form in sync when the URL search state changes (e.g. back/forward).
  useEffect(() => {
    setQ(initialState.q ?? '')
    setCounty(initialState.county ?? '')
    setStatus(initialState.status ?? '')
    setCaen(initialState.caen ?? '')
  }, [initialState.q, initialState.county, initialState.status, initialState.caen])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      q: q.trim() || undefined,
      county: county.trim() || undefined,
      status: status || undefined,
      caen: caen.trim() || undefined,
      sort: initialState.sort,
    })
  }

  const handleReset = () => {
    setQ('')
    setCounty('')
    setStatus('')
    setCaen('')
    onSubmit({})
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-2 border-[var(--pnrr-border)] p-4 sm:p-5"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
      role="search"
      aria-label={t`Company search`}
    >
      <div className="space-y-1.5">
        <label htmlFor="company-search-q" className={labelClassName}>
          <Trans>Company name or CUI</Trans>
        </label>
        <input
          id="company-search-q"
          name="q"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t`e.g. Dedeman or 2816464`}
          className={inputClassName}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="company-search-county" className={labelClassName}>
            <Trans>County</Trans>
          </label>
          <select
            id="company-search-county"
            name="county"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
            className={inputClassName}
          >
            <option value="">{t`Any county`}</option>
            {counties.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="company-search-status" className={labelClassName}>
            <Trans>Registry status</Trans>
          </label>
          <select
            id="company-search-status"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClassName}
          >
            <option value="">{t`Any status`}</option>
            {PRIVATE_COMPANY_STATUS_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="company-search-caen" className={labelClassName}>
            <Trans>CAEN code</Trans>
          </label>
          <input
            id="company-search-caen"
            name="caen"
            type="text"
            inputMode="numeric"
            value={caen}
            onChange={(event) => setCaen(event.target.value)}
            placeholder={t`e.g. 47 or 4752`}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-blue)] px-5 py-2.5 text-base font-bold text-white transition-opacity hover:opacity-90"
          data-testid="company-search-submit"
        >
          <Trans>Search companies</Trans>
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-base font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)]"
        >
          <Trans>Clear filters</Trans>
        </button>
      </div>
    </form>
  )
}
