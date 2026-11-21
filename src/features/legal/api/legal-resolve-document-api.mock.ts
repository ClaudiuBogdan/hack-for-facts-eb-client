/**
 * The mock lane serves the legacy source only, where a `?doc=` is checked
 * against the act's own document ids and never resolved — so it resolves
 * nothing.
 */
export async function resolveLegalDocumentMock(): Promise<string | null> {
  return null
}
