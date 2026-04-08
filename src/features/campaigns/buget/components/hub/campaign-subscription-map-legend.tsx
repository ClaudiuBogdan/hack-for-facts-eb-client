import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { cn, formatNumber } from '@/lib/utils'
import {
  SUBSCRIPTION_NO_DATA_COLOR,
  type SubscriptionLegendBin,
} from '../../utils/subscription-scale'

type CampaignSubscriptionMapLegendProps = {
  readonly bins: readonly SubscriptionLegendBin[]
  readonly totalParticipants?: number
  readonly className?: string
}

function formatLegendBinLabel(bin: SubscriptionLegendBin, locale: string): string {
  const formattedMin = formatNumber(bin.min, 'standard')
  const formattedMax = formatNumber(bin.max, 'standard')
  const isRomanian = locale.toLowerCase().startsWith('ro')

  if (bin.min === bin.max) {
    if (bin.min === 1) {
      return isRomanian ? `${formattedMin} participant` : `${formattedMin} participant`
    }

    return isRomanian ? `${formattedMin} participanți` : `${formattedMin} participants`
  }

  return isRomanian
    ? `${formattedMin} - ${formattedMax} participanți`
    : `${formattedMin} - ${formattedMax} participants`
}

export function CampaignSubscriptionMapLegend({
  bins,
  totalParticipants,
  className,
}: CampaignSubscriptionMapLegendProps) {
  const { i18n } = useLingui()
  const isRomanian = i18n.locale.toLowerCase().startsWith('ro')

  if (bins.length === 0 && totalParticipants == null) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-background/92 p-3 shadow-lg backdrop-blur-sm',
        className,
      )}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
        {t`Participants`}
      </p>
      {totalParticipants != null ? (
        <p className="mt-1 text-sm font-semibold text-foreground">
          {formatNumber(totalParticipants, 'standard')}{' '}
          {isRomanian ? 'participanți în campanie' : 'participants in campaign'}
        </p>
      ) : null}
      <div className="mt-3 space-y-2 text-xs text-foreground">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full border border-border/60"
            style={{ backgroundColor: SUBSCRIPTION_NO_DATA_COLOR }}
          />
          <span>{t`0 participants`}</span>
        </div>

        {bins.map((bin) => (
          <div key={`${bin.min}-${bin.max}`} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-full border border-border/60"
              style={{ backgroundColor: bin.color }}
            />
            <span>{formatLegendBinLabel(bin, i18n.locale)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
