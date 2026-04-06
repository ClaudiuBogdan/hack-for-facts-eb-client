import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { CAMPAIGN_TERMS_PATH } from '@/features/campaigns/buget/constants'
import { cn } from '@/lib/utils'

type Props = {
  readonly showCampaignTerms?: boolean
  readonly showGeneralTerms?: boolean
  readonly className?: string
}

const LINK_CLASS_NAME =
  'font-medium underline underline-offset-2 transition-colors hover:text-foreground'

export function NotificationLegalNotice({
  showCampaignTerms = false,
  showGeneralTerms = false,
  className,
}: Props) {
  if (!showCampaignTerms && !showGeneralTerms) {
    return null
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      {showCampaignTerms ? (
        <p>
          <Trans>
            Campaign notifications are subject to the{' '}
            <Link to={CAMPAIGN_TERMS_PATH} className={LINK_CLASS_NAME}>
              campaign terms and conditions
            </Link>
            .
          </Trans>
        </p>
      ) : null}
      {showGeneralTerms ? (
        <p>
          <Trans>
            Platform notifications are subject to the{' '}
            <Link to="/terms" className={LINK_CLASS_NAME}>
              Transparenta.eu Terms of Use
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className={LINK_CLASS_NAME}>
              Privacy Policy
            </Link>
            .
          </Trans>
        </p>
      ) : null}
    </div>
  )
}
