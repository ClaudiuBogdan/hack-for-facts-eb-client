import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getEntityFinancialSummaryClassNames,
  type EntityFinancialSummaryDensity,
} from "./entity-financial-frames";

type EntityFinancialSummarySkeletonProps = {
  readonly density?: EntityFinancialSummaryDensity;
};

const SUMMARY_CARD_KEYS = ["income", "expenses", "balance"] as const;

/**
 * Mirrors `EntityFinancialSummary` card for card, with the same frame classes
 * per density; a title, a period line, the headline value, its unit and the
 * trend badge are stubbed out. The default-density card centres its content
 * and takes its width from the text, so those placeholders carry fixed widths.
 */
export const EntityFinancialSummarySkeleton = ({
  density = "default",
}: EntityFinancialSummarySkeletonProps) => {
  const isCompactDesktop = density === "compact-desktop";
  const classNames = getEntityFinancialSummaryClassNames(density);

  return (
    <section className={classNames.section}>
      {SUMMARY_CARD_KEYS.map((key) => (
        <Card key={key} className={classNames.card}>
          <CardHeader className={classNames.header}>
            {isCompactDesktop ? (
              <div className="w-full">
                <div className="flex flex-col items-start gap-1 text-left sm:gap-1.5 lg:flex-1">
                  <Skeleton className="h-3.5 w-14 sm:h-5 sm:w-20" />
                  <Skeleton className="h-2.5 w-8 sm:h-3 sm:w-10" />
                </div>
              </div>
            ) : (
              <>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
              </>
            )}
          </CardHeader>
          <CardContent className={classNames.content}>
            {isCompactDesktop ? (
              <>
                <div className="flex w-full min-w-0 flex-col items-start gap-1 lg:min-h-[3rem]">
                  <Skeleton className="h-6 w-4/5 sm:h-9" />
                  <Skeleton className="h-3 w-10 sm:h-5" />
                </div>
                <Skeleton className="mt-1 h-5 w-16 rounded-full sm:h-6 sm:w-24" />
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-4 w-24" />
                <Skeleton className="mt-3 h-5 w-24 rounded-full" />
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
};
