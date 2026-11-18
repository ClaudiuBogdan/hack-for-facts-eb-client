import { createFileRoute, Outlet } from '@tanstack/react-router';
import { newAlertSearchSchema } from '@/schemas/alerts-search';

export const Route = createFileRoute('/alerts/new')({
  validateSearch: newAlertSearchSchema,
  component: Outlet,
});
