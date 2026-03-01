import { useEffect, useRef, useState } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { useCreateAdvancedMapAnalyticsMapMutation } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';

export const Route = createLazyFileRoute('/maps/editor/new')({
  component: NewMapRouteComponent,
});

export function NewMapRouteComponent() {
  const navigate = useNavigate({ from: '/maps/editor/new' });
  const search = Route.useSearch();
  const { isLoaded, isSignedIn } = useAuth();
  const createMapMutation = useCreateAdvancedMapAnalyticsMapMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasTriggeredCreationRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasTriggeredCreationRef.current) {
      return;
    }

    hasTriggeredCreationRef.current = true;

    const initialMapState = AdvancedMapAnalyticsUrlStateSchema.safeParse(search.state).success
      ? AdvancedMapAnalyticsUrlStateSchema.parse(search.state)
      : AdvancedMapAnalyticsUrlStateSchema.parse({});

    const title = initialMapState.mapName?.trim();

    void createMapMutation
      .mutateAsync({
        mapState: initialMapState,
        title: title && title.length > 0 ? title : undefined,
        state: 'private',
      })
      .then((createdMap) => {
        navigate({
          to: '/maps/editor/$mapId',
          params: { mapId: createdMap.id },
          search: createdMap.lastSnapshot.config,
          replace: true,
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to create map';
        setErrorMessage(message);
      });
  }, [createMapMutation, isLoaded, isSignedIn, navigate, search.state]);

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text="Preparing map creation..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You need to be signed in to create a map.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button>Sign In</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Failed to create map</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setErrorMessage(null);
                hasTriggeredCreationRef.current = false;
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <LoadingSpinner text="Creating map..." />
    </div>
  );
}
