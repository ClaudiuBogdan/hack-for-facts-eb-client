import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ENTITY_FINANCIAL_TRENDS_CARD_CLASS_NAME,
  ENTITY_FINANCIAL_TRENDS_CHART_HEIGHT,
} from "./entity-financial-frames";

/**
 * Mirrors `EntityFinancialTrends`: the same card frame, a line the height of
 * the title and a block the height of the chart.
 */
export const EntityFinancialTrendsSkeleton = () => {
  return (
    <Card className={ENTITY_FINANCIAL_TRENDS_CARD_CLASS_NAME}>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="pt-6">
        <Skeleton
          className="w-full rounded-2xl"
          style={{ height: ENTITY_FINANCIAL_TRENDS_CHART_HEIGHT }}
        />
      </CardContent>
    </Card>
  );
};
