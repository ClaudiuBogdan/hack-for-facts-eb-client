import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementValueModelMethodology } from '@/features/procurement/components/procurement-value-model-methodology'

export const Route = createLazyFileRoute('/achizitii/metodologie')({
  component: ProcurementValueModelMethodology,
})
