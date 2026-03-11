import { createFileRoute, notFound } from '@tanstack/react-router'
import { preloadModuleContent } from '@/features/learning/utils/module-content-resource'
import type { LearningLocale } from '@/features/learning/types'
import { getLearningPathById } from '@/features/learning/utils/paths'

export const Route = createFileRoute('/$lang/learning/$pathId/$moduleId/$lessonId')({
  ssr: true,
  loader: async ({ params }) => {
    const learningPath = getLearningPathById(params.pathId)
    if (!learningPath) {
      throw notFound()
    }

    const learningModule =
      learningPath.modules.find((candidateModule) => candidateModule.id === params.moduleId) ??
      null
    if (!learningModule) {
      throw notFound()
    }

    const lesson =
      learningModule.lessons.find((candidateLesson) => candidateLesson.id === params.lessonId) ??
      null
    if (!lesson) {
      throw notFound()
    }

    await preloadModuleContent({
      contentDir: lesson.contentDir,
      locale: params.lang as LearningLocale,
    })

    return null
  },
})
