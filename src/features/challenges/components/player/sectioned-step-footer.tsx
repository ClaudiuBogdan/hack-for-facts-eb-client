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
    <div className="flex-none border-t border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-0">
        {footerState.message ? (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-sm font-medium',
                footerState.tone === 'success' &&
                  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                footerState.tone === 'error' &&
                  'bg-rose-500/10 text-rose-700 dark:text-rose-300',
                footerState.tone === 'neutral' && 'bg-muted text-muted-foreground',
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
              variant="ghost"
              onClick={onSkip}
              className="rounded-full px-5"
            >
              {t`Skip`}
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            onClick={onPrimaryAction}
            disabled={footerState.primaryDisabled}
            className={cn(
              'h-14 min-w-[12rem] rounded-full px-8 text-base font-bold shadow-lg',
              footerState.tone === 'success' && 'bg-emerald-600 hover:bg-emerald-700',
              footerState.tone === 'error' && 'bg-rose-600 hover:bg-rose-700',
            )}
          >
            {footerState.primaryLabel}
            {footerState.primaryAction === 'advance' ? (
              <ArrowRight className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  )
}
