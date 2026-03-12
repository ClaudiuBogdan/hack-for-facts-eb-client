import { Card, CardContent } from '@/components/ui/card'
import {
  educationChapterTree,
  type BudgetTreeNode,
} from '@/features/challenges/content/budget-code-anatomy-data'
import type { SupportedLocale } from '@/lib/i18n'
import { getUserLocale } from '@/lib/utils'

function TreeChildren({
  children,
  locale,
}: {
  readonly children: readonly BudgetTreeNode[]
  readonly locale: SupportedLocale
}) {
  return (
    <ul className="relative ml-4 border-l border-muted-foreground/25 pl-0">
      {children.map((child, i) => {
        const isLast = i === children.length - 1
        const isEllipsis = child.code === '...'
        const hasChildren = child.children && child.children.length > 0
        return (
          <li
            key={`${child.code}-${i}`}
            className={`relative pl-5 ${isEllipsis ? 'py-0' : 'py-1'}`}
          >
            {!isEllipsis && (
              <span
                className="absolute left-0 top-3.5 h-px w-4 bg-muted-foreground/25"
                aria-hidden
              />
            )}
            {isLast && (
              <span
                className={`absolute -left-px bottom-0 w-px bg-background ${isEllipsis ? 'top-0' : 'top-3.5'}`}
                aria-hidden
              />
            )}
            {isEllipsis ? (
              <span className="-mt-1 block font-mono text-xs leading-6 text-muted-foreground/60">
                ...
              </span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                  {child.code}
                </span>
                <span className="text-sm leading-6 text-foreground">
                  {child.label[locale]}
                </span>
              </div>
            )}
            {hasChildren && (
              <TreeChildren children={child.children!} locale={locale} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function BudgetChapterHierarchy() {
  const locale = getUserLocale()

  return (
    <Card className="not-prose my-8 rounded-[28px] border-border/60 bg-muted/[0.12] shadow-none">
      <CardContent className="pt-6">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-sm font-bold text-foreground">
            {educationChapterTree.code}
          </span>
          <span className="text-sm font-medium leading-6 text-foreground">
            {educationChapterTree.label[locale]}
          </span>
        </div>
        <TreeChildren
          children={educationChapterTree.children!}
          locale={locale}
        />
      </CardContent>
    </Card>
  )
}
