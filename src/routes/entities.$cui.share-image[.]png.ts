import { createFileRoute } from '@tanstack/react-router'

async function handleShareImageRequest(request: Request, cui?: string) {
  const { handleEntityShareImageRequest } = await import('@/server/handlers/entity-share-image')
  return handleEntityShareImageRequest({
    request,
    cui,
  })
}

export const Route = createFileRoute('/entities/$cui/share-image.png')({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        handleShareImageRequest(request, params.cui),
      HEAD: async ({ request, params }) => {
        const response = await handleShareImageRequest(request, params.cui)
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      },
    },
  },
})
