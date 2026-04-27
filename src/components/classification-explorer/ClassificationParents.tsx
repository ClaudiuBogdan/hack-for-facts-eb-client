import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClassificationNode, ClassificationType } from '@/types/classification-explorer'

type ClassificationParentsProps = {
  readonly type: ClassificationType
  readonly parents: readonly ClassificationNode[]
}

export function ClassificationParents({
  type,
  parents,
}: ClassificationParentsProps) {
  if (parents.length === 0) {
    return null
  }

  const basePath = `/classifications/${type}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans>Parent Categories</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {parents.map((parent) => (
            <Link
              key={parent.code}
              to={`${basePath}/${parent.code}` as string}
              className="group inline-flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary hover:bg-accent"
            >
              <Badge variant="secondary" className="font-mono text-xs">
                {parent.code}
              </Badge>
              <span className="text-sm">{parent.name}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
