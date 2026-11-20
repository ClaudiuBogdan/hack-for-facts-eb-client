import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { t } from '@lingui/core/macro'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type FlashCardSize = 'sm' | 'md' | 'lg'

type FlashCardProps = {
  readonly id: string
  readonly icon: string
  readonly title: string
  readonly frontText: string
  readonly backText: string
}

type FlashCardDeckProps = {
  readonly children: ReactNode
  readonly componentId?: string
  readonly title?: string
  readonly completionMessage?: string
  readonly layout?: 'grid' | 'column'
  readonly showProgress?: boolean
  readonly size?: FlashCardSize
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT FOR DECK STATE
// ═══════════════════════════════════════════════════════════════════

type DeckContextValue = {
  readonly flippedIds: Set<string>
  readonly toggleCard: (id: string) => void
  readonly size: FlashCardSize
}

const DeckContext = createContext<DeckContextValue | null>(null)

function useDeckContext() {
  const context = useContext(DeckContext)
  if (!context) {
    throw new Error('FlashCard must be used within a FlashCardDeck')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════
// STATE PERSISTENCE HOOK
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY_PREFIX = 'flash-card-deck'

function useDeckState(componentId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}:${componentId}`

  const loadState = useCallback((): readonly string[] | null => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null
      const parsed = JSON.parse(stored) as { flippedIds: readonly string[] }
      return parsed.flippedIds
    } catch {
      return null
    }
  }, [storageKey])

  const saveState = useCallback(
    (flippedIds: Set<string>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ flippedIds: Array.from(flippedIds) }))
      } catch {
        // Ignore storage errors
      }
    },
    [storageKey]
  )

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore storage errors
    }
  }, [storageKey])

  return { loadState, saveState, clearState }
}

// ═══════════════════════════════════════════════════════════════════
// FLASH CARD COMPONENT (3D Flip)
// ═══════════════════════════════════════════════════════════════════

export function FlashCard({ id, icon, title, frontText, backText }: FlashCardProps) {
  const { flippedIds, toggleCard, size } = useDeckContext()
  const isFlipped = flippedIds.has(id)

  const handleClick = useCallback(() => {
    toggleCard(id)
  }, [id, toggleCard])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleCard(id)
      }
    },
    [id, toggleCard]
  )

  // Size configurations
  const heightClass = {
    sm: 'h-72',
    md: 'h-96',
    lg: 'h-[30rem]',
  }[size]

  const iconSizeClass = {
    sm: 'text-4xl',
    md: 'text-5xl',
    lg: 'text-6xl',
  }[size]

  const titleSizeClass = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size]

  const textSizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size]

  const backTextSizeClass = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  }[size]

  return (
    <div
      className="group cursor-pointer w-full"
      style={{ perspective: '1200px' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      aria-pressed={isFlipped}
      tabIndex={0}
    >
      <div
        className={cn(
          'relative w-full transition-transform duration-500 ease-out',
          heightClass
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ══════════════ FRONT SIDE ══════════════ */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <Card className="h-full border-0 shadow-lg bg-card overflow-hidden ring-1 ring-border">
            <CardContent className="h-full flex flex-col items-center justify-top px-2 py-16 text-center relative z-10">
              {/* Icon */}
              <div className="relative mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className={cn('relative drop-shadow-sm', iconSizeClass)}>{icon}</span>
              </div>

              {/* Title */}
              <h3 className={cn('font-bold text-foreground mb-4', titleSizeClass)}>
                {title}
              </h3>

              {/* Front text */}
              <p className={cn('text-muted-foreground leading-relaxed max-w-[95%]', textSizeClass)}>
                {frontText}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════ BACK SIDE ══════════════ */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <Card className="h-full border-0 shadow-lg bg-primary overflow-hidden ring-1 ring-border">
            <CardContent className="h-full flex flex-col items-center justify-center  px-2 py-16 text-center relative z-10">
              {/* Back text - Centered and larger for readability */}
              <div className="max-w-[95%]">
                <p className={cn('text-primary-foreground leading-relaxed font-medium', backTextSizeClass)}>
                  {backText}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════

type ProgressIndicatorProps = {
  readonly current: number
  readonly total: number
}

function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const isComplete = current === total
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className={cn('h-1.5 rounded-full overflow-hidden', isComplete ? 'bg-status-live-bg' : 'bg-muted')}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isComplete
              ? 'bg-status-live-fg'
              : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Text */}
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">
          {current}/{total} {t`explored`}
        </span>
        {isComplete && (
          <span className="text-status-live-fg animate-in fade-in slide-in-from-right-2">
            ✓ {t`Complete!`}
          </span>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// FLASH CARD DECK COMPONENT (Container)
// ═══════════════════════════════════════════════════════════════════

export function FlashCardDeck({
  children,
  componentId = 'default',
  title,
  completionMessage,
  layout = 'grid',
  showProgress = true,
  size = 'md',
}: FlashCardDeckProps) {
  const { loadState, saveState, clearState } = useDeckState(componentId)

  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => {
    const saved = loadState()
    return saved ? new Set(saved) : new Set()
  })

  // Count total cards from children
  const totalCards = useMemo(() => {
    let count = 0
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === FlashCard) {
        count++
      }
    })
    return count
  }, [children])

  const flippedCount = flippedIds.size
  const isComplete = flippedCount === totalCards && totalCards > 0

  useEffect(() => {
    saveState(flippedIds)
  }, [flippedIds, saveState])

  const toggleCard = useCallback((cardId: string) => {
    setFlippedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setFlippedIds(new Set())
    clearState()
  }, [clearState])

  const contextValue = useMemo(
    () => ({ flippedIds, toggleCard, size }),
    [flippedIds, toggleCard, size]
  )

  const layoutClasses = {
    column: 'flex flex-col gap-6',
    grid: 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <DeckContext.Provider value={contextValue}>
      <div className="my-8 space-y-6">
        {/* Header */}
        {(title) && (
          <div className="flex items-center justify-between">
            {title && (
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {title}
              </h3>
            )}
            {flippedCount > 0 && (
              <Button
                variant="ghost"
                aria-label={t`Start over`}
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Cards */}
        <div className={layoutClasses[layout]}>{children}</div>

        {/* Progress indicator */}
        {showProgress && <ProgressIndicator current={flippedCount} total={totalCards} />}

        {/* Completion message */}
        {showProgress && isComplete && completionMessage && (
          <Card className="border-status-live-fg/30 bg-status-live-bg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-status-live-fg">
                🎉 {completionMessage}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DeckContext.Provider>
  )
}

// Export types for MDX usage
export type { FlashCardProps, FlashCardDeckProps, FlashCardSize }
