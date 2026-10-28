import { createFileRoute, notFound } from '@tanstack/react-router'
import type { LearningLocale } from '@/features/learning/types'

export const Route = createFileRoute('/$lang/learning/$pathId/$moduleId/$lessonId')({
  ssr: true,
  pendingMs: 0,
  pendingMinMs: 250,
  // The learning paths and the lesson loader load with the loader, not in
  // every page's code.
  loader: async ({ params }) => {
    const [{ getLearningPathById }, { preloadModuleContent }] = await Promise.all([
      import('@/features/learning/utils/paths'),
      import('@/features/learning/utils/module-content-resource'),
    ])
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
