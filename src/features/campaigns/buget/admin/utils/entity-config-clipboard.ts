import Papa from "papaparse";
import { t } from "@lingui/core/macro";
import type {
  CampaignAdminEntityConfigListItem,
  CampaignAdminStagedEntityConfigDraft,
  CampaignAdminEntityConfigValues,
} from "@/features/campaigns/buget/admin/types";

export const CAMPAIGN_ADMIN_ENTITY_CONFIG_CLIPBOARD_HEADERS = [
  "Entity CUI",
  "Entity Name",
  "Budget Publication Date",
  "Official Budget URL",
  "Updated At",
] as const;

export type CampaignAdminEntityConfigClipboardIssue = {
  readonly rowNumber: number;
  readonly message: string;
};

export type CampaignAdminEntityConfigClipboardRow = {
  readonly rowNumber?: number;
  readonly entityCui: string;
  readonly entityName: string | null;
  readonly values: CampaignAdminEntityConfigValues;
  readonly expectedUpdatedAt?: string | null;
};

export type CampaignAdminEntityConfigClipboardParseResult = {
  readonly rows: readonly CampaignAdminEntityConfigClipboardRow[];
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly issues: readonly CampaignAdminEntityConfigClipboardIssue[];
};

export type CampaignAdminEntityConfigBulkClipboardParseResult = {
  readonly drafts: readonly CampaignAdminStagedEntityConfigDraft[];
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly issues: readonly CampaignAdminEntityConfigClipboardIssue[];
};

const HEADER_ALIASES = {
  entityCui: ["entity cui", "cui", "entity_cui"],
  entityName: ["entity name", "name", "entity_name"],
  budgetPublicationDate: [
    "budget publication date",
    "publication date",
    "budget_publication_date",
  ],
  officialBudgetUrl: [
    "official budget url",
    "budget url",
    "official_budget_url",
    "url",
  ],
  updatedAt: ["updated at", "updated_at"],
} as const;

