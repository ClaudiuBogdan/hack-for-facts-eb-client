import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  procurementFieldClassName,
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'

/**
 * The overview's single search entry point — submits into the search tab
 * (`/procurement/search?q=`), which owns all further filtering. One search
 * input across the feature, not two divergent ones.
 *
 * Deliberately NOT debounced-auto-applying like the search tab's input: this
 * one changes route, so committing on every keystroke would yank the reader off
 * the hub mid-word. Enter submits; the hint below says so.
 */
export function ProcurementSearchDock() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  return (
    <section className={cn(procurementSectionClassName, 'p-5 sm:p-6')}>
      <h2 className={procurementSectionTitleClassName}>
        <Trans>Search public procurement</Trans>
      </h2>
      <p className={procurementSectionDescriptionClassName}>
        <Trans>
          Find procedures, contracts and direct acquisitions by title, number,
          CUI or party name.
        </Trans>
      </p>
      <form
        role="search"
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          const q = query.trim()
          void navigate({
            to: '/procurement/search',
            search: q ? { q } : {},
          })
        }}
      >
        <div className="relative min-w-0">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)]"
          />
          <input
            id="procurement-hub-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            className={cn(procurementFieldClassName, 'w-full px-11')}
            placeholder={t`e.g. hospital, 4267117, road repairs`}
            aria-label={t`Search procurement records`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="mt-2 text-sm text-[var(--pnrr-muted)]">
          <Trans>Press Enter to search</Trans>
        </p>
      </form>
    </section>
  )
}
