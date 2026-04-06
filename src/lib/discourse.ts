export function normalizeDiscourseBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

export function buildDiscourseTopicUrl(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
  readonly topicSlug?: string
}): string {
  const normalizedBaseUrl = normalizeDiscourseBaseUrl(params.discourseBaseUrl)
  if (params.topicSlug) {
    return `${normalizedBaseUrl}/t/${encodeURIComponent(params.topicSlug)}/${params.topicId}`
  }

  return `${normalizedBaseUrl}/t/${params.topicId}`
}

export function buildDiscourseTopicEmbedUrl(params: {
  readonly discourseBaseUrl: string
  readonly topicId: number
}): string {
  const normalizedBaseUrl = normalizeDiscourseBaseUrl(params.discourseBaseUrl)
  const queryString = new URLSearchParams({
    topic_id: String(params.topicId),
  }).toString()

  return `${normalizedBaseUrl}/embed/comments?${queryString}`
}
