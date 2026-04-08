import { createFileRoute } from '@tanstack/react-router'
import { SignUpPage } from '@/features/auth/components/AuthRoutePages'

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
})
