import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import matter from 'gray-matter'
import { ChallengeModuleDefinitionSchema } from '../src/features/challenges/schemas/challenge-definitions'

dotenv.config()

type SupportedDiscourseLang = 'en' | 'ro'

type MutableChallengeStep = {
  id: string
  slug: string
  contentDir: string
  title: {
    en: string
    ro: string
  }
  discourseTopicId?: number
  discourseTopicSlug?: string
}

type MutableChallenge = {
  id: string
  slug: string
  title: {
    en: string
    ro: string
  }
  steps: MutableChallengeStep[]
}

type MutableChallengeModule = {
  id: string
  slug: string
  title: {
    en: string
    ro: string
  }
  challenges: MutableChallenge[]
}

type CliOptions = {
  readonly write: boolean
  readonly moduleIds: readonly string[]
  readonly updateExistingContent: boolean
  readonly createMissing: boolean
}

type DiscourseTopicRef = {
  readonly topicId: number
  readonly topicSlug: string | null
}

type DiscourseTopicDetails = {
  readonly topicSlug: string | null
  readonly topicTitle: string | null
  readonly topicTags: readonly string[]
  readonly firstPostId: number | null
}

type ExistingTopicSyncResult = {
  readonly topicSlug: string | null
  readonly titleUpdated: boolean
  readonly bodyUpdated: boolean
  readonly tagsUpdated: boolean
}

type ChallengeDiscussionContent = {
  readonly contentLocale: SupportedDiscourseLang
  readonly excerpt: string
}

const PROJECT_ROOT = process.cwd()
const CHALLENGE_MODULES_ROOT = path.join(
  PROJECT_ROOT,
  'src',
  'content',
  'challenges',
  'modules',
)
const CHALLENGE_STEPS_ROOT = path.join(
  PROJECT_ROOT,
  'src',
  'content',
  'challenges',
  'steps',
)
const PROD_SITE_URL = 'https://transparenta.eu'
const DEFAULT_DISCOURSE_CATEGORY_SELECTOR = 'c/cu-ochii-pe-bugetele-locale'
const DEFAULT_EXTRA_TAGS = ['funky'] as const
const DISCUSSION_EXCERPT_MAX_CHARS = 3200
const RATE_LIMIT_MAX_RETRIES = 5
const RATE_LIMIT_WAIT_BUFFER_SECONDS = 1
const CONTENT_LOCALE_FALLBACK_ORDER: Record<
  SupportedDiscourseLang,
  readonly SupportedDiscourseLang[]
