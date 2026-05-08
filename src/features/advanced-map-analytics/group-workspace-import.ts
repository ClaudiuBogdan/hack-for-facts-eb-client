import Papa from 'papaparse';
import { t } from '@lingui/core/macro';
import type { MapGroup } from '@/schemas/advanced-map-analytics';
import { generateHash } from '@/lib/utils';

export type GroupWorkspaceImportFormat = 'row-per-uat' | 'simulation-cluster' | 'unknown';

export interface GroupWorkspaceImportReferenceUat {
  sirutaCode: string;
  name?: string;
}

export interface GroupWorkspaceImportIssue {
  severity: 'error' | 'warning';
  rowNumber?: number;
  message: string;
}

export interface ParsedGroupWorkspaceImport {
  format: GroupWorkspaceImportFormat;
  groups: MapGroup[];
  issues: GroupWorkspaceImportIssue[];
  groupCount: number;
  assignedUatCount: number;
  hasErrors: boolean;
}

const ROW_FORMAT_HEADERS = {
  sirutaCode: ['siruta_code', 'siruta', 'natcode'],
  group: ['group', 'group_id', 'group_key'],
  label: ['group_label', 'label'],
  primary: ['primary', 'is_primary'],
  order: ['order', 'member_order'],
} as const;

const SIMULATION_FORMAT_HEADERS = {
  clusterId: ['cluster_id'],
  anchorUatId: ['anchor_uat_id'],
  anchorName: ['anchor_name'],
  mergedUatIds: ['merged_uat_ids'],
} as const;

type HeaderAlias = readonly string[];

interface ParsedCsvRows {
  rows: Array<Record<string, string>>;
  fields: string[];
  issues: GroupWorkspaceImportIssue[];
}

interface RowGroupAccumulator {
  key: string;
  label: string;
  rows: Array<{
    sirutaCode: string;
    rowNumber: number;
    order: number | undefined;
    fileIndex: number;
  }>;
  primarySirutaCode?: string;
}

