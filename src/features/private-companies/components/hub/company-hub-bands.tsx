import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE } from '../../lib/company-status-codes'

/** Saved directory queries, with no count: their size is the directory's to say. */
export function HubStartBand({ index }: { readonly index: string }) {
  return (
    <section aria-labelledby="hub-start-title">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead titleId="hub-start-title" index={index} title={<Trans>De aici poți începe</Trans>} />
        <ul className="mt-8 grid gap-px border bg-border/70 sm:grid-cols-4" data-testid="company-hub-start" data-reveal>
          <StartCard to={{ status: INSOLVENCY_STATUSES }} title={<Trans>Firme cu înscrieri de insolvență sau faliment</Trans>} />
          <StartCard to={{ inactive: true, status: [STATUS_ACTIVE] }} title={<Trans>În funcțiune în registru, inactive fiscal la ANAF</Trans>} />
          <StartCard to={{ status: DISSOLUTION_STATUSES }} title={<Trans>Firme cu înscrieri de dizolvare sau lichidare</Trans>} />
          <li>
            <Link to="/companies/analytics" className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
              <span className="block text-base font-semibold tracking-tight text-foreground">
                <Trans>Analiza bilanțurilor</Trans>
              </span>
            </Link>
          </li>
        </ul>
      </RuledFrame>
    </section>
  )
}

function StartCard({ to, title }: { readonly to: Record<string, unknown>; readonly title: ReactNode }) {
  return (
    <li>
      <Link to="/companies/search" search={to} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
        <span className="block text-base font-semibold tracking-tight text-foreground">{title}</span>
      </Link>
    </li>
  )
}
