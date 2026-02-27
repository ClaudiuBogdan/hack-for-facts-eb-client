import { ExternalLink } from 'lucide-react'
import { getCampaignText } from '../../hooks/use-campaign-content'
import type { CampaignLocale, CampaignResourceDefinition } from '../../types'

type CampaignResourcesSectionProps = {
  readonly locale: CampaignLocale
  readonly resources: readonly CampaignResourceDefinition[]
}

export function CampaignResourcesSection({ locale, resources }: CampaignResourcesSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Resurse utile</h2>
      <ul className="mt-4 space-y-2">
        {resources.map((resource) => (
          <li key={resource.id}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
            >
              <span>{getCampaignText(resource.title, locale)}</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
