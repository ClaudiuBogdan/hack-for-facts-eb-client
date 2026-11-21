/**
 * QuickLinks Component
 *
 * A grid of clickable cards linking to key government websites
 * for budget transparency. Each card shows name, description,
 * and opens external link in new tab.
 *
 * @example
 * ```mdx
 * <QuickLinks locale="en" />
 * ```
 */

import { t } from '@lingui/core/macro'
import { ExternalLink, Building2, Landmark, Scale, Database, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LearningLocale } from '../../types'
import type { QuickLinkItem } from './document-tracking-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type QuickLinksProps = {
  readonly locale?: LearningLocale
  readonly links: readonly QuickLinkItem[]
}

// ═══════════════════════════════════════════════════════════════════════════
// Icon Mapping
// ═══════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<QuickLinkItem['icon'], typeof Building2> = {
  ministry: Building2,
  parliament: Landmark,
  audit: Scale,
  data: Database,
  transparency: Search,
}

// ═══════════════════════════════════════════════════════════════════════════
// Link Card Component
// ═══════════════════════════════════════════════════════════════════════════

type LinkCardProps = {
  readonly link: QuickLinkItem
}

function LinkCard({ link }: LinkCardProps) {
  const Icon = ICON_MAP[link.icon]

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block p-4 rounded-lg border border-border',
        'bg-card',
        'hover:border-primary/40 hover:shadow-sm',
        'transition-all duration-200'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="p-2 rounded-md shrink-0 bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name with external link indicator */}
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-foreground transition-colors">
              {link.name}
            </h4>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mt-1">{link.description}</p>

          {/* URL hint */}
          <p className="text-xs text-muted-foreground mt-2 truncate">{link.url.replace('https://', '')}</p>
        </div>
      </div>
    </a>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function QuickLinks({ links }: QuickLinksProps) {
  return (
    <div className="my-8 space-y-4">
      {/* Header */}
      <h3 className="text-lg font-semibold text-foreground px-1">{t`Key Websites`}</h3>

      {/* Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  )
}

export type { QuickLinksProps }
