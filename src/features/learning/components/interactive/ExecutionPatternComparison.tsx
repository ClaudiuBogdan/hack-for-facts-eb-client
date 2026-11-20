/**
 * ExecutionPatternComparison Component
 *
 * Visualizes the annual pattern of budget execution rates across economic codes.
 * Highlights the consistent gap between operational spending (high execution)
 * and capital investments (low execution - the "red flag").
 *
 * Used in the Economic Classification lesson to demonstrate why Code 71 matters.
 */

import { motion, type Variants } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, Minus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type ExecutionStatus = 'excellent' | 'normal' | 'warning'

type ExecutionPatternItem = {
  readonly code: string
  readonly name: string
  readonly rate: number
  readonly status: ExecutionStatus
  readonly statusLabel: string
}

type ExecutionPatternComparisonProps = {
  readonly items: readonly ExecutionPatternItem[]
  readonly footnote?: string
  readonly title?: string
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const STATUS_CONFIG = {
  excellent: {
    barColor: 'bg-status-live-fg',
    barBg: 'bg-status-live-bg',
    textColor: 'text-status-live-fg',
    Icon: Check,
    iconBg: 'bg-status-live-bg',
  },
  normal: {
    barColor: 'bg-status-partial-fg',
    barBg: 'bg-status-partial-bg',
    textColor: 'text-status-partial-fg',
    Icon: Minus,
    iconBg: 'bg-status-partial-bg',
  },
  warning: {
    barColor: 'bg-status-blocked-fg',
    barBg: 'bg-status-blocked-bg',
    textColor: 'text-status-blocked-fg',
    Icon: AlertTriangle,
    iconBg: 'bg-status-blocked-bg',
  },
} as const

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  },
}

// -----------------------------------------------------------------------------
// ExecutionRow Sub-component
// -----------------------------------------------------------------------------

type ExecutionRowProps = {
  readonly item: ExecutionPatternItem
  readonly inView: boolean
  readonly index: number
}

function ExecutionRow({ item, inView, index }: ExecutionRowProps) {
  const config = STATUS_CONFIG[item.status]
  const Icon = config.Icon

  return (
    <motion.div
      variants={rowVariants}
      className="grid grid-cols-[1fr_2fr_auto] gap-4 items-center"
    >
      {/* Code & Name */}
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xs font-mono font-bold text-muted-foreground shrink-0">
          ({item.code})
        </span>
        <span className="font-bold text-sm md:text-base text-foreground truncate">
          {item.name}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className={cn('flex-1 h-4 rounded-full overflow-hidden', config.barBg)}>
          <motion.div
            className={cn('h-full rounded-full', config.barColor)}
            initial={{ width: 0 }}
            animate={{ width: inView ? `${item.rate}%` : 0 }}
            transition={{
              duration: 1,
              delay: index * 0.15 + 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </div>
        <span className={cn('text-lg font-black tabular-nums min-w-[55px] text-right', config.textColor)}>
          ~{item.rate}%
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <div className={cn('p-1 rounded-full', config.iconBg)}>
          <Icon className={cn('w-3.5 h-3.5', config.textColor)} />
        </div>
        <span className={cn('text-xs font-bold uppercase tracking-wide hidden sm:block', config.textColor)}>
          {item.statusLabel}
        </span>
      </div>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function ExecutionPatternComparison({
  items,
  footnote,
  title,
}: ExecutionPatternComparisonProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.2,
  })

  return (
    <div
      ref={ref}
      className="my-10 p-6 md:p-8 rounded-[2rem] bg-card border border-border"
    >
      {title && (
        <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">
          {title}
        </h4>
      )}

      <motion.div
        className="space-y-5"
        variants={containerVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {items.map((item, index) => (
          <ExecutionRow
            key={item.code}
            item={item}
            inView={inView}
            index={index}
          />
        ))}
      </motion.div>

      {footnote && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-[11px] text-muted-foreground text-right italic"
        >
          {footnote}
        </motion.p>
      )}
    </div>
  )
}

export type { ExecutionPatternComparisonProps, ExecutionPatternItem }
