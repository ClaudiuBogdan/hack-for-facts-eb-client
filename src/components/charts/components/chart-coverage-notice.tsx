import { Trans } from '@lingui/react/macro';
import type { AnalyticsSeries } from '@/schemas/charts';

/** Keep coverage visible even when no chart points can be displayed. */
export function ChartCoverageNotice({ dataSeriesMap }: {
  readonly dataSeriesMap?: ReadonlyMap<string, AnalyticsSeries> | null;
}) {
  if (!dataSeriesMap || ![...dataSeriesMap.values()].some(series => series.missingPeriods?.length)) return null;
  return <p role="status" className="mb-3 text-sm text-muted-foreground">
    <Trans>Some periods are unavailable. Totals and calculations requiring them are not shown.</Trans>
  </p>;
}
