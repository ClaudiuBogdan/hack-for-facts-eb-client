import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  Building2,
  Target,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  X,
  MousePointerClick,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  LENS_COLORS,
  type ThreeLensesExplorerProps,
  type LensType,
  type LensInsight,
} from './three-lenses-data'

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.5 
    },
  },
}

// Icon mapping for lenses
const LENS_ICONS = {
  organizational: Building2,
  functional: Target,
  economic: Wallet,
} as const

// -----------------------------------------------------------------------------
// LensCard Sub-component
// -----------------------------------------------------------------------------

type LensCardProps = {
  readonly type: LensType
  readonly label: string
  readonly question: string
  readonly value: string
  readonly code?: string
  readonly subvalue?: string
  readonly noCodeLabel: string
  readonly isFocused?: boolean
  readonly isDeemphasized?: boolean
  readonly onClick?: () => void
  readonly index: number
  readonly hasInsight?: boolean
}

function LensCard({
  type,
  label,
  question,
  value,
  code,
  subvalue,
  noCodeLabel,
  isFocused = false,
  isDeemphasized = false,
  onClick,
  index,
  hasInsight = false,
}: LensCardProps) {
  const colors = LENS_COLORS[type]
  const Icon = LENS_ICONS[type]
  const showCode = type !== 'organizational'

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      whileHover={{ 
        scale: 1.02, 
        y: -4,
        transition: { type: 'spring', stiffness: 400, damping: 15 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'relative flex flex-col items-center p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2.5rem] border-2 transition-all cursor-pointer overflow-hidden group',
        colors.border,
        isFocused 
          ? cn(colors.bgLighter, 'ring-4 ring-offset-4 ring-offset-background', type === 'organizational' ? 'ring-chart-1/20' : type === 'functional' ? 'ring-chart-2/20' : 'ring-chart-3/20')
          : 'bg-card hover:bg-muted/50',
        isDeemphasized && 'grayscale scale-[0.98]'
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isFocused}
      aria-label={`${label}: ${value}${hasInsight ? '. Click to learn more.' : ''}`}
      aria-expanded={hasInsight ? isFocused : undefined}
    >
      {/* Icon in rounded square */}
      <motion.div 
        className={cn(
          'w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-lg md:rounded-2xl mb-2 md:mb-5 shadow-sm transition-transform duration-500 group-hover:scale-110', 
          colors.bgLight, 
          colors.text
        )}
      >
        <Icon className="w-5 h-5 md:w-7 md:h-7" />
      </motion.div>

      {/* Question Badge */}
      <Badge
        variant="secondary"
        className={cn(
          'px-3 md:px-5 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2 md:mb-5 border-none shadow-xs',
          colors.accent,
          colors.text
        )}
      >
        {question}
      </Badge>

      {/* Label */}
      <h4 className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-muted-foreground mb-1 md:mb-3">
        {label}
      </h4>

      {/* Value */}
      <div className={cn(
        'text-base md:text-xl lg:text-2xl font-black text-center mb-1 md:mb-2 leading-tight tracking-tight px-1 md:px-2', 
        colors.text
      )}>
        {value}
      </div>

      {/* Subvalue */}
      {subvalue && (
        <div className="text-[11px] md:text-sm font-medium text-muted-foreground text-center mb-2 md:mb-4 leading-snug px-2 md:px-4">
          {subvalue}
        </div>
      )}

      {/* Code or Note at the bottom */}
      <div className="mt-auto flex flex-col items-center gap-1 md:gap-2">
        {showCode && code && (
          <div
            className={cn(
              'px-2 md:px-4 py-0.5 md:py-1 rounded-lg md:rounded-xl font-mono text-[9px] md:text-[10px] font-bold',
              colors.text
            )}
          >
            {code}
          </div>
        )}

        {!showCode && (
          <div className="text-[7px] md:text-[8px] font-bold text-muted-foreground italic uppercase tracking-wider md:tracking-widest text-center max-w-[100px] md:max-w-[120px] leading-tight">
            {noCodeLabel}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// -----------------------------------------------------------------------------
// ExampleHeader Sub-component
// -----------------------------------------------------------------------------

type ExampleHeaderProps = {
  readonly title: string
  readonly amount: number
}

function ExampleHeader({ title, amount }: ExampleHeaderProps) {
  const formattedAmount = new Intl.NumberFormat('ro-RO').format(amount)

  return (
    <div className="text-center">
      <h3 className="text-3xl md:text-4xl font-black text-foreground mb-2 tracking-tighter leading-tight">
        {title}
      </h3>
      <div className="inline-flex items-center gap-2 text-2xl md:text-3xl font-black text-primary">
        {formattedAmount} <span className="text-sm font-bold">RON</span>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// LensInsightPanel Sub-component
// -----------------------------------------------------------------------------

type LensInsightPanelProps = {
  readonly lens: LensType
  readonly insight?: LensInsight
  readonly onClose: () => void
  readonly closeLabel?: string
}

function LensInsightPanel({ lens, insight, onClose, closeLabel }: LensInsightPanelProps) {
  const colors = LENS_COLORS[lens]
  const Icon = LENS_ICONS[lens]
  
  // If no insight is provided, don't render anything
  if (!insight) return null
  
  return (
    <div 
      className={cn(
        'relative rounded-[2.5rem] border p-8 backdrop-blur-xs',
        lens === 'organizational' && 'bg-chart-1/10 border-chart-1/40',
        lens === 'functional' && 'bg-chart-2/10 border-chart-2/40',
        lens === 'economic' && 'bg-chart-3/10 border-chart-3/40'
      )}
      role="region"
      aria-label={insight.title}
      aria-live="polite"
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div 
          className={cn(
            'w-16 h-16 flex items-center justify-center rounded-2xl shrink-0 shadow-inner',
            colors.bgLight
          )}
          aria-hidden="true"
        >
          <Icon className={cn('w-8 h-8', colors.text)} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className={cn('text-xl font-black mb-2 tracking-tight', colors.text)}>
            {insight.title}
          </h3>
          <p className="text-lg text-foreground leading-relaxed font-medium">
            {insight.text}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 h-10 w-10 rounded-full hover:bg-foreground/10"
          aria-label={closeLabel ?? 'Close'}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function ThreeLensesExplorer({
  examples,
  text,
  defaultExampleIndex = 0,
}: ThreeLensesExplorerProps) {
  const [currentIndex, setCurrentIndex] = useState(defaultExampleIndex)
  const [focusedLens, setFocusedLens] = useState<LensType | null>(null)
  
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const currentExample = useMemo(
    () => examples[currentIndex] ?? examples[0],
    [examples, currentIndex]
  )

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? examples.length - 1 : prev - 1))
  }, [examples.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === examples.length - 1 ? 0 : prev + 1))
  }, [examples.length])

  const handleLensClick = useCallback((lens: LensType) => {
    setFocusedLens((prev) => (prev === lens ? null : lens))
  }, [])

  // Keyboard navigation for examples
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlePrev, handleNext])

  if (!currentExample) return null

  return (
    <div ref={ref} className="w-full max-w-6xl mx-auto py-8 select-none px-4 md:px-8">
      {/* Title Section */}
      <div className="text-center mb-6 space-y-2">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground mb-4 leading-[0.9]">
            {text.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            {text.subtitle}
          </p>
        </motion.div>
      </div>

      <div className="relative">
        {/* Navigation Arrows - Desktop (Positioned on the edges of the grid) */}
        {examples.length > 1 && (
          <>
            <div className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-6 md:-translate-x-10 z-30 hidden lg:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                className="h-14 w-14 rounded-full bg-card shadow-xl border border-border hover:scale-110 active:scale-95 transition-all group"
                aria-label="Previous example"
              >
                <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            </div>
            <div className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-6 md:translate-x-10 z-30 hidden lg:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-14 w-14 rounded-full bg-card shadow-xl border border-border hover:scale-110 active:scale-95 transition-all group"
                aria-label="Next example"
              >
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            </div>
          </>
        )}

        <div className="space-y-3 md:space-y-5">
          {/* Current Example Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentExample.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <ExampleHeader
                title={currentExample.title}
                amount={currentExample.amount}
              />
            </motion.div>
          </AnimatePresence>

          {/* Three Lens Cards Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 lg:gap-6"
            variants={containerVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            role="group"
            aria-label="Budget classification perspectives"
          >
            {/* Organizational */}
            <LensCard
              index={0}
              type="organizational"
              label={text.organizational.label}
              question={text.organizational.question}
              value={currentExample.organizational.entity}
              noCodeLabel={text.noCodeLabel}
              isFocused={focusedLens === 'organizational'}
              isDeemphasized={
                focusedLens !== null && focusedLens !== 'organizational'
              }
              onClick={() => handleLensClick('organizational')}
              hasInsight={!!text.organizational.insight}
            />

            {/* Functional */}
            <LensCard
              index={1}
              type="functional"
              label={text.functional.label}
              question={text.functional.question}
              value={currentExample.functional.category}
              subvalue={currentExample.functional.subcategory}
              code={currentExample.functional.code}
              noCodeLabel={text.noCodeLabel}
              isFocused={focusedLens === 'functional'}
              isDeemphasized={
                focusedLens !== null && focusedLens !== 'functional'
              }
              onClick={() => handleLensClick('functional')}
              hasInsight={!!text.functional.insight}
            />

            {/* Economic */}
            <LensCard
              index={2}
              type="economic"
              label={text.economic.label}
              question={text.economic.question}
              value={currentExample.economic.type}
              subvalue={currentExample.economic.subtype}
              code={currentExample.economic.code}
              noCodeLabel={text.noCodeLabel}
              isFocused={focusedLens === 'economic'}
              isDeemphasized={focusedLens !== null && focusedLens !== 'economic'}
              onClick={() => handleLensClick('economic')}
              hasInsight={!!text.economic.insight}
            />
          </motion.div>

          {/* Hint Text - Only shown when no lens is selected */}
          <AnimatePresence>
            {!focusedLens && text.hintText && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <MousePointerClick className="w-4 h-4" />
                <span className="font-medium">{text.hintText}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Key Insight Section - Dynamic based on focused lens */}
          <AnimatePresence mode="wait">
            <motion.div
              key={focusedLens ?? 'default'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              {focusedLens && text[focusedLens]?.insight ? (
                <LensInsightPanel
                  lens={focusedLens}
                  insight={text[focusedLens].insight}
                  onClose={() => setFocusedLens(null)}
                  closeLabel={text.closeInsightLabel}
                />
              ) : (
                <div className="relative rounded-[2.5rem] bg-status-partial-bg border border-status-partial-fg/30 p-8 backdrop-blur-xs">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-status-partial-fg/10 shrink-0 shadow-inner">
                      <Lightbulb className="w-8 h-8 text-status-partial-fg" />
                    </div>
                    <div className="text-center md:text-left">
                      <div className="text-xl font-black text-status-partial-fg mb-2 tracking-tight">
                        {text.insightTitle}
                      </div>
                      <p className="text-lg text-status-partial-fg leading-relaxed font-medium">
                        {text.insightText}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Mobile/Tablet Navigation Controls */}
          {examples.length > 1 && (
            <div className="flex items-center justify-center gap-6 lg:hidden pt-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                className="h-12 w-12 rounded-full border-2 shadow-sm"
                aria-label="Previous example"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              
              <div className="flex items-center gap-2">
                {examples.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'h-2 rounded-full transition-all duration-500',
                      index === currentIndex 
                        ? 'w-8 bg-primary' 
                        : 'w-2 bg-border hover:bg-muted-foreground'
                    )}
                    aria-label={`Go to example ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                className="h-12 w-12 rounded-full border-2 shadow-sm"
                aria-label="Next example"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { ThreeLensesExplorerProps }
