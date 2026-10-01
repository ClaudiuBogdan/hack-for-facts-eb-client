import type { RegistryRecord } from '../api'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { RegistryRead } from '../model'

/** The registry's rows and reads as the tests build them: one record (Funky Citizens) to vary, and the export it came from. */

const summary = NGO_REGISTRY_SUMMARY

export const snapshot = {
  id: summary.snapshotId,
  sourceDeclaredDate: null,
  importedAt: '2026-09-22T14:02:09.302Z',
  capturedAt: '2026-09-20T06:11:58.733Z',
  refreshOverdue: true,
  acceptedAt: null,
  recordCount: 141330,
  isCurrent: true,
  sourceUrl: 'https://rnong.just.ro/registru-ong',
  coverageBasis: 'provided_artifact',
  nationalCompleteness: 'unverified',
}

export function row(overrides: Partial<RegistryRecord> = {}): RegistryRecord {
  return {
    id: 'r1',
    sourceRowNumber: 1,
    registryNumber: '1471/A/2012',
    specialRegistryNumber: null,
    sourceRegistrationDate: '2012-05-24',
    category: 'association',
    legalForm: 'Asociație',
    name: 'FUNKY CITIZENS',
    nameWithheld: false,
    court: 'Judecatoria SECTORUL 3 BUCURESTI',
    sourceRegistryStatus: 'Inregistrat',
    county: 'BUCURESTI',
    locality: 'SECTORUL 3 - BUCURESTI',
    sourceCui: null,
    linkedOrganizationCui: null,
    organizationCui: null,
    isBranch: null,
    sourceReportsPublicUtility: false,
    snapshot,
    ...overrides,
  }
}

export function read(rows: readonly RegistryRecord[], overrides: Partial<RegistryRead> = {}): RegistryRead {
  return { rows, repeated: 0, complete: true, capped: false, pending: false, snapshot, ...overrides }
}
