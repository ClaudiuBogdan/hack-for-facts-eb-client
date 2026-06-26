/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { vi } from 'vitest'

export const electionsNavigateMock = vi.fn()

type LinkProps = {
  readonly children: ReactNode
  readonly to: string
  readonly params?: Record<string, string>
  readonly search?: unknown
  readonly className?: string
}

export function MockElectionsLink({
  children,
  to,
  params,
  className,
}: LinkProps) {
  let href = to
  if (params !== undefined) {
    for (const [key, value] of Object.entries(params)) {
      href = href.replace(`$${key}`, value)
    }
  }

  return (
    <a href={href} className={className} data-testid={`link-${href}`}>
      {children}
    </a>
  )
}

export function createMockLazyFileRoute(
  getSearch: () => unknown,
  getParams: () => Record<string, string> = () => ({}),
) {
  return () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: getSearch,
    useParams: getParams,
  })
}
