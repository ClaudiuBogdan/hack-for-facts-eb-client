/* eslint-disable react-refresh/only-export-components */
import type { MouseEvent, ReactNode } from 'react'
import type { Mock } from 'vitest'

type MockLinkProps = {
  readonly children: ReactNode
  readonly to: string
  readonly params?: Record<string, string>
  readonly search?: Record<string, unknown>
  readonly hash?: string
  readonly className?: string
  readonly onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

function MockRouterLink({
  children,
  to,
  params,
  search,
  hash,
  className,
  onClick,
}: MockLinkProps) {
  let href = to
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      href = href.replace(`$${key}`, value)
    }
  }
  if (hash) {
    href += `#${hash}`
  }

  return (
    <a
      href={href}
      data-to={to}
      data-hash={hash ?? ''}
      data-search={search ? JSON.stringify(search) : undefined}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
    >
      {children}
    </a>
  )
}

/** TanStack Router mock factory for procurement component tests. */
export function buildProcurementRouterMock(navigate: Mock) {
  return {
    Link: MockRouterLink,
    useNavigate: () => navigate,
  }
}
