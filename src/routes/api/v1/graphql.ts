import { createFileRoute } from '@tanstack/react-router'

const API_PATH = '/api/v1/graphql'

function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_PROXY_TARGET ??
    import.meta.env.VITE_API_URL ??
    'http://127.0.0.1:3000'
  )
}

export const Route = createFileRoute('/api/v1/graphql')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const response = await fetch(`${getApiBaseUrl()}${API_PATH}`, {
          method: 'POST',
          headers: {
            Accept: request.headers.get('accept') ?? 'application/json',
            'Content-Type': request.headers.get('content-type') ?? 'application/json',
            ...(request.headers.has('authorization')
              ? { Authorization: request.headers.get('authorization')! }
              : {}),
          },
          body: await request.text(),
        })

        return new Response(await response.text(), {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('content-type') ?? 'application/json',
          },
        })
      },
    },
  },
})
