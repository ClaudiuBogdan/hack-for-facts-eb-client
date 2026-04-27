import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import type { ClassificationNode, ClassificationType } from '@/types/classification-explorer'

type ClassificationSiblingsProps = {
  readonly type: ClassificationType
  readonly siblings: readonly ClassificationNode[]
}

const INITIAL_DISPLAY_COUNT = 5

export function ClassificationSiblings({
  type,
  siblings,
}: ClassificationSiblingsProps) {
  const [showAll, setShowAll] = useState(false)

  if (siblings.length === 0) {
    return null
  }

  const basePath = `/classifications/${type}`
  const hasMore = siblings.length > INITIAL_DISPLAY_COUNT
  const displayedSiblings = showAll ? siblings : siblings.slice(0, INITIAL_DISPLAY_COUNT)

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">
        <Trans>Related Categories</Trans> <span className="text-muted-foreground">({siblings.length})</span>
      </h2>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="max-h-[360px] md:max-h-[50vh] overflow-auto">
          <div className="divide-y">
            {displayedSiblings.map((sibling) => (
              <Link
                key={sibling.code}
                to={`${basePath}/${sibling.code}` as string}
                className="group block"
              >
                <div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                  <div className="shrink-0">
                    <span className="font-mono text-sm font-bold text-muted-foreground">
                      {sibling.code}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug break-words">
                      {sibling.name || <span className="italic text-muted-foreground/60"><Trans>Missing title</Trans></span>}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        {hasMore && (
          <div className="border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full gap-2 rounded-none"
            >
              {showAll ? (
                <>
                  <Trans>Show less</Trans>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Trans>Show {siblings.length - INITIAL_DISPLAY_COUNT} more</Trans>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