> = {
  en: ['en', 'ro'],
  ro: ['ro', 'en'],
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function parseCsvValue(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function printHelp(): void {
  console.log(`Usage: yarn discourse:sync-challenge-topics [--write] [--module <module-id>] [--update-existing-content] [--no-create-missing]

Defaults:
- dry-run mode (no file writes)
- target modules: all challenge modules
- discourse language: ro
- discourse category: c/cu-ochii-pe-bugetele-locale
- extra tags: funky

Examples:
- yarn discourse:sync-challenge-topics
- yarn discourse:sync-challenge-topics --module budget-basics --dry-run
- yarn discourse:sync-challenge-topics --write --module budget-basics
- yarn discourse:sync-challenge-topics --write --module budget-basics --update-existing-content
- yarn discourse:sync-challenge-topics --write --module budget-basics --update-existing-content --no-create-missing`)
}

function parseArgs(argv: readonly string[]): CliOptions {
  let write = false
  let updateExistingContent = false
  let createMissing = true
  const selectedModuleIds: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--write') {
      write = true
      continue
    }

    if (arg === '--dry-run') {
      write = false
      continue
    }

    if (arg === '--update-existing-content') {
      updateExistingContent = true
      continue
    }

    if (arg === '--no-create-missing') {
      createMissing = false
      continue
    }

    if (arg === '--module') {
      const nextValue = argv[index + 1]
      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error('--module requires a value')
      }
      selectedModuleIds.push(...parseCsvValue(nextValue))
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    throw new Error(`Unknown argument "${arg}"`)
  }

  return {
    write,
    moduleIds: Array.from(new Set(selectedModuleIds)),
    updateExistingContent,
    createMissing,
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parsePositiveInteger(value: string, variableName: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer`)
  }
  return parsed
}

function resolveDiscourseLang(value: string | undefined): SupportedDiscourseLang {
  if (!value) {
    return 'ro'
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'en' || normalized === 'ro') {
    return normalized
  }

  throw new Error('DISCOURSE_LANG must be one of: en, ro')
}

function _normalizeContentDir(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function normalizeTag(rawTag: string): string {
  return rawTag
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeTags(tags: readonly string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => normalizeTag(tag))
        .filter((tag) => tag.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

function normalizeContent(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

function buildChallengeContentUrl(params: {
  readonly siteUrl: string
  readonly moduleSlug: string
  readonly challengeSlug: string
  readonly stepSlug: string
}): string {
  const siteUrl = normalizeBaseUrl(params.siteUrl)
  return `${siteUrl}/challenge-content/${params.moduleSlug}/${params.challengeSlug}/${params.stepSlug}`
}

function getStepTitleForLanguage(
  step: MutableChallengeStep,
  language: SupportedDiscourseLang,
): string {
  if (language === 'ro') {
    return step.title.ro ?? step.title.en ?? step.id
  }

  return step.title.en ?? step.title.ro ?? step.id
}

function buildChallengeStepMdxPath(
  contentDir: string,
  locale: SupportedDiscourseLang,
): string {
  return path.join(CHALLENGE_STEPS_ROOT, contentDir, `index.${locale}.mdx`)
}

function stripMdxComponentMarkup(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const output: string[] = []
  let isSkippingMultilineTag = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (isSkippingMultilineTag) {
      if (trimmed.includes('>')) {
        isSkippingMultilineTag = false
      }
      continue
    }

    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
      continue
    }

    if (trimmed.startsWith('<')) {
      if (!trimmed.includes('>')) {
        isSkippingMultilineTag = true
        continue
      }

      const inlineTagMatch = trimmed.match(/^<[^>]+>(.*)<\/[^>]+>$/)
      if (inlineTagMatch && inlineTagMatch[1].trim().length > 0) {
        output.push(inlineTagMatch[1].trim())
      }
      continue
    }

    output.push(line)
  }

  return output.join('\n')
}

function stripInlineHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, '')
}

function normalizeDiscussionText(value: string): string {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function truncateDiscussionText(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value
  }

  return `${value.slice(0, maxChars).trimEnd()}\n\n[...]`
}

async function readChallengeDiscussionContent(params: {
  readonly step: MutableChallengeStep
  readonly discourseLang: SupportedDiscourseLang
}): Promise<ChallengeDiscussionContent> {
  const contentDir = params.step.contentDir?.trim()
  if (!contentDir) {
    throw new Error(`Step "${params.step.id}" is missing contentDir`)
  }

  const fallbackLocales = CONTENT_LOCALE_FALLBACK_ORDER[params.discourseLang]
  const attemptedPaths: string[] = []

  for (const locale of fallbackLocales) {
    const mdxPath = buildChallengeStepMdxPath(contentDir, locale)
    attemptedPaths.push(path.relative(PROJECT_ROOT, mdxPath))

    try {
      const mdxSource = await fs.readFile(mdxPath, 'utf8')
      const mdxWithoutFrontmatter = matter(mdxSource).content
      const strippedMdx = stripMdxComponentMarkup(mdxWithoutFrontmatter)
      const strippedHtml = stripInlineHtmlTags(strippedMdx)
      const normalizedText = normalizeDiscussionText(strippedHtml)
      if (!normalizedText) {
        continue
      }

      return {
        contentLocale: locale,
        excerpt: truncateDiscussionText(normalizedText, DISCUSSION_EXCERPT_MAX_CHARS),
      }
    } catch (error) {
      const errno = error as NodeJS.ErrnoException
      if (errno.code === 'ENOENT') {
        continue
      }

      const message = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Failed to read step content for "${params.step.id}" from ${path.relative(PROJECT_ROOT, mdxPath)}: ${message}`,
        { cause: error },
      )
    }
  }

  throw new Error(
    `No challenge step content file found for "${params.step.id}" in locales [${fallbackLocales.join(', ')}] (${attemptedPaths.join(', ')})`,
  )
}

function buildThreadBody(params: {
  readonly language: SupportedDiscourseLang
  readonly stepTitle: string
  readonly excerpt: string
  readonly excerptLocale: SupportedDiscourseLang
}): string {
  if (params.language === 'ro') {
    const localeNote =
      params.excerptLocale === 'ro'
        ? null
        : 'Notă: conținutul în română nu este disponibil; s-a folosit versiunea în engleză.'

    return [
      `Fir automat pentru etapa "${params.stepTitle}".`,
      '',
      'Aici poți pune întrebări, discuta ideile din acest pas și împărtăși observații legate de provocare.',
      '',
      '## Context din provocare',
      '',
      params.excerpt,
      '',
      ...(localeNote ? [localeNote, ''] : []),
      'Folosește acest thread pentru întrebări, clarificări și discuții despre această etapă din challenge.',
      '',
      'Acest prim mesaj este sincronizat automat din conținutul provocării.',
    ].join('\n')
  }

  const localeNote =
    params.excerptLocale === 'en'
      ? null
      : 'Note: English content is not available; using the Romanian source instead.'

  return [
    `Auto-synced thread for the challenge step "${params.stepTitle}".`,
    '',
    'Use this thread to ask questions, discuss the ideas in this step, and share observations related to the challenge.',
    '',
    '## Challenge context',
    '',
    params.excerpt,
    '',
    ...(localeNote ? [localeNote, ''] : []),
    'Use this thread for questions, clarifications, and discussion about this challenge step.',
    '',
    'This first post is auto-synced from the challenge content.',
  ].join('\n')
}