function normalizeHeaderCell(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCell(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function escapeTabularCell(value: string | null): string {
  const normalizedValue = (value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\t/g, " ")
    .trim();

  if (/^[=+\-@]/.test(normalizedValue)) {
    return `'${normalizedValue}`;
  }

  return normalizedValue;
}

function findHeaderIndex(
  headers: readonly string[],
  aliases: readonly string[],
): number {
  const normalizedAliases = new Set(aliases.map((alias) => normalizeHeaderCell(alias)));

  return headers.findIndex((header) => normalizedAliases.has(header));
}

function isValidDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function serializeCampaignAdminEntityConfigRowsToClipboardTsv(
  items: readonly CampaignAdminEntityConfigListItem[],
  stagedDraftsByEntityCui?: Readonly<
    Record<string, CampaignAdminStagedEntityConfigDraft>
  >,
): string {
  const lines = [CAMPAIGN_ADMIN_ENTITY_CONFIG_CLIPBOARD_HEADERS.join("\t")];

  for (const item of items) {
    const stagedDraft = stagedDraftsByEntityCui?.[item.entityCui];

    lines.push(
      [
        escapeTabularCell(item.entityCui),
        escapeTabularCell(item.entityName),
        escapeTabularCell(
          stagedDraft?.values.budgetPublicationDate ?? item.values.budgetPublicationDate,
        ),
        escapeTabularCell(
          stagedDraft?.values.officialBudgetUrl ?? item.values.officialBudgetUrl,
        ),
        escapeTabularCell(stagedDraft?.expectedUpdatedAt ?? item.updatedAt),
      ].join("\t"),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function parseCampaignAdminEntityConfigClipboard(
  rawText: string,
): CampaignAdminEntityConfigClipboardParseResult {
  const parsed = Papa.parse<string[]>(rawText, {
    skipEmptyLines: true,
  });
  const rows = parsed.data;
  if (rows.length === 0) {
    return {
      rows: [],
      importedCount: 0,
      skippedCount: 0,
      issues: [],
    };
  }

  const headerCells = (rows[0] ?? []).map((cell) => normalizeHeaderCell(cell));
  const entityCuiIndex = findHeaderIndex(headerCells, HEADER_ALIASES.entityCui);
  const entityNameIndex = findHeaderIndex(headerCells, HEADER_ALIASES.entityName);
  const budgetPublicationDateIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.budgetPublicationDate,
  );
  const officialBudgetUrlIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.officialBudgetUrl,
  );
  const updatedAtIndex = findHeaderIndex(headerCells, HEADER_ALIASES.updatedAt);

  const issues: CampaignAdminEntityConfigClipboardIssue[] = [];
  const importedRows: CampaignAdminEntityConfigClipboardRow[] = [];
  const seenEntityCuis = new Set<string>();
  let skippedCount = 0;

  if (entityCuiIndex === -1) {
    return {
      rows: [],
      importedCount: 0,
      skippedCount: Math.max(0, rows.length - 1),
      issues: [
        {
          rowNumber: 1,
          message: "Missing Entity CUI header.",
        },
      ],
    };
  }

  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const entityCui = normalizeCell(row[entityCuiIndex]);
    const entityName =
      entityNameIndex === -1 ? "" : normalizeCell(row[entityNameIndex]);
    const budgetPublicationDate =
      budgetPublicationDateIndex === -1
        ? ""
        : normalizeCell(row[budgetPublicationDateIndex]);
    const officialBudgetUrl =
      officialBudgetUrlIndex === -1
        ? ""
        : normalizeCell(row[officialBudgetUrlIndex]);
    const updatedAt =
      updatedAtIndex === -1 ? "" : normalizeCell(row[updatedAtIndex]);

    if (
      entityCui === "" &&
      budgetPublicationDate === "" &&
      officialBudgetUrl === "" &&
      updatedAt === ""
    ) {
      skippedCount += 1;
      return;
    }

    if (entityCui === "") {
      issues.push({ rowNumber, message: "Missing entity CUI." });
      skippedCount += 1;
      return;
    }

    if (seenEntityCuis.has(entityCui)) {
      issues.push({ rowNumber, message: "Duplicate entity CUI row." });
      skippedCount += 1;
      return;
    }

    if (budgetPublicationDate !== "" && !isValidDateInput(budgetPublicationDate)) {
      issues.push({ rowNumber, message: "Invalid budget publication date." });
      skippedCount += 1;
      return;
    }

    if (officialBudgetUrl !== "" && !isValidHttpUrl(officialBudgetUrl)) {
      issues.push({
        rowNumber,
        message: "Invalid official budget URL. Use an absolute http(s) URL.",
      });
      skippedCount += 1;
      return;
    }

    if (budgetPublicationDate === "" && officialBudgetUrl === "") {
      issues.push({
        rowNumber,
        message: "At least one config value is required.",
      });
      skippedCount += 1;
      return;
    }

    if (updatedAt !== "" && Number.isNaN(new Date(updatedAt).getTime())) {
      issues.push({ rowNumber, message: "Invalid updated-at value." });
      skippedCount += 1;
      return;
    }

    seenEntityCuis.add(entityCui);
    importedRows.push({
      rowNumber,
      entityCui,
      entityName: entityName || null,
      values: {
        budgetPublicationDate: budgetPublicationDate || null,
        officialBudgetUrl: officialBudgetUrl || null,
      },
      expectedUpdatedAt: updatedAt || undefined,
    });
  });

  return {
    rows: importedRows,
    importedCount: importedRows.length,
    skippedCount,
    issues,
  };
}

export function looksLikeCampaignAdminEntityConfigClipboardText(
  rawText: string,
): boolean {
  const parsed = Papa.parse<string[]>(rawText, {
    preview: 1,
    skipEmptyLines: "greedy",
    delimitersToGuess: ["\t", ",", ";"],
  });
  const headerRow = parsed.data.find((cells) => Array.isArray(cells));
  if (!Array.isArray(headerRow) || headerRow.length === 0) {
    return false;
  }

  const headers = headerRow.map((cell) => normalizeHeaderCell(cell));
  const hasEntityCuiColumn = findHeaderIndex(headers, HEADER_ALIASES.entityCui) >= 0;
  const hasConfigValueColumn =
    findHeaderIndex(headers, HEADER_ALIASES.budgetPublicationDate) >= 0 ||
    findHeaderIndex(headers, HEADER_ALIASES.officialBudgetUrl) >= 0;

  return hasEntityCuiColumn && hasConfigValueColumn;
}

export function parseCampaignAdminEntityConfigClipboardText(input: {
  readonly rawText: string;
  readonly items: readonly CampaignAdminEntityConfigListItem[];
}): CampaignAdminEntityConfigBulkClipboardParseResult {
  const parsed = parseCampaignAdminEntityConfigClipboard(input.rawText);
  const itemsByEntityCui = new Map(
    input.items.map((item) => [item.entityCui, item] as const),
  );
  const issues = [...parsed.issues];
  const drafts: CampaignAdminStagedEntityConfigDraft[] = [];
  let skippedCount = parsed.skippedCount;

  for (const row of parsed.rows) {
    const item = itemsByEntityCui.get(row.entityCui);
    if (item === undefined) {
      issues.push({
        rowNumber: row.rowNumber ?? 1,
        message: t`Unknown selected entity CUI: ${row.entityCui}`,
      });
      skippedCount += 1;
      continue;
    }

    drafts.push({
      entityCui: row.entityCui,
      entityName: item.entityName ?? row.entityName ?? null,
      values: row.values,
      expectedUpdatedAt: row.expectedUpdatedAt ?? item.updatedAt ?? null,
    });
  }

  return {
    drafts,
    importedCount: drafts.length,
    skippedCount,
    issues,
  };
}
