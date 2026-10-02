import { Chart, Series, CustomSeriesValueConfigurationSchema } from "@/schemas/charts";
import { LineItemsAggregatedYearlySeriesFilter } from "./LineItemsAggregatedYearlySeriesFilter";
import { AggregatedSeriesCalculationSeriesFilter } from "./AggregatedSeriesCalculationSeriesFilter";
import { CustomSeriesSeriesFilter } from "./CustomSeriesSeriesFilter";
import { CustomSeriesValueSeriesFilter } from "./CustomSeriesValueSeriesFilter";
import { StaticSeriesFilter } from "./StaticSeriesFilter";
import { InsSeriesFilter } from "./InsSeriesFilter";
import { CommitmentsSeriesFilter } from "./CommitmentsSeriesFilter";
import { CompaniesSeriesFilter } from "./CompaniesSeriesFilter";
import { z } from "zod";

interface SeriesFilterDisplayProps {
  series: Series;
  chart: Chart;
}

export function SeriesFilterDisplay({ series, chart }: SeriesFilterDisplayProps) {
  switch (series.type) {
    case "line-items-aggregated-yearly":
      return <LineItemsAggregatedYearlySeriesFilter series={series} />;
    case "commitments-analytics":
      return <CommitmentsSeriesFilter series={series} />;
    case "aggregated-series-calculation":
      return <AggregatedSeriesCalculationSeriesFilter series={series} chart={chart} />;
    case "custom-series":
      return <CustomSeriesSeriesFilter series={series} />;
    case "custom-series-value":
      return <CustomSeriesValueSeriesFilter series={series as z.infer<typeof CustomSeriesValueConfigurationSchema>} />;
    case "static-series":
      return <StaticSeriesFilter series={series} chart={chart} />;
    case "ins-series":
      return <InsSeriesFilter series={series} />;
    case "companies-analytics":
      return <CompaniesSeriesFilter series={series} />;
    default:
      return null;
  }
}
