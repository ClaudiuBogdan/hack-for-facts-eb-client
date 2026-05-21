export type ScraperDatasetLifecycle =
  | 'production'
  | 'loading'
  | 'experimental'
  | 'blocked'
  | 'deferred'

export type ScraperRepoLayer = 'experimental' | 'new_latest' | 'legacy'

export type ScraperDatasetReference = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly lifecycle: ScraperDatasetLifecycle
  readonly joinKeys: readonly string[]
  readonly scrapperRepoRelativePath: string
  readonly experimentalDocs: readonly string[]
  readonly newLatestPaths: readonly string[]
  readonly clientFeaturePaths: readonly string[]
  readonly clientSchemaPaths: readonly string[]
  readonly clientSpecPaths: readonly string[]
  readonly apiReady: boolean
  readonly mockDataAvailable: boolean
  readonly privacySensitive: boolean
}
