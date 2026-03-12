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
      return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
    }
    return isTriggerMode
      ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
  }

  return (
    <div className={cn(
      "my-8 rounded-2xl overflow-hidden transition-all duration-300",
      "border border-zinc-200 dark:border-zinc-800",
      "bg-white dark:bg-zinc-950",
      isOpen ? "shadow-md ring-1 ring-zinc-200 dark:ring-zinc-800" : "shadow-sm hover:shadow-md"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-6 py-5 text-left transition-colors outline-none",
          "hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
          isOpen && "bg-zinc-50/80 dark:bg-zinc-900/80"
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
              "font-bold text-base leading-snug",
              isTriggerMode 
                ? "text-zinc-800 dark:text-zinc-100" 
                : "text-zinc-700 dark:text-zinc-300"
            )}>
              {displayText}
            </span>
            {!isOpen && isTriggerMode && (
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Click to reveal answer
              </span>
            )}
          </div>
        </div>
        
        <div className={cn(
          "shrink-0 ml-4 p-1 rounded-full transition-transform duration-300",
          isOpen ? "rotate-180 bg-zinc-200 dark:bg-zinc-800" : "bg-transparent"
        )}>
          <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
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
              "px-6 pb-6 pt-2 border-t border-zinc-100 dark:border-zinc-800/50",
              isTriggerMode 
                ? "bg-amber-50/30 dark:bg-amber-950/10" 
                : "bg-zinc-50/50 dark:bg-zinc-900/30"
            )}>
              <div className={cn(
                "md:pl-3 prose prose-zinc dark:prose-invert max-w-none",
                isTriggerMode 
                  ? "prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed" 
                  : "prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-p:text-sm prose-p:font-mono"
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
