import { createFileRoute } from '@tanstack/react-router'

const pnrrProxyModulePromise = import('@/server/handlers/pnrr-data-proxy')

export const Route = createFileRoute('/api/pnrr/raw/indicators')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handlePnrrRawDataRequest } = await pnrrProxyModulePromise
        return handlePnrrRawDataRequest('indicators', request)
      },
      HEAD: async ({ request }) => {
        const { handlePnrrRawDataRequest } = await pnrrProxyModulePromise
        const response = await handlePnrrRawDataRequest('indicators', request)
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      },
    },
  },
})
