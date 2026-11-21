/**
 * RedFlagCards Component
 *
 * A simple list showing warning signs to watch for in budget rectifications.
 * Uses left border color coding for severity indication.
 *
 * @example
 * ```mdx
 * <RedFlagCards locale="en" />
 * ```
 */

import { t } from '@lingui/core/macro'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  AlertTriangle,
  Ban,
  Vote,
  Target,
  TrendingUp,
  CheckCircle,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LearningLocale } from '../../types'
import { RED_FLAGS_BY_LOCALE, STATUS_COLORS, type RedFlagItem } from './rectification-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type RedFlagCardsProps = {
  readonly flags?: readonly RedFlagItem[]
  readonly locale?: LearningLocale
}

// ═══════════════════════════════════════════════════════════════════════════
// Icon Mapping
// ═══════════════════════════════════════════════════════════════════════════

const ICON_MAP: Record<RedFlagItem['icon'], LucideIcon> = {
  alert: AlertTriangle,
  bypass: Ban,
  election: Vote,
  target: Target,
  magnitude: TrendingUp,
  check: CheckCircle,
}

// ═══════════════════════════════════════════════════════════════════════════
// Single Item Component
// ═══════════════════════════════════════════════════════════════════════════

type FlagItemProps = {
  readonly flag: RedFlagItem
  readonly index: number
  readonly inView: boolean
}

function getSeverityLabel(severity: RedFlagItem['severity']): string {
  if (severity === 'green') return t`Normal`
  if (severity === 'yellow') return t`Caution`
  return t`Warning`
}

function FlagItem({ flag, index, inView }: FlagItemProps) {
  const Icon = ICON_MAP[flag.icon]
  const colors = STATUS_COLORS[flag.severity]

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-xl p-4 border transition-all duration-200',
        'hover:shadow-md',
        colors.bg,
        colors.border
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="flex items-start gap-4">
        {/* Icon Circle */}
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-full shrink-0 shadow-sm bg-card', colors.text)}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Level: a word as well as the colour */}
          <span className={cn('block text-[10px] font-bold uppercase tracking-wider mb-0.5', colors.text)}>
            {getSeverityLabel(flag.severity)}
          </span>

          {/* Title */}
          <h4 className={cn('font-semibold text-sm leading-tight mb-1', colors.text)}>
            {flag.title}
          </h4>

          {/* Description */}
          <p className={cn('text-sm leading-relaxed', colors.text)}>
            {flag.description}
          </p>

          {/* Example */}
          {flag.example && (
            <div className="mt-3 p-2.5 rounded-lg text-xs flex gap-2 items-start bg-card text-foreground">
              <Info className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', colors.text)} />
              <span>
                <span className="font-semibold">{t`Example:`}</span> {flag.example}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════

export function RedFlagCards({ flags: flagsProp, locale = 'en' }: RedFlagCardsProps) {
  const flags = flagsProp ?? RED_FLAGS_BY_LOCALE[locale]
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  // Split into warning signs and normal cases
  const warningFlags = flags.filter((f) => f.severity === 'red' || f.severity === 'yellow')
  const normalFlags = flags.filter((f) => f.severity === 'green')

  return (
    <div ref={ref} className="my-8 space-y-8">
      {/* Warning Signs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-md bg-status-blocked-bg text-status-blocked-fg">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t`Warning Signs`}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {warningFlags.map((flag, index) => (
            <FlagItem key={flag.id} flag={flag} index={index} inView={inView} />
          ))}
        </div>
      </div>

      {/* Normal Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-md bg-status-live-bg text-status-live-fg">
            <CheckCircle className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t`When Rectifications Are Normal`}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {normalFlags.map((flag, index) => (
            <FlagItem key={flag.id} flag={flag} index={warningFlags.length + index} inView={inView} />
          ))}
        </div>
      </div>
    </div>
  )
}

export type { RedFlagCardsProps }
