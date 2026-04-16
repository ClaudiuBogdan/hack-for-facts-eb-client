import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import type { ClassificationNode, ClassificationType } from '@/types/classification-explorer'

type ClassificationBreadcrumbProps = {
  readonly type: ClassificationType
  readonly parents: readonly ClassificationNode[]
  readonly current: ClassificationNode
}

function getClassificationRoutes(type: ClassificationType) {
  return type === 'functional'
    ? { list: '/classifications/functional' as const, detail: '/classifications/functional/$code' as const }
    : { list: '/classifications/economic' as const, detail: '/classifications/economic/$code' as const }
}

export function ClassificationBreadcrumb({
  type,
  parents,
  current,
}: ClassificationBreadcrumbProps) {
  const routes = getClassificationRoutes(type)

  return (
    <Breadcrumb className="max-w-[60vw] overflow-hidden">
      <BreadcrumbList className="flex-wrap">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <Link to={routes.list} className="text-xs font-medium whitespace-nowrap">
              <Trans>All Classifications</Trans>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {parents.map((parent) => {
          return (
            <div key={parent.code} className="contents">
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink asChild>
                  <Link
                    to={routes.detail}
                    params={{ code: parent.code }}
                    className="text-xs font-medium whitespace-nowrap inline-flex items-center gap-1"
                  >
                    <span className="font-mono font-bold">{parent.code}</span>
                    {parent.name && (
                      <>
                        <span className="text-muted-foreground">-</span>
                        <span className="max-w-[150px] md:max-w-full truncate">{parent.name}</span>
                      </>
                    )}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </div>
          )
        })}

        <BreadcrumbSeparator className="shrink-0" />
        <BreadcrumbItem className="shrink-0 max-w-full">
          <BreadcrumbPage className="text-xs font-medium inline-flex items-center gap-1">
            <span className="font-mono font-bold shrink-0">{current.code}</span>
            {current.name && (
              <>
                <span className="text-muted-foreground shrink-0">-</span>
                <span className="max-w-[150px] md:max-w-full truncate">{current.name}</span>
              </>
            )}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
