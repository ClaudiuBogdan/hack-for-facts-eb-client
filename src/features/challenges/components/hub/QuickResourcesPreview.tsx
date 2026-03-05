import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { BookOpen, GraduationCap, FileText, Library, ExternalLink, ArrowRight } from 'lucide-react'
import {
  getCampaignResources,
  getCampaignText,
} from '@/features/campaigns/local-budget-2026/hooks/use-campaign-content'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import type { CampaignResourceKind } from '@/features/campaigns/local-budget-2026/types'
import type { ChallengeLocale } from '../../types'

type QuickResourcesPreviewProps = {
  readonly locale: ChallengeLocale
}

const RESOURCE_ICONS: Record<CampaignResourceKind, typeof BookOpen> = {
  guide: BookOpen,
  tutorial: GraduationCap,
  template: FileText,
  reference: Library,
}

export function QuickResourcesPreview({ locale }: QuickResourcesPreviewProps) {
  const resources = getCampaignResources().slice(0, 3)
  const linkSearch: Record<string, string> = {}
  if (locale === 'en') linkSearch.lang = 'en'

  if (resources.length === 0) return null

  return (
    <div className="rounded-2xl bg-muted/20 p-5 border border-border/30">
      {/* Label */}
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        {t`Resources`}
      </span>

      {/* Resource items */}
      <div className="mt-4 space-y-1">
        {resources.map((resource) => {
          const Icon = RESOURCE_ICONS[resource.kind] ?? BookOpen
          return (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 -mx-1 hover:bg-muted/40 rounded-xl transition-colors group/item"
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
      <div className="mt-4 pt-4 border-t border-border/20">
        <Link
          to={`${CAMPAIGN_BASE_PATH}/principal` as '/'}
          search={linkSearch}
          className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          {t`View all`}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
