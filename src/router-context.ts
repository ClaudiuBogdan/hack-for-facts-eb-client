import type { QueryClient } from "@tanstack/react-query";
import type { ResolvedTheme } from "@/components/theme/theme-provider";
import type { Currency } from "@/schemas/charts";

export type RouterContext = {
  queryClient: QueryClient;
  /** Theme resolved during SSR from cookie, used to prevent FOUC */
  ssrTheme?: ResolvedTheme;
  /** Currency resolved during SSR from cookie, used for hydration-safe global controls */
  ssrCurrency?: Currency;
  /** Inflation preference resolved during SSR from cookie, used for hydration-safe global controls */
  ssrInflationAdjusted?: boolean;
};