function normalizeHeaderCell(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCell(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizeGroupIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findHeader(fields: string[], aliases: HeaderAlias): string | undefined {
  return fields.find((field) => aliases.includes(normalizeHeaderCell(field)));
}

function readCell(row: Record<string, string>, header: string | undefined): string {
  return header ? normalizeCell(row[header]) : '';
}

function parseCsvRows(rawText: string): ParsedCsvRows {
  const issues: GroupWorkspaceImportIssue[] = [];
  const parsed = Papa.parse<Record<string, string>>(rawText, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  for (const error of parsed.errors) {
    issues.push({
      severity: 'error',
      rowNumber: typeof error.row === 'number' ? error.row + 2 : undefined,
      message: t`CSV parse error: ${error.message}`,
    });
  }

  return {
    rows: parsed.data,
    fields: parsed.meta.fields ?? [],
    issues,
  };
}

function buildReferenceNameBySiruta(
  references: readonly GroupWorkspaceImportReferenceUat[]
): Map<string, string | undefined> {
  const referenceNameBySiruta = new Map<string, string | undefined>();
  for (const reference of references) {
    const sirutaCode = reference.sirutaCode.trim();
    if (!sirutaCode) {
      continue;
    }
    referenceNameBySiruta.set(sirutaCode, reference.name?.trim() || undefined);
  }
  return referenceNameBySiruta;
}

function createUniqueGroupId(baseId: string, usedIds: Set<string>): string {
  const normalizedBaseId = baseId.trim().length > 0 ? baseId.trim() : 'group';
  let candidate = normalizedBaseId;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${normalizedBaseId}_${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function createRowFormatGroupId(groupKey: string, usedIds: Set<string>): string {
  return createUniqueGroupId(`grp_${generateHash(groupKey)}`, usedIds);
}

function sanitizeIdPart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : generateHash(value);
}

function parsePrimaryFlag(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function parseOrderValue(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitSimulationMembers(value: string): string[] {
  return value
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function finalizeParsedResult(
  format: GroupWorkspaceImportFormat,
  groups: MapGroup[],
  issues: GroupWorkspaceImportIssue[]
): ParsedGroupWorkspaceImport {
  if (groups.length === 0) {
    issues.push({
      severity: 'error',
      message: t`No importable groups found.`,
    });
  }

  const assignedUatCount = new Set(groups.flatMap((group) => group.memberSirutaCodes)).size;
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    format,
    groups,
    issues,
    groupCount: groups.length,
    assignedUatCount,
    hasErrors,
  };
}

function parseRowPerUatImport(params: {
  rows: Array<Record<string, string>>;
  fields: string[];
  initialIssues: GroupWorkspaceImportIssue[];
  referenceNameBySiruta: Map<string, string | undefined>;
}): ParsedGroupWorkspaceImport {
  const issues = [...params.initialIssues];
  const sirutaHeader = findHeader(params.fields, ROW_FORMAT_HEADERS.sirutaCode);
  const groupHeader = findHeader(params.fields, ROW_FORMAT_HEADERS.group);
  const labelHeader = findHeader(params.fields, ROW_FORMAT_HEADERS.label);
  const primaryHeader = findHeader(params.fields, ROW_FORMAT_HEADERS.primary);
  const orderHeader = findHeader(params.fields, ROW_FORMAT_HEADERS.order);

  if (!sirutaHeader || !groupHeader) {
    return finalizeParsedResult('unknown', [], [
      ...issues,
      {
        severity: 'error',
        message: t`Missing required siruta_code and group CSV headers.`,
      },
    ]);
  }

  const groupsByKey = new Map<string, RowGroupAccumulator>();
  const sirutaOwnerByCode = new Map<string, string>();

  params.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const sirutaCode = readCell(row, sirutaHeader);
    const groupKeyRaw = readCell(row, groupHeader);
    const groupKey = normalizeGroupIdentity(groupKeyRaw);
    const label = readCell(row, labelHeader) || groupKeyRaw;

    if (!sirutaCode || !groupKey) {
      issues.push({
        severity: 'warning',
        rowNumber,
        message: t`Skipped row with missing SIRUTA or group.`,
      });
      return;
    }

    if (!params.referenceNameBySiruta.has(sirutaCode)) {
      issues.push({
        severity: 'error',
        rowNumber,
        message: t`Unknown SIRUTA code ${sirutaCode}.`,
      });
      return;
    }

    const ownerGroupKey = sirutaOwnerByCode.get(sirutaCode);
    if (ownerGroupKey && ownerGroupKey !== groupKey) {
      issues.push({
        severity: 'error',
        rowNumber,
        message: t`SIRUTA ${sirutaCode} is assigned to multiple groups.`,
      });
      return;
    }

    const existingGroup = groupsByKey.get(groupKey);
    const group = existingGroup ?? {
      key: groupKey,
      label: label || groupKey,
      rows: [],
    };

    if (existingGroup && label && existingGroup.label !== label) {
      issues.push({
        severity: 'warning',
        rowNumber,
        message: t`Ignored conflicting label for group ${existingGroup.label}.`,
      });
    }

    if (group.rows.some((entry) => entry.sirutaCode === sirutaCode)) {
      issues.push({
        severity: 'warning',
        rowNumber,
        message: t`Ignored duplicate SIRUTA ${sirutaCode} inside group ${group.label}.`,
      });
      return;
    }

    sirutaOwnerByCode.set(sirutaCode, groupKey);
    group.rows.push({
      sirutaCode,
      rowNumber,
      order: parseOrderValue(readCell(row, orderHeader)),
      fileIndex: index,
    });

    if (parsePrimaryFlag(readCell(row, primaryHeader))) {
      if (group.primarySirutaCode && group.primarySirutaCode !== sirutaCode) {
        issues.push({
          severity: 'warning',
          rowNumber,
          message: t`Ignored extra primary UAT for group ${group.label}.`,
        });
      } else {
        group.primarySirutaCode = sirutaCode;
      }
    }

    groupsByKey.set(groupKey, group);
  });

  const usedGroupIds = new Set<string>();
  const groups = Array.from(groupsByKey.values()).map((group) => {
    const orderedRows = [...group.rows].sort((left, right) => {
      if (left.order !== undefined && right.order !== undefined) {
        return left.order - right.order || left.fileIndex - right.fileIndex;
      }
      if (left.order !== undefined) {
        return -1;
      }
      if (right.order !== undefined) {
        return 1;
      }
      return left.fileIndex - right.fileIndex;
    });
    const memberOrder = orderedRows.map((entry) => entry.sirutaCode);
    return {
      id: createRowFormatGroupId(group.key, usedGroupIds),
      label: group.label,
      primarySirutaCode: group.primarySirutaCode ?? memberOrder[0],
      memberSirutaCodes: memberOrder,
      memberOrder,
    };
  });

  return finalizeParsedResult('row-per-uat', groups, issues);
}

function parseSimulationImport(params: {
  rows: Array<Record<string, string>>;
  fields: string[];
  initialIssues: GroupWorkspaceImportIssue[];
  referenceNameBySiruta: Map<string, string | undefined>;
}): ParsedGroupWorkspaceImport {
  const issues = [...params.initialIssues];
  const clusterIdHeader = findHeader(params.fields, SIMULATION_FORMAT_HEADERS.clusterId);
  const anchorHeader = findHeader(params.fields, SIMULATION_FORMAT_HEADERS.anchorUatId);
  const anchorNameHeader = findHeader(params.fields, SIMULATION_FORMAT_HEADERS.anchorName);
  const membersHeader = findHeader(params.fields, SIMULATION_FORMAT_HEADERS.mergedUatIds);

  if (!clusterIdHeader || !anchorHeader || !membersHeader) {
    return finalizeParsedResult('unknown', [], [
      ...issues,
      {
        severity: 'error',
        message: t`Missing required cluster_id, anchor_uat_id, or merged_uat_ids CSV headers.`,
      },
    ]);
  }

  const usedGroupIds = new Set<string>();
  const sirutaOwnerByCode = new Map<string, string>();
  const groups: MapGroup[] = [];

  params.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const clusterId = readCell(row, clusterIdHeader);
    const anchorSirutaCode = readCell(row, anchorHeader);
    const importedAnchorName = readCell(row, anchorNameHeader);
    const rawMembers = splitSimulationMembers(readCell(row, membersHeader));
    const memberSirutaCodes: string[] = [];
    const seenMembers = new Set<string>();

    for (const sirutaCode of rawMembers) {
      if (seenMembers.has(sirutaCode)) {
        issues.push({
          severity: 'warning',
          rowNumber,
          message: t`Ignored duplicate SIRUTA ${sirutaCode} inside cluster ${clusterId || rowNumber}.`,
        });
        continue;
      }
      seenMembers.add(sirutaCode);

      if (!params.referenceNameBySiruta.has(sirutaCode)) {
        issues.push({
          severity: 'error',
          rowNumber,
          message: t`Unknown SIRUTA code ${sirutaCode}.`,
        });
        continue;
      }

      const ownerGroupId = sirutaOwnerByCode.get(sirutaCode);
      if (ownerGroupId && ownerGroupId !== clusterId) {
        issues.push({
          severity: 'error',
          rowNumber,
          message: t`SIRUTA ${sirutaCode} is assigned to multiple clusters.`,
        });
        continue;
      }

      sirutaOwnerByCode.set(sirutaCode, clusterId);
      memberSirutaCodes.push(sirutaCode);
    }

    if (memberSirutaCodes.length === 0) {
      issues.push({
        severity: 'warning',
        rowNumber,
        message: t`Skipped empty cluster ${clusterId || rowNumber}.`,
      });
      return;
    }

    if (anchorSirutaCode && !memberSirutaCodes.includes(anchorSirutaCode)) {
      issues.push({
        severity: 'error',
        rowNumber,
        message: t`Anchor SIRUTA ${anchorSirutaCode} is not included in merged_uat_ids.`,
      });
    }

    const primarySirutaCode = memberSirutaCodes.includes(anchorSirutaCode)
      ? anchorSirutaCode
      : memberSirutaCodes[0];
    const memberOrder = primarySirutaCode
      ? [
          primarySirutaCode,
          ...memberSirutaCodes.filter((sirutaCode) => sirutaCode !== primarySirutaCode),
        ]
      : memberSirutaCodes;
    const label = primarySirutaCode
      ? params.referenceNameBySiruta.get(primarySirutaCode) ?? importedAnchorName
      : importedAnchorName;
    const baseGroupId = `cluster_${sanitizeIdPart(clusterId || String(rowNumber))}`;

    groups.push({
      id: createUniqueGroupId(baseGroupId, usedGroupIds),
      label: label || baseGroupId,
      primarySirutaCode,
      memberSirutaCodes,
      memberOrder,
    });
  });

  return finalizeParsedResult('simulation-cluster', groups, issues);
}

export function parseGroupWorkspaceCsvImport(
  rawText: string,
  references: readonly GroupWorkspaceImportReferenceUat[]
): ParsedGroupWorkspaceImport {
  if (rawText.trim().length === 0) {
    return finalizeParsedResult('unknown', [], [
      {
        severity: 'error',
        message: t`Paste or upload a CSV file first.`,
      },
    ]);
  }

  const referenceNameBySiruta = buildReferenceNameBySiruta(references);
  const parsedCsv = parseCsvRows(rawText);
  const normalizedFields = parsedCsv.fields.map((field) => normalizeHeaderCell(field));
  const hasSimulationHeaders =
    SIMULATION_FORMAT_HEADERS.clusterId.some((header) => normalizedFields.includes(header)) &&
    SIMULATION_FORMAT_HEADERS.anchorUatId.some((header) => normalizedFields.includes(header)) &&
    SIMULATION_FORMAT_HEADERS.mergedUatIds.some((header) => normalizedFields.includes(header));

  if (hasSimulationHeaders) {
    return parseSimulationImport({
      rows: parsedCsv.rows,
      fields: parsedCsv.fields,
      initialIssues: parsedCsv.issues,
      referenceNameBySiruta,
    });
  }

  return parseRowPerUatImport({
    rows: parsedCsv.rows,
    fields: parsedCsv.fields,
    initialIssues: parsedCsv.issues,
    referenceNameBySiruta,
  });
}
