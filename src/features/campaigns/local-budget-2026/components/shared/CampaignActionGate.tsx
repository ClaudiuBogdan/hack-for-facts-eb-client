import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCampaignAuthGate } from '../../hooks/use-campaign-auth-gate'

type CampaignActionGateProps = {
  readonly actionId: string
  readonly challengeSlug?: string
  readonly label: string
  readonly onAuthorizedAction: () => void | Promise<void>
  readonly disabled?: boolean
  readonly className?: string
}

export function CampaignActionGate({
  actionId,
  challengeSlug,
  label,
  onAuthorizedAction,
  disabled,
  className,
}: CampaignActionGateProps) {
  const { requireAuth } = useCampaignAuthGate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClick = async () => {
    const isAuthorized = requireAuth({ actionId, challengeSlug })
    if (!isAuthorized) return

    setIsSubmitting(true)

    try {
      await onAuthorizedAction()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Button className={className} disabled={disabled || isSubmitting} onClick={handleClick}>
      {isSubmitting ? 'Se procesează...' : label}
    </Button>
  )
}
