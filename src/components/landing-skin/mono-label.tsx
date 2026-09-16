import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * The small mono caption used for column headers and counters.
 *
 * Extracted from `home-refs.refined.tsx` so the search dropdown can carry the
 * same one. The dropdown opens directly over the panel it shares a frame with,
 * and a second caption style at that distance reads as two components that
 * happened to land next to each other rather than one surface.
 */
export function MonoLabel({
  children,
  className,
  ...rest
}: Readonly<ComponentPropsWithoutRef<'span'>>) {
  return (
    <span
      {...rest}
      className={cn('font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em]', className)}
    >
      {children}
    </span>
  )
}
