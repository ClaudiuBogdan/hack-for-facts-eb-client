import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { BookOpen, Library, FileText, ExternalLink, ArrowLeft, Video } from 'lucide-react'
import {
  getCampaignResources,
  getCampaignText,
} from '../../hooks/use-campaign-content'
import { buildCampaignBudgetPath } from '../../constants'
import type { CampaignLocale, CampaignResourceDefinition, CampaignResourceKind } from '../../types'

type BugetResourcesPageProps = {
  readonly locale: CampaignLocale
  readonly entityCui: string
}

const RESOURCE_ICONS: Record<CampaignResourceKind, typeof BookOpen> = {
  guide: BookOpen,
  tutorial: Video,
  template: FileText,
  reference: Library,
}

type ResourceGroup = {
  readonly label: string
  readonly items: readonly CampaignResourceDefinition[]
}

function groupResources(resources: readonly CampaignResourceDefinition[], locale: CampaignLocale): readonly ResourceGroup[] {
  const guides = resources.filter((r) => r.kind === 'guide' || r.kind === 'reference')
  const videos = resources.filter((r) => r.kind === 'tutorial')
  const templates = resources.filter((r) => r.kind === 'template')

  const groups: ResourceGroup[] = []
  if (guides.length > 0) {
    groups.push({ label: locale === 'en' ? 'Guides' : 'Ghiduri', items: guides })
  }
  if (videos.length > 0) {
    groups.push({ label: locale === 'en' ? 'Videos' : 'Video', items: videos })
  }
  if (templates.length > 0) {
    groups.push({ label: locale === 'en' ? 'Templates' : 'Modele', items: templates })
  }
  return groups
}

export function BugetResourcesPage({
  locale,
  entityCui,
}: BugetResourcesPageProps) {
  const allResources = getCampaignResources()
  const groups = groupResources(allResources, locale)
  const linkSearch: Record<string, string> = {}
  if (locale === 'en') linkSearch.lang = 'en'

  return (
    <section className="mx-auto max-w-3xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 px-4 py-6 sm:px-6 sm:py-10">
      {/* Back + Header */}
      <Link
        to={buildCampaignBudgetPath(entityCui) as '/'}
        search={linkSearch}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t`Back to challenges`}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {t`Guides & templates`}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground font-medium">
          <Trans>Budget guides, request templates, and useful resources for civic engagement.</Trans>
        </p>
      </div>

      {/* Grouped resource lists */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {group.label}
            </span>
            <div className="mt-2 rounded-2xl bg-muted/20 border border-border/30 divide-y divide-border/20">
              {group.items.map((resource) => {
                const Icon = RESOURCE_ICONS[resource.kind] ?? BookOpen
                return (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 first:rounded-t-2xl last:rounded-b-2xl group/item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground/80 truncate">
                        {getCampaignText(resource.title, locale)}
                      </span>
                      {resource.description && (
                        <span className="block text-[11px] text-muted-foreground mt-0.5">
                          {getCampaignText(resource.description, locale)}
                        </span>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/item:text-muted-foreground transition-colors flex-shrink-0" aria-hidden="true" />
                    <span className="sr-only">({t`opens in new tab`})</span>
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-[11px] text-muted-foreground/70 leading-relaxed">
        <Trans>
          These materials are part of the project
        </Trans>
        {' '}
        <a
          href="https://funky.ong/dezvoltarea-capacitatii-de-advocacy-a-ong-in-politicile-fiscale-si-bugetare/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          {locale === 'en'
            ? 'Developing NGO advocacy capacity in fiscal and budgetary policies'
            : 'Dezvoltarea capacitatii de advocacy a ONG in politicile fiscale si bugetare'}
        </a>
        {' - '}
        <a
          href="https://funky.ong"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Funky Citizens
        </a>
      </p>
    </section>
  )
}
