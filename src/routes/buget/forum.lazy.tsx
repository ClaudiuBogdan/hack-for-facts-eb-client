import { createLazyFileRoute } from '@tanstack/react-router'
import { getCampaignDefinition } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-content'

export const Route = createLazyFileRoute('/buget/forum')({
  component: CampaignForumRedirectPage,
})

function CampaignForumRedirectPage() {
  const campaign = getCampaignDefinition()

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      Redirecționare către forum...
      <div className="mt-2">
        <a className="text-blue-600 hover:text-blue-700" href={campaign.forumUrl}>
          Continuă manual
        </a>
      </div>
    </div>
  )
}
