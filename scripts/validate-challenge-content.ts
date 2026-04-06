import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { ChallengeModuleDefinitionSchema } from '../src/features/challenges/schemas/challenge-definitions'
import { parseSectionedChallengeStep } from '../src/features/challenges/utils/sectioned-step-markdown.build'

type SupportedLocale = 'en' | 'ro'

type ParsedChallengeModule = ReturnType<typeof ChallengeModuleDefinitionSchema.parse>

type ChallengeStepContext = {
  readonly moduleFile: string
  readonly moduleId: string
  readonly moduleSlug: string
  readonly challengeId: string
  readonly challengeSlug: string
  readonly stepId: string
  readonly stepSlug: string
  readonly contentDir: string
  readonly discourseTopicId?: number
  readonly discourseTopicSlug?: string
  readonly discourseSectionTopics?: readonly {
    readonly sectionKey: string
    readonly discourseTopicId: number
    readonly discourseTopicSlug?: string
  }[]
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

function normalizeContentDir(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function hasPathTraversal(value: string): boolean {
  return value.split('/').some((segment) => segment === '..')
}

function formatStepLocation(step: ChallengeStepContext): string {
  return `${step.moduleSlug}/${step.challengeSlug}/${step.stepSlug}`
}

async function readChallengeModuleFiles(): Promise<
  readonly {
    readonly filePath: string
    readonly module: ParsedChallengeModule
  }[]
> {
  const entries = await fs.readdir(CHALLENGE_MODULES_ROOT, { withFileTypes: true })
  const moduleFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(CHALLENGE_MODULES_ROOT, entry.name))
    .sort((left, right) => left.localeCompare(right))

  const parsedModules = await Promise.all(
    moduleFiles.map(async (filePath) => {
      const source = await fs.readFile(filePath, 'utf8')
      const json = JSON.parse(source) as unknown
      return {
        filePath,
        module: ChallengeModuleDefinitionSchema.parse(json),
      }
    }),
  )

  return parsedModules
}

async function buildChallengeMdxIndex(): Promise<
  ReadonlyMap<string, Partial<Record<SupportedLocale, string>>>
> {
  const mdxIndex = new Map<string, Partial<Record<SupportedLocale, string>>>()

  async function visitDirectory(directoryPath: string): Promise<void> {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directoryPath, entry.name)
        if (entry.isDirectory()) {
          await visitDirectory(entryPath)
          return
        }

        const matchedLocale = entry.name.match(/^index\.(en|ro)\.mdx$/)
        if (!matchedLocale) {
          return
        }

        const contentDir = normalizeContentDir(
          path.relative(CHALLENGE_STEPS_ROOT, path.dirname(entryPath)),
        )
        const locale = matchedLocale[1] as SupportedLocale
        const localeMap = mdxIndex.get(contentDir) ?? {}
        localeMap[locale] = entryPath
        mdxIndex.set(contentDir, localeMap)
      }),
    )
  }

  await visitDirectory(CHALLENGE_STEPS_ROOT)
  return mdxIndex
}

