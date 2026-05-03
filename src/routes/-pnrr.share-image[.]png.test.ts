import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const createFileRouteMock = vi.fn(() => routeStub)
const handlePnrrShareImageRequestMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: createFileRouteMock,
}))

vi.mock('@/server/handlers/pnrr-share-image', () => ({
  handlePnrrShareImageRequest: handlePnrrShareImageRequestMock,
}))

async function importRoute() {
  const { Route } = await import('./pnrr.share-image[.]png')

  return Route as unknown as {
    server: {
      handlers: {
        GET: (input: { request: Request }) => Promise<Response>
        HEAD: (input: { request: Request }) => Promise<Response>
      }
    }
  }
}

describe('pnrr share image route', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    handlePnrrShareImageRequestMock.mockReset()
  })

  it('registers the PNRR share-image route and forwards GET', async () => {
    const response = new Response('image-bytes', {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
    })
    handlePnrrShareImageRequestMock.mockResolvedValue(response)

    const route = await importRoute()
    const request = new Request('https://transparenta.eu/pnrr/share-image.png')
    const result = await route.server.handlers.GET({ request })

    expect(createFileRouteMock).toHaveBeenCalledWith('/pnrr/share-image.png')
    expect(handlePnrrShareImageRequestMock).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it('forwards HEAD and mirrors status and headers without a body', async () => {
    handlePnrrShareImageRequestMock.mockResolvedValue(
      new Response('image-bytes', {
        status: 202,
        headers: {
          'cache-control': 'public, max-age=60',
          'content-type': 'image/png',
        },
      }),
    )

    const route = await importRoute()
    const request = new Request('https://transparenta.eu/pnrr/share-image.png', {
      method: 'HEAD',
    })
    const response = await route.server.handlers.HEAD({ request })

    expect(handlePnrrShareImageRequestMock).toHaveBeenCalledWith(request)
    expect(response.status).toBe(202)
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(response.headers.get('content-type')).toBe('image/png')
    await expect(response.text()).resolves.toBe('')
  })
})
