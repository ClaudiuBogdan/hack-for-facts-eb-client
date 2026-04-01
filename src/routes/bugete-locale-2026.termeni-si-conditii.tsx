import { createFileRoute, redirect } from '@tanstack/react-router'
import { CAMPAIGN_TERMS_PATH } from '@/features/campaigns/buget/constants'

export const Route = createFileRoute('/bugete-locale-2026/termeni-si-conditii')({
  beforeLoad: () => {
    throw redirect({
      to: CAMPAIGN_TERMS_PATH,
      replace: true,
    })
  },
})
