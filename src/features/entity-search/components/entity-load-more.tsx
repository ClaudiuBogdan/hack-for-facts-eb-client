import { Trans } from '@lingui/react/macro'

type Props = {
  readonly isLoading: boolean
  readonly disabled: boolean
  readonly onClick: () => void
}

export function EntityLoadMore({ isLoading, disabled, onClick }: Props) {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className="border-2 border-[var(--pnrr-border)] px-5 py-2.5 text-sm font-bold text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
      >
        {isLoading ? <Trans>Loading…</Trans> : <Trans>Încarcă mai mult</Trans>}
      </button>
    </div>
  )
}
