import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const createFileRouteMock = vi.fn(() => routeStub)
const handleEntityShareImageRequestMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: createFileRouteMock,
}))

vi.mock('@/server/handlers/entity-share-image', () => ({
  handleEntityShareImageRequest: handleEntityShareImageRequestMock,
}))

async function importRoute() {
  const { Route } = await import('./share-image[.]png')

  return Route as unknown as {
    server: {
      handlers: {
        GET: (input: {
          request: Request
          params: {
            cui: string
          }
        }) => Promise<Response>
        HEAD: (input: {
          request: Request
          params: {
            cui: string
          }
        }) => Promise<Response>
      }
    }
  }
}

describe('primarie share image route', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    handleEntityShareImageRequestMock.mockReset()
  })

  it('registers the compatibility share-image route and forwards GET', async () => {
    const response = new Response('image-bytes', {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
    })
    handleEntityShareImageRequestMock.mockResolvedValue(response)

    const route = await importRoute()
    const request = new Request('https://transparenta.eu/primarie/4305857/share-image.png')
    const result = await route.server.handlers.GET({
      request,
      params: {
        cui: '4305857',
      },
    })

    expect(createFileRouteMock).toHaveBeenCalledWith('/primarie/$cui/share-image.png')
    expect(handleEntityShareImageRequestMock).toHaveBeenCalledWith({
      request,
      cui: '4305857',
    })
    expect(result).toBe(response)
  })

  it('forwards HEAD and mirrors the status and headers without a body', async () => {
    handleEntityShareImageRequestMock.mockResolvedValue(
      new Response('image-bytes', {
        status: 202,
        headers: {
          'cache-control': 'public, max-age=60',
          'content-type': 'image/png',
        },
      }),
    )

    const route = await importRoute()
    const request = new Request('https://transparenta.eu/primarie/4305857/share-image.png', {
      method: 'HEAD',
    })
    const response = await route.server.handlers.HEAD({
      request,
      params: {
        cui: '4305857',
      },
    })

    expect(handleEntityShareImageRequestMock).toHaveBeenCalledWith({
      request,
      cui: '4305857',
    })
    expect(response.status).toBe(202)
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(response.headers.get('content-type')).toBe('image/png')
    await expect(response.text()).resolves.toBe('')
  })
})
