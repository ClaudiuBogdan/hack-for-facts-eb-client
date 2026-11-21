import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import {
  PART_COLORS,
  DEFAULT_PART_COLORS,
  type FunctionalClassificationAccordionProps,
} from './functional-classification-accordion-data'

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function FunctionalClassificationAccordion({
  parts,
  text,
  highlightCodes = [],
  explorerUrl,
}: FunctionalClassificationAccordionProps) {
  // Convert highlightCodes to Set for O(1) lookup
  const highlightSet = useMemo(() => new Set(highlightCodes), [highlightCodes])

  return (
    <div className="w-full my-8">
      {/* Header */}
      {(text?.title || text?.subtitle) && (
        <div className="mb-4">
          {text?.title && (
            <h3 className="text-lg font-bold text-foreground">{text.title}</h3>
          )}
          {text?.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{text.subtitle}</p>
          )}
        </div>
      )}

      {/* Accordion */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <Accordion type="single" collapsible className="w-full">
          {parts.map((part) => {
            const color = part.color ?? DEFAULT_PART_COLORS[part.id] ?? 'slate'
            const colors = PART_COLORS[color]
            const hasHighlightedCodes = part.codes.some((c) =>
              highlightSet.has(c.code)
            )

            return (
              <AccordionItem
                key={part.id}
                value={part.id}
                className="border-b border-border/40 last:border-b-0"
              >
                <AccordionTrigger
                  className={cn(
                    'px-4 py-3 text-left transition-colors',
                    colors.hover,
                    'hover:no-underline'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Part badge */}
                    <span
                      className={cn(
                        'shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold',
                        colors.badge
                      )}
                    >
                      {part.id}
                    </span>

                    {/* Part name */}
                    <span className="font-semibold text-foreground truncate">
                      {part.name}
                    </span>

                    {/* Highlighted codes indicator */}
                    {hasHighlightedCodes && (
                      <div className="flex items-center gap-1 ml-auto mr-2">
                        {part.codes
                          .filter((c) => highlightSet.has(c.code))
                          .map((c) => (
                            <span
                              key={c.code}
                              className={cn(
                                'w-2 h-2 rounded-full',
                                colors.accent
                              )}
                              title={`${c.code}: ${c.name}`}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 pb-0">
                  <div className="divide-y divide-border/30">
                    {part.codes.map((code) => {
                      const isHighlighted = highlightSet.has(code.code)

                      return (
                        <div
                          key={code.code}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3',
                            'bg-muted/20',
                            isHighlighted && 'bg-muted/40'
                          )}
                        >
                          {/* Code number */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isHighlighted && (
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full shrink-0',
                                  colors.accent
                                )}
                              />
                            )}
                            <span
                              className="font-mono text-sm font-bold w-8 text-foreground"
                            >
                              {code.code}
                            </span>
                          </div>

                          {/* Code details */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                'text-sm',
                                isHighlighted
                                  ? 'font-medium text-foreground'
                                  : 'text-foreground/80'
                              )}
                            >
                              {code.name}
                            </span>
                            {code.description && (
                              <p className="text-xs text-foreground mt-0.5">
                                {code.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Explorer link */}
      {explorerUrl && text?.explorerLabel && (
        <div className="mt-4 flex justify-end">
          <Link
            to={explorerUrl as '/'}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-colors"
          >
            {text.explorerLabel}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

// Export types for external use
export type { FunctionalClassificationAccordionProps }
