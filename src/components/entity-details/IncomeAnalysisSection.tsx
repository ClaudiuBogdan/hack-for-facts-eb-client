import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IncomeAnalysisSectionProps {
    cui: string;
    // selectedPeriod: { year: number; periodType: string };
    // TODO: Add props for selected period
}

export function IncomeAnalysisSection({ cui /*, selectedPeriod */ }: IncomeAnalysisSectionProps) {
    // TODO: Fetch income analysis data
    // Data source: ExecutionLineItems (vn), FundingSources, FunctionalClassifications
    // Breakdowns: By Funding Source, By Functional Classification

    return (
        <Card>
            <CardHeader>
                <CardTitle>Analiză Venituri</CardTitle>
            </CardHeader>
            <CardContent>
                <p>CUI: {cui}</p>
                {/* Placeholder for Pie/Bar charts for proportions and Stacked Bar for trends */}
                <div>{/* Chart: Income by Funding Source (Latest) */}</div>
                <div>{/* Chart: Income by Functional Classification (Latest) */}</div>
                <div>{/* Chart: Income by Funding Source (Trend) */}</div>
                <p className="text-sm text-muted-foreground mt-2">
                    Secțiune Analiză Venituri în construcție.
                </p>
            </CardContent>
        </Card>
    );
} 