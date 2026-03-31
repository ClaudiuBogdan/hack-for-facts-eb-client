import * as Sentry from '@sentry/react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const CORRUPTED_STORAGE_SUFFIX = '__corrupted__'
const RAW_PREVIEW_MAX_LENGTH = 200

let hasWarnedAboutCorruptedStorage = false

type ReadJsonFromLocalStorageOptions = {
  readonly expectedVersion?: number
}

function truncateRawPreview(raw: string): string {
  return raw.length <= RAW_PREVIEW_MAX_LENGTH
    ? raw
    : `${raw.slice(0, RAW_PREVIEW_MAX_LENGTH)}...`
}

function buildCorruptedStorageBackupKey(key: string): string {
  return `${key}${CORRUPTED_STORAGE_SUFFIX}${Date.now().toString()}`
}

function backupCorruptedStorageValue(key: string, raw: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(buildCorruptedStorageBackupKey(key), raw)
  } catch {
    // Preserve the original failure; backup is best-effort only.
  }
}

function reportCorruptedStorage(params: {
  readonly key: string
  readonly raw: string
  readonly reason: 'json-parse-failed' | 'unsupported-version'
  readonly expectedVersion?: number
}): void {
  const rawPreview = truncateRawPreview(params.raw)

  logger.error('Corrupted localStorage entry detected', {
    key: params.key,
    reason: params.reason,
    expectedVersion: params.expectedVersion,
    rawPreview,
  })

  Sentry.captureException(new Error(`Corrupted localStorage entry detected for key "${params.key}"`), {
    extra: {
      key: params.key,
      reason: params.reason,
      expectedVersion: params.expectedVersion,
      rawPreview,
    },
  })

  if (!hasWarnedAboutCorruptedStorage) {
    hasWarnedAboutCorruptedStorage = true
    toast.warning(t`Some saved local data was corrupted and has been reset.`)
  }
}

function hasSupportedVersion(raw: unknown, expectedVersion: number): boolean {
  if (!raw || typeof raw !== 'object') {
    return false
  }

  return (raw as { version?: unknown }).version === expectedVersion
}

export function readJsonFromLocalStorage(
  key: string,
  options: ReadJsonFromLocalStorageOptions = {},
): unknown {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    backupCorruptedStorageValue(key, raw)
    reportCorruptedStorage({
      key,
      raw,
      reason: 'json-parse-failed',
    })
    return null
  }

  if (
    options.expectedVersion !== undefined
    && !hasSupportedVersion(parsed, options.expectedVersion)
  ) {
    backupCorruptedStorageValue(key, raw)
    reportCorruptedStorage({
      key,
      raw,
      reason: 'unsupported-version',
      expectedVersion: options.expectedVersion,
    })
    return null
  }

  return parsed
}
