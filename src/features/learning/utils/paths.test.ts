import { describe, expect, it } from 'vitest'
import {
  getAllLessons,
  getTranslatedText,
  getAdjacentLessons,
  getPathProgressStats,
  getLearningPathCompletionStats,
} from './paths'
import type { LearningPathDefinition, LearningGuestProgress, LearningLessonDefinition } from '../types'

// Test fixtures
const createLesson = (id: string, durationMinutes = 5): LearningLessonDefinition => ({
  id,
  slug: id,
  title: { en: `Lesson ${id}`, ro: `Lecția ${id}` },
  durationMinutes,
  contentDir: `content/${id}`,
  completionMode: 'mark_complete',
  prerequisites: [],
})

const createPath = (lessons: LearningLessonDefinition[]): LearningPathDefinition => ({
  id: 'test-path',
  slug: 'test-path',
  difficulty: 'beginner',
  title: { en: 'Test Path', ro: 'Curs de Test' },
  description: { en: 'A test path', ro: 'Un curs de test' },
  modules: [
    {
      id: 'module-1',
      slug: 'module-1',
      title: { en: 'Module 1', ro: 'Modulul 1' },
      description: { en: 'First module', ro: 'Primul modul' },
      lessons,
    },
  ],
})

const createProgress = (
  contentProgress: Record<string, { status: 'completed' | 'passed' | 'in_progress' | 'not_started'; lastAttemptAt?: string }> = {},
): LearningGuestProgress => ({
  version: 1,
  onboarding: { pathId: null, relatedPaths: [], completedAt: null },
  activePathId: null,
  content: Object.fromEntries(
    Object.entries(contentProgress).map(([id, { status, lastAttemptAt }]) => [
      id,
      {
        contentId: id,
        status,
        lastAttemptAt: lastAttemptAt ?? '2024-01-01T00:00:00Z',
        contentVersion: 'v1',
      },
    ]),
  ),
  streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
  lastUpdated: '2024-01-01T00:00:00Z',
})

