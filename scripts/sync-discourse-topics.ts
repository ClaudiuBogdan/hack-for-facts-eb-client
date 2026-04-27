import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import matter from 'gray-matter'
dotenv.config()

type LessonConfig = {
  id: string
  contentDir?: string
  title?: {
    en?: string
    ro?: string
  }
  discourseTopicId?: number
  discourseTopicSlug?: string
}

type ModuleConfig = {
  id: string
  lessons: LessonConfig[]
}

type PathConfig = {
  id: string
  modules: ModuleConfig[]
}

type SupportedDiscourseLang = 'en' | 'ro'

type CliOptions = {
  readonly write: boolean
  readonly pathIds: readonly string[]
  readonly updateExistingContent: boolean
}

type DiscourseTopicRef = {
  readonly topicId: number
  readonly topicSlug: string | null
}

type DiscourseTopicDetails = {
  readonly topicSlug: string | null
  readonly topicTitle: string | null
  readonly firstPostId: number | null
}

type ExistingTopicContentSyncResult = {
  readonly topicSlug: string | null
  readonly titleUpdated: boolean
  readonly bodyUpdated: boolean
}

type LessonDiscussionContent = {
  readonly contentLocale: SupportedDiscourseLang
  readonly lessonExcerpt: string
}

const DEFAULT_PATH_IDS = ['budget-basics'] as const
const DEFAULT_SITE_URL = 'https://transparenta.eu'
const PROJECT_ROOT = process.cwd()
const LEARNING_PATHS_ROOT = path.join(PROJECT_ROOT, 'src', 'content', 'learning', 'paths')
const LEARNING_MODULES_ROOT = path.join(PROJECT_ROOT, 'src', 'content', 'learning', 'modules')
const DISCUSSION_LESSON_EXCERPT_MAX_CHARS = 3200

const DISCUSSION_CONTENT_LOCALE_FALLBACK_ORDER: Record<SupportedDiscourseLang, readonly SupportedDiscourseLang[]> = {
  en: ['en', 'ro'],
  ro: ['ro', 'en'],
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

function parsePathValues(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function printHelp(): void {
  console.log(`Usage: yarn discourse:sync-topics [--write] [--path <path-id>] [--update-existing-content]

Defaults:
- dry-run mode (no file writes)
- target path: budget-basics

Examples:
- yarn discourse:sync-topics
- yarn discourse:sync-topics --path budget-basics --dry-run
- yarn discourse:sync-topics --write --path budget-basics
- yarn discourse:sync-topics --write --path budget-basics --update-existing-content`)
}

function parseArgs(argv: readonly string[]): CliOptions {
  let write = false
  let updateExistingContent = false
  const selectedPathIds: string[] = []

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

    if (arg === '--path') {
      const nextValue = argv[index + 1]
      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error('--path requires a value')
      }
      selectedPathIds.push(...parsePathValues(nextValue))
      index += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    throw new Error(`Unknown argument "${arg}"`)
  }

  const pathIds = selectedPathIds.length > 0 ? Array.from(new Set(selectedPathIds)) : [...DEFAULT_PATH_IDS]
  return { write, pathIds, updateExistingContent }
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
    return 'en'
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'en' || normalized === 'ro') {
    return normalized
  }

  throw new Error(`DISCOURSE_LANG must be one of: en, ro`)
}

