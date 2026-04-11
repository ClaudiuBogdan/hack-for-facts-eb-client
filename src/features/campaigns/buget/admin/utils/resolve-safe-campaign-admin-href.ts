type ResolveSafeCampaignAdminHrefInput = {
  readonly value: string | null
  readonly baseUrl?: string
}

export function resolveSafeCampaignAdminHref(
  input: ResolveSafeCampaignAdminHrefInput
): string | null {
  const trimmedValue = input.value?.trim()
  if (!trimmedValue) {
    return null
  }

  if (!trimmedValue.startsWith('/') && !/^https?:\/\//i.test(trimmedValue)) {
    return null
  }

  const resolvedBaseUrl =
    input.baseUrl
    ?? (typeof window !== 'undefined' ? window.location.origin : undefined)

  if (resolvedBaseUrl === undefined) {
    return trimmedValue.startsWith('/') ? trimmedValue : null
  }

  try {
    const baseUrl = new URL(resolvedBaseUrl)
    const parsedUrl = new URL(trimmedValue, baseUrl)

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null
    }

    if (parsedUrl.origin !== baseUrl.origin) {
      return null
    }

    return parsedUrl.toString()
  } catch {
    return null
  }
}
