import { t } from '@lingui/core/macro'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SectionFooterState } from './challenge-step-player.shared'

type SectionedStepFooterProps = {
  readonly footerState: SectionFooterState
  readonly onSkip: () => void
  readonly onPrimaryAction: () => void
}

export function SectionedStepFooter({
  footerState,
  onSkip,
  onPrimaryAction,
}: SectionedStepFooterProps) {
  return (
    <div
      data-testid="sectioned-step-footer"
      className="sticky bottom-0 z-10 flex-none border-t border-border/70 bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-0">
        {footerState.message ? (
          <div className="space-y-4">
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'rounded-2xl px-4 py-3 text-sm font-medium',
                footerState.tone === 'success' &&
                'bg-status-live-bg text-status-live-fg',
                footerState.tone === 'error' &&
                'bg-status-blocked-bg text-status-blocked-fg',
                footerState.tone === 'neutral' && 'bg-muted text-foreground',
              )}
            >
              {footerState.message}
            </div>

            <div
              data-testid="sectioned-footer-note-separator"
              className="h-px bg-border/70"
            />
          </div>
        ) : null}

        <div
          data-testid="sectioned-footer-actions"
          className={cn('flex items-center justify-between gap-4', footerState.message && 'pt-2')}
        >
          {footerState.showSkip ? (
            <Button
              type="button"
              data-testid="sectioned-footer-skip"
              variant="ghost"
              onClick={onSkip}
              className={cn(
                'h-12 rounded-full px-7 text-base font-semibold select-none transition-all',
                footerState.primaryDisabled && 'border border-status-partial-fg/40 shadow-sm hover:bg-status-partial-bg hover:text-status-partial-fg hover:border-status-partial-fg',
              )}
            >
              {t`Skip`}
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant={footerState.primaryDisabled ? 'outline' : 'default'}
            onClick={onPrimaryAction}
            disabled={footerState.primaryDisabled}
            className={cn(
              'h-12 min-w-[10rem] rounded-full px-7 text-base font-semibold select-none transition-all',
              !footerState.primaryDisabled && 'shadow-lg',
              !footerState.primaryDisabled && footerState.tone !== 'success' && footerState.tone !== 'error' && 'hover:bg-primary hover:shadow-xl',
              !footerState.primaryDisabled && footerState.tone === 'success' && 'bg-status-live-fg text-background hover:bg-status-live-fg hover:shadow-xl',
              !footerState.primaryDisabled && footerState.tone === 'error' && 'bg-status-blocked-fg text-background hover:bg-status-blocked-fg hover:shadow-xl',
              footerState.primaryDisabled && 'border-border/80 text-muted-foreground shadow-none disabled:opacity-100',
            )}
          >
            {footerState.primaryLabel}
            {footerState.primaryAction === 'advance' && !footerState.primaryDisabled ? (
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  )
}
