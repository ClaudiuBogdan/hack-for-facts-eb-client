import { insPeriodicityRawSchema } from "./statistics-raw-schemas";
import type { InsDataset } from "@/schemas/ins";
import { fetchInsDatasetPage } from "./statistics-fetchers";
/** Complete metadata only; fail on inconsistent pagination, never silently truncate the explorer. */
export async function fetchEntityInsCatalog(
  level: "county" | "uat",
  signal?: AbortSignal,
): Promise<InsDataset[]> {
  const rows: InsDataset[] = [];
  const seen = new Set<string>();
  let total: number | undefined;
  while (true) {
    const page = await fetchInsDatasetPage({
      filter: {
        dataStatus: ["AVAILABLE"],
        ...(level === "county"
          ? { hasCountyData: true }
          : { hasUatData: true }),
      },
      limit: 200,
      offset: rows.length,
      signal,
    });
    if (total !== undefined && total !== page.totalCount)
      throw new Error("INS catalog changed while paging");
    total = page.totalCount;
    for (const item of page.datasets) {
      if (seen.has(item.code))
        throw new Error("Duplicate INS catalog identity");
      seen.add(item.code);
      rows.push({
        id: item.code,
        code: item.code,
        name_ro: item.nameRo,
        name_en: item.nameEn,
        periodicity: item.periodicity.map((value) =>
          insPeriodicityRawSchema.parse(value),
        ),
        year_range: item.yearRange ? [...item.yearRange] : null,
        has_uat_data: item.hasUatData,
        has_county_data: item.hasCountyData,
        has_siruta: item.hasSiruta,
        context_name_ro: item.contextNameRo,
        context_path: item.contextPath,
        data_status:
          item.dataStatus === "available" ? "AVAILABLE" : "CATALOG_ONLY",
      });
    }
    if (
      rows.length > 5000 ||
      rows.length > total ||
      page.hasNextPage !== rows.length < total ||
      (page.hasNextPage && page.datasets.length === 0)
    )
      throw new Error("Incomplete INS catalog pagination");
    if (!page.hasNextPage) return rows;
  }
}
