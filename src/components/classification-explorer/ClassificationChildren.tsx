import { Link } from '@tanstack/react-router'
import { ChevronRight, Layers } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import type { ClassificationNode, ClassificationType } from '@/types/classification-explorer'

type ClassificationChildrenProps = {
  readonly type: ClassificationType
  readonly children: readonly ClassificationNode[]
}

export function ClassificationChildren({
  type,
  children,
}: ClassificationChildrenProps) {
  const basePath = `/classifications/${type}`

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">
        <Trans>Subcategories</Trans> <span className="text-muted-foreground">({children.length})</span>
      </h2>
      <div className="max-h-[420px] md:max-h-[60vh] overflow-auto rounded-lg border bg-card">
        {children.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              <Trans>This classification has no subcategories</Trans>
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {children.map((child) => (
              <Link
                key={child.code}
                to={`${basePath}/${child.code}` as string}
                className="group block"
              >
                <div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
                  <div className="shrink-0">
                    <span className="font-mono text-sm font-bold text-muted-foreground">
                      {child.code}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug break-words">
                      {child.name || <span className="italic text-muted-foreground/60"><Trans>Missing title</Trans></span>}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
