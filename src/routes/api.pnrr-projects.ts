import { createFileRoute } from '@tanstack/react-router'

const pnrrProxyModulePromise = import('@/server/handlers/pnrr-data-proxy')

export const Route = createFileRoute('/api/pnrr-projects')({
  server: {
    handlers: {
      GET: async () => {
        const { handlePnrrDataRequest } = await pnrrProxyModulePromise
        return handlePnrrDataRequest()
      },
      HEAD: async () => {
        const { handlePnrrDataRequest } = await pnrrProxyModulePromise
        const response = await handlePnrrDataRequest()
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      },
    },
  },
})
