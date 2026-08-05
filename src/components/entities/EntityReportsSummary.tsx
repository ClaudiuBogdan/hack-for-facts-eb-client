import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { ArrowRight, FileText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReportsConnection } from '@/lib/hooks/useEntityDetails';
import { getReportDateRange } from '@/lib/period-utils';
import { type ReportPeriodInput, type GqlReportType } from '@/schemas/reporting';
import { EntityReportCard } from './EntityReportCard';

type Props = {
  readonly cui: string;
  readonly reportPeriod: ReportPeriodInput;
  readonly reportType: GqlReportType;
  readonly limit?: number;
  readonly mainCreditorCui?: string;
};

export function EntityReportsSummary({ cui, reportPeriod, reportType, limit = 12, mainCreditorCui }: Props) {
  const { start, end } = useMemo(() => getReportDateRange(reportPeriod), [reportPeriod]);
  const { data, isLoading, isError } = useReportsConnection({
    filter: { entity_cui: cui, report_type: reportType, report_date_start: start, report_date_end: end, main_creditor_cui: mainCreditorCui },
    limit,
    offset: 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <Trans>Financial Reports</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground"><Trans>Loading reports…</Trans></div>
        </CardContent>
      </Card>
    );
  }

  const nodes = data?.nodes ?? [];

  // Checked before the empty case, which returns `null`: on a failed request
  // that made the whole Financial Reports card — and the only entry point to
  // the source documents — disappear without a trace, so a reader could not
  // tell the difference between "no reports filed" and "we could not ask".
  if (isError && nodes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <Trans>Financial Reports</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div role="alert" className="text-sm text-muted-foreground">
            <Trans>
              The list of reports could not be loaded. This does not mean none
              were filed — try again in a moment.
            </Trans>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nodes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <Trans>Financial Reports</Trans>
          </CardTitle>
          <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
            <Link to="/entities/$cui" params={{ cui }} search={{ view: 'reports', report_type: reportType }}>
              <Trans>View all reports</Trans>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4">
          {nodes.map((report) => (
            <EntityReportCard key={report.report_id} report={report} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
