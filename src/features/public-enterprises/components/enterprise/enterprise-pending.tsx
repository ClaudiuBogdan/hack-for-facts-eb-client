import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'

/** A line of text not read yet, in its parent's font and leading. */
function Line({ className }: { readonly className?: string }) {
  return <span className={cn('block h-[0.8em] w-full animate-pulse rounded-sm bg-muted', className)} aria-hidden="true" />
}

/**
 * The enterprise page's head while its reads answer: the way back, the name
 * and the sentence as lines, the chart's room beside them. It imports no data
 * and none of the page's code, so the route's eager file stays light.
 */
export function PublicEnterprisePending() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" aria-busy="true">
      <section className="border-b">
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Link to="/public-enterprises" className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
                  <ArrowLeft className="size-3" aria-hidden="true" />
                  <span>{t`Întreprinderi publice`}</span>
                </Link>
              </MonoLabel>
              <div className="mt-4 text-4xl leading-[0.95] sm:text-6xl">
                <Line className="w-3/4" />
              </div>
              <div className="mt-5 max-w-[60ch] space-y-3 text-base sm:text-lg">
                <Line />
                <Line className="w-2/3" />
              </div>
              <span className="sr-only">{t`Se încarcă întreprinderea.`}</span>
            </div>
            <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">
              <HubPending rows={5} />
            </div>
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}
