import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  readonly title?: ReactNode
  readonly description?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly variant?: 'default' | 'tab'
}

export function PrivateCompanySection({
  title,
  description,
  children,
  className,
  variant = 'default',
}: Props) {
  if (variant === 'tab') {
    return <section className={cn('space-y-4', className)}>{children}</section>
  }

  return (
    <section className={cn('space-y-3', className)}>
      {title ? (
        <div>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
