import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { StatisticsHubData } from '@/schemas/statistics'
import { HUB_SERIES_CAPTURED_AT } from '../../lib/hub-national-series'
import { formatHubNumber, formatHubPeriod, hubDataSpan } from '../../lib/hub-format'

export function HubSourcesStrip({ hub, className }: { readonly hub: StatisticsHubData; readonly className?: string }) {
  const span = hubDataSpan(hub)
  return (
    <div className={cn('grid gap-6 lg:grid-cols-12', className)}>
      <div className="lg:col-span-5">
        <MonoLabel className="block text-primary">
          <Trans>Surse și acoperire</Trans>
        </MonoLabel>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <Trans>
            INS Tempo Online — statistica oficială a României. Aici sunt seturile de date cu observații
            încărcate, pe toate temele catalogului. Teritoriile urmează nomenclatorul SIRUTA, aceeași
            cheie prin care o localitate își regăsește bugetul și achizițiile pe platformă. Golurile din
            serii rămân goluri; nimic nu este interpolat. Fiecare cifră își arată propria perioadă de
            referință, pentru că INS nu publică totul în același an.
          </Trans>
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:col-span-6 lg:col-start-7">
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Sursă</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm text-foreground">INS Tempo Online</dd>
        </div>
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Seturi cu observații</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">
            {hub.catalog ? (
              <>
                {formatHubNumber(hub.catalog.loadedCount)} / {formatHubNumber(hub.catalog.catalogCount)}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Perioade acoperite</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">
            {span.from && span.to ? `${formatHubPeriod(span.from)} – ${formatHubPeriod(span.to)}` : '—'}
          </dd>
        </div>
        <div>
          <dt>
            <MonoLabel className="text-muted-foreground">
              <Trans>Seriile din 1990</Trans>
            </MonoLabel>
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            <Trans>captură INS Tempo din {formatHubPeriod(HUB_SERIES_CAPTURED_AT.slice(0, 7))}, completată cu ultimul an publicat</Trans>
          </dd>
        </div>
      </dl>
    </div>
  )
}
