import { Trans } from '@lingui/react/macro'
import { Badge } from '@/components/ui/badge'

type Props = {
  readonly status: 'source_only' | 'low' | 'medium' | 'high'
}

export function IdentityConfidenceBadge({ status }: Props) {
  if (status === 'high') {
    return <Badge variant="secondary"><Trans>Identitate verificata</Trans></Badge>
  }
  if (status === 'medium') {
    return <Badge variant="outline"><Trans>Identitate probabila</Trans></Badge>
  }
  if (status === 'low') {
    return <Badge variant="warning"><Trans>Identitate incerta</Trans></Badge>
  }
  return <Badge variant="outline"><Trans>Nume din sursa</Trans></Badge>
}
