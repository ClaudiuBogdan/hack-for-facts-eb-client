import { indexUatSearchDirectory } from './uat-search-ranking'

export async function loadUatSearchDirectory() {
  const { UAT_SEARCH_DIRECTORY } = await import('./uat-search-directory.generated')
  return indexUatSearchDirectory(UAT_SEARCH_DIRECTORY)
}
