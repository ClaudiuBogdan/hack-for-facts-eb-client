/**
 * Sibling repo layout used for cross-project navigation in docs and tooling.
 * Override with VITE_SCRAPPER_REPO_ROOT when the scrapper checkout lives elsewhere.
 */
export const SCRAPPER_REPO_RELATIVE_PATH = '../hack-for-facts-eb-scrapper'

export function getScrapperRepoRoot(): string {
  const configuredRoot = import.meta.env.VITE_SCRAPPER_REPO_ROOT

  if (typeof configuredRoot === 'string' && configuredRoot.trim().length > 0) {
    return configuredRoot.replace(/\/$/, '')
  }

  return SCRAPPER_REPO_RELATIVE_PATH
}

export function resolveScrapperPath(repoRelativePath: string): string {
  return `${getScrapperRepoRoot()}/${repoRelativePath.replace(/^\//, '')}`
}

export const SCRAPPER_DOC_PATHS = {
  experimentalReadme: 'experimental/docs/README.md',
  joinKeyMatrix: 'experimental/docs/join-key-matrix.md',
  referenceCodeContracts: 'experimental/docs/reference-code-contracts.md',
  sourceInventory: 'experimental/docs/source-inventory.md',
  sourceTrustMatrix: 'experimental/docs/source-trust-matrix.md',
} as const
