import { useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Info, X } from 'lucide-react'
import { yValueFormatter } from '@/components/charts/components/chart-renderer/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { ExcludedItemsSummary } from './budget-transform'
import { useIsMobile } from '@/hooks/use-mobile'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback'
import { cn } from '@/lib/utils'
import type { TreemapAmountFilter } from './useTreemapAmountFilter'

type Props = {
  readonly excludedItemsSummary?: ExcludedItemsSummary
  readonly unit: string
  readonly amountFilter?: TreemapAmountFilter
  readonly triggerVariant?: 'text' | 'icon'
  readonly buttonClassName?: string
}

export function FilteredSpendingInfo({
  excludedItemsSummary,
  unit,
  amountFilter,
  triggerVariant = 'text',
  buttonClassName,
}: Props) {
  const isMobile = useIsMobile()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uiRange, setUiRange] = useState<[number, number]>(amountFilter?.range ?? [0, 0])

  // All hooks must be called before any early returns
  useEffect(() => {
    if (!amountFilter) return
    setUiRange([amountFilter.range[0], amountFilter.range[1]])
  }, [amountFilter?.range?.[0], amountFilter?.range?.[1]])

  const debouncedOnChange = useDebouncedCallback<[[number, number]]>((val) => {
    amountFilter?.onChange(val)
  }, 500)

  const hasExcluded = !!excludedItemsSummary && excludedItemsSummary.totalExcluded > 0
  const showDialog = hasExcluded || (!!amountFilter && amountFilter.maxValue > 0)
  if (!showDialog) return null

  const step = amountFilter ? Math.max(1, Math.round((amountFilter.maxValue - amountFilter.minValue) / 100)) : 1

  const content = (
    <div className="space-y-4">
      {hasExcluded && excludedItemsSummary && (
        <>
          {/* Header */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              <Trans>Spending Calculation</Trans>
            </h4>
            <p className="text-xs text-muted-foreground">
              <Trans>Understanding the consolidated general budget spending</Trans>
            </p>
          </div>

          {/* Calculation breakdown */}
          <div className="bg-muted/30 rounded-lg p-2 md:p-4 space-y-2.5">
            <div className="flex justify-between items-center gap-6">
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">
                  <Trans>Total Spending</Trans>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  <Trans>All budget expenditures</Trans>
                </div>
              </div>
	              <div className="text-right">
	                <div className="font-mono text-base font-semibold text-foreground whitespace-nowrap">
	                  {yValueFormatter(excludedItemsSummary.totalBeforeExclusion, unit, 'compact')}
	                </div>
	              </div>
	            </div>

            <div className="flex items-center justify-center py-1">
              <div className="w-full border-t border-dashed border-border" />
              <span className="px-3 text-sm font-bold text-muted-foreground">−</span>
              <div className="w-full border-t border-dashed border-border" />
            </div>

            <div className="flex justify-between items-center gap-6">
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">
                  <Trans>Excluded Items</Trans>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  <Trans>Non-direct spending</Trans>
                </div>
              </div>
	              <div className="text-right">
	                <div className="font-mono text-base font-semibold text-destructive whitespace-nowrap">
	                  {yValueFormatter(excludedItemsSummary.totalExcluded, unit, 'compact')}
	                </div>
	              </div>
	            </div>

            <div className="flex items-center justify-center py-1">
              <div className="w-full border-t-2 border-primary/30" />
              <span className="px-3 text-sm font-bold text-primary">=</span>
              <div className="w-full border-t-2 border-primary/30" />
            </div>

            <div className="flex justify-between items-center gap-6 bg-primary/5 rounded-md p-3 -mx-1">
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  <Trans>Effective Spending</Trans>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  <Trans>Actual impact on budget</Trans>
                </div>
              </div>
	              <div className="text-right">
	                <div className="font-mono text-lg font-bold text-primary whitespace-nowrap">
	                  {yValueFormatter(excludedItemsSummary.totalAfterExclusion, unit, 'compact')}
	                </div>
	              </div>
	            </div>
          </div>

          {/* Excluded categories details */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-semibold text-foreground">
              <Trans>Excluded categories</Trans>
            </h5>
            <div className="space-y-2">
              {excludedItemsSummary.items.map((item) => (
                <div key={item.code} className="flex justify-between items-start gap-4 text-xs">
                  <div className="flex-1">
                    <div className="text-foreground font-medium">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-mono bg-muted/70 px-1.5 py-0.5 rounded">{item.code}</span>
                    </div>
                  </div>
	                  <div className="font-mono font-semibold text-foreground whitespace-nowrap">
	                    {yValueFormatter(item.amount, unit, 'compact')}
	                  </div>
	                </div>
	              ))}
            </div>
          </div>
        </>
      )}

      {amountFilter && amountFilter.maxValue > 0 && (
        <div className="pt-2">
          <h5 className="text-xs font-semibold text-foreground mb-2">
            <Trans>Amount filter (this layer)</Trans>
          </h5>
	          <div className="mb-2 flex items-center justify-between">
	            <Label className="text-xs text-muted-foreground"><Trans>Range</Trans></Label>
	            <div className="text-xs text-muted-foreground font-mono">
	              {yValueFormatter(uiRange[0], unit, 'compact')} – {yValueFormatter(uiRange[1], unit, 'compact')}
	            </div>
	          </div>
          <Slider
            value={uiRange}
            min={Math.floor(amountFilter.minValue)}
            max={Math.ceil(amountFilter.maxValue)}
            step={step}
            onValueChange={(val) => {
              const newRange = val as [number, number]
              setUiRange(newRange)
              debouncedOnChange(newRange)
            }}
          />
	          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
	            <span className="font-mono">{yValueFormatter(amountFilter.minValue, unit, 'compact')}</span>
	            <span className="font-mono">{yValueFormatter(amountFilter.maxValue, unit, 'compact')}</span>
	          </div>
          {(amountFilter.range[0] > amountFilter.minValue || amountFilter.range[1] < amountFilter.maxValue) && (
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  const next: [number, number] = [amountFilter.minValue, amountFilter.maxValue]
                  setUiRange(next)
                  debouncedOnChange(next)
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                <Trans>Reset amount filter</Trans>
              </button>
            </div>
          )}
        </div>
      )}

      {hasExcluded && (
        <div className="flex gap-2 text-xs text-muted-foreground bg-muted/20 rounded-md p-3">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <Trans>Note: Transfer items are excluded as they represent internal movements within the public administration rather than actual expenditures or revenues.</Trans>
          </p>
        </div>
      )}
    </div>
  )

  const trigger = triggerVariant === 'icon' ? (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('shrink-0 rounded-full', buttonClassName)}
      aria-label={t`Spending Calculation`}
      title={t`Spending Calculation`}
    >
      <Info className="h-4 w-4" />
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'h-7 px-2.5 text-xs gap-1.5 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900 dark:border-amber-800 dark:text-amber-100',
        buttonClassName,
      )}
    >
      <Info className="w-3.5 h-3.5" />
      <Trans>Filtered</Trans>
    </Button>
  )

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent
        hideCloseButton={true}
        className={cn(
          'overflow-hidden p-0',
          isMobile
            ? 'max-w-[calc(100vw-2rem)] w-[calc(100vw-2rem)] rounded-lg'
            : 'max-w-xl',
        )}
      >
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-5 py-3 supports-[backdrop-filter]:bg-background/80">
          <DialogTitle className="text-base">
            <Trans>Spending Calculation</Trans>
          </DialogTitle>
          <DialogDescription className="sr-only">
            <Trans>Details about excluded items and amount filters used in this view.</Trans>
          </DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
              aria-label={t`Close`}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
