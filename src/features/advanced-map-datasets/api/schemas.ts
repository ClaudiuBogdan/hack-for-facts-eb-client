import { z } from 'zod';

export const AdvancedMapDatasetVisibilitySchema = z.enum(['private', 'unlisted', 'public']);
export type AdvancedMapDatasetVisibility = z.infer<typeof AdvancedMapDatasetVisibilitySchema>;
export const AdvancedMapDatasetJsonItemTypeSchema = z.enum(['text', 'link', 'markdown']);
export type AdvancedMapDatasetJsonItemType = z.infer<typeof AdvancedMapDatasetJsonItemTypeSchema>;

export const AdvancedMapDatasetJsonTextItemSchema = z.object({
  type: z.literal('text'),
  value: z.object({
    text: z.string().min(1),
  }),
});

export const AdvancedMapDatasetJsonLinkItemSchema = z.object({
  type: z.literal('link'),
  value: z.object({
    url: z.string().url(),
    label: z.string().nullable(),
  }),
});

export const AdvancedMapDatasetJsonMarkdownItemSchema = z.object({
  type: z.literal('markdown'),
  value: z.object({
    markdown: z.string().min(1),
  }),
});

export const AdvancedMapDatasetJsonItemSchema = z.discriminatedUnion('type', [
  AdvancedMapDatasetJsonTextItemSchema,
  AdvancedMapDatasetJsonLinkItemSchema,
  AdvancedMapDatasetJsonMarkdownItemSchema,
]);
export type AdvancedMapDatasetJsonItem = z.infer<typeof AdvancedMapDatasetJsonItemSchema>;

const ApiEnvelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

const IsoDateStringSchema = z.string().min(1);

const PageInfoSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

const UatDirectoryNodeSchema = z.object({
  id: z.string().min(1),
  uat_code: z.string().min(1),
  siruta_code: z.string().min(1),
  name: z.string().min(1),
  county_name: z.string().min(1),
});

export const AdvancedMapDatasetUatDirectoryResponseSchema = z.object({
  uats: z.object({
    nodes: z.array(UatDirectoryNodeSchema),
    pageInfo: PageInfoSchema,
  }),
});

export interface AdvancedMapDatasetSummary {
  id: string;
  userId: string;
  publicId: string | null;
  title: string;
  description: string | null;
  markdown: string | null;
  markdownText: string | null;
  unit: string | null;
  visibility: AdvancedMapDatasetVisibility;
  rowCount: number;
  referenceCount: number;
  replacedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvancedMapDatasetDetail extends AdvancedMapDatasetSummary {
  rows: AdvancedMapDatasetRow[];
}

export interface AdvancedMapDatasetRow {
  sirutaCode: string;
  valueNumber: string | null;
  valueJson: AdvancedMapDatasetJsonItem | null;
  reference?: Record<string, unknown> | null;
}

export interface AdvancedMapDatasetConnection {
  nodes: AdvancedMapDatasetSummary[];
  pageInfo: {
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AdvancedMapDatasetUatDirectoryNode {
  id: string;
  uatCode: string;
  sirutaCode: string;
  name: string;
  countyName: string;
}

export interface AdvancedMapDatasetUatDirectory {
  nodes: AdvancedMapDatasetUatDirectoryNode[];
  pageInfo: {
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  byUatId: ReadonlyMap<
    string,
    {
      readonly uatCode: string;
      readonly sirutaCode: string;
      readonly name: string;
      readonly countyName: string;
    }
  >;
  byUatCode: ReadonlyMap<
    string,
    {
      readonly id: string;
      readonly sirutaCode: string;
      readonly name: string;
      readonly countyName: string;
    }
  >;
  bySirutaCode: ReadonlyMap<
    string,
    {
      readonly id: string;
      readonly uatCode: string;
      readonly name: string;
      readonly countyName: string;
    }
  >;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readOptionalStringAliases(record: Record<string, unknown>, aliases: readonly string[]): string | undefined {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function readStringAliases(record: Record<string, unknown>, aliases: readonly string[], fallback = ''): string {
  return readOptionalStringAliases(record, aliases) ?? fallback;
}

function readNullableStringAliases(record: Record<string, unknown>, aliases: readonly string[]): string | null {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'string') {
      return value;
    }

    if (value === null) {
      return null;
    }
  }

  return null;
}

function readNumberAliases(record: Record<string, unknown>, aliases: readonly string[], fallback = 0): number {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, Math.trunc(parsed));
      }
    }
  }

  return fallback;
}

function readBooleanAliases(record: Record<string, unknown>, aliases: readonly string[], fallback = false): boolean {
  for (const alias of aliases) {
    const value = record[alias];
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }
    }
  }

  return fallback;
}

function normalizeVisibility(
  value: unknown,
  fallback: AdvancedMapDatasetVisibility = 'private'
): AdvancedMapDatasetVisibility {
  if (value === 'private' || value === 'unlisted' || value === 'public') {
    return value;
  }

  return fallback;
}

