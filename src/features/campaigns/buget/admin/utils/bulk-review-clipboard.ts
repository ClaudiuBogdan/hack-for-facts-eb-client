import Papa from 'papaparse'
import { t } from '@lingui/core/macro'
import {
  buildCampaignAdminSelectionKey,
  getCampaignAdminInteractionTypeLabel,
} from '@/features/campaigns/buget/admin/constants'
import type {
  CampaignAdminReviewDecision,
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'
import { getCampaignAdminPrimaryValue } from './payload-summary'
import { resolveSafeCampaignAdminHref } from './resolve-safe-campaign-admin-href'
import { buildCampaignPrimariePath } from '@/features/challenges/constants'

export const CAMPAIGN_ADMIN_BULK_REVIEW_CLIPBOARD_HEADERS = [
  'User Interaction ID',
  'User ID',
  'Record Key',
  'Entity Name',
  'Entity CUI',
  'Interaction Type',
  'Interaction ID',
  'Entity Link',
  'Interaction Element Link',
  'Submitted Value',
  'Decision',
  'Review Feedback',
] as const

export type CampaignAdminBulkReviewClipboardIssue = {
  readonly rowNumber: number
  readonly message: string
}

export type CampaignAdminBulkReviewClipboardParseResult = {
  readonly drafts: readonly CampaignAdminStagedReviewDraft[]
  readonly importedCount: number
  readonly skippedCount: number
  readonly issues: readonly CampaignAdminBulkReviewClipboardIssue[]
}

const HEADER_ALIASES = {
  selectionKey: [
    'user interaction id',
    'user_interaction_id',
    'selection id',
    'selection_id',
    'row id',
    'row_id',
  ],
  userId: ['user id', 'user_id', 'userid', 'user'],
  recordKey: [
    'interactive element id',
    'interactive_element_id',
    'interactive id',
    'interactive_id',
    'record key',
    'record_key',
    'recordkey',
  ],
  decision: [
    'decision',
    'status',
    'review status',
    'review_status',
    'review decision',
    'review_decision',
    'approval',
    'result',
  ],
  feedbackText: [
    'review feedback',
    'review_feedback',
    'feedback',
    'feedback text',
    'feedback_text',
    'review note',
    'review_note',
    'note',
    'comment',
    'reason',
  ],
} as const

const APPROVED_DECISION_ALIASES = [
  'approved',
  'approve',
  'accepted',
  'accept',
  'yes',
  'true',
  '1',
  'ok',
  'aprobat',
  'aproba',
  'da',
] as const

const REJECTED_DECISION_ALIASES = [
  'rejected',
  'reject',
  'denied',
  'deny',
  'no',
  'false',
  '0',
  'respins',
  'respinge',
  'nu',
] as const

function normalizeHeaderCell(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeCell(value: unknown): string {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).trim()
}

function escapeTabularCell(value: string | null): string {
  const normalizedValue = (value ?? '').replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim()

  if (/^[=+\-@]/.test(normalizedValue)) {
    return `'${normalizedValue}`
  }

  return normalizedValue
}

function findHeaderIndex(headers: readonly string[], aliases: readonly string[]): number {
  const normalizedAliases = new Set(aliases.map((alias) => normalizeHeaderCell(alias)))
  return headers.findIndex((header) => normalizedAliases.has(header))
}

function getPrimaryInteractionValue(item: CampaignAdminUserInteractionListItem): string {
  return getCampaignAdminPrimaryValue(item) ?? ''
}

function getEntityLink(item: CampaignAdminUserInteractionListItem, baseUrl?: string): string {
  if (item.entityCui === null) {
    return ''
  }

  return (
    resolveSafeCampaignAdminHref({
      value: buildCampaignPrimariePath(item.entityCui),
      baseUrl,
    })
    ?? ''
  )
}

function parseDecisionValue(rawValue: string): CampaignAdminReviewDecision | null | 'invalid' {
  const normalizedValue = normalizeHeaderCell(rawValue)
  if (normalizedValue === '') {
    return null
  }

  if (APPROVED_DECISION_ALIASES.includes(normalizedValue as (typeof APPROVED_DECISION_ALIASES)[number])) {
    return 'approved'
  }

  if (REJECTED_DECISION_ALIASES.includes(normalizedValue as (typeof REJECTED_DECISION_ALIASES)[number])) {
    return 'rejected'
  }

  return 'invalid'
}

export function serializeCampaignAdminBulkReviewRowsToClipboardTsv(input: {
  readonly items: readonly CampaignAdminUserInteractionListItem[]
  readonly stagedDraftsByKey?: Readonly<Record<string, CampaignAdminStagedReviewDraft>>
  readonly baseUrl?: string
}): string {
  const lines = [CAMPAIGN_ADMIN_BULK_REVIEW_CLIPBOARD_HEADERS.join('\t')]

  for (const item of input.items) {
    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey)
    const stagedDraft = input.stagedDraftsByKey?.[selectionKey]

    lines.push(
      [
        escapeTabularCell(selectionKey),
        escapeTabularCell(item.userId),
        escapeTabularCell(item.recordKey),
        escapeTabularCell(item.entityName),
        escapeTabularCell(item.entityCui),
        escapeTabularCell(getCampaignAdminInteractionTypeLabel(item.interactionId)),
        escapeTabularCell(item.interactionId),
        escapeTabularCell(getEntityLink(item, input.baseUrl)),
        escapeTabularCell(
          resolveSafeCampaignAdminHref({
            value: item.interactionElementLink,
            baseUrl: input.baseUrl,
          })
          ?? ''
        ),
        escapeTabularCell(getPrimaryInteractionValue(item)),
        escapeTabularCell(stagedDraft?.status ?? ''),
        escapeTabularCell(stagedDraft?.feedbackText ?? ''),
      ].join('\t')
    )
  }

  return `${lines.join('\n')}\n`
}

