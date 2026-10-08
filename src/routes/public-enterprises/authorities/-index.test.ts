import { describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn((options: Record<string, unknown>) => Object.assign(new Error('redirect'), { options }))
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options, redirect: redirectMock }))

describe('/public-enterprises/authorities', () => {
  it('leads to the hub’s band of who controls the enterprises, for now', async () => {
    const { Route } = await import('./index')
    expect(() => (Route as unknown as { readonly beforeLoad: () => void }).beforeLoad()).toThrow('redirect')
    expect(redirectMock).toHaveBeenCalledWith({ to: '/public-enterprises', search: true, hash: 'control', statusCode: 302 })
  })
})
