import { useQuery } from '@tanstack/react-query'
import { procurementApi, procurementQueryKeys } from '../api/procurement-api'
import type { CpvCategoryPage } from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'

export function useProcurementLanding() {
  return useQuery({
    queryKey: procurementQueryKeys.landing(),
    queryFn: () => procurementApi.fetchLanding(),
  })
}

export function useProcurementSearch(params: ProcurementSearchState) {
  return useQuery({
    queryKey: procurementQueryKeys.search(params),
    queryFn: () => procurementApi.fetchSearch(params),
    placeholderData: (prev) => prev,
  })
}

export function useProcurementProcedureDetail(id: string) {
  return useQuery({
    queryKey: procurementQueryKeys.procedureDetail(id),
    queryFn: () => procurementApi.fetchProcedureDetail(id),
    enabled: id.length > 0,
  })
}

export function useProcurementContractDetail(id: string) {
  return useQuery({
    queryKey: procurementQueryKeys.contractDetail(id),
    queryFn: () => procurementApi.fetchContractDetail(id),
    enabled: id.length > 0,
  })
}

export function useProcurementDirectAcquisitionDetail(id: string) {
  return useQuery({
    queryKey: procurementQueryKeys.directAcquisitionDetail(id),
    queryFn: () => procurementApi.fetchDirectAcquisitionDetail(id),
    enabled: id.length > 0,
  })
}

export function useProcurementCpvCategory(
  code: string,
  initialData?: CpvCategoryPage,
) {
  return useQuery({
    queryKey: procurementQueryKeys.cpvCategory(code),
    queryFn: () => procurementApi.fetchCpvCategoryPage(code),
    initialData,
    enabled: code.length > 0,
  })
}

export function useProcurementSupplierSlice(cui: string) {
  return useQuery({
    queryKey: procurementQueryKeys.supplierSlice(cui),
    queryFn: () => procurementApi.fetchSupplierSlice(cui),
    enabled: cui.length > 0,
  })
}
