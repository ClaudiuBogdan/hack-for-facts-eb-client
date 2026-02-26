import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { compileSync } from '@mdx-js/mdx'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'

type LessonReference = {
  readonly pathFile: string
  readonly pathId: string
  readonly moduleId: string
  readonly lessonId: string
  readonly contentDir: string
}

type TranslatedString = {
  readonly en: string
  readonly ro: string
}

type LessonDefinition = {
  readonly pathFile: string
  readonly pathId: string
  readonly moduleId: string
  readonly lessonId: string
  readonly slug: string | null
  readonly title: TranslatedString | null
  readonly contentDir: string
  readonly completionMode: string | null
  readonly durationMinutes: number | null
  readonly prerequisites: readonly string[]
  readonly discourseTopicId: number | null
  readonly discourseTopicSlug: string | null
}

type ModuleDefinition = {
  readonly pathFile: string
  readonly pathId: string
  readonly moduleId: string
  readonly slug: string | null
  readonly title: TranslatedString | null
  readonly description: TranslatedString | null
  readonly lessonIds: readonly string[]
}

type PathDefinition = {
  readonly pathFile: string
  readonly pathId: string
  readonly slug: string | null
  readonly title: TranslatedString | null
  readonly description: TranslatedString | null
  readonly difficulty: string | null
  readonly modules: readonly ModuleDefinition[]
  readonly lessons: readonly LessonDefinition[]
  readonly requiredModuleIds: readonly string[]
}

type OnboardingOptionDefinition = {
  readonly optionId: string
  readonly nextNodeId: string | null
  readonly pathId: string | null
  readonly set: Record<string, string> | null
}

type OnboardingChoiceNodeDefinition = {
  readonly nodeId: string
  readonly type: 'choice'
  readonly options: readonly OnboardingOptionDefinition[]
}

type OnboardingResultNodeDefinition = {
  readonly nodeId: string
  readonly type: 'result'
  readonly pathId: string | null
  readonly pathIdFrom: string | null
}

type OnboardingNodeDefinition = OnboardingChoiceNodeDefinition | OnboardingResultNodeDefinition

type OnboardingTreeDefinition = {
  readonly pathFile: string
  readonly rootNodeId: string | null
  readonly nodes: readonly OnboardingNodeDefinition[]
}

type MdxFrontmatter = {
  readonly title?: string
  readonly durationMinutes?: number
  readonly concept?: string
  readonly objective?: string
}

type ValidationContext = {
  readonly mdxIndex: Map<string, Set<string>>
  readonly mdxSourceByPath: Map<string, string>
  readonly mdxContentByPath: Map<string, string>
  readonly frontmatterByPath: Map<string, MdxFrontmatter>
  readonly pathEntries: readonly PathDefinition[]
  readonly lessonRefs: readonly LessonReference[]
  readonly contentDirUsage: Map<string, LessonReference[]>
  readonly parseIssues: readonly string[]
  readonly onboardingTree: OnboardingTreeDefinition | null
  readonly onboardingParseIssues: readonly string[]
  readonly requiredLocales: readonly string[]
  readonly optionalLocales: readonly string[]
}

type ValidationResult = {
  readonly errors: string[]
  readonly warnings: string[]
}

type ValidationRule = {
  readonly name: string
  readonly run: (context: ValidationContext) => ValidationResult
}

const PROJECT_ROOT = process.cwd()
const LEARNING_ROOT = path.join(PROJECT_ROOT, 'src', 'content', 'learning')
const MODULES_ROOT = path.join(LEARNING_ROOT, 'modules')
const PATHS_ROOT = path.join(LEARNING_ROOT, 'paths')
const ONBOARDING_TREE_FILE = path.join(LEARNING_ROOT, 'onboarding-tree.json')

// Required locales must exist for every referenced module; optional locales only warn.
const REQUIRED_LOCALES = ['en'] as const
const OPTIONAL_LOCALES = ['ro'] as const

const DIFFICULTY_LEVELS = new Set(['beginner', 'intermediate', 'advanced'])
const COMPLETION_MODES = new Set(['quiz', 'mark_complete'])
const COMPLETION_COMPONENTS: Record<string, string> = {
  quiz: 'Quiz',
  mark_complete: 'MarkComplete',
}
// Optional path-level requirement keys for future validation rules.
const REQUIRED_MODULE_KEYS = ['requiredModuleIds', 'requiredModules'] as const
const MODULE_INDEX_FILE_REGEX = /^index\.(.+)\.mdx$/

function normalizeContentDir(value: string): string {
  // Normalize contentDir for cross-platform path comparisons.
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function readStringProperty(entry: unknown, propertyName: string): string | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }
  const record = entry as Record<string, unknown>
  if (!(propertyName in record)) {
    return null
  }
  const value = record[propertyName]
  return isNonEmptyString(value) ? value : null
}

function hasProperty(entry: unknown, propertyName: string): boolean {
  return Boolean(entry && typeof entry === 'object' && propertyName in (entry as Record<string, unknown>))
}

function readNumberProperty(entry: unknown, propertyName: string): number | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }
  const record = entry as Record<string, unknown>
  if (!(propertyName in record)) {
    return null
  }
  const value = record[propertyName]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readPositiveIntegerProperty(entry: unknown, propertyName: string): { readonly value: number | null; readonly invalid: boolean } {
  if (!entry || typeof entry !== 'object') {
    return { value: null, invalid: false }
  }
  const record = entry as Record<string, unknown>
  if (!(propertyName in record)) {
    return { value: null, invalid: false }
  }

  const value = record[propertyName]
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return { value, invalid: false }
  }

  return { value: null, invalid: true }
}

function readStringArray(value: unknown): { readonly values: string[]; readonly invalid: boolean } {
  if (value === undefined) {
    return { values: [], invalid: false }
  }
  if (!Array.isArray(value)) {
    return { values: [], invalid: true }
  }
  const values = value.filter((item) => isNonEmptyString(item))
  return { values, invalid: values.length !== value.length }
}

