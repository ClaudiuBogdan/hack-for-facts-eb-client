import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          const q = query.trim()
          void navigate({
            to: '/procurement/search',
            search: q ? { q } : {},
          })
        }}
      >
        <input
          type="search"
          className={procurementFieldClassName}
          placeholder={t`e.g. hospital, 4267117, road repairs`}
          aria-label={t`Search procurement records`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          type="submit"
          className="h-10 shrink-0 rounded-none bg-[#0b0c0c] px-5 text-base font-semibold text-white hover:opacity-90 dark:bg-[var(--pnrr-fg)] dark:text-[var(--pnrr-bg)]"
        >
          <Search className="mr-2 h-4 w-4" aria-hidden />
          <Trans>Search</Trans>
        </Button>
      </form>
    </section>
  )
}