function normalizeDatasetSummaryRecord(
  raw: unknown,
  options: {
    fallbackVisibility?: AdvancedMapDatasetVisibility;
  } = {}
): AdvancedMapDatasetSummary {
  const record = readRecord(raw);
  const publicId = readStringAliases(record, ['publicId', 'public_id']);
  const id = readStringAliases(record, ['id']);
  const title = readStringAliases(record, ['title'], 'Untitled dataset');
  const markdown = readNullableStringAliases(record, ['markdown']);
  const rowCount = readNumberAliases(record, ['rowCount', 'row_count']);
  const referenceCount = readNumberAliases(record, ['referenceCount', 'reference_count']);
  const createdAt = readStringAliases(record, ['createdAt', 'created_at'], new Date().toISOString());
  const updatedAt = readStringAliases(record, ['updatedAt', 'updated_at'], new Date().toISOString());

  // See docs/specs/specs-202604092015-custom-map-data-series-editor.md:
  // public flows are keyed by publicId, but the client still needs a stable local id.
  return {
    id: id.length > 0 ? id : publicId,
    userId: readStringAliases(record, ['userId', 'user_id'], ''),
    publicId: publicId.length > 0 ? publicId : null,
    title,
    description: readNullableStringAliases(record, ['description']),
    markdown,
    markdownText: markdown,
    unit:
      readOptionalStringAliases(record, ['unit']) ??
      readNullableStringAliases(record, ['unit']),
    visibility: normalizeVisibility(record.visibility ?? record.state, options.fallbackVisibility ?? 'private'),
    rowCount,
    referenceCount,
    replacedAt:
      readOptionalStringAliases(record, ['replacedAt', 'replaced_at']) ?? readNullableStringAliases(record, ['replacedAt', 'replaced_at']),
    createdAt: IsoDateStringSchema.parse(createdAt),
    updatedAt: IsoDateStringSchema.parse(updatedAt),
  };
}

function normalizeDatasetRows(rawRows: unknown): AdvancedMapDatasetRow[] {
  if (!Array.isArray(rawRows)) {
    return [];
  }

  return rawRows
    .map((entry) => {
      const record = readRecord(entry);
      const parsedValueJson = AdvancedMapDatasetJsonItemSchema.safeParse(
        record.valueJson ?? record.value_json
      );

      return {
        sirutaCode: readOptionalStringAliases(record, ['sirutaCode', 'siruta_code']) ?? '',
        valueNumber:
          readOptionalStringAliases(record, ['valueNumber', 'value_number']) ??
          readNullableStringAliases(record, ['valueNumber', 'value_number']),
        valueJson: parsedValueJson.success ? parsedValueJson.data : null,
      };
    })
    .filter(
      (row) =>
        row.sirutaCode.length > 0 &&
        (row.valueNumber !== null || row.valueJson !== null)
    );
}

export function parseApiEnvelope(payload: unknown): z.infer<typeof ApiEnvelopeSchema> {
  return ApiEnvelopeSchema.parse(payload);
}

export function normalizeAdvancedMapDatasetConnection(raw: unknown): AdvancedMapDatasetConnection {
  const record = readRecord(raw);
  const nodes = Array.isArray(record.nodes) ? record.nodes : [];
  const pageInfo = readRecord(record.pageInfo);

  return {
    nodes: nodes.map((node) => normalizeDatasetSummaryRecord(node)),
    pageInfo: {
      totalCount: readNumberAliases(pageInfo, ['totalCount', 'total_count']),
      hasNextPage: readBooleanAliases(pageInfo, ['hasNextPage', 'has_next_page']),
      hasPreviousPage: readBooleanAliases(pageInfo, ['hasPreviousPage', 'has_previous_page']),
    },
  };
}

export function normalizeAdvancedMapDatasetDetail(raw: unknown): AdvancedMapDatasetDetail {
  const record = readRecord(raw);

  return {
    ...normalizeDatasetSummaryRecord(record),
    rows: normalizeDatasetRows(record.rows),
  };
}

export function normalizeAdvancedMapDatasetPublicSummary(raw: unknown): AdvancedMapDatasetSummary {
  return normalizeDatasetSummaryRecord(raw);
}

export function normalizeAdvancedMapDatasetPublicDetail(raw: unknown): AdvancedMapDatasetDetail {
  return normalizeAdvancedMapDatasetDetail(raw);
}

export function normalizeAdvancedMapDatasetUatDirectory(raw: unknown): AdvancedMapDatasetUatDirectory {
  const parsed = AdvancedMapDatasetUatDirectoryResponseSchema.parse(raw);

  const nodes = parsed.uats.nodes.map((node) => ({
    id: node.id,
    uatCode: node.uat_code,
    sirutaCode: node.siruta_code,
    name: node.name,
    countyName: node.county_name,
  }));
  const byUatId = new Map<
    string,
    {
      readonly uatCode: string;
      readonly sirutaCode: string;
      readonly name: string;
      readonly countyName: string;
    }
  >();
  const byUatCode = new Map<
    string,
    {
      readonly id: string;
      readonly sirutaCode: string;
      readonly name: string;
      readonly countyName: string;
    }
  >();
  const bySirutaCode = new Map<
    string,
    {
      readonly id: string;
      readonly uatCode: string;
      readonly name: string;
      readonly countyName: string;
    }
  >();

  for (const node of nodes) {
    byUatId.set(node.id, {
      uatCode: node.uatCode,
      sirutaCode: node.sirutaCode,
      name: node.name,
      countyName: node.countyName,
    });

    byUatCode.set(node.uatCode, {
      id: node.id,
      sirutaCode: node.sirutaCode,
      name: node.name,
      countyName: node.countyName,
    });

    bySirutaCode.set(node.sirutaCode, {
      id: node.id,
      uatCode: node.uatCode,
      name: node.name,
      countyName: node.countyName,
    });
  }

  return {
    nodes,
    pageInfo: parsed.uats.pageInfo,
    byUatId,
    byUatCode,
    bySirutaCode,
  };
}
