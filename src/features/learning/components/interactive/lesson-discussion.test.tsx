import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LessonDiscussion } from './lesson-discussion'

function openDiscussionPanel(): void {
  const toggle = screen.getByRole('button', { name: /Discussion|Discuție/i })
  fireEvent.click(toggle)
}

describe('LessonDiscussion', () => {
  it('renders discussion card with correct heading and description', () => {
    render(
      <LessonDiscussion
        topicId={101}
        topicSlug="topic-101"
        discourseBaseUrl="https://forum.example.com"
        lessonTitle="Lesson A"
      />
    )

    expect(screen.getByText('Discussion')).toBeInTheDocument()
    expect(screen.getByText('Ask questions and discuss this lesson with the community.')).toBeInTheDocument()
  })

  it('renders CTA button linking to forum discussion', () => {
    render(
      <LessonDiscussion
        topicId={202}
        topicSlug="topic-202"
        discourseBaseUrl="https://forum.example.com"
        lessonTitle="Lesson B"
      />
    )

    openDiscussionPanel()
    const ctaLink = screen.getByRole('link', { name: /Open in forum - Lesson B/i })
    expect(ctaLink).toBeInTheDocument()
    expect(ctaLink).toHaveAttribute('href', 'https://forum.example.com/t/topic-202/202')
    expect(ctaLink).toHaveAttribute('target', '_blank')
    expect(ctaLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('uses i18n source strings for labels', () => {
    render(
      <LessonDiscussion
        topicId={303}
        topicSlug="topic-303"
        discourseBaseUrl="https://forum.example.com"
        lessonTitle="Lecția C"
      />
    )

    expect(screen.getByText('Discussion')).toBeInTheDocument()
    expect(screen.getByText('Ask questions and discuss this lesson with the community.')).toBeInTheDocument()
    openDiscussionPanel()
    expect(screen.getByRole('link', { name: /Open in forum - Lecția C/i })).toBeInTheDocument()
  })

  it('builds discussion URL without slug when slug is not provided', () => {
    render(
      <LessonDiscussion
        topicId={404}
        discourseBaseUrl="https://forum.example.com"
        lessonTitle="Lesson D"
      />
    )

    openDiscussionPanel()
    const ctaLink = screen.getByRole('link', { name: /Open in forum - Lesson D/i })
    expect(ctaLink).toHaveAttribute('href', 'https://forum.example.com/t/404')
  })

  it('normalizes discourse base URL by removing trailing slashes', () => {
    render(
      <LessonDiscussion
        topicId={505}
        topicSlug="topic-505"
        discourseBaseUrl="https://forum.example.com///"
        lessonTitle="Lesson E"
      />
    )

    openDiscussionPanel()
    const ctaLink = screen.getByRole('link', { name: /Open in forum - Lesson E/i })
    expect(ctaLink).toHaveAttribute('href', 'https://forum.example.com/t/topic-505/505')
  })

  it('recreates the comments embed when reopening accordion', () => {
    render(
      <LessonDiscussion
        topicId={707}
        topicSlug="topic-707"
        discourseBaseUrl="https://forum.example.com"
        lessonTitle="Lesson G"
      />
    )

    const toggle = screen.getByRole('button', { name: /Discussion/i })

    fireEvent.click(toggle)
    const firstEmbed = screen.getByTitle('Discussion - Lesson G')
    expect(firstEmbed).toHaveAttribute('src', 'https://forum.example.com/embed/comments?topic_id=707')

    fireEvent.click(toggle)
    expect(screen.queryByTitle('Discussion - Lesson G')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByTitle('Discussion - Lesson G')).toBeInTheDocument()
  })
})