function readStringArrayProperty(entry: unknown, propertyName: string): { readonly values: string[]; readonly invalid: boolean } {
  if (!entry || typeof entry !== 'object') {
    return { values: [], invalid: false }
  }
  const record = entry as Record<string, unknown>
  if (!(propertyName in record)) {
    return { values: [], invalid: false }
  }
  return readStringArray(record[propertyName])
}

function readStringRecordProperty(
  entry: unknown,
  propertyName: string
): { readonly value: Record<string, string | string[]> | null; readonly invalid: boolean } {
  if (!entry || typeof entry !== 'object') {
    return { value: null, invalid: false }
  }
  const record = entry as Record<string, unknown>
  if (!(propertyName in record)) {
    return { value: null, invalid: false }
  }
  const raw = record[propertyName]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { value: null, invalid: true }
  }

  const next: Record<string, string | string[]> = {}
  let invalid = false

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isNonEmptyString(value)) {
      next[key] = value
    } else if (Array.isArray(value) && value.every((item) => isNonEmptyString(item))) {
      next[key] = value as string[]
    } else {
      invalid = true
    }
  }

  return { value: next, invalid }
}

function readTranslatedStringProperty(
  entry: unknown,
  propertyName: string
): { readonly value: TranslatedString | null; readonly invalid: boolean } {
  if (!entry || typeof entry !== 'object') {
    return { value: null, invalid: false }
  }
  const record = entry as Record<string, unknown>
  if (!(propertyName in record)) {
    return { value: null, invalid: false }
  }

  const raw = record[propertyName]
  if (!raw || typeof raw !== 'object') {
    return { value: null, invalid: true }
  }

  const translated = raw as Record<string, unknown>
  const en = translated.en
  const ro = translated.ro

  if (!isNonEmptyString(en) || !isNonEmptyString(ro)) {
    return { value: null, invalid: true }
  }

  return { value: { en, ro }, invalid: false }
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)))
      continue
    }
    if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

async function collectMdxIndex(): Promise<Map<string, Set<string>>> {
  // Index MDX files by contentDir using the index.<locale>.mdx convention.
  const files = await walkFiles(MODULES_ROOT)
  const mdxIndex = new Map<string, Set<string>>()

  for (const filePath of files) {
    const fileName = path.basename(filePath)
    const match = fileName.match(MODULE_INDEX_FILE_REGEX)
    if (!match) {
      continue
    }

    const locale = match[1]
    const contentDir = normalizeContentDir(path.relative(MODULES_ROOT, path.dirname(filePath)))
    if (!contentDir) {
      continue
    }

    const locales = mdxIndex.get(contentDir) ?? new Set<string>()
    locales.add(locale)
    mdxIndex.set(contentDir, locales)
  }

  return mdxIndex
}

function getMdxFilePath(contentDir: string, locale: string): string {
  return path.join(MODULES_ROOT, contentDir, `index.${locale}.mdx`)
}

function hasPathTraversal(value: string): boolean {
  return value.split('/').includes('..')
}

function hasMdxComponent(source: string, componentName: string): boolean {
  const pattern = new RegExp(`<${componentName}\\b`)
  return pattern.test(source)
}

async function collectMdxSources(mdxIndex: Map<string, Set<string>>): Promise<{
  readonly mdxSourceByPath: Map<string, string>
  readonly mdxContentByPath: Map<string, string>
  readonly frontmatterByPath: Map<string, MdxFrontmatter>
  readonly readIssues: string[]
}> {
  const mdxSourceByPath = new Map<string, string>()
  const mdxContentByPath = new Map<string, string>()
  const frontmatterByPath = new Map<string, MdxFrontmatter>()
  const readIssues: string[] = []

  for (const [contentDir, locales] of mdxIndex.entries()) {
    for (const locale of locales) {
      const mdxPath = getMdxFilePath(contentDir, locale)
      try {
        const source = await fs.readFile(mdxPath, 'utf8')
        mdxSourceByPath.set(mdxPath, source)

        // Parse frontmatter
        const parsed = matter(source)
        mdxContentByPath.set(mdxPath, parsed.content)
        frontmatterByPath.set(mdxPath, parsed.data as MdxFrontmatter)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error'
        readIssues.push(`${path.relative(PROJECT_ROOT, mdxPath)}: Failed to read MDX (${message})`)
      }
    }
  }

  return { mdxSourceByPath, mdxContentByPath, frontmatterByPath, readIssues }
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as unknown
}