function extractTopicRef(rawPayload: unknown): DiscourseTopicRef | null {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return null
  }

  const record = rawPayload as Record<string, unknown>
  const nestedTopic =
    record.topic && typeof record.topic === 'object'
      ? (record.topic as Record<string, unknown>)
      : null

  const topicIdCandidate = [record.topic_id, nestedTopic?.id, record.id].find(
    (value) => typeof value === 'number',
  )
  if (
    typeof topicIdCandidate !== 'number' ||
    !Number.isInteger(topicIdCandidate) ||
    topicIdCandidate <= 0
  ) {
    return null
  }

  const topicSlugCandidate = [record.topic_slug, nestedTopic?.slug, record.slug].find(
    (value) => typeof value === 'string',
  )

  return {
    topicId: topicIdCandidate,
    topicSlug:
      typeof topicSlugCandidate === 'string' && topicSlugCandidate.trim().length > 0
        ? topicSlugCandidate
        : null,
  }
}

function getApiHeaders(
  apiKey: string,
  apiUsername: string,
  discourseLang: SupportedDiscourseLang,
): Record<string, string> {
  return {
    'Api-Key': apiKey,
    'Api-Username': apiUsername,
    'Accept-Language': discourseLang,
    Accept: 'application/json',
  }
}

function addQueryAuth(endpoint: URL, apiKey: string, apiUsername: string): URL {
  const queryAuthUrl = new URL(endpoint.toString())
  queryAuthUrl.searchParams.set('api_key', apiKey)
  queryAuthUrl.searchParams.set('api_username', apiUsername)
  return queryAuthUrl
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function readRateLimitWaitSeconds(response: Response): Promise<number> {
  const retryAfterHeader = response.headers.get('Retry-After')
  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10)
    if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds
    }
  }

  try {
    const payload = (await response.clone().json()) as unknown
    if (!payload || typeof payload !== 'object') {
      return 5
    }

    const record = payload as Record<string, unknown>
    const extras =
      record.extras && typeof record.extras === 'object'
        ? (record.extras as Record<string, unknown>)
        : null
    const waitSeconds =
      typeof extras?.wait_seconds === 'number' &&
      Number.isFinite(extras.wait_seconds) &&
      extras.wait_seconds > 0
        ? Math.ceil(extras.wait_seconds)
        : null

    return waitSeconds ?? 5
  } catch {
    return 5
  }
}

async function fetchWithRateLimitRetry(params: {
  readonly endpoint: URL
  readonly method: 'GET' | 'POST' | 'PUT'
  readonly headers: Record<string, string>
  readonly body?: string
}): Promise<Response> {
  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt += 1) {
    const response = await fetch(params.endpoint, {
      method: params.method,
      headers: params.headers,
      body: params.body,
    })

    if (response.status !== 429 || attempt === RATE_LIMIT_MAX_RETRIES) {
      return response
    }

    const waitSeconds = await readRateLimitWaitSeconds(response)
    const bufferedWaitSeconds = waitSeconds + RATE_LIMIT_WAIT_BUFFER_SECONDS
    console.warn(
      `Discourse rate limit hit for ${params.method} ${params.endpoint.pathname}. Waiting ${bufferedWaitSeconds}s before retry ${attempt + 2}/${RATE_LIMIT_MAX_RETRIES + 1}...`,
    )
    await delay(bufferedWaitSeconds * 1000)
  }

  throw new Error('Unreachable rate limit retry state')
}

async function fetchWithAuthFallback(params: {
  readonly endpoint: URL
  readonly method: 'GET' | 'POST' | 'PUT'
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
  readonly contentType?: string
  readonly contentLanguage?: SupportedDiscourseLang
  readonly body?: string
}): Promise<Response> {
  const headers: Record<string, string> = getApiHeaders(
    params.apiKey,
    params.apiUsername,
    params.discourseLang,
  )
  if (params.contentType) {
    headers['Content-Type'] = params.contentType
  }
  if (params.contentLanguage) {
    headers['Content-Language'] = params.contentLanguage
  }

  const response = await fetchWithRateLimitRetry({
    endpoint: params.endpoint,
    method: params.method,
    headers,
    body: params.body,
  })

  if (response.status !== 403) {
    return response
  }

  const queryAuthEndpoint = addQueryAuth(
    params.endpoint,
    params.apiKey,
    params.apiUsername,
  )
  return fetchWithRateLimitRetry({
    endpoint: queryAuthEndpoint,
    method: params.method,
    headers,
    body: params.body,
  })
}

