import { Outlet, useLocation } from '@tanstack/react-router'
import { CampaignProgressProvider } from '../../hooks/use-campaign-progress'

export function CampaignLayout() {
  return (
    <CampaignProgressProvider>
      <CampaignLayoutInner />
    </CampaignProgressProvider>
  )
}

function CampaignLayoutInner() {
  const location = useLocation()
  const isChallengesRoute = location.pathname.includes('/challenges')

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {isChallengesRoute ? (
        <Outlet />
      ) : (
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      )}
    </div>
  )
}
