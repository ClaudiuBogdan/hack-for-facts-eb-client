import { describe, expect, it } from 'vitest'
import { resolveSsrResponseStatus } from './response-status'

describe('resolveSsrResponseStatus', () => {
  it('keeps a plain 200 when nothing set a status', () => {
    expect(resolveSsrResponseStatus({ routerStatus: 200, responseStatus: 200 })).toBe(200)
  })

  it('applies a status a loader set on the response', () => {
    expect(resolveSsrResponseStatus({ routerStatus: 200, responseStatus: 503 })).toBe(503)
  })

  it.each([404, 500, 302])('lets the router\'s own %s win', (routerStatus) => {
    expect(resolveSsrResponseStatus({ routerStatus, responseStatus: 503 })).toBe(routerStatus)
  })
})
