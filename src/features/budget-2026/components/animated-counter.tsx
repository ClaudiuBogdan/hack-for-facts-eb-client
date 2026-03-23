import { useEffect, useRef } from 'react'
import { useMotionValue, animate } from 'motion/react'

type AnimatedCounterProps = {
  readonly value: number
  readonly duration?: number
  readonly prefix?: string
  readonly suffix?: string
  readonly decimals?: number
  readonly inView?: boolean
  readonly formatter?: (value: number) => string
}

export function AnimatedCounter({
  value,
  duration = 1.5,
  prefix = '',
  suffix = '',
  decimals = 0,
  inView = true,
  formatter,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0)
  const displayRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)
  const fmtRef = useRef(
    new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  )

  useEffect(() => {
    fmtRef.current = new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }, [decimals])

  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true
      animate(motionValue, value, { duration, ease: 'easeOut' })
    }
  }, [inView, value, duration, motionValue])

  useEffect(() => {
    const unsubscribe = motionValue.on('change', (latest) => {
      if (displayRef.current) {
        displayRef.current.textContent = formatter
          ? formatter(latest)
          : prefix + fmtRef.current.format(latest) + (suffix ? ` ${suffix}` : '')
      }
    })
    return unsubscribe
  }, [formatter, motionValue, prefix, suffix])

  return (
    <span ref={displayRef} className="tabular-nums">
      {formatter ? formatter(0) : (
        <>
          {prefix}
          {fmtRef.current.format(0)}
          {suffix ? ` ${suffix}` : ''}
        </>
      )}
    </span>
  )
}
