const GRAPHQL_ENDPOINT = 'https://api.transparenta.eu/graphql'

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://transparenta.eu',
      'Referer': 'https://transparenta.eu/',
      'User-Agent': 'Mozilla/5.0 (compatible; TransparentaGPTAPI/2.0)',
    },
    body: JSON.stringify({ query, variables }),
  })

  let json: { data?: T; errors?: { message: string; extensions?: Record<string, unknown> }[] }
  try {
    json = await res.json()
  } catch {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} — failed to parse response: ${text.slice(0, 500)}`)
  }

  if (!res.ok || json.errors?.length) {
    const errorDetails = json.errors?.map((e) => {
      const ext = e.extensions ? ` [${JSON.stringify(e.extensions)}]` : ''
      return `${e.message}${ext}`
    }).join('; ')
    const msg = errorDetails ?? `HTTP ${res.status}`
    console.error(`[GraphQL] Error: ${msg}`)
    if (variables) console.error(`[GraphQL] Variables: ${JSON.stringify(variables).slice(0, 500)}`)
    throw new Error(msg)
  }

  if (!json.data) throw new Error('GraphQL response missing data')
  return json.data
}
