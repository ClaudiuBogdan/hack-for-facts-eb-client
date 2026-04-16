import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ClassificationActions } from './ClassificationActions'
import { ClassificationDescription, useClassificationDescription } from './ClassificationDescription'
import type { ClassificationNode, ClassificationType } from '@/types/classification-explorer'
import { useClassificationData } from './hooks/useClassificationData'

type ClassificationInfoProps = {
  readonly type: ClassificationType
  readonly node: ClassificationNode
}

function getClassificationRoutes(type: ClassificationType) {
  return type === 'functional'
    ? { list: '/classifications/functional' as const, detail: '/classifications/functional/$code' as const }
    : { list: '/classifications/economic' as const, detail: '/classifications/economic/$code' as const }
}

export function ClassificationInfo({ type, node }: ClassificationInfoProps) {
  const { getByCode } = useClassificationData(type)
  const parentInfo = node.parent ? getByCode(node.parent) : undefined
  const routes = getClassificationRoutes(type)
  
  const { data: descriptionData, isLoading: isDescriptionLoading } = useClassificationDescription(type, node.code)
  const hasDescription = !isDescriptionLoading && descriptionData && descriptionData.trim().length > 0
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {node.parent ? (
              <Link
                to={routes.detail}
                params={{ code: node.parent }}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="font-medium"><Trans>Parent</Trans>:</span>
                <span className="font-mono font-bold">{node.parent}</span>
                {parentInfo?.name && (
                  <>
                    <span>-</span>
                    <span className="font-medium">{parentInfo.name}</span>
                  </>
                )}
              </Link>
            ) : (
              <Link
                to={routes.list}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="font-medium"><Trans>All Classifications</Trans></span>
              </Link>
            )}
          </div>
          <ClassificationActions type={type} code={node.code} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasDescription && (
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-bold text-foreground">{node.code}</span>
            <CardTitle className="text-2xl leading-tight">
              {node.name || <span className="italic text-muted-foreground/60"><Trans>Missing title</Trans></span>}
            </CardTitle>
          </div>
        )}
        <ClassificationDescription type={type} code={node.code} />
      </CardContent>
    </Card>
  )
}
