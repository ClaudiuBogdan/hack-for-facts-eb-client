import { z } from "zod";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import { nativeCommitmentReportType } from "./commitment-periods";
const amount = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/)
  .nullable();
export const commitmentDashboardSchema = z.object({
  rows: z.array(
    z.object({
      year: z.number().int(),
      period: z.number().int(),
      functionalCode: z.string(),
      economicCode: z.string().nullable(),
      firstReportMonth: z.number().int().min(1).max(12).nullable(),
      lastReportMonth: z.number().int().min(1).max(12).nullable(),
      budget: amount,
      authority: amount,
      committed: amount,
      paidTreasury: amount,
      paidNonTreasury: amount,
    }),
  ),
  unavailableYears: z.array(z.number().int()),
});
export type CommitmentDashboard = z.infer<typeof commitmentDashboardSchema>;
export type CommitmentDashboardRow = CommitmentDashboard["rows"][number];
export interface CommitmentDashboardQuery {
  cui: string;
  mainCreditorCui?: string;
  detailYear: number;
  yearFrom: number;
  yearTo: number;
  reportType: string;
  frequency: "YEAR" | "MONTH" | "QUARTER";
  normalization: string;
  currency: "RON" | "EUR" | "USD";
  inflationAdjusted: boolean;
}
export async function fetchCommitmentDashboard(
  input: CommitmentDashboardQuery,
  signal?: AbortSignal,
): Promise<CommitmentDashboard> {
  const result = await graphqlQuery<{ budgetCommitmentDashboard: unknown }>(
    `
    query EntityCommitmentDashboard($cui:CUI!, $mainCreditorCui:CUI, $detailYear:Int!, $yearFrom:Int!, $yearTo:Int!, $reportType:BudgetCommitmentReportType!, $frequency:BudgetFrequency!, $normalization:BudgetNormalization!, $currency:BudgetCurrency, $inflationAdjusted:Boolean) {
      budgetCommitmentDashboard(cui:$cui,mainCreditorCui:$mainCreditorCui,detailYear:$detailYear,yearFrom:$yearFrom,yearTo:$yearTo,reportType:$reportType,frequency:$frequency,normalization:$normalization,currency:$currency,inflationAdjusted:$inflationAdjusted) {
        unavailableYears rows {year period functionalCode economicCode firstReportMonth lastReportMonth budget authority committed paidTreasury paidNonTreasury}
      }
    }`,
    { ...input, reportType: nativeCommitmentReportType(input.reportType) },
    { signal, auth: "none" },
  );
  return commitmentDashboardSchema.parse(result.budgetCommitmentDashboard);
}
