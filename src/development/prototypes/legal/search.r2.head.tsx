import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowLeft } from 'lucide-react'
import { DataStatusBadge } from '@/components/data-trust'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CruxMarks } from '@/features/landing/components/hero-chrome'
import { formatLegalDate } from '@/features/legal/lib/legal-format'
import { cn } from '@/lib/utils'
import type { DataStatus } from '@/schemas/elections'

/**
 * The search page's own head (owner, 26 November 2026: „prototype a shorter head"): the question is the head. The
 * way back, a smaller title, the search field where the other pages have their sentence, then the source line; the
 * pinned row of sibling pages and the answer follow, as the landing's hero holds its search above its pinned bar.
 * A copy of `LegislationShell`'s frame, kept here until the owner chooses: promoted, the shell takes the field as
 * a slot and this file goes.
 */

/** The sibling pages, as `LegislationShell` lists them (Acte, Monitorul Oficial and Ghid retired, 27 November 2026). */
function pages() {
  return [
    { id: 'cauta', label: t`Caută`, to: '/legislation/search' },
    { id: 'analiza', label: t`Analiză`, to: '/legislation/analytics' },
    { id: 'modificari', label: t`Modificări`, to: '/legislation/changes' },
  ] as const
}

export function SearchHeadShell({
  field,
  measuredAt,
  dataStatus,
  children,
}: {
  /** The search form, drawn in the head. */
  readonly field: ReactNode
  readonly measuredAt?: string | null
  readonly dataStatus?: DataStatus
  readonly children: ReactNode
}) {
  const { i18n } = useLingui()
  return (
    <div className="relative min-h-screen w-full min-w-0 overflow-x-clip bg-background">
      <header className="relative border-b">
        <RuledFrame className="py-6 sm:py-8">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/legislation" activeOptions={{ exact: true }} className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Legislație`}</span>
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{t`Caută`}</span>
          </MonoLabel>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tighter text-foreground sm:mt-3 sm:text-3xl">{t`Caută în legislație`}</h1>
          <div className="mt-4 max-w-4xl sm:mt-5">{field}</div>
          {/* A <div>, not a <p>: the badge renders a <div>. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t`Portal Legislativ și Monitorul Oficial`}
              {measuredAt ? ` · ${t`date până la ${formatLegalDate(measuredAt, i18n.locale)}`}` : ''}
            </span>
            {dataStatus ? <DataStatusBadge status={dataStatus} /> : null}
          </div>
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </header>

      <nav aria-label={t`Paginile legislației`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <RuledFrame className="overflow-x-auto py-0">
          <ul className="flex shrink-0 gap-5 sm:gap-6">
            {pages().map((page) => {
              const isCurrent = page.id === 'cauta'
              return (
                <li key={page.id} className="shrink-0">
                  <Link
                    to={page.to}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center whitespace-nowrap text-sm transition-colors hover:text-foreground focus-visible:-outline-offset-2',
                      isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {page.label}
                    {isCurrent ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </RuledFrame>
      </nav>

      <RuledFrame className="py-8 sm:py-10 [&_[id]]:scroll-mt-14">{children}</RuledFrame>
    </div>
  )
}
