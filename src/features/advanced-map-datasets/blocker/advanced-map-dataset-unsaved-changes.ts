export interface AdvancedMapDatasetUnsavedChangesBlockerInput {
  isDirty: boolean;
  isSaving?: boolean;
  currentPathname: string;
  nextPathname: string;
}

export function shouldBlockAdvancedMapDatasetNavigation({
  isDirty,
  isSaving = false,
  currentPathname,
  nextPathname,
}: Readonly<AdvancedMapDatasetUnsavedChangesBlockerInput>): boolean {
  if (!isDirty || isSaving) {
    return false;
  }

  return currentPathname !== nextPathname;
}

