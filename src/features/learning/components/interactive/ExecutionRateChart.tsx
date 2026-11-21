import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion } from 'framer-motion'
import { t } from '@lingui/core/macro'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ExecutionCategory = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly executionRate: number
  readonly description: string
}

type ExecutionThresholds = {
  readonly excellent: number
  readonly good: number
  readonly concerning: number
}

type ExecutionRateChartProps = {
  readonly categories: readonly ExecutionCategory[]
  readonly thresholds?: ExecutionThresholds
  readonly title?: string
  readonly footer?: ReactNode
}

const DEFAULT_THRESHOLDS: ExecutionThresholds = {
  excellent: 95,
  good: 80,
  concerning: 60,
}

function getExecutionColor(rate: number, thresholds: ExecutionThresholds) {
  if (rate >= thresholds.excellent) {
    return {
      bar: 'bg-status-live-fg',
      track: 'bg-status-live-bg',
      text: 'text-status-live-fg',
      level: t`Excellent`,
      showWarning: false,
    }
  }
  // A positive judgement (Excellent, Good) is live, a cautionary one (Concerning) partial and an adverse one
  // (Poor) blocked, as in PromiseTracker; the thresholds stay this lesson's own.
  if (rate >= thresholds.good) {
    return {
      bar: 'bg-status-live-fg',
      track: 'bg-status-live-bg',
      text: 'text-status-live-fg',
      level: t`Good`,
      showWarning: false,
    }
  }
  if (rate >= thresholds.concerning) {
    return {
      bar: 'bg-status-partial-fg',
      track: 'bg-status-partial-bg',
      text: 'text-status-partial-fg',
      level: t`Concerning`,
      showWarning: true,
    }
  }
  return {
    bar: 'bg-status-blocked-fg',
    track: 'bg-status-blocked-bg',
    text: 'text-status-blocked-fg',
    level: t`Poor`,
    showWarning: true,
  }
}

function AnimatedPercentage({ value, inView }: { value: number; inView: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!inView) {
      setDisplayValue(0)
      return
    }

    const duration = 800
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(eased * value))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, inView])

  return <span className="tabular-nums">{displayValue}</span>
}

function ExecutionBar({
  category,
  index,
  inView,
  thresholds,
}: {
  category: ExecutionCategory
  index: number
  inView: boolean
  thresholds: ExecutionThresholds
}) {
  const colors = getExecutionColor(category.executionRate, thresholds)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group"
    >
      {/* Category Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t`Code`} {category.code}
          </span>
          <span className="font-bold text-foreground">
            {category.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {colors.showWarning && (
            <motion.div
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <AlertTriangle className={cn('w-4 h-4', colors.text)} />
            </motion.div>
          )}
          <span className={cn('text-xs font-bold', colors.text)}>{colors.level}</span>
          <span className={cn('text-xl font-black', colors.text)}>
            <AnimatedPercentage value={category.executionRate} inView={inView} />%
          </span>
        </div>
      </div>

      {/* Bar Container */}
      <div className={cn('h-8 rounded-lg overflow-hidden', colors.track)}>
        <motion.div
          className={cn('h-full rounded-lg shadow-lg', colors.bar)}
          initial={{ width: 0 }}
          animate={inView ? { width: `${category.executionRate}%` } : { width: 0 }}
          transition={{
            delay: index * 0.1,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-muted-foreground">
        {category.description}
      </p>
    </motion.div>
  )
}

export function ExecutionRateChart({
  categories,
  thresholds = DEFAULT_THRESHOLDS,
  title,
  footer,
}: Readonly<ExecutionRateChartProps>) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  })

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => b.executionRate - a.executionRate),
    [categories]
  )

  return (
    <div ref={ref} className="w-full max-w-3xl mx-auto py-8">
      <Card className="p-6 md:p-10 rounded-[3rem] bg-card border-none shadow-sm relative overflow-hidden">
        {/* Header */}
        {title && (
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-black text-foreground tracking-tight">
              {title}
            </h3>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-live-fg" />
            <span className="text-xs font-medium text-muted-foreground">
              {t`Excellent`} (≥{thresholds.excellent}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-live-fg" />
            <span className="text-xs font-medium text-muted-foreground">
              {t`Good`} (≥{thresholds.good}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-partial-fg" />
            <span className="text-xs font-medium text-muted-foreground">
              {t`Concerning`} (≥{thresholds.concerning}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-blocked-fg" />
            <span className="text-xs font-medium text-muted-foreground">
              {t`Poor`} (&lt;{thresholds.concerning}%)
            </span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="space-y-6">
          {sortedCategories.map((category, index) => (
            <ExecutionBar
              key={category.id}
              category={category}
              index={index}
              inView={inView}
              thresholds={thresholds}
            />
          ))}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-10 pt-6 border-t border-border text-center">
            {footer}
          </div>
        )}
      </Card>
    </div>
  )
}
