/**
 * The public INS Tempo page for a matrix — the receipt for every number on a
 * dataset surface.
 *
 * The host is `statistici.insse.ro`: INS's own domain, unrelated to this app's
 * `/ins` routes. A path rename must never touch it. Plain `http`, on purpose:
 * the host answers no TLS at all (checked 2026-09-23), so an `https` link is
 * a dead one.
 */
export function insTempoDatasetUrl(datasetCode: string, locale: string): string {
  const lang = locale.toLowerCase().startsWith('en') ? 'en' : 'ro'
  const params = new URLSearchParams({
    ind: datasetCode,
    lang,
    page: 'tempo3',
  })
  return `http://statistici.insse.ro/tempoins/index.jsp?${params.toString()}`
}

/**
 * INS Tempo's own front page, for a surface whose figures come from many of
 * its matrices: each figure's matrix is one click further, on its series.
 * `tempo1` is the page the bare host serves (checked 2026-09-25).
 */
export function insTempoHomeUrl(locale: string): string {
  const lang = locale.toLowerCase().startsWith('en') ? 'en' : 'ro'
  return `http://statistici.insse.ro/tempoins/index.jsp?${new URLSearchParams({ page: 'tempo1', lang }).toString()}`
}
