import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Check, Link2 } from 'lucide-react'

import { NationalBudgetAdapterProvider } from '@/features/national-budget/page/api/adapter-provider'
import { nationalBudgetMockAdapter } from '@/features/national-budget/page/api/national-budget-page-api.mock'
import { cn } from '@/lib/utils'
import type { BudgetCatalog, BudgetEdition } from '@/schemas/national-budget-page'
import { withDemo } from './page.demo'
import { coverageLabel, editionLabel, editionVersion, measureLabel } from './page.format'
import { Frame, Missing, Skeleton } from './page.parts'
import type { Demo, PageState } from './page.state'

/** Both variants read the same mock adapter (or a `?demo=` state of it). */
export function PageShell({ demo, children }: { readonly demo: Demo | null; readonly children: ReactNode }) {
  return (
    <NationalBudgetAdapterProvider adapter={withDemo(nationalBudgetMockAdapter, demo)}>
      <div className="min-w-0 bg-background">{children}</div>
    </NationalBudgetAdapterProvider>
  )
}

/** Copies this view's address: every control writes it. */
export function ShareButton({ className }: { readonly className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }
      aria-label={copied ? t`Legătură copiată` : t`Copiază legătura acestei vederi`}
      className={cn('inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground sm:size-7 sm:min-h-0 sm:min-w-0', className)}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

/** The whole page when the API answers that it is not deployed. */
export function ApiPending() {
  return (
    <Frame className="py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t`Bugetul de stat`}</h1>
      <div className="mt-6">
        <Missing reason="api_pending" className="text-base" />
      </div>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {t`Legile bugetului 2019–2025 și buletinele lunare de execuție sunt în baza de date, verificate; serverul nu le expune încă.`}
      </p>
    </Frame>
  )
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label={t`Se încarcă bugetul`}>
      <Frame className="space-y-4 py-10">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-9 w-2/3" />
      </Frame>
      <div className="border-y">
        <Frame className="grid gap-px py-6 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </Frame>
      </div>
      <Frame className="space-y-2 py-8">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-7" />
        ))}
      </Frame>
    </div>
  )
}

/** The page's caveats, behind one marker: what is off for this selection, then the standing rules. */
export function pageNotes({
  catalog,
  edition,
  targetYear,
  month,
  state,
}: {
  readonly catalog: BudgetCatalog
  readonly edition: BudgetEdition
  readonly targetYear: number
  readonly month: string
  readonly state: PageState
}): { readonly alerts: readonly string[]; readonly facts: readonly string[] } {
  const alerts: string[] = []
  if (edition.status === 'draft') {
    alerts.push(t`${editionLabel(edition)} e un proiect (martie 2026), extras din PDF și nevalidat; nu e legea adoptată.`)
  }
  if (targetYear !== edition.budgetYear) {
    alerts.push(t`${measureLabel(edition, targetYear)}: o estimare, nu o aprobare și nu o execuție.`)
  }
  if (state.scope === 'consolidated') {
    alerts.push(t`Legile nu au un total aprobat pentru bugetul general consolidat; suma celor patru bugete nu îl înlocuiește, pentru că bugetele își transferă bani între ele.`)
  }
  if (month.slice(5, 7) !== '12') {
    const covered = coverageLabel(month)
    alerts.push(t`Execuția acoperă ${covered}: nu e un an întreg și nu se compară cu planul anual.`)
  }
  const release = catalog.releases.find((item) => item.periodEnd.startsWith(month))
  if (release?.status === 'gap') alerts.push(t`Buletinul pentru luna aleasă nu e publicat.`)
  if (edition.key === '2025') alerts.push(t`Lista ordonatorilor din 2025 e inventată, cu excepția unui rând real (Administrația Prezidențială): eșantionul nu are restul.`)
  const facts = [
    edition.status === 'draft'
      ? t`Proiect, martie 2026: extras din PDF, nevalidat; nu e legea adoptată.`
      : t`Legea: ${editionVersion(edition)}. Rectificările de peste an nu sunt în date, deci planul nu e creditul final.`,
    t`Sumele din lege sunt tipărite în mii de lei și afișate în lei; execuția vine deja în lei.`,
    t`Totalurile se citesc din rândul de total tipărit; rândurile de total, subtotal și detaliu nu se adună.`,
    t`„Decembrie” înseamnă cumulat la decembrie, nu contul general de execuție final.`,
  ]
  return { alerts, facts }
}
