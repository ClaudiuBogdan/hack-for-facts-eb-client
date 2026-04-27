import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { produce } from 'immer';
import { AlertSchema } from '@/schemas/alerts';
import type { Alert, AlertEditorMode, AlertView, AlertCondition } from '@/schemas/alerts';

type AlertUpdater = Partial<Alert> | ((draft: Alert) => void);

type AlertSearchParams = {
  alert?: Alert;
  view?: AlertView;
  mode?: AlertEditorMode;
  [key: string]: unknown;
};

export function useAlertDraftStore() {
  const navigate = useNavigate({ from: '/alerts/new' });
  const { alert, view, mode } = useSearch({ from: '/alerts/new' }) as unknown as { alert: Alert; view: AlertView; mode: AlertEditorMode };

  const updateAlert = useCallback((updater: AlertUpdater) => {
    navigate({
      search: (prev: AlertSearchParams) => {
        const nextAlert = typeof updater === 'function'
          ? produce(prev.alert, (draft: Alert) => {
              updater(draft);
            })
          : {
              ...prev.alert,
              ...updater,
            };

        const parsed = AlertSchema.parse(nextAlert);
        return {
          ...prev,
          alert: parsed,
        };
      },
      replace: true,
      resetScroll: false,
    });
  }, [navigate]);

  // TODO: Update for filter instead of series
  // const updateSeries = useCallback(
  //   (recipe: (draft: Alert['series']) => void) => {
  //     updateAlert((draft) => {
  //       draft.series = produce(draft.series, (seriesDraft) => {
  //         recipe(seriesDraft);
  //       });
  //     });
  //   },
  //   [updateAlert],
  // );

  const setCondition = useCallback(
    (recipe: AlertCondition | ((draft: AlertCondition) => void)) => {
      updateAlert((draft) => {
        if (!Array.isArray(draft.conditions)) {
          draft.conditions = []
        }
        if (typeof recipe === 'function') {
          const base: AlertCondition = { operator: 'gt', threshold: 0, unit: 'RON' }
          const current = draft.conditions[0] ?? base
          const next = produce(current, (conditionDraft) => {
            recipe(conditionDraft)
          })
          if (draft.conditions.length === 0) draft.conditions.push(next)
          else draft.conditions[0] = next
        } else {
          if (draft.conditions.length === 0) draft.conditions.push(recipe)
          else draft.conditions[0] = recipe
        }
      })
    },
    [updateAlert],
  )

  const setView = useCallback(
    (nextView: AlertView) => {
      navigate({
        search: (prev: AlertSearchParams) => ({
          ...prev,
          view: nextView,
        }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const setMode = useCallback(
    (nextMode: AlertEditorMode) => {
      navigate({
        search: (prev: AlertSearchParams) => ({
          ...prev,
          mode: nextMode,
        }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const toggleActive = useCallback(
    (isActive: boolean) => {
      updateAlert({ isActive });
    },
    [updateAlert],
  );

  const setAlert = useCallback((next: Alert, options?: { mode?: AlertEditorMode }) => {
    const parsed = AlertSchema.parse(next);
    navigate({
      search: (prev: AlertSearchParams) => ({
        ...prev,
        alert: parsed,
        mode: options?.mode ?? prev.mode,
      }),
      replace: true,
      resetScroll: false,
    });
  }, [navigate]);

  return {
    alert,
    view,
    mode,
    updateAlert,
    // updateSeries, // TODO: Update for filter instead of series
    setCondition,
    setView,
    setMode,
    toggleActive,
    setAlert,
  };
}


