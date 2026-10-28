import { PNRR_FILESET_ID } from '../lib/snapshot'
import {
  buildCsv,
  buildPnrrQueryResult,
  buildPnrrWorkerModelFromRawFiles,
  createPnrrFilteredProjectsCache,
  findBeneficiaryDetail,
  findPnrrProject,
  getFilteredProjects,
} from './pnrr-query-model'
import type {
  PnrrWorkerCsvResult,
  PnrrWorkerModel,
  PnrrWorkerRequest,
  PnrrWorkerResponse,
} from './pnrr-worker-types'

let modelPromise: Promise<PnrrWorkerModel> | null = null
const filteredProjectsCache = createPnrrFilteredProjectsCache()

/** The raw files of the frozen file set; the version lets the server cache them for good. */
function rawFilePath(key: 'projects' | 'payments' | 'indicators'): string {
  return `/api/pnrr/raw/${key}?v=${encodeURIComponent(PNRR_FILESET_ID)}`
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`)
  }
  return response.json()
}

async function loadModel(): Promise<PnrrWorkerModel> {
  if (!modelPromise) {
    modelPromise = (async (): Promise<PnrrWorkerModel> => {
      const rawProjects = await fetchJson(rawFilePath('projects'))
      const [payments, indicators] = await Promise.allSettled([
        fetchJson(rawFilePath('payments')),
        fetchJson(rawFilePath('indicators')),
      ])

      if (payments.status === 'rejected') {
        console.warn(
          'PNRR beneficiary payments unavailable; serving the MIPE project index in degraded mode.',
          payments.reason,
        )
      }
      if (indicators.status === 'rejected') {
        console.warn(
          'PNRR official indicators unavailable; serving the MIPE project index in degraded mode.',
          indicators.reason,
        )
      }

      return buildPnrrWorkerModelFromRawFiles({
        rawProjects,
        payments,
        indicators,
      })
    })().catch((error) => {
      modelPromise = null
      throw error
    })
  }

  return modelPromise
}

self.addEventListener('message', (event: MessageEvent<PnrrWorkerRequest>) => {
  const request = event.data

  void (async () => {
    try {
      if (request.type === 'query') {
        const model = await loadModel()
        self.postMessage({
          id: request.id,
          type: 'query',
          payload: buildPnrrQueryResult(
            model,
            request.payload,
            filteredProjectsCache,
          ),
        } satisfies PnrrWorkerResponse)
        return
      }

      if (request.type === 'getProject') {
        const model = await loadModel()
        self.postMessage({
          id: request.id,
          type: 'getProject',
          payload: {
            project: findPnrrProject(model, request.payload.projectId),
          },
        } satisfies PnrrWorkerResponse)
        return
      }

      if (request.type === 'getBeneficiary') {
        const model = await loadModel()
        const projects = getFilteredProjects(
          model,
          request.payload.search ?? {},
          filteredProjectsCache,
        )
        self.postMessage({
          id: request.id,
          type: 'getBeneficiary',
          payload: {
            beneficiary: findBeneficiaryDetail(projects, request.payload),
          },
        } satisfies PnrrWorkerResponse)
        return
      }

      if (request.type === 'exportCsv') {
        const model = await loadModel()
        const projects = getFilteredProjects(
          model,
          request.payload.search ?? {},
          filteredProjectsCache,
        )
        self.postMessage({
          id: request.id,
          type: 'exportCsv',
          payload: {
            csv: buildCsv(projects, request.payload.search ?? {}),
          } satisfies PnrrWorkerCsvResult,
        } satisfies PnrrWorkerResponse)
      }
    } catch (error) {
      self.postMessage({
        id: request.id,
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } satisfies PnrrWorkerResponse)
    }
  })()
})
