import { createFileRoute, redirect } from '@tanstack/react-router'
import { Analytics } from '@/lib/analytics'
import { DEFAULT_CHART_CONFIG } from '@/schemas/constants'
import type { Chart } from '@/schemas/charts'

export const Route = createFileRoute('/charts/new')({
    // A hover preloads this route (router `defaultPreload: 'intent'`): only
    // a real visit creates a chart and says so to analytics.
    beforeLoad: ({ preload }) => {
        if (preload) return
        const newChartId = crypto.randomUUID()
        const newChart: Chart = {
            id: newChartId,
            title: '',
            description: '',
            config: DEFAULT_CHART_CONFIG,
            series: [],
            annotations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        Analytics.capture(Analytics.EVENTS.ChartCreated, { chart_id: newChartId })

        throw redirect({
            to: '/charts/$chartId',
            params: { chartId: newChartId },
            search: { view: 'config', chart: newChart },
            replace: true,
        })
    },
})
