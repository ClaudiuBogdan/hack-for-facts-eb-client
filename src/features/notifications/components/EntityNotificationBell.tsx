import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsivePopover } from '@/components/ui/ResponsivePopover';
import { Separator } from '@/components/ui/separator';
import { useAuth, AuthSignInButton } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useEntityNotifications } from '../hooks/useEntityNotifications';
import { NotificationQuickMenu } from './NotificationQuickMenu';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useNotificationModal } from '../hooks/useNotificationModal';

interface Props {
  cui: string;
  entityName: string;
  triggerClassName?: string;
}

export function EntityNotificationBell({ cui, entityName, triggerClassName }: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: notifications, isLoading } = useEntityNotifications(cui);
  const { isOpen, setOpen } = useNotificationModal();

  const hasActive = notifications?.some(n => n.isActive) ?? false;
  const triggerButtonClassName = cn(
    'relative transition-all duration-300',
    triggerClassName,
  );

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <ResponsivePopover
        open={isOpen}
        onOpenChange={setOpen}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t`Sign in to get notifications`}
            className={triggerButtonClassName}
          >
            <Bell className="h-5 w-5" />
          </Button>
        }
        content={
          <div className="w-full p-1">
            <div className="flex flex-col">
              <div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">
                  <Trans>Sign in required</Trans>
                </h3>
                <p className="text-base text-muted-foreground">
                  <Trans>You need to be signed in to subscribe to notifications</Trans>
                </p>
              </div>

              <Separator className="my-3" />

              <div className="space-y-3">
                <p className="text-base text-muted-foreground">
                  <Trans>
                    Sign in to receive updates about <strong>{entityName}</strong>:
                  </Trans>
                </p>
                <ul className="text-base text-muted-foreground space-y-2 ml-4 list-disc">
                  <li>
                    <Trans>Monthly, quarterly, and annual reports</Trans>
                  </li>
                  <li>
                    <Trans>Alerts when important changes occur</Trans>
                  </li>
                  <li>
                    <Trans>Easily manage your subscriptions</Trans>
                  </li>
                </ul>
              </div>

              <div className="mt-64 sm:mt-6">
                <AuthSignInButton>
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full rounded-xl py-3.5 text-base font-semibold">
                    <Trans>Sign In</Trans>
                  </Button>
                </AuthSignInButton>
              </div>
            </div>
          </div>
        }
        align="end"
        className="sm:w-md"
      />
    );
  }

  return (
    <ResponsivePopover
      open={isOpen}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={t`Manage notifications`}
          className={cn(
            triggerButtonClassName,
            hasActive
              ? 'bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 !shadow-lg !border !border-amber-500/20'
              : '',
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : hasActive ? (
            <>
              <style>{`
                @keyframes ring {
                  0% { transform: rotate(0); }
                  10% { transform: rotate(10deg); }
                  20% { transform: rotate(-10deg); }
                  30% { transform: rotate(10deg); }
                  40% { transform: rotate(-10deg); }
                  50% { transform: rotate(0); }
                  100% { transform: rotate(0); }
                }
                .animate-ring {
                  animation: ring 2.5s ease-in-out;
                  transform-origin: top center;
                }
              `}</style>
              <Bell className="animate-ring h-5 w-5 fill-amber-400 stroke-amber-200 text-amber-400" />
            </>
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </Button>
      }
      content={
        <NotificationQuickMenu
          cui={cui}
          entityName={entityName}
          notifications={notifications ?? []}
          onClose={() => setOpen(false)}
        />
      }
      align="end"
      className="sm:w-md"
    />
  );
}
