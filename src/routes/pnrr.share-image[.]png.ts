import { createFileRoute } from '@tanstack/react-router'

const shareImageHandlerModulePromise = import('@/server/handlers/pnrr-share-image')

async function handleShareImageRequest(request: Request) {
  const { handlePnrrShareImageRequest } = await shareImageHandlerModulePromise
  return handlePnrrShareImageRequest(request)
}

export const Route = createFileRoute('/pnrr/share-image.png')({
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
