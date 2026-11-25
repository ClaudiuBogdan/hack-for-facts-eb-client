import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react'
import { ArrowLeft } from 'lucide-react'
import { DataStatusBadge } from '@/components/data-trust'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CruxMarks } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import type { DataStatus } from '@/schemas/elections'
import { formatLegalDate } from '../lib/legal-format'

export type LegislationTab = 'analiza' | 'cauta' | 'acte' | 'modificari' | 'monitorul' | 'ghid'

type Props = {
  readonly activeTab: LegislationTab
  readonly measuredAt?: string | null
  /**
   * Trust state for the whole page, in the source line under the lede: the mock/live label is a product
   * requirement (DESIGN.md §Mock-First Contract).
   */
  readonly dataStatus?: DataStatus
  readonly children: ReactNode
}

type PageSpec = {
  readonly id: LegislationTab
  /** The short name in the pinned row and the trail. */
  readonly label: string
  readonly title: string
  readonly lede: string
  readonly to: '/legislation/search' | '/legislation/acts' | '/legislation/analytics' | '/legislation/changes' | '/legislation/gazette' | '/legislation/guide'
}

/** Built on render, so the strings follow the reader's language. */
function legislationPages(): readonly PageSpec[] {
  return [
    {
      id: 'cauta',
      label: t`Caută`,
      title: t`Caută în legislație`,
      lede: t`Un act după număr sau după denumire, cu statutul lui actual.`,
      to: '/legislation/search',
    },
    {
      id: 'acte',
      label: t`Acte`,
      title: t`Actele`,
      lede: t`Fiecare act din Portal Legislativ, cu tipul, anul și statutul lui.`,
      to: '/legislation/acts',
    },
    {
      id: 'analiza',
      label: t`Analiză`,
      title: t`Analiza legislației`,
      lede: t`Actele numărate: ce fac, cine le emite, cum se schimbă și cum se leagă între ele.`,
      to: '/legislation/analytics',
    },
    {
      id: 'modificari',
      label: t`Modificări`,
      title: t`Modificările`,
      lede: t`Ce act s-a schimbat, prin ce act, felul schimbării și data intrării în vigoare.`,
      to: '/legislation/changes',
    },
    {
      id: 'monitorul',
      label: t`Monitorul Oficial`,
      title: t`Monitorul Oficial`,
      lede: t`Edițiile Monitorului Oficial: numărul, data, partea și PDF-ul oficial.`,
      to: '/legislation/gazette',
    },
    {
      id: 'ghid',
      label: t`Ghid`,
      title: t`Ghidul legislației`,
      lede: t`Cum găsești o lege, cum îi citești statutul și ce nu îți pot spune aceste date.`,
      to: '/legislation/guide',
    },
  ]
}

/**
 * The slim head of the legislation pages other than `/legislation` (owner, 25 November 2026, the `?v=pagina`
 * example): the way back to the landing and the page's place, its title and one sentence, the source line, then
 * one pinned row of the sibling pages, where the landing pins its sections. No hero, no statue, no tab bar, no
 * figures in the head.
 */
export function LegislationShell({ activeTab, measuredAt, dataStatus, children }: Props) {
  const { i18n } = useLingui()
  const pages = legislationPages()
  const current = pages.find((page) => page.id === activeTab) ?? pages[0]

  return (
    <div className="relative min-h-screen w-full min-w-0 overflow-x-clip bg-background">
      <header className="relative border-b">
        <RuledFrame className="py-8 sm:py-10">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {/* exact: on /legislation/guide the way home is not the current page */}
            <Link to="/legislation" activeOptions={{ exact: true }} className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Legislație`}</span>
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{current?.label}</span>
          </MonoLabel>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-4 sm:text-5xl">{current?.title}</h1>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{current?.lede}</p>
          {/* A <div>, not a <p>: the badge renders a <div>, which a paragraph cannot hold (the HTML parser would
              close it and hydration would differ). The sources always show; the date and badge when known. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              <Trans>Portal Legislativ și Monitorul Oficial</Trans>
              {measuredAt ? (
                <>
                  {' · '}
                  <Trans>date până la {formatLegalDate(measuredAt, i18n.locale)}</Trans>
                </>
              ) : null}
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
            {pages.map((page) => {
              const isCurrent = page.id === activeTab
              return (
                <li key={page.id} className="shrink-0">
                  <Link
                    to={page.to}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cn(
                      // the row scrolls sideways, so an outward focus outline would be clipped: draw it inside
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

      {/* The legislation shell adds no main landmark. A fragment target (#raspuns, #acte) lands below the pinned row. */}
      <RuledFrame className="py-8 sm:py-10 [&_[id]]:scroll-mt-14">{children}</RuledFrame>
    </div>
  )
}