describe('paths utilities', () => {
  describe('getTranslatedText', () => {
    it('returns English text for en locale', () => {
      const text = { en: 'Hello', ro: 'Salut' }
      expect(getTranslatedText(text, 'en')).toBe('Hello')
    })

    it('returns Romanian text for ro locale', () => {
      const text = { en: 'Hello', ro: 'Salut' }
      expect(getTranslatedText(text, 'ro')).toBe('Salut')
    })
  })

  describe('getAllLessons', () => {
    it('returns empty array for path with no lessons', () => {
      const path: LearningPathDefinition = {
        ...createPath([]),
        modules: [],
      }
      expect(getAllLessons(path)).toEqual([])
    })

    it('returns all lessons from single module', () => {
      const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
      const path = createPath(lessons)
      expect(getAllLessons(path)).toEqual(lessons)
    })

    it('preserves optional discourse lesson metadata', () => {
      const lessons = [
        {
          ...createLesson('lesson-1'),
          discourseTopicId: 123,
          discourseTopicSlug: 'lesson-1-discussion',
        },
      ]
      const path = createPath(lessons)
      const [firstLesson] = getAllLessons(path)

      expect(firstLesson.discourseTopicId).toBe(123)
      expect(firstLesson.discourseTopicSlug).toBe('lesson-1-discussion')
    })

    it('returns all lessons from multiple modules', () => {
      const lesson1 = createLesson('lesson-1')
      const lesson2 = createLesson('lesson-2')
      const lesson3 = createLesson('lesson-3')

      const path: LearningPathDefinition = {
        id: 'test-path',
        slug: 'test-path',
        difficulty: 'beginner',
        title: { en: 'Test', ro: 'Test' },
        description: { en: 'Test', ro: 'Test' },
        modules: [
          {
            id: 'module-1',
            slug: 'module-1',
            title: { en: 'M1', ro: 'M1' },
            description: { en: 'M1', ro: 'M1' },
            lessons: [lesson1, lesson2],
          },
          {
            id: 'module-2',
            slug: 'module-2',
            title: { en: 'M2', ro: 'M2' },
            description: { en: 'M2', ro: 'M2' },
            lessons: [lesson3],
          },
        ],
      }

      expect(getAllLessons(path)).toEqual([lesson1, lesson2, lesson3])
    })
  })

  describe('getAdjacentLessons', () => {
    const lessons = [createLesson('lesson-1'), createLesson('lesson-2'), createLesson('lesson-3')]
    const path = createPath(lessons)

    it('returns null prev for first lesson', () => {
      const result = getAdjacentLessons({ path, lessonId: 'lesson-1' })
      expect(result.prev).toBeNull()
      expect(result.next).toEqual(lessons[1])
    })

    it('returns both adjacent for middle lesson', () => {
      const result = getAdjacentLessons({ path, lessonId: 'lesson-2' })
      expect(result.prev).toEqual(lessons[0])
      expect(result.next).toEqual(lessons[2])
    })

    it('returns null next for last lesson', () => {
      const result = getAdjacentLessons({ path, lessonId: 'lesson-3' })
      expect(result.prev).toEqual(lessons[1])
      expect(result.next).toBeNull()
    })

    it('returns null for both when lesson not found', () => {
      const result = getAdjacentLessons({ path, lessonId: 'nonexistent' })
      expect(result.prev).toBeNull()
      expect(result.next).toBeNull()
    })
  })

  describe('getLearningPathCompletionStats', () => {
    it('returns zeros for path with no progress', () => {
      const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
      const path = createPath(lessons)
      const progress = createProgress()

      const result = getLearningPathCompletionStats({ path, progress })

      expect(result).toEqual({
        completedCount: 0,
        totalCount: 2,
        completionPercentage: 0,
      })
    })

    it('counts completed lessons', () => {
      const lessons = [createLesson('lesson-1'), createLesson('lesson-2'), createLesson('lesson-3')]
      const path = createPath(lessons)
      const progress = createProgress({
        'lesson-1': { status: 'completed' },
        'lesson-2': { status: 'passed' },
      })

      const result = getLearningPathCompletionStats({ path, progress })

      expect(result).toEqual({
        completedCount: 2,
        totalCount: 3,
        completionPercentage: 67,
      })
    })

    it('returns 100% when all lessons completed', () => {
      const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
      const path = createPath(lessons)
      const progress = createProgress({
        'lesson-1': { status: 'completed' },
        'lesson-2': { status: 'completed' },
      })

      const result = getLearningPathCompletionStats({ path, progress })

      expect(result).toEqual({
        completedCount: 2,
        totalCount: 2,
        completionPercentage: 100,
      })
    })

    it('does not count in_progress as completed', () => {
      const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
      const path = createPath(lessons)
      const progress = createProgress({
        'lesson-1': { status: 'completed' },
        'lesson-2': { status: 'in_progress' },
      })

      const result = getLearningPathCompletionStats({ path, progress })

      expect(result).toEqual({
        completedCount: 1,
        totalCount: 2,
        completionPercentage: 50,
      })
    })
  })

  describe('getPathProgressStats', () => {
    describe('completion stats', () => {
      it('returns zeros for path with no progress', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
        const path = createPath(lessons)
        const progress = createProgress()

        const result = getPathProgressStats({ path, progress })

        expect(result.completedCount).toBe(0)
        expect(result.totalCount).toBe(2)
        expect(result.completionPercentage).toBe(0)
      })

      it('calculates correct completion percentage', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2'), createLesson('lesson-3')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.completedCount).toBe(1)
        expect(result.totalCount).toBe(3)
        expect(result.completionPercentage).toBe(33)
      })

      it('treats passed as completed', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'passed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.completedCount).toBe(1)
        expect(result.completionPercentage).toBe(50)
      })
    })

    describe('time calculations', () => {
      it('calculates total minutes for all lessons', () => {
        const lessons = [createLesson('lesson-1', 10), createLesson('lesson-2', 20), createLesson('lesson-3', 15)]
        const path = createPath(lessons)
        const progress = createProgress()

        const result = getPathProgressStats({ path, progress })

        expect(result.totalMinutes).toBe(45)
      })

      it('calculates remaining minutes for incomplete lessons', () => {
        const lessons = [createLesson('lesson-1', 10), createLesson('lesson-2', 20), createLesson('lesson-3', 15)]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.remainingMinutes).toBe(35) // 20 + 15
      })

      it('returns 0 remaining minutes when all complete', () => {
        const lessons = [createLesson('lesson-1', 10), createLesson('lesson-2', 20)]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed' },
          'lesson-2': { status: 'completed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.remainingMinutes).toBe(0)
      })
    })

    describe('lastInteractionAt', () => {
      it('returns null when no lessons have progress', () => {
        const lessons = [createLesson('lesson-1')]
        const path = createPath(lessons)
        const progress = createProgress()

        const result = getPathProgressStats({ path, progress })

        expect(result.lastInteractionAt).toBeNull()
      })

      it('returns the most recent lastAttemptAt', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2'), createLesson('lesson-3')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed', lastAttemptAt: '2024-01-01T10:00:00Z' },
          'lesson-2': { status: 'completed', lastAttemptAt: '2024-01-03T15:00:00Z' },
          'lesson-3': { status: 'in_progress', lastAttemptAt: '2024-01-02T12:00:00Z' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.lastInteractionAt).toBe('2024-01-03T15:00:00Z')
      })

      it('handles single lesson with progress', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed', lastAttemptAt: '2024-02-15T08:30:00Z' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.lastInteractionAt).toBe('2024-02-15T08:30:00Z')
      })
    })

    describe('nextLesson', () => {
      it('returns first lesson when none completed', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
        const path = createPath(lessons)
        const progress = createProgress()

        const result = getPathProgressStats({ path, progress })

        expect(result.nextLesson).toEqual(lessons[0])
        expect(result.nextModuleId).toBe('module-1')
      })

      it('returns next incomplete lesson', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2'), createLesson('lesson-3')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.nextLesson).toEqual(lessons[1])
      })

      it('skips completed lessons to find next', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2'), createLesson('lesson-3')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed' },
          'lesson-2': { status: 'passed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.nextLesson).toEqual(lessons[2])
      })

      it('returns null when all lessons complete', () => {
        const lessons = [createLesson('lesson-1'), createLesson('lesson-2')]
        const path = createPath(lessons)
        const progress = createProgress({
          'lesson-1': { status: 'completed' },
          'lesson-2': { status: 'completed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.nextLesson).toBeNull()
        expect(result.nextModuleId).toBeNull()
      })
    })

    describe('nextModuleId', () => {
      it('returns correct module id for next lesson', () => {
        const lesson1 = createLesson('lesson-1')
        const lesson2 = createLesson('lesson-2')
        const lesson3 = createLesson('lesson-3')

        const path: LearningPathDefinition = {
          id: 'test-path',
          slug: 'test-path',
          difficulty: 'beginner',
          title: { en: 'Test', ro: 'Test' },
          description: { en: 'Test', ro: 'Test' },
          modules: [
            {
              id: 'module-1',
              slug: 'module-1',
              title: { en: 'M1', ro: 'M1' },
              description: { en: 'M1', ro: 'M1' },
              lessons: [lesson1],
            },
            {
              id: 'module-2',
              slug: 'module-2',
              title: { en: 'M2', ro: 'M2' },
              description: { en: 'M2', ro: 'M2' },
              lessons: [lesson2, lesson3],
            },
          ],
        }

        const progress = createProgress({
          'lesson-1': { status: 'completed' },
        })

        const result = getPathProgressStats({ path, progress })

        expect(result.nextLesson).toEqual(lesson2)
        expect(result.nextModuleId).toBe('module-2')
      })
    })
  })
})
