import type {
  PnrrWorkerBeneficiaryResult,
  PnrrWorkerCsvResult,
  PnrrWorkerProjectResult,
  PnrrWorkerQueryPayload,
  PnrrWorkerQueryResult,
  PnrrWorkerRequest,
  PnrrWorkerResponse,
} from './pnrr-worker-types'

type PendingRequest = {
  readonly resolve: (value: unknown) => void
  readonly reject: (reason?: unknown) => void
}

let requestId = 0
let worker: Worker | null = null
const pendingRequests = new Map<number, PendingRequest>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./pnrr-data.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.addEventListener('message', (event: MessageEvent<PnrrWorkerResponse>) => {
      const response = event.data
      const pending = pendingRequests.get(response.id)
      if (!pending) return

      pendingRequests.delete(response.id)

      if (response.type === 'error') {
        pending.reject(new Error(response.error))
        return
      }

      pending.resolve(response.payload)
    })
    worker.addEventListener('error', (event) => {
      for (const pending of pendingRequests.values()) {
        pending.reject(event.error ?? new Error(event.message))
      }
      pendingRequests.clear()
      worker?.terminate()
      worker = null
    })
  }

  return worker
}

function postWorkerRequest<TPayload>(
  request: Omit<PnrrWorkerRequest, 'id'>,
): Promise<TPayload> {
  const id = ++requestId
  const message = { ...request, id } as PnrrWorkerRequest

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    })
    getWorker().postMessage(message)
  })
}

export function queryPnrrWorker(
  payload: PnrrWorkerQueryPayload,
): Promise<PnrrWorkerQueryResult> {
  return postWorkerRequest<PnrrWorkerQueryResult>({
    type: 'query',
    payload,
  })
}

export function getPnrrWorkerProject(
  projectId: string,
): Promise<PnrrWorkerProjectResult> {
  return postWorkerRequest<PnrrWorkerProjectResult>({
    type: 'getProject',
    payload: { projectId },
  })
}

export function getPnrrWorkerBeneficiary(
  payload: Extract<PnrrWorkerRequest, { readonly type: 'getBeneficiary' }>['payload'],
): Promise<PnrrWorkerBeneficiaryResult> {
  return postWorkerRequest<PnrrWorkerBeneficiaryResult>({
    type: 'getBeneficiary',
    payload,
  })
}

export function exportPnrrWorkerCsv(
  payload: Extract<PnrrWorkerRequest, { readonly type: 'exportCsv' }>['payload'],
): Promise<PnrrWorkerCsvResult> {
  return postWorkerRequest<PnrrWorkerCsvResult>({
    type: 'exportCsv',
    payload,
  })
}
