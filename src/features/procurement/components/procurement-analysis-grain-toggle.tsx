import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'

export type FlowAnalysisGrain = 'contract' | 'direct_acquisition'

export function ProcurementAnalysisGrainToggle({
  value,
  onChange,
}: {
  readonly value: FlowAnalysisGrain
  readonly onChange: (grain: FlowAnalysisGrain) => void
}) {
  return (
    <div className="inline-flex border-2 border-[var(--pnrr-border)]" role="group">
      <Button
        type="button"
        variant={value === 'direct_acquisition' ? 'default' : 'ghost'}
        className="rounded-none"
        aria-pressed={value === 'direct_acquisition'}
        onClick={() => onChange('direct_acquisition')}
      >
        <Trans>Direct acquisitions</Trans>
      </Button>
      <Button
        type="button"
        variant={value === 'contract' ? 'default' : 'ghost'}
        className="rounded-none border-l-2 border-[var(--pnrr-border)]"
        aria-pressed={value === 'contract'}
        onClick={() => onChange('contract')}
      >
        <Trans>Contracts</Trans>
      </Button>
    </div>
  )
}