function normalizeContentDir(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function assertPathConfig(rawData: unknown, filePath: string): PathConfig {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error(`${filePath}: expected JSON object`)
  }

  const record = rawData as Record<string, unknown>
  if (typeof record.id !== 'string' || record.id.trim().length === 0) {
    throw new Error(`${filePath}: missing path id`)
  }

  if (!Array.isArray(record.modules)) {
    throw new Error(`${filePath}: missing modules array`)
  }

  const modules: ModuleConfig[] = record.modules.map((moduleEntry, moduleIndex) => {
    if (!moduleEntry || typeof moduleEntry !== 'object') {
      throw new Error(`${filePath}: module at index ${moduleIndex} must be an object`)
    }
    const moduleRecord = moduleEntry as Record<string, unknown>
    if (typeof moduleRecord.id !== 'string' || moduleRecord.id.trim().length === 0) {
      throw new Error(`${filePath}: module at index ${moduleIndex} is missing id`)
    }
    if (!Array.isArray(moduleRecord.lessons)) {
      throw new Error(`${filePath}: module "${moduleRecord.id}" is missing lessons`)
    }

    const lessons: LessonConfig[] = moduleRecord.lessons.map((lessonEntry, lessonIndex) => {
      if (!lessonEntry || typeof lessonEntry !== 'object') {
        throw new Error(`${filePath}: lesson at index ${lessonIndex} in module "${moduleRecord.id}" must be an object`)
      }
      const lessonRecord = lessonEntry as Record<string, unknown>
      if (typeof lessonRecord.id !== 'string' || lessonRecord.id.trim().length === 0) {
        throw new Error(`${filePath}: lesson at index ${lessonIndex} in module "${moduleRecord.id}" is missing id`)
      }
      if (typeof lessonRecord.contentDir !== 'string' || lessonRecord.contentDir.trim().length === 0) {
        throw new Error(`${filePath}: lesson "${lessonRecord.id}" in module "${moduleRecord.id}" is missing contentDir`)
      }
      lessonRecord.contentDir = normalizeContentDir(lessonRecord.contentDir)

      return lessonRecord as unknown as LessonConfig
    })

    moduleRecord.lessons = lessons
    return moduleRecord as unknown as ModuleConfig & { lessons: LessonConfig[] } & { id: string }
  })

  record.modules = modules
  return record as unknown as PathConfig & { modules: ModuleConfig[] } & { id: string }
}

function buildEmbedUrl(params: {
  readonly siteUrl: string
  readonly pathId: string
  readonly moduleId: string
  readonly lessonId: string
}): string {
  const siteUrl = normalizeBaseUrl(params.siteUrl)
  return `${siteUrl}/en/learning/${params.pathId}/${params.moduleId}/${params.lessonId}`
}

function getLessonTitleForLanguage(lesson: LessonConfig, language: SupportedDiscourseLang): string {
  if (language === 'ro') {
    return lesson.title?.ro ?? lesson.title?.en ?? lesson.id
  }
  return lesson.title?.en ?? lesson.title?.ro ?? lesson.id
}