async function main(): Promise<void> {
  const errors: string[] = []
  const warnings: string[] = []
  const parsedModules = await readChallengeModuleFiles()
  const mdxIndex = await buildChallengeMdxIndex()
  const topicIdUsage = new Map<number, string[]>()

  const steps: ChallengeStepContext[] = parsedModules.flatMap(({ filePath, module }) =>
    module.challenges.flatMap((challenge) =>
      challenge.steps.map((step) => ({
        moduleFile: path.relative(PROJECT_ROOT, filePath),
        moduleId: module.id,
        moduleSlug: module.slug,
        challengeId: challenge.id,
        challengeSlug: challenge.slug,
        stepId: step.id,
        stepSlug: step.slug,
        contentDir: normalizeContentDir(step.contentDir),
        discourseTopicId: step.discourseTopicId,
        discourseTopicSlug: step.discourseTopicSlug,
        discourseSectionTopics: step.discourseSectionTopics,
      })),
    ),
  )

  for (const step of steps) {
    if (!step.contentDir) {
      errors.push(`${step.moduleFile}: ${formatStepLocation(step)} is missing contentDir`)
      continue
    }

    if (path.isAbsolute(step.contentDir) || hasPathTraversal(step.contentDir)) {
      errors.push(
        `${step.moduleFile}: ${formatStepLocation(step)} has invalid contentDir "${step.contentDir}"`,
      )
      continue
    }

    const locales = mdxIndex.get(step.contentDir)
    if (!locales || Object.keys(locales).length === 0) {
      errors.push(
        `${step.moduleFile}: ${formatStepLocation(step)} references missing MDX content "${step.contentDir}"`,
      )
      continue
    }

    if (step.discourseTopicId !== undefined) {
      const locations = topicIdUsage.get(step.discourseTopicId) ?? []
      locations.push(`${step.moduleFile} -> ${formatStepLocation(step)}`)
      topicIdUsage.set(step.discourseTopicId, locations)
    }

    if (step.discourseTopicSlug && step.discourseTopicId === undefined) {
      errors.push(
        `${step.moduleFile}: ${formatStepLocation(step)} has discourseTopicSlug without discourseTopicId`,
      )
    }

    if ((step.discourseSectionTopics?.length ?? 0) === 0) {
      continue
    }

    const parsedLocales = await Promise.all(
      Object.entries(locales).map(async ([locale, filePath]) => {
        if (!filePath) {
          return null
        }

        const source = await fs.readFile(filePath, 'utf8')
        return {
          locale: locale as SupportedLocale,
          parsed: parseSectionedChallengeStep({ source }),
        }
      }),
    )

    const availableParsedLocales = parsedLocales.filter(
      (entry): entry is NonNullable<typeof entry> => entry !== null,
    )

    const sectionedLocales = availableParsedLocales.filter(
      (entry) => entry.parsed.frontmatter.stepType === 'sectioned',
    )

    if (sectionedLocales.length === 0) {
      errors.push(
        `${step.moduleFile}: ${formatStepLocation(step)} defines discourseSectionTopics but its content is not sectioned`,
      )
      continue
    }

    for (const parsedLocale of sectionedLocales) {
      const missingSectionKeys = parsedLocale.parsed.sections.filter(
        (section) => !section.sectionKey,
      )
      if (missingSectionKeys.length > 0) {
        errors.push(
          `${step.moduleFile}: ${formatStepLocation(step)} targets section sync but ${parsedLocale.locale} content still has sections without explicit stable keys`,
        )
      }
    }

    const declaredSectionKeys = new Set(
      sectionedLocales.flatMap((entry) =>
        entry.parsed.sections
          .map((section) => section.sectionKey)
          .filter((sectionKey): sectionKey is string => Boolean(sectionKey)),
      ),
    )

    for (const sectionTopic of step.discourseSectionTopics ?? []) {
      if (!declaredSectionKeys.has(sectionTopic.sectionKey)) {
        errors.push(
          `${step.moduleFile}: ${formatStepLocation(step)} references unknown discourse section key "${sectionTopic.sectionKey}"`,
        )
      }
      if (sectionTopic.discourseTopicSlug && !sectionTopic.discourseTopicId) {
        errors.push(
          `${step.moduleFile}: ${formatStepLocation(step)} section "${sectionTopic.sectionKey}" has discourseTopicSlug without discourseTopicId`,
        )
      }
    }
  }

  for (const [topicId, locations] of topicIdUsage.entries()) {
    if (locations.length > 1) {
      errors.push(
        `Challenge discourse topic id "${topicId}" is reused across steps: ${locations.join(', ')}`,
      )
    }
  }

  console.log(`Challenge content validation: ${errors.length} errors, ${warnings.length} warnings`)
  if (errors.length > 0) {
    console.log('\nErrors')
    errors.forEach((error) => console.log(`- ${error}`))
  }
  if (warnings.length > 0) {
    console.log('\nWarnings')
    warnings.forEach((warning) => console.log(`- ${warning}`))
  }

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Challenge content validation failed: ${message}`)
  process.exitCode = 1
})