async function collectPathContent(): Promise<{
  readonly pathEntries: PathDefinition[]
  readonly lessonRefs: LessonReference[]
  readonly parseIssues: string[]
}> {
  const entries = await fs.readdir(PATHS_ROOT, { withFileTypes: true })
  const pathFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  const pathEntries: PathDefinition[] = []
  const lessonRefs: LessonReference[] = []
  const parseIssues: string[] = []

  for (const entry of pathFiles) {
    const filePath = path.join(PATHS_ROOT, entry.name)
    const relativePath = path.relative(PROJECT_ROOT, filePath)
    let data: unknown

    try {
      data = await readJson(filePath)
    } catch (error) {
      parseIssues.push(`${relativePath}: Failed to parse JSON (${error instanceof Error ? error.message : 'unknown error'})`)
      continue
    }

    const pathIdValue = readStringProperty(data, 'id')
    const pathId = pathIdValue ?? entry.name.replace(/\.json$/, '')
    if (!pathIdValue) {
      parseIssues.push(`${relativePath}: path is missing "id"`)
    }

    const pathSlug = readStringProperty(data, 'slug')
    if (!pathSlug) {
      parseIssues.push(`${relativePath}: path "${pathId}" is missing "slug"`)
    }

    const pathTitleResult = readTranslatedStringProperty(data, 'title')
    if (!pathTitleResult.value || pathTitleResult.invalid) {
      parseIssues.push(`${relativePath}: path "${pathId}" has invalid "title" (requires en/ro strings)`)
    }

    const pathDescriptionResult = readTranslatedStringProperty(data, 'description')
    if (!pathDescriptionResult.value || pathDescriptionResult.invalid) {
      parseIssues.push(`${relativePath}: path "${pathId}" has invalid "description" (requires en/ro strings)`)
    }

    const difficulty = readStringProperty(data, 'difficulty')
    if (!difficulty || !DIFFICULTY_LEVELS.has(difficulty)) {
      parseIssues.push(`${relativePath}: path "${pathId}" has invalid "difficulty" "${difficulty ?? 'missing'}"`)
    }

    const requiredModuleIds = new Set<string>()
    for (const key of REQUIRED_MODULE_KEYS) {
      const requiredModulesResult = readStringArrayProperty(data, key)
      if (requiredModulesResult.invalid) {
        parseIssues.push(`${relativePath}: "${key}" must be an array of strings`)
      }
      requiredModulesResult.values.forEach((value) => requiredModuleIds.add(value))
    }

    const modules = data && typeof data === 'object' ? (data as Record<string, unknown>).modules : null
    if (!Array.isArray(modules)) {
      parseIssues.push(`${relativePath}: "modules" must be an array`)
      continue
    }

    const moduleEntries: ModuleDefinition[] = []
    const lessonEntries: LessonDefinition[] = []

    modules.forEach((moduleEntry, moduleIndex) => {
      const moduleIdValue = readStringProperty(moduleEntry, 'id')
      const moduleId = moduleIdValue ?? `module-${moduleIndex}`
      if (!moduleIdValue) {
        parseIssues.push(`${relativePath}: module at index ${moduleIndex} is missing "id"`)
      }

      const moduleSlug = readStringProperty(moduleEntry, 'slug')
      if (!moduleSlug) {
        parseIssues.push(`${relativePath}: module "${moduleId}" is missing "slug"`)
      }

      const moduleTitleResult = readTranslatedStringProperty(moduleEntry, 'title')
      if (!moduleTitleResult.value || moduleTitleResult.invalid) {
        parseIssues.push(`${relativePath}: module "${moduleId}" has invalid "title" (requires en/ro strings)`)
      }

      const moduleDescriptionResult = readTranslatedStringProperty(moduleEntry, 'description')
      if (!moduleDescriptionResult.value || moduleDescriptionResult.invalid) {
        parseIssues.push(`${relativePath}: module "${moduleId}" has invalid "description" (requires en/ro strings)`)
      }

      const lessons =
        moduleEntry && typeof moduleEntry === 'object' ? (moduleEntry as Record<string, unknown>).lessons : null
      if (!Array.isArray(lessons)) {
        parseIssues.push(`${relativePath}: module "${moduleId}" is missing a lessons array`)
        return
      }

      const lessonIds: string[] = []

      lessons.forEach((lesson, lessonIndex) => {
        const lessonIdValue = readStringProperty(lesson, 'id')
        const lessonId = lessonIdValue ?? `lesson-${lessonIndex}`
        if (!lessonIdValue) {
          parseIssues.push(`${relativePath}: lesson at index ${lessonIndex} in module "${moduleId}" is missing "id"`)
        }

        const lessonSlug = readStringProperty(lesson, 'slug')
        if (!lessonSlug) {
          parseIssues.push(`${relativePath}: lesson "${lessonId}" in module "${moduleId}" is missing "slug"`)
        }

        const lessonTitleResult = readTranslatedStringProperty(lesson, 'title')
        if (!lessonTitleResult.value || lessonTitleResult.invalid) {
          parseIssues.push(`${relativePath}: lesson "${lessonId}" in module "${moduleId}" has invalid "title" (requires en/ro strings)`)
        }

        const contentDirValue = readStringProperty(lesson, 'contentDir')
        const contentDir = contentDirValue ? normalizeContentDir(contentDirValue) : ''
        if (!contentDir) {
          parseIssues.push(`${relativePath}: lesson "${lessonId}" in module "${moduleId}" is missing contentDir`)
        } else {
          if (path.isAbsolute(contentDirValue ?? '')) {
            parseIssues.push(`${relativePath}: lesson "${lessonId}" in module "${moduleId}" has an absolute contentDir path`)
          }
          if (hasPathTraversal(contentDir)) {
            parseIssues.push(`${relativePath}: lesson "${lessonId}" in module "${moduleId}" has invalid contentDir "${contentDir}"`)
          }
        }

        const prerequisitesResult = readStringArrayProperty(lesson, 'prerequisites')
        if (prerequisitesResult.invalid) {
          parseIssues.push(
            `${relativePath}: lesson "${lessonId}" in module "${moduleId}" has invalid prerequisites (must be strings)`
          )
        }

        const completionMode = readStringProperty(lesson, 'completionMode')
        const durationMinutes = readNumberProperty(lesson, 'durationMinutes')
        const discourseTopicIdResult = readPositiveIntegerProperty(lesson, 'discourseTopicId')
        if (discourseTopicIdResult.invalid) {
          parseIssues.push(
            `${relativePath}: lesson "${lessonId}" in module "${moduleId}" has invalid discourseTopicId (must be a positive integer)`
          )
        }

        const discourseTopicSlug = readStringProperty(lesson, 'discourseTopicSlug')
        if (hasProperty(lesson, 'discourseTopicSlug') && !discourseTopicSlug) {
          parseIssues.push(
            `${relativePath}: lesson "${lessonId}" in module "${moduleId}" has invalid discourseTopicSlug (must be a non-empty string)`
          )
        }

        lessonIds.push(lessonId)
        lessonEntries.push({
          pathFile: relativePath,
          pathId,
          moduleId,
          lessonId,
          slug: lessonSlug,
          title: lessonTitleResult.value,
          contentDir,
          completionMode,
          durationMinutes,
          prerequisites: prerequisitesResult.values,
          discourseTopicId: discourseTopicIdResult.value,
          discourseTopicSlug,
        })

        if (contentDir) {
          lessonRefs.push({
            pathFile: relativePath,
            pathId,
            moduleId,
            lessonId,
            contentDir,
          })
        }
      })

      moduleEntries.push({
        pathFile: relativePath,
        pathId,
        moduleId,
        slug: moduleSlug,
        title: moduleTitleResult.value,
        description: moduleDescriptionResult.value,
        lessonIds,
      })
    })

    pathEntries.push({
      pathFile: relativePath,
      pathId,
      slug: pathSlug,
      title: pathTitleResult.value,
      description: pathDescriptionResult.value,
      difficulty,
      modules: moduleEntries,
      lessons: lessonEntries,
      requiredModuleIds: Array.from(requiredModuleIds),
    })
  }

  return { pathEntries, lessonRefs, parseIssues }
}

