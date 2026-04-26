import Papa from "papaparse";
import { t } from "@lingui/core/macro";
import type {
  CampaignAdminEntityConfigListItem,
  CampaignAdminStagedEntityConfigDraft,
  CampaignAdminEntityConfigValues,
} from "@/features/campaigns/buget/admin/types";

export const CAMPAIGN_ADMIN_ENTITY_CONFIG_CLIPBOARD_HEADERS = [
  "entityCui",
  "entityName",
  "usersCount",
  "budgetPublicationDate",
  "officialBudgetUrl",
  "public_debate.date",
  "public_debate.time",
  "public_debate.location",
  "public_debate.online_participation_link",
  "public_debate.announcement_link",
  "public_debate.description",
  "updatedAt",
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
  readonly hasPublicDebateColumns: boolean;
};

export type CampaignAdminEntityConfigBulkClipboardParseResult = {
  readonly drafts: readonly CampaignAdminStagedEntityConfigDraft[];
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly issues: readonly CampaignAdminEntityConfigClipboardIssue[];
};

const HEADER_ALIASES = {
  entityCui: ["entity cui", "cui", "entity_cui", "entitycui"],
  entityName: ["entity name", "name", "entity_name", "entityname"],
  budgetPublicationDate: [
    "budget publication date",
    "publication date",
    "budget_publication_date",
    "budgetpublicationdate",
  ],
  officialBudgetUrl: [
    "official budget url",
    "budget url",
    "official_budget_url",
    "url",
    "officialbudgeturl",
  ],
  publicDebateDate: ["public_debate.date", "public debate date"],
  publicDebateTime: ["public_debate.time", "public debate time"],
  publicDebateLocation: ["public_debate.location", "public debate location"],
  publicDebateOnlineParticipationLink: [
    "public_debate.online_participation_link",
    "public debate online participation link",
  ],
  publicDebateAnnouncementLink: [
    "public_debate.announcement_link",
    "public debate announcement link",
  ],
  publicDebateDescription: [
    "public_debate.description",
    "public debate description",
  ],
  updatedAt: ["updated at", "updated_at", "updatedat"],
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

function isBooleanCell(value: string): boolean {
  return /^(true|false)$/i.test(value);
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
        String(item.usersCount),
        escapeTabularCell(
          stagedDraft?.values.budgetPublicationDate ?? item.values.budgetPublicationDate,
        ),
        escapeTabularCell(
          stagedDraft?.values.officialBudgetUrl ?? item.values.officialBudgetUrl,
        ),
        escapeTabularCell(
          stagedDraft?.values.public_debate?.date ?? item.values.public_debate?.date ?? null,
        ),
        escapeTabularCell(
          stagedDraft?.values.public_debate?.time ?? item.values.public_debate?.time ?? null,
        ),
        escapeTabularCell(
          stagedDraft?.values.public_debate?.location ??
            item.values.public_debate?.location ??
            null,
        ),
        escapeTabularCell(
          stagedDraft?.values.public_debate?.online_participation_link ??
            item.values.public_debate?.online_participation_link ??
            null,
        ),
        escapeTabularCell(
          stagedDraft?.values.public_debate?.announcement_link ??
            item.values.public_debate?.announcement_link ??
            null,
        ),
        escapeTabularCell(
          stagedDraft?.values.public_debate?.description ??
            item.values.public_debate?.description ??
            null,
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
      hasPublicDebateColumns: false,
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
  const publicDebateDateIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.publicDebateDate,
  );
  const publicDebateTimeIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.publicDebateTime,
  );
  const publicDebateLocationIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.publicDebateLocation,
  );
  const publicDebateOnlineParticipationLinkIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.publicDebateOnlineParticipationLink,
  );
  const publicDebateAnnouncementLinkIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.publicDebateAnnouncementLink,
  );
  const publicDebateDescriptionIndex = findHeaderIndex(
    headerCells,
    HEADER_ALIASES.publicDebateDescription,
  );
  const updatedAtIndex = findHeaderIndex(headerCells, HEADER_ALIASES.updatedAt);
  const hasPublicDebateColumns =
    publicDebateDateIndex !== -1 ||
    publicDebateTimeIndex !== -1 ||
    publicDebateLocationIndex !== -1 ||
    publicDebateOnlineParticipationLinkIndex !== -1 ||
    publicDebateAnnouncementLinkIndex !== -1 ||
    publicDebateDescriptionIndex !== -1;

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
      hasPublicDebateColumns,
    };
  }

  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const budgetPublicationDateCell =
      budgetPublicationDateIndex === -1
        ? ""
        : normalizeCell(row[budgetPublicationDateIndex]);
    const hasImplicitConfiguredColumn =
      budgetPublicationDateIndex !== -1 &&
      officialBudgetUrlIndex === budgetPublicationDateIndex + 1 &&
      isBooleanCell(budgetPublicationDateCell);
    const getConfigCell = (columnIndex: number): string =>
      columnIndex === -1
        ? ""
        : normalizeCell(row[columnIndex + (hasImplicitConfiguredColumn ? 1 : 0)]);
    const entityCui = normalizeCell(row[entityCuiIndex]);
    const entityName =
      entityNameIndex === -1 ? "" : normalizeCell(row[entityNameIndex]);
    const budgetPublicationDate = getConfigCell(budgetPublicationDateIndex);
    const officialBudgetUrl = getConfigCell(officialBudgetUrlIndex);
    const publicDebateDate = getConfigCell(publicDebateDateIndex);
    const publicDebateTime = getConfigCell(publicDebateTimeIndex);
    const publicDebateLocation = getConfigCell(publicDebateLocationIndex);
    const publicDebateOnlineParticipationLink =
      getConfigCell(publicDebateOnlineParticipationLinkIndex);
    const publicDebateAnnouncementLink =
      getConfigCell(publicDebateAnnouncementLinkIndex);
    const publicDebateDescription = getConfigCell(publicDebateDescriptionIndex);
    const updatedAt = getConfigCell(updatedAtIndex);
    const hasAnyPublicDebateValue =
      publicDebateDate !== "" ||
      publicDebateTime !== "" ||
      publicDebateLocation !== "" ||
      publicDebateOnlineParticipationLink !== "" ||
      publicDebateAnnouncementLink !== "" ||
      publicDebateDescription !== "";

    if (
      entityCui === "" &&
      budgetPublicationDate === "" &&
      officialBudgetUrl === "" &&
      !hasAnyPublicDebateValue &&
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

    if (hasAnyPublicDebateValue && !isValidDateInput(publicDebateDate)) {
      issues.push({ rowNumber, message: "Invalid public debate date." });
      skippedCount += 1;
      return;
    }

    if (
      hasAnyPublicDebateValue &&
      !/^([01]\d|2[0-3]):([0-5]\d)$/.test(publicDebateTime)
    ) {
      issues.push({ rowNumber, message: "Invalid public debate time." });
      skippedCount += 1;
      return;
    }

    if (hasAnyPublicDebateValue && publicDebateLocation === "") {
      issues.push({ rowNumber, message: "Missing public debate location." });
      skippedCount += 1;
      return;
    }

    if (
      hasAnyPublicDebateValue &&
      !isValidHttpUrl(publicDebateAnnouncementLink)
    ) {
      issues.push({
        rowNumber,
        message:
          "Invalid public debate announcement link. Use an absolute http(s) URL.",
      });
      skippedCount += 1;
      return;
    }

    if (
      publicDebateOnlineParticipationLink !== "" &&
      !isValidHttpUrl(publicDebateOnlineParticipationLink)
    ) {
      issues.push({
        rowNumber,
        message:
          "Invalid public debate online participation link. Use an absolute http(s) URL.",
      });
      skippedCount += 1;
      return;
    }

    if (
      budgetPublicationDate === "" &&
      officialBudgetUrl === "" &&
      !hasAnyPublicDebateValue
    ) {
      if (
        hasImplicitConfiguredColumn &&
        budgetPublicationDateCell.toLowerCase() === "false"
      ) {
        skippedCount += 1;
        return;
      }

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
        public_debate: hasAnyPublicDebateValue
          ? {
              date: publicDebateDate,
              time: publicDebateTime,
              location: publicDebateLocation,
              announcement_link: publicDebateAnnouncementLink,
              ...(publicDebateOnlineParticipationLink !== ""
                ? {
                    online_participation_link:
                      publicDebateOnlineParticipationLink,
                  }
                : {}),
              ...(publicDebateDescription !== ""
                ? { description: publicDebateDescription }
                : {}),
            }
          : null,
      },
      expectedUpdatedAt: updatedAt || undefined,
    });
  });

  return {
    rows: importedRows,
    importedCount: importedRows.length,
    skippedCount,
    issues,
    hasPublicDebateColumns,
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
    findHeaderIndex(headers, HEADER_ALIASES.officialBudgetUrl) >= 0 ||
    findHeaderIndex(headers, HEADER_ALIASES.publicDebateDate) >= 0 ||
    findHeaderIndex(headers, HEADER_ALIASES.publicDebateAnnouncementLink) >= 0;

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
      values: {
        ...row.values,
        public_debate: parsed.hasPublicDebateColumns
          ? row.values.public_debate
          : item.values.public_debate,
      },
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
