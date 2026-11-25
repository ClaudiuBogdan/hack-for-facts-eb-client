import { createFileRoute } from '@tanstack/react-router'

const shareImageHandlerModulePromise = import('@/server/handlers/national-budget-share-image')

async function handleShareImageRequest(request: Request) {
  const { handleNationalBudgetShareImageRequest } = await shareImageHandlerModulePromise
  return handleNationalBudgetShareImageRequest(request)
}

export const Route = createFileRoute('/national-budget/share-image.png')({
  server: {
    handlers: {
      GET: ({ request }) => handleShareImageRequest(request),
      HEAD: async ({ request }) => {
        const response = await handleShareImageRequest(request)
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      },
    },
  },
})
