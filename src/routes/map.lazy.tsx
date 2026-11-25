import { createLazyFileRoute } from '@tanstack/react-router'
import { MapPage } from '@/features/budget-map/components/map-page'

export const Route = createLazyFileRoute('/map')({ component: MapPage })