export function looksLikeCampaignAdminBulkReviewClipboardText(rawText: string): boolean {
  const parsed = Papa.parse<string[]>(rawText, {
    preview: 1,
    skipEmptyLines: 'greedy',
    delimitersToGuess: ['\t', ',', ';'],
  })
  const headerRow = parsed.data.find((cells) => Array.isArray(cells))
  if (!Array.isArray(headerRow) || headerRow.length === 0) {
    return false
  }

  const headers = headerRow.map((cell) => normalizeHeaderCell(cell))
  const hasIdColumn =
    findHeaderIndex(headers, HEADER_ALIASES.selectionKey) >= 0
    || findHeaderIndex(headers, HEADER_ALIASES.recordKey) >= 0
  const hasDecisionColumn = findHeaderIndex(headers, HEADER_ALIASES.decision) >= 0

  return hasIdColumn && hasDecisionColumn
}

export function parseCampaignAdminBulkReviewClipboardText(input: {
  readonly rawText: string
  readonly items: readonly CampaignAdminUserInteractionListItem[]
}): CampaignAdminBulkReviewClipboardParseResult {
  const parsed = Papa.parse<string[]>(input.rawText, {
    skipEmptyLines: 'greedy',
    delimitersToGuess: ['\t', ',', ';'],
  })

  const rows = parsed.data
    .filter((cells) => Array.isArray(cells))
    .map((cells) => cells.map((cell) => normalizeCell(cell)))

  if (rows.length === 0) {
    return {
      drafts: [],
      importedCount: 0,
      skippedCount: 0,
      issues: [{ rowNumber: 1, message: t`No tabular review rows were found in the pasted data.` }],
    }
  }

  const headers = rows[0]?.map((cell) => normalizeHeaderCell(cell)) ?? []
  const selectionKeyIndex = findHeaderIndex(headers, HEADER_ALIASES.selectionKey)
  const userIdIndex = findHeaderIndex(headers, HEADER_ALIASES.userId)
  const recordKeyIndex = findHeaderIndex(headers, HEADER_ALIASES.recordKey)
  const decisionIndex = findHeaderIndex(headers, HEADER_ALIASES.decision)
  const feedbackIndex = findHeaderIndex(headers, HEADER_ALIASES.feedbackText)

  const missingColumns: string[] = []
  if (selectionKeyIndex < 0 && recordKeyIndex < 0) {
    missingColumns.push(t`User Interaction ID`)
  }
  if (decisionIndex < 0) {
    missingColumns.push(t`Decision`)
  }

  if (missingColumns.length > 0) {
    return {
      drafts: [],
      importedCount: 0,
      skippedCount: 0,
      issues: [{
        rowNumber: 1,
        message: t`Missing required columns: ${missingColumns.join(', ')}`,
      }],
    }
  }

  const itemsBySelectionKey = new Map(
    input.items.map((item) => [
      buildCampaignAdminSelectionKey(item.userId, item.recordKey),
      item,
    ])
  )
  const itemsByRecordKey = new Map<string, CampaignAdminUserInteractionListItem | null>()

  for (const item of input.items) {
    const currentItem = itemsByRecordKey.get(item.recordKey)
    itemsByRecordKey.set(item.recordKey, currentItem === undefined ? item : null)
  }

  const issues: CampaignAdminBulkReviewClipboardIssue[] = []
  const drafts: CampaignAdminStagedReviewDraft[] = []
  const seenSelectionKeys = new Set<string>()
  let skippedCount = 0

  rows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2
    const selectionKeyValue =
      selectionKeyIndex >= 0 ? normalizeCell(cells[selectionKeyIndex] ?? '') : ''
    const userId = userIdIndex >= 0 ? normalizeCell(cells[userIdIndex] ?? '') : ''
    const recordKey = recordKeyIndex >= 0 ? normalizeCell(cells[recordKeyIndex] ?? '') : ''
    const decisionValue = normalizeCell(cells[decisionIndex] ?? '')
    const feedbackText = feedbackIndex >= 0 ? normalizeCell(cells[feedbackIndex] ?? '') : ''

    if (decisionValue === '' && feedbackText === '') {
      skippedCount += 1
      return
    }

    if (selectionKeyValue === '' && recordKey === '') {
      issues.push({
        rowNumber,
        message: t`Missing user interaction id for imported review row.`,
      })
      return
    }

    const parsedDecision = parseDecisionValue(decisionValue)
    if (parsedDecision === null) {
      issues.push({
        rowNumber,
        message: t`Missing decision value for imported review row.`,
      })
      return
    }

    if (parsedDecision === 'invalid') {
      issues.push({
        rowNumber,
        message: t`Invalid decision value: ${decisionValue}`,
      })
      return
    }

    let matchedItem: CampaignAdminUserInteractionListItem | null | undefined

    if (selectionKeyValue !== '') {
      matchedItem = itemsBySelectionKey.get(selectionKeyValue)
      if (matchedItem === undefined) {
        issues.push({
          rowNumber,
          message: t`Unknown selected review row: ${selectionKeyValue}`,
        })
        return
      }
    } else if (userId !== '' && recordKey !== '') {
      const compositeSelectionKey = buildCampaignAdminSelectionKey(userId, recordKey)
      matchedItem = itemsBySelectionKey.get(compositeSelectionKey)
      if (matchedItem === undefined) {
        issues.push({
          rowNumber,
          message: t`Unknown selected review row: ${compositeSelectionKey}`,
        })
        return
      }
    } else {
      matchedItem = itemsByRecordKey.get(recordKey)
      if (matchedItem === undefined) {
        issues.push({
          rowNumber,
          message: t`Unknown selected review row: ${recordKey}`,
        })
        return
      }

      if (matchedItem === null) {
        issues.push({
          rowNumber,
          message: t`Ambiguous selected interactive element id: ${recordKey}`,
        })
        return
      }
    }

    const selectionKey = buildCampaignAdminSelectionKey(matchedItem.userId, matchedItem.recordKey)
    if (seenSelectionKeys.has(selectionKey)) {
      issues.push({
        rowNumber,
        message: t`Duplicate review row: ${matchedItem.recordKey}`,
      })
      return
    }

    seenSelectionKeys.add(selectionKey)
    drafts.push({
      userId: matchedItem.userId,
      recordKey: matchedItem.recordKey,
      status: parsedDecision,
      feedbackText,
    })
  })

  return {
    drafts,
    importedCount: drafts.length,
    skippedCount,
    issues,
  }
}
