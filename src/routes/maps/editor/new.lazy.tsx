import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthSignInButton, useAuth } from '@/lib/auth';
import { parseSearchParamJson } from '@/lib/router-search';
import { t } from '@lingui/core/macro';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';
import {
  useCreateAdvancedMapAnalyticsMapMutation,
  useSaveAdvancedMapAnalyticsSnapshotMutation,
} from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';

export const Route = createLazyFileRoute('/maps/editor/new')({
  component: NewMapRouteComponent,
});

function createDefaultMapState(): AdvancedMapAnalyticsUrlState {
  return AdvancedMapAnalyticsUrlStateSchema.parse({});
}

function hasStateSearchParam(search: unknown): boolean {
  if (typeof search === 'object' && search !== null && Object.prototype.hasOwnProperty.call(search, 'state')) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).has('state');
}

interface CloneStateResolutionMissing {
  status: 'missing';
}

interface CloneStateResolutionValid {
  status: 'valid';
  mapState: AdvancedMapAnalyticsUrlState;
}

interface CloneStateResolutionInvalid {
  status: 'invalid';
}

type CloneStateResolution =
  | CloneStateResolutionMissing
  | CloneStateResolutionValid
  | CloneStateResolutionInvalid;

interface MapCreationAttempt {
  mapState: AdvancedMapAnalyticsUrlState;
  shouldSaveCloneSnapshot: boolean;
  existingMapId?: string;
}

function resolveCloneState(search: unknown): CloneStateResolution {
  if (!hasStateSearchParam(search)) {
    return { status: 'missing' };
  }

  const searchState =
    typeof search === 'object' && search !== null && Object.prototype.hasOwnProperty.call(search, 'state')
      ? (search as Record<string, unknown>).state
      : undefined;
  const parsedSearchState = parseSearchParamJson(searchState);
  const parsedMapState = AdvancedMapAnalyticsUrlStateSchema.safeParse(parsedSearchState);

  if (!parsedMapState.success) {
    return { status: 'invalid' };
  }

  return {
    status: 'valid',
    mapState: parsedMapState.data,
  };
}

export function NewMapRouteComponent() {
  const navigate = useNavigate({ from: '/maps/editor/new' });
  const search = Route.useSearch();
  const { isLoaded, isSignedIn } = useAuth();
  const createMapMutation = useCreateAdvancedMapAnalyticsMapMutation();
  const saveSnapshotMutation = useSaveAdvancedMapAnalyticsSnapshotMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasTriggeredCreationRef = useRef(false);
  const lastAttemptRef = useRef<MapCreationAttempt | null>(null);
  const cloneStateResolution = useMemo(() => resolveCloneState(search), [search]);

  const handleCreateMapFromState = useCallback(
    (attempt: MapCreationAttempt) => {
      if (hasTriggeredCreationRef.current) {
        return;
      }

      hasTriggeredCreationRef.current = true;
      lastAttemptRef.current = attempt;
      setErrorMessage(null);

      const initialMapState = attempt.mapState;
      const title = initialMapState.mapName?.trim();

      void (async () => {
        let mapId = attempt.existingMapId;

        if (!mapId) {
          const createdMap = await createMapMutation.mutateAsync({
            mapState: initialMapState,
            title: title && title.length > 0 ? title : undefined,
            state: 'private',
          });
          mapId = createdMap.id;
          lastAttemptRef.current = {
            ...attempt,
            existingMapId: mapId,
          };
        }

        if (attempt.shouldSaveCloneSnapshot) {
          await saveSnapshotMutation.mutateAsync({
            mapId,
            mapState: initialMapState,
            title: title && title.length > 0 ? title : undefined,
            stateAtSave: 'private',
          });
        }

        navigate({
          to: '/maps/editor/$mapId',
          params: { mapId },
          search: initialMapState,
          replace: true,
        });
      })().catch((error) => {
        const message = error instanceof Error ? error.message : t`Failed to create map`;
        setErrorMessage(message);
      });
    },
    [createMapMutation, navigate, saveSnapshotMutation]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasTriggeredCreationRef.current) {
      return;
    }

    if (cloneStateResolution.status === 'invalid') {
      return;
    }

    if (cloneStateResolution.status === 'valid') {
      handleCreateMapFromState({
        mapState: cloneStateResolution.mapState,
        shouldSaveCloneSnapshot: true,
      });
      return;
    }

    handleCreateMapFromState({
      mapState: createDefaultMapState(),
      shouldSaveCloneSnapshot: false,
    });
  }, [cloneStateResolution, handleCreateMapFromState, isLoaded, isSignedIn]);

  const handleRetryLastAttempt = () => {
    const attemptToRetry = lastAttemptRef.current;
    if (!attemptToRetry) {
      return;
    }

    hasTriggeredCreationRef.current = false;
    handleCreateMapFromState(attemptToRetry);
  };

  const handleCreateEmptyMap = () => {
    hasTriggeredCreationRef.current = false;
    handleCreateMapFromState({
      mapState: createDefaultMapState(),
      shouldSaveCloneSnapshot: false,
    });
  };

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Preparing map creation...`} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Sign in required`}</CardTitle>
            <CardDescription>{t`You need to be signed in to create a map.`}</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button>{t`Sign In`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cloneStateResolution.status === 'invalid' && !hasTriggeredCreationRef.current && !errorMessage) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Invalid map link`}</CardTitle>
            <CardDescription>
              {t`The shared map configuration is invalid or unreadable. You can still create an empty map.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateEmptyMap}>{t`Create empty map`}</Button>
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
            <CardTitle>{t`Failed to create map`}</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRetryLastAttempt}>{t`Retry`}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <LoadingSpinner text={t`Creating map...`} />
    </div>
  );
}