async function collectOnboardingTree(): Promise<{
  readonly onboardingTree: OnboardingTreeDefinition | null
  readonly parseIssues: string[]
}> {
  const parseIssues: string[] = []
  const relativePath = path.relative(PROJECT_ROOT, ONBOARDING_TREE_FILE)
  let data: unknown

  try {
    data = await readJson(ONBOARDING_TREE_FILE)
  } catch (error) {
    parseIssues.push(`${relativePath}: Failed to parse JSON (${error instanceof Error ? error.message : 'unknown error'})`)
    return { onboardingTree: null, parseIssues }
  }

  const treeId = readStringProperty(data, 'id')
  if (!treeId) {
    parseIssues.push(`${relativePath}: onboarding tree is missing "id"`)
  }

  const version = readNumberProperty(data, 'version')
  if (!version || !Number.isInteger(version) || version <= 0) {
    parseIssues.push(`${relativePath}: onboarding tree has invalid "version" "${version ?? 'missing'}"`)
  }

  const rootNodeId = readStringProperty(data, 'rootNodeId')
  if (!rootNodeId) {
    parseIssues.push(`${relativePath}: onboarding tree is missing "rootNodeId"`)
  }

  const nodes = data && typeof data === 'object' ? (data as Record<string, unknown>).nodes : null
  if (!Array.isArray(nodes)) {
    parseIssues.push(`${relativePath}: onboarding tree "nodes" must be an array`)
    return { onboardingTree: null, parseIssues }
  }

  const nodeEntries: OnboardingNodeDefinition[] = []
  const nodeIds = new Set<string>()

  nodes.forEach((nodeEntry, nodeIndex) => {
    const nodeIdValue = readStringProperty(nodeEntry, 'id')
    const nodeId = nodeIdValue ?? `node-${nodeIndex}`
    if (!nodeIdValue) {
      parseIssues.push(`${relativePath}: onboarding node at index ${nodeIndex} is missing "id"`)
    }

    if (nodeIds.has(nodeId)) {
      parseIssues.push(`${relativePath}: duplicate onboarding node id "${nodeId}"`)
    }
    nodeIds.add(nodeId)

    const nodeType = readStringProperty(nodeEntry, 'type')
    if (nodeType !== 'choice' && nodeType !== 'result') {
      parseIssues.push(`${relativePath}: onboarding node "${nodeId}" has invalid "type" "${nodeType ?? 'missing'}"`)
      return
    }

    if (nodeType === 'choice') {
      const promptResult = readTranslatedStringProperty(nodeEntry, 'prompt')
      if (!promptResult.value || promptResult.invalid) {
        parseIssues.push(`${relativePath}: onboarding node "${nodeId}" has invalid "prompt" (requires en/ro strings)`)
      }

      const descriptionResult = readTranslatedStringProperty(nodeEntry, 'description')
      if (descriptionResult.invalid) {
        parseIssues.push(`${relativePath}: onboarding node "${nodeId}" has invalid "description" (requires en/ro strings)`)
      }

      const options =
        nodeEntry && typeof nodeEntry === 'object' ? (nodeEntry as Record<string, unknown>).options : null
      if (!Array.isArray(options)) {
        parseIssues.push(`${relativePath}: onboarding node "${nodeId}" is missing an options array`)
        return
      }

      const optionEntries: OnboardingOptionDefinition[] = []
      const optionIds = new Set<string>()

      options.forEach((optionEntry, optionIndex) => {
        const optionIdValue = readStringProperty(optionEntry, 'id')
        const optionId = optionIdValue ?? `option-${optionIndex}`
        if (!optionIdValue) {
          parseIssues.push(`${relativePath}: onboarding option at index ${optionIndex} in "${nodeId}" is missing "id"`)
        }

        if (optionIds.has(optionId)) {
          parseIssues.push(`${relativePath}: duplicate onboarding option id "${optionId}" in node "${nodeId}"`)
        }
        optionIds.add(optionId)

        const labelResult = readTranslatedStringProperty(optionEntry, 'label')
        if (!labelResult.value || labelResult.invalid) {
          parseIssues.push(`${relativePath}: onboarding option "${optionId}" in "${nodeId}" has invalid "label" (requires en/ro strings)`)
        }

        const optionDescriptionResult = readTranslatedStringProperty(optionEntry, 'description')
        if (optionDescriptionResult.invalid) {
          parseIssues.push(`${relativePath}: onboarding option "${optionId}" in "${nodeId}" has invalid "description" (requires en/ro strings)`)
        }

        const nextNodeId = readStringProperty(optionEntry, 'nextNodeId')
        const pathId = readStringProperty(optionEntry, 'pathId')

        if (!nextNodeId && !pathId) {
          parseIssues.push(`${relativePath}: onboarding option "${optionId}" in "${nodeId}" must define "nextNodeId" or "pathId"`)
        }

        if (nextNodeId && pathId) {
          parseIssues.push(`${relativePath}: onboarding option "${optionId}" in "${nodeId}" cannot define both "nextNodeId" and "pathId"`)
        }

        const setResult = readStringRecordProperty(optionEntry, 'set')
        if (setResult.invalid) {
          parseIssues.push(`${relativePath}: onboarding option "${optionId}" in "${nodeId}" has invalid "set" (values must be strings or string arrays)`)
        }

        optionEntries.push({
          optionId,
          nextNodeId: nextNodeId ?? null,
          pathId: pathId ?? null,
          set: setResult.value,
        })
      })

      nodeEntries.push({
        nodeId,
        type: 'choice',
        options: optionEntries,
      })
      return
    }

    const titleResult = readTranslatedStringProperty(nodeEntry, 'title')
    if (titleResult.invalid) {
      parseIssues.push(`${relativePath}: onboarding node "${nodeId}" has invalid "title" (requires en/ro strings)`)
    }

    const descriptionResult = readTranslatedStringProperty(nodeEntry, 'description')
    if (descriptionResult.invalid) {
      parseIssues.push(`${relativePath}: onboarding node "${nodeId}" has invalid "description" (requires en/ro strings)`)
    }

    const ctaLabelResult = readTranslatedStringProperty(nodeEntry, 'ctaLabel')
    if (ctaLabelResult.invalid) {
      parseIssues.push(`${relativePath}: onboarding node "${nodeId}" has invalid "ctaLabel" (requires en/ro strings)`)
    }

    const pathId = readStringProperty(nodeEntry, 'pathId')
    const pathIdFrom = readStringProperty(nodeEntry, 'pathIdFrom')

    if (!pathId && !pathIdFrom) {
      parseIssues.push(`${relativePath}: onboarding node "${nodeId}" must define "pathId" or "pathIdFrom"`)
    }

    if (pathId && pathIdFrom) {
      parseIssues.push(`${relativePath}: onboarding node "${nodeId}" cannot define both "pathId" and "pathIdFrom"`)
    }

    nodeEntries.push({
      nodeId,
      type: 'result',
      pathId: pathId ?? null,
      pathIdFrom: pathIdFrom ?? null,
    })
  })

  return {
    onboardingTree: {
      pathFile: relativePath,
      rootNodeId,
      nodes: nodeEntries,
    },
    parseIssues,
  }
}

