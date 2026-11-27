import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import { useActiveSection } from '../../hooks/use-active-section'
import { PROFILE_SECTIONS, type ProfileSection } from './company-profile-sections'

const ITEM_CLASS = 'relative inline-flex h-12 items-center gap-2 px-2.5 text-sm'

/** The bar's frame: the name on the left from `md`, the list on the right; only the list scrolls sideways on a phone. */
function BarFrame({ name, children }: { readonly name: ReactNode; readonly children: ReactNode }) {
  return (
    <RuledFrame className="flex items-center gap-6 py-0">
      <span className="hidden min-w-0 truncate text-sm font-semibold tracking-tight text-foreground md:block md:max-w-72">{name}</span>
      <ol className="-mx-2.5 flex min-w-0 overflow-x-auto md:ml-auto md:mr-0">{children}</ol>
    </RuledFrame>
  )
}

/**
 * The pinned bar, as on the national budget page (owner, 25 November 2026):
 * the company's name, then its bands, each with an icon, the one being read
 * underlined. Mounted with the bands, so the sections it watches are there
 * when it starts.
 */
export function ProfileSectionBar({ name, sections }: { readonly name: string; readonly sections: readonly ProfileSection[] }) {
  const active = useActiveSection(sections.map((section) => section.id))
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <BarFrame name={name}>
        {sections.map((section) => {
          const current = active === section.id
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  ITEM_CLASS,
                  'transition-colors hover:text-foreground',
                  'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity',
                  current ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                )}
              >
                <section.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                {section.label()}
              </a>
            </li>
          )
        })}
      </BarFrame>
    </nav>
  )
}

/**
 * The bar while the company loads: the same frame and words, inert, the
 * name a pulse. Litigation is left out, as on every profile today (no
 * name-to-CUI link is published); a company without statements loses „An cu
 * an" when it arrives, a change along the bar, never in its height.
 */
export function ProfileSectionBarPending({ name }: { readonly name: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur" aria-hidden="true">
      <BarFrame name={name}>
        {PROFILE_SECTIONS.filter((section) => section.id !== 'litigii').map((section) => (
          <li key={section.id} className="shrink-0">
            <span className={cn(ITEM_CLASS, 'text-muted-foreground')}>
              <section.icon className="size-4 shrink-0 text-primary/50" />
              {section.label()}
            </span>
          </li>
        ))}
      </BarFrame>
    </div>
  )
}
