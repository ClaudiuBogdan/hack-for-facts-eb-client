/** Build a compact page number range with ellipsis markers. */
export function getPaginationRange(
  current: number,
  total: number,
): ReadonlyArray<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]

  if (current <= 4) {
    for (let index = 2; index <= 5; index += 1) {
      pages.push(index)
    }
    pages.push('ellipsis')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push('ellipsis')
    for (let index = total - 4; index <= total; index += 1) {
      pages.push(index)
    }
  } else {
    pages.push('ellipsis')
    for (let index = current - 1; index <= current + 1; index += 1) {
      pages.push(index)
    }
    pages.push('ellipsis')
    pages.push(total)
  }

  return pages
}
