import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const createFileRouteMock = vi.fn(() => routeStub)
const handleNationalBudgetShareImageRequestMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: createFileRouteMock,
}))

vi.mock('@/server/handlers/national-budget-share-image', () => ({
  handleNationalBudgetShareImageRequest: handleNationalBudgetShareImageRequestMock,
}))

async function importRoute() {
  const { Route } = await import('./national-budget.share-image[.]png')

  return Route as unknown as {
    server: {
      handlers: {
        GET: (input: { request: Request }) => Promise<Response>
        HEAD: (input: { request: Request }) => Promise<Response>
      }
    }
  }
}

describe('national budget share image route', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    handleNationalBudgetShareImageRequestMock.mockReset()
  })

  it('registers the national budget share-image route and forwards GET', async () => {
    const response = new Response('image-bytes', {
      status: 200,
      headers: {
        'content-type': 'image/png',
      },
    })
    handleNationalBudgetShareImageRequestMock.mockResolvedValue(response)

    const route = await importRoute()
    const request = new Request('https://transparenta.eu/national-budget/share-image.png?an=2025&lang=en')
    const result = await route.server.handlers.GET({ request })

    expect(createFileRouteMock).toHaveBeenCalledWith('/national-budget/share-image.png')
    expect(handleNationalBudgetShareImageRequestMock).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it('forwards HEAD and mirrors status and headers without a body', async () => {
    handleNationalBudgetShareImageRequestMock.mockResolvedValue(
      new Response('image-bytes', {
        status: 200,
        headers: {
          'cache-control': 'public, max-age=3600',
          'content-type': 'image/png',
        },
      }),
    )

    const route = await importRoute()
    const request = new Request('https://transparenta.eu/national-budget/share-image.png', {
      method: 'HEAD',
    })
    const response = await route.server.handlers.HEAD({ request })

    expect(handleNationalBudgetShareImageRequestMock).toHaveBeenCalledWith(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(response.headers.get('content-type')).toBe('image/png')
    await expect(response.text()).resolves.toBe('')
  })
})
