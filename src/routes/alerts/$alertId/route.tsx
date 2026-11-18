import { createFileRoute, Outlet } from '@tanstack/react-router';
import { alertUrlStateSchema } from '@/schemas/alerts-search';

export const Route = createFileRoute('/alerts/$alertId')({
  validateSearch: alertUrlStateSchema,
  component: RouteComponent,
  onEnter: async ({ params, search }) => {
    if (search.alert.id !== params.alertId) {
      search.alert.id = params.alertId;
    }

    return {
      ...search,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
