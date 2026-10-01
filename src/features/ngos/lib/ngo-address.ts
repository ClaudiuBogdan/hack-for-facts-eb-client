/**
 * An NGO's one address (`docs/design/ngos/design.md`, „Profiles without a
 * CUI"): `/ngos/{cui}` where the platform admits a CUI, else
 * `/ngos/registry/{registry number}`.
 *
 * In the address a registry number's `/` is written `-` (`1471/A/2012` →
 * `1471-A-2012`). The registry's literals are kept as written, irregular ones
 * too (`1/A/122`), so the writing must undo exactly for any of them: a `-`
 * in the literal itself is written `~-`, and a `~` is written `~~`. No current
 * number holds either; the escape is for the next export.
 */

export function registryNumberToPath(registryNumber: string): string {
  let path = ''
  for (const character of registryNumber) {
    if (character === '/') path += '-'
    else if (character === '-' || character === '~') path += `~${character}`
    else path += character
  }
  return path
}

/** The registry number an address names, or null where the address is none this writing makes. */
export function registryNumberFromPath(path: string): string | null {
  let registryNumber = ''
  for (let index = 0; index < path.length; index += 1) {
    const character = path[index]
    if (character === '-') registryNumber += '/'
    else if (character === '~') {
      const escaped = path[index + 1]
      if (escaped !== '-' && escaped !== '~') return null
      registryNumber += escaped
      index += 1
    } else registryNumber += character
  }
  return registryNumber.trim() === '' ? null : registryNumber
}

export type NgoProfileLink =
  | { readonly to: '/ngos/$cui'; readonly params: { readonly cui: string } }
  | { readonly to: '/ngos/registry/$number'; readonly params: { readonly number: string } }

/** The profile link for an organisation: its admitted CUI's, else its registry number's; null with neither. */
export function ngoProfileLink({
  cui,
  registryNumber,
}: {
  readonly cui: string | null | undefined
  readonly registryNumber: string | null | undefined
}): NgoProfileLink | null {
  if (cui) return { to: '/ngos/$cui', params: { cui } }
  if (registryNumber) return { to: '/ngos/registry/$number', params: { number: registryNumberToPath(registryNumber) } }
  return null
}

/** The same address as a path, for the places that link by string (the search). */
export function ngoProfileHref(input: Parameters<typeof ngoProfileLink>[0]): string | null {
  const link = ngoProfileLink(input)
  if (!link) return null
  return link.to === '/ngos/$cui'
    ? `/ngos/${encodeURIComponent(link.params.cui)}`
    : `/ngos/registry/${encodeURIComponent(link.params.number)}`
}
