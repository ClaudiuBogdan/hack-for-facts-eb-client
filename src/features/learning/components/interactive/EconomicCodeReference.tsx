import { useState, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'

import { cn } from '@/lib/utils'
import {
  CATEGORY_COLORS,
  type EconomicCodeReferenceProps,
  type EconomicCategoryProp,
  type EconomicCodeProp,
  type CategoryType,
} from './economic-code-reference-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  },
}

// -----------------------------------------------------------------------------
// ExecutionBar Sub-component
// -----------------------------------------------------------------------------

type ExecutionBarProps = {
  readonly rate: number
  readonly type: CategoryType
  readonly label: string
  readonly inView: boolean
}

function ExecutionBar({ rate, type, label, inView }: ExecutionBarProps) {
  const colors = CATEGORY_COLORS[type]

  return (
    <div className="space-y-3">
      <div className={cn("flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]", colors.textMuted)}>
        <span>{label}</span>
        <span className={cn('font-black tabular-nums text-lg', colors.text)}>
          {rate}%
        </span>
      </div>
      <div className={cn('h-2.5 w-full rounded-full overflow-hidden shadow-inner', colors.barBg)}>
        <motion.div
          className={cn('h-full rounded-full', colors.bar)}
          initial={{ width: 0 }}
          animate={{ width: inView ? `${rate}%` : 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// WarningBadge Sub-component
// -----------------------------------------------------------------------------

type WarningBadgeProps = {
  readonly label: string
}

function WarningBadge({ label }: WarningBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider',
        'bg-status-blocked-fg text-background shadow-xs'
      )}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {label}
    </div>
  )
}

// -----------------------------------------------------------------------------
// SubcodeList Sub-component
// -----------------------------------------------------------------------------

type SubcodeListProps = {
  readonly subcodes: EconomicCodeProp['subcodes']
  readonly type: CategoryType
}

function SubcodeList({ subcodes, type }: SubcodeListProps) {
  const colors = CATEGORY_COLORS[type]

  if (!subcodes || subcodes.length === 0) return null

  return (
    <div className={cn('mt-4 space-y-5 pl-4 border-l border-dashed', colors.border)}>
      {subcodes.map((subcode) => (
        <div key={subcode.code} className="flex items-baseline gap-3">
          <code className="text-[10px] font-bold text-foreground shrink-0 font-mono min-w-[35px]">
            {subcode.code}
          </code>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground/90 leading-none">{subcode.name}</p>
            {subcode.examples && subcode.examples.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2 leading-tight italic">
                {subcode.examples.join(', ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// CodeRow Sub-component
// -----------------------------------------------------------------------------

type CodeRowProps = {
  readonly code: EconomicCodeProp
  readonly type: CategoryType
  readonly warningLabel: string
}

function CodeRow({ code, type, warningLabel }: CodeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const colors = CATEGORY_COLORS[type]
  const hasSubcodes = code.subcodes && code.subcodes.length > 0

  const handleToggle = useCallback(() => {
    if (hasSubcodes) {
      setIsExpanded((prev) => !prev)
    }
  }, [hasSubcodes])

  return (
    <div
      className={cn(
        'group rounded-xl border transition-all duration-200',
        isExpanded 
          ? 'border-border bg-card shadow-sm' 
          : 'border-transparent hover:bg-muted/30',
        hasSubcodes && 'cursor-pointer'
      )}
      onClick={handleToggle}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        <Badge 
          variant="outline" 
          className={cn('font-mono text-xs font-bold px-2 py-0.5 shrink-0 border-2', colors.badge)}
        >
          {code.code}
        </Badge>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm md:text-base text-foreground leading-none tracking-tight">
              {code.name}
            </span>
            {code.isWarningFlag && <WarningBadge label={warningLabel} />}
          </div>
        </div>

        {hasSubcodes && (
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-300',
            isExpanded && 'rotate-180'
          )} />
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && hasSubcodes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0">
              <SubcodeList subcodes={code.subcodes} type={type} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// -----------------------------------------------------------------------------
// CategorySection Sub-component
// -----------------------------------------------------------------------------

type CategorySectionProps = {
  readonly category: EconomicCategoryProp
  readonly label: string
  readonly description: string
  readonly executionLabel: string
  readonly warningLabel: string
  readonly inView: boolean
}

function CategorySection({
  category,
  label,
  description,
  executionLabel,
  warningLabel,
  inView,
}: CategorySectionProps) {
  const colors = CATEGORY_COLORS[category.type]
  const isCapital = category.type === 'capital'

  return (
    <motion.div variants={itemVariants} className="flex flex-col h-full">
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <h3 className={cn('text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground')}>
            {label}
          </h3>
          {isCapital && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <AlertTriangle className="w-5 h-5 text-status-blocked-fg" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed p-3">
                  <Trans>High risk of low execution in Romanian public administration. Investments are often the first to be cut during budget rectifications.</Trans>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed">{description}</p>
      </div>

      <Card className={cn('flex-1 border-none shadow-none bg-transparent')}>
        <CardContent className="p-0 space-y-6">
          <div className={cn('p-6 rounded-[2rem] border-2 transition-colors duration-300', colors.border, colors.bg)}>
            <ExecutionBar
              rate={category.executionRate}
              type={category.type}
              label={executionLabel}
              inView={inView}
            />
          </div>

          <div className="space-y-1 px-1">
            {category.codes.map((code) => (
              <CodeRow
                key={code.code}
                code={code}
                type={category.type}
                warningLabel={warningLabel}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function EconomicCodeReference({
  categories,
  text,
  explorerUrl,
}: EconomicCodeReferenceProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  const currentCategory = categories.find((c) => c.type === 'current')
  const capitalCategory = categories.find((c) => c.type === 'capital')

  return (
    <div ref={ref} className="w-full my-12 max-w-5xl mx-auto">
      {/* Header */}
      {(text.title || text.subtitle) && (
        <div className="mb-8 text-center space-y-1">
          {text.title && (
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              {text.title}
            </h2>
          )}
          {text.subtitle && (
            <p className="text-sm text-muted-foreground font-medium">
              {text.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Comparison Grid */}
      <motion.div
        className="grid md:grid-cols-2 gap-10 md:gap-16 items-start"
        variants={containerVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
      >
        {currentCategory && (
          <CategorySection
            category={currentCategory}
            label={text.currentLabel}
            description={text.currentDescription}
            executionLabel={text.executionLabel}
            warningLabel={text.warningLabel}
            inView={inView}
          />
        )}

        {capitalCategory && (
          <CategorySection
            category={capitalCategory}
            label={text.capitalLabel}
            description={text.capitalDescription}
            executionLabel={text.executionLabel}
            warningLabel={text.warningLabel}
            inView={inView}
          />
        )}
      </motion.div>

      {/* Lesson Insight Box */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="mt-16 p-8 rounded-[2rem] bg-primary/10 border border-primary/20 flex gap-6 items-start shadow-sm"
      >
        <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center shrink-0">
          <Info className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
            <Trans>Key Lesson Insight</Trans>
          </h4>
          <p className="text-base text-foreground leading-relaxed font-medium">
            <Trans>
              Notice the gap: <strong>Current Expenses</strong> (salaries, utilities) almost always reach full execution. 
              <strong> Capital Expenses</strong> (investments) are the first to be cut or delayed, often falling below 60%. 
              Always check <strong>Code 71</strong> to see if promised infrastructure is actually being built.
            </Trans>
          </p>
        </div>
      </motion.div>

      {explorerUrl && text.explorerLabel && (
        <div className="mt-16 flex justify-center">
          <Link
            to={explorerUrl as '/'}
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-full bg-primary text-sm font-black transition-all shadow-xl hover:shadow-2xl hover:ring-4 hover:ring-primary/30 active:scale-95 uppercase tracking-widest"
          >
            <span className="text-primary-foreground">{text.explorerLabel}</span>
            <ArrowRight className="w-5 h-5 text-primary-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  )
}

export type { EconomicCodeReferenceProps }
