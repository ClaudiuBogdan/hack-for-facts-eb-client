import { createLazyFileRoute } from '@tanstack/react-router'

import { AgentPage } from '@/features/agent/components/agent-page'

export const Route = createLazyFileRoute('/agent')({
  component: AgentPage,
})
