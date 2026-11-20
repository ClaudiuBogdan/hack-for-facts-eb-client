import { useState, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { 
  Landmark, 
  Building, 
  MapPin, 
  Heart, 
  ChevronDown, 
  ExternalLink
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { 
  BudgetHierarchyData, 
  BudgetHierarchyText, 
  BudgetLevel 
} from './budget-hierarchy-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════

interface BudgetHierarchyVisualizerProps {
  readonly data: BudgetHierarchyData
  readonly text: BudgetHierarchyText
  readonly locale: 'en' | 'ro'
  readonly explorerUrl?: string
}

// Category identity is carried by the bar fill only, in the order the lesson shows the levels.
const COLOR_MAP = {
  slate: { bar: 'bg-chart-1' },
  blue: { bar: 'bg-chart-2' },
  emerald: { bar: 'bg-chart-3' },
  amber: { bar: 'bg-chart-4' },
  rose: { bar: 'bg-chart-1' },
} as const

const ICON_MAP: Record<string, LucideIcon> = {
  Landmark,
  Building,
  MapPin,
  Heart,
}

// ═══════════════════════════════════════════════════════════════════════════
// Animation Variants
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

interface PercentageBarProps {
  readonly percentage: number
  readonly color: keyof typeof COLOR_MAP
  readonly animate?: boolean
}

function PercentageBar({ percentage, color, animate = true }: PercentageBarProps) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={animate ? { width: 0 } : { width: `${percentage}%` }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className={cn('h-full rounded-full', COLOR_MAP[color].bar)}
      />
    </div>
  )
}

interface ConnectionLineProps {
  readonly isVisible: boolean
  readonly className?: string
  readonly direction?: 'vertical' | 'horizontal'
}

function ConnectionLine({ isVisible, className, direction = 'vertical' }: ConnectionLineProps) {
  return (
    <svg
      className={cn('absolute pointer-events-none overflow-visible', className)}
      width="100%"
      height="100%"
    >
      <motion.path
        d={direction === 'vertical' ? "M 50% 0 L 50% 100%" : "M 0 50% L 100% 50%"}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={isVisible ? { pathLength: 1, opacity: 0.3 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="text-muted-foreground"
      />
    </svg>
  )
}

interface BudgetCardProps {
  readonly level: BudgetLevel
  readonly isSelected: boolean
  readonly isExpanded: boolean
  readonly isDeemphasized: boolean
  readonly onClick: () => void
  readonly locale: 'en' | 'ro'
  readonly depth: number
}

function BudgetCard({
  level,
  isSelected,
  isExpanded,
  isDeemphasized,
  onClick,
  locale,
  depth,
}: BudgetCardProps) {
  const Icon = ICON_MAP[level.icon] || Landmark
  // Secondary text sits on a tint when selected, so it takes the full foreground there.
  const subtle = isSelected ? 'text-foreground' : 'text-muted-foreground'
  const name = locale === 'ro' ? level.nameRo : level.name

  // Layout variants based on depth
  const isRoot = depth === 0
  const isPillar = depth === 1
  const isLeaf = depth === 2

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative rounded-3xl border-2 transition-all cursor-pointer select-none overflow-hidden',
        isSelected ? 'border-primary bg-primary/10 ring-4 ring-primary/40' : 'border-border bg-card',
        isDeemphasized && 'border-dashed scale-[0.98]',
        // Dimensions & Layout
        isRoot && 'w-full max-w-2xl mx-auto p-6',
        isPillar && 'flex-1 p-5 flex flex-col h-full min-h-[240px]',
        isLeaf && 'flex flex-col p-4 h-full min-h-[160px]'
      )}
      onClick={onClick}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={isExpanded}
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Root Layout: Horizontal */}
      {isRoot && (
        <>
          <div className="flex items-center gap-5 mb-4">
            <div className={'p-3.5 rounded-2xl shrink-0 bg-muted text-foreground'}>
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-xl leading-tight">{name}</h4>
              {level.amount && (
                <p className={cn('text-base font-bold mt-0.5', subtle)}>{level.amount}</p>
              )}
            </div>
            {level.children && (
              <ChevronDown
                className={cn(
                  'w-6 h-6 transition-transform duration-300 shrink-0', subtle,
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-xs font-black uppercase tracking-wider', subtle)}>
              {level.percentage}%
            </span>
          </div>
          <PercentageBar percentage={level.percentage} color={level.color} />
        </>
      )}

      {/* Pillar Layout: Vertical Left-Aligned */}
      {isPillar && (
        <>
          <div className="flex justify-between items-start mb-4">
            <div className={'p-3 rounded-2xl shrink-0 bg-muted text-foreground'}>
              <Icon className="w-6 h-6" />
            </div>
            {level.children && (
              <ChevronDown
                className={cn(
                  'w-5 h-5 transition-transform duration-300', subtle,
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
          
          <div className="mb-auto">
            <h4 className="font-black text-xl leading-tight mb-1 break-words hyphens-auto">
              {name}
            </h4>
            {level.amount && (
              <p className={cn('text-sm font-bold', subtle)}>{level.amount}</p>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-xs font-black uppercase tracking-wider', subtle)}>
                {level.percentage}%
              </span>
            </div>
            <PercentageBar percentage={level.percentage} color={level.color} />
          </div>
        </>
      )}

      {/* Leaf Layout: Vertical Centered */}
      {isLeaf && (
        <div className="flex flex-col h-full justify-between">
          <div className="flex flex-col items-center text-center gap-3">
            <div className={'p-2.5 rounded-2xl shrink-0 bg-muted text-foreground'}>
              <Icon className="w-5 h-5" />
            </div>
            <h4 className="font-black text-sm leading-tight break-words hyphens-auto">
              {name}
            </h4>
          </div>
          
          <div className="w-full mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn('text-[10px] font-black uppercase tracking-wider', subtle)}>
                {level.percentage}%
              </span>
            </div>
            <PercentageBar percentage={level.percentage} color={level.color} />
          </div>
        </div>
      )}
    </motion.div>
  )
}

interface DetailPanelProps {
  readonly level: BudgetLevel
  readonly locale: 'en' | 'ro'
  readonly text: BudgetHierarchyText
  readonly explorerUrl?: string
}

function DetailPanel({ level, locale, text, explorerUrl }: DetailPanelProps) {
  const description = locale === 'ro' ? level.descriptionRo : level.description

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden w-full"
    >
      <Card className={'p-6 mt-4 rounded-[2rem] border-2 border-primary/30 bg-primary/10'}>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h5 className="text-xs font-black uppercase tracking-widest text-foreground">
              {text.clickToExplore}
            </h5>
            <p className="text-lg font-medium leading-relaxed text-foreground">
              {description}
            </p>
            
            {explorerUrl && level.explorerFilter && (
              <Button asChild className={'rounded-full font-bold bg-primary !text-primary-foreground hover:bg-primary hover:ring-2 hover:ring-primary/40'}>
                <a href={`${explorerUrl}?${level.explorerFilter}`} className="!text-primary-foreground">
                  {text.exploreInPlatform}
                  <ExternalLink className="ml-2 w-4 h-4 text-primary-foreground" />
                </a>
              </Button>
            )}
          </div>

          {level.examples && (
            <div className="space-y-4">
              <h5 className="text-xs font-black uppercase tracking-widest text-foreground">
                {text.examplesLabel}
              </h5>
              <div className="flex flex-wrap gap-2">
                {level.examples.map((ex, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="px-4 py-1.5 rounded-full text-sm font-bold bg-card text-foreground border-none"
                  >
                    {locale === 'ro' ? ex.nameRo : ex.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function BudgetHierarchyVisualizer({
  data,
  text,
  locale,
  explorerUrl,
}: BudgetHierarchyVisualizerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const root = data.root
  const pillars = root.children || []
  const selectedPillar = pillars.find((p) => p.id === expandedId)

  return (
    <div className="w-full max-w-6xl mx-auto pt-8 px-4" role="tree" aria-label={text.title}>
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">
          {text.title}
        </h2>
        <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
          {text.subtitle}
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="space-y-12"
      >
        {/* Root Node */}
        <div className="relative">
          <BudgetCard
            level={root}
            isSelected={false}
            isExpanded={true}
            isDeemphasized={false}
            onClick={() => {}}
            locale={locale}
            depth={0}
          />
          {/* Vertical line to pillars */}
          <ConnectionLine isVisible={true} className="left-0 right-0 -bottom-12 h-12 hidden md:block" />
        </div>

        {/* Pillars Row */}
        <div className="relative">
          {/* Horizontal connector line for desktop */}
          <ConnectionLine 
            isVisible={true} 
            direction="horizontal" 
            className="top-0 left-[16.6%] right-[16.6%] h-px hidden md:block" 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 md:pt-0">
            {pillars.map((pillar) => (
              <div key={pillar.id} className="relative flex flex-col">
                {/* Vertical connector from horizontal line to card */}
                <ConnectionLine isVisible={true} className="left-0 right-0 -top-12 h-12 hidden md:block" />
                
                <BudgetCard
                  level={pillar}
                  isSelected={expandedId === pillar.id}
                  isExpanded={expandedId === pillar.id}
                  isDeemphasized={expandedId !== null && expandedId !== pillar.id}
                  onClick={() => handleToggle(pillar.id)}
                  locale={locale}
                  depth={1}
                />

                {/* Mobile Detail Panel (Accordion style) */}
                <div className="md:hidden">
                  <AnimatePresence>
                    {expandedId === pillar.id && (
                      <DetailPanel
                        level={pillar}
                        locale={locale}
                        text={text}
                        explorerUrl={explorerUrl}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Detail Panel & Sub-levels */}
        <div className="hidden md:block">
          <AnimatePresence mode="wait">
            {selectedPillar && (
              <motion.div
                key={selectedPillar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <DetailPanel
                  level={selectedPillar}
                  locale={locale}
                  text={text}
                  explorerUrl={explorerUrl}
                />

                {/* Sub-levels (Third Level) */}
                {selectedPillar.children && selectedPillar.children.length > 0 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {selectedPillar.children.map((child) => (
                      <BudgetCard
                        key={child.id}
                        level={child}
                        isSelected={false}
                        isExpanded={false}
                        isDeemphasized={false}
                        onClick={() => {}}
                        locale={locale}
                        depth={2}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
