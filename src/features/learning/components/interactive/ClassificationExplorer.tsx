import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ArrowRight,
  RotateCcw,
  Eye,
  Lightbulb,
  Building2,
  Wallet,
  ExternalLink,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BudgetTreemap } from '@/components/budget-explorer/BudgetTreemap'
import { FilteredSpendingInfo } from '@/components/budget-explorer/FilteredSpendingInfo'
import { useTreemapAmountFilter } from '@/components/budget-explorer/useTreemapAmountFilter'
import type { TreemapInput } from '@/components/budget-explorer/budget-transform'
import { cn } from '@/lib/utils'
import {
  CLASSIFICATION_COLORS,
  type ClassificationView,
  type ClassificationExplorerProps,
} from './classification-explorer-data'

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type GameStep = 'HOOK' | 'EXPLORE'
type BreadcrumbEntry = { code: string; label: string; type?: 'fn' | 'ec' }

// -----------------------------------------------------------------------------
// ANIMATION VARIANTS
// -----------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3 },
  },
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function ClassificationExplorer({
  functionalData,
  economicData,
  text,
  budgetInfo,
  sourceUrl,
  defaultView = 'fn',
}: ClassificationExplorerProps) {
  // State
  const [step, setStep] = useState<GameStep>('HOOK')
  const [currentView, setCurrentView] = useState<ClassificationView>(defaultView)
  const [path, setPath] = useState<BreadcrumbEntry[]>([])

  // Transform data to TreemapInput format for BudgetTreemap
  const treemapData = useMemo((): TreemapInput[] => {
    const sourceData = currentView === 'fn' ? functionalData : economicData
    return sourceData.map((item) => ({
      name: item.name,
      value: item.value,
      code: item.code,
      isLeaf: true,
      children: [],
    }))
  }, [currentView, functionalData, economicData])

  // Get current colors based on view
  const colors = CLASSIFICATION_COLORS[currentView]

  // Get hint text based on current view
  const hintText = currentView === 'fn' ? text.functionalHint : text.economicHint

  // Build dynamic source URL with current view
  const dynamicSourceUrl = useMemo(() => {
    if (!sourceUrl) return null
    // If sourceUrl contains query params, update primary/treemapPrimary; otherwise just return as-is
    if (sourceUrl.includes('?')) {
      return sourceUrl.replace(/primary=\w+/g, `primary=${currentView}`).replace(/treemapPrimary=\w+/g, `treemapPrimary=${currentView}`)
    }
    return sourceUrl
  }, [sourceUrl, currentView])
  const { amountFilter, unit: treemapUnit } = useTreemapAmountFilter({
    data: treemapData,
    normalization: 'total',
    currency: 'RON',
  })

  // Handlers
  const handleViewChange = useCallback((view: ClassificationView) => {
    setCurrentView(view)
    setPath([])
  }, [])

  const handleNodeClick = useCallback((_code: string | null) => {
    // For learning data, no drill-down
  }, [])

  const handleBreadcrumbClick = useCallback((_code: string | null) => {
    setPath([])
  }, [])

  const handleReset = useCallback(() => {
    setStep('HOOK')
    setCurrentView('fn')
    setPath([])
  }, [])

  return (
    <div className="w-full max-w-5xl mx-auto py-8 select-none">
      <AnimatePresence mode="wait">
        {/* STEP 1: HOOK - Engaging intro */}
        {step === 'HOOK' && (
          <motion.div
            key="hook"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="p-10 md:p-16 rounded-[3rem] bg-white dark:bg-zinc-950 border-none shadow-lg overflow-hidden relative">
              <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                {/* Icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner"
                >
                  <Eye className="w-10 h-10" />
                </motion.div>

                {/* Headline */}
                <div className="space-y-4 max-w-xl">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.95]">
                    {text.hookTitle}{' '}
                    <span className="text-indigo-600 dark:text-indigo-400 italic">
                      {text.hookTitleHighlight}
                    </span>
                  </h2>
                  <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                    {text.hookSubtitle}
                  </p>
                </div>

                {/* Preview cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                  {/* Functional preview */}
                  <div className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                    CLASSIFICATION_COLORS.fn.border,
                    CLASSIFICATION_COLORS.fn.bgLighter
                  )}>
                    <div className={cn(
                      'p-3 rounded-xl',
                      CLASSIFICATION_COLORS.fn.bgLight,
                      CLASSIFICATION_COLORS.fn.text
                    )}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <div className={cn('font-black text-lg', CLASSIFICATION_COLORS.fn.text)}>
                        {text.fnPreview.title}
                      </div>
                      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {text.fnPreview.subtitle}
                      </div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        {text.fnPreview.examples}
                      </div>
                    </div>
                  </div>

                  {/* Economic preview */}
                  <div className={cn(
                    'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
                    CLASSIFICATION_COLORS.ec.border,
                    CLASSIFICATION_COLORS.ec.bgLighter
                  )}>
                    <div className={cn(
                      'p-3 rounded-xl',
                      CLASSIFICATION_COLORS.ec.bgLight,
                      CLASSIFICATION_COLORS.ec.text
                    )}>
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <div className={cn('font-black text-lg', CLASSIFICATION_COLORS.ec.text)}>
                        {text.ecPreview.title}
                      </div>
                      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {text.ecPreview.subtitle}
                      </div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        {text.ecPreview.examples}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="w-full max-w-md">
                  <Button
                    onClick={() => setStep('EXPLORE')}
                    className="w-full h-20 rounded-[1.8rem] text-2xl font-black bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-black dark:hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                  >
                    {text.hookButton} <ArrowRight className="ml-2 w-7 h-7" />
                  </Button>
                </div>
              </div>

              {/* Atmospheric blur effects */}
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-100/30 dark:bg-indigo-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-emerald-100/20 dark:bg-emerald-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
            </Card>
          </motion.div>
        )}

        {/* STEP 2: EXPLORE - Interactive treemap */}
        {step === 'EXPLORE' && (
          <motion.div
            key="explore"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Card className="rounded-[3rem] bg-white dark:bg-zinc-950 border-none shadow-lg overflow-hidden">
              <div className="p-6 md:p-10 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="text-zinc-400 dark:text-zinc-500 text-sm font-black uppercase tracking-[0.3em]">
                    {text.explorePhaseLabel}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
                    {text.exploreTitle}{' '}
                    <span className={cn('italic', colors.text)}>
                      {text.exploreTitleHighlight}
                    </span>
                  </h2>
                </div>

                {/* Toggle tabs */}
                <div className="flex justify-center">
                  <div className="inline-flex p-1.5 rounded-[1.5rem] bg-zinc-100 dark:bg-zinc-900">
                    <button
                      onClick={() => handleViewChange('fn')}
                      className={cn(
                        'flex items-center gap-2 px-6 py-4 rounded-[1.2rem] font-bold transition-all',
                        currentView === 'fn'
                          ? 'bg-white dark:bg-zinc-800 shadow-md text-indigo-600 dark:text-indigo-400'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                      )}
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="hidden sm:inline">{text.functionalLabel}</span>
                      <span className="sm:hidden">FN</span>
                      <span className="text-xs opacity-70">
                        ({text.functionalQuestion})
                      </span>
                    </button>
                    <button
                      onClick={() => handleViewChange('ec')}
                      className={cn(
                        'flex items-center gap-2 px-6 py-4 rounded-[1.2rem] font-bold transition-all',
                        currentView === 'ec'
                          ? 'bg-white dark:bg-zinc-800 shadow-md text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                      )}
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="hidden sm:inline">{text.economicLabel}</span>
                      <span className="sm:hidden">EC</span>
                      <span className="text-xs opacity-70">
                        ({text.economicQuestion})
                      </span>
                    </button>
                  </div>
                </div>

                {/* Educational hint - animated */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentView}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'rounded-2xl border p-4',
                      colors.border,
                      currentView === 'fn'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20'
                    )}
                  >
                    <p className={cn('text-sm font-medium', colors.text.replace('text-', 'text-').replace('-600', '-800').replace('-400', '-200'))}>
                      {hintText}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Treemap */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 sm:p-4">
                  <div className="mb-3 flex justify-end">
                    <FilteredSpendingInfo
                      unit={treemapUnit}
                      amountFilter={amountFilter}
                      triggerVariant="icon"
                    />
                  </div>
                  <BudgetTreemap
                    data={treemapData}
                    primary={currentView}
                    onNodeClick={handleNodeClick}
                    onBreadcrumbClick={handleBreadcrumbClick}
                    path={path}
                    normalization="total"
                    currency="RON"
                    amountFilter={amountFilter}
                  />
                </div>

                {/* Key insight */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 shrink-0">
                      <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-800 dark:text-amber-200 mb-1">
                        {text.keyInsightTitle}
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {text.keyInsightText}
                      </p>
                      {dynamicSourceUrl && (
                        <a
                          href={dynamicSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 mt-2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {text.sourceLabel} ({budgetInfo.year}, {budgetInfo.totalBillions}B {budgetInfo.currency})
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Reset button */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="h-12 px-6 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> {text.resetButton}
                  </Button>
                </div>
              </div>

              {/* Atmospheric blur effects */}
              <div className={cn(
                'absolute top-0 right-0 w-[30rem] h-[30rem] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none',
                colors.blur
              )} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Export types for external use
export type { ClassificationExplorerProps, ClassificationView }