function buildContentDirUsage(lessonRefs: readonly LessonReference[]): Map<string, LessonReference[]> {
  const usage = new Map<string, LessonReference[]>()
  for (const ref of lessonRefs) {
    const entries = usage.get(ref.contentDir) ?? []
    entries.push(ref)
    usage.set(ref.contentDir, entries)
  }
  return usage
}

function formatLessonRefs(lessonRefs: readonly LessonReference[]): string {
  return lessonRefs.map((ref) => `${ref.pathFile} -> ${ref.moduleId}/${ref.lessonId}`).join(', ')
}

// Add new validators here to extend CI checks over learning content.
const VALIDATION_RULES: readonly ValidationRule[] = [
  {
    name: 'path-structure',
    run: (context) => ({
      errors: [...context.parseIssues],
      warnings: [],
    }),
  },
  {
    name: 'onboarding-structure',
    run: (context) => ({
      errors: [...context.onboardingParseIssues],
      warnings: [],
    }),
  },
  {
    name: 'onboarding-references',
    run: (context) => {
      const errors: string[] = []
      const warnings: string[] = []

      const onboardingTree = context.onboardingTree
      if (!onboardingTree) {
        return { errors, warnings }
      }

      const pathIds = new Set(context.pathEntries.map((entry) => entry.pathId))
      const nodeById = new Map<string, OnboardingNodeDefinition>()
      const setKeys = new Set<string>()
      const allowedSetKeys = new Set(['pathId', 'relatedPaths'])

      for (const node of onboardingTree.nodes) {
        nodeById.set(node.nodeId, node)
      }

      for (const node of onboardingTree.nodes) {
        if (node.type !== 'choice') {
          continue
        }
        for (const option of node.options) {
          if (!option.set) {
            continue
          }
          for (const key of Object.keys(option.set)) {
            setKeys.add(key)
          }
        }
      }

      if (onboardingTree.rootNodeId && !nodeById.has(onboardingTree.rootNodeId)) {
        errors.push(
          `${onboardingTree.pathFile}: onboarding rootNodeId "${onboardingTree.rootNodeId}" does not match any node id`
        )
      }

      let hasPathTarget = false

      for (const node of onboardingTree.nodes) {
        if (node.type === 'choice') {
          for (const option of node.options) {
            if (option.nextNodeId && !nodeById.has(option.nextNodeId)) {
              errors.push(
                `${onboardingTree.pathFile}: onboarding option "${option.optionId}" in "${node.nodeId}" references missing node "${option.nextNodeId}"`
              )
            }

            if (option.pathId) {
              hasPathTarget = true
              if (!pathIds.has(option.pathId)) {
                errors.push(
                  `${onboardingTree.pathFile}: onboarding option "${option.optionId}" in "${node.nodeId}" references missing path "${option.pathId}"`
                )
              }
            }

            if (option.set) {
              for (const [key, value] of Object.entries(option.set)) {
                setKeys.add(key)
                if (!allowedSetKeys.has(key)) {
                  warnings.push(
                    `${onboardingTree.pathFile}: onboarding option "${option.optionId}" in "${node.nodeId}" uses unknown set key "${key}"`
                  )
                }
                if (key === 'pathId' && typeof value === 'string') {
                  hasPathTarget = true
                  if (!pathIds.has(value)) {
                    errors.push(
                      `${onboardingTree.pathFile}: onboarding option "${option.optionId}" in "${node.nodeId}" has invalid pathId "${value}"`
                    )
                  }
                }
                if (key === 'relatedPaths' && Array.isArray(value)) {
                  for (const relatedPathId of value) {
                    if (!pathIds.has(relatedPathId)) {
                      errors.push(
                        `${onboardingTree.pathFile}: onboarding option "${option.optionId}" in "${node.nodeId}" references missing relatedPath "${relatedPathId}"`
                      )
                    }
                  }
                }
              }
            }
          }
        } else if (node.type === 'result') {
          if (node.pathId) {
            hasPathTarget = true
            if (!pathIds.has(node.pathId)) {
              errors.push(
                `${onboardingTree.pathFile}: onboarding result "${node.nodeId}" references missing path "${node.pathId}"`
              )
            }
          }

          if (node.pathIdFrom) {
            if (!setKeys.has(node.pathIdFrom)) {
              errors.push(
                `${onboardingTree.pathFile}: onboarding result "${node.nodeId}" references unset key "${node.pathIdFrom}"`
              )
            }
            hasPathTarget = true
          }
        }
      }

      if (!hasPathTarget) {
        errors.push(`${onboardingTree.pathFile}: onboarding tree does not reference any learning paths`)
      }

      if (onboardingTree.rootNodeId && nodeById.has(onboardingTree.rootNodeId)) {
        const visiting = new Set<string>()
        const visited = new Set<string>()
        const stack: string[] = []
        const cycles = new Set<string>()

        const visit = (nodeId: string) => {
          if (visited.has(nodeId)) {
            return
          }
          if (visiting.has(nodeId)) {
            return
          }

          visiting.add(nodeId)
          stack.push(nodeId)

          const node = nodeById.get(nodeId)
          if (node && node.type === 'choice') {
            for (const option of node.options) {
              if (!option.nextNodeId) {
                continue
              }
              if (visiting.has(option.nextNodeId)) {
                const startIndex = stack.indexOf(option.nextNodeId)
                if (startIndex >= 0) {
                  const cycle = [...stack.slice(startIndex), option.nextNodeId]
                  cycles.add(cycle.join(' -> '))
                }
                continue
              }
              visit(option.nextNodeId)
            }
          }

          stack.pop()
          visiting.delete(nodeId)
          visited.add(nodeId)
        }

        visit(onboardingTree.rootNodeId)

        for (const cycle of cycles) {
          errors.push(`${onboardingTree.pathFile}: onboarding tree has a cycle: ${cycle}`)
        }

        for (const nodeId of nodeById.keys()) {
          if (!visited.has(nodeId)) {
            warnings.push(`${onboardingTree.pathFile}: onboarding node "${nodeId}" is unreachable`)
          }
        }
      }

      return { errors, warnings }
    },
  },
  {
    name: 'path-ids',
    run: (context) => {
      const errors: string[] = []
      const pathIdUsage = new Map<string, string[]>()

      for (const pathEntry of context.pathEntries) {
        const files = pathIdUsage.get(pathEntry.pathId) ?? []
        files.push(pathEntry.pathFile)
        pathIdUsage.set(pathEntry.pathId, files)
      }

      for (const [pathId, files] of pathIdUsage.entries()) {
        if (files.length > 1) {
          errors.push(`Duplicate path id "${pathId}" found in: ${files.join(', ')}`)
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'slug-collisions',
    run: (context) => {
      const warnings: string[] = []
      const pathSlugUsage = new Map<string, string[]>()

      for (const pathEntry of context.pathEntries) {
        if (pathEntry.slug) {
          const files = pathSlugUsage.get(pathEntry.slug) ?? []
          files.push(pathEntry.pathFile)
          pathSlugUsage.set(pathEntry.slug, files)
        }

        const moduleSlugUsage = new Map<string, string[]>()
        const lessonSlugUsage = new Map<string, string[]>()

        for (const moduleEntry of pathEntry.modules) {
          if (moduleEntry.slug) {
            const modules = moduleSlugUsage.get(moduleEntry.slug) ?? []
            modules.push(moduleEntry.moduleId)
            moduleSlugUsage.set(moduleEntry.slug, modules)
          }
        }

        for (const lessonEntry of pathEntry.lessons) {
          if (lessonEntry.slug) {
            const lessons = lessonSlugUsage.get(lessonEntry.slug) ?? []
            lessons.push(lessonEntry.lessonId)
            lessonSlugUsage.set(lessonEntry.slug, lessons)
          }
        }

        for (const [slug, moduleIds] of moduleSlugUsage.entries()) {
          if (moduleIds.length > 1) {
            warnings.push(
              `Path "${pathEntry.pathId}" in ${pathEntry.pathFile} reuses module slug "${slug}" for: ${moduleIds.join(', ')}`
            )
          }
        }

        for (const [slug, lessonIds] of lessonSlugUsage.entries()) {
          if (lessonIds.length > 1) {
            warnings.push(
              `Path "${pathEntry.pathId}" in ${pathEntry.pathFile} reuses lesson slug "${slug}" for: ${lessonIds.join(', ')}`
            )
          }
        }
      }

      for (const [slug, files] of pathSlugUsage.entries()) {
        if (files.length > 1) {
          warnings.push(`Path slug "${slug}" is reused in: ${files.join(', ')}`)
        }
      }

      return { errors: [], warnings }
    },
  },
  {
    name: 'module-ids',
    run: (context) => {
      const errors: string[] = []

      for (const pathEntry of context.pathEntries) {
        if (pathEntry.modules.length === 0) {
          errors.push(`Path "${pathEntry.pathId}" in ${pathEntry.pathFile} has no modules`)
        }

        if (pathEntry.lessons.length === 0) {
          errors.push(`Path "${pathEntry.pathId}" in ${pathEntry.pathFile} has no lessons`)
        }

        const seen = new Set<string>()
        for (const moduleEntry of pathEntry.modules) {
          if (seen.has(moduleEntry.moduleId)) {
            errors.push(`Duplicate module id "${moduleEntry.moduleId}" in ${pathEntry.pathFile}`)
          }
          seen.add(moduleEntry.moduleId)

          if (moduleEntry.lessonIds.length === 0) {
            errors.push(`Module "${moduleEntry.moduleId}" in ${pathEntry.pathFile} has no lessons`)
          }
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'required-modules',
    run: (context) => {
      const errors: string[] = []

      for (const pathEntry of context.pathEntries) {
        if (pathEntry.requiredModuleIds.length === 0) {
          continue
        }
        const moduleIds = new Set(pathEntry.modules.map((moduleEntry) => moduleEntry.moduleId))
        const missingModules = pathEntry.requiredModuleIds.filter((moduleId) => !moduleIds.has(moduleId))
        if (missingModules.length > 0) {
          errors.push(
            `Path "${pathEntry.pathId}" in ${pathEntry.pathFile} is missing required modules: ${missingModules.join(', ')}`
          )
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'lesson-ids',
    run: (context) => {
      const errors: string[] = []

      for (const pathEntry of context.pathEntries) {
        const seen = new Map<string, string>()
        for (const lesson of pathEntry.lessons) {
          const existingModule = seen.get(lesson.lessonId)
          if (existingModule) {
            errors.push(
              `Duplicate lesson id "${lesson.lessonId}" in ${pathEntry.pathFile} (modules "${existingModule}" and "${lesson.moduleId}")`
            )
          } else {
            seen.set(lesson.lessonId, lesson.moduleId)
          }
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'lesson-structure',
    run: (context) => {
      const errors: string[] = []

      for (const pathEntry of context.pathEntries) {
        for (const lesson of pathEntry.lessons) {
          if (!lesson.completionMode || !COMPLETION_MODES.has(lesson.completionMode)) {
            errors.push(
              `Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} has invalid completionMode "${lesson.completionMode ?? 'missing'}"`
            )
          }

          // durationMinutes should be present in generated paths (merged from frontmatter by generate script)
          if (!lesson.durationMinutes || !Number.isInteger(lesson.durationMinutes) || lesson.durationMinutes <= 0) {
            errors.push(
              `Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} has invalid durationMinutes "${lesson.durationMinutes ?? 'missing'}"`
            )
          }
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'lesson-discourse-metadata',
    run: (context) => {
      const errors: string[] = []
      const warnings: string[] = []
      const discourseTopicUsage = new Map<number, string[]>()

      for (const pathEntry of context.pathEntries) {
        for (const lesson of pathEntry.lessons) {
          if (lesson.discourseTopicId !== null) {
            if (!Number.isInteger(lesson.discourseTopicId) || lesson.discourseTopicId <= 0) {
              errors.push(
                `Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} has invalid discourseTopicId "${lesson.discourseTopicId}"`
              )
            } else {
              const existing = discourseTopicUsage.get(lesson.discourseTopicId) ?? []
              existing.push(`${pathEntry.pathFile} -> ${lesson.moduleId}/${lesson.lessonId}`)
              discourseTopicUsage.set(lesson.discourseTopicId, existing)
            }
          }

          if (lesson.discourseTopicSlug && lesson.discourseTopicId === null) {
            warnings.push(
              `Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} has discourseTopicSlug without discourseTopicId`
            )
          }
        }
      }

      for (const [topicId, locations] of discourseTopicUsage.entries()) {
        if (locations.length > 1) {
          warnings.push(
            `Discourse topic id "${topicId}" is reused across lessons: ${locations.join(', ')}`
          )
        }
      }

      return { errors, warnings }
    },
  },
  {
    name: 'lesson-prerequisites',
    run: (context) => {
      const errors: string[] = []
      const warnings: string[] = []

      for (const pathEntry of context.pathEntries) {
        const lessonOrder = pathEntry.lessons.map((lesson) => lesson.lessonId)
        const lessonIndex = new Map<string, number>()
        lessonOrder.forEach((lessonId, index) => {
          if (!lessonIndex.has(lessonId)) {
            lessonIndex.set(lessonId, index)
          }
        })

        const prerequisitesByLesson = new Map<string, string[]>()

        for (const lesson of pathEntry.lessons) {
          const currentIndex = lessonIndex.get(lesson.lessonId) ?? -1
          const seenPrereqs = new Set<string>()
          for (const prereqId of lesson.prerequisites) {
            if (seenPrereqs.has(prereqId)) {
              warnings.push(`Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} lists duplicate prerequisite "${prereqId}"`)
              continue
            }
            seenPrereqs.add(prereqId)

            if (prereqId === lesson.lessonId) {
              errors.push(`Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} references itself as a prerequisite`)
              continue
            }

            const prereqIndex = lessonIndex.get(prereqId)
            if (prereqIndex === undefined) {
              errors.push(`Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} references missing prerequisite "${prereqId}"`)
              continue
            }

            if (prereqIndex > currentIndex) {
              warnings.push(
                `Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} references prerequisite "${prereqId}" that appears later`
              )
            }
          }

          const validPrereqs = lesson.prerequisites.filter((prereqId) => lessonIndex.has(prereqId))
          prerequisitesByLesson.set(lesson.lessonId, validPrereqs)
        }

        const visiting = new Set<string>()
        const visited = new Set<string>()
        const cycleKeys = new Set<string>()
        const stack: string[] = []

        const visit = (lessonId: string) => {
          if (visited.has(lessonId)) {
            return
          }
          if (visiting.has(lessonId)) {
            return
          }

          visiting.add(lessonId)
          stack.push(lessonId)

          const prereqs = prerequisitesByLesson.get(lessonId) ?? []
          for (const prereqId of prereqs) {
            if (visiting.has(prereqId)) {
              const startIndex = stack.indexOf(prereqId)
              if (startIndex >= 0) {
                const cycle = [...stack.slice(startIndex), prereqId]
                cycleKeys.add(cycle.join(' -> '))
              }
              continue
            }
            visit(prereqId)
          }

          stack.pop()
          visiting.delete(lessonId)
          visited.add(lessonId)
        }

        for (const lessonId of prerequisitesByLesson.keys()) {
          visit(lessonId)
        }

        for (const cycle of cycleKeys) {
          errors.push(`Path "${pathEntry.pathId}" in ${pathEntry.pathFile} has a prerequisite cycle: ${cycle}`)
        }
      }

      return { errors, warnings }
    },
  },
  {
    name: 'content-dir-collisions',
    run: (context) => {
      const warnings: string[] = []

      for (const pathEntry of context.pathEntries) {
        const contentDirUsage = new Map<string, LessonDefinition[]>()
        for (const lesson of pathEntry.lessons) {
          if (!lesson.contentDir) {
            continue
          }
          const entries = contentDirUsage.get(lesson.contentDir) ?? []
          entries.push(lesson)
          contentDirUsage.set(lesson.contentDir, entries)
        }

        for (const [contentDir, lessons] of contentDirUsage.entries()) {
          if (lessons.length > 1) {
            warnings.push(
              `Path "${pathEntry.pathId}" reuses contentDir "${contentDir}" for lessons: ${lessons
                .map((lesson) => lesson.lessonId)
                .join(', ')}`
            )
          }
        }
      }

      return { errors: [], warnings }
    },
  },
  {
    name: 'interactive-components',
    run: (context) => {
      const errors: string[] = []

      for (const pathEntry of context.pathEntries) {
        for (const lesson of pathEntry.lessons) {
          if (!lesson.contentDir || !lesson.completionMode) {
            continue
          }

          const componentName = COMPLETION_COMPONENTS[lesson.completionMode]
          if (!componentName) {
            continue
          }

          const locales = context.mdxIndex.get(lesson.contentDir)
          if (!locales) {
            continue
          }

          for (const locale of locales) {
            const mdxPath = getMdxFilePath(lesson.contentDir, locale)
            const source = context.mdxSourceByPath.get(mdxPath)
            if (!source) {
              continue
            }
            if (!hasMdxComponent(source, componentName)) {
              errors.push(
                `Lesson "${lesson.lessonId}" in ${pathEntry.pathFile} (${locale}) is missing <${componentName}> for completionMode "${lesson.completionMode}"`
              )
            }
          }
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'lesson-content',
    run: (context) => {
      const errors: string[] = []
      for (const [contentDir, refs] of context.contentDirUsage.entries()) {
        if (!context.mdxIndex.has(contentDir)) {
          errors.push(`Missing MDX content for "${contentDir}" referenced by ${formatLessonRefs(refs)}`)
        }
      }
      return { errors, warnings: [] }
    },
  },
  {
    name: 'locale-coverage',
    run: (context) => {
      const errors: string[] = []
      const warnings: string[] = []

      for (const [contentDir, refs] of context.contentDirUsage.entries()) {
        const locales = context.mdxIndex.get(contentDir) ?? new Set()
        for (const locale of context.requiredLocales) {
          if (!locales.has(locale)) {
            errors.push(`Missing index.${locale}.mdx for "${contentDir}" referenced by ${formatLessonRefs(refs)}`)
          }
        }
        for (const locale of context.optionalLocales) {
          if (!locales.has(locale)) {
            warnings.push(`Missing optional index.${locale}.mdx for "${contentDir}" referenced by ${formatLessonRefs(refs)}`)
          }
        }
      }

      return { errors, warnings }
    },
  },
  {
    name: 'unused-content',
    run: (context) => {
      const warnings: string[] = []
      for (const contentDir of context.mdxIndex.keys()) {
        if (!context.contentDirUsage.has(contentDir)) {
          warnings.push(`MDX content "${contentDir}" is not referenced in any learning path`)
        }
      }
      return { errors: [], warnings }
    },
  },
  {
    name: 'mdx-compile',
    run: (context) => {
      const errors: string[] = []

      // Use content without frontmatter for MDX compilation
      for (const [mdxPath, content] of context.mdxContentByPath.entries()) {
        try {
          compileSync(
            {
              value: content,
              path: mdxPath,
            },
            {
              remarkPlugins: [remarkGfm],
            }
          )
        } catch (error) {
          const relativePath = path.relative(PROJECT_ROOT, mdxPath)
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`${relativePath}: ${message}`)
        }
      }

      return { errors, warnings: [] }
    },
  },
  {
    name: 'frontmatter-schema',
    run: (context) => {
      const errors: string[] = []

      for (const [mdxPath, frontmatter] of context.frontmatterByPath.entries()) {
        const relativePath = path.relative(PROJECT_ROOT, mdxPath)

        // Required fields - title is required (locale determined by file name: index.en.mdx, index.ro.mdx)
        if (!frontmatter.title || typeof frontmatter.title !== 'string') {
          errors.push(`${relativePath}: Missing required frontmatter field "title"`)
        }

        if (frontmatter.durationMinutes === undefined || typeof frontmatter.durationMinutes !== 'number') {
          errors.push(`${relativePath}: Missing or invalid frontmatter field "durationMinutes" (must be a number)`)
        } else if (!Number.isInteger(frontmatter.durationMinutes) || frontmatter.durationMinutes <= 0) {
          errors.push(`${relativePath}: "durationMinutes" must be a positive integer`)
        }

        // Optional fields type validation
        if (frontmatter.concept !== undefined && typeof frontmatter.concept !== 'string') {
          errors.push(`${relativePath}: Frontmatter field "concept" must be a string`)
        }

        if (frontmatter.objective !== undefined && typeof frontmatter.objective !== 'string') {
          errors.push(`${relativePath}: Frontmatter field "objective" must be a string`)
        }
      }

      return { errors, warnings: [] }
    },
  },
]

function printIssues(label: string, issues: readonly string[]): void {
  if (issues.length === 0) {
    return
  }
  console.log(`\n${label}`)
  for (const issue of issues) {
    console.log(`- ${issue}`)
  }
}

async function main(): Promise<void> {
  const mdxIndex = await collectMdxIndex()
  const { mdxSourceByPath, mdxContentByPath, frontmatterByPath, readIssues } = await collectMdxSources(mdxIndex)
  const { pathEntries, lessonRefs, parseIssues: pathParseIssues } = await collectPathContent()
  const { onboardingTree, parseIssues: onboardingParseIssues } = await collectOnboardingTree()
  const parseIssues = [...pathParseIssues, ...readIssues]
  const contentDirUsage = buildContentDirUsage(lessonRefs)

  const context: ValidationContext = {
    mdxIndex,
    mdxSourceByPath,
    mdxContentByPath,
    frontmatterByPath,
    pathEntries,
    lessonRefs,
    contentDirUsage,
    parseIssues,
    onboardingTree,
    onboardingParseIssues,
    requiredLocales: REQUIRED_LOCALES,
    optionalLocales: OPTIONAL_LOCALES,
  }

  let totalErrors = 0
  let totalWarnings = 0

  for (const rule of VALIDATION_RULES) {
    const result = rule.run(context)
    totalErrors += result.errors.length
    totalWarnings += result.warnings.length
    printIssues(`${rule.name}: errors`, result.errors)
    printIssues(`${rule.name}: warnings`, result.warnings)
  }

  console.log(`\nLearning content validation: ${totalErrors} errors, ${totalWarnings} warnings`)

  if (totalErrors > 0) {
    console.log('\n❌ VALIDATION FAILED: Fix the errors above before proceeding.')
    process.exitCode = 1
  } else {
    console.log('\n✅ Validation passed.')
  }
}

main().catch((error) => {
  console.error(`Learning content validation failed: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
})
