import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'

/**
 * The registry's legal-form codes in words, as descriptors: the page says them
 * through the shared Lingui instance, the route's head through the request's
 * own translator. Light on purpose — the head is in every route's entry chunk.
 */
const LEGAL_FORM_NAMES: Readonly<Record<string, MessageDescriptor>> = {
  SA: msg`Societate pe acțiuni`,
  SRL: msg`Societate cu răspundere limitată`,
  SCS: msg`Societate în comandită simplă`,
  SNC: msg`Societate în nume colectiv`,
  SCA: msg`Societate în comandită pe acțiuni`,
  RA: msg`Regie autonomă`,
  SC: msg`Societate cooperativă`,
  SCE: msg`Societate cooperativă europeană`,
  SE: msg`Societate europeană`,
  GIE: msg`Grup de interes economic`,
  GEIE: msg`Grup european de interes economic`,
  INCD: msg`Institut național de cercetare-dezvoltare`,
  PFA: msg`Persoană fizică autorizată`,
  II: msg`Întreprindere individuală`,
  IF: msg`Întreprindere familială`,
}

/** The forms whose name is not feminine („Grup …", „Institut …"): the head's sentence says „înregistrat", not „înregistrată". */
const NOT_FEMININE: ReadonlySet<string> = new Set(['GIE', 'GEIE', 'INCD'])

/** Whether the sentence's participle agrees with a feminine name: every form's but a group's or an institute's, and „Firmă" when there is none. */
export function legalFormIsFeminine(form: string | null): boolean {
  return form === null || !NOT_FEMININE.has(form)
}

/** A code's name in words through `translate`; a code with no name stays the registry's own. */
export function legalFormName(form: string | null, translate: (descriptor: MessageDescriptor) => string): string | null {
  if (form === null) return null
  const name = LEGAL_FORM_NAMES[form]
  return name ? translate(name) : form
}
