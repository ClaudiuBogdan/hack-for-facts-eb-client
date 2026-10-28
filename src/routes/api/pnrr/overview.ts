import { createFileRoute } from '@tanstack/react-router'

const pnrrOverviewModulePromise = import('@/server/handlers/pnrr-overview')

export const Route = createFileRoute('/api/pnrr/overview')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handlePnrrOverviewRequest } = await pnrrOverviewModulePromise
        return handlePnrrOverviewRequest(request)
      },
    },
  },
})