function buildLessonMdxPath(contentDir: string, locale: SupportedDiscourseLang): string {
  return path.join(LEARNING_MODULES_ROOT, contentDir, `index.${locale}.mdx`)
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

async function readLessonDiscussionContent(params: {
  readonly lesson: LessonConfig
  readonly discourseLang: SupportedDiscourseLang
}): Promise<LessonDiscussionContent> {
  const contentDir = params.lesson.contentDir?.trim()
  if (!contentDir) {
    throw new Error(`Lesson "${params.lesson.id}" is missing contentDir`)
  }

  const fallbackLocales = DISCUSSION_CONTENT_LOCALE_FALLBACK_ORDER[params.discourseLang]
  const attemptedPaths: string[] = []

  for (const locale of fallbackLocales) {
    const mdxPath = buildLessonMdxPath(contentDir, locale)
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
        lessonExcerpt: truncateDiscussionText(normalizedText, DISCUSSION_LESSON_EXCERPT_MAX_CHARS),
      }
    } catch (error) {
      const errno = error as NodeJS.ErrnoException
      if (errno.code === 'ENOENT') {
        continue
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Failed to read lesson content for "${params.lesson.id}" from ${path.relative(PROJECT_ROOT, mdxPath)}: ${message}`,
        { cause: error },
      )
    }
  }

  throw new Error(
    `No lesson content file found for "${params.lesson.id}" in locales [${fallbackLocales.join(', ')}] (${attemptedPaths.join(', ')})`
  )
}

function buildThreadBody(params: {
  readonly language: SupportedDiscourseLang
  readonly lessonTitle: string
  readonly embedUrl: string
  readonly lessonExcerpt: string
  readonly excerptLocale: SupportedDiscourseLang
}): string {
  if (params.language === 'ro') {
    const localeNote =
      params.excerptLocale === 'ro'
        ? null
        : 'Notă: conținutul lecției în română nu este disponibil; s-a folosit versiunea în engleză.'
    return [
      `Fir de discuții pentru "${params.lessonTitle}".`,
      '',
      `Lecție sursă: ${params.embedUrl}`,
      '',
      '## Context din lecție',
      '',
      params.lessonExcerpt,
      '',
      ...(localeNote ? [localeNote, ''] : []),
      'Răspunsurile sunt gestionate pe forum; comentariile pot fi afișate în pagina lecției.',
    ].join('\n')
  }

  const localeNote =
    params.excerptLocale === 'en'
      ? null
      : 'Note: English lesson content is not available; using the Romanian lesson content.'
  return [
    `Discussion thread for "${params.lessonTitle}".`,
    '',
    `Source lesson: ${params.embedUrl}`,
    '',
    '## Lesson context',
    '',
    params.lessonExcerpt,
    '',
    ...(localeNote ? [localeNote, ''] : []),
    'Replies are managed on the forum; comments can be embedded in the learning lesson page.',
  ].join('\n')
}

function extractTopicRef(rawPayload: unknown): DiscourseTopicRef | null {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return null
  }

  const record = rawPayload as Record<string, unknown>
  const nestedTopic = record.topic && typeof record.topic === 'object' ? (record.topic as Record<string, unknown>) : null

  const topicIdCandidate = [record.topic_id, nestedTopic?.id, record.id].find((value) => typeof value === 'number')
  if (typeof topicIdCandidate !== 'number' || !Number.isInteger(topicIdCandidate) || topicIdCandidate <= 0) {
    return null
  }

  const topicSlugCandidate = [record.topic_slug, nestedTopic?.slug, record.slug].find((value) => typeof value === 'string')

  return {
    topicId: topicIdCandidate,
    topicSlug: typeof topicSlugCandidate === 'string' && topicSlugCandidate.trim().length > 0 ? topicSlugCandidate : null,
  }
}

function getApiHeaders(apiKey: string, apiUsername: string, discourseLang: SupportedDiscourseLang): Record<string, string> {
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
    params.discourseLang
  )
  if (params.contentType) {
    headers['Content-Type'] = params.contentType
  }
  if (params.contentLanguage) {
    headers['Content-Language'] = params.contentLanguage
  }

  const response = await fetch(params.endpoint, {
    method: params.method,
    headers,
    body: params.body,
  })

  if (response.status !== 403) {
    return response
  }

  const queryAuthEndpoint = addQueryAuth(params.endpoint, params.apiKey, params.apiUsername)
  return fetch(queryAuthEndpoint, {
    method: params.method,
    headers,
    body: params.body,
  })
}

function normalizeContent(value: string): string {
  return value.replace(/\r\n/g, '\n').trim()
}

function readTopicSlug(record: Record<string, unknown>): string | null {
  return typeof record.slug === 'string' && record.slug.trim().length > 0 ? record.slug : null
}

function parseTopicDetails(rawPayload: unknown): DiscourseTopicDetails {
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Discourse topic details payload is not an object')
  }

  const payload = rawPayload as Record<string, unknown>
  const topicTitle =
    typeof payload.title === 'string' && payload.title.trim().length > 0 ? payload.title : null
  const topicSlug = readTopicSlug(payload)

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
    const postId = typeof postRecord.id === 'number' && Number.isInteger(postRecord.id) ? postRecord.id : null
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

  return { topicSlug, topicTitle, firstPostId }
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

async function createTopicForLesson(params: {
  readonly discourseBaseUrl: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly categoryId: number | null
  readonly lessonTitle: string
  readonly embedUrl: string
  readonly rawBody: string
  readonly discourseLang: SupportedDiscourseLang
}): Promise<DiscourseTopicRef> {
  const endpoint = new URL('/posts.json', `${params.discourseBaseUrl}/`)

  const createWithCategory = async (categoryId: number | null): Promise<DiscourseTopicRef> => {
    const requestBody: Record<string, unknown> = {
      title: params.lessonTitle,
      raw: params.rawBody,
      embed_url: params.embedUrl,
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

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Failed to create topic for ${params.embedUrl} (${response.status}): ${body}`)
    }

    const payload = await response.json()
    const topic = extractTopicRef(payload)
    if (!topic) {
      throw new Error(`Topic creation succeeded but response did not include topic id for ${params.embedUrl}`)
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
      `Category ${params.categoryId} is reserved for ${params.embedUrl}. Retrying without category...`
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

async function updateTopicTitle(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly title: string
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
      body: JSON.stringify({ title: params.title }),
    })

    if (response.ok) {
      return
    }

    const body = await response.text()
    lastError = `${route} (${response.status}): ${body}`
    if (response.status !== 404) {
      break
    }
  }

  throw new Error(`Failed to update title for topic ${params.topicId}: ${lastError}`)
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
      `Failed to update post ${params.postId} with JSON (${jsonResponse.status}) and form fallback (${formResponse.status}): ${formError}`
    )
  }
}