function readTopicSlug(record: Record<string, unknown>): string | null {
  return typeof record.slug === 'string' && record.slug.trim().length > 0
    ? record.slug
    : null
}

function parseTopicDetails(rawPayload: unknown): DiscourseTopicDetails {
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Discourse topic details payload is not an object')
  }

  const payload = rawPayload as Record<string, unknown>
  const topicTitle =
    typeof payload.title === 'string' && payload.title.trim().length > 0
      ? payload.title
      : null
  const topicSlug = readTopicSlug(payload)
  const topicTags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === 'string')
    : []

  const postStream =
    payload.post_stream && typeof payload.post_stream === 'object'
      ? (payload.post_stream as Record<string, unknown>)
      : null
  const posts = postStream && Array.isArray(postStream.posts) ? postStream.posts : []

  let firstPostId: number | null = null
  for (const entry of posts) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const postRecord = entry as Record<string, unknown>
    const postId =
      typeof postRecord.id === 'number' && Number.isInteger(postRecord.id)
        ? postRecord.id
        : null
    if (postId === null) {
      continue
    }

    if (postRecord.post_number === 1) {
      firstPostId = postId
      break
    }

    if (firstPostId === null) {
      firstPostId = postId
    }
  }

  return { topicSlug, topicTitle, topicTags, firstPostId }
}

