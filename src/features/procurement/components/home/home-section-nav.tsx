import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import type { HomeSection } from '../../lib/home-links'

/** The company profile's pinned bar: the page's name, then its numbered bands. */
export function HomeSectionNav({ title, sections }: { readonly title: string; readonly sections: readonly HomeSection[] }) {
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-72">{title}</span>
        <ol className="flex shrink-0 gap-4 sm:gap-5 md:ml-auto">
          {sections.map((section, position) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <MonoLabel className="text-primary" aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </MonoLabel>
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </RuledFrame>
    </nav>
  )
}

/** One band of the page: the ruled column, its anchor under the pinned bar, the hubs' rhythm. */
export function HomeBand({ id, labelledBy, className, children }: { readonly id: string; readonly labelledBy: string; readonly className?: string; readonly children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-14 border-b', className)} aria-labelledby={labelledBy}>
      <RuledFrame className="py-14 sm:py-20">{children}</RuledFrame>
    </section>
  )
}
