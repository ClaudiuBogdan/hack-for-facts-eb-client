import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

type Props = {
  readonly children: ReactNode
  readonly className?: string
}

/** Minimal container for member, vote, and group detail pages */
export function ParliamentPageFrame({ children, className }: Props) {
  return (
    <div
      className={cn(
        'mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

type BackLinkProps = {
  readonly to: '/parlament' | '/parlament/membri/$memberId' | '/parlament/grupuri/$groupId'
  readonly label: string
  readonly search?: Record<string, string | undefined>
}

/** Single back link — replaces breadcrumb trails on detail pages */
export function ParliamentBackLink({ to, label, search }: BackLinkProps) {
  return (
    <Link
      to={to}
      search={search}
      className="mb-6 inline-block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      ← {label}
    </Link>
  )
}