async function findTopicByEmbedUrl(params: {
  readonly discourseBaseUrl: string
  readonly embedUrl: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<DiscourseTopicRef | null> {
  const endpoint = new URL('/embed/info.json', `${params.discourseBaseUrl}/`)
  endpoint.searchParams.set('embed_url', params.embedUrl)

  const response = await fetchWithAuthFallback({
    endpoint,
    method: 'GET',
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  if (response.status === 404 || response.status === 422) {
    return null
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to look up topic for ${params.embedUrl} (${response.status}): ${body}`)
  }

  const payload = await response.json()
  return extractTopicRef(payload)
}

async function createTopicForChallengeStep(params: {
  readonly discourseBaseUrl: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly categoryId: number | null
  readonly stepTitle: string
  readonly embedUrl: string
  readonly rawBody: string
  readonly tags: readonly string[]
  readonly discourseLang: SupportedDiscourseLang
}): Promise<DiscourseTopicRef> {
  const endpoint = new URL('/posts.json', `${params.discourseBaseUrl}/`)

  const createWithCategory = async (categoryId: number | null): Promise<DiscourseTopicRef> => {
    const requestBody: Record<string, unknown> = {
      title: params.stepTitle,
      raw: params.rawBody,
      embed_url: params.embedUrl,
      tags: params.tags,
    }

    if (categoryId !== null) {
      requestBody.category = categoryId
    }

    const response = await fetchWithAuthFallback({
      endpoint,
      method: 'POST',
      apiKey: params.apiKey,
      apiUsername: params.apiUsername,
      discourseLang: params.discourseLang,
      contentType: 'application/json',
      contentLanguage: params.discourseLang,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok && response.status !== 400 && response.status !== 422) {
      const body = await response.text()
      throw new Error(`Failed to create topic for ${params.embedUrl} (${response.status}): ${body}`)
    }

    if (!response.ok) {
      const formData = new URLSearchParams()
      formData.set('title', params.stepTitle)
      formData.set('raw', params.rawBody)
      formData.set('embed_url', params.embedUrl)
      params.tags.forEach((tag) => formData.append('tags[]', tag))
      formData.set('tags', params.tags.join(','))
      if (categoryId !== null) {
        formData.set('category', String(categoryId))
      }

      const formResponse = await fetchWithAuthFallback({
        endpoint,
        method: 'POST',
        apiKey: params.apiKey,
        apiUsername: params.apiUsername,
        discourseLang: params.discourseLang,
        contentType: 'application/x-www-form-urlencoded',
        contentLanguage: params.discourseLang,
        body: formData.toString(),
      })

      if (!formResponse.ok) {
        const body = await formResponse.text()
        throw new Error(
          `Failed to create topic for ${params.embedUrl} with JSON (${response.status}) and form fallback (${formResponse.status}): ${body}`,
        )
      }

      const formPayload = await formResponse.json()
      const topic = extractTopicRef(formPayload)
      if (!topic) {
        throw new Error(
          `Topic creation succeeded but response did not include topic id for ${params.embedUrl}`,
        )
      }

      return topic
    }

    const payload = await response.json()
    const topic = extractTopicRef(payload)
    if (!topic) {
      throw new Error(
        `Topic creation succeeded but response did not include topic id for ${params.embedUrl}`,
      )
    }

    return topic
  }

  try {
    return await createWithCategory(params.categoryId)
  } catch (error) {
    if (params.categoryId === null || !(error instanceof Error)) {
      throw error
    }

    const normalizedMessage = error.message.toLowerCase()
    const isReservedCategoryError =
      normalizedMessage.includes('category is reserved') ||
      normalizedMessage.includes('categorie este rezervat') ||
      normalizedMessage.includes('categorie este rezervata')

    if (!isReservedCategoryError) {
      throw error
    }

    console.warn(
      `Category ${params.categoryId} is reserved for ${params.embedUrl}. Retrying without category...`,
    )
    return createWithCategory(null)
  }
}

async function getTopicDetails(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<DiscourseTopicDetails> {
  const endpoint = new URL(`/t/${params.topicId}.json`, `${params.discourseBaseUrl}/`)
  const response = await fetchWithAuthFallback({
    endpoint,
    method: 'GET',
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to read topic ${params.topicId} (${response.status}): ${body}`)
  }

  const payload = await response.json()
  return parseTopicDetails(payload)
}

async function getPostRaw(params: {
  readonly discourseBaseUrl: string
  readonly postId: number
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<string | null> {
  const endpoint = new URL(`/posts/${params.postId}.json`, `${params.discourseBaseUrl}/`)
  const response = await fetchWithAuthFallback({
    endpoint,
    method: 'GET',
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to read post ${params.postId} (${response.status}): ${body}`)
  }

  const payload = (await response.json()) as unknown
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  return typeof record.raw === 'string' ? record.raw : null
}

async function updateTopicDetails(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly title: string
  readonly tags: readonly string[]
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<void> {
  const updateRoutes = [`/t/-/${params.topicId}.json`, `/t/${params.topicId}.json`]
  let lastError: string | null = null

  for (const route of updateRoutes) {
    const endpoint = new URL(route, `${params.discourseBaseUrl}/`)
    const response = await fetchWithAuthFallback({
      endpoint,
      method: 'PUT',
      apiKey: params.apiKey,
      apiUsername: params.apiUsername,
      discourseLang: params.discourseLang,
      contentType: 'application/json',
      contentLanguage: params.discourseLang,
      body: JSON.stringify({
        title: params.title,
        tags: params.tags,
      }),
    })

    if (!response.ok && response.status !== 400 && response.status !== 422) {
      const body = await response.text()
      lastError = `${route} (${response.status}): ${body}`
      if (response.status !== 404) {
        break
      }
      continue
    }

    if (response.ok) {
      return
    }

    const formData = new URLSearchParams()
    formData.set('title', params.title)
    params.tags.forEach((tag) => formData.append('tags[]', tag))
    formData.set('tags', params.tags.join(','))

    const formResponse = await fetchWithAuthFallback({
      endpoint,
      method: 'PUT',
      apiKey: params.apiKey,
      apiUsername: params.apiUsername,
      discourseLang: params.discourseLang,
      contentType: 'application/x-www-form-urlencoded',
      contentLanguage: params.discourseLang,
      body: formData.toString(),
    })

    if (formResponse.ok) {
      return
    }

    const body = await formResponse.text()
    lastError = `${route} (${response.status}/${formResponse.status}): ${body}`
    if (formResponse.status !== 404) {
      break
    }
  }

  throw new Error(`Failed to update topic ${params.topicId}: ${lastError}`)
}

async function updatePostRaw(params: {
  readonly discourseBaseUrl: string
  readonly postId: number
  readonly rawBody: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<void> {
  const endpoint = new URL(`/posts/${params.postId}.json`, `${params.discourseBaseUrl}/`)
  const jsonResponse = await fetchWithAuthFallback({
    endpoint,
    method: 'PUT',
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
    contentType: 'application/json',
    contentLanguage: params.discourseLang,
    body: JSON.stringify({ raw: params.rawBody }),
  })

  if (jsonResponse.ok) {
    return
  }

  const jsonError = await jsonResponse.text()
  if (jsonResponse.status !== 400 && jsonResponse.status !== 422) {
    throw new Error(`Failed to update post ${params.postId} (${jsonResponse.status}): ${jsonError}`)
  }

  const formData = new URLSearchParams()
  formData.set('post[raw]', params.rawBody)
  formData.set('raw', params.rawBody)

  const formResponse = await fetchWithAuthFallback({
    endpoint,
    method: 'PUT',
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
    contentType: 'application/x-www-form-urlencoded',
    contentLanguage: params.discourseLang,
    body: formData.toString(),
  })

  if (!formResponse.ok) {
    const formError = await formResponse.text()
    throw new Error(
      `Failed to update post ${params.postId} with JSON (${jsonResponse.status}) and form fallback (${formResponse.status}): ${formError}`,
    )
  }
}

function haveSameTags(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = normalizeTags(left)
  const normalizedRight = normalizeTags(right)
  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((tag, index) => tag === normalizedRight[index])
}

async function syncExistingTopic(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly expectedTitle: string
  readonly expectedBody: string
  readonly expectedTags: readonly string[]
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
  readonly write: boolean
}): Promise<ExistingTopicSyncResult> {
  const details = await getTopicDetails({
    discourseBaseUrl: params.discourseBaseUrl,
    topicId: params.topicId,
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  const shouldUpdateTitle =
    details.topicTitle === null ||
    normalizeContent(details.topicTitle) !== normalizeContent(params.expectedTitle)
  const shouldUpdateTags = !haveSameTags(details.topicTags, params.expectedTags)

  if ((shouldUpdateTitle || shouldUpdateTags) && params.write) {
    await updateTopicDetails({
      discourseBaseUrl: params.discourseBaseUrl,
      topicId: params.topicId,
      title: params.expectedTitle,
      tags: params.expectedTags,
      apiKey: params.apiKey,
      apiUsername: params.apiUsername,
      discourseLang: params.discourseLang,
    })
  }

  if (details.firstPostId === null) {
    throw new Error(`Topic ${params.topicId} has no first post to update`)
  }

  const currentRawBody = await getPostRaw({
    discourseBaseUrl: params.discourseBaseUrl,
    postId: details.firstPostId,
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  const shouldUpdateBody =
    currentRawBody === null ||
    normalizeContent(currentRawBody) !== normalizeContent(params.expectedBody)

  if (shouldUpdateBody && params.write) {
    await updatePostRaw({
      discourseBaseUrl: params.discourseBaseUrl,
      postId: details.firstPostId,
      rawBody: params.expectedBody,
      apiKey: params.apiKey,
      apiUsername: params.apiUsername,
      discourseLang: params.discourseLang,
    })
  }

  return {
    topicSlug: details.topicSlug,
    titleUpdated: shouldUpdateTitle,
    bodyUpdated: shouldUpdateBody,
    tagsUpdated: shouldUpdateTags,
  }
}

function normalizeCategorySelector(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\/+/, '')
    .replace(/^c\//, '')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.trim()
    .toLowerCase() ?? ''
}

function parseCategoryRecord(rawCategory: unknown): {
  readonly id: number
  readonly slug: string
} | null {
  if (!rawCategory || typeof rawCategory !== 'object') {
    return null
  }

  const record = rawCategory as Record<string, unknown>
  if (
    typeof record.id !== 'number' ||
    !Number.isInteger(record.id) ||
    record.id <= 0 ||
    typeof record.slug !== 'string' ||
    record.slug.trim().length === 0
  ) {
    return null
  }

  return {
    id: record.id,
    slug: record.slug.trim().toLowerCase(),
  }
}

async function resolveCategoryId(params: {
  readonly discourseBaseUrl: string
  readonly categorySelector: string | null
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<number | null> {
  if (!params.categorySelector) {
    return null
  }

  const selector = params.categorySelector.trim()
  if (selector.length === 0) {
    return null
  }

  if (/^\d+$/.test(selector)) {
    return parsePositiveInteger(selector, 'DISCOURSE_CATEGORY')
  }

  const normalizedSelector = normalizeCategorySelector(selector)
  if (normalizedSelector.length === 0) {
    return null
  }

  const endpoint = new URL('/categories.json', `${params.discourseBaseUrl}/`)
  const response = await fetchWithAuthFallback({
    endpoint,
    method: 'GET',
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to list categories (${response.status}): ${body}`)
  }

  const payload = (await response.json()) as unknown
  const rootRecord =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  const categoryList =
    rootRecord?.category_list && typeof rootRecord.category_list === 'object'
      ? (rootRecord.category_list as Record<string, unknown>)
      : null
  const categories = Array.isArray(categoryList?.categories)
    ? categoryList.categories
    : []

  const resolvedCategory = categories
    .map((category) => parseCategoryRecord(category))
    .find((category) => category?.slug === normalizedSelector)

  if (!resolvedCategory) {
    throw new Error(`Unable to resolve Discourse category selector "${selector}"`)
  }

  return resolvedCategory.id
}

async function readChallengeModuleFile(moduleId: string): Promise<{
  readonly filePath: string
  readonly moduleConfig: MutableChallengeModule
}> {
  const filePath = path.join(CHALLENGE_MODULES_ROOT, `${moduleId}.json`)
  const source = await fs.readFile(filePath, 'utf8')
  const json = JSON.parse(source) as unknown

  return {
    filePath,
    moduleConfig:
      ChallengeModuleDefinitionSchema.parse(json) as unknown as MutableChallengeModule,
  }
}

async function listChallengeModuleIds(): Promise<readonly string[]> {
  const entries = await fs.readdir(CHALLENGE_MODULES_ROOT, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name.replace(/\.json$/, ''))
    .sort((left, right) => left.localeCompare(right))
}

async function syncChallengeModuleTopics(params: {
  readonly moduleConfig: MutableChallengeModule
  readonly filePath: string
  readonly siteUrl: string
  readonly discourseBaseUrl: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly categoryId: number | null
  readonly discourseLang: SupportedDiscourseLang
  readonly write: boolean
  readonly updateExistingContent: boolean
  readonly createMissing: boolean
  readonly extraTags: readonly string[]
}): Promise<{
  readonly touchedSteps: number
  readonly updatedSteps: number
  readonly createdTopics: number
  readonly updatedExistingTopics: number
  readonly skippedMissingTopics: number
  readonly wroteFile: boolean
}> {
  let touchedSteps = 0
  let updatedSteps = 0
  let createdTopics = 0
  let updatedExistingTopics = 0
  let skippedMissingTopics = 0
  let hasChanges = false
  const contentCache = new Map<string, ChallengeDiscussionContent>()

  for (const challenge of params.moduleConfig.challenges) {
    for (const step of challenge.steps) {
      touchedSteps += 1

      const canonicalUrl = buildChallengeContentUrl({
        siteUrl: params.siteUrl,
        moduleSlug: params.moduleConfig.slug,
        challengeSlug: challenge.slug,
        stepSlug: step.slug,
      })
      const stepTitle = getStepTitleForLanguage(step, params.discourseLang)
      const contentCacheKey = `${params.discourseLang}:${step.contentDir}`
      let discussionContent = contentCache.get(contentCacheKey)
      if (!discussionContent) {
        discussionContent = await readChallengeDiscussionContent({
          step,
          discourseLang: params.discourseLang,
        })
        contentCache.set(contentCacheKey, discussionContent)
      }

      const expectedBody = buildThreadBody({
        language: params.discourseLang,
        stepTitle,
        excerpt: discussionContent.excerpt,
        excerptLocale: discussionContent.contentLocale,
      })
      const expectedTags = normalizeTags([
        'challenge',
        ...params.extraTags,
        params.moduleConfig.slug,
        challenge.slug,
        step.slug,
      ])

      let topic = await findTopicByEmbedUrl({
        discourseBaseUrl: params.discourseBaseUrl,
        embedUrl: canonicalUrl,
        apiKey: params.apiKey,
        apiUsername: params.apiUsername,
        discourseLang: params.discourseLang,
      })

      if (!topic && step.discourseTopicId) {
        topic = {
          topicId: step.discourseTopicId,
          topicSlug: step.discourseTopicSlug ?? null,
        }
      }

      let created = false
      if (!topic) {
        if (!params.createMissing) {
          skippedMissingTopics += 1
          console.log(
            `- ${params.moduleConfig.slug}/${challenge.slug}/${step.slug}: skipped missing topic (creation disabled)`,
          )
          continue
        }

        topic = await createTopicForChallengeStep({
          discourseBaseUrl: params.discourseBaseUrl,
          apiKey: params.apiKey,
          apiUsername: params.apiUsername,
          categoryId: params.categoryId,
          stepTitle,
          embedUrl: canonicalUrl,
          rawBody: expectedBody,
          tags: expectedTags,
          discourseLang: params.discourseLang,
        })
        created = true
        createdTopics += 1
      }

      let existingTopicUpdated = false
      if (params.updateExistingContent && !created) {
        const updateResult = await syncExistingTopic({
          discourseBaseUrl: params.discourseBaseUrl,
          topicId: topic.topicId,
          expectedTitle: stepTitle,
          expectedBody,
          expectedTags,
          apiKey: params.apiKey,
          apiUsername: params.apiUsername,
          discourseLang: params.discourseLang,
          write: params.write,
        })

        if (updateResult.topicSlug) {
          topic = {
            topicId: topic.topicId,
            topicSlug: updateResult.topicSlug,
          }
        }

        existingTopicUpdated =
          updateResult.titleUpdated ||
          updateResult.bodyUpdated ||
          updateResult.tagsUpdated
        if (existingTopicUpdated) {
          updatedExistingTopics += 1
        }
      }

      let stepUpdated = false
      if (step.discourseTopicId !== topic.topicId) {
        step.discourseTopicId = topic.topicId
        stepUpdated = true
      }
      if (topic.topicSlug && step.discourseTopicSlug !== topic.topicSlug) {
        step.discourseTopicSlug = topic.topicSlug
        stepUpdated = true
      }

      if (stepUpdated) {
        hasChanges = true
        updatedSteps += 1
      }

      const creationState = created ? 'created' : 'existing'
      const updateState = stepUpdated ? 'metadata-updated' : 'metadata-unchanged'
      const contentState = params.updateExistingContent
        ? existingTopicUpdated
          ? params.write
            ? ', topic-updated'
            : ', topic-would-update'
          : ', topic-unchanged'
        : ''
      console.log(
        `- ${params.moduleConfig.slug}/${challenge.slug}/${step.slug}: topic ${topic.topicId} (${creationState}, ${updateState}${contentState})`,
      )
    }
  }

  let wroteFile = false
  if (hasChanges && params.write) {
    await fs.writeFile(
      params.filePath,
      `${JSON.stringify(params.moduleConfig, null, 2)}\n`,
      'utf8',
    )
    wroteFile = true
  }

  return {
    touchedSteps,
    updatedSteps,
    createdTopics,
    updatedExistingTopics,
    skippedMissingTopics,
    wroteFile,
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const discourseBaseUrl = normalizeBaseUrl(readRequiredEnv('DISCOURSE_BASE_URL'))
  const apiKey = readRequiredEnv('DISCOURSE_API_KEY')
  const apiUsername = readRequiredEnv('DISCOURSE_API_USERNAME')
  const discourseLang = resolveDiscourseLang(process.env.DISCOURSE_LANG)
  const siteUrl = normalizeBaseUrl(PROD_SITE_URL)
  const categorySelector =
    process.env.DISCOURSE_CATEGORY?.trim() ||
    process.env.DISCOURSE_CATEGORY_SLUG?.trim() ||
    process.env.DISCOURSE_CATEGORY_ID?.trim() ||
    DEFAULT_DISCOURSE_CATEGORY_SELECTOR
  const extraTags = normalizeTags([
    ...DEFAULT_EXTRA_TAGS,
    ...parseCsvValue(process.env.DISCOURSE_EXTRA_TAGS?.trim() ?? ''),
  ])
  const categoryId = await resolveCategoryId({
    discourseBaseUrl,
    categorySelector,
    apiKey,
    apiUsername,
    discourseLang,
  })

  const moduleIds =
    options.moduleIds.length > 0 ? options.moduleIds : await listChallengeModuleIds()

  console.log(`Mode: ${options.write ? 'write' : 'dry-run'}`)
  console.log(`Site URL: ${siteUrl}`)
  console.log(`Discourse URL: ${discourseBaseUrl}`)
  console.log(`Discourse language: ${discourseLang}`)
  console.log(`Discourse category: ${categorySelector} -> ${categoryId ?? 'none'}`)
  console.log(`Extra tags: ${extraTags.join(', ') || 'none'}`)
  console.log(`Create missing topics: ${options.createMissing ? 'enabled' : 'disabled'}`)
  console.log(
    `Update existing topic content: ${options.updateExistingContent ? (options.write ? 'enabled' : 'preview only') : 'disabled'}`,
  )
  console.log(`Modules: ${moduleIds.join(', ')}`)
  console.log('')

  let totalTouchedSteps = 0
  let totalUpdatedSteps = 0
  let totalCreatedTopics = 0
  let totalUpdatedExistingTopics = 0
  let totalSkippedMissingTopics = 0
  let totalWrittenFiles = 0

  for (const moduleId of moduleIds) {
    const { filePath, moduleConfig } = await readChallengeModuleFile(moduleId)
    console.log(`Syncing ${path.basename(filePath)}...`)

    const result = await syncChallengeModuleTopics({
      moduleConfig,
      filePath,
      siteUrl,
      discourseBaseUrl,
      apiKey,
      apiUsername,
      categoryId,
      discourseLang,
      write: options.write,
      updateExistingContent: options.updateExistingContent,
      createMissing: options.createMissing,
      extraTags,
    })

    totalTouchedSteps += result.touchedSteps
    totalUpdatedSteps += result.updatedSteps
    totalCreatedTopics += result.createdTopics
    totalUpdatedExistingTopics += result.updatedExistingTopics
    totalSkippedMissingTopics += result.skippedMissingTopics

    if (result.wroteFile) {
      totalWrittenFiles += 1
      console.log(`✓ Updated ${path.basename(filePath)}`)
    } else if (result.updatedSteps > 0) {
      console.log(`• Would update ${path.basename(filePath)} (run with --write to persist)`)
    } else {
      console.log(`• No metadata changes for ${path.basename(filePath)}`)
    }

    console.log('')
  }

  console.log('Summary')
  console.log(`- Steps processed: ${totalTouchedSteps}`)
  console.log(`- Steps updated: ${totalUpdatedSteps}`)
  console.log(`- Topics created: ${totalCreatedTopics}`)
  console.log(`- Existing topic updates: ${totalUpdatedExistingTopics}`)
  console.log(`- Missing topics skipped: ${totalSkippedMissingTopics}`)
  console.log(`- Module files written: ${totalWrittenFiles}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Challenge Discourse topic sync failed: ${message}`)
  process.exitCode = 1
})
