import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useState } from 'react'
import { BookOpen, GraduationCap, FileText, Library, ExternalLink, ArrowRight, Building2 } from 'lucide-react'
import {
  getCampaignResources,
  getCampaignText,
} from '@/features/campaigns/buget/hooks/use-campaign-content'
import type { CampaignResourceKind } from '@/features/campaigns/buget/types'
import { Button } from '@/components/ui/button'
import { buildCampaignPrimariePath } from '../../constants'
import type { ChallengeLocale } from '../../types'

type QuickResourcesPreviewProps = {
  readonly locale: ChallengeLocale
  readonly entityCui?: string
}

const RESOURCE_ICONS: Record<CampaignResourceKind, typeof BookOpen> = {
  guide: BookOpen,
  tutorial: GraduationCap,
  template: FileText,
  reference: Library,
}

export function QuickResourcesPreview({
  locale,
  entityCui,
}: QuickResourcesPreviewProps) {
  const resources = getCampaignResources()
  const [showsAllResources, setShowsAllResources] = useState(false)
  const visibleResources = showsAllResources ? resources : resources.slice(0, 3)
  const linkSearch: Record<string, string> = {}
  if (locale === 'en') linkSearch.lang = 'en'

  if (resources.length === 0 && !entityCui) return null

  return (
    <div className="rounded-2xl bg-muted/20 p-5 border border-border/30">
      {/* Label */}
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        {t`Resources`}
      </span>

      {/* Resource items */}
      <div className="mt-4 space-y-1">
        {entityCui ? (
          <Link
            to={buildCampaignPrimariePath(entityCui) as '/'}
            search={linkSearch}
            preload="intent"
            className="flex items-center gap-3 rounded-xl p-2.5 -mx-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground/80">
                {t`My city hall`}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t`See the budget analysis for the selected entity.`}
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors flex-shrink-0" aria-hidden="true" />
          </Link>
        ) : null}

        {visibleResources.map((resource) => {
          const Icon = RESOURCE_ICONS[resource.kind] ?? BookOpen
          return (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 -mx-1 hover:bg-muted/40 rounded-xl transition-colors group/item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground/80 flex-1 truncate">
                {getCampaignText(resource.title, locale)}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/item:text-muted-foreground transition-colors flex-shrink-0" />
            </a>
          )
        })}
      </div>

      {/* View all footer */}
      {resources.length > 3 ? (
        <div className="mt-4 pt-4 border-t border-border/20">
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 text-xs font-semibold text-muted-foreground hover:text-primary"
            onClick={() => setShowsAllResources((currentValue) => !currentValue)}
          >
            {showsAllResources ? t`Show less` : t`View all`}
            <ArrowRight
              className={`ml-1 h-3 w-3 transition-transform ${showsAllResources ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
