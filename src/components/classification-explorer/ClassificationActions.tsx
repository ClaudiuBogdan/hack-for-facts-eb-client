import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CopyButton } from '@/components/ui/copy-button'
import { toast } from 'sonner'
import type { ClassificationType } from '@/types/classification-explorer'
import { AnalyticsFilterType, createDefaultExecutionYearReportPeriod } from '@/schemas/charts'
import { withDefaultExcludes } from '@/lib/filterUtils'

type ClassificationActionsProps = {
  readonly type: ClassificationType
  readonly code: string
}

export function ClassificationActions({ type, code }: ClassificationActionsProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(t`Code copied to clipboard`)
    } catch (err) {
      console.error('Copy failed', err)
      toast.error(t`Failed to copy code`)
    }
  }

  // Use parent code as prefix to show current item in treemap
  // If no parent, use current code (it's a root chapter)
  const prefixCode = code

  // Build the filter with the prefix
  const filterKey = type === 'functional' ? 'functional_prefixes' : 'economic_prefixes'
  const filter: AnalyticsFilterType = withDefaultExcludes({
    [filterKey]: [prefixCode],
    report_period: createDefaultExecutionYearReportPeriod(),
    account_category: 'ch' as const,
    report_type: 'Executie bugetara agregata la nivel de ordonator principal' as const,
  })

  return (
    <div className="flex items-center gap-1">
      <CopyButton onCopy={handleCopy} />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link
                to="/entity-analytics"
                search={{
                  view: 'line-items',
                  filter,
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t`View in Entity Analytics`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
