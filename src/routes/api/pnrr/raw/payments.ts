import { createFileRoute } from '@tanstack/react-router'

const pnrrProxyModulePromise = import('@/server/handlers/pnrr-data-proxy')

export const Route = createFileRoute('/api/pnrr/raw/payments')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handlePnrrRawDataRequest } = await pnrrProxyModulePromise
        return handlePnrrRawDataRequest('payments', request)
      },
      HEAD: async ({ request }) => {
        const { handlePnrrRawDataRequest } = await pnrrProxyModulePromise
        const response = await handlePnrrRawDataRequest('payments', request)
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      },
    },
  },
})
