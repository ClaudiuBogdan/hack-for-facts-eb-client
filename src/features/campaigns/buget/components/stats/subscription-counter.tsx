import { useEffect, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { animate, useMotionValue } from 'motion/react'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserLocale } from '@/lib/utils'

type SubscriptionCounterProps = {
  readonly count: number
  readonly label?: string
  readonly isLoading?: boolean
}

export function SubscriptionCounter({
  count,
  label = t`subscribers`,
  isLoading = false,
}: SubscriptionCounterProps) {
  const locale = getUserLocale()
  const numberLocale = locale === 'ro' ? 'ro-RO' : 'en-US'
  const motionValue = useMotionValue(0)
  const displayRef = useRef<HTMLSpanElement | null>(null)
  const formatterRef = useRef(new Intl.NumberFormat(numberLocale))

  useEffect(() => {
    formatterRef.current = new Intl.NumberFormat(numberLocale)
  }, [numberLocale])

  useEffect(() => {
    if (isLoading) {
      return
    }

    const controls = animate(motionValue, count, {
      duration: 0.9,
      ease: 'easeOut',
    })

    return () => {
      controls.stop()
    }
  }, [count, isLoading, motionValue])

  useEffect(() => {
    const unsubscribe = motionValue.on('change', (latest) => {
      if (!displayRef.current) {
        return
      }

      displayRef.current.textContent = formatterRef.current.format(
        Math.max(0, Math.round(latest)),
      )
    })

    return unsubscribe
  }, [motionValue])

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-2"
      >
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-4 w-24 rounded-lg" />
      </div>
    )
  }

  const accessibleLabel = `${formatterRef.current.format(count)} ${label}`

  return (
    <div aria-label={accessibleLabel} className="space-y-1">
      <span
        ref={displayRef}
        aria-hidden="true"
        className="block text-3xl font-black tracking-tight text-foreground tabular-nums sm:text-4xl"
      >
        {formatterRef.current.format(count)}
      </span>
      <span className="block text-sm font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
