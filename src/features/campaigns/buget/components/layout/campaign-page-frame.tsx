import type { PropsWithChildren } from 'react'
import { CampaignProgressProvider } from '../../hooks/use-campaign-progress'

export function CampaignPageBackground({
  children,
}: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {children}
    </div>
  )
}

export function CampaignCenteredShell({
  children,
}: PropsWithChildren) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {children}
    </main>
  )
}

export function CampaignPageFrame({
  children,
}: PropsWithChildren) {
  return (
    <CampaignProgressProvider>
      <CampaignPageBackground>
        <CampaignCenteredShell>{children}</CampaignCenteredShell>
      </CampaignPageBackground>
    </CampaignProgressProvider>
  )
}
