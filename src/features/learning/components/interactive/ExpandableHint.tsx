import { useState } from 'react'
import { ChevronDown, Lightbulb, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type ExpandableHintProps = {
  /**
   * Interactive question prompt that encourages learners to think before revealing.
   * Takes precedence over `label` when both are provided.
   * @example "Quick question: What limits your spending choices?"
   */
  readonly trigger?: string
  /**
   * Section label for supplementary content like technical specs.
   * Used when `trigger` is not provided.
   * @default "Details"
   */
  readonly label?: string
  /** @default false */
  readonly defaultOpen?: boolean
  readonly children: React.ReactNode
}

/**
 * ExpandableHint - A click-to-expand container for interactive learning content.
 *
 * @description
 * Used in lesson MDX files to create interactive reveal moments that support
 * retrieval practice (a core learning science principle). Learners think or
 * predict before clicking to see the answer.
 *
 * **When to use:**
 * - To prompt learners to recall information before revealing the answer
 * - To hide technical details that would distract from the main narrative
 * - To create "think first" moments that improve retention
 *
 * @example Retrieval practice question (most common usage)
 * ```mdx
 * <ExpandableHint trigger="Quick question: What limits your spending choices?">
 *   Your income. You can't spend more than you have.
 * </ExpandableHint>
 * ```
 *
 * @example Technical details section
 * ```mdx
 * <ExpandableHint label="Implementation Specs">
 *   Component interface definitions and technical notes...
 * </ExpandableHint>
 * ```
 */
export function ExpandableHint({
  trigger,
  label = 'Details',
  defaultOpen = false,
  children,
}: ExpandableHintProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const displayText = trigger ?? label
  const isTriggerMode = Boolean(trigger)

  const getIconBgClass = () => {
    if (!isOpen) {
      return "bg-muted text-muted-foreground"
    }
    return isTriggerMode
      ? "bg-status-partial-bg text-status-partial-fg"
      : "bg-primary/10 text-primary"
  }

  return (
    <div className={cn(
      "my-8 rounded-2xl overflow-hidden transition-all duration-300",
      "border border-border",
      "bg-card",
      isOpen ? "shadow-md ring-1 ring-border" : "shadow-sm hover:shadow-md"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-5 text-left transition-colors focus-visible:-outline-offset-2"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "shrink-0 p-2 rounded-lg transition-colors",
            getIconBgClass()
          )}>
            {isTriggerMode ? <Lightbulb className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </div>
          <div className="flex flex-col gap-1">
            <span className={cn(
              "font-bold text-base leading-snug text-foreground"
            )}>
              {displayText}
            </span>
            {!isOpen && isTriggerMode && (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Click to reveal answer
              </span>
            )}
          </div>
        </div>
        
        <div className={cn(
          "shrink-0 ml-4 p-1 rounded-full transition-transform duration-300",
          isOpen ? "rotate-180 bg-muted" : "bg-transparent"
        )}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className={cn(
              "px-6 pb-6 pt-2 border-t bg-card",
              isTriggerMode ? "border-status-partial-fg/30" : "border-border"
            )}>
              <div className={cn(
                "md:pl-3 prose max-w-none [--tw-prose-body:hsl(var(--foreground))] [--tw-prose-bullets:hsl(var(--muted-foreground))] [--tw-prose-counters:hsl(var(--muted-foreground))]",
                isTriggerMode 
                  ? "prose-p:text-foreground prose-p:leading-relaxed" 
                  : "prose-p:text-muted-foreground prose-p:text-sm prose-p:font-mono"
              )}>
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