async function syncExistingTopicContent(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly expectedTitle: string
  readonly expectedBody: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly discourseLang: SupportedDiscourseLang
  readonly write: boolean
}): Promise<ExistingTopicContentSyncResult> {
  const details = await getTopicDetails({
    discourseBaseUrl: params.discourseBaseUrl,
    topicId: params.topicId,
    apiKey: params.apiKey,
    apiUsername: params.apiUsername,
    discourseLang: params.discourseLang,
  })

  let titleUpdated = false
  const shouldUpdateTitle =
    details.topicTitle === null || normalizeContent(details.topicTitle) !== normalizeContent(params.expectedTitle)
  if (shouldUpdateTitle) {
    if (params.write) {
      await updateTopicTitle({
        discourseBaseUrl: params.discourseBaseUrl,
        topicId: params.topicId,
        title: params.expectedTitle,
        apiKey: params.apiKey,
        apiUsername: params.apiUsername,
        discourseLang: params.discourseLang,
      })
    }
    titleUpdated = true
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
    currentRawBody === null || normalizeContent(currentRawBody) !== normalizeContent(params.expectedBody)
  let bodyUpdated = false
  if (shouldUpdateBody) {
    if (params.write) {
      await updatePostRaw({
        discourseBaseUrl: params.discourseBaseUrl,
        postId: details.firstPostId,
        rawBody: params.expectedBody,
        apiKey: params.apiKey,
        apiUsername: params.apiUsername,
        discourseLang: params.discourseLang,
      })
    }
    bodyUpdated = true
  }

  return {
    topicSlug: details.topicSlug,
    titleUpdated,
    bodyUpdated,
  }
}

async function readPathConfig(pathId: string): Promise<{ readonly filePath: string; readonly config: PathConfig }> {
  const filePath = path.join(LEARNING_PATHS_ROOT, `${pathId}.json`)
  const source = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(source) as unknown
  return {
    filePath,
    config: assertPathConfig(parsed, filePath),
  }
}

async function syncPathTopics(params: {
  readonly config: PathConfig
  readonly filePath: string
  readonly siteUrl: string
  readonly discourseBaseUrl: string
  readonly apiKey: string
  readonly apiUsername: string
  readonly categoryId: number | null
  readonly discourseLang: SupportedDiscourseLang
  readonly write: boolean
  readonly updateExistingContent: boolean
}): Promise<{
  readonly touchedLessons: number
  readonly updatedLessons: number
  readonly createdTopics: number
  readonly updatedExistingTopicContent: number
  readonly wroteFile: boolean
}> {
  let touchedLessons = 0
  let updatedLessons = 0
  let createdTopics = 0
  let updatedExistingTopicContent = 0
  const lessonDiscussionContentCache = new Map<string, LessonDiscussionContent>()
  let hasChanges = false

  for (const moduleConfig of params.config.modules) {
    for (const lesson of moduleConfig.lessons) {
      touchedLessons += 1

      const embedUrl = buildEmbedUrl({
        siteUrl: params.siteUrl,
        pathId: params.config.id,
        moduleId: moduleConfig.id,
        lessonId: lesson.id,
      })

      const lessonTitle = getLessonTitleForLanguage(lesson, params.discourseLang)
      const lessonContentCacheKey = `${params.discourseLang}:${lesson.contentDir ?? ''}`
      let lessonDiscussionContent = lessonDiscussionContentCache.get(lessonContentCacheKey)
      if (!lessonDiscussionContent) {
        lessonDiscussionContent = await readLessonDiscussionContent({
          lesson,
          discourseLang: params.discourseLang,
        })
        lessonDiscussionContentCache.set(lessonContentCacheKey, lessonDiscussionContent)
      }

      const expectedThreadBody = buildThreadBody({
        language: params.discourseLang,
        lessonTitle,
        embedUrl,
        lessonExcerpt: lessonDiscussionContent.lessonExcerpt,
        excerptLocale: lessonDiscussionContent.contentLocale,
      })

      let topic = await findTopicByEmbedUrl({
        discourseBaseUrl: params.discourseBaseUrl,
        embedUrl,
        apiKey: params.apiKey,
        apiUsername: params.apiUsername,
        discourseLang: params.discourseLang,
      })

      let created = false
      if (!topic) {
        topic = await createTopicForLesson({
          discourseBaseUrl: params.discourseBaseUrl,
          apiKey: params.apiKey,
          apiUsername: params.apiUsername,
          categoryId: params.categoryId,
          lessonTitle,
          embedUrl,
          rawBody: expectedThreadBody,
          discourseLang: params.discourseLang,
        })
        created = true
        createdTopics += 1
      }

      let existingTopicContentUpdated = false
      if (params.updateExistingContent && !created) {
        const contentUpdateResult = await syncExistingTopicContent({
          discourseBaseUrl: params.discourseBaseUrl,
          topicId: topic.topicId,
          expectedTitle: lessonTitle,
          expectedBody: expectedThreadBody,
          apiKey: params.apiKey,
          apiUsername: params.apiUsername,
          discourseLang: params.discourseLang,
          write: params.write,
        })

        if (contentUpdateResult.topicSlug) {
          topic = {
            topicId: topic.topicId,
            topicSlug: contentUpdateResult.topicSlug,
          }
        }

        existingTopicContentUpdated = contentUpdateResult.titleUpdated || contentUpdateResult.bodyUpdated
        if (existingTopicContentUpdated) {
          updatedExistingTopicContent += 1
        }
      }

      let lessonUpdated = false
      if (lesson.discourseTopicId !== topic.topicId) {
        lesson.discourseTopicId = topic.topicId
        lessonUpdated = true
      }
      if (topic.topicSlug && lesson.discourseTopicSlug !== topic.topicSlug) {
        lesson.discourseTopicSlug = topic.topicSlug
        lessonUpdated = true
      }

      if (lessonUpdated) {
        hasChanges = true
        updatedLessons += 1
      }

      const updateState = lessonUpdated ? 'updated' : 'unchanged'
      const creationState = created ? 'created' : 'existing'
      const contentSyncState = params.updateExistingContent
        ? existingTopicContentUpdated
          ? params.write
            ? ', topic-content-updated'
            : ', topic-content-would-update'
          : ', topic-content-unchanged'
        : ''
      const localeState =
        lessonDiscussionContent.contentLocale === params.discourseLang
          ? ''
          : `, content-locale-fallback:${lessonDiscussionContent.contentLocale}`
      console.log(
        `- ${params.config.id}/${moduleConfig.id}/${lesson.id}: topic ${topic.topicId} (${creationState}, ${updateState}${contentSyncState}${localeState})`
      )
    }
  }

  let wroteFile = false
  if (hasChanges && params.write) {
    await fs.writeFile(params.filePath, `${JSON.stringify(params.config, null, 2)}\n`, 'utf8')
    wroteFile = true
  }

  return { touchedLessons, updatedLessons, createdTopics, wroteFile, updatedExistingTopicContent }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const discourseBaseUrl = normalizeBaseUrl(readRequiredEnv('DISCOURSE_BASE_URL'))
  const apiKey = readRequiredEnv('DISCOURSE_API_KEY')
  const apiUsername = readRequiredEnv('DISCOURSE_API_USERNAME')
  const discourseLang = resolveDiscourseLang(process.env.DISCOURSE_LANG)
  const categoryIdRaw = process.env.DISCOURSE_CATEGORY_ID?.trim()
  const categoryId = categoryIdRaw ? parsePositiveInteger(categoryIdRaw, 'DISCOURSE_CATEGORY_ID') : null
  const siteUrl = normalizeBaseUrl(
    process.env.VITE_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      DEFAULT_SITE_URL
  )

  console.log(`Mode: ${options.write ? 'write' : 'dry-run'}`)
  console.log(`Site URL: ${siteUrl}`)
  console.log(`Discourse URL: ${discourseBaseUrl}`)
  console.log(`Discourse language: ${discourseLang}`)
  console.log(`Discourse category: ${categoryId ?? 'default (none provided)'}`)
  console.log(
    `Update existing topic content: ${options.updateExistingContent ? (options.write ? 'enabled' : 'preview only') : 'disabled'}`
  )
  console.log(`Paths: ${options.pathIds.join(', ')}`)
  console.log('')

  let totalTouchedLessons = 0
  let totalUpdatedLessons = 0
  let totalCreatedTopics = 0
  let totalUpdatedExistingTopicContent = 0
  let totalWrittenFiles = 0

  for (const pathId of options.pathIds) {
    const { filePath, config } = await readPathConfig(pathId)
    console.log(`Syncing ${path.basename(filePath)}...`)

    const result = await syncPathTopics({
      config,
      filePath,
      siteUrl,
      discourseBaseUrl,
      apiKey,
      apiUsername,
      categoryId,
      discourseLang,
      write: options.write,
      updateExistingContent: options.updateExistingContent,
    })

    totalTouchedLessons += result.touchedLessons
    totalUpdatedLessons += result.updatedLessons
    totalCreatedTopics += result.createdTopics
    totalUpdatedExistingTopicContent += result.updatedExistingTopicContent
    if (result.wroteFile) {
      totalWrittenFiles += 1
      console.log(`✓ Updated ${path.basename(filePath)}`)
    } else if (result.updatedLessons > 0) {
      console.log(`• Would update ${path.basename(filePath)} (run with --write to persist)`)
    } else if (result.updatedExistingTopicContent > 0) {
      if (options.write) {
        console.log(`✓ Updated existing topic content for ${path.basename(filePath)}`)
      } else {
        console.log(`• Would update existing topic content for ${path.basename(filePath)} (run with --write to persist)`)
      }
    } else {
      console.log(`• No changes for ${path.basename(filePath)}`)
    }

    console.log('')
  }

  console.log('Summary')
  console.log(`- Lessons processed: ${totalTouchedLessons}`)
  console.log(`- Lessons updated: ${totalUpdatedLessons}`)
  console.log(`- Topics created: ${totalCreatedTopics}`)
  console.log(`- Existing topic content updates: ${totalUpdatedExistingTopicContent}`)
  console.log(`- Path files written: ${totalWrittenFiles}`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Discourse topic sync failed: ${message}`)
  process.exitCode = 1
})
