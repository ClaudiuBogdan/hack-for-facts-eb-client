import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { GraduationCap, ExternalLink, ArrowRight, Building2, Send, Library } from 'lucide-react'
import {
  getCampaignResources,
  getCampaignText,
} from '@/features/campaigns/buget/hooks/use-campaign-content'
import { buildCampaignResourcesPath } from '@/features/campaigns/buget/constants'
import {
  buildCampaignPrimariePath,
  buildCampaignProvocariStepPath,
} from '../../constants'
import type { ChallengeLocale } from '../../types'

type QuickResourcesPreviewProps = {
  readonly locale: ChallengeLocale
  readonly entityCui?: string
}

const TUTORIAL_RESOURCE_ID = 'tutorial-utilizare-platforma'

export function QuickResourcesPreview({
  locale,
  entityCui,
}: QuickResourcesPreviewProps) {
  const resources = getCampaignResources()
  const tutorialResource = resources.find((r) => r.id === TUTORIAL_RESOURCE_ID)
  const linkSearch: Record<string, string> = {}
  if (locale === 'en') linkSearch.lang = 'en'

  if (!tutorialResource && !entityCui) return null

  return (
    <div className="rounded-2xl bg-muted/20 p-5 border border-border/30">
      {/* Label */}
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
        {t`Resources`}
      </span>

      {/* Resource items */}
      <div className="mt-4 space-y-1">
        {/* My city hall */}
        {entityCui ? (
          <Link
            to={buildCampaignPrimariePath(entityCui) as '/'}
            search={linkSearch}
            preload="intent"
            className="flex items-center gap-3 rounded-xl p-2.5 -mx-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-slate-300" aria-hidden="true" />
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

        {/* Send debate request */}
        {entityCui ? (
          <Link
            to={buildCampaignProvocariStepPath(entityCui, 'civic-campaign', 'civic-monitor-and-request', '04-debate-request') as '/'}
            search={{ ...linkSearch, section: 'trimite-cererea', view: 'section' as const }}
            preload="intent"
            className="flex items-center gap-3 rounded-xl p-2.5 -mx-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Send className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground/80">
                {t`Send debate request`}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t`Request a public debate for the local budget.`}
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors flex-shrink-0" aria-hidden="true" />
          </Link>
        ) : null}

        {/* Guides & templates */}
        {entityCui ? (
          <Link
            to={buildCampaignResourcesPath(entityCui) as '/'}
            search={linkSearch}
            preload="intent"
            className="flex items-center gap-3 rounded-xl p-2.5 -mx-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Library className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground/80">
                {t`Guides & templates`}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t`Budget guides, request templates, and more.`}
              </span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors flex-shrink-0" aria-hidden="true" />
          </Link>
        ) : null}

        {/* Tutorial (standalone external resource) */}
        {tutorialResource ? (
          <a
            href={tutorialResource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 -mx-1 hover:bg-muted/40 rounded-xl transition-colors group/item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground/80 flex-1 truncate">
              {getCampaignText(tutorialResource.title, locale)}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/item:text-muted-foreground transition-colors flex-shrink-0" />
          </a>
        ) : null}
      </div>
    </div>
  )
}
