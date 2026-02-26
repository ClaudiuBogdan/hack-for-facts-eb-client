import { z } from 'zod'
import type {
  LearningGuestProgress,
  LearningLocale,
  LearningModuleCompletionMode,
  LearningLessonDefinition,
  LearningPathDefinition,
  LearningPathDifficulty,
  TranslatedString,
} from '../types'

const TranslatedStringSchema = z.object({
  en: z.string().min(1),
  ro: z.string().min(1),
})

const LearningPathDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

const LearningModuleCompletionModeSchema = z.enum(['quiz', 'mark_complete'])

const LearningLessonDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: TranslatedStringSchema,
  durationMinutes: z.number().int().positive(),
  contentDir: z.string().min(1),
  completionMode: LearningModuleCompletionModeSchema,
  prerequisites: z.array(z.string()).default([]),
  discourseTopicId: z.number().int().positive().optional(),
  discourseTopicSlug: z.string().min(1).optional(),
})

const LearningModuleDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: TranslatedStringSchema,
  description: TranslatedStringSchema,
  lessons: z.array(LearningLessonDefinitionSchema),
})

const LearningPathDefinitionSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  difficulty: LearningPathDifficultySchema,
  title: TranslatedStringSchema,
  description: TranslatedStringSchema,
  modules: z.array(LearningModuleDefinitionSchema),
})

type RawPathModule = { readonly default: unknown }

const pathModules: Record<string, RawPathModule> = import.meta.glob('/src/content/learning/paths/*.json', { eager: true })

function buildLessonSignature(lesson: LearningLessonDefinition): string {
  return JSON.stringify({
    contentDir: lesson.contentDir,
    completionMode: lesson.completionMode,
    durationMinutes: lesson.durationMinutes,
    discourseTopicId: lesson.discourseTopicId,
    discourseTopicSlug: lesson.discourseTopicSlug,
    slug: lesson.slug,
    prerequisites: [...lesson.prerequisites].sort(),
    title: lesson.title,
  })
}

function validateLessonDefinitions(paths: readonly LearningPathDefinition[]): void {
  const lessonRegistry = new Map<string, { readonly signature: string; readonly location: string }>()

  for (const path of paths) {
    for (const module of path.modules) {
      for (const lesson of module.lessons) {
        const location = `${path.id}/${module.id}/${lesson.id}`
        const signature = buildLessonSignature(lesson)
        const existing = lessonRegistry.get(lesson.id)
        if (existing && existing.signature !== signature) {
          throw new Error(
            `Conflicting lesson definitions for "${lesson.id}". Found "${location}" and "${existing.location}".`,
          )
        }
        if (!existing) {
          lessonRegistry.set(lesson.id, { signature, location })
        }
      }
    }
  }
}

export function getLearningPaths(): readonly LearningPathDefinition[] {
  const paths = Object.values(pathModules)
    .map((m) => LearningPathDefinitionSchema.parse(m.default))
    .sort((a, b) => a.id.localeCompare(b.id))
  validateLessonDefinitions(paths)
  return paths
}

export function getLearningPathById(pathId: string): LearningPathDefinition | null {
  const all = getLearningPaths()
  return all.find((p) => p.id === pathId) ?? null
}

export function getTranslatedText(value: TranslatedString, locale: LearningLocale): string {
  return locale === 'ro' ? value.ro : value.en
}

export function isCompletionMode(value: unknown): value is LearningModuleCompletionMode {
  return value === 'quiz' || value === 'mark_complete'
}

export function isDifficulty(value: unknown): value is LearningPathDifficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced'
}

export function getLearningPathLocaleFromPathname(pathname: string): LearningLocale {
  return pathname.startsWith('/ro') ? 'ro' : 'en'
}

export function getAllLessons(path: LearningPathDefinition): readonly LearningLessonDefinition[] {
  return path.modules.flatMap((m) => m.lessons)
}

export function getLearningPathCompletionStats(params: {
  readonly path: LearningPathDefinition
  readonly progress: LearningGuestProgress
}): { readonly completedCount: number; readonly totalCount: number; readonly completionPercentage: number } {
  const contentProgress = params.progress.content
  const allLessons = getAllLessons(params.path)
  const totalCount = allLessons.length
  
  const completedCount = allLessons.filter((lesson) => {
    const status = contentProgress[lesson.id]?.status
    return status === 'completed' || status === 'passed'
  }).length

  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  return { completedCount, totalCount, completionPercentage }
}

export function getAdjacentLessons(params: {
  readonly path: LearningPathDefinition
  readonly lessonId: string
}): { readonly prev: LearningLessonDefinition | null; readonly next: LearningLessonDefinition | null } {
  const allLessons = getAllLessons(params.path)
  const idx = allLessons.findIndex((m) => m.id === params.lessonId)
  return {
    prev: idx > 0 ? allLessons[idx - 1] : null,
    next: idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
  }
}

export type PathProgressStats = {
  readonly completedCount: number
  readonly totalCount: number
  readonly completionPercentage: number
  readonly lastInteractionAt: string | null
  readonly remainingMinutes: number
  readonly totalMinutes: number
  readonly nextLesson: LearningLessonDefinition | null
  readonly nextModuleId: string | null
}

export function getPathProgressStats(params: {
  readonly path: LearningPathDefinition
  readonly progress: LearningGuestProgress
}): PathProgressStats {
  const contentProgress = params.progress.content
  const allLessons = getAllLessons(params.path)
  const totalCount = allLessons.length

  const completedCount = allLessons.filter((lesson) => {
    const status = contentProgress[lesson.id]?.status
    return status === 'completed' || status === 'passed'
  }).length

  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Calculate total time for all lessons
  const totalMinutes = allLessons.reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0)

  // Calculate remaining time from incomplete lessons
  const remainingMinutes = allLessons
    .filter((lesson) => {
      const status = contentProgress[lesson.id]?.status
      return status !== 'completed' && status !== 'passed'
    })
    .reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0)

  // Find the latest interaction timestamp for this path
  const lastInteractionAt = allLessons.reduce<string | null>((latest, lesson) => {
    const lessonProgress = contentProgress[lesson.id]
    if (!lessonProgress?.lastAttemptAt) return latest
    if (!latest) return lessonProgress.lastAttemptAt
    return lessonProgress.lastAttemptAt > latest ? lessonProgress.lastAttemptAt : latest
  }, null)

  // Find next lesson
  const nextLesson = allLessons.find((lesson) => {
    const status = contentProgress[lesson.id]?.status
    return status !== 'completed' && status !== 'passed'
  }) ?? null

  const nextModuleId = nextLesson
    ? params.path.modules.find((m) => m.lessons.some((l) => l.id === nextLesson.id))?.id ?? null
    : null

  return {
    completedCount,
    totalCount,
    completionPercentage,
    lastInteractionAt,
    remainingMinutes,
    totalMinutes,
    nextLesson,
    nextModuleId,
  }
}
