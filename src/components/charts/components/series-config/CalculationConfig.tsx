import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasCalculationCycle } from '@/lib/chart-calculation-utils';
import { SeriesGroupConfiguration } from '@/schemas/charts';
import { toast } from 'sonner';
import { useChartStore } from '../../hooks/useChartStore';
import { CalculationEditor } from './CalculationEditor';
import { Trans } from '@lingui/react/macro';

type CalculationConfigProps = {
  series: SeriesGroupConfiguration;
};

export function CalculationConfig({ series }: Readonly<CalculationConfigProps>) {
  const { chart, updateSeries } = useChartStore();

  const handleCalculationChange = (nextCalculation: SeriesGroupConfiguration['calculation']) => {
    updateSeries(series.id, { ...series, calculation: nextCalculation });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Calculation</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CalculationEditor
          calculation={series.calculation}
          onChange={handleCalculationChange}
          allSeries={chart.series}
          currentSeriesId={series.id}
          chart={chart}
          validateCalculation={(nextCalculation) => {
            if (hasCalculationCycle(series.id, nextCalculation, chart.series)) {
              return 'This change would create a circular dependency.';
            }
            return null;
          }}
          onValidationError={(message) => {
            toast.error(message);
          }}
        />
      </CardContent>
    </Card>
  );
}
