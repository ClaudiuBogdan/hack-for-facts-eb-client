import { createFileRoute } from '@tanstack/react-router'

const pnrrProxyModulePromise = import('@/server/handlers/pnrr-data-proxy')

export const Route = createFileRoute('/api/pnrr/raw/projects')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handlePnrrRawDataRequest } = await pnrrProxyModulePromise
        return handlePnrrRawDataRequest('projects', request)
      },
      HEAD: async ({ request }) => {
        const { handlePnrrRawDataRequest } = await pnrrProxyModulePromise
        const response = await handlePnrrRawDataRequest('projects', request)
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      },
    },
  },
})
